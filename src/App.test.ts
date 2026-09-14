import { mount, type VueWrapper } from "@vue/test-utils";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import App from "./App.vue";

const bestPullsStorageKey = "tether:first-connection-v1:best-pulls";

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
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			value: vi.fn().mockReturnValue({ matches: true }),
		});
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
	});

	it("traps focus inside the guide and restores it to its trigger", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		const guideButton = wrapper.get(".guide-button");

		await guideButton.trigger("click");
		const closeButton = wrapper.get(".guide-close");
		const returnButton = wrapper.get(".guide-return");
		expect(document.activeElement).toBe(closeButton.element);

		await closeButton.trigger("keydown", { key: "Tab" });
		expect(document.activeElement).toBe(returnButton.element);

		await keydown("Escape");
		expect(wrapper.find(".guide-panel").exists()).toBe(false);
		expect(document.activeElement).toBe(guideButton.element);
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

		expect(wrapper.find(".pull-confirm").exists()).toBe(false);
		expect(wrapper.get(".status-copy").text()).not.toContain("Box selected");
	});

	it("offers keyboard equivalents for selecting a visible pull and walking floor", async () => {
		const wrapper = mountApp();
		await enterGame(wrapper);
		await wrapper
			.get('button[aria-label="Walk to column 2, row 3"]')
			.trigger("click");

		await keydown("ArrowUp", { shiftKey: true });

		expect(
			wrapper.find('button[aria-label="Walk to column 1, row 3"]').exists(),
		).toBe(true);
		expect(wrapper.find(".pull-confirm").exists()).toBe(true);
	});

	it("persists a winning best before a pending pull animation can be unmounted", async () => {
		vi.useFakeTimers();
		const wrapper = mountApp();
		await enterGame(wrapper);

		await selectAndPull(wrapper, /Select box at column 8, row 2/);
		wrapper.unmount();

		expect(window.localStorage.getItem(bestPullsStorageKey)).toBe("1");
	});
});
