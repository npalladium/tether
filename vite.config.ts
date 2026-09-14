import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
	base: command === "build" ? "/tether/" : "/",
	plugins: [vue()],
}));
