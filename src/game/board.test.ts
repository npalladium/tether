import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BOARD_SIZE, isBoardCoordinate } from "./board";

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
