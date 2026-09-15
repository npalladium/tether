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

const splitCrossing: Level = parseLevel({
	id: "split-crossing-v1",
	title: "Split crossing",
	startPlayer: { x: 2, y: 5 },
	startBoxes: [
		{ x: 6, y: 7 },
		{ x: 2, y: 0 },
		{ x: 0, y: 0 },
	],
	pillars: [
		{ x: 1, y: 7 },
		{ x: 4, y: 0 },
		{ x: 2, y: 1 },
	],
	par: 5,
});

const needlesEye: Level = parseLevel({
	id: "needles-eye-v1",
	title: "Needle's eye",
	startPlayer: { x: 3, y: 7 },
	startBoxes: [
		{ x: 4, y: 6 },
		{ x: 1, y: 0 },
		{ x: 2, y: 6 },
	],
	pillars: [
		{ x: 3, y: 6 },
		{ x: 2, y: 5 },
	],
	par: 5,
});

const devilsElbow: Level = parseLevel({
	id: "devils-elbow-v1",
	title: "Devil's elbow",
	startPlayer: { x: 3, y: 5 },
	startBoxes: [
		{ x: 4, y: 1 },
		{ x: 3, y: 0 },
		{ x: 6, y: 5 },
	],
	pillars: [
		{ x: 3, y: 1 },
		{ x: 5, y: 1 },
		{ x: 5, y: 5 },
	],
	par: 6,
});

const falseStart: Level = parseLevel({
	id: "false-start-v1",
	title: "False Start",
	startPlayer: { x: 5, y: 7 },
	startBoxes: [
		{ x: 4, y: 0 },
		{ x: 4, y: 3 },
		{ x: 6, y: 5 },
	],
	pillars: [
		{ x: 6, y: 0 },
		{ x: 5, y: 1 },
		{ x: 2, y: 2 },
		{ x: 5, y: 2 },
		{ x: 6, y: 2 },
		{ x: 6, y: 3 },
		{ x: 4, y: 5 },
		{ x: 4, y: 6 },
		{ x: 7, y: 6 },
	],
	par: 9,
});

const outOfLine: Level = parseLevel({
	id: "out-of-line-v1",
	title: "Out of Line",
	startPlayer: { x: 0, y: 5 },
	startBoxes: [
		{ x: 1, y: 4 },
		{ x: 4, y: 4 },
		{ x: 1, y: 1 },
	],
	pillars: [
		{ x: 0, y: 0 },
		{ x: 6, y: 0 },
		{ x: 7, y: 0 },
		{ x: 0, y: 1 },
		{ x: 7, y: 2 },
		{ x: 0, y: 3 },
		{ x: 3, y: 3 },
		{ x: 6, y: 3 },
		{ x: 0, y: 4 },
		{ x: 2, y: 4 },
		{ x: 5, y: 4 },
		{ x: 4, y: 5 },
		{ x: 0, y: 7 },
		{ x: 2, y: 7 },
	],
	par: 7,
});

const borrowedSpace: Level = parseLevel({
	id: "borrowed-space-v1",
	title: "Borrowed Space",
	startPlayer: { x: 3, y: 4 },
	startBoxes: [
		{ x: 4, y: 1 },
		{ x: 0, y: 3 },
		{ x: 5, y: 4 },
	],
	pillars: [
		{ x: 6, y: 0 },
		{ x: 0, y: 6 },
		{ x: 6, y: 1 },
		{ x: 1, y: 6 },
		{ x: 6, y: 2 },
		{ x: 2, y: 6 },
		{ x: 6, y: 3 },
		{ x: 3, y: 6 },
		{ x: 6, y: 4 },
		{ x: 4, y: 6 },
		{ x: 6, y: 5 },
		{ x: 5, y: 6 },
		{ x: 6, y: 6 },
		{ x: 6, y: 7 },
		{ x: 7, y: 6 },
		{ x: 0, y: 1 },
		{ x: 2, y: 3 },
		{ x: 2, y: 4 },
		{ x: 3, y: 1 },
	],
	par: 7,
});

