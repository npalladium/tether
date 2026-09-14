import type { GameState, Level } from "../game";
import { solve } from "./solver";
import type { SolutionResult } from "./types";

type SolveRequest = Readonly<{
	kind: "SOLVE";
	requestId: number;
	level: Level;
	state: GameState;
}>;

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

type WorkerPort = Readonly<{
	addEventListener(
		type: "message",
		listener: (event: MessageEvent<unknown>) => void,
	): void;
	postMessage(message: SolveResponse): void;
}>;

const workerPort = globalThis as unknown as WorkerPort;

workerPort.addEventListener("message", (event) => {
	const request = event.data;
	if (!isSolveRequest(request)) return;

	try {
		workerPort.postMessage({
			kind: "RESULT",
			requestId: request.requestId,
			result: solve(request.level, request.state),
		});
	} catch (error) {
		workerPort.postMessage({
			kind: "ERROR",
			requestId: request.requestId,
			message: error instanceof Error ? error.message : "Solver worker failed",
		});
	}
});

function isSolveRequest(value: unknown): value is SolveRequest {
	if (typeof value !== "object" || value === null) return false;
	const request = value as Partial<SolveRequest>;
	return (
		request.kind === "SOLVE" &&
		typeof request.requestId === "number" &&
		request.level !== undefined &&
		request.state !== undefined
	);
}
