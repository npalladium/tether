import { describe, expect, it } from "vitest";
import {
	beginSession,
	completeAnimation,
	type Direction,
	pull,
	samePosition,
	walk,
} from "./game";
import { levels } from "./level";
import { tutorialLevel } from "./tutorial";

type SolutionStep = Readonly<{
	firing: Readonly<{ x: number; y: number }>;
	direction: Direction;
}>;

const solutions: Readonly<Record<string, readonly SolutionStep[]>> = {
	"first-connection-v1": [{ firing: { x: 0, y: 1 }, direction: "E" }],
	"choose-the-stop-v1": [
		{ firing: { x: 0, y: 7 }, direction: "N" },
		{ firing: { x: 3, y: 6 }, direction: "W" },
		{ firing: { x: 2, y: 2 }, direction: "S" },
	],
	"nearer-box-first-v1": [
		{ firing: { x: 1, y: 0 }, direction: "E" },
		{ firing: { x: 2, y: 2 }, direction: "N" },
		{ firing: { x: 3, y: 0 }, direction: "S" },
		{ firing: { x: 2, y: 0 }, direction: "E" },
	],
	"around-the-pillar-v1": [
		{ firing: { x: 0, y: 2 }, direction: "N" },
		{ firing: { x: 1, y: 2 }, direction: "N" },
		{ firing: { x: 7, y: 3 }, direction: "N" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
	],
	"open-corners-v1": [
		{ firing: { x: 1, y: 7 }, direction: "N" },
		{ firing: { x: 0, y: 5 }, direction: "E" },
		{ firing: { x: 1, y: 1 }, direction: "E" },
		{ firing: { x: 2, y: 6 }, direction: "N" },
	],
	"screening-line-v1": [
		{ firing: { x: 0, y: 5 }, direction: "E" },
		{ firing: { x: 2, y: 4 }, direction: "N" },
		{ firing: { x: 1, y: 2 }, direction: "E" },
		{ firing: { x: 1, y: 2 }, direction: "S" },
	],
	"turning-room-v1": [
		{ firing: { x: 6, y: 6 }, direction: "W" },
		{ firing: { x: 7, y: 2 }, direction: "W" },
		{ firing: { x: 5, y: 1 }, direction: "S" },
	],
	"split-crossing-v1": [
		{ firing: { x: 6, y: 1 }, direction: "S" },
		{ firing: { x: 0, y: 4 }, direction: "N" },
		{ firing: { x: 0, y: 0 }, direction: "E" },
		{ firing: { x: 1, y: 4 }, direction: "N" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
	],
	"needles-eye-v1": [
		{ firing: { x: 3, y: 0 }, direction: "W" },
		{ firing: { x: 4, y: 0 }, direction: "S" },
		{ firing: { x: 1, y: 1 }, direction: "E" },
		{ firing: { x: 0, y: 6 }, direction: "E" },
		{ firing: { x: 1, y: 0 }, direction: "S" },
	],
	"devils-elbow-v1": [
		{ firing: { x: 0, y: 0 }, direction: "E" },
		{ firing: { x: 6, y: 1 }, direction: "S" },
		{ firing: { x: 1, y: 2 }, direction: "E" },
		{ firing: { x: 1, y: 3 }, direction: "N" },
		{ firing: { x: 4, y: 4 }, direction: "N" },
		{ firing: { x: 0, y: 3 }, direction: "E" },
	],
	"false-start-v1": [
		{ firing: { x: 0, y: 3 }, direction: "E" },
		{ firing: { x: 0, y: 0 }, direction: "E" },
		{ firing: { x: 1, y: 5 }, direction: "N" },
		{ firing: { x: 6, y: 7 }, direction: "N" },
		{ firing: { x: 6, y: 4 }, direction: "W" },
		{ firing: { x: 1, y: 5 }, direction: "N" },
		{ firing: { x: 5, y: 6 }, direction: "N" },
		{ firing: { x: 6, y: 4 }, direction: "S" },
		{ firing: { x: 6, y: 4 }, direction: "W" },
	],
	"out-of-line-v1": [
		{ firing: { x: 1, y: 6 }, direction: "N" },
		{ firing: { x: 3, y: 5 }, direction: "W" },
		{ firing: { x: 4, y: 1 }, direction: "S" },
		{ firing: { x: 0, y: 5 }, direction: "E" },
		{ firing: { x: 3, y: 1 }, direction: "W" },
		{ firing: { x: 1, y: 0 }, direction: "S" },
		{ firing: { x: 1, y: 2 }, direction: "E" },
	],
	"borrowed-space-v1": [
		{ firing: { x: 5, y: 1 }, direction: "S" },
		{ firing: { x: 4, y: 3 }, direction: "N" },
		{ firing: { x: 0, y: 5 }, direction: "N" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
		{ firing: { x: 1, y: 4 }, direction: "N" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
		{ firing: { x: 0, y: 2 }, direction: "S" },
	],
	"space-reserved-v1": [
		{ firing: { x: 4, y: 3 }, direction: "N" },
		{ firing: { x: 3, y: 4 }, direction: "E" },
		{ firing: { x: 0, y: 5 }, direction: "N" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
		{ firing: { x: 4, y: 1 }, direction: "S" },
		{ firing: { x: 1, y: 4 }, direction: "N" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
		{ firing: { x: 0, y: 2 }, direction: "S" },
	],
	"last-exit-v1": [
		{ firing: { x: 2, y: 0 }, direction: "S" },
		{ firing: { x: 6, y: 0 }, direction: "W" },
		{ firing: { x: 4, y: 1 }, direction: "S" },
		{ firing: { x: 6, y: 2 }, direction: "W" },
		{ firing: { x: 2, y: 5 }, direction: "N" },
		{ firing: { x: 0, y: 4 }, direction: "E" },
		{ firing: { x: 1, y: 2 }, direction: "E" },
		{ firing: { x: 2, y: 0 }, direction: "S" },
		{ firing: { x: 5, y: 3 }, direction: "N" },
		{ firing: { x: 2, y: 6 }, direction: "N" },
		{ firing: { x: 0, y: 5 }, direction: "E" },
		{ firing: { x: 1, y: 2 }, direction: "E" },
		{ firing: { x: 2, y: 0 }, direction: "S" },
		{ firing: { x: 2, y: 5 }, direction: "N" },
	],
	"wrong-corner-v1": [
		{ firing: { x: 5, y: 6 }, direction: "E" },
		{ firing: { x: 1, y: 3 }, direction: "N" },
		{ firing: { x: 6, y: 2 }, direction: "W" },
		{ firing: { x: 1, y: 3 }, direction: "N" },
		{ firing: { x: 5, y: 6 }, direction: "N" },
		{ firing: { x: 6, y: 2 }, direction: "W" },
		{ firing: { x: 7, y: 5 }, direction: "W" },
		{ firing: { x: 5, y: 6 }, direction: "N" },
	],
	"devils-due-v1": [
		{ firing: { x: 7, y: 1 }, direction: "S" },
		{ firing: { x: 1, y: 4 }, direction: "S" },
		{ firing: { x: 3, y: 4 }, direction: "E" },
		{ firing: { x: 4, y: 1 }, direction: "S" },
		{ firing: { x: 3, y: 5 }, direction: "W" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
		{ firing: { x: 1, y: 6 }, direction: "N" },
		{ firing: { x: 2, y: 7 }, direction: "N" },
		{ firing: { x: 3, y: 5 }, direction: "W" },
		{ firing: { x: 0, y: 2 }, direction: "E" },
		{ firing: { x: 1, y: 6 }, direction: "N" },
	],
	"guided-first-pull-v1": [{ firing: { x: 2, y: 3 }, direction: "E" }],
};

describe("authored level solutions", () => {
	for (const level of [...levels, tutorialLevel]) {
		it(`${level.title} reaches a win at its declared par`, () => {
			const solution = solutions[level.id];
			expect(solution, `missing solution for ${level.id}`).toBeDefined();
			let session = beginSession(level);

			for (const step of solution ?? []) {
				if (!samePosition(session.state.player, step.firing)) {
					const walked = walk(session, step.firing);
					expect(walked.kind, `walk rejected in ${level.id}`).toBe("ACCEPTED");
					if (walked.kind !== "ACCEPTED") return;
					session = completeAnimation(walked.session);
				}

				const pulled = pull(session, step.direction);
				expect(pulled.kind, `pull rejected in ${level.id}`).toBe("ACCEPTED");
				if (pulled.kind !== "ACCEPTED") return;
				session = completeAnimation(pulled.session);
			}

			expect(session.phase).toBe("WON");
			expect(session.state.pulls).toBe(level.par);
		});
	}

	it("covers every current authored level exactly once", () => {
		expect(Object.keys(solutions).sort()).toEqual(
			[...levels, tutorialLevel].map((level) => level.id).sort(),
		);
	});
});
