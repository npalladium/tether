<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import {
	beginSession,
	completeAnimation,
	DIRECTIONS,
	type Direction,
	type LegalPull,
	type Position,
	pull,
	reachableTiles,
	replay,
	reset,
	resolvePull,
	type Session,
	undo,
	walk,
} from "./game";
import { defaultLevel } from "./level";

const CELL_COUNT = defaultLevel.width * defaultLevel.height;
const TRANSITION_MS = 260;
const BEST_STORAGE_KEY = `tether:${defaultLevel.id}:best-pulls`;
const deltaByDirection: Record<Direction, Position> = {
	N: { x: 0, y: -1 },
	E: { x: 1, y: 0 },
	S: { x: 0, y: 1 },
	W: { x: -1, y: 0 },
};

const tiles = Array.from({ length: CELL_COUNT }, (_, index) => ({
	x: index % defaultLevel.width,
	y: Math.floor(index / defaultLevel.width),
}));

type LegalSelection = Readonly<{
	direction: Direction;
	pull: LegalPull;
}>;

const session = ref<Session>(beginSession(defaultLevel, loadBestPulls()));
const selectedDirection = ref<Direction | null>(null);
const engagedPull = ref<LegalPull | null>(null);
const tetherEndpoint = ref<Position | null>(null);
const hasEntered = ref(false);
const showGuide = ref(false);
const entryStart = ref<HTMLButtonElement | null>(null);
const gameRoot = ref<HTMLElement | null>(null);
const guideButton = ref<HTMLButtonElement | null>(null);
const guideClose = ref<HTMLButtonElement | null>(null);
const guideReturn = ref<HTMLButtonElement | null>(null);
const announcement = ref(
	"Walk to a dotted floor tile, then select a highlighted box to preview its pull.",
);
let settleTimer: number | undefined;
let tetherFrame: number | undefined;

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

const isEngagedTether = computed(
	() => session.value.phase === "SLIDING" && engagedPull.value !== null,
);
const visibleTether = computed(() =>
	isEngagedTether.value ? engagedPull.value : selectionPreview.value,
);

const isSettling = computed(
	() => session.value.phase === "WALKING" || session.value.phase === "SLIDING",
);
const hasHistory = computed(() => session.value.history.length > 0);
const statusTitle = computed(() => {
	switch (session.value.phase) {
		case "WON":
			return "L complete";
		case "NO_PULLS":
			return "No pulls remain";
		case "WALKING":
			return "Moving";
		case "SLIDING":
			return "Tether engaged";
		default:
			return "Find your angle";
	}
});
const statusDetail = computed(() => {
	switch (session.value.phase) {
		case "WON":
			return `Solved in ${session.value.state.pulls} ${pluralisePull(session.value.state.pulls)}.`;
		case "NO_PULLS":
			return "The player is enclosed. Undo the last pull or restart the room.";
		case "WALKING":
			return "Walking is free.";
		case "SLIDING":
			return "The box stops beside you.";
		default:
			return announcement.value;
	}
});

