# Tether review findings — 2026-09-13

Review of the full repo (engine, CLI, Vue UI, design docs) at commit `80e1a0e`.

**Baseline at review time (all green):** `pnpm typecheck`, `pnpm test` (37 tests,
7 files), `pnpm check` (biome, 27 files). Every item below is additive work; none
of it is a regression from a previously passing state.

Checkboxes are unstarted unless noted. Items are grouped by kind and ordered
roughly by value within each group.

---

## A. Bugs

- [x] **A1 — Enter/Space cannot confirm a pull in Safari.**
  `src/App.vue:393` gates pull confirmation on
  `document.activeElement.classList.contains("box-target")`. macOS Safari does
  not focus a `<button>` on click, so after clicking a box the status line reads
  "Press Pull, Enter, or Space" while none of Enter/Space do anything. Chrome and
  Firefox focus on click, so this is browser-dependent and easy to miss.
  *Fix:* gate on `selectedDirection.value` being set, and explicitly exclude the
  case where another interactive control (Undo / Reset / guide buttons) holds
  focus, so their native Enter/Space activation still works.
  *Verify:* unit test with `@vue/test-utils` that dispatches `click` on a
  `.box-target` without focusing it, then a `keydown` of `Enter`, and asserts
  `session.state.pulls` incremented.

- [x] **A2 — Walk inputs are silently dropped.**
  Two causes in `src/App.vue`: `handleKeydown` returns early on `event.repeat`
  (line 340), so holding an arrow key never repeats; and `walkTo` returns early
  unless `phase === "READY"` (line 243), so the second of two quick taps is eaten
  by the 260ms `WALKING` lock. Design draft §1.6 says walking is free; it does
  not feel free.
  *Fix:* nothing about board state changes during a walk, so prefer dropping the
  settle lock for walking entirely (keep it for `SLIDING`). If the lock is kept
  for visual reasons, queue the pending direction and apply it when the walk
  settles.
  *Verify:* test that two `ArrowRight` keydowns dispatched in the same tick move
  the player two tiles.

- [x] **A3 — A personal best can be lost.**
  The win is only committed by `completeAnimation` inside the settle timeout
  (`src/App.vue:220`), which also calls `saveBestPulls`. `onBeforeUnmount` clears
  that timer, so winning and closing the tab within 260ms never persists the
  best.
  *Fix:* commit the session transition (and persist the best) when the pull
  resolves; let the animation be purely cosmetic and let the timeout only release
  the input lock.
  *Verify:* test that unmounting immediately after a winning pull still writes
  `tether:<id>:best-pulls` to localStorage.

- [x] **A4 — `walk` to your own tile is accepted.**
  The engine now rejects a destination equal to the player's current position
  with `ALREADY_THERE` before checking the reachable region. Both frontends
  consume that single engine rule: the CLI reports "You are already on that
  tile", while the board omits the current tile from its walk controls.
  Engine and CLI regression tests assert that the original session remains
  unchanged and never enters a walking/settling cycle.

- [x] **A5 — `NO_PULLS` locks walking.**
  `walk` requires `phase === "READY"` (`src/game/session.ts:51`), while the
  earlier wording in design draft §1.5 said walking "may still be possible".
  Floor tiles can remain geometrically reachable, but the terminal
  `NO_PULLS` phase intentionally disables walking: `hasNoLegalPulls` already
  enumerates every firing position in the player's reachable region, and
  repositioning within that same region cannot change the available pulls.
  The advisory now distinguishes recovery with history from a level that starts
  dead: undo is available only when history is non-empty; restart is always
  available.
  *Resolution:* keep the existing terminal engine behavior and amend §1.5 and
  the state-machine section to document that walking is disabled in `NO_PULLS`.
  Do not mark any other finding complete as part of this decision.

- [x] **A6 — Focus alone mutates selection and spams the live region.**
  `@focus="selectPull(selection.direction)"` (`src/App.vue:694`) means tabbing
  across boxes rewrites `announcement`, which sits in an `aria-live="polite"`
  region. Screen-reader users get a full selection announcement for traversal
  they did not intend.
  *Fix:* select on click/Enter only, or keep focus-select but suppress the live
  announcement when the change came from focus rather than an explicit choice.

- [x] **A7 — Board is invisible to assistive tech and half-accessible by keyboard.**
  Every board cell is an `aria-hidden` clickable `<div>` (`src/App.vue:625`).
  Consequences: screen-reader users get no board model at all, only the status
  line; keyboard users can step one tile at a time while mouse users can walk
  anywhere in the flood-fill region in one action; and there is no pull key
  whatsoever — reaching a box requires Tab.
  *Fix:* make reachable cells real focusable controls (or give the board a grid
  role with proper cell semantics), and add direct pull keys so a keyboard player
  has parity with a mouse player. This is the largest single piece of work in the
  list; consider scoping it as its own plan doc.

