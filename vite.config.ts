import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";

const cleanDesignUrl: Plugin = {
	name: "clean-design-url",
	configureServer(server) {
		server.middlewares.use((request, _response, next) => {
			const [pathname, search] = request.url?.split("?", 2) ?? [];
			if (pathname === "/design") {
				request.url = `/design/index.html${search ? `?${search}` : ""}`;
			}
			next();
		});
	},
};

export default defineConfig(({ command }) => ({
	base: command === "build" ? "/tether/" : "/",
	plugins: [vue(), cleanDesignUrl],
}));
