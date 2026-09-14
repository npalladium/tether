import { type Direction, type Level, type Position, parseLevel } from "./game";

export const tutorialLevel: Level = parseLevel({
	id: "guided-first-pull-v1",
	title: "First tether",
	startPlayer: { x: 2, y: 2 },
	startBoxes: [
		{ x: 6, y: 3 },
		{ x: 3, y: 4 },
		{ x: 4, y: 4 },
	],
	pillars: [],
	par: 1,
});

export const tutorialFiringTile: Position = Object.freeze({ x: 2, y: 3 });
export const tutorialPullDirection: Direction = "E";
