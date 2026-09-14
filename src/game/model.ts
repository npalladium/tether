import { BOARD_SIZE, BOX_COUNT, isInBounds, positionKey } from "./board";

export type Position = Readonly<{
	x: number;
	y: number;
}>;

export type Direction = "N" | "E" | "S" | "W";

export type LevelDefinition = Readonly<{
	id: string;
	pillars: readonly Position[];
	startPlayer: Position;
	startBoxes: readonly Position[];
	par?: number;
	title?: string;
}>;

export type Level = Readonly<{
	id: string;
	width: typeof BOARD_SIZE;
	height: typeof BOARD_SIZE;
	pillars: readonly Position[];
	startPlayer: Position;
	startBoxes: readonly Position[];
	par?: number;
	title?: string;
}>;

export type GameState = Readonly<{
	player: Position;
	boxes: readonly Position[];
	pulls: number;
}>;

export class LevelValidationError extends Error {
	readonly code: "BOX_COUNT" | "DUPLICATE_BOX" | "OUT_OF_BOUNDS" | "OVERLAP";

	constructor(code: LevelValidationError["code"], message: string) {
		super(message);
		this.name = "LevelValidationError";
		this.code = code;
	}
}

const clonePosition = (position: Position): Position =>
	Object.freeze({ x: position.x, y: position.y });

export function parseLevel(definition: LevelDefinition): Level {
	if (definition.startBoxes.length !== BOX_COUNT) {
		throw new LevelValidationError(
			"BOX_COUNT",
			`Exactly ${BOX_COUNT} boxes are required`,
		);
	}
	const boxKeys = new Set<string>();
	for (const box of definition.startBoxes) {
		const k = positionKey(box);
		if (boxKeys.has(k))
			throw new LevelValidationError("DUPLICATE_BOX", "Boxes must be distinct");
		boxKeys.add(k);
	}
	const positions = [
		definition.startPlayer,
		...definition.startBoxes,
		...definition.pillars,
	];
	if (positions.some((position) => !isInBounds(position))) {
		throw new LevelValidationError(
			"OUT_OF_BOUNDS",
			"All coordinates must be on the board",
		);
	}
	const occupied = new Set<string>();
	for (const position of [definition.startPlayer, ...definition.startBoxes]) {
		const k = positionKey(position);
		if (occupied.has(k))
			throw new LevelValidationError("OVERLAP", "Entities cannot overlap");
		occupied.add(k);
	}
	for (const pillar of definition.pillars) {
		const pillarKey = positionKey(pillar);
		if (occupied.has(pillarKey)) {
			throw new LevelValidationError("OVERLAP", "Entities cannot overlap");
		}
		occupied.add(pillarKey);
	}
	return Object.freeze({
		id: definition.id,
		width: BOARD_SIZE,
		height: BOARD_SIZE,
		pillars: Object.freeze(definition.pillars.map(clonePosition)),
		startPlayer: clonePosition(definition.startPlayer),
		startBoxes: Object.freeze(definition.startBoxes.map(clonePosition)),
		par: definition.par,
		title: definition.title,
	});
}
