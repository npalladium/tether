<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { queryRef } from "vue-qs";
import type { AssistanceMode } from "./assistance/types";
import AssistanceDialog from "./components/AssistanceDialog.vue";
import GameBoard from "./components/GameBoard.vue";
import GameControls from "./components/GameControls.vue";
import GuideDialog from "./components/GuideDialog.vue";
import {
	beginSession,
	completeAnimation,
	DIRECTIONS,
	type Direction,
	deltaByDirection,
	type LegalPull,
	positionKey,
	pull,
	reachableTiles,
	resolvePull,
	restart,
	type Session,
	samePosition,
	undo,
	walk,
} from "./game";
import { defaultLevel, levelGroups, levels } from "./level";
import {
	tutorialFiringTile,
	tutorialLevel,
	tutorialPullDirection,
} from "./tutorial";

type InputMode = "touch" | "keyboard";

function detectInputMode(): InputMode {
	return window.matchMedia?.("(pointer: coarse)").matches
		? "touch"
		: "keyboard";
}
const TRANSITION_MS = 260;
const normalLevels = levels;
const normalSessions = ref<Record<string, Session>>(
	Object.fromEntries(
		normalLevels.map((level) => [
			level.id,
			beginSession(level, loadBestPulls(level.id)),
		]),
	),
);
const normalAnnouncements = ref<Record<string, string>>(
	Object.fromEntries(
		normalLevels.map((level) => [
			level.id,
			"Walk to a dotted floor tile, then choose a highlighted box to preview its pull.",
		]),
	),
);
const normalSelectedDirections = ref<Record<string, Direction | null>>(
	Object.fromEntries(normalLevels.map((level) => [level.id, null])),
);
const tutorialSession = ref<Session>(beginSession(tutorialLevel));
const tutorialAnnouncement = ref(
	"Walk to the glowing firing tile to line up your first tether.",
);
const tutorialSelectedDirection = ref<Direction | null>(null);
const selectedNormalLevelId = queryRef("room", {
	defaultValue: defaultLevel.id,
	parse: (roomId) =>
		roomId !== null && normalSessions.value[roomId] !== undefined
			? roomId
			: defaultLevel.id,
	historyStrategy: "push",
});
const isTutorial = ref(false);
const inputMode = ref<InputMode>(detectInputMode());
const revealedOptimalPulls = ref<Record<string, boolean>>({});
const hasEntered = ref(false);
const showGuide = ref(false);
const assistance = ref<{
	mode: AssistanceMode;
	level: Session["level"];
	state: Session["state"];
} | null>(null);
const assistanceTrigger = ref<HTMLButtonElement | null>(null);
const entryStart = ref<HTMLButtonElement | null>(null);
const gameRoot = ref<HTMLElement | null>(null);
const guideButton = ref<HTMLButtonElement | null>(null);
const aiming = ref(false);
const hasUsedAimedPull = ref(false);
const tetherEndpoint = ref<{ x: number; y: number } | null>(null);
const engagedPull = ref<LegalPull | null>(null);
let settleTimer: number | undefined;
let tetherFrame: number | undefined;
let pointerQuery: MediaQueryList | undefined;

type LegalSelection = Readonly<{
	direction: Direction;
	pull: LegalPull;
}>;

