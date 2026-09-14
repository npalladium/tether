# Tether: Evaluation as a Small Puzzle Gift

## Goal and verdict

Tether is being made as a gift for one person who likes puzzles, with enough gameplay for a few levels—not a long campaign or an endlessly replayable commercial game.

**Verdict: the current game is a promising fit for that goal.** It needs a few satisfying discoveries and a clear ending, not a large catalogue of mechanics.

Its strongest interaction is already present: **the player's position determines where a box stops, but placing that box changes where the player can stand next.** That creates a coherent spatial puzzle rather than a collection of arbitrary restrictions.

The qualification is important: deep placement and access choices have been
demonstrated on a **historical enclosure example**, not yet across a complete
authored set. The current source-level inventory, including the selected default
and any practice layout, is maintained in the design draft. A short sequence is
a recommendation, not a claim that a campaign already exists or that the rules
will automatically yield a particular number of distinct puzzles.

This evaluation applies the [gameplay best-practices guide](tether-gameplay-best-practices.md)
to the implemented rules and historical CLI evidence. The recipient's specific
puzzle preferences and experience with grid puzzles are unknown; no difficulty
rating is assumed from their general interest in puzzles.

## Evaluation against the practices

| Practice | Assessment | Implication for this gift |
|---|---|---|
| Clear, memorable central idea | **Strong** | Choosing the stopping position through the player's position, then forming an L, is compact enough to carry a short experience. |
| Depth from interacting rules | **Promising, historically demonstrated** | The enclosure and winning alternatives show placement, targeting, and access interacting meaningfully; they do not assess the current default by themselves. |
| Consistent, predictable behaviour | **Strong rules; presentation must explain them** | Pulls behave consistently. The adjacent stopping position, first-visible target, opaque pillar blocking, and L objective should be clear at the point of play. |
| Meaningful choices | **Demonstrated in a historical example** | A pull can improve the apparent arrangement while destroying access. That is a consequential choice, not an arbitrary penalty. |
| Learning through discoveries | **Material for an arc, not proof of one** | Endpoint choice, cross-axis assembly, and access order need distinct authored rooms rather than one opening challenge. |
| Forgiving experimentation | **Strong** | Free walking and pull-based undo allow exploration without tedious recovery. This particularly suits a gift. |
| Difficulty and variety | **Requires per-room graph evidence and play** | Historical three-pull wins and the enclosure do not establish how any authored sequence will feel to the recipient. |
| Completion and refinement | **A historical secondary loop** | Improving the historical enclosure replay from four pulls to three suggests refinement can be optional rather than a condition for finishing. |

These are design judgements grounded in the observed game, not findings from recipient play or a broader audience study.

## What works particularly well

### The endpoint rule creates a genuine discovery

Initial CLI play included uncertainty about whether a pull moved a box one square or brought it all the way beside the player. Once the rule was clear, the problem changed: the player was choosing box destinations through their standing position.

That is a useful central insight. **Explain the movement rule; leave its useful consequences for the recipient to discover.** Hiding the rule is not necessary to preserve the puzzle.

### Progress is not simply bringing boxes closer together

The historical enclosure example provides a concrete counterexample:

- Pulling the upper-left box inward creates a potentially useful placement.
- Pulling the lower box toward the player afterward encloses the player without winning.
- A different continuation after the same first pull wins.

This establishes that the rules can express order and future access, not merely
gathering objects. It does not make the example a current room, a first level,
or a demonstrated player-facing lesson.

### Undo supports the intended experience

Keep unlimited undo. Discovering a trap, understanding it, and recovering is legitimate puzzle-solving—not cheating.

For this gift, the recipient should feel invited to investigate rather than examined on their ability to simulate every consequence before acting. Pull-based undo also targets the meaningful commitment: moving a box, rather than walking to inspect another possibility.

## Main risks

### Several boards could turn out to be the same puzzle

**[INFERENCE]** The largest content risk is that spacious boards allow the same general approach repeatedly: bring boxes inward and assemble them. Different starting coordinates could then produce new execution without a new insight.

For a short gift, this is manageable. Each board only needs to contribute something distinct; there is no need to introduce another mechanic merely to manufacture variety.

