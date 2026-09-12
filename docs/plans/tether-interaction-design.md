# Tether interaction design review

Date: 2026-09-13

Status: Proposal 1, **select a box, preview, confirm**, is implemented in the Vue frontend. Proposals 2 and 3 remain documented alternatives, not shipped controls. This review supplements the [existing frontend plan](tether-vue-frontend.md).

## Recommendation

Use **select a box, preview, confirm**, with a thin aiming laser for the selected box and a solid tether only during the committed pull animation.

The interaction should communicate two concepts: **floor moves you; selecting a box shows what you can bring beside you.** Walking already chooses the firing position. Do not introduce a separate firing-position selection step, automatic alignment, or destination selection.

The implementation removes the persistent compass and Shift-plus-direction command. It uses direct legal-box selection, an exact destination ghost, and one temporary Pull button.

## Implemented interaction

- Pointer/touch: click/tap dotted reachable floor to walk; click/tap a highlighted legal box to show its laser and ghost; click Pull to commit.
- Keyboard: arrows/WASD always walk and clear selection. Tab reaches legal boxes, focus previews them, Enter or Space commits, and Escape cancels.
- A preview uses the existing resolver result. It cannot select a box through a nearer box or pillar, choose a different endpoint, or move the player.
- On commit, the dashed laser becomes a solid tether while the box transition moves it to the fixed adjacent endpoint. The tether uses the same 260 ms transition path as the box; reduced-motion mode keeps static feedback and suppresses the travel transition.
- The headless engine, pull count, undo, reset, in-place help, and win/no-pulls behavior are unchanged.


## Current frontend: findings from play

The running Vue frontend was reviewed at 1440×1000, 768×1024, and 390×844. A three-pull solution was completed with keyboard controls and separately with touch-emulated taps. Pointer walking and hover previews, adjacent-box and pillar rejection, undo, and reset were exercised. Tablet touch walking and pulling were also exercised. Touch results are browser emulation, not physical-device usability testing.

Observed behavior:

- Before this implementation, clicking reachable dotted floor walked to that tile; arrows/WASD walked one tile; Shift plus a direction immediately pulled.
- The separate compass previews on hover/focus and commits on click. Touch taps have no separate inspection step before commitment.
- “Pull N” pulls a northern box south toward the player. The arrow names the sightline, but resembles a movement command.
- Box cells are disabled and box pieces are not pointer targets. The most salient objects cannot be selected directly.
- A legal preview outlines the target, draws a dashed player-to-box line, and outlines the adjacent stopping square. The preview is useful once revealed; a recognizable ghost box would make the endpoint less abstract.
- Board and controls fit the tested viewports without overflow. Mobile compass buttons measured approximately 34×34 CSS pixels, making them a weak basis for touch precision.
- Before this implementation, the current box/player position transition was 260 ms and the line was preview-only; it did not depict an attachment-and-retraction sequence.

The control confusion is consistent with these observations, but the relative usability of the proposals has not been established through novice testing.

Source anchors: [App.vue](../../src/App.vue) (`legalSelections`, `selectionPreview`, `engagedPull`, `walkTo`, `pullSelected`, `handleKeydown`, board and temporary Pull template); [style.css](../../src/style.css) (`.box-target`, `.box-ghost`, `.tether-preview`, `.pull-confirm`, reduced-motion media query); [pull.ts](../../src/game/pull.ts) (`resolvePull`); [session.ts](../../src/game/session.ts) (`walk`, `pull`, `undo`).

## Non-negotiable mechanics

All three alternatives preserve the [existing gameplay rules](../tether-gameplay-best-practices.md) through the current resolver:

- Walking is free and restricted to reachable floor. It never pulls automatically.
- A pull chooses one cardinal direction and targets only its first visible box. Selecting a box is a UI shorthand for that direction, not arbitrary object targeting.
- Pillars are opaque. Neither sightlines nor tethers pass through pillars or the first box to target something behind them.
- The box stops exactly one tile beside the stationary player, on the chosen ray. Neither gesture distance nor hold duration changes the endpoint.
- An adjacent box cannot move and cannot be skipped to reach a farther box. Invalid attempts cost no pull.
- Only a committed legal pull increments the count. Selecting, aiming, previewing, and cancelling do not.
- Undo restores the state before the last successful pull, including the player's firing position; walking does not add undo entries.

A preview shows the immediate legal result, not a recommended move, solution, or guarantee against a losing position. Ordinary undo, reset, and in-place help remain available; they need not become another instruction panel.

## Proposal 1: Select a box, then pull it

Mental model: **“Stand here. Bring that box beside me.”**

### 1. Exact interaction flow

