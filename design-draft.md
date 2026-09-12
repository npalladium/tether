# Tether — Design Document

A grid puzzle about pulling boxes along ranks and files until they form a shape.
Movement model is closer to Ricochet Robots than Sokoban.

Status: pre-prototype. Design choices are left open and marked **[OPEN]**.

---

# Part 1 — Gameplay Design

## 1.1 Premise

An 8×8 room. The player, three boxes, some pillars. The player fires a tether
along a rank or file; the first box in that line slides toward the player until
it hits something. Win by arranging the boxes into an L-tromino anywhere on the
grid, in any rotation.

There are no marked target tiles. The goal is a *shape*, not a destination.

## 1.2 Entities

| Entity | Blocks movement | Blocks tether line | Stops a sliding box |
|---|---|---|---|
| Wall (out of bounds) | yes | yes | yes, flush |
| Pillar | yes | **[OPEN]** | yes, flush |
| Box | yes | yes (it *is* the target) | yes, flush |
| Player | — | — | yes, flush — but then vacates |

## 1.3 Core loop

1. Walk to a firing position (free, orthogonal, uncounted).
2. Fire the tether in one of four directions.
3. The first box in that line slides toward you and stops flush against the
   first blocker.
4. Repeat until the three boxes form an L.

Only pulls are counted. Walking is free.

## 1.4 Derived laws

These are not extra rules — they fall out of the above — but they are
non-obvious, load-bearing, and the entire skill ceiling. They must be taught
explicitly.

**Law 1 — Collinear pulls only separate.**
If two boxes share a file, any tether fired down that file grabs the nearer one
and drags it *away* from the further one. Firing from the far side just moves
the other box. Two boxes can never be made adjacent along the axis they are
pulled on.

*Consequence:* every adjacency in the final shape must be built **cross-axis**.
A box becomes vertically adjacent to another only by arriving horizontally, and
vice versa.

**Law 2 — The player is the only loose stopper.**
Walls, pillars and boxes stop a box flush and stay put. The player stops a box
flush and then walks away, leaving a one-tile gap. This "backstop" is the *only*
way to park a box on an arbitrary open tile with nothing supporting it.

*Consequence:* without backstopping, every box comes to rest against something.
The interior of the board is unstable; walls are attractors.

**Law 3 — The L is self-scaffolding; the I is not.**
The L-tromino's corner box touches both others orthogonally, so a single
cross-axis pull can collide it into one box and land it flush against the
second. The I-tromino (three in a row) requires an external blocker for each
piece. This asymmetry is a free difficulty gradient: the I is the natural
near-miss state.

## 1.5 Failure

The player can be sealed in. All four orthogonal neighbours blocked means no
walking, and no line of sight past adjacent boxes means no tether either — a
hard lock, not a soft one. Realistically one configuration: the L built into a
board corner with the player in the crook.

Rare enough that it will read as a gotcha unless a level is built specifically
to demonstrate it.

**[OPEN] Handling:**

| Option | Trade-off |
|---|---|
| Silent lock | Reads as a bug. |
| Advisory detector — "no moves remain, undo?" | Honest, gives the trap its drama. Needs a solver at runtime. |
| Hard fail + forced reset | Punishing; conflicts with undo-friendly design. |

## 1.6 Verbs

Three: **pull**, **backstop**, **block with pillar**. Enough for roughly 20–30
levels before repetition.

**[OPEN] Optional fourth verb** — only if scope grows past ~40 levels:

| Option | Trade-off |
|---|---|
| Junk boxes (extra, not part of the goal) | Cheapest. Pure colliders and decoys. Lets adjacency be built without a backstop. Slight goal ambiguity — which three count? |
| Grab-through (tether passes the first box, takes the second) | Doubles strategic space without touching the core. Harder to read on screen; needs a distinct input. |
| Anchored pull (player is immovable, box drags player instead) | Novel, but inverts the collision intuition players just learned. |

## 1.7 Scoring and assistance

- Par = minimum pulls, computed by solver. Show par / current / best.
- **Undo is mandatory, not a nicety.** There is no push, so most states are
  one-way.
- No timer.

**[OPEN] Undo depth:** unlimited (safest, encourages probing over planning) vs.
limited-N (preserves the weight of a move, risks frustration).

## 1.8 Teaching order

The tutorial *is* the design. Each level introduces exactly one thing.

1. Two boxes, one wall. One pull. Teaches flush stop.
2. Forces a cross-axis pull. Teaches Law 1.
3. First backstop — a box must land on open floor. Teaches Law 2.
4. First pillar used as a line-of-sight blocker.
5. Reachability level — the firing tile you need gets sealed off if you move in
   the wrong order.
6. The crook trap, in a board corner, unavoidable on the naive line.

Law 1 should teach itself on first contact: when a player attempts a collinear
pull, animate the separation as a deliberate beat rather than rejecting the
input silently.

## 1.9 Difficulty

