import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	BOARD_SIZE,
	BOX_COUNT,
	beginSession,
	completeAnimation,
	DIRECTIONS,
	type Direction,
	deltaByDirection,
	type Level,
	type Position,
	parseLevel,
	positionKey,
	pull,
	reachableTiles,
	resolvePull,
	type Session,
	samePosition,
	undo,
	walk,
} from "./index";

type GeneratedGameplay = Readonly<{
	level: Level;
	choices: readonly number[];
}>;

type PullTransition = Readonly<{
	from: Session;
	beforePull: Session;
	sliding: Session;
	settled: Session;
}>;

type PullOption = Readonly<{
	beforePull: Session;
	sliding: Session;
}>;

const cellArbitrary = fc.integer({ min: 0, max: BOARD_SIZE * BOARD_SIZE - 1 });

const levelArbitrary = fc
	.tuple(
		fc.constantFrom(...DIRECTIONS),
		fc.integer({ min: 0, max: BOARD_SIZE - 1 }),
		fc.integer({ min: 0, max: BOARD_SIZE - 3 }),
	)
	.chain(([direction, line, offset]) => {
		const { player, target } = pullSetup(direction, line, offset);
		const unavailable = new Set([
			player.y * BOARD_SIZE + player.x,
			...rayFrom(player, direction).map(
				(position) => position.y * BOARD_SIZE + position.x,
			),
		]);

		return fc
			.uniqueArray(
				cellArbitrary.filter((cell) => !unavailable.has(cell)),
				{
					minLength: 2,
					maxLength: 8,
				},
			)
			.map((cells) =>
				parseLevel({
					id: `generated-${direction}-${line}-${offset}-${cells.join("-")}`,
					startPlayer: player,
					startBoxes: [
						target,
						positionFromCell(requiredAt(cells, 0)),
						positionFromCell(requiredAt(cells, 1)),
					],
					pillars: cells.slice(2).map(positionFromCell),
				}),
			);
	});

const choicesArbitrary = fc.array(fc.integer({ min: 0, max: 10_000 }), {
	minLength: 2,
	maxLength: 8,
});

const gameplayArbitrary = fc
	.record({
		level: levelArbitrary,
		choices: choicesArbitrary,
	})
	.filter(({ level }) => beginSession(level).phase === "READY");

const winningGameplayArbitrary = fc
	.tuple(
		fc.constantFrom(...DIRECTIONS),
		fc.integer({ min: 0, max: BOARD_SIZE - 2 }),
		fc.integer({ min: 0, max: BOARD_SIZE - 5 }),
	)
	.map(([direction, line, offset]) => {
		const { player, target, supportingBoxes } = winningSetup(
			direction,
			line,
			offset,
		);
		return {
			direction,
			level: parseLevel({
				id: `winning-${direction}-${line}-${offset}`,
				startPlayer: player,
				startBoxes: [target, ...supportingBoxes],
				pillars: [],
			}),
		};
	});

function pullSetup(
	direction: Direction,
	line: number,
	offset: number,
): Readonly<{ player: Position; target: Position }> {
	switch (direction) {
		case "E":
			return {
				player: { x: offset, y: line },
				target: { x: offset + 2, y: line },
			};
		case "W":
			return {
				player: { x: BOARD_SIZE - 1 - offset, y: line },
				target: { x: BOARD_SIZE - 3 - offset, y: line },
			};
		case "S":
			return {
				player: { x: line, y: offset },
				target: { x: line, y: offset + 2 },
			};
		case "N":
			return {
				player: { x: line, y: BOARD_SIZE - 1 - offset },
				target: { x: line, y: BOARD_SIZE - 3 - offset },
			};
	}
}

function winningSetup(
	direction: Direction,
	line: number,
	offset: number,
): Readonly<{
	player: Position;
	target: Position;
	supportingBoxes: readonly [Position, Position];
}> {
	switch (direction) {
		case "E":
			return {
				player: { x: offset, y: line },
				target: { x: offset + 4, y: line },
				supportingBoxes: [
					{ x: offset + 1, y: line + 1 },
					{ x: offset + 2, y: line + 1 },
				],
			};
		case "W":
			return {
				player: { x: BOARD_SIZE - 1 - offset, y: line },
				target: { x: BOARD_SIZE - 5 - offset, y: line },
				supportingBoxes: [
					{ x: BOARD_SIZE - 2 - offset, y: line + 1 },
					{ x: BOARD_SIZE - 3 - offset, y: line + 1 },
				],
			};
		case "S":
			return {
				player: { x: line, y: offset },
				target: { x: line, y: offset + 4 },
				supportingBoxes: [
					{ x: line + 1, y: offset + 1 },
					{ x: line + 1, y: offset + 2 },
				],
			};
		case "N":
			return {
				player: { x: line, y: BOARD_SIZE - 1 - offset },
				target: { x: line, y: BOARD_SIZE - 5 - offset },
				supportingBoxes: [
					{ x: line + 1, y: BOARD_SIZE - 2 - offset },
					{ x: line + 1, y: BOARD_SIZE - 3 - offset },
				],
			};
	}
}

