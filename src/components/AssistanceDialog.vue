<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId } from "vue";
import { findSolutions } from "../assistance/client";
import { buildHints } from "../assistance/hints";
import type {
	AssistanceMode,
	Hint,
	Solution,
	SolutionResult,
	SolutionStep,
} from "../assistance/types";
import {
	completeAnimation,
	type GameState,
	type LegalPull,
	type Level,
	pull,
	resolvePull,
	type Session,
	samePosition,
	walk,
} from "../game";
import GameBoard from "./GameBoard.vue";

const props = defineProps<{
	mode: AssistanceMode;
	level: Level;
	state: GameState;
}>();

const emit = defineEmits<{
	close: [];
}>();

const dialogId = useId();
const mode = ref(props.mode);
const titleId = `assistance-title-${dialogId}`;
const summaryId = `assistance-summary-${dialogId}`;
const panel = ref<HTMLElement | null>(null);
const result = ref<SolutionResult | null>(null);
const errorMessage = ref<string | null>(null);
const selectedSolutionIndex = ref(0);
const revealedHintCount = ref(1);
let controller: AbortController | undefined;
let requestId = 0;

const snapshot = Object.freeze({
	level: props.level,
	state: copyState(props.state),
});
const availableSolutions = computed<readonly Solution[]>(() =>
	result.value?.kind === "SOLUTIONS" ? result.value.solutions : [],
);
const selectedSolution = computed<Solution | undefined>(
	() => availableSolutions.value[selectedSolutionIndex.value],
);
const hints = computed<readonly Hint[]>(() => {
	const solution = selectedSolution.value;
	return solution === undefined
		? []
		: buildHints(snapshot.level, snapshot.state, solution);
});
const displayedHints = computed(() =>
	hints.value.slice(0, revealedHintCount.value),
);
const walkthroughFrames = computed(() => {
	const solution = selectedSolution.value;
	return solution === undefined
		? []
		: replayFrames(snapshot.level, snapshot.state, solution);
});
const frameIndex = ref(0);
const currentFrame = computed(() => walkthroughFrames.value[frameIndex.value]);
const currentStep = computed<SolutionStep | undefined>(() => {
	const solution = selectedSolution.value;
	if (solution === undefined || frameIndex.value >= solution.length)
		return undefined;
	return solution[frameIndex.value];
});
const currentPreview = computed<LegalPull | undefined>(() => {
	const step = currentStep.value;
	return step === undefined
		? undefined
		: {
				kind: "LEGAL",
				target: step.target,
				destination: step.destination,
			};
});
const frameTiles = computed(() => tilesFor(snapshot.level));
const frameReachableKeys = computed(() => new Set<string>());

function copyState(state: GameState): GameState {
	return {
		player: { ...state.player },
		boxes: state.boxes.map((box) => ({ ...box })),
		pulls: state.pulls,
	};
}

function tilesFor(level: Level) {
	return Array.from({ length: level.width * level.height }, (_, index) => ({
		x: index % level.width,
		y: Math.floor(index / level.width),
	}));
}

function snapshotSession(level: Level, state: GameState): Session {
	return {
		level,
		state: copyState(state),
		history: [],
		phase: "READY",
		bestPulls: undefined,
	};
}

function replayFrames(
	level: Level,
	state: GameState,
	solution: Solution,
): readonly Session[] {
	let local = snapshotSession(level, state);
	const frames: Session[] = [];
	for (const step of solution) {
		if (!samePosition(local.state.player, step.firing)) {
			const walked = walk(local, step.firing);
			if (walked.kind === "REJECTED") {
				throw new Error(
					"The solution contains an unreachable firing position.",
				);
			}
			local = completeAnimation(walked.session);
		}
		const resolved = resolvePull(level, local.state, step.direction);
		if (
			resolved.kind !== "LEGAL" ||
			!samePosition(resolved.target, step.target) ||
			!samePosition(resolved.destination, step.destination)
		) {
			throw new Error("The solution does not match a legal pull.");
		}
		frames.push(local);
		const pulled = pull(local, step.direction);
		if (pulled.kind === "REJECTED") {
			throw new Error("The solution contains a rejected pull.");
		}
		local = completeAnimation(pulled.session);
	}
	if (local.phase !== "WON") {
		throw new Error("The solution does not complete the L.");
	}
	return [...frames, local];
}