1. Click/tap reachable floor to walk there for free.
2. From that position, give eligible boxes a subtle selectable outline. Only the first visible, non-adjacent box on each clear cardinal ray is eligible.
3. Click/tap one eligible box. Nothing moves; its exact pull is selected.
4. Inspect the laser, target outline, and adjacent ghost box. Activate the temporary **Pull** button beside the board.
5. Play the tether/pull animation, then clear selection and remove the temporary control.

Selecting another eligible box replaces the preview. Clicking ordinary floor cancels selection and walks there. Escape cancels without walking. Undo/reset clear selection. The destination ghost is visual only: floor clicks retain their walking meaning. Selecting an unaligned or blocked box never automatically repositions the player.

### 2. Walking versus pulling

Walking uses dotted floor and the circular player marker. Pulling uses a outlined box, a thin aiming laser, and a translucent box-shaped endpoint. Shape and line treatment distinguish the actions without depending solely on color.

The semantic boundary remains stable: floor means walk; box means preview; Pull means commit. There is no aiming mode that changes movement keys.

### 3. Target and destination preview

Outline the selected box and draw a thin laser from the player to its near face. Place a translucent copy of the box on the exact adjacent destination. Small inward chevrons along the travel segment distinguish the direction of box motion from the outward sightline. Keep the player unobscured and stationary.

Only one selected preview is strong at a time. If an invalid box is inspected, briefly show the relevant obstruction or alignment failure rather than making a farther box selectable or opening an explanation panel.

### 4. Keyboard, touch, and responsive behavior

- Arrows/WASD always walk, clearing selection and updating eligibility.
- Within the focused board, Tab/Shift+Tab traverses eligible boxes in a predictable order; focus reveals the same preview. Enter commits the focused box after the player has had a chance to inspect it. Escape cancels. The board must not trap focus; Tab continues to utility controls after its targets.
- Walking clears the old target and restores board-level focus rather than leaving Enter armed on a stale box.
- Touch uses tap box, then tap Pull: no hover requirement, timed double tap, or drag.
- Use full-cell box hit areas, with safe non-overlapping expansion where space permits. Aim for at least 44×44 CSS pixels for standalone controls; do not overlap neighboring walk/box targets to force that size on a narrow board.
- Keep the temporary Pull control below the board on mobile, outside the finger-obscured preview. Desktop and tablet retain the same interaction, not a separate shortcut-only experience.
- Give focused/selected targets an accessible description identifying the box and its stopping cell. The ghost itself is not an extra tab stop.

### 5. Advantages, drawbacks, and likely confusion

**Advantages:** removes compass interpretation, keeps movement keys consistent, and gives touch and keyboard a stable pre-commit preview. Requires little persistent UI.

**Drawbacks:** pointer/touch pulls take a selection and confirmation. Keyboard traversal is less direct than a directional shortcut. Small box targets still need careful hit testing.

**Likely confusion:** “Why can't I select that box?” Eligibility outlines and brief spatial rejection feedback must convey alignment, the first-box rule, and opaque pillars. Do not answer this by adding automatic walking or a second field of suggested standing positions.

## Proposal 2: Aim from the player, then fire

Mental model: **“Stand here. Look along this line. Fire the tether.”**

### 1. Exact interaction flow

1. Walk freely by clicking/tapping floor.
2. Activate the player token to enter aim mode.
3. A temporary four-direction selector appears. Choosing a direction previews its ray; it does not pull.
4. Activate the selector's central Pull control to commit.
5. Return to walking automatically after the animation.

Cancel closes aiming without changing the board. On pointer/touch, clicking ordinary floor outside the selector cancels aiming and walks there.

### 2. Walking versus pulling

Aim mode changes the player marker into a reticle and suppresses walking dots. The directional selector exists only in this state. Its directions choose sightlines; motion chevrons on the board point inward toward the fixed stopping ghost.

Do not call an outward arrow the box's movement direction. The separation must be apparent from the preview, not dependent on “Pull north” wording.

### 3. Target and destination preview

While aiming, up to four thin, low-contrast laser rays may show where the player can look. Each stops at the first box, pillar, or board edge. Selecting one direction strengthens only that ray and reveals its target and destination ghost.

A blocked, empty, or adjacent-box ray cannot be confirmed. A ray to a pillar represents blocked visibility, not a tether connection or alternative stopping surface.

### 4. Keyboard, touch, and responsive behavior

- Normally, Arrows/WASD walk. Space enters aim mode; direction keys then choose a ray without moving anything. Enter pulls; Escape returns to walking. Space does not accidentally confirm a pull.
- Touch uses tap player, tap direction, tap Pull. No hover is required.
- On desktop/tablet, position the selector near the player, shifting it inward at board edges and keeping it off the selected target and ghost.
- On mobile, place the temporary selector below the board with large touch targets rather than covering nearby cells. Do not rotate the board or remap directions.
- Announce entry/exit from aim mode and the selected legal result to assistive technology. Keyboard focus must visibly match the mode.

