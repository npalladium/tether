# Tether — Design Document

A grid puzzle about pulling boxes along ranks and files until they form a shape.
The player chooses the stopping position; access to that position is the puzzle.

Status: implemented rule prototype; authored content is being expanded.
The implementation uses opaque pillars and unlimited undo. Unsettled design
choices are marked **[OPEN]**; content depth needs playtesting.

---

# Part 1 — Gameplay Design

## 1.1 Premise

An 8×8 room. The player, three boxes, some pillars. The player fires a tether
along a rank or file; the first unobstructed box slides toward the player and
stops on the adjacent tile. The player stays put until walking again. Win by
arranging the boxes into an L-tromino anywhere on the grid, in any rotation.

There are no marked target tiles. The goal is a *shape*, not a destination.
The central question is: can I reach the firing position that produces the
placement I need, and will that placement preserve access for the next move?

## 1.2 Entities

| Entity | Blocks walking | Effect on a tether shot |
|---|---|---|
| Wall (out of bounds) | yes | Ends the search without a target. |
| Pillar | yes | Opaque: blocks the shot before any box beyond it. |
| Box | yes | The first visible box is the target; boxes behind it cannot be selected. |
| Player | — | Fires the tether and determines its target's stopping tile. |

Every legal pull stops against the player. Walls and other boxes cannot become
stopping surfaces: the path to the selected box is clear. Pillars prevent the
shot rather than stop a successfully targeted box.

Transparent pillars are outside the prototype rules. Allowing a tether through
one would let a distant box stop against it, introducing a different placement
mechanic—not merely a visibility option.

## 1.3 Core loop

1. Walk to a firing position (free, orthogonal, uncounted).
2. Fire the tether in one of four directions.
3. The first visible box slides to the tile immediately beside you on that ray.
4. Repeat until the three boxes form an L.

Only successful, moving pulls are counted. Walking is free. A shot with no
visible target, or with an already-adjacent target, changes nothing.

## 1.4 Derived laws

These follow from the movement rule. The tutorial should make their
consequences legible rather than present them as additional restrictions.

**Law 1 — Pulls cannot create adjacency along their movement axis.**
A box cannot become adjacent to another box along the axis it is pulled on.
An intervening box would have been selected first, and the player occupies the
square beyond the moving box's destination.

Collinear boxes can become closer if the player stands between them, but they
cannot become adjacent that way. Every *new* box adjacency must be built
cross-axis: a horizontal arrival can create vertical adjacency, and vice versa.
An adjacency may already exist in the starting layout.

**Law 2 — Every pull is a player-positioned stop.**
To park a box on an open tile, stand one tile beyond that destination on the
pull axis. The firing position must be reachable, and the target must be visible.
The player can walk away afterward; the box remains where it was placed.

This is the basic move, not a separate backstop technique unlocked later. Other
boxes and pillars shape access and targeting; they do not provide collision
scaffolding. The L cannot be completed by pulling its corner into two neighbours.
There is no assumed difficulty ordering between an L and an I.

**Law 3 — Leaving an outer edge is irreversible.**
A box can leave an outer row or column, but cannot return to that edge from the
interior. Arriving there along the perpendicular axis would require the player
to stand outside the board. Moving along an edge remains possible.

Boundary membership can only be lost. Walls constrain placement; they are not
attractors. Leaving an edge is a commitment whose usefulness as a teaching
concept still needs playtesting.

## 1.5 Failure

Two different conditions matter:

- **No legal pulls:** no firing position in the player's reachable region can
  produce a moving pull. Floor tiles may remain geometrically reachable, but
  walking is intentionally disabled once this condition is detected: the
  enumeration has already covered the entire reachable region, and repositioning
  within that same region cannot change the available pulls. A local enumeration
  is sufficient to detect this; no solution search is needed.
- **Unsolvable:** legal pulls may remain, but no sequence can reach an L. This
  requires a solver or a lookup in an analysed state graph.

For the prototype, show an advisory—"No pulls remain. Undo or restart."—only
for the first condition. If there is no undo history (for example, a level
that starts in `NO_PULLS`), restart is the available recovery action. Never
force a restart. Do not label a position unsolvable based on the local check.

Winning is checked first. A completed L with the player trapped in its crook
is still a win; escaping afterward is not part of the goal. Non-winning traps
are possible when boxes and pillars seal off the player; see §1.8.