function loadSolutions(): void {
	controller?.abort();
	controller = new AbortController();
	const activeRequest = ++requestId;
	result.value = null;
	errorMessage.value = null;
	selectedSolutionIndex.value = 0;
	revealedHintCount.value = 1;
	frameIndex.value = 0;
	void findSolutions(snapshot.level, snapshot.state, controller.signal)
		.then((nextResult) => {
			if (controller?.signal.aborted || activeRequest !== requestId) return;
			if (nextResult.kind === "SOLUTIONS") {
				if (nextResult.solutions.length === 0) {
					throw new Error("The solver returned no walkthrough.");
				}
				for (const route of nextResult.solutions) {
					replayFrames(snapshot.level, snapshot.state, route);
				}
			}
			result.value = nextResult;
		})
		.catch((error: unknown) => {
			if (controller?.signal.aborted || activeRequest !== requestId) return;
			errorMessage.value =
				error instanceof Error
					? error.message
					: "The assistant could not calculate a route.";
		});
}

function close(): void {
	controller?.abort();
	emit("close");
}

function selectSolution(index: number): void {
	selectedSolutionIndex.value = index;
	revealedHintCount.value = 1;
	frameIndex.value = 0;
}

function revealStrongerHint(): void {
	revealedHintCount.value = Math.min(
		revealedHintCount.value + 1,
		hints.value.length,
	);
}

function showSolution(): void {
	mode.value = "solution";
	frameIndex.value = 0;
	focusDialog();
}

function trapFocus(event: KeyboardEvent): void {
	if (event.key === "Escape") {
		event.preventDefault();
		event.stopPropagation();
		close();
		return;
	}
	if (event.key !== "Tab") return;
	const targets = Array.from(
		panel.value?.querySelectorAll<HTMLElement>(
			'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
		) ?? [],
	);
	if (targets.length === 0) return;
	const currentIndex = targets.indexOf(document.activeElement as HTMLElement);
	const nextIndex = event.shiftKey
		? currentIndex <= 0
			? targets.length - 1
			: currentIndex - 1
		: currentIndex === targets.length - 1
			? 0
			: currentIndex + 1;
	event.preventDefault();
	targets[nextIndex]?.focus();
}

function focusDialog(): void {
	nextTick(() =>
		panel.value?.querySelector<HTMLElement>("button:not(:disabled)")?.focus(),
	);
}

onMounted(() => {
	focusDialog();
	loadSolutions();
});
onUnmounted(() => controller?.abort());
</script>

