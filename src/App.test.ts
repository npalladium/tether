import { mount, type VueWrapper } from "@vue/test-utils";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import App from "./App.vue";

const bestPullsStorageKey = "tether:first-connection-v1:best-pulls";

let pointerChangeListener: ((event: MediaQueryListEvent) => void) | undefined;

function mockMedia(coarsePointer: boolean): void {
	pointerChangeListener = undefined;
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn((query: string) => ({
			matches: query === "(pointer: coarse)" ? coarsePointer : true,
			addEventListener: (
				event: string,
				listener: (change: MediaQueryListEvent) => void,
			) => {
				if (query === "(pointer: coarse)" && event === "change") {
					pointerChangeListener = listener;
				}
			},
			removeEventListener: vi.fn(),
		})),
	});
}

async function changePointerMode(coarsePointer: boolean): Promise<void> {
	pointerChangeListener?.({ matches: coarsePointer } as MediaQueryListEvent);
	await nextTick();
}

function mountApp(): VueWrapper {
	return mount(App, { attachTo: document.body });
}

async function enterGame(wrapper: VueWrapper): Promise<void> {
	await wrapper.get(".start-button").trigger("click");
	await nextTick();
}

async function keydown(
	key: string,
	options: KeyboardEventInit = {},
): Promise<void> {
	window.dispatchEvent(
		new KeyboardEvent("keydown", { key, bubbles: true, ...options }),
	);
	await nextTick();
}

async function keyup(
	key: string,
	options: KeyboardEventInit = {},
): Promise<void> {
	window.dispatchEvent(
		new KeyboardEvent("keyup", { key, bubbles: true, ...options }),
	);
	await nextTick();
}

async function selectAndPull(
	wrapper: VueWrapper,
	target: RegExp,
): Promise<void> {
	await wrapper.get(`[aria-label*="${target.source}"]`).trigger("click");
	await keydown("Enter");
}

