import { type Level, parseLevel } from "./game";

/** The documented verified-enclosure example level. */
export const defaultLevel: Level = parseLevel({
	id: "verified-enclosure",
	title: "Verified enclosure",
	startPlayer: { x: 0, y: 0 },
	startBoxes: [
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: 2, y: 3 },
	],
	pillars: [{ x: 3, y: 1 }],
});
