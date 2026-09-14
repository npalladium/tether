import { run } from "@stricli/core";
import { describe, expect, it } from "vitest";
import { application, type CliContext } from "./app";
import type { GameTerminal } from "./game";

function singleInput(line: string): AsyncIterable<string> {
	return {
		async *[Symbol.asyncIterator]() {
			yield line;
		},
	};
}

describe("Stricli application", () => {
	it("runs the interactive game as its single command", async () => {
		const output: string[] = [];
		const errors: string[] = [];
		const terminal: GameTerminal = {
			input: singleInput("quit"),
			isInteractive: false,
			write(text) {
				output.push(text);
			},
		};
		const context: CliContext = {
			process: {
				stdout: { write: (text) => output.push(text) },
				stderr: { write: (text) => errors.push(text) },
			},
			terminal,
		};

		await run(application, [], context);

		expect(errors).toEqual([]);
		expect(output.join("")).toContain("Tether — First connection");
	});

	it("lets Stricli render command help without opening the game", async () => {
		const output: string[] = [];
		let gameOpened = false;
		const context: CliContext = {
			process: {
				stdout: { write: (text) => output.push(text) },
				stderr: { write: () => undefined },
			},
			terminal: {
				input: singleInput("quit"),
				isInteractive: false,
				write() {
					gameOpened = true;
				},
			},
		};

		await run(application, ["--help"], context);

		expect(gameOpened).toBe(false);
		expect(output.join("")).toContain("Play one Tether level");
	});
});