Difficulty does **not** live in the box logic — the state space is small and
most boards fall in two or three pulls. It lives in:

- **Pillars as line-of-sight blockers**, pruning firing positions.
- **Player pathing** — as boxes clump, the floor partitions, and "can I reach
  the tile I need to fire from" becomes the real constraint.

Two measurable signals, both available from a full solve:

- **Dead-state fraction** — proportion of reachable states from which no L can
  still be formed. Because pulls are irreversible, this is the honest difficulty
  metric.
- **Greedy failure** — does a naive bot (grab nearest box, always pull toward
  the anchor) dead-end? Levels that punish the obvious read are the good ones.

## 1.10 Content

**[OPEN] Level sourcing:**

| Option | Trade-off |
|---|---|
| Fully hand-authored | Best quality per level. Slow. |
| Reverse-scramble from a solved L | Guarantees solvability, but must invert the backstop (needs a recorded player position), and scrambles tend to unwind themselves. |
| Random layout + exhaustive solver filter | Cheap, unbiased, gives all metrics free. Produces quantity, not quality. |
| **Generate-and-mine:** random + filter, then hand-pick and hand-polish the best | Surfaces configurations you would not have thought of; keeps final quality high. Most work up front. |

Filters, cheapest first: solvable with par 3–6 → not a D4-symmetry duplicate of
an existing level → pillar necessity (delete each pillar; if par and optimal
solution count are unchanged, delete it for real) → solution scarcity (≤3
distinct optimal solutions; many-solution boards feel mushy).

Hand-author the tutorial six and the finale regardless. "Unavoidable on the
naive line" is a property a generator will essentially never hand you.

## 1.11 Prior art

| Game | Shares | Differs |
|---|---|---|
| **Ricochet Robots** | Full-slide-until-collision movement; scanning ranks and files; parking a piece as a blocker for a later move | Competitive speed race, full reset each round — irreversibility never bites |
| **Pukoban** (pull-only Sokoban) | Pull as the only verb | Single-tile pulls, so pull *is* the reversibility mechanic. Same verb, opposite consequence |
| **Sokoban** | Avatar occupies the grid and blocks | Push, single-tile, marked target tiles |
| **A Good Snowman** | Goal is a shape, anywhere; no marked targets | Push-based; shape is built by stacking |
| **Rush Hour / Klotski** | Axis-constrained sliding against blockers | Fully reversible; no avatar |
| **Stephen's Sausage Roll** | Player body as a critical blocker | Avatar is a pusher, not a puller; far denser verb set |

**What is actually novel:** Law 1. No existing game has a movement verb that
*cannot* make two pieces adjacent along its own axis. Sokoban's push does it
trivially; Ricochet Robots doesn't care about adjacency. Requiring every
adjacency to be built cross-axis is the original constraint here — and, not
coincidentally, the hardest thing to teach.

Player-as-blocker is not novel. Player-as-*temporary* blocker that vacates and
leaves a gap (Law 2) is unusual and load-bearing.

Positioning, in one line: **Ricochet Robots' movement, Sokoban's avatar,
A Good Snowman's goal.** Those three barely overlap. The likely reason nobody
has built it is that pull-plus-full-slide is unforgiving enough that most
designers would add a push and land back in Sokoban.

**Warnings from precedent:**

- *Snakebird*, *Stephen's Sausage Roll* — irreversible states plus unlimited
  undo reliably produce players who probe rather than plan. Their partial answer
  is making states intricate enough that probing is slower than thinking; our
  states are small enough that probing will usually win. Accept it rather than
  fix it (see §1.7).
- *Baba Is You*, *SSR* — sustain hundreds of puzzles because their verbs
  recombine. Three verbs that do not recombine is why the ceiling here is
  20–30 levels without the optional fourth (§1.6).
- *Helltaker* — the tone reference. Short sliding-block puzzles where failure
  states teach instantly and the tutorial barely explains. That is the model for
  the collinear-separation beat (§1.8).

---

# Part 2 — Technical Design

Pseudocode only. No language or engine assumed.

## 2.1 Types

```
Vec    = { x, y }                  // also used as a direction
Dir    = N | E | S | W

Level:                             // static, immutable after load
    w, h                           // 8, 8
    pillars    : Set<Vec>
    startPlayer: Vec
    startBoxes : List<Vec>
    par        : Int
    title      : String?

State:                             // dynamic; the whole save/undo unit
    player : Vec
    boxes  : List<Vec>
    pulls  : Int

Session:
    level   : Level
    state   : State
    history : Stack<State>
    status  : PLAYING | WON | DEAD
```

**Nothing else is stored.** Occupancy, the reachable-tile set, legal firing
tiles and the win check are all derived and recomputed on change. The board is
64 tiles; this is free.

## 2.2 The two predicates

The difference between these is Law 2, expressed in code.

```
solidAt(state, p):                 // stops a box AND stays there
    return outOfBounds(p)
        or p in level.pillars
        or p in state.boxes

blockerAt(state, p):               // stops a box, may not stay
    return solidAt(state, p) or p == state.player
```

