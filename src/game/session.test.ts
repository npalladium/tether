import { describe, expect, it } from "vitest";
import { type LevelDefinition, parseLevel } from "./model";
import {
	beginSession,
	completeAnimation,
	pull,
	replay,
	reset,
	undo,
	walk,
} from "./session";

const openLevel = {
	id: "open",
	pillars: [],
	startPlayer: { x: 0, y: 0 },
	startBoxes: [
		{ x: 3, y: 0 },
		{ x: 5, y: 5 },
		{ x: 7, y: 7 },
	],
} as const satisfies LevelDefinition;

function accepted<T extends { kind: string }>(
	result: T,
): Extract<T, { kind: "ACCEPTED" }> {
	if (result.kind !== "ACCEPTED") {
		throw new Error(`Expected an accepted command, received ${result.kind}`);
	}
	return result as Extract<T, { kind: "ACCEPTED" }>;
}

describe("session commands", () => {
	it("walks for free and locks input until movement completes", () => {
		const initial = beginSession(parseLevel(openLevel));
		const walking = accepted(walk(initial, { x: 2, y: 0 })).session;

		expect(walking).toMatchObject({
			phase: "WALKING",
			state: { player: { x: 2, y: 0 }, pulls: 0 },
			history: [],
		});
		expect(pull(walking, "E")).toMatchObject({
			kind: "REJECTED",
			reason: "INPUT_LOCKED",
			session: walking,
		});
		expect(completeAnimation(walking).phase).toBe("READY");
	});

	it("rejects illegal pulls without changing the attempt", () => {
		const initial = beginSession(parseLevel(openLevel));

		expect(pull(initial, "N")).toEqual({
			kind: "REJECTED",
			reason: "NO_TARGET",
			session: initial,
		});
	});

	it("snapshots successful pulls and restores the firing position on undo", () => {
		const level = parseLevel({
			id: "undo-firing-position",
			pillars: [],
			startPlayer: { x: 0, y: 0 },
			startBoxes: [
				{ x: 0, y: 4 },
				{ x: 5, y: 5 },
				{ x: 7, y: 7 },
			],
		});
		const initial = beginSession(level);
		const firing = completeAnimation(
			accepted(walk(initial, { x: 0, y: 2 })).session,
		);
		const sliding = accepted(pull(firing, "S")).session;

		expect(sliding.phase).toBe("SLIDING");
		expect(sliding.state).toMatchObject({
			player: { x: 0, y: 2 },
			pulls: 1,
		});
		expect(sliding.history).toHaveLength(1);
		expect(walk(sliding, { x: 1, y: 1 }).reason).toBe("INPUT_LOCKED");

		const ready = completeAnimation(sliding);
		const restored = undo(ready);
		expect(restored).toMatchObject({
			phase: "READY",
			state: {
				player: { x: 0, y: 2 },
				boxes: level.startBoxes,
				pulls: 0,
			},
			history: [],
		});
	});

	it("locks reset during animation, then clears history without erasing the best", () => {
		const level = parseLevel(openLevel);
		const initial = beginSession(level, 4);
		const sliding = accepted(pull(initial, "E")).session;

		expect(reset(sliding)).toBe(sliding);
		expect(replay(sliding)).toBe(sliding);

		const restarted = reset(completeAnimation(sliding));
		expect(restarted).toMatchObject({
			phase: "READY",
			state: { player: level.startPlayer, boxes: level.startBoxes, pulls: 0 },
			history: [],
			bestPulls: 4,
		});
	});
});

describe("session evaluation", () => {
	it("records a completed pull and preserves the best after undo", () => {
		const level = parseLevel({
			id: "one-pull-win",
			pillars: [],
			startPlayer: { x: 0, y: 1 },
			startBoxes: [
				{ x: 3, y: 1 },
				{ x: 1, y: 0 },
				{ x: 2, y: 0 },
			],
		});
		const initial = beginSession(level);
		const won = completeAnimation(accepted(pull(initial, "E")).session);

		expect(won.phase).toBe("WON");
		expect(won.bestPulls).toBe(1);

		const replayed = replay(won);
		expect(replayed).toMatchObject({
			phase: "READY",
			state: { player: level.startPlayer, boxes: level.startBoxes, pulls: 0 },
			history: [],
			bestPulls: 1,
		});

		const restored = undo(won);
		expect(restored.phase).toBe("READY");
		expect(restored.bestPulls).toBe(1);
	});

	it("checks a trapped win before the no-pulls advisory", () => {
		const level = parseLevel({
			id: "trapped-win",
			pillars: [],
			startPlayer: { x: 0, y: 0 },
			startBoxes: [
				{ x: 1, y: 0 },
				{ x: 0, y: 1 },
				{ x: 1, y: 1 },
			],
		});

		const session = beginSession(level);
		expect(session.phase).toBe("WON");
		expect(session.bestPulls).toBe(0);
	});

	it("reports a non-winning enclosure without forcing reset", () => {
		const level = parseLevel({
			id: "trapped",
			pillars: [{ x: 3, y: 1 }],
			startPlayer: { x: 2, y: 1 },
			startBoxes: [
				{ x: 1, y: 1 },
				{ x: 2, y: 0 },
				{ x: 2, y: 2 },
			],
		});
		const session = beginSession(level);

		expect(session.phase).toBe("NO_PULLS");
		expect(reset(session).phase).toBe("NO_PULLS");
	});
});