**On-demand assistance:** Hint and Show solution run a solver from a snapshot
of the current board. Only an exhausted search reports no winning continuation;
the normal `NO_PULLS` advisory remains independent of this optional assistance.

## 1.6 Verbs and scope

Two player actions: **walk** and **pull**. Player-positioned stopping is part of
pulling; a pillar is a static obstacle, not a separate verb.

First test whether placement, cross-axis adjacency, and reachability combine
into distinct puzzles. Free walking and flexible stopping positions may make
open boards too easy; carefully authored bottlenecks may supply the depth.
There is no established level-count ceiling or requirement to add more verbs.

Additional boxes, selective targeting, player-dragging, and transparent pillars
are outside the prototype. Revisit the movement model only if a small set of
hand-authored boards exposes a specific limitation worth addressing.

## 1.7 Scoring and assistance

- Par = minimum pulls, computed by solver. Show par / current / best when par
  is available; an unsolved authoring draft has no assigned par.
- Unlimited undo. Undo restores the position and counter before the last
  successful pull, including the player's firing position. Walking alone does
  not add history entries.
- Reset starts a fresh attempt and clears undo history.
- Best is the lowest completed pull count for the loaded level revision. It
  survives undo, reset, and replay within that session. Persistence or score
  separation between sessions is an interface concern, not a progression API.
- No timer.
- Hint reveals a route-specific strategic nudge, then a box and destination,
  then the exact firing position and direction with a read-only preview.
  Each stronger hint is explicitly requested; nudges describe one possible
  route, not a compulsory move.
- Show solution offers up to three distinct shortest routes from the current
  state. The viewer shows each firing position, target, endpoint, and final L.
  It is a representative sample, not an enumeration of all solutions.
- Assistance never plays moves or changes score, undo history, room selection,
  or tutorial progress. Closing cancels pending work and restores focus.
  Errors offer a retry; an unsolvable position suggests returning to undo/reset.

Irreversible placements make undo important. Probing is allowed; whether players
prefer probing to planning is a playtesting question, not a reason to limit undo.

## 1.8 Teaching order

The following is a **recommended teaching arc**, not an inventory of shipped
levels or a promised campaign. Use three boxes and the same L goal from the
first lesson. Each teaching room should emphasise one new idea, even though the
underlying constraints act together.

1. A one-pull L. Teaches pulling to the player's adjacent tile.
2. A new adjacency built cross-axis. Teaches Law 1.
3. An opaque pillar. Teaches blocked targeting and walking to another angle.
4. Leaving an outer edge. Teaches an irreversible placement and undo.
5. Reachability. A required firing tile is lost if boxes move in the wrong order.
6. A recoverable, non-winning enclosure. Teaches the no-pulls advisory and undo.

After that arc, add two to five **normal rooms** only when their graph evidence
is complete. They combine already taught endpoint, cross-axis, opaque-pillar,
and access-order reasoning; they are applications, not occasions to introduce a
new hidden rule. A normal room still needs an exact replay, par, canonical
shortest-solution count, and a full-graph solvability check.

Animate actual movement on legal pulls. If a lesson highlights collinear
separation, classify it from the before/after box positions; separation occurs
on the legal path. An adjacent-target rejection means "no room to move," not
"collinear boxes always separate."

**Historical verified-enclosure counterexample (not the current default
level):** normal 8×8 board, zero-based `(x, y)` coordinates; x increases east,
y increases south. Player `(0,0)`, boxes `(1,0)`, `(2,0)`, `(2,3)`, and one
opaque pillar `(3,1)`. All other tiles are empty.

A losing sequence:

1. Stand at `(1,2)` and pull north: `(1,0)` → `(1,1)`.
2. Stand at `(2,1)` and pull south: `(2,3)` → `(2,2)`.

The player is surrounded by three boxes and the pillar. The boxes are not an L,
and no walking or legal pull remains.

A winning alternative after the same first pull:

2. Stand at `(0,0)` and pull east: `(2,0)` → `(1,0)`.
3. Stand at `(2,0)` and pull south: `(2,3)` → `(2,1)`.

