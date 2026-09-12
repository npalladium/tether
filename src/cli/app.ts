import {
	buildApplication,
	buildCommand,
	type CommandContext,
} from "@stricli/core";
import { type GameTerminal, runGame } from "./game";

export interface CliContext extends CommandContext {
	readonly terminal: GameTerminal;
}

const playCommand = buildCommand({
	async func(this: CliContext, _flags: Record<string, never>) {
		await runGame(this.terminal);
	},
	parameters: { flags: {} },
	docs: {
		brief: "Play one Tether level",
	},
});

export const application = buildApplication(playCommand, {
	name: "tether",
});
