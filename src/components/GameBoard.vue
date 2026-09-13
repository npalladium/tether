<script setup lang="ts">
import { computed } from "vue";
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

const props = defineProps<{
	level: Level;
	session: Session;
	tiles: readonly Position[];
	reachableKeys: ReadonlySet<string>;
	legalSelections: readonly LegalSelection[];
	selectedDirection: Direction | null;
	selectionPreview: LegalPull | undefined;
	engagedPull: LegalPull | null;
	tetherEndpoint: Position | null;
}>();

const emit = defineEmits<{
	walk: [tile: Position];
	select: [direction: Direction];
}>();

const rowNumbers = computed(() =>
	Array.from({ length: props.level.height }, (_, index) => index),
);
const columnNumbers = computed(() =>
	Array.from({ length: props.level.width }, (_, index) => index),
);
const visibleTether = computed(
	() => props.engagedPull ?? props.selectionPreview,
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

function cellLabel(tile: Position): string {
	const coordinate = `Column ${tile.x + 1}, row ${tile.y + 1}`;
	if (samePosition(props.session.state.player, tile))
		return `${coordinate}: you are here`;
	if (props.level.pillars.some((pillar) => samePosition(pillar, tile))) {
		return `${coordinate}: pillar`;
	}
	if (props.session.state.boxes.some((box) => samePosition(box, tile))) {
		return `${coordinate}: box`;
	}
	return isReachable(tile)
		? `${coordinate}: reachable floor`
		: `${coordinate}: floor`;
}

function walkLabel(tile: Position): string {
	return `Walk to column ${tile.x + 1}, row ${tile.y + 1}`;
}

function boxTargetLabel(selection: LegalSelection): string {
	const { target, destination } = selection.pull;
	return `Select box at column ${target.x + 1}, row ${target.y + 1}; fixed destination column ${destination.x + 1}, row ${destination.y + 1}`;
}
</script>

<template>
	<div class="board-wrap">
		<div class="board-surface">
		<table
			class="board"
			:class="{ 'is-settling': engagedPull !== null }"
			aria-describedby="board-instructions"
		>
			<caption class="sr-only">Tether board</caption>
			<thead class="sr-only">
				<tr>
					<th scope="col">Row</th>
					<th v-for="column in columnNumbers" :key="column" scope="col">
						Column {{ column + 1 }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in rowNumbers" :key="row">
					<th scope="row" class="sr-only">Row {{ row + 1 }}</th>
					<td
						v-for="column in columnNumbers"
						:key="positionKey(tileAt(column, row))"
						class="board-cell"
						:class="{
							'is-reachable': isWalkTarget(tileAt(column, row)),
							'is-current': samePosition(session.state.player, tileAt(column, row)),
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
			v-if="visibleTether"
			class="tether-preview"
			:class="{ 'is-engaged': isEngagedTether }"
			viewBox="0 0 8 8"
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
					(selectionPreview && samePosition(selectionPreview.target, box)) ||
					(engagedPull && samePosition(engagedPull.destination, box)),
			}"
			:style="positionStyle(box)"
			aria-hidden="true"
		>
			<span class="box-face"></span>
		</div>
		<div
			v-if="selectionPreview"
			class="piece box-ghost"
			:style="positionStyle(selectionPreview.destination)"
			aria-hidden="true"
		></div>
		<button
			v-for="selection in legalSelections"
			:key="`box-target-${selection.direction}`"
			type="button"
			class="piece box-target is-selectable"
			:class="{
				'is-selected':
					selectedDirection === selection.direction && selectionPreview !== undefined,
			}"
			:style="positionStyle(selection.pull.target)"
			:aria-label="boxTargetLabel(selection)"
			:aria-pressed="selectedDirection === selection.direction"
			@click="emit('select', selection.direction)"
		></button>
		<div class="piece player" :style="positionStyle(session.state.player)" aria-hidden="true">
			<span class="player-core"></span>
		</div>
		</div>
		<span class="axis-label axis-x" aria-hidden="true">east →</span>
		<span class="axis-label axis-y" aria-hidden="true">south →</span>
	</div>
	<p id="board-instructions" class="sr-only">
		Reachable floor tiles are buttons. Use arrow keys or W A S D to move one tile,
		or Shift with a direction key to select a visible box to pull.
	</p>
</template>
