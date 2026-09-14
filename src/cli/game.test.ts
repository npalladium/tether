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

		expect(rendered).toContain("Tether — First connection");
		expect(rendered).toContain("    0 1 2 3 4 5 6 7");
		expect(rendered).toContain(" 0  B B . . . . . .");
		expect(rendered).toContain(" 1  @ . . . . . . B");
		expect(rendered).toContain("Phase: READY");
		expect(rendered).toContain("Pulls: 0 | Best: —");
	});

	it("advises whether undo is available after no legal pulls", () => {
		const noPulls = {
			...beginSession(defaultLevel),
			phase: "NO_PULLS" as const,
		};
		const withHistory = { ...noPulls, history: [noPulls.state] };

		expect(renderSession(noPulls)).toContain(
			"No legal pulls remain. Use reset to restart the level.",
		);
		expect(renderSession(noPulls)).not.toContain("Use undo to recover");
		expect(renderSession(withHistory)).toContain(
			"No legal pulls remain. Use undo to recover or reset to restart the level.",
		);
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
			["walk 1 0", "That tile is not reachable."],
			["pull up", "Pull direction must be N, E, S, or W."],
			["pull w", "No box is visible in that direction."],
			["dance", "Unknown command. Type help for available commands."],
		] as const) {
			const result = executeInput(session, input);
			expect(result).toMatchObject({ kind: "CONTINUE", session, message });
		}
	});

	it("rejects walking to the current tile without settling", () => {
		const session = beginSession(defaultLevel);
		const result = executeInput(session, "walk 0 1");

		expect(result).toMatchObject({
			kind: "CONTINUE",
			message: "You are already on that tile.",
		});
		if (result.kind !== "CONTINUE") {
			throw new Error("Expected walking to continue the game");
		}
		expect(result.session).toBe(session);
		expect(result.session.phase).toBe("READY");
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
	it("plays the introductory one-pull solution from scripted input", async () => {
		const { terminal, output } = scriptedTerminal(["pull e", "quit"]);

		const session = await runGame(terminal);
		expect(session).toMatchObject({
			phase: "WON",
			state: { pulls: 1 },
			bestPulls: 1,
		});
		expect(output()).toContain("Phase: WON");
		expect(output()).toContain("Pulls: 1 | Best: 1");
	});
});
