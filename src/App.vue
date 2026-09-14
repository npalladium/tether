<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
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
			"Walk to a dotted floor tile, then select a highlighted box to preview its pull.",
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
const selectedNormalLevelId = ref(defaultLevel.id);
const isTutorial = ref(false);
const hasEntered = ref(false);
const showGuide = ref(false);
const entryStart = ref<HTMLButtonElement | null>(null);
const gameRoot = ref<HTMLElement | null>(null);
const guideButton = ref<HTMLButtonElement | null>(null);
const tetherEndpoint = ref<{ x: number; y: number } | null>(null);
const engagedPull = ref<LegalPull | null>(null);
let settleTimer: number | undefined;
let tetherFrame: number | undefined;

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
	if (selectionPreview.value) return "Inspect the ghost";
	return tutorialAtFiringTile.value
		? "Choose the distant box"
		: "Walk to the firing tile";
});
const tutorialGuideDetail = computed(() => {
	if (session.value.phase === "WON") {
		return "You made the L in one pull. Replay the lesson or return to your room.";
	}
	if (selectionPreview.value) {
		return hasExpectedTutorialPreview.value
			? "The ghost marks where the box will stop beside you. Confirm Pull when the endpoint makes sense."
			: "The ghost is this pull’s exact endpoint. Confirm it, or press Escape and inspect another legal box.";
	}
	return tutorialAtFiringTile.value
		? "You are in position. Select the highlighted box across the row to preview its endpoint."
		: "The glowing ring marks a firing position, not a destination. Walk onto it from any reachable floor tile.";
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
			return `Solved in ${session.value.state.pulls} ${pluralisePull(session.value.state.pulls)}.`;
		case "NO_PULLS":
			return hasHistory.value
				? "No moving pulls remain. Undo the last pull or restart the room."
				: "No moving pulls remain. Restart the room to try another approach.";
		default:
			return announcement.value;
	}
});

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
		: `Standing at column ${tile.x + 1}, row ${tile.y + 1}. Select a highlighted box to preview its pull.`;
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
	const option = pullOptions.value[direction];
	if (option.kind !== "LEGAL") {
		selectedDirection.value = null;
		announcement.value = rejectionMessage(option.reason);
		return;
	}
	selectedDirection.value = direction;
	announcement.value =
		`Box selected at column ${option.target.x + 1}, row ${option.target.y + 1}. ` +
		`It will stop at column ${option.destination.x + 1}, row ${option.destination.y + 1}. Press Pull, Enter, or Space.`;
}

function pullSelected(): void {
	if (session.value.phase !== "READY" || isPullAnimating.value) return;
	const direction = selectedDirection.value;
	const option = selectionPreview.value;
	if (!direction || !option) {
		announcement.value = "Select a highlighted box before pulling.";
		return;
	}
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
			'button:not(.box-target), a[href], input, select, textarea, [contenteditable="true"]',
		)
	);
}

function handleKeydown(event: KeyboardEvent): void {
	if (event.metaKey || event.ctrlKey || event.altKey || !hasEntered.value)
		return;

	if (showGuide.value) {
		if (event.key === "Escape") {
			event.preventDefault();
			closeGuide();
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
			selectedDirection.value = null;
			announcement.value = "Box selection cancelled.";
		}
		return;
	}
	if (
		(event.key === "Enter" || event.key === " ") &&
		selectedDirection.value &&
		!hasFocusedNativeControl()
	) {
		event.preventDefault();
		pullSelected();
		return;
	}
	if (hasFocusedNativeControl()) return;
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
	if (event.shiftKey) {
		selectPull(direction);
	} else {
		walkDirection(direction);
	}
}