const spaceReserved: Level = parseLevel({
	id: "space-reserved-v1",
	title: "Space Reserved",
	startPlayer: { x: 3, y: 4 },
	startBoxes: [
		{ x: 4, y: 1 },
		{ x: 0, y: 3 },
		{ x: 5, y: 4 },
	],
	pillars: [
		{ x: 6, y: 0 },
		{ x: 0, y: 6 },
		{ x: 6, y: 1 },
		{ x: 1, y: 6 },
		{ x: 6, y: 2 },
		{ x: 2, y: 6 },
		{ x: 6, y: 3 },
		{ x: 3, y: 6 },
		{ x: 6, y: 4 },
		{ x: 4, y: 6 },
		{ x: 6, y: 5 },
		{ x: 5, y: 6 },
		{ x: 6, y: 6 },
		{ x: 6, y: 7 },
		{ x: 7, y: 6 },
		{ x: 0, y: 1 },
		{ x: 2, y: 3 },
		{ x: 2, y: 4 },
		{ x: 5, y: 3 },
	],
	par: 8,
});

const lastExit: Level = parseLevel({
	id: "last-exit-v1",
	title: "Last Exit",
	startPlayer: { x: 0, y: 0 },
	startBoxes: [
		{ x: 2, y: 3 },
		{ x: 4, y: 6 },
		{ x: 4, y: 0 },
	],
	pillars: [
		{ x: 3, y: 0 },
		{ x: 3, y: 1 },
		{ x: 0, y: 2 },
		{ x: 0, y: 3 },
		{ x: 1, y: 3 },
		{ x: 3, y: 3 },
		{ x: 3, y: 4 },
		{ x: 3, y: 5 },
		{ x: 3, y: 6 },
		{ x: 3, y: 7 },
	],
	par: 14,
});

const wrongCorner: Level = parseLevel({
	id: "wrong-corner-v1",
	title: "Wrong Corner",
	startPlayer: { x: 7, y: 2 },
	startBoxes: [
		{ x: 1, y: 0 },
		{ x: 1, y: 1 },
		{ x: 7, y: 6 },
	],
	pillars: [
		{ x: 5, y: 0 },
		{ x: 2, y: 1 },
		{ x: 3, y: 1 },
		{ x: 4, y: 3 },
		{ x: 7, y: 3 },
		{ x: 0, y: 4 },
		{ x: 6, y: 4 },
		{ x: 7, y: 4 },
		{ x: 4, y: 5 },
		{ x: 4, y: 6 },
		{ x: 0, y: 7 },
		{ x: 1, y: 7 },
	],
	par: 8,
});

const devilsDue: Level = parseLevel({
	id: "devils-due-v1",
	title: "Devil's Due",
	startPlayer: { x: 1, y: 2 },
	startBoxes: [
		{ x: 1, y: 6 },
		{ x: 7, y: 6 },
		{ x: 5, y: 4 },
	],
	pillars: [
		{ x: 5, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 5, y: 1 },
		{ x: 2, y: 3 },
		{ x: 6, y: 3 },
		{ x: 2, y: 4 },
		{ x: 4, y: 5 },
		{ x: 3, y: 6 },
		{ x: 3, y: 7 },
		{ x: 6, y: 7 },
	],
	par: 11,
});

export const levels: readonly Level[] = [
	defaultLevel,
	chooseTheStop,
	nearerBoxFirst,
	aroundThePillar,
	openCorners,
	screeningLine,
	turningRoom,
	splitCrossing,
	needlesEye,
	devilsElbow,
	falseStart,
	outOfLine,
	borrowedSpace,
	spaceReserved,
	lastExit,
	wrongCorner,
	devilsDue,
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
		levels: [
			openCorners,
			screeningLine,
			turningRoom,
			splitCrossing,
			needlesEye,
			devilsElbow,
		],
	},
	{
		title: "Expert",
		levels: [
			falseStart,
			outOfLine,
			borrowedSpace,
			spaceReserved,
			lastExit,
			wrongCorner,
			devilsDue,
		],
	},
];