---

## B. Design and spec gaps

Measured by exhausting the reachable state graph of `defaultLevel` with the
engine itself, using the region-based equivalence described in design draft
§1.10 (box positions plus the player's reachable region, not the exact walking
tile). Script was scratch-only; re-derive before citing these numbers elsewhere.

| Metric | Value |
|---|---|
| Reachable states | 10,500 |
| Par | 3 |
| Winning states | 98 |
| Optimal winning states / optimal routes | 5 / 6 |
| No-legal-pull states | 41 |
| States with no reachable win | 43 (dead-state fraction 0.4%) |

- [ ] **B1 — The shipped level misses two of its own authoring targets.**
  Par 3 sits inside the 3–6 band from §1.10, but 6 optimal routes is double the
  "at most three optimal solutions" search parameter. More importantly the
  board's headline lesson — the verified enclosure — is a 0.4% event: a player
  essentially has to be aiming for the trap to find it.
  Both `docs/tether-puzzle-gift-evaluation.md` (§"The current enclosure board is
  a questionable introduction") and the practices doc already suspect this board
  is the wrong introduction; the dead-state fraction is the evidence.
  *Action:* author a simpler level 1 per the role table in the evaluation doc
  ("An invitation": one satisfying pull completes an L) and move the enclosure
  board to the sequencing slot. Requires multi-level support, which does not
  exist yet — `src/level.ts` exports a single `defaultLevel`.

- [ ] **B2 — `par` is dead weight.**
  Modelled in `LevelDefinition` and `Level` (`src/game/model.ts:15,26`), threaded
  through `parseLevel` (line 97), set by nothing and read by nothing, while §1.7
  says to show par / current / best when par is available.
  *Action:* either set `par: 3` on `defaultLevel` and display it unobtrusively
  (heeding the gift doc's warning that a prominent par turns "I solved it" into
  "I solved it badly"), or delete the field from both types. Do not leave it
  half-wired.

- [x] **B3 — CLI prints a raw phase for the dead-end advisory.**
  `renderSession` now follows `Phase: NO_PULLS` with recovery guidance. It offers
  undo plus reset when history exists, and reset alone when the level has no undo
  history.

---

## C. Simplification and duplication

- [x] **C1 — `App.vue` reimplements four engine functions** because the barrel
  does not export them: `deltaByDirection` (duplicate of `src/game/pull.ts:26`),
  `positionKey` and `isAt` (duplicates of `positionKey` / `samePosition` in
  `src/game/board.ts`), and `isOccupied` (duplicate of `src/game/board.ts:15`).
  *Fix:* export them from `src/game/index.ts` and delete roughly 20 lines from
  the UI. Keeps the geometry rules single-sourced.

- [x] **C2 — `reset` and `replay` are the same function.**
  The engine now exposes one `restart(session)` operation for `READY`,
  `NO_PULLS`, and `WON`. It remains locked during animation phases, and both
  frontends call it without phase-dependent ternaries.

- [x] **C3 — Small single-sourcing leaks in the engine.**
  `parseLevel` now reuses `positionKey`; level dimensions derive from
  `typeof BOARD_SIZE`; and `BOX_COUNT` is the single box-cardinality constant
  used by parsing, win detection, and their tests.

- [x] **C4 — `applyResolvedPull` is exported from the barrel.**
  The public barrel no longer exposes `applyResolvedPull`. It remains local to
  the pull module for the session implementation and focused module tests;
  previews continue to use public `resolvePull`.

---

## D. Tests

- [x] **D1 — `src/App.vue` has zero tests.**
  The UI now has `src/App.test.ts` running under Happy DOM with
  `@vue/test-utils` and `axe-core`. It covers A1 click-then-Enter confirmation,
  A2 rapid walking, A3 unmount-after-win persistence, guide focus trapping,
  reduced-motion zero-delay settling, and axe checks for the entry and active game
  screens.

- [x] **D2 — Push fast-check into engine invariants.**
  `src/game/invariants.test.ts` generates legal levels and pull sequences through
  the public engine API. It checks box cardinality and distinctness, monotonic
  pull counts, exact undo restoration including the firing position, and the
  2×2 bounding-box invariant for reached wins.

- [x] **D3 — Consider running the mutation suite as a gate.**
  Mutation is now scoped to `src/game/**` and runs only `src/game` tests; UI and
  CLI tests are excluded. The measured run instrumented 328 engine mutants:
  82 were killed by assertions, 246 timed out, and none survived. Stryker reports
  100%, but the 75% timeout rate makes that score unsuitable as a quality gate.
  Keep `break: 60` unchanged and do not gate on mutation testing until the
  command-runner timeout behavior is made trustworthy.

---

## Remaining order

1. B2 — decide whether and how the optional par is presented.
2. B1 — add a short level sequence and author a simpler opening level as a
   separate product-sized change.
