# Tether: Evaluation as a Small Puzzle Gift

## Goal and verdict

Tether is being made as a gift for one person who likes puzzles, with enough gameplay for a few levels—not a long campaign or an endlessly replayable commercial game.

**Verdict: the current game is a promising fit for that goal.** It needs a few satisfying discoveries and a clear ending, not a large catalogue of mechanics.

Its strongest interaction is already present: **the player's position determines where a box stops, but placing that box changes where the player can stand next.** That creates a coherent spatial puzzle rather than a collection of arbitrary restrictions.

The qualification is important: interesting choices have been demonstrated on **one board**, not yet across a level set. Four or five levels is a recommended scope, not a demonstrated content ceiling or a promise that the existing rules will produce that many distinct puzzles.

This evaluation applies the [gameplay best-practices guide](tether-gameplay-best-practices.md) to the CLI experience. The recipient's specific puzzle preferences and experience with grid puzzles are unknown; no difficulty rating is assumed from their general interest in puzzles.

## Evaluation against the practices

| Practice | Assessment | Implication for this gift |
|---|---|---|
| Clear, memorable central idea | **Strong** | Choosing the stopping position through the player's position, then forming an L, is compact enough to carry a short experience. |
| Depth from interacting rules | **Promising, demonstrated locally** | The enclosure and winning alternatives show placement, targeting, and access interacting meaningfully. |
| Consistent, predictable behaviour | **Strong rules; incomplete explanation** | Pulls behave consistently. The CLI help does not explain the adjacent stopping position or the L objective; understanding these should not require an external briefing. |
| Meaningful choices | **Present on the current board** | A pull can improve the apparent arrangement while destroying access. That is a consequential choice, not an arbitrary penalty. |
| Learning through discoveries | **Good material, not yet a progression** | Endpoint choice, cross-axis assembly, and access order provide different ideas to learn. They should not all arrive as one opening challenge. |
| Forgiving experimentation | **Strong** | Free walking and pull-based undo allow exploration without tedious recovery. This particularly suits a gift. |
| Difficulty and variety | **Still unproven across levels** | Two different three-pull wins are encouraging, but neither those wins nor the enclosure establishes how difficult the board will feel to the recipient. |
| Completion and refinement | **Good secondary loop** | Improving from four pulls to three felt natural during play. Optimisation should remain optional rather than become a condition for properly finishing. |

These are design judgements grounded in the observed game, not findings from recipient play or a broader audience study.

## What works particularly well

### The endpoint rule creates a genuine discovery

Initial CLI play included uncertainty about whether a pull moved a box one square or brought it all the way beside the player. Once the rule was clear, the problem changed: the player was choosing box destinations through their standing position.

That is a useful central insight. **Explain the movement rule; leave its useful consequences for the recipient to discover.** Hiding the rule is not necessary to preserve the puzzle.

### Progress is not simply bringing boxes closer together

The current enclosure board provides a concrete example:

- Pulling the upper-left box inward creates a potentially useful placement.
- Pulling the lower box toward the player afterward encloses the player without winning.
- A different continuation after the same first pull wins.

This makes the board about **order and future access**, not merely gathering three objects. Preserve that distinction when choosing the remaining levels.

### Undo supports the intended experience

Keep unlimited undo. Discovering a trap, understanding it, and recovering is legitimate puzzle-solving—not cheating.

For this gift, the recipient should feel invited to investigate rather than examined on their ability to simulate every consequence before acting. Pull-based undo also targets the meaningful commitment: moving a box, rather than walking to inspect another possibility.

## Main risks

### Several boards could turn out to be the same puzzle

**[INFERENCE]** The largest content risk is that spacious boards allow the same general approach repeatedly: bring boxes inward and assemble them. Different starting coordinates could then produce new execution without a new insight.

For a short gift, this is manageable. Each board only needs to contribute something distinct; there is no need to introduce another mechanic merely to manufacture variety.

### The current enclosure board is a questionable introduction

It combines the endpoint rule, an existing box adjacency, pillar obstruction, and a non-winning trap.

**Recommendation:** place it after a simpler introduction rather than make it the recipient's first encounter. Establish confidence in the rules before asking them to anticipate loss of access.

The CLI's `NO_PULLS` label is accurate but does not explain recovery. A message such as “No moving pulls remain. Undo or reset.” would make the consequence understandable without revealing a solution. This is a recommendation, not an implemented change.

### Optimisation could overshadow completion

A prominent par can turn “I solved your puzzle” into “I solved it, but apparently badly.”

Celebrate any valid solution first. Show a personal best unobtrusively; make a minimum-pull challenge optional. Only describe a score as the minimum once that has actually been established. The observed three-pull solutions do not, by themselves, prove optimality.

## Recommended shape of the level set

The following are **roles for levels, not validated layouts or a committed level count**:

| Position | Role | Intended experience |
|---|---|---|
| 1 | **An invitation** | One satisfying pull completes an L and establishes the stopping rule. |
| 2 | **A discovery** | The recipient chooses an approach that creates cross-axis adjacency. |
| 3 | **A sequencing puzzle** | A useful placement depends on preserving a later firing position. The current enclosure board is a candidate. |
| 4 | **A finale** | Familiar ideas combine so the recipient applies what they have learned, rather than encounters a surprise rule. |

A fifth level earns its place only if it offers another distinct insight—for example, a meaningful edge commitment or temporary displacement. **Four good levels are better than five with a repetitive extra board.**

These roles are not a universal difficulty ranking. The actual geometry, plausible alternatives, and clarity of each board will determine how it feels.

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

The next source of quality should be **a short sequence of distinct insights**, not additional mechanics. The current game has enough substance to justify that direction. The remaining question is whether the other boards each earn their place.

## Evidence and limits

This assessment draws on the [best-practices guide and its source trail](tether-gameplay-best-practices.md), the [existing gameplay design](../design-draft.md), and actual `pnpm cli` play:

- Completed the current level in four pulls, then improved to three.
- Reproduced the documented two-pull enclosure, which reported `NO_PULLS`.
- Used undo to restore `READY` at one pull.
- Completed two different three-pull solutions.
- Verified reset preserving the best score within the running CLI session.

The exact enclosure and solution sequences are recorded in the best-practices guide. Its command examples were also executed directly through the CLI.

No recipient play, full level sequence, optimality proof, or general human difficulty measurement underlies this evaluation. Proposed level roles, presentation changes, and personalisation are recommendations only. This document changes neither gameplay nor the interface.