Each firing position is reachable. A replay through the current engine confirms
the losing line reaches `NO_PULLS` after two pulls and the alternative wins in
three. Exhaustive canonical-state analysis confirms par 3, six shortest routes
to five winning states, and 43 no-win states among 10,500 reachable states
(0.41%). It therefore preserves a real terminal counterexample, but the
infrequent trap is not evidence that players will discover or understand that
lesson without dedicated presentation or playtesting.

## 1.9 Difficulty

Working hypothesis: difficulty comes from coordinating shape construction with
access to firing positions. Pillars block both routes and tether rays; moving
boxes can partition the floor. Open boards may offer too many easy placements.

Candidate signals—not substitutes for playtesting:

- **Par:** the shortest solution length, not a direct measure of reasoning effort.
- **Optimal solution count:** scarcity may help identify constrained puzzles,
  but multiple solutions are not automatically a defect.
- **Dead-state fraction:** the proportion of reachable states with no reachable
  win. A large fraction may mean interesting commitments or merely frustration.
- **Observed wrong turns:** whether players choose losing moves, notice why,
  and recover productively with undo.

A bot-based greedy-failure metric is deferred until its action policy and
tie-breaking are explicit. It must not stand in for evidence of an intuitive
human choice. No claim is made yet about typical par or sustainable level count.

## 1.10 Content

Keep an explicit inventory of every authored layout separate from examples and
proposals:

### Authored source inventory
`src/level.ts` exports seven selectable rooms. Its **Learn the pull** group is a
four-room teaching sequence; its **Puzzles** group contains three normal,
non-teaching application rooms. The table records an independent exhaustive
canonical-state audit of the current opaque-pillar resolver. “Routes” counts
shortest canonical state paths, not walking routes or labelled-box permutations.

| Group and revision | Layout and intended role | Engine evidence |
|---|---|---|
| Learn — `first-connection-v1`, **First connection** (selected default) | Player `(0,1)`; boxes `(0,0)`, `(1,0)`, `(7,1)`; no pillars. Immediate east targets `(7,1)` and lands `(1,1)` for the introductory L. | Par 1; 24,150 states; 1 shortest route; 92 no-win states. Witness: `(0,1)` E. The direct opening is verified, not every free-walk experiment. |
| Learn — `choose-the-stop-v1`, **Choose the stop** | Player `(0,7)`; boxes `(3,2)`, `(3,3)`, `(0,3)`; no pillars. Teaches that firing position fixes the endpoint. | Par 3; 10,920 states; 25 shortest routes; no no-win states. Witness: `(0,7)` N, `(3,6)` W, `(2,2)` S. |
| Learn — `nearer-box-first-v1`, **Nearer box first** | Player `(0,0)`; boxes `(3,0)`, `(6,0)`, `(3,3)`; no pillars. Teaches the first-visible box rule, not optional long-range selection. | Par 4; 11,284 states; 180 shortest routes; 4 no-win states. Witness: `(1,0)` E, `(2,2)` N, `(3,0)` S, `(2,0)` E. |
| Learn — `around-the-pillar-v1`, **Around the pillar** | Player `(0,1)`; boxes `(0,0)`, `(1,0)`, `(7,1)`; opaque pillar `(3,1)`. Its initial east ray is `BLOCKED`; a solution needs other angles. | Par 4; 22,757 states; 115 shortest routes; 135 no-win states. Witness: `(0,2)` N, `(1,2)` N, `(7,3)` N, `(0,2)` E. |
| Puzzles — `open-corners-v1`, **Open corners** | Player `(0,7)`; boxes `(1,1)`, `(6,1)`, `(3,5)`; no pillars. Normal application room, not a new lesson. | Par 4; 7,140 states; 290 shortest routes; no no-win states. Witness: `(1,7)` N, `(0,5)` E, `(1,1)` E, `(2,6)` N. |
| Puzzles — `screening-line-v1`, **Screening line** | Player `(0,6)`; boxes `(2,2)`, `(5,2)`, `(5,5)`; opaque pillar `(3,4)`. Normal application room combining screening and placement. | Par 4; 6,545 states; 312 shortest routes; 4 no-win states. Witness: `(0,5)` E, `(2,4)` N, `(1,2)` E, `(1,2)` S. |
| Puzzles — `turning-room-v1`, **Turning room** | Player `(0,7)`; boxes `(1,2)`, `(6,3)`, `(3,6)`; opaque pillars `(3,3)`, `(4,4)`. Normal application room combining known rules. | Par 3; 5,020 states; 6 shortest routes; 62 no-win states. Witness: `(6,6)` W, `(7,2)` W, `(5,1)` S. |