### 5. Advantages, drawbacks, and likely confusion

**Advantages:** makes the player the obvious origin of every pull, matches directional mechanics, and provides a stable preview on every input method. Four contextual lasers can make line-of-sight restrictions concrete.

**Drawbacks:** adds a mode and more actions per pull; mobile still divides attention between board and selector. Multiple rays can obscure the room.

**Likely confusion:** “Am I walking or aiming?” Direction keys change meaning. A strong reticle, temporary controls, and automatic exit reduce this cost but cannot remove it. Prefer this alternative only if deliberate directional aiming is central to the desired feel.

## Proposal 3: Drag the box into its stopping slot

Mental model: **“Draw that box toward me, into this slot.”**

### 1. Exact interaction flow

1. Click/tap floor to walk freely.
2. Press an eligible box to reveal the fixed stopping slot beside the player.
3. Drag toward the slot. A presentation-only handle follows the gesture along the box–player line; the actual box stays at its original position until commitment.
4. Release over the slot after a deliberate drag to commit. Release elsewhere, off-board, or back at the original box to cancel. Escape, pointer cancellation, and lost capture also cancel without a pull.
5. Animate the real box into the slot.

Intermediate squares are never valid drop locations. Release over the stopping slot commits the resolver's full pull, not a user-selected distance. A box gesture cannot turn into walking when released on floor.

### 2. Walking versus pulling

Floor responds to a click/tap; eligible boxes show a grab affordance. While dragging, floor dots recede and the target, handle, and ghost become prominent. Do not make an uncommitted drag look like the real box has already moved.

### 3. Target and destination preview

Pressing the box reveals its outline, the thin aiming connection, and a translucent box in the one legal destination. A dashed guide remains visibly provisional until release; the solid tether belongs to the committed animation.

Only first-visible, aligned, non-adjacent boxes can start a legal drag. No gesture can pass through another box or pillar. The fixed ghost remains visible throughout, even if the finger obscures the handle.

### 4. Keyboard, touch, and responsive behavior

- Arrows/WASD walk. Keyboard focus visits eligible boxes and reveals their destinations; Enter commits and Escape cancels. No keyboard simulation of dragging is required.
- Touch supports the drag but also needs an equivalent non-drag route: tap box, then activate a temporary Pull button. Dragging must not be the only way to play.
- Tablet offers more gesture space. Desktop uses the same drag/release rule with a pointer.
- Mobile needs forgiving slot hit testing that does not overlap other targets, plus a clear separation between an active box gesture and page scrolling. Preserve page scrolling outside that gesture.

### 5. Advantages, drawbacks, and likely confusion

**Advantages:** communicates pulling toward the player physically, removes compass translation, and makes the stopping slot part of the action.

**Drawbacks:** precision demands, finger occlusion, long drags, and scroll conflicts. A non-drag alternative is essential and creates a second interaction vocabulary.

**Likely confusion:** dragging normally implies arbitrary placement. Users may expect a halfway release to move the box halfway. A constrained handle and fixed ghost help, but this remains the weakest sole primary interaction for a cross-device game.

## Lasers, tether, and animation: distinct jobs

These are feedback layers, not three more controls or mechanics.

### Laser: what can I target?

A laser is an aiming/visibility cue, not the thing pulling the box. It starts at the player and terminates at the first obstruction. It never travels through a pillar or nearer box. Use a thin, static line; do not animate outward particles that could be mistaken for box movement.

Three visibility treatments were considered:

| Treatment | Benefit | Cost | Decision |
| --- | --- | --- | --- |
| Four always-on rays | Continuously exposes cardinal visibility | Persistent clutter; can imply multiple simultaneous pulls or make walking look like firing | Do not use as the default |
| Four rays only while explicitly aiming | Makes direction choice concrete and reveals blocked rays | Requires aim mode and careful contrast | Suitable for Proposal 2 |
| One ray for the selected/focused box | Shows exactly the action under consideration with minimal clutter | Eligibility must be discoverable before selection | Recommended for Proposal 1; usable during Proposal 3 |

In the recommended design, faint box eligibility outlines do the discovery work; one selected laser does the explanation work. Do not add an extra “show lasers” control merely to expose the mechanic. Multiple faint rays never imply multiple attached boxes.

### Ghost: where will the box stop?

Render a recognizable translucent box at the exact adjacent endpoint, not just a colored square or crosshair. Keep the cell boundary and player visible. The target outline, thin sightline, ghost shape, and inward chevrons must remain distinguishable in grayscale.

The ghost is temporary feedback, not a goal tile or selectable destination. Clear it when the selection is cancelled, the player walks, undo/reset occurs, or the pull finishes. Its position and target must always come from the same resolver result used to commit the pull.

### Tether: what is attached now?