describe("Tether application", () => {
	beforeEach(() => {
		window.localStorage.clear();
		mockMedia(true);
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.replaceChildren();
	});

	it("has no axe violations on the entry and active game screens", async () => {
		const wrapper = mountApp();

		expect((await axe.run(wrapper.element)).violations).toEqual([]);

		await enterGame(wrapper);

		expect((await axe.run(wrapper.element)).violations).toEqual([]);

		await wrapper.get(".guide-button").trigger("click");
		expect(
			(await axe.run(wrapper.get('[role="dialog"]').element)).violations,
		).toEqual([]);
	});

	it("traps focus inside the guide and restores it to its trigger", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		const guideButton = wrapper.get(".guide-button");

		await guideButton.trigger("click");
		const closeButton = wrapper.get(".guide-close");
		const touchTab = wrapper.findAll(".guide-mode-tabs button")[0];
		expect(document.activeElement).toBe(closeButton.element);

		await closeButton.trigger("keydown", { key: "Tab" });
		expect(document.activeElement).toBe(touchTab?.element);

		await keydown("Escape");
		expect(wrapper.find(".guide-panel").exists()).toBe(false);
		expect(document.activeElement).toBe(guideButton.element);
	});

	it("adapts teaching to touch and lets the player reveal every control", async () => {
		const wrapper = mountApp();
		expect(wrapper.get(".entry-controls").text()).toContain("Tap dotted floor");
		expect(wrapper.get(".entry-controls").text()).not.toContain("Hold Space");
		const goal = wrapper.get(".goal-orientations");
		expect(goal.attributes("aria-label")).toContain("four rotations");
		expect(goal.findAll(".mini-l")).toHaveLength(4);
		await enterGame(wrapper);
		await wrapper.get(".guide-button").trigger("click");

		expect(wrapper.find("#touch-controls-title").exists()).toBe(true);
		expect(wrapper.find("#keyboard-controls-title").exists()).toBe(false);
		expect(wrapper.get(".guide-goal-note").text()).toContain(
			"any of the four directions",
		);
		await wrapper
			.findAll(".guide-mode-tabs button")
			.find((button) => button.text().includes("All controls"))
			?.trigger("click");

		expect(wrapper.find("#touch-controls-title").exists()).toBe(true);
		expect(wrapper.find("#keyboard-controls-title").exists()).toBe(true);
		expect(wrapper.get(".guide-common-controls").text()).toContain(
			"Show solution",
		);
		await changePointerMode(false);
		expect(wrapper.find("#touch-controls-title").exists()).toBe(true);
		expect(wrapper.find("#keyboard-controls-title").exists()).toBe(true);
	});

	it("adapts teaching to keyboard and mouse devices", async () => {
		mockMedia(false);
		const wrapper = mountApp();
		expect(wrapper.get(".entry-controls").text()).toContain("Hold Space");
		expect(wrapper.get(".entry-controls").text()).not.toContain(
			"Tap dotted floor",
		);
		await enterGame(wrapper);
		await wrapper.get(".guide-button").trigger("click");

		expect(wrapper.find("#touch-controls-title").exists()).toBe(false);
		expect(wrapper.find("#keyboard-controls-title").exists()).toBe(true);
		expect(wrapper.get(".guide-shortcuts").text()).toContain("Escape");
	});

	it("confirms a selected pull when Safari leaves the clicked box unfocused", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		await wrapper
			.get('button[aria-label="Walk to column 2, row 3"]')
			.trigger("click");
		const target = wrapper.get(
			'button[aria-label^="Select box at column 2, row 1"]',
		);

		await target.trigger("click");
		expect(document.activeElement).not.toBe(target.element);
		await keydown("Enter");

		expect(wrapper.get(".scoreboard").text()).toContain("1");
	});

	it("applies rapid walking keydowns without an animation lock", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);

		await keydown("ArrowDown");
		await keydown("ArrowDown");

		expect(wrapper.get(".status-copy").text()).toContain("column 1, row 4");
	});

	it("does not select a box or announce it when its control receives focus", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		await wrapper
			.get('button[aria-label="Walk to column 2, row 3"]')
			.trigger("click");

		await wrapper
			.get('button[aria-label^="Select box at column 2, row 1"]')
			.trigger("focus");

		expect(wrapper.get(".pull-confirm").attributes("disabled")).toBeDefined();
		expect(wrapper.get(".status-copy").text()).not.toContain("Box selected");
	});

	it("uses a held Space direction for one pull without repeat walking", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);

		await keydown(" ");
		await keydown("ArrowRight");
		await keydown("ArrowRight", { repeat: true });
		await keyup(" ");
		await keydown("ArrowRight");

		expect(wrapper.get(".scoreboard").text()).toContain("1");
	});

	it("pulls after a second activation of the selected box", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		const target = wrapper.get(
			'button[aria-label^="Select box at column 8, row 2"]',
		);

		await target.trigger("click");
		await target.trigger("click");

		expect(wrapper.get(".scoreboard").text()).toContain("1");
	});

	it("persists a winning best before a pending pull animation can be unmounted", async () => {
		vi.useFakeTimers();
		const wrapper = mountApp();
		await enterGame(wrapper);

		await selectAndPull(wrapper, /Select box at column 8, row 2/);
		wrapper.unmount();

		expect(window.localStorage.getItem(bestPullsStorageKey)).toBe("1");
	});

	it("completes the guided tutorial without scoring it as a room", async () => {
		const wrapper = mountApp();
		await wrapper.get(".tutorial-button").trigger("click");
		expect(wrapper.get(".tutorial-control-cue").text()).toContain(
			"Tap the glowing floor tile",
		);
		await wrapper
			.get('button[aria-label*="Tutorial firing tile"]')
			.trigger("click");
		expect(wrapper.get(".tutorial-control-cue").text()).toContain(
			"Tap the box marked Tap",
		);
		await wrapper
			.get('button[aria-label^="Select box at column 7, row 4"]')
			.trigger("click");
		expect(wrapper.get(".tutorial-control-cue").text()).toContain(
			"Tap the selected box again",
		);
		await wrapper.get(".pull-confirm").trigger("click");

		expect(wrapper.get(".tutorial-guide").text()).toContain("L complete");
		expect(wrapper.get(".tutorial-guide").text()).toContain(
			"Any rotation of the L counts",
		);
		expect(
			window.localStorage.getItem("tether:guided-first-pull-v1:best-pulls"),
		).toBeNull();

		await vi.waitFor(() => {
			expect(
				wrapper
					.get(".tutorial-actions button:last-child")
					.attributes("disabled"),
			).toBeUndefined();
		});

		await wrapper.get(".tutorial-actions button:last-child").trigger("click");
		expect(wrapper.get("#level-title").text()).toContain("First connection");
	});

	it("teaches and accepts the keyboard tutorial controls", async () => {
		mockMedia(false);
		const wrapper = mountApp();
		await wrapper.get(".tutorial-button").trigger("click");
		expect(wrapper.get(".tutorial-control-cue").text()).toContain(
			"Arrow keys or W A S D",
		);

		await keydown("ArrowDown");
		expect(wrapper.get(".tutorial-control-cue").text()).toContain(
			"Hold Space + Right Arrow or D",
		);
		await keydown(" ");
		await keydown("ArrowRight");
		await keyup(" ");

		expect(wrapper.get(".tutorial-guide").text()).toContain("L complete");
		expect(wrapper.get(".tutorial-guide").text()).toContain(
			"Any rotation of the L counts",
		);
	});

	it("reveals optimal pulls only for rooms the player chooses", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		const disclosure = wrapper.get(".optimal-pulls");

		expect(disclosure.attributes("aria-pressed")).toBe("false");
		expect(disclosure.get("strong").text()).toBe("?");
		await disclosure.trigger("click");
		expect(disclosure.attributes("aria-pressed")).toBe("true");
		expect(disclosure.get("strong").text()).toBe("1");

		await wrapper.get(".level-select select").setValue("screening-line-v1");
		const nextDisclosure = wrapper.get(".optimal-pulls");
		expect(nextDisclosure.attributes("aria-pressed")).toBe("false");
		expect(nextDisclosure.get("strong").text()).toBe("?");
		await nextDisclosure.trigger("click");
		expect(nextDisclosure.get("strong").text()).toBe("4");

		await wrapper.get(".level-select select").setValue("first-connection-v1");
		expect(wrapper.get(".optimal-pulls").attributes("aria-pressed")).toBe(
			"true",
		);
		expect(wrapper.get(".optimal-pulls strong").text()).toBe("1");
	});

	it("preserves room state across tutorials and level changes", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		await wrapper
			.get('button[aria-label^="Select box at column 8, row 2"]')
			.trigger("click");

		await wrapper.get(".tutorial-exit").trigger("click");
		await wrapper.get(".tutorial-exit").trigger("click");
		expect(wrapper.find(".pull-confirm").exists()).toBe(true);

		await wrapper.get(".level-select select").setValue("screening-line-v1");
		expect(wrapper.get("#level-title").text()).toContain("Screening line");
		await wrapper.get(".level-select select").setValue("first-connection-v1");
		expect(wrapper.find(".pull-confirm").exists()).toBe(true);
	});
});
