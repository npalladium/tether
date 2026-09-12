#!/usr/bin/env node

import { createInterface } from "node:readline";
import { run } from "@stricli/core";
import { application } from "./app";
import type { GameTerminal } from "./game";

const lines = createInterface({
	input: process.stdin,
	output: process.stdout,
	crlfDelay: Number.POSITIVE_INFINITY,
	terminal: process.stdin.isTTY,
});
const terminal: GameTerminal = {
	input: lines,
	isInteractive: process.stdin.isTTY === true,
	write(text) {
		process.stdout.write(text);
	},
};

try {
	await run(application, process.argv.slice(2), { process, terminal });
} finally {
	lines.close();
}