The shipped teaching group establishes endpoint choice, first-visible targeting,
and opaque-pillar blocking. It does **not** by itself establish a full teaching
arc for edge commitment, access order, or recoverable enclosure; those remain
authoring roles, not retroactive claims about the existing rooms.

### Authored guided practice

`src/tutorial.ts` defines `guided-first-pull-v1`, **First tether**, separately
from the normal session. Player `(2,2)` has no legal initial pull, then walks
south to the marked firing tile `(2,3)`. Its only legal cue action is east:
target `(6,3)` lands at `(3,3)`, forming an L with `(3,4)` and `(4,4)`. There
are no pillars, so opaque-versus-transparent line of sight is deliberately not
taught. The session wins in one pull; graph evidence is par 1, 7,140 states,
two shortest routes, and no no-win or no-legal-pull states. It does not replace
the default, alter its score, or count as progression.

### Historical example and proposed roles

§1.8's verified enclosure is retained for its replayable win/loss evidence, but
is not shipped or evidence of a current sequencing lesson. The unrepresented
teaching-arc roles remain future authoring work. The current normal group already
contains three application rooms, within the required two-to-five range; add at
most two more only with coordinates, revision id, full-graph evidence, and a
replayed witness.

Hand-author any remaining teaching rooms before investing in mining.

**[OPEN] Level sourcing after the authored set:**

| Option | Trade-off |
|---|---|
| Fully hand-authored | Direct control over teaching intent; requires iteration. |
| Reverse construction from a solved L | Enumerate genuine predecessor states and verify each forward pull. Record player positions; ordinary forward pulls are not their own inverses. |
| Random layout + exhaustive analysis | Produces candidates under the chosen sampling distribution, not an unbiased measure of puzzle quality. |
| Generate-and-mine | Analyse candidates, then hand-pick and polish. Useful only once there are criteria worth mining for. |

For non-tutorial candidates, par 3–6 and at most three optimal solutions are
initial search parameters, not established quality thresholds. An intentional
one-pull introduction is an explicit exception. Reject invalid layouts and
D4-symmetry duplicates before expensive analysis. Equivalence uses both box
positions and the player's reachable region, not the exact walking tile.

Pillar removal is a proposal for review, not an automatic simplification. An
unchanged par and optimal count can coexist with a different dead-state fraction
or different losing choices. Reanalyse the modified layout and inspect its
routes, solutions, and intended lesson before accepting a deletion. Recheck
symmetry duplicates after layout changes.

## 1.11 Prior art and positioning

| Game | Useful comparison | Important difference |
|---|---|---|
| **Ricochet Robots** | Long orthogonal moves; scanning ranks and files | Tether chooses endpoints through player positioning, not environmental collision routing. |
| **Pukoban** | An avatar can pull boxes | The documented variant permits both pushing and pulling, with single-tile box movement. |
| **Sokoban** | An avatar navigates around boxes | Push-based, single-tile movement, marked target tiles. |
| **A Good Snowman** | Spatial construction rather than delivering each piece to a marked target | Builds snowmen by pushing and stacking. |
| **Rush Hour / Klotski** | Reasoning about constrained movement and access | No walking avatar that determines a pull endpoint. |

