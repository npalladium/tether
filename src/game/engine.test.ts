import { describe, expect, it } from "vitest";
import {
	beginSession,
	completeAnimation,
	type Direction,
	type Position,
	parseLevel,
	pull,
	type Session,
	walk,
} from "./index";

const enclosure = parseLevel({
	id: "verified-enclosure",
	pillars: [{ x: 3, y: 1 }],
	startPlayer: { x: 0, y: 0 },
	startBoxes: [
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: 2, y: 3 },
	],
});

function move(session: Session, destination: Position): Session {
	const result = walk(session, destination);
	if (result.kind !== "ACCEPTED") {
		throw new Error(`Walk was rejected: ${result.reason}`);
	}
	return completeAnimation(result.session);
}

function fire(session: Session, direction: Direction): Session {
	const result = pull(session, direction);
	if (result.kind !== "ACCEPTED") {
		throw new Error(`Pull was rejected: ${result.reason}`);
	}
	return completeAnimation(result.session);
}

function firstPull(): Session {
	return fire(move(beginSession(enclosure), { x: 1, y: 2 }), "N");
}

describe("the verified enclosure", () => {
	it("reaches the documented non-winning trap", () => {
		const trapped = fire(move(firstPull(), { x: 2, y: 1 }), "S");

		expect(trapped).toMatchObject({
			phase: "NO_PULLS",
			state: {
				player: { x: 2, y: 1 },
				boxes: [
					{ x: 1, y: 1 },
					{ x: 2, y: 0 },
					{ x: 2, y: 2 },
				],
				pulls: 2,
			},
		});
	});

	it("replays the documented winning alternative", () => {
		let session = firstPull();
		session = fire(move(session, { x: 0, y: 0 }), "E");
		session = fire(move(session, { x: 2, y: 0 }), "S");

		expect(session).toMatchObject({
			phase: "WON",
			state: {
				player: { x: 2, y: 0 },
				boxes: [
					{ x: 1, y: 1 },
					{ x: 1, y: 0 },
					{ x: 2, y: 1 },
				],
				pulls: 3,
			},
			bestPulls: 3,
		});
	});
});
