import { describe, expect, it } from "vitest";
import { type LevelValidationError, parseLevel } from "./model";

const validLevel = {
	id: "lesson-1",
	pillars: [{ x: 4, y: 4 }],
	startPlayer: { x: 0, y: 0 },
	startBoxes: [
		{ x: 1, y: 1 },
		{ x: 2, y: 2 },
		{ x: 3, y: 3 },
	],
} as const;

describe("level parsing", () => {
	it("accepts a valid authored level as isolated engine data", () => {
		const level = parseLevel(validLevel);

		expect(level).toMatchObject({
			id: "lesson-1",
			width: 8,
			height: 8,
		});
		expect(level.startBoxes).toEqual(validLevel.startBoxes);
		expect(level.startBoxes).not.toBe(validLevel.startBoxes);
		expect(level.pillars).not.toBe(validLevel.pillars);
	});

	it.each([
		[
			"BOX_COUNT",
			{ ...validLevel, startBoxes: validLevel.startBoxes.slice(0, 2) },
		],
		[
			"DUPLICATE_BOX",
			{
				...validLevel,
				startBoxes: [
					validLevel.startBoxes[0],
					validLevel.startBoxes[0],
					validLevel.startBoxes[1],
				],
			},
		],
		["OUT_OF_BOUNDS", { ...validLevel, startPlayer: { x: -1, y: 0 } }],
		[
			"OUT_OF_BOUNDS",
			{
				...validLevel,
				startBoxes: [
					{ x: 8, y: 1 },
					validLevel.startBoxes[1],
					validLevel.startBoxes[2],
				],
			},
		],
		["OUT_OF_BOUNDS", { ...validLevel, pillars: [{ x: 4, y: 4.5 }] }],
		["OVERLAP", { ...validLevel, startPlayer: validLevel.startBoxes[0] }],
		["OVERLAP", { ...validLevel, pillars: [validLevel.startBoxes[0]] }],
		[
			"OVERLAP",
			{
				...validLevel,
				pillars: [validLevel.pillars[0], validLevel.pillars[0]],
			},
		],
	] as const)("rejects invalid authored data with %s", (code, definition) => {
		expect(() => parseLevel(definition)).toThrow(
			expect.objectContaining<Partial<LevelValidationError>>({ code }),
		);
	});
});