The Pukoban comparison uses the [National Taiwan University rules, pages 5–7](https://www.csie.ntu.edu.tw/~tcg/2019/hw1_spec_3ec0a4c12ab616a74a78c36a31048d31b53fee1b.pdf).
Single-tile pulling also cannot create adjacency along its movement axis: after
a pull, the two axial neighbours of the box are the new player tile and the
box's just-vacated tile. Law 1 is not a claim of novelty.

Positioning, in one line: **pull-to-player shape construction, constrained by
where the player can still stand.** The combination is worth testing without
claiming that no existing game has explored it.

*Helltaker* is a tone reference for a short, readable puzzle experience, not
evidence for a particular difficulty curve or number of levels.

---

# Part 2 — Technical Design

Pseudocode only. No language or engine assumed. All gameplay and solver paths
use the same opaque-pillar pull resolver.

## 2.1 Types

```
Vec    = { x, y }
Dir    = N | E | S | W

Level:                             // static, immutable after load
    id         : String            // stable identifier for this level revision
    w, h                           // 8, 8
    pillars    : Set<Vec>
    startPlayer: Vec
    startBoxes : List<Vec>
    par        : Int?              // absent until solved offline
    title      : String?

State:                             // full gameplay snapshot
    player : Vec
    boxes  : List<Vec>
    pulls  : Int

Session:
    level     : Level
    state     : State
    history   : Stack<State>
    phase     : READY | WALKING | SLIDING | EVALUATE | WON | NO_PULLS
    bestPulls : Int?                // for this loaded level only

Validate levels before play or search: exactly three distinct box cells; every
entity in bounds; no box/pillar/player overlaps. An authored revision that
changes layout or rules gets a new level id so its best score is not inherited.

Occupancy, reachable tiles, and win status are derived. Animation phase is not
part of an undo snapshot; restored gameplay is evaluated before accepting input.
Measure solver performance separately from these small-board runtime queries.

## 2.2 Occupancy and reachability

```
solidAt(level, state, p):
    return outOfBounds(level, p)
        or p in level.pillars
        or p in state.boxes

reachableTiles(level, state):
    flood-fill from state.player over tiles where not solidAt(level, state, tile)
```

The player is the flood-fill origin, not a walking obstacle. A generic sliding
collision predicate is unnecessary: selecting a visible target guarantees a
clear path to the tile beside the player.

## 2.3 Pull resolution

```
resolvePull(level, state, dir) -> Result:
    ray = unit(dir)
    scan = state.player + ray
    loop:
        if outOfBounds(level, scan): return ILLEGAL(NO_TARGET)
        if scan in level.pillars:    return ILLEGAL(BLOCKED)
        if scan in state.boxes:      break
        scan += ray

    dest = state.player + ray
    if scan == dest:                 return ILLEGAL(ADJACENT)
    return LEGAL(scan, dest)

applyPull(session, dir):
    r = resolvePull(session.level, session.state, dir)
    if r is ILLEGAL:
        emit(FEEDBACK, r.reason)
        return

    push(session.history, deepCopy(session.state))
    moveBox(session.state, r.target -> r.dest)
    session.state.pulls += 1
```

Computing the destination directly is equivalent to sliding toward the first
blocker under these rules: that blocker is always the player. The result still
provides both endpoints for animation.

Illegal pulls never touch history or the counter. Distinguish no target,
blocked sight, and an adjacent target. Legal-move teaching effects use the
before/after geometry, not an invented collinear no-op error.

## 2.4 Win and no-pulls checks

```
isWon(state):
    cells = state.boxes
    if count(cells) != 3: return false
    return (max.x - min.x) <= 1
       and (max.y - min.y) <= 1          // validated distinct cells in a 2x2

hasNoLegalPulls(level, state):
    for tile in reachableTiles(level, state):
        for dir in [N,E,S,W]:
            if resolvePull(level, withPlayerAt(state, tile), dir) is LEGAL:
                return false
    return true
```

`withPlayerAt` is a non-mutating view or copy; enumeration must not move the
live player. `hasNoLegalPulls` checks at most 64 tiles × 4 directions, each with
a ray scan. It does not establish unsolvability. Always check `isWon` first when
choosing the visible session phase.

## 2.5 State machine

```
BOOT -> beginLevel -> EVALUATE

READY
    tap reachable floor tile            -> move player, then WALKING
    tap direction, pull LEGAL           -> applyPull, then SLIDING
    tap direction, pull ILLEGAL         -> feedback, remain READY
    undo, history non-empty             -> undo, then EVALUATE
    restart                             -> beginLevel, then EVALUATE

WALKING -- animation complete --> READY
SLIDING -- animation complete --> EVALUATE

EVALUATE
    isWon                               -> WON; record best score
    else hasNoLegalPulls                 -> NO_PULLS
    else                                -> READY

WON
    undo, history non-empty             -> undo, then EVALUATE
    restart                             -> beginLevel, then EVALUATE

Loading another authored level is outside this one-level session state machine;
the content owner starts a separate session. There is no campaign/progression
engine transition.

NO_PULLS
    undo, history non-empty             -> undo, then EVALUATE
    restart                             -> beginLevel, then EVALUATE
```

Walking cannot change the set of available pulls from the same reachable region.
WALKING and SLIDING are animation phases: gameplay mutation has already happened
on entry, and input is locked during them. Skipping an animation must execute
its completion transition, including evaluation after a pull.

On entering WON, set `session.bestPulls` to the current count when absent,
otherwise to the lower of its previous value and the current count. Undo does
not erase a previously completed score. Persistence is outside this session.

## 2.6 Undo and reset

```
undo(session):
    if empty(session.history): return
    session.state = pop(session.history)
    session.phase = EVALUATE

beginLevel(session, level):
    session.level = level
    session.state = State(level.startPlayer, copy(level.startBoxes), 0)
    clear(session.history)
    session.phase = EVALUATE
```

Snapshots own their box collections. Restoring one must not mutate the immutable
level or another history entry. Undo is per successful pull, not per walking
step. Reset and replay clear history through `beginLevel`; undo after reset
cannot resurrect an earlier attempt. Loading another level uses a separate
session rather than an in-engine progression transition.

## 2.7 Solver and analysis

Offline graph analysis establishes par and candidate metrics. The optional
in-browser assistant separately searches on demand in a cancellable worker,
using the same resolver and reachability rules. It canonicalizes unordered box
positions plus the player's reachable component, minimizes pulls (walking is
free), and replays displayed routes through the session engine. It is not a
dependency of `NO_PULLS` and does not compute full-graph authoring metrics.

```
successors(level, s):
    for tile in reachableTiles(level, s):
        for dir in [N,E,S,W]:
            r = resolvePull(level, withPlayerAt(s, tile), dir)
            if r is LEGAL:
                s2 = deepCopy(s)
                s2.player = tile
                moveBox(s2, r.target -> r.dest)
                s2.pulls += 1
                yield s2, (tile, dir, r)

solve(level):
    start = State(level.startPlayer, copy(level.startBoxes), 0)
    BFS from start using successors, deduplicated by stateKey
    return a shortest path to any state where isWon(state), or UNSOLVABLE
```

State key: `(minimum reachable tile, sorted box positions)`, with a fixed
lexicographic coordinate order. This is scoped to one immutable level. Exact
player position and pull counter are excluded: free walking makes every tile
in the same reachable region equivalent for search. Recompute the region after
each pull using the *actual firing tile* as the new player's position; a box
move can split the old region.

Store a firing tile and direction with each predecessor edge so a solution can
be replayed with reachable walks. Deduplicate successor keys per source state.
A distinct solution means a distinct sequence of canonical state keys—not box
identities, walking routes, or multiple inputs with the same transition.

There are `C(64,3) = 41,664` raw box configurations before pillars and player
regions are considered. This is a sizing input, not a runtime guarantee.
Benchmark representative levels before deciding on runtime search.

Separate query requirements:

- **Par:** BFS may stop at the first winning state. Initial wins have par zero;
  exhausting the graph without a win returns UNSOLVABLE, not a numeric par.
- **Optimal count:** maintain shortest-path counts and process every predecessor
  layer contributing to the shortest winning depth. Sum counts over all winning
  states at that depth; a first-solution return is insufficient.
- **Dead-state fraction:** explore the entire reachable graph, treating wins as
  terminal. Traverse reverse edges from every win. States not reached by that
  reverse traversal are unsolvable; divide their count by all reachable states.
- **Pillar relevance:** modify the layout and reanalyse. Compare the selected
  metrics and inspect changed routes and solutions; equal par/count alone does
  not justify removal.

`requiresBackstop` would be universal for positive-par levels, and a pillar
cannot enable a shot by hiding an alternative target on the same ray. Neither
is a useful curriculum tag. Teaching labels must describe demonstrated placement
or reachability constraints and be checked against solutions and playtests.

## 2.8 Prototype order

1. Grid, valid entities, walking, and opaque-pillar targeting.
2. Pull-to-player movement and animation. Confirm that targeting and endpoints
   are readable before adding content tooling.
3. L detection, unlimited undo, reset, per-session best-score update, and
   no-pulls feedback. Keep legal-move teaching effects separate from rejected shots.
4. The current authored source set: four Learn rooms, three normal Puzzles
   rooms, and separate guided practice. Keep their exact layouts and graph
   evidence in §1.10; do not substitute the historical enclosure example for a
   shipped room.
5. Offline solver for par and full-graph analysis for every authored room, not
   only candidates whose metrics happen to be needed.
6. Iterate on level and tutorial emphasis from replay and play evidence. Decide
   whether to mine more content only after distinct positioning and ordering
   problems are demonstrated.

The prototype succeeds if players can predict where a pull ends, understand
why a firing position is unavailable, and encounter meaningful ordering choices.
Solver results establish reachability and move counts; playtests establish
whether those choices are readable and engaging. Reconsider the movement model
only if those experiments expose a specific limitation.

## 2.9 Formal methods and constraint-based exploration

Use these tools to investigate sequences, reachability, and teaching requirements,
not as prerequisites for the prototype. Start with an executable reference
resolver and exhaustive graph analysis. Picat and SMT counterexample searches
are more immediately useful here than a full theorem-prover development.

### Level construction with explicit requirements

**Candidate tool: Picat planning**, with results checked by the reference solver.
Search for layouts satisfying requirements rather than relying only on random
generation:

- A solution exists and the minimum is exactly a chosen number of pulls.
- A losing choice is reachable from the solvable starting position.
- That losing choice leaves legal pulls available, despite making a win unreachable.
- Removing a selected pillar changes solvability or the intended decision.
- Every optimal solution requires a specified edge departure or move ordering.

Distinguish “a solution demonstrates this technique” from “every optimal solution
requires this technique.” First establish a finite optimum, then search for an
equally short solution avoiding an explicitly defined technique predicate. A
counterexample disproves necessity; absence establishes necessity only among
optimal solutions, not among all solutions.

Finding a length-k solution alone does not establish par k: exclude shorter
solutions as well. Technique predicates involving move history need that history
or a sufficient monitor state; the ordinary gameplay key alone may not capture
them. Keep full-graph metrics and canonical shortest-solution counts in the graph
analyser unless the planning implementation explicitly supports their semantics.

### Verify player-region canonicalization

**First approach: exhaustive model checking.** The load-bearing abstraction is:
with the same boxes and level, player positions in the same reachable component
produce identical sets of canonical one-pull successors.

Check that:

- Equivalent starting positions have identical successor-key sets.
- A successor's region is computed from the actual firing tile after the pull.
- Reconstructed solutions can be replayed, including every intervening walk.
- Canonicalization preserves minimum pull distance compared with an uncollapsed
  reference search in which walking costs zero and pulling costs one.

An error here can corrupt par, solvability, and solution counts even when every
individual pull is legal. This merits more attention than proving the small
bounding-box win predicate in isolation.

### Challenge movement invariants

**Candidate tool: Z3.** Encode a valid board and one legal pull, then ask for a
counterexample to each property:

- The destination is adjacent to the player.
- The resulting state remains in bounds and has no overlapping entities.
- No new box adjacency is created along the movement axis.
- A moved box cannot gain membership of an outer edge.
- Direct endpoint calculation agrees with sliding toward the first blocker.

Keep board dimensions, pillar behaviour, and validity assumptions explicit.
A bounded result covers the encoded domain, not arbitrary board sizes. Repeat
these checks if targeting or movement rules change; counterexamples identify
which derived laws must change with them.

### Reverse construction

**Candidate tools: Prolog with finite-domain constraints, or Picat.** Represent
movement as a relation:

```
legalTransition(level, before, firingTile, direction, after)
```

The relation includes reachable walking to the firing tile, the forward pull,
and the resulting player position—not just box coordinates. Query genuine
predecessors of a solved position and verify their forward witnesses. Exploring
sequences requires tabling or explicit visited-state handling because cycles
are possible; ordinary forward pulls are not reverse-scramble operations.

### Adoption order and first experiment

1. Establish the reference resolver and graph analyser.
2. Check region equivalence and replay witnesses on finite boards.
3. Try Picat for levels with explicit teaching requirements.
4. Use SMT counterexample searches when changing rules.

Defer Lean/Coq unless the implementation or proof obligations justify them.
A proof about a separately handwritten model does not automatically verify the
game. Cross-check planner and constraint-model results against the executable
reference to detect model drift.

The first construction experiment: find a small solvable board where every
optimal solution requires a specified ordering, but another reachable choice
enters an unsolvable region that still contains legal pulls. Verify both claims
with the full graph. Whether players find that losing choice tempting—and the
lesson understandable—remains a playtesting question, not a solver predicate.
