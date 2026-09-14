import type { GameState, Level } from "../game";
import type { Solution, SolutionResult, SolutionStep } from "./types";

type SolveResponse =
	| Readonly<{
			kind: "RESULT";
			requestId: number;
			result: SolutionResult;
	  }>
	| Readonly<{
			kind: "ERROR";
			requestId: number;
			message: string;
	  }>;

const REQUEST_ID = 1;

/** Runs one on-demand solver worker for a plain snapshot of the current board. */
export function findSolutions(
	level: Level,
	state: GameState,
	signal: AbortSignal,
): Promise<SolutionResult> {
	if (signal.aborted) {
		return Promise.reject(
			new DOMException("Solver request was aborted", "AbortError"),
		);
	}

	return new Promise<SolutionResult>((resolve, reject) => {
		let worker: Worker;
		try {
			worker = new Worker(new URL("./solver.worker.ts", import.meta.url), {
				type: "module",
			});
		} catch (error) {
			reject(error);
			return;
		}

		let settled = false;
		const cleanup = (): void => {
			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
			worker.removeEventListener("messageerror", onMessageError);
			signal.removeEventListener("abort", onAbort);
			worker.terminate();
		};
		const succeed = (result: SolutionResult): void => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(result);
		};
		const fail = (error: unknown): void => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error);
		};
		const onMessage = (event: MessageEvent<unknown>): void => {
			const response = event.data;
			if (
				typeof response === "object" &&
				response !== null &&
				"requestId" in response &&
				response.requestId !== REQUEST_ID
			) {
				return;
			}
			if (!isSolveResponse(response)) {
				fail(new Error("Solver worker returned an invalid response"));
				return;
			}
			if (response.kind === "RESULT") {
				succeed(response.result);
				return;
			}
			fail(new Error(response.message));
		};
		const onError = (event: ErrorEvent): void => {
			fail(new Error(event.message || "Solver worker failed"));
		};
		const onMessageError = (): void => {
			fail(new Error("Solver worker returned an unreadable message"));
		};
		const onAbort = (): void =>
			fail(new DOMException("Solver request was aborted", "AbortError"));

		worker.addEventListener("message", onMessage);
		worker.addEventListener("error", onError);
		worker.addEventListener("messageerror", onMessageError);
		signal.addEventListener("abort", onAbort, { once: true });

		try {
			worker.postMessage({
				kind: "SOLVE",
				requestId: REQUEST_ID,
				level: copyLevel(level),
				state: copyState(state),
			});
		} catch (error) {
			fail(error);
		}
	});
}

function isSolveResponse(value: unknown): value is SolveResponse {
	if (
		typeof value !== "object" ||
		value === null ||
		!("requestId" in value) ||
		!("kind" in value)
	) {
		return false;
	}
	return (
		typeof value.requestId === "number" &&
		((value.kind === "RESULT" &&
			"result" in value &&
			isSolutionResult(value.result)) ||
			(value.kind === "ERROR" &&
				"message" in value &&
				typeof value.message === "string"))
	);
}

function isSolutionResult(value: unknown): value is SolutionResult {
	if (typeof value !== "object" || value === null || !("kind" in value)) {
		return false;
	}
	if (value.kind === "WON" || value.kind === "UNSOLVABLE") return true;
	return (
		value.kind === "SOLUTIONS" &&
		"minimumPulls" in value &&
		typeof value.minimumPulls === "number" &&
		Number.isInteger(value.minimumPulls) &&
		value.minimumPulls >= 0 &&
		"solutions" in value &&
		Array.isArray(value.solutions) &&
		value.solutions.every(isSolution)
	);
}

function isSolution(value: unknown): value is Solution {
	return Array.isArray(value) && value.every(isSolutionStep);
}

function isSolutionStep(value: unknown): value is SolutionStep {
	if (
		typeof value !== "object" ||
		value === null ||
		!("firing" in value) ||
		!("direction" in value) ||
		!("target" in value) ||
		!("destination" in value)
	) {
		return false;
	}
	return (
		isPosition(value.firing) &&
		(value.direction === "N" ||
			value.direction === "E" ||
			value.direction === "S" ||
			value.direction === "W") &&
		isPosition(value.target) &&
		isPosition(value.destination)
	);
}

function isPosition(
	value: unknown,
): value is Readonly<{ x: number; y: number }> {
	return (
		typeof value === "object" &&
		value !== null &&
		"x" in value &&
		typeof value.x === "number" &&
		"y" in value &&
		typeof value.y === "number"
	);
}

function copyLevel(level: Level): Level {
	return {
		id: level.id,
		width: level.width,
		height: level.height,
		pillars: level.pillars.map((pillar) => ({ ...pillar })),
		startPlayer: { ...level.startPlayer },
		startBoxes: level.startBoxes.map((box) => ({ ...box })),
		par: level.par,
		title: level.title,
	};
}

function copyState(state: GameState): GameState {
	return {
		player: { ...state.player },
		boxes: state.boxes.map((box) => ({ ...box })),
		pulls: state.pulls,
	};
}
