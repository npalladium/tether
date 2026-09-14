<script setup lang="ts">
import { computed, useId } from "vue";
import {
	type Direction,
	isOccupied,
	type LegalPull,
	type Level,
	type Position,
	positionKey,
	type Session,
	samePosition,
} from "../game";

type LegalSelection = Readonly<{
	direction: Direction;
	pull: LegalPull;
}>;

const props = withDefaults(
	defineProps<{
		level: Level;
		session: Session;
		tiles: readonly Position[];
		reachableKeys: ReadonlySet<string>;
		legalSelections: readonly LegalSelection[];
		selectedDirection: Direction | null;
		selectionPreview: LegalPull | undefined;
		engagedPull: LegalPull | null;
		tetherEndpoint: Position | null;
		firingTile?: Position;
		firingTileLabel?: string;
		readOnly?: boolean;
		aiming?: boolean;
		inputMode?: "touch" | "keyboard";
		boardLabel?: string;
		boardDescription?: string;
	}>(),
	{ aiming: false, inputMode: "keyboard" },
);

const emit = defineEmits<{
	walk: [tile: Position];
	select: [direction: Direction];
}>();
const instructionsId = `board-instructions-${useId()}`;

const rowNumbers = computed(() =>
	Array.from({ length: props.level.height }, (_, index) => index),
);
const columnNumbers = computed(() =>
	Array.from({ length: props.level.width }, (_, index) => index),
);
const targetSelections = computed(() =>
	props.readOnly ? [] : props.legalSelections,
);
const isAiming = computed(
	() =>
		props.aiming &&
		!props.readOnly &&
		props.session.phase === "READY" &&
		props.engagedPull === null,
);
const aimingSelections = computed(() =>
	isAiming.value ? targetSelections.value : [],
);
const visibleTether = computed(
	() =>
		props.engagedPull ?? (isAiming.value ? undefined : props.selectionPreview),
);
const isEngagedTether = computed(() => props.engagedPull !== null);

function tileAt(x: number, y: number): Position {
	return props.tiles[y * props.level.width + x] as Position;
}

function isReachable(tile: Position): boolean {
	return props.reachableKeys.has(positionKey(tile));
}

function isWalkTarget(tile: Position): boolean {
	return (
		!props.readOnly &&
		props.session.phase === "READY" &&
		isReachable(tile) &&
		!isOccupied(props.level, props.session.state, tile) &&
		!samePosition(props.session.state.player, tile)
	);
}

function positionStyle(position: Position): Record<string, string> {
	return {
		left: `${(position.x / props.level.width) * 100}%`,
		top: `${(position.y / props.level.height) * 100}%`,
	};
}

function boxPosition(box: Position): Position {
	if (
		props.engagedPull !== null &&
		samePosition(props.engagedPull.destination, box)
	) {
		return props.tetherEndpoint ?? props.engagedPull.target;
	}
	return box;
}

function isFiringTile(tile: Position): boolean {
	return props.firingTile !== undefined && samePosition(props.firingTile, tile);
}

function isSelectedSelection(selection: LegalSelection): boolean {
	return (
		!isAiming.value &&
		props.selectedDirection === selection.direction &&
		props.selectionPreview !== undefined
	);
}
function cellLabel(tile: Position): string {
	const coordinate = `Column ${tile.x + 1}, row ${tile.y + 1}`;
	if (samePosition(props.session.state.player, tile)) {
		return isFiringTile(tile)
			? `${coordinate}: you are at the marked firing tile`
			: `${coordinate}: you are here`;
	}
	if (props.level.pillars.some((pillar) => samePosition(pillar, tile))) {
		return `${coordinate}: pillar`;
	}
	if (props.session.state.boxes.some((box) => samePosition(box, tile))) {
		return `${coordinate}: box`;
	}
	if (isFiringTile(tile)) {
		return `${coordinate}: ${props.firingTileLabel ?? "marked firing tile"}`;
	}
	return isReachable(tile)
		? `${coordinate}: reachable floor`
		: `${coordinate}: floor`;
}

function walkLabel(tile: Position): string {
	const coordinate = `Walk to column ${tile.x + 1}, row ${tile.y + 1}`;
	return isFiringTile(tile)
		? `${coordinate}: ${props.firingTileLabel ?? "marked firing tile"}`
		: coordinate;
}

function boxTargetLabel(selection: LegalSelection): string {
	const { target, destination } = selection.pull;
	const action = isSelectedSelection(selection) ? "Pull" : "Select";
	return `${action} box at column ${target.x + 1}, row ${target.y + 1}; destination column ${destination.x + 1}, row ${destination.y + 1}`;
}
</script>

