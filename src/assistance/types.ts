import type { Direction, Position } from "../game";

export type SolutionStep = Readonly<{
	firing: Position;
	direction: Direction;
	target: Position;
	destination: Position;
}>;

export type Solution = readonly SolutionStep[];

export type SolutionResult =
	| Readonly<{
			kind: "SOLUTIONS";
			minimumPulls: number;
			solutions: readonly Solution[];
	  }>
	| Readonly<{ kind: "WON" }>
	| Readonly<{ kind: "UNSOLVABLE" }>;

export type AssistanceMode = "hint" | "solution";

export type Hint = Readonly<{
	title: string;
	text: string;
}>;
