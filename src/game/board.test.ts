import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	BOARD_SIZE,
	BOX_COUNT,
	isBoardCoordinate,
	isWon,
	positionKey,
	reachableTiles,
} from "./board";
import { parseLevel } from "./model";

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

describe("win state", () => {
	it("rejects a near-corner shape with fewer than the required boxes", () => {
		expect(
			isWon({
				player: { x: 0, y: 0 },
				boxes: Array.from({ length: BOX_COUNT - 1 }, (_, x) => ({
					x,
					y: 0,
				})),
				pulls: 0,
			}),
		).toBe(false);
	});

	it("accepts an L with any corner of its two-by-two square missing", () => {
		const square = [
			{ x: 3, y: 3 },
			{ x: 4, y: 3 },
			{ x: 3, y: 4 },
			{ x: 4, y: 4 },
		];

		for (
			let missingCorner = 0;
			missingCorner < square.length;
			missingCorner += 1
		) {
			expect(
				isWon({
					player: { x: 0, y: 0 },
					boxes: square.filter((_, index) => index !== missingCorner),
					pulls: 0,
				}),
			).toBe(true);
		}
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