function loadBestPulls(): number | undefined {
	try {
		const saved = window.localStorage.getItem(BEST_STORAGE_KEY);
		if (saved === null) return undefined;
		const value = Number(saved);
		return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

function saveBestPulls(bestPulls: number | undefined): void {
	if (bestPulls === undefined) return;
	try {
		window.localStorage.setItem(BEST_STORAGE_KEY, String(bestPulls));
	} catch {
		// Storage is optional; play must continue when it is unavailable.
	}
}

function positionKey(position: Position): string {
	return `${position.x},${position.y}`;
}

function positionStyle(position: Position): Record<string, string> {
	return {
		left: `${(position.x / defaultLevel.width) * 100}%`,
		top: `${(position.y / defaultLevel.height) * 100}%`,
	};
}

function isAt(left: Position, right: Position): boolean {
	return left.x === right.x && left.y === right.y;
}

function isReachable(tile: Position): boolean {
	return reachableKeys.value.has(positionKey(tile));
}

function isOccupied(tile: Position): boolean {
	return (
		defaultLevel.pillars.some((pillar) => isAt(pillar, tile)) ||
		session.value.state.boxes.some((box) => isAt(box, tile))
	);
}

function boxTargetLabel(selection: LegalSelection): string {
	const { target, destination } = selection.pull;
	return `Select box at column ${target.x + 1}, row ${target.y + 1}; fixed destination column ${destination.x + 1}, row ${destination.y + 1}`;
}

function clearTetherAnimation(): void {
	if (tetherFrame !== undefined) {
		window.cancelAnimationFrame(tetherFrame);
		tetherFrame = undefined;
	}
	tetherEndpoint.value = null;
}

function animateTether(pull: LegalPull, duration: number): void {
	tetherEndpoint.value = { ...pull.target };
	if (duration === 0) {
		tetherEndpoint.value = { ...pull.destination };
		return;
	}

	const start = window.performance.now();
	const step = (now: number): void => {
		const elapsed = Math.min((now - start) / duration, 1);
		const progress = 1 - (1 - elapsed) ** 3;
		tetherEndpoint.value = {
			x: pull.target.x + (pull.destination.x - pull.target.x) * progress,
			y: pull.target.y + (pull.destination.y - pull.target.y) * progress,
		};
		if (elapsed < 1) {
			tetherFrame = window.requestAnimationFrame(step);
		} else {
			tetherFrame = undefined;
		}
	};
	tetherFrame = window.requestAnimationFrame(step);
}

function settle(
	nextSession: Session,
	message: string,
	engagement: LegalPull | null = null,
): void {
	window.clearTimeout(settleTimer);
	clearTetherAnimation();
	session.value = nextSession;
	announcement.value = message;
	selectedDirection.value = null;
	engagedPull.value = engagement;
	const settleDelay = window.matchMedia("(prefers-reduced-motion: reduce)")
		.matches
		? 0
		: TRANSITION_MS;
	if (engagement) animateTether(engagement, settleDelay);
	settleTimer = window.setTimeout(() => {
		session.value = completeAnimation(session.value);
		engagedPull.value = null;
		clearTetherAnimation();
		saveBestPulls(session.value.bestPulls);
	}, settleDelay);
}

function walkTo(tile: Position): void {
	selectedDirection.value = null;
	if (session.value.phase !== "READY") return;
	if (isAt(session.value.state.player, tile)) {
		announcement.value = "You are already standing there.";
		return;
	}
	const result = walk(session.value, tile);
	if (result.kind === "REJECTED") {
		announcement.value = "That tile is not reachable.";
		return;
	}
	settle(
		result.session,
		`Standing at column ${tile.x + 1}, row ${tile.y + 1}. Select a highlighted box to preview its pull.`,
	);
}

function walkDirection(direction: Direction): void {
	selectedDirection.value = null;
	if (session.value.phase !== "READY") return;
	const delta = deltaByDirection[direction];
	walkTo({
		x: session.value.state.player.x + delta.x,
		y: session.value.state.player.y + delta.y,
	});
}

function selectPull(direction: Direction): void {
	if (session.value.phase !== "READY") return;
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
	if (session.value.phase !== "READY") return;
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
	settle(
		result.session,
		`Box pulled to column ${option.destination.x + 1}, row ${option.destination.y + 1}.`,
		option,
	);
}

function undoLastPull(): void {
	if (isSettling.value || !hasHistory.value) return;
	session.value = undo(session.value);
	selectedDirection.value = null;
	clearTetherAnimation();
	engagedPull.value = null;
	announcement.value = "Last pull undone. Your firing position was restored.";
}

function restartLevel(): void {
	if (isSettling.value) return;
	window.clearTimeout(settleTimer);
	clearTetherAnimation();
	session.value =
		session.value.phase === "WON"
			? replay(session.value)
			: reset(session.value);
	selectedDirection.value = null;
	engagedPull.value = null;
	announcement.value = "Room reset. Your best score is safe.";
}

function enterGame(): void {
	hasEntered.value = true;
	nextTick(() => gameRoot.value?.focus());
}

function openGuide(): void {
	showGuide.value = true;
	nextTick(() => guideClose.value?.focus());
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

function handleKeydown(event: KeyboardEvent): void {
	if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
	if (!hasEntered.value) return;

	if (showGuide.value) {
		if (event.key === "Escape") {
			event.preventDefault();
			closeGuide();
		} else if (event.key === "Tab") {
			event.preventDefault();
			const focusTargets = [guideClose.value, guideReturn.value].filter(
				(target): target is HTMLButtonElement => target !== null,
			);
			const currentIndex = focusTargets.indexOf(
				document.activeElement as HTMLButtonElement,
			);
			const nextIndex = event.shiftKey
				? currentIndex <= 0
					? focusTargets.length - 1
					: currentIndex - 1
				: currentIndex === focusTargets.length - 1
					? 0
					: currentIndex + 1;
			focusTargets[nextIndex]?.focus();
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
		document.activeElement instanceof HTMLElement &&
		document.activeElement.classList.contains("box-target")
	) {
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
	walkDirection(direction);
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
					Walk the room, find a clear line, and tether each box toward you.
					Bring all three together to make an L.
				</p>

				<div class="entry-actions">
					<button ref="entryStart" type="button" class="start-button" @click="enterGame">
						Enter the room
						<span aria-hidden="true">→</span>
					</button>
					<p v-if="session.bestPulls !== undefined">
						Personal best · {{ session.bestPulls }} {{ pluralisePull(session.bestPulls) }}
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
				<p class="entry-note">Select highlighted boxes to preview their fixed destination.</p>
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
				<div class="scoreboard" aria-label="Score">
					<div>
						<span>Pulls</span>
						<strong>{{ session.state.pulls }}</strong>
					</div>
					<i aria-hidden="true"></i>
					<div>
						<span>Best</span>
						<strong>{{ session.bestPulls ?? "—" }}</strong>
					</div>
				</div>
			</div>
		</header>

		<div v-if="showGuide" class="guide-overlay" @click.self="closeGuide">
			<section
				class="guide-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="guide-title"
				aria-describedby="guide-summary"
			>
				<header class="guide-panel-header">
					<div>
						<p class="eyebrow guide-eyebrow">The room stays in view</p>
						<h2 id="guide-title" class="guide-title">How to play</h2>
					</div>
					<button
						ref="guideClose"
						type="button"
						class="guide-close"
						aria-label="Close how to play"
						@click="closeGuide"
					>
						<span aria-hidden="true">×</span>
					</button>
				</header>

				<p id="guide-summary" class="guide-summary">
					Walk to an open tile, select a highlighted box to preview its fixed
					destination, then explicitly Pull it toward you. Arrange all three boxes into an L.
				</p>

				<ol class="guide-steps">
					<li>
						<span>01</span>
						<p><strong>Choose your position.</strong> Dotted floor is reachable.</p>
					</li>
					<li>
						<span>02</span>
						<p><strong>Select a box.</strong> Its laser and exact destination appear before you pull.</p>
					</li>
					<li>
						<span>03</span>
						<p><strong>Make the shape.</strong> Bring the three boxes into an L.</p>
					</li>
				</ol>

				<div class="guide-shortcuts" aria-label="Keyboard shortcuts">
					<p><span>Walk</span><kbd>Arrows</kbd><small>or WASD</small></p>
					<p><span>Pull</span><kbd>Enter</kbd><small>or Space on a selected box</small></p>
					<p><span>Undo</span><kbd>Z</kbd></p>
					<p><span>Reset</span><kbd>R</kbd></p>
				</div>

				<button ref="guideReturn" type="button" class="guide-return" @click="closeGuide">
					Back to the room
				</button>
			</section>
		</div>

		<section id="game" class="game-layout" aria-labelledby="level-title" :inert="showGuide">
			<div class="game-copy">
				<p class="eyebrow">Room 01 · Shape study</p>
				<h1 id="level-title">Verified<br /><em class="game-title-emphasis">enclosure</em></h1>
				<p class="lede">
					Walk anywhere you can reach. Select a visible box to preview its fixed
					destination, then Pull until all three make an L.
				</p>

				<div class="instruction-list" aria-label="How to play">
					<div>
						<span class="step-number">01</span>
						<p>
							<strong>Choose your position.</strong> Click dotted floor, or walk with
							arrows / W A S D.
						</p>
					</div>
					<div>
						<span class="step-number">02</span>
						<p>
							<strong>Select, then Pull.</strong> Choose a highlighted box to preview
							its exact destination before confirming Pull.
						</p>
					</div>
					<div>
						<span class="step-number">03</span>
						<p>
							<strong>Make the shape.</strong>
							<span class="mini-l" aria-label="an L made from three squares">
								<i></i><i></i><i></i>
							</span>
						</p>
					</div>
				</div>
			</div>

			<div class="play-area">
				<div class="board-wrap">
					<div
						class="board"
						:class="{ 'is-settling': isSettling }"
						aria-label="Eight by eight Tether board"
					>
						<div
							v-for="tile in tiles"
							:key="positionKey(tile)"
							class="board-cell"
							:class="{
								'is-reachable': isReachable(tile) && !isOccupied(tile),
								'is-current': isAt(session.state.player, tile),
							}"
							aria-hidden="true"
							@click="walkTo(tile)"
						></div>

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
							v-for="pillar in defaultLevel.pillars"
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
									(selectionPreview && isAt(selectionPreview.target, box)) ||
									(isEngagedTether && engagedPull && isAt(engagedPull.destination, box)),
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
							class="piece box-target"
							:class="{
								'is-selectable': session.phase === 'READY',
								'is-selected':
									selectedDirection === selection.direction &&
									selectionPreview !== undefined,
							}"
							:style="positionStyle(selection.pull.target)"
							:aria-label="boxTargetLabel(selection)"
							@focus="selectPull(selection.direction)"
							@click="selectPull(selection.direction)"
						></button>
						<div
							class="piece player"
							:style="positionStyle(session.state.player)"
							aria-hidden="true"
						>
							<span class="player-core"></span>
						</div>
					</div>
					<span class="axis-label axis-x">east →</span>
					<span class="axis-label axis-y">south →</span>
				</div>

				<div class="control-panel">
					<div class="status-copy" aria-live="polite">
						<span class="status-light" :class="`phase-${session.phase.toLowerCase()}`"></span>
						<div>
							<strong>{{ statusTitle }}</strong>
							<p>{{ statusDetail }}</p>
						</div>
					</div>

					<div v-if="selectionPreview" class="pull-controls" aria-label="Selected box pull">
						<div class="pull-copy">
							<span>Tether control</span>
							<strong>
								Box {{ selectionPreview.target.x + 1 }}, {{ selectionPreview.target.y + 1 }}
							</strong>
							<p>
								Fixed destination: column {{ selectionPreview.destination.x + 1 }}, row
								{{ selectionPreview.destination.y + 1 }}.
							</p>
						</div>
						<button
							type="button"
							class="pull-confirm"
							:disabled="session.phase !== 'READY'"
							:aria-label="
								`Pull selected box to column ${selectionPreview.destination.x + 1}, row ${selectionPreview.destination.y + 1}`
							"
							@click="pullSelected"
						>
							Pull
						</button>
					</div>

					<div class="utility-controls">
						<button type="button" :disabled="isSettling || !hasHistory" @click="undoLastPull">
							<svg viewBox="0 0 20 20" aria-hidden="true">
								<path d="M8 5 4 9l4 4M5 9h6a5 5 0 1 1 0 10" />
							</svg>
							Undo pull
						</button>
						<button type="button" :disabled="isSettling" @click="restartLevel">
							<svg viewBox="0 0 20 20" aria-hidden="true">
								<path d="M15.5 7A6 6 0 1 0 16 12M15.5 7V2m0 5h-5" />
							</svg>
							{{ session.phase === "WON" ? "Play again" : "Reset room" }}
						</button>
					</div>
				</div>
			</div>
		</section>
	</main>
</template>
