import { describe, expect, it } from "vitest";
import type { Session } from "../game";
import { beginSession } from "../game";
import { defaultLevel } from "../level";
import {
	executeInput,
	type GameTerminal,
	HELP_TEXT,
	renderSession,
	runGame,
} from "./game";

function inputFrom(lines: readonly string[]): AsyncIterable<string> {
	return {
		async *[Symbol.asyncIterator]() {
			for (const line of lines) yield line;
		},
	};
}

function scriptedTerminal(lines: readonly string[]): {
	terminal: GameTerminal;
	output: () => string;
} {
	const writes: string[] = [];
	return {
		terminal: {
			input: inputFrom(lines),
			isInteractive: false,
			write(text) {
				writes.push(text);
			},
		},
		output: () => writes.join(""),
	};
}

function continueWith(session: Session, input: string): Session {
	const result = executeInput(session, input);
	if (result.kind !== "CONTINUE") {
		throw new Error(`Expected ${input} to continue the game`);
	}
	return result.session;
}

describe("CLI rendering", () => {
	it("renders the single level with coordinates, entities, and status", () => {
		const rendered = renderSession(beginSession(defaultLevel));

		expect(rendered).toContain("Tether — Verified enclosure");
		expect(rendered).toContain("    0 1 2 3 4 5 6 7");
		expect(rendered).toContain(" 0  @ B B . . . . .");
		expect(rendered).toContain(" 1  . . . # . . . .");
		expect(rendered).toContain("Phase: READY");
		expect(rendered).toContain("Pulls: 0 | Best: —");
	});
});

describe("CLI commands", () => {
	it("walks and pulls through settled engine transitions", () => {
		let session = beginSession(defaultLevel);
		session = continueWith(session, "walk 1 2");
		expect(session).toMatchObject({
			phase: "READY",
			state: { player: { x: 1, y: 2 }, pulls: 0 },
		});

		session = continueWith(session, "pull n");
		expect(session).toMatchObject({
			phase: "READY",
			state: { player: { x: 1, y: 2 }, pulls: 1 },
		});
	});

	it("explains malformed and rejected actions without changing state", () => {
		const session = beginSession(defaultLevel);

		for (const [input, message] of [
			["walk 8 0", "Walk coordinates must be integers from 0 to 7."],
			["walk 2 0", "That tile is not reachable."],
			["pull up", "Pull direction must be N, E, S, or W."],
			["pull w", "No box is visible in that direction."],
			["dance", "Unknown command. Type help for available commands."],
		] as const) {
			const result = executeInput(session, input);
			expect(result).toMatchObject({ kind: "CONTINUE", session, message });
		}
	});

	it("supports help, quit, undo, and reset", () => {
		const initial = beginSession(defaultLevel);
		expect(executeInput(initial, "help")).toMatchObject({
			kind: "CONTINUE",
			message: HELP_TEXT,
		});
		expect(executeInput(initial, "quit")).toEqual({
			kind: "QUIT",
			session: initial,
		});

		const pulled = continueWith(continueWith(initial, "walk 1 2"), "pull n");
		const undone = continueWith(pulled, "undo");
		expect(undone.state).toMatchObject({
			pulls: 0,
			boxes: defaultLevel.startBoxes,
		});
		const resetSession = continueWith(pulled, "reset");
		expect(resetSession).toMatchObject({
			phase: "READY",
			state: { player: defaultLevel.startPlayer, pulls: 0 },
			history: [],
		});
	});
});

describe("interactive game loop", () => {
	it("plays the documented three-pull solution from scripted input", async () => {
		const { terminal, output } = scriptedTerminal([
			"walk 1 2",
			"pull n",
			"walk 0 0",
			"pull e",
			"walk 2 0",
			"pull s",
			"quit",
		]);

		const session = await runGame(terminal);
		expect(session).toMatchObject({
			phase: "WON",
			state: { pulls: 3 },
			bestPulls: 3,
		});
		expect(output()).toContain("Phase: WON");
		expect(output()).toContain("Pulls: 3 | Best: 3");
	});
});
