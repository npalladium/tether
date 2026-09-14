import {
	DIRECTIONS,
	type Direction,
	deltaByDirection,
	type GameState,
	isWon,
	type Level,
	type Position,
	reachableTiles,
	resolvePull,
	samePosition,
} from "../game";
import type { Hint, Solution, SolutionStep } from "./types";

const directionName: Record<Direction, string> = {
	N: "north",
	E: "east",
	S: "south",
	W: "west",
};

type RouteAnalysis = Readonly<{
	states: readonly GameState[];
	movedBoxIndexes: readonly number[];
	valid: boolean;
}>;

export function buildHints(
	level: Level,
	state: GameState,
	solution: Solution,
): readonly Hint[] {
	const first = solution[0];
	if (!first) {
		return [
			{ title: "A strategic nudge", text: "This route has no next pull." },
			{ title: "Chosen box", text: "This route has no box to move." },
			{ title: "Exact next pull", text: "No pull is needed on this route." },
		];
	}

	const analysis = analyzeRoute(level, state, solution);
	return [
		{
			title: "A strategic nudge",
			text: buildStrategicNudge(level, state, first, analysis),
		},
		{
			title: "Chosen box",
			text: `One way starts with the box at ${formatPosition(first.target)}. Move it to ${formatPosition(first.destination)}.`,
		},
		{
			title: "Exact next pull",
			text: `For this route, stand at ${formatPosition(first.firing)} and fire ${directionName[first.direction]}. The box at ${formatPosition(first.target)} lands at ${formatPosition(first.destination)}.`,
		},
	];
}

function analyzeRoute(
	level: Level,
	initialState: GameState,
	solution: Solution,
): RouteAnalysis {
	const states: GameState[] = [initialState];
	const movedBoxIndexes: number[] = [];
	let current = initialState;
	let valid = true;

	for (const step of solution) {
		const firingIsReachable = reachableTiles(level, current).some((tile) =>
			samePosition(tile, step.firing),
		);
		const firingState = { ...current, player: step.firing };
		const resolved = resolvePull(level, firingState, step.direction);
		const targetIndex = current.boxes.findIndex((box) =>
			samePosition(box, step.target),
		);

		if (
			!firingIsReachable ||
			resolved.kind !== "LEGAL" ||
			targetIndex < 0 ||
			!samePosition(resolved.target, step.target) ||
			!samePosition(resolved.destination, step.destination)
		) {
			valid = false;
			break;
		}

		movedBoxIndexes.push(targetIndex);
		current = {
			player: step.firing,
			boxes: current.boxes.map((box, index) =>
				index === targetIndex ? step.destination : box,
			),
			pulls: current.pulls + 1,
		};
		states.push(current);
	}

	return { states, movedBoxIndexes, valid };
}

function buildStrategicNudge(
	level: Level,
	state: GameState,
	first: SolutionStep,
	analysis: RouteAnalysis,
): string {
	const afterFirst = analysis.states[1];
	if (!analysis.valid || !afterFirst) {
		return "One way starts by changing the boxes’ alignment before building the L.";
	}

	if (isWon(afterFirst)) {
		return "One way uses the next pull to fit a box beside the other two and complete the L.";
	}

	const chosenAxis =
		first.direction === "E" || first.direction === "W"
			? "horizontal"
			: "vertical";
	if (hasPerpendicularPillarBlock(level, state, first.target, chosenAxis)) {
		return "A pillar blocks one straight tether line to the next box. One way starts by pulling it along the other axis.";
	}

	const beforePairs = adjacentPairs(state.boxes);
	const afterPairs = adjacentPairs(afterFirst.boxes);
	const newPairs = [...afterPairs].filter((pair) => !beforePairs.has(pair));
	if (newPairs.length > 0) {
		const pairStaysTogether = newPairs.some((pair) =>
			analysis.states
				.slice(1)
				.every((routeState) => adjacentPairs(routeState.boxes).has(pair)),
		);
		return pairStaysTogether
			? "One way starts by bringing two boxes side by side; that pair stays together while the route finishes the L."
			: "One way starts by bringing two boxes side by side as a temporary setup, before reshaping them into the L.";
	}

	const brokenPair = [...beforePairs].find((pair) => !afterPairs.has(pair));
	if (brokenPair) {
		return "One way does not preserve the pair that is already side by side; it repositions one of them before rebuilding the L.";
	}

	const retainedPair = [...beforePairs].find((pair) =>
		analysis.states.every((routeState) =>
			adjacentPairs(routeState.boxes).has(pair),
		),
	);
	if (retainedPair) {
		return "One way keeps the boxes that are already side by side together and works on the separated box.";
	}

	const firstBoxIndex = analysis.movedBoxIndexes[0];
	if (
		firstBoxIndex !== undefined &&
		analysis.movedBoxIndexes.slice(1).includes(firstBoxIndex)
	) {
		return "One way uses the next pull as a temporary setup: the same box moves again before the L is complete.";
	}

	return "One way anchors a box on the final L first, then brings the other boxes around it.";
}

function hasPerpendicularPillarBlock(
	level: Level,
	state: GameState,
	target: Position,
	chosenAxis: "horizontal" | "vertical",
): boolean {
	for (const firing of reachableTiles(level, state)) {
		for (const direction of DIRECTIONS) {
			const directionAxis =
				direction === "E" || direction === "W" ? "horizontal" : "vertical";
			if (directionAxis === chosenAxis) continue;
			if (!isAheadOnRay(firing, target, direction)) continue;

			const resolution = resolvePull(
				level,
				{ ...state, player: firing },
				direction,
			);
			if (resolution.kind === "ILLEGAL" && resolution.reason === "BLOCKED") {
				return true;
			}
		}
	}
	return false;
}

function isAheadOnRay(
	origin: Position,
	target: Position,
	direction: Direction,
): boolean {
	const delta = deltaByDirection[direction];
	const offsetX = target.x - origin.x;
	const offsetY = target.y - origin.y;
	return delta.x === 0
		? offsetX === 0 && offsetY * delta.y > 0
		: offsetY === 0 && offsetX * delta.x > 0;
}

function adjacentPairs(boxes: readonly Position[]): Set<string> {
	const pairs = new Set<string>();
	for (let left = 0; left < boxes.length; left += 1) {
		for (let right = left + 1; right < boxes.length; right += 1) {
			const a = boxes[left];
			const b = boxes[right];
			if (a && b && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1) {
				pairs.add(`${left}:${right}`);
			}
		}
	}
	return pairs;
}

function formatPosition(position: Position): string {
	return `column ${position.x + 1}, row ${position.y + 1}`;
}