<template>
	<div class="board-wrap">
		<div class="board-surface">
		<table
			class="board"
			:class="{ 'is-settling': engagedPull !== null }"
			:aria-describedby="instructionsId"
		>
			<caption class="sr-only">{{ boardLabel ?? "Tether board" }}</caption>
			<thead class="sr-only">
				<tr>
					<th v-for="column in columnNumbers" :key="column" scope="col">
						Column {{ column + 1 }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in rowNumbers" :key="row">
					<td
						v-for="column in columnNumbers"
						:key="positionKey(tileAt(column, row))"
						class="board-cell"
						:class="{
							'is-reachable': isWalkTarget(tileAt(column, row)),
							'is-current': samePosition(session.state.player, tileAt(column, row)),
							'is-firing-tile': isFiringTile(tileAt(column, row)),
						}"
					>
						<span class="sr-only">{{ cellLabel(tileAt(column, row)) }}</span>
						<button
							v-if="isWalkTarget(tileAt(column, row))"
							type="button"
							class="board-cell-action"
							:aria-label="walkLabel(tileAt(column, row))"
							@click="emit('walk', tileAt(column, row))"
						></button>
					</td>
				</tr>
			</tbody>
		</table>

		<svg
			v-if="aimingSelections.length > 0"
			class="tether-preview is-aiming"
			:viewBox="`0 0 ${level.width} ${level.height}`"
			aria-hidden="true"
		>
			<line
				v-for="selection in aimingSelections"
				:key="`aiming-tether-${selection.direction}`"
				:x1="session.state.player.x + 0.5"
				:y1="session.state.player.y + 0.5"
				:x2="selection.pull.target.x + 0.5"
				:y2="selection.pull.target.y + 0.5"
			></line>
		</svg>

		<svg
			v-if="visibleTether"
			class="tether-preview"
			:class="{ 'is-engaged': isEngagedTether }"
			:viewBox="`0 0 ${level.width} ${level.height}`"
			aria-hidden="true"
		>
			<line
				:x1="session.state.player.x + 0.5"
				:y1="session.state.player.y + 0.5"
				:x2="(tetherEndpoint ?? visibleTether.target).x + 0.5"
				:y2="(tetherEndpoint ?? visibleTether.target).y + 0.5"
			></line>
		</svg>

		<div
			v-for="pillar in level.pillars"
			:key="`pillar-${positionKey(pillar)}`"
			class="piece pillar"
			:style="positionStyle(pillar)"
			aria-hidden="true"
		>
			<i></i><i></i><i></i><i></i>
		</div>
		<div
			v-for="(box, index) in session.state.boxes"
			:key="`box-${index}`"
			class="piece box"
			:class="{
				'is-target':
					(!isAiming &&
						selectionPreview &&
						samePosition(selectionPreview.target, box)) ||
					(engagedPull && samePosition(engagedPull.destination, box)),
			}"
			:style="positionStyle(boxPosition(box))"
			aria-hidden="true"
		>
			<span class="box-face"></span>
		</div>
		<div
			v-if="selectionPreview && !isAiming"
			class="piece box-ghost"
			:style="positionStyle(selectionPreview.destination)"
			aria-hidden="true"
		>
			<span class="box-ghost-label">Stop</span>
		</div>
		<div
			v-for="selection in aimingSelections"
			:key="`aiming-ghost-${selection.direction}`"
			class="piece box-ghost is-aiming"
			:style="positionStyle(selection.pull.destination)"
			aria-hidden="true"
		>
			<span class="box-ghost-label">Stop</span>
		</div>
		<button
			v-for="selection in targetSelections"
			:key="`box-target-${selection.direction}`"
			type="button"
			class="piece box-target is-selectable"
			:class="{ 'is-selected': isSelectedSelection(selection) }"
			:style="positionStyle(selection.pull.target)"
			:aria-label="boxTargetLabel(selection)"
			:aria-pressed="isSelectedSelection(selection)"
			@click="emit('select', selection.direction)"
		>
			<span class="box-target-label" aria-hidden="true">
				{{ isSelectedSelection(selection) ? "Pull" : inputMode === "touch" ? "Tap" : "Click" }}
			</span>
		</button>
		<div class="piece player" :style="positionStyle(session.state.player)" aria-hidden="true">
			<span class="player-core"></span>
		</div>
		</div>
		<span class="axis-label axis-x" aria-hidden="true">east →</span>
		<span class="axis-label axis-y" aria-hidden="true">south →</span>
	</div>
	<p :id="instructionsId" class="sr-only">
		{{
			boardDescription ??
			(inputMode === "touch"
				? "Reachable floor tiles are buttons. Tap a highlighted box to preview its destination, then tap the same box again or use Pull."
				: "Reachable floor tiles are buttons. Use arrow keys or W A S D to walk. Hold Space and press a direction to pull, or activate a highlighted box twice.")
		}}
	</p>
</template>
