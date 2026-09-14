import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import App from "./App.vue";
import { findSolutions } from "./assistance/client";
import type { SolutionResult } from "./assistance/types";

vi.mock("./assistance/client", () => ({ findSolutions: vi.fn() }));

const firstRoomResult: SolutionResult = {
	kind: "SOLUTIONS",
	minimumPulls: 1,
	solutions: [
		[
			{
				firing: { x: 0, y: 1 },
				direction: "E",
				target: { x: 7, y: 1 },
				destination: { x: 1, y: 1 },
			},
		],
	],
};

let wrapper: VueWrapper;

function button(label: string) {
	const match = wrapper
		.findAll("button")
		.find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`Missing button: ${label}`);
	return match;
}

beforeEach(async () => {
	vi.mocked(findSolutions).mockReset().mockResolvedValue(firstRoomResult);
	window.localStorage.clear();
	wrapper = mount(App, { attachTo: document.body });
	await wrapper.get(".start-button").trigger("click");
});

afterEach(() => {
	wrapper.unmount();
	document.body.replaceChildren();
});

describe("on-demand assistance", () => {
	it("reveals hints progressively and preserves the room when dismissed", async () => {
		await wrapper
			.get('button[aria-label^="Select box at column 8, row 2"]')
			.trigger("click");
		const roomBefore = wrapper.get("#game .board").text();
		await button("Hint").trigger("click");
		await flushPromises();
		expect(wrapper.findAll(".hint-card")).toHaveLength(1);
		expect(wrapper.find(".exact-hint-preview").exists()).toBe(false);
		expect(wrapper.find(".walkthrough-content").exists()).toBe(false);
		await button("Show stronger hint").trigger("click");
		expect(wrapper.findAll(".hint-card")).toHaveLength(2);
		expect(wrapper.find(".exact-hint-preview").exists()).toBe(false);
		await button("Show stronger hint").trigger("click");
		expect(wrapper.findAll(".hint-card")).toHaveLength(3);
		expect(wrapper.find(".exact-hint-preview").exists()).toBe(true);
		expect(
			(await axe.run(wrapper.get('[role="dialog"]').element)).violations,
		).toEqual([]);

		window.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		await nextTick();
		expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
		expect(document.activeElement).toBe(button("Hint").element);
		expect(wrapper.get("#game .board").text()).toBe(roomBefore);
		expect(wrapper.find(".pull-confirm").exists()).toBe(true);
	});

	it("shows the final solution without completing or scoring the live room", async () => {
		const roomBefore = wrapper.get("#game .board").text();
		await button("Show solution").trigger("click");
		await flushPromises();
		await button("Final").trigger("click");
		expect(wrapper.get(".walkthrough-state").text()).toBe("Final position");
		expect(wrapper.get(".walkthrough-content .board").text()).toContain(
			"Column 2, row 2: box",
		);
		await button("Back to the room").trigger("click");
		expect(wrapper.get("#game .board").text()).toBe(roomBefore);
		expect(wrapper.get(".status-copy").text()).not.toContain("L complete");
		expect(
			window.localStorage.getItem("tether:first-connection-v1:best-pulls"),
		).toBeNull();
	});

	it("ignores a completed search after closing and requesting help elsewhere", async () => {
		let completeOldRequest: (result: SolutionResult) => void = () => {
			throw new Error("No pending request");
		};
		vi.mocked(findSolutions).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					completeOldRequest = resolve;
				}),
		);
		await button("Hint").trigger("click");
		await button("Back to the room").trigger("click");
		await wrapper.get(".level-select select").setValue("turning-room-v1");
		vi.mocked(findSolutions).mockRejectedValueOnce(
			new Error("Worker unavailable"),
		);
		await button("Hint").trigger("click");
		await flushPromises();
		completeOldRequest(firstRoomResult);
		await flushPromises();
		expect(wrapper.get(".assistance-error").text()).toContain(
			"Worker unavailable",
		);
		expect(wrapper.find(".hint-card").exists()).toBe(false);
		expect(wrapper.find(".walkthrough-content").exists()).toBe(false);
		expect(wrapper.get("#level-title").text()).toBe("Turning room");
	});
});
