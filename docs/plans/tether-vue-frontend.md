# Tether Vue frontend implementation plan

## Scope

Replace the static browser placeholder with a responsive, playable Vue interface for the existing verified-enclosure level. Preserve the headless engine and CLI. Level progression and new level design remain outside this change.

## Player experience

- Begin with a dedicated entry screen that explains the goal and both pointer and keyboard controls before play.
- Show the 8×8 room, three boxes, opaque pillar, player, pull count, and best score without requiring coordinate commands.
- Let pointer users select any reachable floor tile and use a prominent four-direction tether control.
- Let keyboard users walk with arrows or WASD and pull with Shift plus the same direction; expose undo, reset, and help shortcuts.
- Keep in-game help in place over the active room and restore focus to its trigger when dismissed.
- Preview the immediate target and endpoint of a hovered or focused pull direction while leaving future planning to the player.
- Keep the board, status, and pull controls together in the initial desktop viewport; use a compact gameplay header and controls for tablet and mobile.
- Explain the pull-to-player rule and L goal in both onboarding and the persistent game interface.
- Treat undo as normal experimentation, explain rejected pulls, and give explicit recovery actions after a no-pulls state.
- Celebrate any completed L before inviting score refinement.

## Structure

- Use a Vue single-file component as the browser application.
- Keep the bundled level in a shared browser-safe module used by both Vue and the CLI.
- Route every game transition through the existing public engine API.
- Store the best score for the current level in local storage as a frontend adapter; malformed or unavailable storage must not prevent play.
- Use CSS Grid for board cells and positioned pieces so engine transitions can animate without changing game semantics.

## Verification

Run TypeScript checking for the engine and entrypoint, repository checks, the engine and CLI tests, and a production build through Vue's Vite compiler. Launch the Vite app and use the browser to exercise onboarding, the in-place help dialog, pointer controls, keyboard walking and pulling, a rejected pull, undo, the documented enclosure, reset, a complete three-pull win, and desktop/tablet/mobile presentation without hidden primary controls. `vue-tsc` is not used because its current release imports a TypeScript compiler subpath that TypeScript 7 no longer exports.