On commit, the aiming line becomes a thicker, solid tether attached to the selected box's near face and the player's facing edge. Only one tether becomes solid. It shortens as that box approaches the player.

Keep endpoints anchored to the rendered pieces. The tether ends at their facing edges; it should not appear to impale the box or extend through the player. Avoid slack, swinging, spring overshoot, or bouncing that suggests new physics. The player is the anchor and does not recoil into another tile.

### Pull animation storyboard

| Stage | Board feedback | Mechanical meaning |
| --- | --- | --- |
| Preview | Thin laser, selected outline, exact ghost; no piece movement | No command committed and no pull counted |
| Commit/attach | Line becomes solid; brief attachment emphasis on the target | One legal pull accepted; target and endpoint fixed |
| Slide | One box travels on the straight cardinal segment; tether shortens; ghost stays fixed | Presentation of that one pull, not incremental moves |
| Arrive/release | Box matches the ghost exactly; tether disappears; a restrained endpoint emphasis settles | No overshoot, collision bounce, or additional movement |
| Ready/result | Selection clears; eligibility refreshes, or the existing win/no-pulls result appears | Next input uses the resulting board |

Keep the entire committed sequence short—approximately 250–350 ms is an initial design target, close to the existing 260 ms transition, not a timing requirement. Attachment and arrival should be accents within that duration, not added cinematic pauses. Long pulls may use the upper end of the range; no pull should require a hold, charge, or timing challenge.

The animation must not choose a target, calculate a new endpoint, increment the count again, or queue an accidental next action. Preserve the engine's existing input-lock/settle behavior during a committed transition. Cancel is for the preview; once committed, recovery is ordinary Undo when the action settles.

Walking must not flash the laser or play tether effects. Recompute eligibility after the player arrives. Do not turn pointer walking into an automatic walk-and-fire sequence.

### Reduced motion and accessibility

- With reduced motion, retain the static target/laser/ghost preview, then place the box at its endpoint with an immediate or brief opacity transition. Omit travelling effects, pulsing, bounce, and camera shake.
- Settle the action promptly in reduced-motion mode; shortening CSS while retaining an unnecessary long input lock is not equivalent behavior.
- Announce the selected target and destination before commitment and the completed result once afterward. Do not announce every animation frame.
- Preview information must be available through selection or keyboard focus, never hover alone. Neither audio nor color is required to understand or execute a pull.
- Keep overlays non-intercepting unless they are explicit controls. Drawing a laser across floor must not steal walking input.

## Concrete first move and boundary checks

Coordinates here are one-based columns and rows. The bundled level starts with the player at (1,1), boxes at (2,1), (3,1), and (3,4), and a pillar at (4,2).

Recommended interaction for the first move:

1. Tap floor at (2,3). Only the player moves; the pull count remains zero.
2. Tap the box at (2,1). The selected laser runs north from the player to that box. A ghost appears at (2,2); the motion cue points south toward it.
3. Tap Pull. The laser becomes a tether, the box slides south into (2,2), and the tether retracts. The player stays at (2,3); the pull count becomes one.

This is the same legal first move as choosing north on the current compass, without requiring the player to translate “north” into southward box motion.

Boundary behavior was checked against the unchanged resolver: at the starting position, east is rejected as ADJACENT; the farther box cannot be chosen instead. From (2,3), north targets (2,1) and stops at (2,2). An unaligned north ray from (5,3) has NO_TARGET. A simpler interaction must preserve these restrictions.

The runtime three-pull solution used during review is reproducible by walking to (2,3) and pulling north; walking to (1,1) and pulling east; then walking to (3,1) and pulling south. Keyboard walking must route around occupied tiles; it cannot cross the box at (2,2).

## Evaluation criteria before adopting a design

These are proposed future usability checks, not claims that the new interaction has been implemented or tested:

- Before the first pull, can a new player identify the controlled piece, a place they can walk, the selected box, and the exact stopping square without reading a paragraph?
- Can they explain that the player stays still and the box moves toward them, including the north-target/south-motion case?
- Can they change their standing position without accidentally pulling, and inspect/cancel another target without spending a pull?
- Do adjacent boxes and pillars prevent targeting through them without suggesting a different stopping rule?
- Can pointer, keyboard-only, and touch players all inspect the same result before commitment, complete a pull, undo, and reset?
- Does the interface remain usable on desktop, tablet, and mobile, including board-edge positions, physical-device touch, reduced motion, visible keyboard focus, and non-drag operation?
- Does the animation clarify the predicted result without hiding the endpoint, adding a timing challenge, or slowing repeated experimentation?

Proposal 1 is the current implementation. Proposals 2 and 3 remain alternatives to evaluate only if testing demonstrates a material usability limitation. The objective remains fewer concepts and predictable results, not more controls or effects.
