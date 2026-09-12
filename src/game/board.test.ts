import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BOARD_SIZE, isBoardCoordinate, reachableTiles } from "./board";
import { type Position, parseLevel } from "./model";

describe("board coordinates", () => {
	it("accepts every coordinate on the board", () => {
		fc.assert(
			fc.property(fc.integer({ min: 0, max: BOARD_SIZE - 1 }), (coordinate) => {
				expect(isBoardCoordinate(coordinate)).toBe(true);
			}),
		);
	});

	it("rejects integer coordinates beyond either edge", () => {
		expect(isBoardCoordinate(-1)).toBe(false);
		expect(isBoardCoordinate(BOARD_SIZE)).toBe(false);

		fc.assert(
			fc.property(
				fc.oneof(fc.integer({ max: -1 }), fc.integer({ min: BOARD_SIZE })),
				(coordinate) => {
					expect(isBoardCoordinate(coordinate)).toBe(false);
				},
			),
		);
	});

	it("rejects fractional coordinates", () => {
		fc.assert(
			fc.property(fc.double({ noNaN: true, noInteger: true }), (coordinate) => {
				expect(isBoardCoordinate(coordinate)).toBe(false);
			}),
		);
	});
});

describe("reachable tiles", () => {
	it("flood-fills only the player's floor region", () => {
		const level = parseLevel({
			id: "partitioned",
			pillars: Array.from({ length: BOARD_SIZE }, (_, y) => ({ x: 1, y })),
			startPlayer: { x: 0, y: 0 },
			startBoxes: [
				{ x: 2, y: 0 },
				{ x: 3, y: 0 },
				{ x: 4, y: 0 },
			],
		});
		const state = {
			player: level.startPlayer,
			boxes: level.startBoxes,
			pulls: 0,
		};

		expect(reachableTiles(level, state).map(positionKey)).toEqual(
			Array.from({ length: BOARD_SIZE }, (_, y) => `0,${y}`),
		);
	});
});

function positionKey(position: Position): string {
	return `${position.x},${position.y}`;
}
