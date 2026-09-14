import { describe, expect, it } from "vitest";
import {
	beginSession,
	completeAnimation,
	type GameState,
	type Level,
	parseLevel,
	pull,
	resolvePull,
	type Session,
	samePosition,
	walk,
} from "../game";
import { levels } from "../level";
import { solve } from "./solver";
import type { Solution } from "./types";

function replay(level: Level, state: GameState, solution: Solution): Session {
	let session: Session = {
		level,
		state,
		history: [],
		phase: "READY",
		bestPulls: undefined,
	};
	for (const step of solution) {
		if (!samePosition(session.state.player, step.firing)) {
			const walked = walk(session, step.firing);
			expect(walked.kind).toBe("ACCEPTED");
			if (walked.kind !== "ACCEPTED") throw new Error(walked.reason);
			session = completeAnimation(walked.session);
		}
		expect(resolvePull(level, session.state, step.direction)).toEqual({
			kind: "LEGAL",
			target: step.target,
			destination: step.destination,
		});
		const pulled = pull(session, step.direction);
		expect(pulled.kind).toBe("ACCEPTED");
		if (pulled.kind !== "ACCEPTED") throw new Error(pulled.reason);
		session = completeAnimation(pulled.session);
	}
	return session;
}

const partitioned = parseLevel({
	id: "partitioned-assistance",
	startPlayer: { x: 2, y: 1 },
	startBoxes: [
		{ x: 1, y: 1 },
		{ x: 2, y: 0 },
		{ x: 2, y: 2 },
	],
	pillars: [{ x: 3, y: 1 }],
});

describe("current-position solutions", () => {
	it("distinguishes reachable player components for the same boxes", () => {
		const trapped = beginSession(partitioned).state;
		expect(solve(partitioned, trapped)).toEqual({ kind: "UNSOLVABLE" });
		const outside = { ...trapped, player: { x: 0, y: 0 } };
		const result = solve(partitioned, outside);
		expect(result.kind).toBe("SOLUTIONS");
		if (result.kind !== "SOLUTIONS") throw new Error(result.kind);
		for (const solution of result.solutions) {
			expect(replay(partitioned, outside, solution).phase).toBe("WON");
		}
	});

	it("proves no winning continuation even when a pull remains legal", () => {
		const corridor = parseLevel({
			id: "one-row-corridor",
			startPlayer: { x: 0, y: 0 },
			startBoxes: [
				{ x: 2, y: 0 },
				{ x: 4, y: 0 },
				{ x: 7, y: 0 },
			],
			pillars: Array.from({ length: 56 }, (_, index) => ({
				x: index % 8,
				y: Math.floor(index / 8) + 1,
			})),
		});
		const session = beginSession(corridor);
		expect(session.phase).toBe("READY");
		expect(solve(corridor, session.state)).toEqual({ kind: "UNSOLVABLE" });
	});

	it("returns distinct shortest alternatives and adapts after a pull", () => {
		const level = levels.find(
			(candidate) => candidate.id === "turning-room-v1",
		);
		if (!level) throw new Error("Missing Turning room");
		const initial = beginSession(level).state;
		const before = JSON.stringify(initial);
		const result = solve(level, initial);
		expect(result.kind).toBe("SOLUTIONS");
		if (result.kind !== "SOLUTIONS") throw new Error(result.kind);
		expect(result.minimumPulls).toBe(3);
		expect(result.solutions).toHaveLength(3);
		expect(
			new Set(result.solutions.map((route) => JSON.stringify(route))).size,
		).toBe(3);
		for (const route of result.solutions) {
			expect(route).toHaveLength(3);
			expect(replay(level, initial, route).phase).toBe("WON");
		}
		const first = result.solutions[0]?.[0];
		if (!first) throw new Error("Missing first solution step");
		const progressed = replay(level, initial, [first]);
		const continuation = solve(level, progressed.state);
		expect(continuation.kind).toBe("SOLUTIONS");
		if (continuation.kind !== "SOLUTIONS") throw new Error(continuation.kind);
		expect(continuation.minimumPulls).toBe(2);
		for (const route of continuation.solutions) {
			const final = replay(level, progressed.state, route);
			expect(final.phase).toBe("WON");
			expect(final.state.pulls).toBe(3);
			expect(solve(level, final.state)).toEqual({ kind: "WON" });
		}
		expect(JSON.stringify(initial)).toBe(before);
	});
});
