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

/** Teaches that the reachable firing tile fixes a box's stopping tile. */
const chooseTheStop: Level = parseLevel({
	id: "choose-the-stop-v1",
	title: "Choose the stop",
	startPlayer: { x: 0, y: 7 },
	startBoxes: [
		{ x: 3, y: 2 },
		{ x: 3, y: 3 },
		{ x: 0, y: 3 },
	],
	pillars: [],
	par: 3,
});

/** Teaches that a tether takes the nearest visible box on its ray. */
const nearerBoxFirst: Level = parseLevel({
	id: "nearer-box-first-v1",
	title: "Nearer box first",
	startPlayer: { x: 0, y: 0 },
	startBoxes: [
		{ x: 3, y: 0 },
		{ x: 6, y: 0 },
		{ x: 3, y: 3 },
	],
	pillars: [],
	par: 4,
});

/** Teaches that an opaque pillar blocks a ray, requiring another angle. */
const aroundThePillar: Level = parseLevel({
	id: "around-the-pillar-v1",
	title: "Around the pillar",
	startPlayer: { x: 0, y: 1 },
	startBoxes: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 7, y: 1 },
	],
	pillars: [{ x: 3, y: 1 }],
	par: 4,
});

const openCorners: Level = parseLevel({
	id: "open-corners-v1",
	title: "Open corners",
	startPlayer: { x: 0, y: 7 },
	startBoxes: [
		{ x: 1, y: 1 },
		{ x: 6, y: 1 },
		{ x: 3, y: 5 },
	],
	pillars: [],
	par: 4,
});

const screeningLine: Level = parseLevel({
	id: "screening-line-v1",
	title: "Screening line",
	startPlayer: { x: 0, y: 6 },
	startBoxes: [
		{ x: 2, y: 2 },
		{ x: 5, y: 2 },
		{ x: 5, y: 5 },
	],
	pillars: [{ x: 3, y: 4 }],
	par: 4,
});

const turningRoom: Level = parseLevel({
	id: "turning-room-v1",
	title: "Turning room",
	startPlayer: { x: 0, y: 7 },
	startBoxes: [
		{ x: 1, y: 2 },
		{ x: 6, y: 3 },
		{ x: 3, y: 6 },
	],
	pillars: [
		{ x: 3, y: 3 },
		{ x: 4, y: 4 },
	],
	par: 3,
});

export const levels: readonly Level[] = [
	defaultLevel,
	chooseTheStop,
	nearerBoxFirst,
	aroundThePillar,
	openCorners,
	screeningLine,
	turningRoom,
];

export const levelGroups: readonly {
	title: string;
	levels: readonly Level[];
}[] = [
	{
		title: "Learn the pull",
		levels: [defaultLevel, chooseTheStop, nearerBoxFirst, aroundThePillar],
	},
	{
		title: "Puzzles",
		levels: [openCorners, screeningLine, turningRoom],
	},
];
