# Tether engine implementation plan

## Scope

Build a deterministic, headless TypeScript engine from `design-draft.md`. The engine owns level validation, board queries, pull resolution, session transitions, undo/reset/progress, and the offline shortest-path analysis. Rendering, animation timing, storage adapters, hints, content mining, and the design document's open rules are excluded.

## Design

- Keep immutable level data and pure state transitions. Position keys are derived values, not object identity.
- Keep the rules in three cohesive layers:
  1. `model` parses authored levels and defines trusted domain values.
  2. `board` and `pull` derive reachability, wins, legal pulls, and successor states.
  3. `session` applies player commands and phase transitions; `solver` performs canonical BFS using the same pull resolver.
- Represent pull, command, validation, and solver outcomes with discriminated unions so every result is handled explicitly.
- Copy state and box collections at transition boundaries. Level data and history snapshots never share mutable collections with returned states.
- Keep progress outside undo history and key it only by the stable level revision ID.

## Invariants

- Levels are 8×8 and contain one player, exactly three distinct boxes, and distinct in-bounds pillars with no entity overlaps.
- Walking is orthogonal reachability over floor, free, and never adds history.
- A tether ray stops at the first pillar or box. A legal pull moves the first visible non-adjacent box to the tile beside the player and increments the counter once.
- Illegal pulls preserve state, history, and score and distinguish `NO_TARGET`, `BLOCKED`, and `ADJACENT`.
- Evaluation checks an L-tromino win before the local no-pulls advisory.
- Undo restores the complete pre-pull snapshot, including the firing position and pull count. Reset/replay/new-level entry clear history but preserve progress.
- Solver state identity is sorted box positions plus the minimum tile in the player's current reachable component. Exact player position and pull count are excluded.
- Solver successors retain the actual reachable firing tile and direction so returned solutions replay through legal walks and pulls.

## Red/green slices and commits

1. **Validated model and board geometry**
   - Red: authored-level rejection and obstacle-aware flood-fill tests.
   - Green: trusted level creation, position helpers, occupancy, and reachability.
2. **Pull and terminal rules**
   - Red: resolver precedence, endpoint, immutable application, L detection, and no-pulls tests.
   - Green: shared resolver and derived rule queries.
3. **Session state machine**
   - Red: animation locks/completion, free walking, pull-only history, undo/reset, win precedence, and best-score tests.
   - Green: pure session commands and lifecycle transitions.
4. **Canonical solver and graph analysis**
   - Red: region-equivalent keys, replayable shortest solution, initial win, unsolvable level, optimal count, and dead-state analysis tests.
   - Green: canonical successors, BFS solve, and full graph analysis.
5. **Integration witness**
   - Red: the documented enclosure's losing and winning sequences.
   - Green: any correction required for the complete engine path; otherwise the test records the executable design witness.

Each red test is run before its implementation. Each slice is committed only after its targeted tests and typecheck pass.

## Final verification

Run formatting, repository checks, typecheck, the full test suite, mutation testing, and a throwaway script that replays the documented winning enclosure sequence through the public engine API.