## 2.3 Pull resolution

```
resolvePull(state, dir) -> Result:
    step = -unit(dir)                        // box travels toward the player

    // 1. find target: scan outward from the player
    scan = state.player + unit(dir)
    loop:
        if outOfBounds(scan):            return ILLEGAL(NO_TARGET)
        if scan in level.pillars:
            if PILLARS_BLOCK_LOS:        return ILLEGAL(BLOCKED)
            else:                        scan += unit(dir); continue
        if scan in state.boxes:          target = scan; break
        scan += unit(dir)

    // 2. adjacency guard
    if manhattan(state.player, target) == 1: return ILLEGAL(ADJACENT)

    // 3. slide
    dest = target
    while not blockerAt(state, dest + step):
        dest += step

    if dest == target:                   return ILLEGAL(NO_MOVEMENT)
    return LEGAL(target, dest)
```

Note `PILLARS_BLOCK_LOS` is the **[OPEN]** flag from §1.2. Keep it a config
value through prototyping.

```
applyPull(session, dir):
    r = resolvePull(session.state, dir)
    if r is ILLEGAL:
        emit(FEEDBACK, r.reason)         // no history, no counter increment
        return

    push(session.history, copy(session.state))
    moveBox(session.state, r.target -> r.dest)
    session.state.pulls += 1
```

Illegal pulls must never touch history and never increment the counter.
`ILLEGAL(ADJACENT)` and a collinear no-op are where Law 1 gets taught — route
them to distinct feedback.

## 2.4 Win and dead checks

```
isWon(state):
    cells = state.boxes
    if count(cells) != 3: return false
    return (max.x - min.x) <= 1
       and (max.y - min.y) <= 1          // 3 distinct cells inside a 2x2 is an L

isDead(session):
    if isWon(session.state): return false
    for tile in reachableTiles(session.state):
        for dir in [N,E,S,W]:
            if resolvePull(withPlayerAt(session.state, tile), dir) is LEGAL:
                return false
    return true

reachableTiles(state):
    flood-fill from state.player over tiles where not solidAt(state, tile)
```

`isDead` is exhaustive over ~64 tiles × 4 directions. Cheap enough to run every
turn.

## 2.5 State machine

```
BOOT -> READY

READY
    tap floor tile, in reachableTiles   -> WALKING
    tap direction, pull LEGAL           -> apply, then SLIDING
    tap direction, pull ILLEGAL         -> READY  (shake + hint, no cost)
    undo, history non-empty             -> READY  (pop into state)
    reset                               -> READY  (state = initial)

WALKING  -- animation complete -->  READY
SLIDING  -- animation complete -->  EVALUATE

EVALUATE
    isWon   -> WON
    isDead  -> DEAD
    else    -> READY

WON   -> next level | replay
DEAD  -> undo -> READY | reset -> READY
```

WALKING and SLIDING are animation-only. The state mutation already happened on
entry; input is locked during them; skipping the animation must be safe.

## 2.6 Undo

Trivially correct, because `State` is a full snapshot and `Level` is immutable.

```
undo(session):
    if empty(session.history): return
    session.state  = pop(session.history)
    session.status = PLAYING
```

Do not be tempted to store deltas.

## 2.7 Solver

Used offline for par and metrics; optionally at runtime for `isDead` and hints.

```
solve(level):
    start = State(level.startPlayer, level.startBoxes, 0)
    BFS over states:
        successors(s) =
            for tile in reachableTiles(s):
                for dir in [N,E,S,W]:
                    r = resolvePull(withPlayerAt(s, tile), dir)
                    if r is LEGAL: yield applied(s, tile, r)
    return shortest path to any s where isWon(s)
```

State key: `(player-region-id, sorted box positions)`. Two states with the
player in different tiles of the *same* reachable region are identical for
search purposes — canonicalising to a region id collapses the space
substantially.

Rough size: 3 boxes over 64 tiles is ~41k box configurations, times a small
number of player regions. Full BFS is milliseconds. This means level quality is
something you can *know*, not guess.

Metrics falling out of one solve:

```
par                = length of shortest solution
optimalCount       = number of distinct shortest solutions
deadStateFraction  = |states with no reachable win| / |reachable states|
requiresBackstop   = every optimal solution contains a pull where
                     the box's stopping blocker was the player
requiresLOSBlock   = every optimal solution contains a firing position
                     only valid because a pillar blocks an alternative target
```

`requires*` tags feed the curriculum: levels needing exactly one new technique
go early, stacked ones go late.

## 2.8 Prototype order

1. Grid, entities, `solidAt` / `blockerAt`.
2. `resolvePull` + slide animation. **Stop here and play it.** Everything
   downstream depends on whether this single move feels good.
3. Win check, undo, reset.
4. Solver, offline, for par.
5. Feedback for illegal pulls — specifically the collinear separation beat.
6. Levels.
