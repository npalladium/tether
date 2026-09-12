import {
	beginSession,
	completeAnimation,
	DIRECTIONS,
	type Direction,
	pull,
	replay,
	reset,
	type Session,
	undo,
	walk,
} from "../game";
import { defaultLevel } from "../level";

export const HELP_TEXT = [
	"Commands:",
	"  walk x y       Walk to a reachable tile (coordinates are 0–7).",
	"  pull N|E|S|W  Pull the first visible box.",
	"  undo           Undo the last successful pull.",
	"  reset          Restart the level.",
	"  help           Show these commands.",
	"  quit           Exit the game.",
].join("\n");

export type GameTerminal = Readonly<{
	input: AsyncIterable<string>;
	isInteractive: boolean;
	write(text: string): void;
}>;

export type InputResult =
	| Readonly<{ kind: "CONTINUE"; session: Session; message?: string }>
	| Readonly<{ kind: "QUIT"; session: Session }>;

export function renderSession(session: Session): string {
	const { level, state } = session;
	const columnLabels = Array.from({ length: level.width }, (_, x) => x).join(
		" ",
	);
	const lines = [`Tether — ${level.title ?? level.id}`, `    ${columnLabels}`];

	for (let y = 0; y < level.height; y += 1) {
		const cells: string[] = [];
		for (let x = 0; x < level.width; x += 1) {
			if (state.player.x === x && state.player.y === y) {
				cells.push("@");
			} else if (state.boxes.some((box) => box.x === x && box.y === y)) {
				cells.push("B");
			} else if (
				level.pillars.some((pillar) => pillar.x === x && pillar.y === y)
			) {
				cells.push("#");
			} else {
				cells.push(".");
			}
		}
		lines.push(`${y.toString().padStart(2, " ")}  ${cells.join(" ")}`);
	}

	lines.push(
		`Phase: ${session.phase}`,
		`Pulls: ${state.pulls} | Best: ${session.bestPulls ?? "—"}`,
	);
	return `${lines.join("\n")}\n`;
}

export function executeInput(session: Session, input: string): InputResult {
	const words = input.trim().split(/\s+/).filter(Boolean);
	const command = words[0]?.toLowerCase();

	if (command === "quit" && words.length === 1) {
		return { kind: "QUIT", session };
	}
	if (command === "help" && words.length === 1) {
		return { kind: "CONTINUE", session, message: HELP_TEXT };
	}
	if (command === "undo" && words.length === 1) {
		return { kind: "CONTINUE", session: undo(session) };
	}
	if (command === "reset" && words.length === 1) {
		return {
			kind: "CONTINUE",
			session: session.phase === "WON" ? replay(session) : reset(session),
		};
	}
	if (command === "walk") {
		return executeWalk(session, words);
	}
	if (command === "pull") {
		return executePull(session, words);
	}
	return {
		kind: "CONTINUE",
		session,
		message: "Unknown command. Type help for available commands.",
	};
}

export async function runGame(terminal: GameTerminal): Promise<Session> {
	let session = beginSession(defaultLevel);
	terminal.write(renderSession(session));
	const inputs = terminal.input[Symbol.asyncIterator]();

	while (true) {
		if (terminal.isInteractive) terminal.write("> ");
		const next = await inputs.next();
		if (next.done) return session;

		const result = executeInput(session, next.value);
		if (result.kind === "QUIT") return result.session;
		session = result.session;
		if (result.message) terminal.write(`${result.message}\n`);
		terminal.write(renderSession(session));
	}
}

function executeWalk(session: Session, words: readonly string[]): InputResult {
	const x = Number(words[1]);
	const y = Number(words[2]);
	const hasValidCoordinates =
		words.length === 3 &&
		/^\d+$/.test(words[1] ?? "") &&
		/^\d+$/.test(words[2] ?? "") &&
		Number.isInteger(x) &&
		Number.isInteger(y) &&
		x >= 0 &&
		x < session.level.width &&
		y >= 0 &&
		y < session.level.height;
	if (!hasValidCoordinates) {
		return {
			kind: "CONTINUE",
			session,
			message: "Walk coordinates must be integers from 0 to 7.",
		};
	}

	const result = walk(session, { x, y });
	if (result.kind === "REJECTED") {
		return {
			kind: "CONTINUE",
			session,
			message: messageForRejection(result.reason),
		};
	}
	return { kind: "CONTINUE", session: completeAnimation(result.session) };
}

function executePull(session: Session, words: readonly string[]): InputResult {
	const direction = words[1]?.toUpperCase();
	if (words.length !== 2 || !isDirection(direction)) {
		return {
			kind: "CONTINUE",
			session,
			message: "Pull direction must be N, E, S, or W.",
		};
	}

	const result = pull(session, direction);
	if (result.kind === "REJECTED") {
		return {
			kind: "CONTINUE",
			session,
			message: messageForRejection(result.reason),
		};
	}
	return { kind: "CONTINUE", session: completeAnimation(result.session) };
}

function isDirection(value: string | undefined): value is Direction {
	return (
		value !== undefined && DIRECTIONS.some((direction) => direction === value)
	);
}

function messageForRejection(reason: string): string {
	switch (reason) {
		case "UNREACHABLE":
			return "That tile is not reachable.";
		case "NO_TARGET":
			return "No box is visible in that direction.";
		case "BLOCKED":
			return "A pillar blocks the tether.";
		case "ADJACENT":
			return "That box is already adjacent.";
		case "INPUT_LOCKED":
			return "Finish the current action first.";
		default:
			return "That action was rejected.";
	}
}
