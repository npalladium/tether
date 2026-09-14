import {
	BOARD_SIZE,
	DIRECTIONS,
	type GameState,
	isWon,
	type Level,
	type Position,
	reachableTiles,
	resolvePull,
} from "../game";
import { applyResolvedPull } from "../game/pull";
import type { Solution, SolutionResult, SolutionStep } from "./types";

type StateAnalysis = Readonly<{
	key: string;
	firingTiles: readonly Position[];
}>;

type SearchNode = Readonly<{
	state: GameState;
	analysis: StateAnalysis;
}>;

type Transition = Readonly<{
	step: SolutionStep;
	next: SearchNode;
}>;

const MAX_SOLUTION_COUNT = 3;

/**
 * Finds a capped sample of distinct shortest solutions from the supplied
 * current state. The returned alternatives are representative, not an
 * exhaustive enumeration of every shortest route.
 */
export function solve(
	level: Level,
	state: GameState,
	maxSolutions = MAX_SOLUTION_COUNT,
): SolutionResult {
	if (isWon(state)) return { kind: "WON" };

	const solutionLimit = Number.isFinite(maxSolutions)
		? Math.min(MAX_SOLUTION_COUNT, Math.max(1, Math.trunc(maxSolutions)))
		: MAX_SOLUTION_COUNT;
	const start: SearchNode = {
		state,
		analysis: analyzeState(level, state),
	};
	const distanceByKey = new Map<string, number>([[start.analysis.key, 0]]);
	let frontier: SearchNode[] = [start];
	let shortestDistance: number | undefined;

	for (let depth = 0; frontier.length > 0; depth += 1) {
		const nextFrontier: SearchNode[] = [];
		let foundWin = false;

		for (const node of frontier) {
			for (const transition of transitionsFrom(level, node)) {
				const key = transition.next.analysis.key;
				if (distanceByKey.has(key)) continue;

				distanceByKey.set(key, depth + 1);
				nextFrontier.push(transition.next);
				if (isWon(transition.next.state)) foundWin = true;
			}
		}

		if (foundWin) {
			shortestDistance = depth + 1;
			break;
		}
		frontier = nextFrontier;
	}

	if (shortestDistance === undefined) return { kind: "UNSOLVABLE" };

	const solutions = collectSolutions(
		level,
		start,
		shortestDistance,
		distanceByKey,
		solutionLimit,
	);
	if (solutions.length === 0) {
		throw new Error("Shortest-path reconstruction produced no solution");
	}

	return {
		kind: "SOLUTIONS",
		minimumPulls: shortestDistance,
		solutions,
	};
}

function collectSolutions(
	level: Level,
	start: SearchNode,
	shortestDistance: number,
	distanceByKey: ReadonlyMap<string, number>,
	limit: number,
): readonly Solution[] {
	const memo = new Map<string, readonly Solution[]>();
	const suffixesFrom = (
		node: SearchNode,
		depth: number,
	): readonly Solution[] => {
		const cached = memo.get(node.analysis.key);
		if (cached) return cached;

		if (depth === shortestDistance) {
			const terminal: readonly Solution[] = isWon(node.state) ? [[]] : [];
			memo.set(node.analysis.key, terminal);
			return terminal;
		}

		const suffixes: Solution[] = [];
		const seen = new Set<string>();
		for (const transition of transitionsFrom(level, node)) {
			if (distanceByKey.get(transition.next.analysis.key) !== depth + 1) {
				continue;
			}
			for (const tail of suffixesFrom(transition.next, depth + 1)) {
				const route: Solution = [transition.step, ...tail];
				const signature = solutionKey(route);
				if (seen.has(signature)) continue;
				seen.add(signature);
				suffixes.push(route);
				if (suffixes.length === limit) break;
			}
			if (suffixes.length === limit) break;
		}
		memo.set(node.analysis.key, suffixes);
		return suffixes;
	};

	const firstTransitions = transitionsFrom(level, start).filter(
		(transition) => distanceByKey.get(transition.next.analysis.key) === 1,
	);
	const solutions: Solution[] = [];
	const seen = new Set<string>();

	// Take one viable route per first pull before filling remaining slots.
	for (const transition of firstTransitions) {
		const suffix = suffixesFrom(transition.next, 1).at(0);
		if (!suffix) continue;
		addSolution([transition.step, ...suffix], solutions, seen);
		if (solutions.length === limit) return solutions;
	}

	for (const transition of firstTransitions) {
		for (const suffix of suffixesFrom(transition.next, 1)) {
			addSolution([transition.step, ...suffix], solutions, seen);
			if (solutions.length === limit) return solutions;
		}
	}
	return solutions;
}

function addSolution(
	solution: Solution,
	solutions: Solution[],
	seen: Set<string>,
): void {
	const key = solutionKey(solution);
	if (seen.has(key)) return;
	seen.add(key);
	solutions.push(solution);
}

function transitionsFrom(level: Level, node: SearchNode): Transition[] {
	const transitions: Transition[] = [];
	for (const firing of node.analysis.firingTiles) {
		const firingState: GameState = {
			player: firing,
			boxes: node.state.boxes,
			pulls: node.state.pulls,
		};
		for (const direction of DIRECTIONS) {
			const resolution = resolvePull(level, firingState, direction);
			if (resolution.kind !== "LEGAL") continue;

			const nextState = applyResolvedPull(firingState, resolution);
			transitions.push({
				step: {
					firing: { ...firing },
					direction,
					target: { ...resolution.target },
					destination: { ...resolution.destination },
				},
				next: {
					state: nextState,
					analysis: analyzeState(level, nextState),
				},
			});
		}
	}
	return transitions;
}

function analyzeState(level: Level, state: GameState): StateAnalysis {
	const firingTiles = reachableTiles(level, state).sort(
		(left, right) => cellIndex(left) - cellIndex(right),
	);
	let reachableMask = 0n;
	for (const tile of firingTiles) {
		reachableMask |= 1n << BigInt(cellIndex(tile));
	}
	const boxes = state.boxes.map(cellIndex).sort((left, right) => left - right);
	return {
		key: `${boxes.join(",")}|${reachableMask.toString(16)}`,
		firingTiles,
	};
}

function cellIndex(position: Position): number {
	return position.y * BOARD_SIZE + position.x;
}

function solutionKey(solution: Solution): string {
	return solution
		.map(
			(step) =>
				`${cellIndex(step.firing)}${step.direction}${cellIndex(step.target)}>${cellIndex(step.destination)}`,
		)
		.join(";");
}
