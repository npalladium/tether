import type { GameState, Level, Position } from "./model";

export const BOARD_SIZE = 8;

export function isBoardCoordinate(coordinate: number): boolean {
	return (
		Number.isInteger(coordinate) && coordinate >= 0 && coordinate < BOARD_SIZE
	);
}

export function isInBounds(position: Position): boolean {
	return isBoardCoordinate(position.x) && isBoardCoordinate(position.y);
}

export function isOccupied(
	level: Level,
	state: GameState,
	position: Position,
): boolean {
	return (
		level.pillars.some((pillar) => samePosition(pillar, position)) ||
		state.boxes.some((box) => samePosition(box, position))
	);
}

export function solidAt(
	level: Level,
	state: GameState,
	position: Position,
): boolean {
	return !isInBounds(position) || isOccupied(level, state, position);
}

export function reachableTiles(level: Level, state: GameState): Position[] {
	const result: Position[] = [];
	const visited = new Set<string>();
	const queue: Position[] = [state.player];
	visited.add(positionKey(state.player));
	for (let index = 0; index < queue.length; index += 1) {
		const current = queue.at(index);
		if (!current) break;
		result.push(current);
		for (const [dx, dy] of orthogonalDirections) {
			const next = { x: current.x + dx, y: current.y + dy };
			const key = positionKey(next);
			if (!visited.has(key) && !solidAt(level, state, next)) {
				visited.add(key);
				queue.push(next);
			}
		}
	}
	return result;
}

export function samePosition(a: Position, b: Position): boolean {
	return a.x === b.x && a.y === b.y;
}

export function positionKey(position: Position): string {
	return `${position.x},${position.y}`;
}

export function isWon(state: GameState): boolean {
	if (state.boxes.length !== 3) return false;
	if (new Set(state.boxes.map(positionKey)).size !== 3) return false;

	const xCoordinates = state.boxes.map(({ x }) => x);
	const yCoordinates = state.boxes.map(({ y }) => y);
	return (
		Math.max(...xCoordinates) - Math.min(...xCoordinates) <= 1 &&
		Math.max(...yCoordinates) - Math.min(...yCoordinates) <= 1
	);
}

const orthogonalDirections: readonly (readonly [number, number])[] = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0],
];
