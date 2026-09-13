<script setup lang="ts">
import type { LegalPull, Session } from "../game";

const props = defineProps<{
	session: Session;
	selectionPreview: LegalPull | undefined;
	isPullAnimating: boolean;
	hasHistory: boolean;
	statusTitle: string;
	statusDetail: string;
}>();

const emit = defineEmits<{
	pull: [];
	undo: [];
	restart: [];
}>();
</script>

<template>
	<div class="control-panel">
		<div class="status-copy" aria-live="polite" aria-atomic="true">
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
				@click="emit('pull')"
			>
				Pull
			</button>
		</div>

		<div class="utility-controls">
			<button type="button" :disabled="isPullAnimating || !hasHistory" @click="emit('undo')">
				<svg viewBox="0 0 20 20" aria-hidden="true">
					<path d="M8 5 4 9l4 4M5 9h6a5 5 0 1 1 0 10" />
				</svg>
				Undo pull
			</button>
			<button type="button" :disabled="isPullAnimating" @click="emit('restart')">
				<svg viewBox="0 0 20 20" aria-hidden="true">
					<path d="M15.5 7A6 6 0 1 0 16 12M15.5 7V2m0 5h-5" />
				</svg>
				{{ session.phase === "WON" ? "Play again" : "Reset room" }}
			</button>
		</div>
	</div>
</template>