const session = computed<Session>({
	get: () => {
		if (isTutorial.value) return tutorialSession.value;
		const normalSession = normalSessions.value[selectedNormalLevelId.value];
		if (normalSession === undefined) {
			throw new Error("Selected Tether room has no session.");
		}
		return normalSession;
	},
	set: (nextSession) => {
		if (isTutorial.value) {
			tutorialSession.value = nextSession;
			return;
		}
		normalSessions.value = {
			...normalSessions.value,
			[nextSession.level.id]: nextSession,
		};
	},
});
const selectedDirection = computed<Direction | null>({
	get: () =>
		isTutorial.value
			? tutorialSelectedDirection.value
			: (normalSelectedDirections.value[selectedNormalLevelId.value] ?? null),
	set: (direction) => {
		if (isTutorial.value) {
			tutorialSelectedDirection.value = direction;
			return;
		}
		normalSelectedDirections.value = {
			...normalSelectedDirections.value,
			[selectedNormalLevelId.value]: direction,
		};
	},
});
const announcement = computed<string>({
	get: () =>
		isTutorial.value
			? tutorialAnnouncement.value
			: (normalAnnouncements.value[selectedNormalLevelId.value] ?? ""),
	set: (nextAnnouncement) => {
		if (isTutorial.value) {
			tutorialAnnouncement.value = nextAnnouncement;
			return;
		}
		normalAnnouncements.value = {
			...normalAnnouncements.value,
			[selectedNormalLevelId.value]: nextAnnouncement,
		};
	},
});
const levelTiles = computed(() =>
	Array.from(
		{ length: session.value.level.width * session.value.level.height },
		(_, index) => ({
			x: index % session.value.level.width,
			y: Math.floor(index / session.value.level.width),
		}),
	),
);
const reachableKeys = computed(
	() =>
		new Set(
			reachableTiles(session.value.level, session.value.state).map(positionKey),
		),
);
const pullOptions = computed(
	() =>
		Object.fromEntries(
			DIRECTIONS.map((direction) => [
				direction,
				resolvePull(session.value.level, session.value.state, direction),
			]),
		) as Record<Direction, ReturnType<typeof resolvePull>>,
);
const legalSelections = computed<readonly LegalSelection[]>(() => {
	if (session.value.phase !== "READY") return [];
	return DIRECTIONS.flatMap((direction) => {
		const option = pullOptions.value[direction];
		return option.kind === "LEGAL" ? [{ direction, pull: option }] : [];
	});
});
const selectionPreview = computed<LegalPull | undefined>(() => {
	if (!selectedDirection.value || session.value.phase !== "READY")
		return undefined;
	const option = pullOptions.value[selectedDirection.value];
	return option.kind === "LEGAL" ? option : undefined;
});
const isPullAnimating = computed(() => engagedPull.value !== null);
const hasHistory = computed(() => session.value.history.length > 0);
const isOptimalPullsRevealed = computed(
	() => revealedOptimalPulls.value[session.value.level.id] === true,
);
const modalIsOpen = computed(
	() => showGuide.value || assistance.value !== null,
);
const normalLevelNumber = computed(
	() =>
		normalLevels.findIndex(
			(level) => level.id === selectedNormalLevelId.value,
		) + 1,
);
const tutorialAtFiringTile = computed(() =>
	samePosition(session.value.state.player, tutorialFiringTile),
);
const hasExpectedTutorialPreview = computed(() => {
	const preview = selectionPreview.value;
	const tutorialTarget = tutorialLevel.startBoxes[0];
	return (
		isTutorial.value &&
		selectedDirection.value === tutorialPullDirection &&
		preview !== undefined &&
		tutorialTarget !== undefined &&
		samePosition(preview.target, tutorialTarget) &&
		samePosition(preview.destination, { x: 3, y: 3 })
	);
});
const tutorialGuideTitle = computed(() => {
	if (session.value.phase === "WON") return "L complete";
	if (selectionPreview.value) return "Confirm the pull";
	if (tutorialAtFiringTile.value) {
		return inputMode.value === "touch"
			? "Tap the distant box"
			: "Aim with Space";
	}
	return inputMode.value === "touch"
		? "Tap the firing tile"
		: "Walk with the movement keys";
});
const tutorialGuideDetail = computed(() => {
	if (session.value.phase === "WON") {
		return "You made one valid L in one pull. Any rotation of the L counts. Replay the lesson or return to your room.";
	}
	if (selectionPreview.value) {
		if (inputMode.value === "touch") {
			return hasExpectedTutorialPreview.value
				? "The ghost marks where the box will stop beside you. Tap the selected box again or press Pull."
				: "The ghost is this pull’s exact endpoint. Tap the selected box again or press Pull, or use Cancel to inspect another box.";
		}
		return hasExpectedTutorialPreview.value
			? "The ghost marks where the box will stop beside you. Press Enter again to pull."
			: "The ghost is this pull’s exact endpoint. Press Enter again to pull, or Escape to inspect another box.";
	}
	if (!tutorialAtFiringTile.value) {
		return inputMode.value === "touch"
			? "Tap the glowing firing tile. Tapping any dotted floor tile moves you there without spending a pull."
			: "Use the arrow keys or W A S D to walk onto the glowing firing tile. Walking does not spend a pull.";
	}
	return inputMode.value === "touch"
		? "Tap the highlighted box once to preview the tether ray and its fixed “Stop” ghost."
		: "Hold Space to reveal the legal tether and “Stop” ghost. While holding it, press Right Arrow or D to pull.";
});