<template>
	<div class="assistance-overlay" @click.self="close">
		<section
			ref="panel"
			class="assistance-panel"
			role="dialog"
			aria-modal="true"
			:aria-labelledby="titleId"
			:aria-describedby="summaryId"
			@keydown="trapFocus"
		>
			<header class="assistance-header">
				<div>
					<p class="eyebrow">Optional, unscored assistance</p>
					<h2 :id="titleId" class="assistance-title">
						{{ mode === "hint" ? "A small nudge" : "Solution walkthrough" }}
					</h2>
				</div>
				<button type="button" class="guide-close" :aria-label="`Close ${mode}`" @click="close">
					<span aria-hidden="true">×</span>
				</button>
			</header>

			<p :id="summaryId" class="assistance-summary">
				{{
					mode === "hint"
						? "Hints are calculated from your current board. Stronger hints reveal only when you ask."
						: "This read-only route starts from your current position. It does not change your score, history, or room."
				}}
			</p>

			<div v-if="result === null && errorMessage === null" class="assistance-state" aria-live="polite">
				<strong>Finding a legal route…</strong>
				<p>The room remains unchanged while this runs.</p>
			</div>

			<div v-else-if="errorMessage !== null" class="assistance-state assistance-error" role="alert">
				<strong>Couldn’t calculate help</strong>
				<p>{{ errorMessage }}</p>
				<button type="button" class="assistance-action" @click="loadSolutions">Try again</button>
			</div>

			<div v-else-if="result?.kind === 'WON'" class="assistance-state">
				<strong>This position is already complete.</strong>
				<p>You have already made the L. Replay the room if you want to explore another route.</p>
			</div>

			<div v-else-if="result?.kind === 'UNSOLVABLE'" class="assistance-state">
				<strong>No route was found from this position.</strong>
				<p>Try Undo pull or Reset room, then ask again. This does not mean that no pulls remain.</p>
			</div>

			<div v-else-if="result?.kind === 'SOLUTIONS'" class="assistance-content">
				<div v-if="mode === 'solution' && availableSolutions.length > 1" class="route-choices" aria-label="Shortest routes">
					<p>Shortest routes · {{ result.minimumPulls }} {{ result.minimumPulls === 1 ? "pull" : "pulls" }}</p>
					<div>
						<button
							v-for="(_, index) in availableSolutions"
							:key="index"
							type="button"
							:class="{ 'is-selected': selectedSolutionIndex === index }"
							:aria-pressed="selectedSolutionIndex === index"
							@click="selectSolution(index)"
						>
							Route {{ index + 1 }}
						</button>
						</div>
					<small>Up to three distinct shortest routes are shown; these are alternatives, not all solutions.</small>
				</div>

				<section v-if="mode === 'hint'" class="hint-content" aria-label="Progressive hints">
					<p class="hint-route-count">A shortest route takes {{ result.minimumPulls }} {{ result.minimumPulls === 1 ? "pull" : "pulls" }} from here.</p>
					<article v-for="(hint, index) in displayedHints" :key="hint.title" class="hint-card">
						<span>Hint {{ index + 1 }} of 3</span>
						<h3>{{ hint.title }}</h3>
						<p>{{ hint.text }}</p>
					</article>
					<div v-if="currentStep && revealedHintCount === hints.length" class="exact-hint-preview">
						<p>Exact first pull preview</p>
						<GameBoard
							:level="snapshot.level"
							:session="currentFrame ?? snapshotSession(snapshot.level, snapshot.state)"
							:tiles="frameTiles"
							:reachable-keys="frameReachableKeys"
							:legal-selections="[]"
							:selected-direction="null"
							:selection-preview="currentPreview"
							:engaged-pull="null"
							:tether-endpoint="null"
							:firing-tile="currentStep.firing"
							firing-tile-label="Firing spot"
							read-only
							board-label="Exact first pull preview"
							board-description="Read-only preview of the exact first pull."
						/>
					</div>
					<button
						v-if="revealedHintCount < hints.length"
						type="button"
						class="assistance-action"
						@click="revealStrongerHint"
					>
						Show stronger hint
					</button>
					<button type="button" class="assistance-action" @click="showSolution">
						Show full solution
					</button>
				</section>

				<section v-else class="walkthrough-content" aria-label="Read-only solution walkthrough">
					<p class="hint-route-count">Shortest route · {{ result.minimumPulls }} {{ result.minimumPulls === 1 ? "pull" : "pulls" }} from here</p>
					<p class="walkthrough-state">
						{{
							currentStep
								? `Pull ${frameIndex + 1} of ${selectedSolution?.length ?? 0}`
								: "Final position"
						}}
					</p>
					<GameBoard
						v-if="currentFrame"
						:level="snapshot.level"
						:session="currentFrame"
						:tiles="frameTiles"
						:reachable-keys="frameReachableKeys"
						:legal-selections="[]"
						:selected-direction="null"
						:selection-preview="currentPreview"
						:engaged-pull="null"
						:tether-endpoint="null"
						:firing-tile="currentStep?.firing"
						firing-tile-label="Firing spot"
						read-only
						board-label="Read-only solution board"
						board-description="Read-only walkthrough frame."
					/>
					<p v-if="currentStep" class="step-detail">
						Stand at column {{ currentStep.firing.x + 1 }}, row {{ currentStep.firing.y + 1 }}.
						Pull {{ currentStep.direction }}: box at column {{ currentStep.target.x + 1 }}, row
						{{ currentStep.target.y + 1 }} stops at column {{ currentStep.destination.x + 1 }}, row
						{{ currentStep.destination.y + 1 }}.
					</p>
					<p v-else class="step-detail">The L is complete in this read-only final position.</p>
					<nav class="walkthrough-controls" aria-label="Walkthrough position">
						<button type="button" :disabled="frameIndex === 0" @click="frameIndex = 0">Start</button>
						<button type="button" :disabled="frameIndex === 0" @click="frameIndex -= 1">Previous</button>
						<button
							type="button"
							:disabled="frameIndex >= walkthroughFrames.length - 1"
							@click="frameIndex += 1"
						>
							Next
						</button>
						<button
							type="button"
							:disabled="frameIndex >= walkthroughFrames.length - 1"
							@click="frameIndex = walkthroughFrames.length - 1"
						>
							Final
						</button>
					</nav>
				</section>
			</div>

			<footer class="assistance-footer">
				<button type="button" class="guide-return" @click="close">Back to the room</button>
			</footer>
		</section>
	</div>
</template>
