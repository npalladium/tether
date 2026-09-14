# Phone-first direct tether controls

## Scope

Explore controls in the `controls-phone-first` worktree, preserving the current main checkout and its uncommitted assistance/UI changes. No commits or deployment are part of this experiment.

## Interaction contract

- Reachable floor activation walks freely and clears the selected pull.
- First activation of a legal box previews its exact fixed endpoint. A second activation of that same box commits the pull without a timing requirement.
- Selected boxes visibly offer Pull. A stable large Pull/Cancel row remains available, including on narrow phones. Selection must not move the board.
- Arrows/WASD walk. Hold Space to display legal pulls; press a direction toward a box to execute one pull per Space hold. Release Space to leave aiming. Repeated keydowns cannot repeat a pull or become walking after it.
- Enter confirms a selected box. Escape cancels. Z undoes. Ordinary controls keep native keyboard operation. Blur, hidden document, modal entry, room changes, and focus outside the board cancel held aiming.
- The first-visible cardinal resolver and fixed adjacent stop remain unchanged. No auto-walking, arbitrary stop choice, drag requirement, hover requirement, or timed double-tap.
- Assistance boards remain read-only; tutorial progress and room scores remain isolated.
- Teaching follows the primary pointer capability: coarse pointers receive touch-first copy; fine pointers receive keyboard-and-mouse copy. The in-game guide always exposes Touch, Keyboard & mouse, and All controls views, and an explicit view choice is not overwritten if capabilities change.
- The guided tutorial must teach the recommended controls in context: movement at the starting step, aiming/selection at the firing tile, and confirmation after preview. A visible control cue changes with tutorial state and input mode.

## Ownership

- Main: App.vue input/state integration, behavioral regression coverage, documentation, final validation.
- PhoneControls subagent: GameBoard.vue, GameControls.vue, GuideDialog.vue, style.css. No concurrent validation commands.

## Verification

Use the actual Vite app with touch emulation at 320x568, 360x640, 390x844 and phone landscape, plus a desktop viewport. Confirm first tap does not increment score; second tap pulls once; switching targets only switches preview; walking/cancel clear selection without pulling; fallback Pull and Undo work; selection does not shift board; no horizontal overflow; controls remain reachable by normal scrolling. Exercise tutorial and read-only assistance. Test reduced motion and ordinary animation.

Exercise keyboard aiming, legal and illegal directions, repeat suppression across animation completion, release, blur/modal/focus cancellation, and native buttons. Run pnpm test, pnpm check, and pnpm build after all edits settle. Report touch emulation as such, not as physical iOS/Android validation.