### The historical enclosure is not an introduction

It combines the endpoint rule, an existing box adjacency, opaque-pillar
obstruction, and a non-winning trap. Fresh exhaustive analysis finds only 43
no-win states among 10,500 reachable canonical states (0.41%), so the trap
should be retained as a documented counterexample, not relied on as a likely
discovery.

**Recommendation:** place any intentional enclosure only after simpler,
independently verified rooms establish the rules. Explain `NO_PULLS` as no moving
pull remaining with undo/reset available; do not rely on a raw phase label.

### Optimisation could overshadow completion

A prominent par can turn “I solved your puzzle” into “I solved it, but apparently badly.”

Celebrate any valid solution first. Show a personal best unobtrusively; make a
minimum-pull challenge optional. Only describe a score as the minimum once
exhaustive analysis has established it. The historical three-pull solutions
alone did not prove their score optimal; the later graph audit did.

## Recommended content shape

The following are **authoring roles, not a claim that a full campaign exists**:

| Segment | Role | Required evidence or experience |
|---|---|---|
| Separate practice | **Guided tutorial** | The authored `guided-first-pull-v1` isolates start `(2,2)` → walk south to `(2,3)`, inspect the only legal cue action (east target `(6,3)`, endpoint `(3,3)`), then explicitly pull to a one-pull L. It has no pillars and is not a scored normal room. |
| Current teaching group | **Endpoint, targeting, occlusion** | Four authored Learn rooms cover direct endpoint choice, firing-position endpoint choice, first-visible targeting, and an opaque `BLOCKED` ray. They do not yet demonstrate every proposed teaching role. |
| Proposed teaching arc | **Commitment and order** | Edge commitment and later-firing-tile preservation, with undo available. |
| Proposed teaching arc | **Recoverable enclosure** | Only after the relevant rules are learned; validate the branch and its legibility separately. |
| Current application group | **Three normal rooms** | `open-corners-v1`, `screening-line-v1`, and `turning-room-v1` are graph-verified applications of known rules, not new mechanics. They meet the requested 2–5 normal-room count; their coordinates, replays, and metrics are inventoried in the design draft. |
| Additional application | **Up to two more normal rooms** | Add only if they combine known rules without a new lesson and receive the same valid definition, replay, solvability, par, and canonical shortest-solution evidence. |

These roles are not a universal difficulty ranking. The actual geometry,
plausible alternatives, and clarity of each room determine how it feels.

## What changes because it is a gift

The recipient does not need proof that Tether is commercially novel or endlessly extensible. The experience should feel deliberately chosen for them:

- A welcoming first success.
- A small sequence of increasingly interesting discoveries.
- Freedom to get stuck and recover without pressure.
- An unmistakable, personal ending.

Personal level names or a closing message could make the experience feel theirs without compromising puzzle clarity. Keep personalisation outside the rules unless it genuinely helps communicate them.

Do not assume that liking puzzles means wanting a timer, harsh penalties, a mandatory optimal solution, or a difficult opening level.

## Recommendation

Keep the two verbs, three identical boxes, deterministic pulls, free walking, and unlimited undo.

The next source of quality should be **a verified sequence of distinct insights
followed by normal application rooms**, not additional mechanics. The remaining
question is whether each authored room earns its place through its replay and
graph evidence, then through player experience.

## Evidence and limits

This assessment draws on the [best-practices guide and its source trail](tether-gameplay-best-practices.md),
the [existing gameplay design](../design-draft.md), and **historical** `pnpm cli`
play of the enclosure:

- Completed the historical enclosure in four pulls, then improved to three.
- Reproduced its documented two-pull enclosure, which reported `NO_PULLS`.
- Used undo to restore `READY` at one pull.
- Completed two different three-pull solutions.
- Verified reset preserving the best score within that running CLI session.

The exact historical enclosure and solution sequences are recorded in the
best-practices guide. Fresh engine replay and full-graph analysis now establish
its par 3 and terminal branch properties, but no recipient play, full authored
sequence, or general human difficulty measurement underlies this evaluation.
Proposed roles and presentation changes are recommendations only. This document
changes neither gameplay nor the interface.
