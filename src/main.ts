import "./style.css";
import { BOARD_SIZE } from "./game/board";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
	throw new Error("App root is missing");
}

app.innerHTML = `
  <section class="hero">
    <p class="eyebrow">Grid puzzle prototype</p>
    <h1>Tether</h1>
    <p class="summary">
      Pull three boxes across an ${BOARD_SIZE} × ${BOARD_SIZE} room and arrange
      them into an L.
    </p>
    <p class="status">Tooling is ready. The board comes next.</p>
  </section>
`;
