# Tether CLI implementation plan

## Scope

Add a second, Node-based entrypoint that starts a playable ASCII session for one bundled level. Stricli owns application routing and help output. The existing browser entrypoint and game engine remain unchanged.

The CLI supports `walk x y`, `pull N|E|S|W`, `undo`, `reset`, `help`, and `quit`. It completes accepted walking and pulling animations immediately because a line-oriented interface has no animation timeline. `reset` restarts the attempt from any stable phase, using the engine's `replay` transition after a win.

## Design

- Build a single Stricli command application named `tether`; running it without positional arguments starts the game.
- Keep terminal I/O behind a narrow injected interface. The production adapter uses Node readline; tests use scripted input and captured output.
- Keep command parsing, board rendering, and the play loop in one cohesive CLI module. Route every state change through the public exports from `src/game/index.ts`.
- Bundle the verified enclosure from `design-draft.md` as the initial playable level.
- Render zero-based x/y coordinates and use `@`, `B`, `#`, and `.` for player, box, pillar, and floor.
- Report rejected actions with their engine reason and render the resulting phase, successful pull count, and best score.

## Red/green slices

1. Add failing behavior tests for ASCII rendering, accepted/rejected commands, undo/reset, help/quit, and a scripted three-pull win.
2. Implement the pure renderer, command executor, and injected asynchronous play loop.
3. Add a failing Stricli integration test that runs the application with scripted terminal context.
4. Add the Stricli application and Node process entrypoint, then expose it as `pnpm cli`.

## Verification

Run the focused CLI tests, repository formatter/checker, typecheck, full tests, production browser build, Stricli help, and a piped CLI session that reaches `WON` in three pulls.