onMounted(() => {
	window.addEventListener("keydown", handleKeydown);
	nextTick(() => entryStart.value?.focus());
});
onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleKeydown);
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
			<span class="entry-edition">A quiet spatial puzzle</span>
		</header>

		<div class="entry-layout">
			<div class="entry-copy">
				<p class="eyebrow">Three boxes · One shape</p>
				<h1 id="entry-title" class="entry-title">
					<span>Where you stand</span>
					<em class="entry-title-emphasis">is where it stops.</em>
				</h1>
				<p class="entry-lede">
					Walk the room, find a clear line, and tether each box toward you. Bring all
					three together to make an L.
				</p>

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
					<div class="demo-box demo-box-a"></div>
					<div class="demo-box demo-box-b"></div>
					<div class="demo-box demo-box-c"></div>
				</div>
				<div class="entry-controls" aria-label="Game controls">
					<div class="entry-control">
						<span>Walk</span>
						<strong><kbd>↑ ↓ ← →</kbd></strong>
						<small>or W A S D</small>
					</div>
					<div class="entry-control entry-control-pull">
						<span>Pull</span>
						<strong>Select box</strong>
						<small>then choose Pull</small>
					</div>
				</div>
				<p class="entry-note">New here? The guided tutorial marks a firing position and walks you through one pull.</p>
			</div>
		</div>
	</section>

	<main v-else ref="gameRoot" class="game-shell" tabindex="-1">
		<header class="topbar" :inert="showGuide">
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

		<GuideDialog v-if="showGuide" @close="closeGuide" />

		<section id="game" class="game-layout" aria-labelledby="level-title" :inert="showGuide">
			<div class="game-copy">
				<p class="eyebrow">
					{{ isTutorial ? "Guided practice · One pull" : `Room ${normalLevelNumber} · Shape study` }}
				</p>
				<h1 id="level-title"><em class="game-title-emphasis">{{ session.level.title }}</em></h1>
				<p class="lede">
					{{
						isTutorial
							? "Use the marked tile to see how your position fixes a pull’s endpoint."
							: "Walk anywhere you can reach. Select a visible box to preview its fixed destination, then Pull until all three make an L."
					}}
				</p>

				<aside v-if="isTutorial" class="tutorial-guide" aria-live="polite" aria-atomic="true">
					<p class="tutorial-guide-label">Guided step</p>
					<strong>{{ tutorialGuideTitle }}</strong>
					<p>{{ tutorialGuideDetail }}</p>
					<div class="tutorial-actions">
						<button type="button" :disabled="isPullAnimating" @click="restartLevel">
							{{ session.phase === "WON" ? "Replay lesson" : "Reset lesson" }}
						</button>
						<button type="button" :disabled="isPullAnimating" @click="exitTutorial">
							{{ session.phase === "WON" ? "Continue to room" : "Skip tutorial" }}
						</button>
					</div>
				</aside>

				<div v-else class="instruction-list" aria-label="How to play">
					<div>
						<span class="step-number">01</span>
						<p><strong>Choose your position.</strong> Click dotted floor, or walk with arrows / W A S D.</p>
					</div>
					<div>
						<span class="step-number">02</span>
						<p><strong>Select, then Pull.</strong> Choose a highlighted box to preview its exact destination before confirming Pull.</p>
					</div>
					<div>
						<span class="step-number">03</span>
						<p><strong>Make the shape.</strong> <span class="mini-l" role="img" aria-label="an L made from three squares"><i></i><i></i><i></i></span></p>
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
					:firing-tile="isTutorial ? tutorialFiringTile : undefined"
					firing-tile-label="Tutorial firing tile. Walk here to align the tether."
					@walk="walkTo"
					@select="selectPull"
				/>
				<GameControls
					:session="session"
					:selection-preview="selectionPreview"
					:is-pull-animating="isPullAnimating"
					:has-history="hasHistory"
					:status-title="statusTitle"
					:status-detail="statusDetail"
					@pull="pullSelected"
					@undo="undoLastPull"
					@restart="restartLevel"
				/>
			</div>
		</section>
	</main>
</template>
