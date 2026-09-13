import { isInBounds, reachableTiles, samePosition } from "./board";
import type { Direction, GameState, Level, Position } from "./model";

export type PullFailureReason = "NO_TARGET" | "BLOCKED" | "ADJACENT";

export type LegalPull = Readonly<{
	kind: "LEGAL";
	target: Position;
	destination: Position;
}>;

export type PullResolution =
	| LegalPull
	| Readonly<{
			kind: "ILLEGAL";
			reason: PullFailureReason;
	  }>;

export const DIRECTIONS = [
	"N",
	"E",
	"S",
	"W",
] as const satisfies readonly Direction[];

export const deltaByDirection: Record<Direction, Position> = {
	N: { x: 0, y: -1 },
	E: { x: 1, y: 0 },
	S: { x: 0, y: 1 },
	W: { x: -1, y: 0 },
};

export function resolvePull(
	level: Level,
	state: GameState,
	direction: Direction,
): PullResolution {
	const delta = deltaByDirection[direction];
	const destination = add(state.player, delta);
	let scan = destination;

	while (isInBounds(scan)) {
		if (level.pillars.some((pillar) => samePosition(pillar, scan))) {
			return { kind: "ILLEGAL", reason: "BLOCKED" };
		}
		const target = state.boxes.find((box) => samePosition(box, scan));
		if (target) {
			if (samePosition(target, destination)) {
				return { kind: "ILLEGAL", reason: "ADJACENT" };
			}
			return {
				kind: "LEGAL",
				target: { ...target },
				destination,
			};
		}
		scan = add(scan, delta);
	}

	return { kind: "ILLEGAL", reason: "NO_TARGET" };
}

export function applyResolvedPull(
	state: GameState,
	pull: LegalPull,
): GameState {
	const targetIndex = state.boxes.findIndex((box) =>
		samePosition(box, pull.target),
	);
	if (targetIndex < 0) {
		throw new Error(
			`Pull target ${pull.target.x},${pull.target.y} is not present`,
		);
	}

	return {
		player: { ...state.player },
		boxes: state.boxes.map((box, index) =>
			index === targetIndex ? { ...pull.destination } : { ...box },
		),
		pulls: state.pulls + 1,
	};
}

export function hasNoLegalPulls(level: Level, state: GameState): boolean {
	for (const firingTile of reachableTiles(level, state)) {
		const firingState = { ...state, player: firingTile };
		for (const direction of DIRECTIONS) {
			if (resolvePull(level, firingState, direction).kind === "LEGAL") {
				return false;
			}
		}
	}
	return true;
}

function add(left: Position, right: Position): Position {
	return { x: left.x + right.x, y: left.y + right.y };
}
