import { type Level, parseLevel } from "./game";

/** A welcoming one-pull introduction to completing an L. */
export const defaultLevel: Level = parseLevel({
	id: "first-connection-v1",
	title: "First connection",
	startPlayer: { x: 0, y: 1 },
	startBoxes: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 7, y: 1 },
	],
	pillars: [],
	par: 1,
});

export const levels: readonly Level[] = [defaultLevel];

export const levelGroups = [
	{
		title: "Rooms",
		levels,
	},
] as const;
