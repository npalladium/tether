<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

type InputMode = "touch" | "keyboard";
type GuideView = InputMode | "all";

const props = defineProps<{
	inputMode: InputMode;
}>();
const emit = defineEmits<{
	close: [];
}>();

const closeButton = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const view = ref<GuideView>(props.inputMode);
const hasChosenView = ref(false);
const guideSummary = computed(() => {
	if (view.value === "all") {
		return "Every way to walk, preview, pull, cancel, recover, and ask for help.";
	}
	return view.value === "touch"
		? "Touch-first instructions selected for this device. You can switch to all controls at any time."
		: "Keyboard and mouse instructions selected for this device. You can switch to all controls at any time.";
});

function close(): void {
	emit("close");
}

function chooseView(nextView: GuideView): void {
	hasChosenView.value = true;
	view.value = nextView;
}

function trapFocus(event: KeyboardEvent): void {
	if (event.key !== "Tab") return;
	const focusTargets = Array.from(
		panel.value?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ??
			[],
	);
	if (focusTargets.length === 0) return;
	event.preventDefault();
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

watch(
	() => props.inputMode,
	(nextMode) => {
		if (!hasChosenView.value) view.value = nextMode;
	},
);

onMounted(() => {
	nextTick(() => closeButton.value?.focus());
});
</script>

<template>
	<div class="guide-overlay" @click.self="close">
		<section
			ref="panel"
			class="guide-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="guide-title"
			aria-describedby="guide-summary"
			@keydown="trapFocus"
		>
			<header class="guide-panel-header">
				<div>
					<p class="eyebrow guide-eyebrow">The room stays in view</p>
					<h2 id="guide-title" class="guide-title">How to play</h2>
				</div>
				<button
					ref="closeButton"
					type="button"
					class="guide-close"
					aria-label="Close how to play"
					@click="close"
				>
					<span aria-hidden="true">×</span>
				</button>
			</header>

			<p id="guide-summary" class="guide-summary">{{ guideSummary }}</p>

			<div class="guide-mode-tabs" role="group" aria-label="Choose control instructions">
				<button
					type="button"
					:aria-pressed="view === 'touch'"
					:class="{ 'is-selected': view === 'touch' }"
					@click="chooseView('touch')"
				>
					Touch
					<small v-if="inputMode === 'touch'">Recommended</small>
				</button>
				<button
					type="button"
					:aria-pressed="view === 'keyboard'"
					:class="{ 'is-selected': view === 'keyboard' }"
					@click="chooseView('keyboard')"
				>
					Keyboard &amp; mouse
					<small v-if="inputMode === 'keyboard'">Recommended</small>
				</button>
				<button
					type="button"
					:aria-pressed="view === 'all'"
					:class="{ 'is-selected': view === 'all' }"
					@click="chooseView('all')"
				>
					All controls
				</button>
			</div>

			<div class="guide-control-content">
				<section v-if="view === 'touch' || view === 'all'" aria-labelledby="touch-controls-title">
					<h3 id="touch-controls-title">Touch controls</h3>
					<ol class="guide-steps">
						<li>
							<span>01</span>
							<p><strong>Walk freely.</strong> Tap any dotted floor tile. Walking never costs a pull and clears an unfinished preview.</p>
						</li>
						<li>
							<span>02</span>
							<p><strong>Preview the stop.</strong> Tap a box marked “Tap.” The tether ray and “Stop” ghost show its fixed endpoint beside you.</p>
						</li>
						<li>
							<span>03</span>
							<p><strong>Pull or cancel.</strong> Tap the selected box—now marked “Pull”—again, or use the large Pull button. Cancel changes nothing.</p>
						</li>
					</ol>
				</section>

				<section v-if="view === 'keyboard' || view === 'all'" aria-labelledby="keyboard-controls-title">
					<h3 id="keyboard-controls-title">Keyboard &amp; mouse controls</h3>
					<ol class="guide-steps">
						<li>
							<span>01</span>
							<p><strong>Walk.</strong> Use arrow keys or W A S D one tile at a time. You can also click any dotted floor tile.</p>
						</li>
						<li>
							<span>02</span>
							<p><strong>Pull quickly.</strong> Hold Space to reveal every legal tether and “Stop” ghost, then press a direction once. Release Space to leave aiming.</p>
						</li>
						<li>
							<span>03</span>
							<p><strong>Preview deliberately.</strong> Click a highlighted box twice, or Tab to it and press Enter twice. Enter confirms a preview; Escape cancels it.</p>
						</li>
					</ol>
					<div class="guide-shortcuts" aria-label="Keyboard shortcuts">
						<p><span>Walk</span><kbd>Arrows</kbd><small>or WASD</small></p>
						<p><span>Aim and pull</span><kbd>Hold Space</kbd><small>then a direction</small></p>
						<p><span>Confirm preview</span><kbd>Enter</kbd></p>
						<p><span>Cancel preview</span><kbd>Escape</kbd></p>
						<p><span>Undo</span><kbd>Z</kbd></p>
						<p><span>Reset</span><kbd>R</kbd></p>
						<p><span>How to play</span><kbd>?</kbd></p>
					</div>
				</section>

				<section class="guide-common-controls" aria-labelledby="common-controls-title">
					<h3 id="common-controls-title">Always available</h3>
					<p><strong>Pull</strong> confirms the selected preview. <strong>Cancel</strong> clears it. <strong>Undo pull</strong> restores your previous firing position and box layout; <strong>Reset room</strong> restarts without erasing your best score.</p>
					<p><strong>Hint</strong> reveals help in stages. <strong>Show solution</strong> opens a read-only walkthrough and never changes the live room.</p>
					<p>The <strong>room menu</strong> changes puzzles while preserving each room. <strong>Guided tutorial</strong> opens one-pull practice; Resume room returns without changing your puzzle. <strong>How to play</strong> reopens this guide.</p>
				</section>
			</div>

			<button type="button" class="guide-return" @click="close">
				Back to the room
			</button>
		</section>
	</div>
</template>