const tutorialControlCue = computed(() => {
	if (session.value.phase === "WON") {
		return "Replay the lesson or continue to your room";
	}
	if (selectionPreview.value) {
		return inputMode.value === "touch"
			? "Tap the selected box again, or press Pull"
			: "Press Enter again, or use Pull";
	}
	if (tutorialAtFiringTile.value) {
		return inputMode.value === "touch"
			? "Tap the box marked Tap"
			: "Hold Space + Right Arrow or D";
	}
	return inputMode.value === "touch"
		? "Tap the glowing floor tile"
		: "Arrow keys or W A S D";
});
const statusTitle = computed(() => {
	switch (session.value.phase) {
		case "WON":
			return "L complete";
		case "NO_PULLS":
			return "No pulls remain";
		default:
			return isTutorial.value ? "Practice tether" : "Find your angle";
	}
});
const statusDetail = computed(() => {
	switch (session.value.phase) {
		case "WON":
			return `Solved in ${session.value.state.pulls} ${pluralisePull(session.value.state.pulls)}. Any L orientation counts.`;
		case "NO_PULLS":
			return hasHistory.value
				? "No moving pulls remain. Undo the last pull or restart the room."
				: "No moving pulls remain. Restart the room to try another approach.";
		default:
			return announcement.value;
	}
});
function toggleOptimalPulls(): void {
	if (isTutorial.value || session.value.level.par === undefined) return;
	revealedOptimalPulls.value = {
		...revealedOptimalPulls.value,
		[session.value.level.id]: !isOptimalPullsRevealed.value,
	};
}

function bestStorageKey(levelId: string): string {
	return `tether:${levelId}:best-pulls`;
}