function rayFrom(position: Position, direction: Direction): Position[] {
	const delta = deltaByDirection[direction];
	const ray: Position[] = [];
	let current = { x: position.x + delta.x, y: position.y + delta.y };

	while (
		current.x >= 0 &&
		current.x < BOARD_SIZE &&
		current.y >= 0 &&
		current.y < BOARD_SIZE
	) {
		ray.push(current);
		current = { x: current.x + delta.x, y: current.y + delta.y };
	}
	return ray;
}

function positionFromCell(cell: number) {
	return {
		x: cell % BOARD_SIZE,
		y: Math.floor(cell / BOARD_SIZE),
	};
}

function requiredAt<T>(values: readonly T[], index: number): T {
	const value = values[index];
	if (value === undefined) {
		throw new Error(`Generated value is missing index ${index}`);
	}
	return value;
}

function pullOptions(session: Session): PullOption[] {
	if (session.phase !== "READY") return [];

	const options: PullOption[] = [];
	for (const firingPosition of reachableTiles(session.level, session.state)) {
		const firingState = { ...session.state, player: firingPosition };
		let beforePull: Session | undefined;

		for (const direction of DIRECTIONS) {
			if (resolvePull(session.level, firingState, direction).kind !== "LEGAL") {
				continue;
			}
			if (!beforePull) {
				if (samePosition(firingPosition, session.state.player)) {
					beforePull = session;
				} else {
					const walked = walk(session, firingPosition);
					if (walked.kind !== "ACCEPTED") {
						throw new Error(
							"Expected reachable firing position to be accepted",
						);
					}
					beforePull = completeAnimation(walked.session);
				}
			}

			const pulled = pull(beforePull, direction);
			if (pulled.kind !== "ACCEPTED") {
				throw new Error("Expected resolved pull to be accepted");
			}
			options.push({ beforePull, sliding: pulled.session });
		}
	}
	return options;
}

function playGenerated(
	gameplay: GeneratedGameplay,
	onPull: (transition: PullTransition) => void,
	onReached: (session: Session) => void = () => {},
): void {
	let session = beginSession(gameplay.level);
	onReached(session);

	for (const choice of gameplay.choices) {
		const options = pullOptions(session);
		if (options.length === 0) return;

		const option = requiredAt(options, choice % options.length);
		const settled = completeAnimation(option.sliding);
		onPull({
			from: session,
			beforePull: option.beforePull,
			sliding: option.sliding,
			settled,
		});
		session = settled;
		onReached(session);
	}
}

function assertThreeDistinctBoxes(session: Session): void {
	expect(session.state.boxes).toHaveLength(BOX_COUNT);
	expect(new Set(session.state.boxes.map(positionKey))).toHaveLength(BOX_COUNT);
}

function assertWonBoxesFitTwoByTwo(session: Session): void {
	if (session.phase !== "WON") return;

	const xCoordinates = session.state.boxes.map(({ x }) => x);
	const yCoordinates = session.state.boxes.map(({ y }) => y);
	expect(
		Math.max(...xCoordinates) - Math.min(...xCoordinates),
	).toBeLessThanOrEqual(1);
	expect(
		Math.max(...yCoordinates) - Math.min(...yCoordinates),
	).toBeLessThanOrEqual(1);
}

describe("generated legal gameplay invariants", () => {
	it("preserves exactly three distinct boxes after every accepted pull", () => {
		fc.assert(
			fc.property(gameplayArbitrary, (gameplay) => {
				playGenerated(gameplay, ({ sliding, settled }) => {
					assertThreeDistinctBoxes(sliding);
					assertThreeDistinctBoxes(settled);
				});
			}),
			{ numRuns: 48, seed: 0x2d20_0001 },
		);
	});

	it("never decreases the pull count during forward play", () => {
		fc.assert(
			fc.property(gameplayArbitrary, (gameplay) => {
				playGenerated(gameplay, ({ from, beforePull, sliding, settled }) => {
					expect(beforePull.state.pulls).toBe(from.state.pulls);
					expect(sliding.state.pulls).toBe(beforePull.state.pulls + 1);
					expect(settled.state.pulls).toBe(sliding.state.pulls);
				});
			}),
			{ numRuns: 48, seed: 0x2d20_0002 },
		);
	});

	it("undoes a settled pull to its exact pre-pull gameplay state", () => {
		fc.assert(
			fc.property(gameplayArbitrary, (gameplay) => {
				playGenerated(gameplay, ({ beforePull, settled }) => {
					const restored = undo(settled);
					expect(restored.state).toEqual(beforePull.state);
					expect(restored.history).toEqual(beforePull.history);
					expect(restored.phase).toBe(beforePull.phase);
				});
			}),
			{ numRuns: 48, seed: 0x2d20_0003 },
		);
	});

	it("keeps every reached win inside a two-by-two bounding box", () => {
		fc.assert(
			fc.property(winningGameplayArbitrary, ({ direction, level }) => {
				const accepted = pull(beginSession(level), direction);
				if (accepted.kind !== "ACCEPTED") {
					throw new Error(
						`Expected generated pull to be accepted: ${accepted.reason}`,
					);
				}
				const won = completeAnimation(accepted.session);
				expect(won.phase).toBe("WON");
				assertWonBoxesFitTwoByTwo(won);
			}),
			{ numRuns: 48, seed: 0x2d20_0004 },
		);
	});
});
