# Tether engine implementation plan

## Scope

Build a deterministic, headless TypeScript engine for playing one authored level from `design-draft.md`. The engine owns level validation, board queries, pull resolution, session transitions, undo, reset/replay, and the current level's best score. Level selection/progression, rendering, animation timing, storage adapters, solvers, graph analysis, hints, content mining, and the design document's open rules are excluded.

## Design

- Keep the single loaded level immutable and use pure state transitions. Position keys are derived values, not object identity.
- Keep the rules in three cohesive layers:
  1. `model` parses the authored level and defines trusted domain values.
  2. `board` and `pull` derive reachability, wins, and legal pulls.
  3. `session` applies player commands and phase transitions for that level.
- Represent pull, command, and validation outcomes with discriminated unions so every result is handled explicitly.
- Copy state and box collections at transition boundaries. Level data and history snapshots never share mutable collections with returned states.
- Keep the current level's best score outside undo history. Persistence remains an adapter concern.

## Invariants

- Levels are 8×8 and contain one player, exactly three distinct boxes, and distinct in-bounds pillars with no entity overlaps.
- Walking is orthogonal reachability over floor, free, and never adds history.
- A tether ray stops at the first pillar or box. A legal pull moves the first visible non-adjacent box to the tile beside the player and increments the counter once.
- Illegal pulls preserve state, history, and score and distinguish `NO_TARGET`, `BLOCKED`, and `ADJACENT`.
- Evaluation checks an L-tromino win before the local no-pulls advisory.
- Undo restores the complete pre-pull snapshot, including the firing position and pull count. Reset and replay clear history but preserve the best score.

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
4. **Integration witness**
   - Red: the documented enclosure's losing and winning sequences.
   - Green: any correction required for the complete engine path; otherwise the test records the executable design witness.

Each red test is run before its implementation. Each slice is committed only after its targeted tests and typecheck pass.

## Final verification

Run formatting, repository checks, typecheck, the full test suite, mutation testing, and a throwaway script that replays the documented winning enclosure sequence through the public engine API.
