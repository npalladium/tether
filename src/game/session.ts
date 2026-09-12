import { isWon, reachableTiles, samePosition } from "./board";
import type { Direction, GameState, Level, Position } from "./model";
import {
	applyResolvedPull,
	hasNoLegalPulls,
	type PullFailureReason,
	resolvePull,
} from "./pull";

export type SessionPhase = "READY" | "WALKING" | "SLIDING" | "WON" | "NO_PULLS";

export type Session = Readonly<{
	level: Level;
	state: GameState;
	history: readonly GameState[];
	phase: SessionPhase;
	bestPulls: number | undefined;
}>;

type AcceptedCommand = Readonly<{
	kind: "ACCEPTED";
	session: Session;
	reason?: never;
}>;

type RejectedCommand<Reason extends string> = Readonly<{
	kind: "REJECTED";
	reason: Reason;
	session: Session;
}>;

export type WalkResult =
	| AcceptedCommand
	| RejectedCommand<"INPUT_LOCKED" | "UNREACHABLE">;

export type PullResult =
	| AcceptedCommand
	| RejectedCommand<"INPUT_LOCKED" | PullFailureReason>;

export function beginSession(level: Level, bestPulls?: number): Session {
	return evaluate({
		level,
		state: initialState(level),
		history: [],
		phase: "READY",
		bestPulls,
	});
}

export function walk(session: Session, destination: Position): WalkResult {
	if (session.phase !== "READY") {
		return { kind: "REJECTED", reason: "INPUT_LOCKED", session };
	}
	if (
		!reachableTiles(session.level, session.state).some((tile) =>
			samePosition(tile, destination),
		)
	) {
		return { kind: "REJECTED", reason: "UNREACHABLE", session };
	}

	return {
		kind: "ACCEPTED",
		session: {
			...session,
			state: { ...session.state, player: { ...destination } },
			phase: "WALKING",
		},
	};
}

export function pull(session: Session, direction: Direction): PullResult {
	if (session.phase !== "READY") {
		return { kind: "REJECTED", reason: "INPUT_LOCKED", session };
	}
	const resolution = resolvePull(session.level, session.state, direction);
	if (resolution.kind === "ILLEGAL") {
		return {
			kind: "REJECTED",
			reason: resolution.reason,
			session,
		};
	}

	return {
		kind: "ACCEPTED",
		session: {
			...session,
			state: applyResolvedPull(session.state, resolution),
			history: [...session.history, copyState(session.state)],
			phase: "SLIDING",
		},
	};
}

export function completeAnimation(session: Session): Session {
	if (session.phase === "WALKING") {
		return { ...session, phase: "READY" };
	}
	if (session.phase === "SLIDING") {
		return evaluate(session);
	}
	return session;
}

export function undo(session: Session): Session {
	if (session.phase === "WALKING" || session.phase === "SLIDING")
		return session;
	const previous = session.history.at(-1);
	if (!previous) return session;

	return evaluate({
		...session,
		state: copyState(previous),
		history: session.history.slice(0, -1),
	});
}

export function reset(session: Session): Session {
	if (session.phase !== "READY" && session.phase !== "NO_PULLS") return session;
	return beginSession(session.level, session.bestPulls);
}

export function replay(session: Session): Session {
	if (session.phase !== "WON") return session;
	return beginSession(session.level, session.bestPulls);
}

function initialState(level: Level): GameState {
	return {
		player: { ...level.startPlayer },
		boxes: level.startBoxes.map((box) => ({ ...box })),
		pulls: 0,
	};
}

function copyState(state: GameState): GameState {
	return {
		player: { ...state.player },
		boxes: state.boxes.map((box) => ({ ...box })),
		pulls: state.pulls,
	};
}

function evaluate(session: Session): Session {
	if (isWon(session.state)) {
		return {
			...session,
			phase: "WON",
			bestPulls:
				session.bestPulls === undefined
					? session.state.pulls
					: Math.min(session.bestPulls, session.state.pulls),
		};
	}
	return {
		...session,
		phase: hasNoLegalPulls(session.level, session.state) ? "NO_PULLS" : "READY",
	};
}
