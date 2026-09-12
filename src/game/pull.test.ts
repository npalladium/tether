import { describe, expect, it } from "vitest";
import { isWon } from "./board";
import { type GameState, type LevelDefinition, parseLevel } from "./model";
import { applyResolvedPull, hasNoLegalPulls, resolvePull } from "./pull";

const baseDefinition = {
	id: "pull-rules",
	pillars: [],
	startPlayer: { x: 0, y: 0 },
	startBoxes: [
		{ x: 3, y: 0 },
		{ x: 5, y: 0 },
		{ x: 7, y: 7 },
	],
} as const satisfies LevelDefinition;

function stateFor(definition: LevelDefinition): GameState {
	return {
		player: definition.startPlayer,
		boxes: definition.startBoxes,
		pulls: 0,
	};
}

describe("pull resolution", () => {
	it("distinguishes a clear ray with no target", () => {
		const level = parseLevel(baseDefinition);

		expect(resolvePull(level, stateFor(baseDefinition), "N")).toEqual({
			kind: "ILLEGAL",
			reason: "NO_TARGET",
		});
	});

	it("stops at an opaque pillar before a box", () => {
		const definition = {
			...baseDefinition,
			pillars: [{ x: 2, y: 0 }],
		} satisfies LevelDefinition;
		const level = parseLevel(definition);

		expect(resolvePull(level, stateFor(definition), "E")).toEqual({
			kind: "ILLEGAL",
			reason: "BLOCKED",
		});
	});

	it("rejects an adjacent visible box", () => {
		const definition = {
			...baseDefinition,
			startBoxes: [
				{ x: 1, y: 0 },
				{ x: 5, y: 0 },
				{ x: 7, y: 7 },
			],
		} satisfies LevelDefinition;
		const level = parseLevel(definition);

		expect(resolvePull(level, stateFor(definition), "E")).toEqual({
			kind: "ILLEGAL",
			reason: "ADJACENT",
		});
	});

	it("moves only the first visible box beside the player", () => {
		const level = parseLevel(baseDefinition);
		const before = stateFor(baseDefinition);
		const resolution = resolvePull(level, before, "E");

		expect(resolution).toEqual({
			kind: "LEGAL",
			target: { x: 3, y: 0 },
			destination: { x: 1, y: 0 },
		});
		if (resolution.kind !== "LEGAL") {
			throw new Error("Expected a legal pull");
		}

		const after = applyResolvedPull(before, resolution);
		expect(after).toEqual({
			player: { x: 0, y: 0 },
			boxes: [
				{ x: 1, y: 0 },
				{ x: 5, y: 0 },
				{ x: 7, y: 7 },
			],
			pulls: 1,
		});
		expect(before).toEqual(stateFor(baseDefinition));
	});
});

describe("terminal board rules", () => {
	it("recognizes every three-cell corner and rejects a line", () => {
		const corners = [
			[
				{ x: 2, y: 2 },
				{ x: 3, y: 2 },
				{ x: 2, y: 3 },
			],
			[
				{ x: 2, y: 2 },
				{ x: 3, y: 2 },
				{ x: 3, y: 3 },
			],
			[
				{ x: 2, y: 2 },
				{ x: 2, y: 3 },
				{ x: 3, y: 3 },
			],
			[
				{ x: 3, y: 2 },
				{ x: 2, y: 3 },
				{ x: 3, y: 3 },
			],
		] as const;

		for (const boxes of corners) {
			expect(isWon({ player: { x: 0, y: 0 }, boxes, pulls: 0 })).toBe(true);
		}
		expect(
			isWon({
				player: { x: 0, y: 0 },
				boxes: [
					{ x: 2, y: 2 },
					{ x: 3, y: 2 },
					{ x: 4, y: 2 },
				],
				pulls: 0,
			}),
		).toBe(false);
	});

	it("detects a non-winning enclosure with no legal pulls", () => {
		const level = parseLevel({
			id: "enclosed",
			pillars: [{ x: 3, y: 1 }],
			startPlayer: { x: 2, y: 1 },
			startBoxes: [
				{ x: 1, y: 1 },
				{ x: 2, y: 0 },
				{ x: 2, y: 2 },
			],
		});
		const state = {
			player: level.startPlayer,
			boxes: level.startBoxes,
			pulls: 2,
		};

		expect(isWon(state)).toBe(false);
		expect(hasNoLegalPulls(level, state)).toBe(true);
	});
});
