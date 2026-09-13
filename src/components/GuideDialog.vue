<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";

const emit = defineEmits<{
	close: [];
}>();

const closeButton = ref<HTMLButtonElement | null>(null);
const returnButton = ref<HTMLButtonElement | null>(null);

function close(): void {
	emit("close");
}

function trapFocus(event: KeyboardEvent): void {
	if (event.key !== "Tab") return;
	event.preventDefault();
	const focusTargets = [closeButton.value, returnButton.value].filter(
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

onMounted(() => {
	nextTick(() => closeButton.value?.focus());
});
</script>

<template>
	<div class="guide-overlay" @click.self="close">
		<section
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

			<p id="guide-summary" class="guide-summary">
				Walk to an open tile, select a highlighted box to preview its fixed destination,
				then explicitly Pull it toward you. Arrange all three boxes into an L.
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
				<p><span>Select a pull</span><kbd>Shift + Arrows</kbd><small>or Shift + WASD</small></p>
				<p><span>Confirm</span><kbd>Enter</kbd><small>or Space after selection</small></p>
				<p><span>Undo</span><kbd>Z</kbd></p>
				<p><span>Reset</span><kbd>R</kbd></p>
			</div>

			<button ref="returnButton" type="button" class="guide-return" @click="close">
				Back to the room
			</button>
		</section>
	</div>
</template>