function loadBestPulls(levelId: string): number | undefined {
	try {
		const saved = window.localStorage.getItem(bestStorageKey(levelId));
		if (saved === null) return undefined;
		const value = Number(saved);
		return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

function saveBestPulls(bestPulls: number | undefined): void {
	if (isTutorial.value || bestPulls === undefined) return;
	try {
		window.localStorage.setItem(
			bestStorageKey(session.value.level.id),
			String(bestPulls),
		);
	} catch {
		// Storage is optional; play must continue when it is unavailable.
	}
}

function clearTetherAnimation(): void {
	if (tetherFrame !== undefined) {
		window.cancelAnimationFrame(tetherFrame);
		tetherFrame = undefined;
	}
	tetherEndpoint.value = null;
}

function animateTether(pullResolution: LegalPull, duration: number): void {
	tetherEndpoint.value = { ...pullResolution.target };
	if (duration === 0) {
		tetherEndpoint.value = { ...pullResolution.destination };
		return;
	}

	const start = window.performance.now();
	const step = (now: number): void => {
		const elapsed = Math.min((now - start) / duration, 1);
		const progress = 1 - (1 - elapsed) ** 3;
		tetherEndpoint.value = {
			x:
				pullResolution.target.x +
				(pullResolution.destination.x - pullResolution.target.x) * progress,
			y:
				pullResolution.target.y +
				(pullResolution.destination.y - pullResolution.target.y) * progress,
		};
		if (elapsed < 1) {
			tetherFrame = window.requestAnimationFrame(step);
		} else {
			tetherFrame = undefined;
		}
	};
	tetherFrame = window.requestAnimationFrame(step);
}

function pullAnimationDelay(): number {
	return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
		? 0
		: TRANSITION_MS;
}

function completePullAnimation(): void {
	engagedPull.value = null;
	clearTetherAnimation();
}

function walkTo(tile: { x: number; y: number }): void {
	selectedDirection.value = null;
	if (isPullAnimating.value || session.value.phase !== "READY") return;
	const result = walk(session.value, tile);
	if (result.kind === "REJECTED") {
		announcement.value = "That tile is not reachable.";
		return;
	}
	session.value = completeAnimation(result.session);
	announcement.value = isTutorial.value
		? `Standing at column ${tile.x + 1}, row ${tile.y + 1}. ${tutorialGuideDetail.value}`
		: inputMode.value === "touch"
			? `Standing at column ${tile.x + 1}, row ${tile.y + 1}. Tap a highlighted box to preview its pull.`
			: `Standing at column ${tile.x + 1}, row ${tile.y + 1}. Click a highlighted box, or hold Space and press its direction.`;
}

function walkDirection(direction: Direction): void {
	if (isPullAnimating.value || session.value.phase !== "READY") return;
	const delta = deltaByDirection[direction];
	walkTo({
		x: session.value.state.player.x + delta.x,
		y: session.value.state.player.y + delta.y,
	});
}

function selectPull(direction: Direction): void {
	if (isPullAnimating.value || session.value.phase !== "READY") return;
	if (
		selectedDirection.value === direction &&
		selectionPreview.value !== undefined
	) {
		pullSelected();
		return;
	}
	const option = pullOptions.value[direction];
	if (option.kind !== "LEGAL") {
		selectedDirection.value = null;
		announcement.value = rejectionMessage(option.reason);
		return;
	}
	selectedDirection.value = direction;
	announcement.value =
		`Box selected at column ${option.target.x + 1}, row ${option.target.y + 1}. ` +
		`It will stop at column ${option.destination.x + 1}, row ${option.destination.y + 1}. ` +
		(inputMode.value === "touch"
			? "Tap the box again or press Pull."
			: "Click the box again, press Enter, or use Pull.");
}

function cancelSelection(): void {
	if (!selectedDirection.value) return;
	selectedDirection.value = null;
	announcement.value = "Box selection cancelled.";
}

function completePull(direction: Direction, option: LegalPull): void {
	const result = pull(session.value, direction);
	if (result.kind === "REJECTED") {
		selectedDirection.value = null;
		announcement.value = rejectionMessage(result.reason);
		return;
	}

	window.clearTimeout(settleTimer);
	clearTetherAnimation();
	session.value = completeAnimation(result.session);
	saveBestPulls(session.value.bestPulls);
	selectedDirection.value = null;
	engagedPull.value = option;
	announcement.value = `Box pulled to column ${option.destination.x + 1}, row ${option.destination.y + 1}.`;
	const delay = pullAnimationDelay();
	animateTether(option, delay);
	settleTimer = window.setTimeout(completePullAnimation, delay);
}

function pullSelected(): void {
	if (session.value.phase !== "READY" || isPullAnimating.value) return;
	const direction = selectedDirection.value;
	const option = selectionPreview.value;
	if (!direction || !option) {
		announcement.value = "Select a highlighted box before pulling.";
		return;
	}
	completePull(direction, option);
}

function pullWhileAiming(direction: Direction): void {
	if (hasUsedAimedPull.value || isPullAnimating.value) return;
	hasUsedAimedPull.value = true;
	const option = pullOptions.value[direction];
	if (option.kind !== "LEGAL") {
		announcement.value = rejectionMessage(option.reason);
		return;
	}
	completePull(direction, option);
}

function undoLastPull(): void {
	if (isPullAnimating.value || !hasHistory.value) return;
	session.value = undo(session.value);
	selectedDirection.value = null;
	announcement.value = "Last pull undone. Your firing position was restored.";
}

function restartLevel(): void {
	if (isPullAnimating.value) return;
	window.clearTimeout(settleTimer);
	clearTetherAnimation();
	session.value = restart(session.value);
	selectedDirection.value = null;
	announcement.value = isTutorial.value
		? "Lesson reset. Walk to the glowing firing tile."
		: "Room reset. Your best score is safe.";
}

function enterNormalRoom(): void {
	hasEntered.value = true;
	nextTick(() => gameRoot.value?.focus());
}

function enterTutorial(): void {
	if (isPullAnimating.value) return;
	isTutorial.value = true;
	hasEntered.value = true;
	nextTick(() => gameRoot.value?.focus());
}

function exitTutorial(): void {
	if (isPullAnimating.value) return;
	isTutorial.value = false;
	nextTick(() => gameRoot.value?.focus());
}

function selectNormalLevel(event: Event): void {
	if (isPullAnimating.value) return;
	const levelId = (event.target as HTMLSelectElement).value;
	if (!normalSessions.value[levelId]) return;
	selectedNormalLevelId.value = levelId;
	nextTick(() => gameRoot.value?.focus());
}

function openGuide(): void {
	showGuide.value = true;
}

function closeGuide(): void {
	showGuide.value = false;
	nextTick(() => guideButton.value?.focus());
}

function copyAssistanceState(current: Session["state"]): Session["state"] {
	return {
		player: { ...current.player },
		boxes: current.boxes.map((box) => ({ ...box })),
		pulls: current.pulls,
	};
}

function openAssistance(
	mode: AssistanceMode,
	trigger: HTMLButtonElement,
): void {
	if (isPullAnimating.value) return;
	assistanceTrigger.value = trigger;
	assistance.value = {
		mode,
		level: session.value.level,
		state: copyAssistanceState(session.value.state),
	};
}

function closeAssistance(): void {
	assistance.value = null;
	nextTick(() => assistanceTrigger.value?.focus());
}
function rejectionMessage(reason: string): string {
	switch (reason) {
		case "NO_TARGET":
			return "No selectable box is visible.";
		case "BLOCKED":
			return "The pillar blocks the tether.";
		case "ADJACENT":
			return "That box is already beside you, so it cannot move.";
		default:
			return "Finish the current move first.";
	}
}

function pluralisePull(count: number): string {
	return count === 1 ? "pull" : "pulls";
}

function hasFocusedNativeControl(): boolean {
	return (
		document.activeElement instanceof HTMLElement &&
		document.activeElement.matches(
			'button, a[href], input, select, textarea, [contenteditable="true"]',
		)
	);
}

function stopAiming(): void {
	aiming.value = false;
	hasUsedAimedPull.value = false;
}

function handleKeydown(event: KeyboardEvent): void {
	if (event.metaKey || event.ctrlKey || event.altKey || !hasEntered.value)
		return;

	if (showGuide.value || assistance.value !== null) {
		if (event.key === "Escape") {
			event.preventDefault();
			if (assistance.value !== null) closeAssistance();
			else closeGuide();
		}
		return;
	}
	if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
		event.preventDefault();
		openGuide();
		return;
	}
	if (event.key === "Escape") {
		if (selectedDirection.value) {
			event.preventDefault();
			cancelSelection();
		}
		stopAiming();
		return;
	}
	if (hasFocusedNativeControl()) return;
	if (event.key === " ") {
		event.preventDefault();
		if (!event.repeat) {
			aiming.value = true;
			hasUsedAimedPull.value = false;
			announcement.value = "Choose a direction to pull the first visible box.";
		}
		return;
	}
	if (event.key === "Enter" && selectedDirection.value) {
		event.preventDefault();
		pullSelected();
		return;
	}
	if (event.key === "z" || event.key === "Z") {
		event.preventDefault();
		undoLastPull();
		return;
	}
	if (event.key === "r" || event.key === "R") {
		event.preventDefault();
		restartLevel();
		return;
	}

	const directionByKey: Record<string, Direction | undefined> = {
		ArrowUp: "N",
		w: "N",
		W: "N",
		ArrowRight: "E",
		d: "E",
		D: "E",
		ArrowDown: "S",
		s: "S",
		S: "S",
		ArrowLeft: "W",
		a: "W",
		A: "W",
	};
	const direction = directionByKey[event.key];
	if (!direction) return;
	event.preventDefault();
	if (aiming.value) {
		pullWhileAiming(direction);
	} else {
		walkDirection(direction);
	}
}

function handleKeyup(event: KeyboardEvent): void {
	if (event.key === " ") stopAiming();
}

function handleVisibilityChange(): void {
	if (document.hidden) stopAiming();
}

function updateInputMode(event: MediaQueryListEvent): void {
	inputMode.value = event.matches ? "touch" : "keyboard";
}

onMounted(() => {
	pointerQuery = window.matchMedia?.("(pointer: coarse)");
	inputMode.value = pointerQuery?.matches ? "touch" : "keyboard";
	pointerQuery?.addEventListener?.("change", updateInputMode);
	window.addEventListener("keydown", handleKeydown);
	window.addEventListener("keyup", handleKeyup);
	window.addEventListener("blur", stopAiming);
	document.addEventListener("visibilitychange", handleVisibilityChange);
	nextTick(() => entryStart.value?.focus());
});
onBeforeUnmount(() => {
	pointerQuery?.removeEventListener?.("change", updateInputMode);
	window.removeEventListener("keydown", handleKeydown);
	window.removeEventListener("keyup", handleKeyup);
	window.removeEventListener("blur", stopAiming);
	document.removeEventListener("visibilitychange", handleVisibilityChange);
	window.clearTimeout(settleTimer);
	clearTetherAnimation();
});
</script>

<template>
	<section v-if="!hasEntered" class="entry-screen" aria-labelledby="entry-title">
		<header class="entry-topbar">
			<div class="wordmark" aria-label="Tether">
				<span class="wordmark-mark" aria-hidden="true"></span>
				<span>Tether</span>
			</div>
			<div class="entry-meta">
				<span class="entry-edition">A quiet spatial puzzle</span>
				<a class="entry-design-link" href="./design">Design notes</a>
			</div>
		</header>

		<div class="entry-layout">
			<div class="entry-copy">
				<p class="eyebrow">Three boxes · One shape</p>
				<h1 id="entry-title" class="entry-title">
					<span>Arrange three boxes</span>
					<em class="entry-title-emphasis">into an L.</em>
				</h1>
				<p class="entry-lede">
					Walk the room, find a clear line, and tether each box toward you. Bring all
					three together to make an L facing any direction.
				</p>
				<div
					class="goal-orientations"
					role="img"
					aria-label="Any of the four rotations of an L made from three boxes wins"
				>
					<span>Any direction wins</span>
					<div aria-hidden="true">
						<i class="mini-l"><b></b><b></b><b></b><b class="is-empty"></b></i>
						<i class="mini-l"><b></b><b></b><b class="is-empty"></b><b></b></i>
						<i class="mini-l"><b></b><b class="is-empty"></b><b></b><b></b></i>
						<i class="mini-l"><b class="is-empty"></b><b></b><b></b><b></b></i>
					</div>
				</div>

				<div class="entry-actions">
					<button ref="entryStart" type="button" class="start-button" @click="enterNormalRoom">
						Enter the room
						<span aria-hidden="true">→</span>
					</button>
					<button type="button" class="tutorial-button" @click="enterTutorial">
						Start the guided tutorial
					</button>
					<p v-if="normalSessions[selectedNormalLevelId]?.bestPulls !== undefined">
						Personal best · {{ normalSessions[selectedNormalLevelId]?.bestPulls }}
						{{ pluralisePull(normalSessions[selectedNormalLevelId]?.bestPulls ?? 0) }}
					</p>
				</div>
			</div>

			<div class="entry-visual">
				<div class="entry-diagram" aria-hidden="true">
					<div class="demo-player"></div>
					<div class="demo-tether"></div>
					<div class="piece box demo-box demo-box-a"><span class="box-face"></span></div>
					<div class="piece box demo-box demo-box-b"><span class="box-face"></span></div>
					<div class="piece box demo-box demo-box-c"><span class="box-face"></span></div>
				</div>
				<div class="entry-controls" aria-label="Recommended controls for this device">
					<template v-if="inputMode === 'touch'">
						<div class="entry-control">
							<span>Walk</span>
							<strong>Tap dotted floor</strong>
							<small>any reachable tile</small>
						</div>
						<div class="entry-control entry-control-pull">
							<span>Pull</span>
							<strong>Tap box twice</strong>
							<small>preview, then confirm</small>
						</div>
					</template>
					<template v-else>
						<div class="entry-control">
							<span>Walk</span>
							<strong><kbd>↑ ↓ ← →</kbd></strong>
							<small>or W A S D</small>
						</div>
						<div class="entry-control entry-control-pull">
							<span>Pull</span>
							<strong>Hold Space</strong>
							<small>then press a direction</small>
						</div>
					</template>
				</div>
				<p class="entry-note">New here? The guided tutorial marks a firing position and walks you through one pull.</p>
			</div>
		</div>
	</section>

	<main v-else ref="gameRoot" class="game-shell" tabindex="-1">
		<header class="topbar" :inert="modalIsOpen">
			<div class="wordmark" aria-label="Tether">
				<span class="wordmark-mark" aria-hidden="true"></span>
				<span>Tether</span>
			</div>
			<div class="topbar-actions">
				<button ref="guideButton" type="button" class="guide-button" @click="openGuide">
					How to play <kbd>?</kbd>
				</button>
				<label v-if="!isTutorial" class="level-select">
					<span>Room</span>
					<select
						aria-label="Choose room"
						:value="selectedNormalLevelId"
						:disabled="isPullAnimating"
						@change="selectNormalLevel"
					>
						<optgroup v-for="group in levelGroups" :key="group.title" :label="group.title">
							<option v-for="level in group.levels" :key="level.id" :value="level.id">
								{{ normalLevels.indexOf(level) + 1 }} · {{ level.title }}
							</option>
						</optgroup>
					</select>
				</label>
				<button
					v-if="!isTutorial"
					type="button"
					class="tutorial-exit"
					aria-label="Guided tutorial"
					:disabled="isPullAnimating"
					@click="enterTutorial"
				>
					<span class="tutorial-label-full" aria-hidden="true">Guided tutorial</span>
					<span class="tutorial-label-short" aria-hidden="true">Tutorial</span>
				</button>
				<button v-else type="button" class="tutorial-exit" :disabled="isPullAnimating" @click="exitTutorial">
					Resume room
				</button>
				<div class="scoreboard" :aria-label="isTutorial ? 'Tutorial score' : 'Score'">
					<div>
						<span>{{ isTutorial ? "Lesson pulls" : "Pulls" }}</span>
						<strong>{{ session.state.pulls }}</strong>
					</div>
					<i aria-hidden="true"></i>
					<div>
						<span>{{ isTutorial ? "Goal" : "Best" }}</span>
						<strong>{{ isTutorial ? "L" : session.bestPulls ?? "—" }}</strong>
					</div>
				</div>
			</div>
		</header>

		<GuideDialog v-if="showGuide" :input-mode="inputMode" @close="closeGuide" />
		<AssistanceDialog
			v-if="assistance"
			:mode="assistance.mode"
			:level="assistance.level"
			:state="assistance.state"
			@close="closeAssistance"
		/>

		<section id="game" class="game-layout" aria-labelledby="level-title" :inert="modalIsOpen">
			<div class="game-copy">
				<p class="eyebrow">
					{{ isTutorial ? "Guided practice · One pull" : `Room ${normalLevelNumber} · Shape study` }}
				</p>
				<h1 id="level-title"><em class="game-title-emphasis">{{ session.level.title }}</em></h1>
				<button
					v-if="!isTutorial && session.level.par !== undefined"
					type="button"
					class="optimal-pulls"
					:class="{ 'is-revealed': isOptimalPullsRevealed }"
					:aria-label="
						isOptimalPullsRevealed
							? `Hide optimal pull count for ${session.level.title ?? 'this room'}`
							: `Reveal optimal pull count for ${session.level.title ?? 'this room'}`
					"
					:aria-pressed="isOptimalPullsRevealed"
					@click="toggleOptimalPulls"
				>
					<span>Optimal pulls</span>
					<strong aria-hidden="true">{{ isOptimalPullsRevealed ? session.level.par : "?" }}</strong>
				</button>
				<p class="lede">
					{{
						isTutorial
							? inputMode === "touch"
								? "Tap the marked tile, preview the highlighted box, then tap it again to pull."
								: "Walk to the marked tile, then hold Space and press the direction toward the box."
							: inputMode === "touch"
								? "Tap reachable floor to walk. Tap a highlighted box to preview its stop, then tap it again or press Pull."
								: "Walk with arrows or W A S D. Hold Space to see legal tethers, then press a direction to pull."
					}}
				</p>

				<aside v-if="isTutorial" class="tutorial-guide" aria-live="polite" aria-atomic="true">
					<p class="tutorial-guide-label">Guided step</p>
					<strong>{{ tutorialGuideTitle }}</strong>
					<p>{{ tutorialGuideDetail }}</p>
					<p class="tutorial-control-cue">
						<span>Control</span>
						<strong>{{ tutorialControlCue }}</strong>
					</p>
					<div class="tutorial-actions">
						<button type="button" :disabled="isPullAnimating" @click="restartLevel">
							{{ session.phase === "WON" ? "Replay lesson" : "Reset lesson" }}
						</button>
						<button type="button" :disabled="isPullAnimating" @click="exitTutorial">
							{{ session.phase === "WON" ? "Continue to room" : "Skip tutorial" }}
						</button>
					</div>
				</aside>

				<div v-else class="instruction-list" aria-label="Recommended controls">
					<template v-if="inputMode === 'touch'">
						<div>
							<span class="step-number">01</span>
							<p><strong>Choose your position.</strong> Tap any dotted floor tile.</p>
						</div>
						<div>
							<span class="step-number">02</span>
							<p><strong>Preview, then Pull.</strong> Tap a highlighted box, inspect “Stop,” then tap the box again or use Pull.</p>
						</div>
					</template>
					<template v-else>
						<div>
							<span class="step-number">01</span>
							<p><strong>Choose your position.</strong> Walk with arrows or W A S D.</p>
						</div>
						<div>
							<span class="step-number">02</span>
							<p><strong>Aim, then Pull.</strong> Hold Space to reveal legal tethers, then press a direction.</p>
						</div>
					</template>
					<div>
						<span class="step-number">03</span>
						<p><strong>Make any L.</strong> Any rotation counts. How to play shows every control method.</p>
					</div>
				</div>
			</div>

			<div class="play-area">
				<GameBoard
					:level="session.level"
					:session="session"
					:tiles="levelTiles"
					:reachable-keys="reachableKeys"
					:legal-selections="legalSelections"
					:selected-direction="selectedDirection"
					:selection-preview="selectionPreview"
					:engaged-pull="engagedPull"
					:tether-endpoint="tetherEndpoint"
					:aiming="aiming"
					:firing-tile="isTutorial ? tutorialFiringTile : undefined"
					firing-tile-label="Tutorial firing tile. Walk here to align the tether."
					:input-mode="inputMode"
					@walk="walkTo"
					@select="selectPull"
				/>
				<GameControls
					:session="session"
					:input-mode="inputMode"
					:selection-preview="selectionPreview"
					:is-pull-animating="isPullAnimating"
					:has-history="hasHistory"
					:status-title="statusTitle"
					:status-detail="statusDetail"
					@pull="pullSelected"
					@cancel="cancelSelection"
					@undo="undoLastPull"
					@restart="restartLevel"
					@assist="openAssistance"
				/>
			</div>
		</section>
	</main>
</template>
