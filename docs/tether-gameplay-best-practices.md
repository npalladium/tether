# Tether: Gameplay Design Best Practices

A guide to the player experience: decisions, puzzle structure, teaching, difficulty, feedback, and replay value. It is not an implementation plan or a guide to prototyping, publishing, or running a development team.

**Central recommendation:** preserve Tether's small, consistent ruleset and build depth through access, placement, and move order. Make the rules easy to predict without making the solution obvious.

Source claims carry references; recommendations and quality criteria are this guide's design judgement, not findings established for Tether's audience. The external material is practitioner advice, not a universal formula for fun.

### A clear player promise

Jay Little's overview questions are **who you are, what you do, and how you win**. For Tether: you control a walker with a tether; reposition yourself to pull boxes toward you; arrange all three into an L anywhere on the board. No invented backstory is needed to make the role understandable. [B]

Little also asks what players should remember afterward. Recommended takeaways for this game are:

- **I choose where a box stops by choosing where I stand.**
- **A good placement must preserve the next useful position.**
- **I can experiment, recover, and find a cleaner solution.**

These are a focus for the experience, not three additional rules.

## 1. Ground the design in what the player actually does

**Current gameplay, verified through the CLI and current rules:**

- The board is 8×8, with three identical boxes, opaque pillars, and a walking player.
- Walking is orthogonal, restricted to reachable empty floor, and uncounted.
- A cardinal pull selects the first visible box and brings it all the way to the adjacent tile on that ray. The player stays still. Pillars block both walking and targeting; boxes behind the first box cannot be selected.
- Only pulls that move a box count. An adjacent box, a blocked ray, or an empty ray does not cost a pull.
- The goal is three cells of a 2×2 square: an L in any orientation, anywhere on the board. There are no designated destination tiles.
- Undo restores the state and count before the last successful pull, including the firing position. Walking does not create undo entries. Reset preserves the best score within the running CLI session.

These rules make the central decision **“Where must I stand, and what will moving this box make possible or impossible next?”**, not simply “Which box should move closer to the others?” [G]

Keep three consequences central to puzzle design:

1. **The player determines the endpoint.** A desired box destination needs an accessible firing tile one square beyond it, plus a clear ray to the box. Walls and pillars are not alternative stopping surfaces.
2. **New adjacency is built cross-axis.** A horizontal arrival can create vertical box adjacency, and vice versa. Pulling cannot create new adjacency along its movement axis: the player occupies one axial neighbour and the clear travel path leaves the other unoccupied. In particular, the last move cannot pull the L's corner into two already-positioned neighbours.
3. **Leaving an outer row or column is a commitment.** A box cannot return to that edge from the interior because the required firing position would be outside the board. Movement along an edge is still possible. “Irreversible” here means through ordinary moves; undo remains available. [G]

## 2. Give decisions depth, not administrative weight

Vit S distinguishes a meaningful choice from a merely calculable difference. A choice can technically affect the outcome yet feel unrewarding if its benefit is obscure and the mental arithmetic disproportionate. The same article argues for keeping decision-relevant information together and for making every rule earn its complexity. [M: “Clear focus,” “Value checks,” “Clear choices”]

**Application to Tether:** preserve the spatial reasoning; remove burdens unrelated to it.

- Keep walking free. Access should matter, but counting footsteps would introduce a second optimisation problem and make route execution compete with box planning.
- Favour pulls with understandable competing benefits: establish an adjacency now versus keep a corridor open; leave an edge versus retain an edge placement; move a screening box versus preserve its useful position.
- Treat the many reachable firing tiles as a menu of possible endpoints, not proof of many interesting choices. Different coordinates can lead to strategically equivalent results.
- Avoid adding currencies, consumable tethers, box-specific powers, timers, or extra scoring axes merely to increase apparent complexity. Each would need a clear player-facing benefit beyond making the existing problem harder to read.

**Quality criterion:** the player can explain why a tempting pull was useful and what it sacrificed. They need not know whether it was correct before trying it.

### Use “three” as a clarity heuristic, not a quota

Little explicitly presents the rule of three as a personal, adjustable guideline: enough options to support choices without overwhelming the player. His three core experience characteristics are **player count, length of play, and heuristics**—not a prescription for three actions or objects. [B]

Tether does not need a third verb to accompany walk and pull, exactly three legal moves per position, or exactly three optimal solutions. Three boxes are meaningful here because of the L objective, not because the article proves three is universally best.

The more useful application is Little's distinction between evaluating a position and choosing an action. Help players develop both:

- **Position evaluation:** which firing tiles can I reach, which rays are open, and which edge options remain?
- **Action evaluation:** what endpoint does this pull create, and what access or targeting does it change?

This gives a novice a way to think without giving them a rote solution.

### Count the loss of flexibility, but do not force an economy onto a puzzle

The Reddit guide and its linked point-system explanation treat actions as costs, and identify lost flexibility as a hidden cost of apparently profitable choices. Their examples exchange resources, reserve cards, or commit to collections. [R, R1]

**Transferable principle:** evaluate a move's opportunity cost, not just its immediate gain. In Tether, bringing boxes closer can surrender a useful ray, an edge option, or access to a firing tile. A visually tidy cluster is not necessarily a better position.

**Important limit:** the author's prescription to assign every resource a consistent point value is aimed at resource-based balancing. Do not translate it into “one adjacency is worth N reachable tiles” or assign every box position a fixed value. One particular firing tile can determine whether an entire plan works; ten unrelated empty tiles cannot necessarily replace it. Likewise, all successful pulls cost one on the score display but can have radically different strategic consequences.

Tether needs useful contrasts between choices, not equal-value moves. A forced move or a wrong move can belong in a good puzzle. The warning sign is a repeated, obvious recipe that removes the intended reasoning across boards—not merely that one move is better than another in a particular state. These are applications to Tether, not a claim that the Reddit author analysed spatial puzzles.

## 3. Keep the model predictable; leave the plan to the player

The Medium article's consistency example concerns players assuming that all abilities followed the same activation rule. An exception conflicted with their learned model even after explanation. Its transferable lesson is that presentation and behaviour should reinforce the same rules. [M: “Consistency checks”]

For Tether:

- Communicate that `pull N` looks north for a box; it does not move the box north. The box travels toward the stationary player.
- Explain “to the tile beside you,” not just “pull the box.” A long-distance pull should not be mistaken for a one-square step.
- Make the first visible box and pillar occlusion readable. Do not imply that the player can select a farther box through a nearer one.
- Show the L as three occupied cells of a 2×2 square, with rotation permitted. Avoid suggesting it must form at one location or that the player must stand in its missing corner.
- Distinguish an empty ray, pillar obstruction, and an already-adjacent target. These are different reasons for no movement, not arbitrary failures.

**Recommendation:** communicate the immediate action and its geometry clearly; keep future sequences for the player to reason about. An optional single-pull target/endpoint preview need not reveal a solution. Automatically displaying the best next move would reveal much more. These are different levels of assistance, not interchangeable “clarity.”

## 4. Build puzzles around access and order

A board should pose a spatial question, not merely require a prescribed amount of shuffling. The existing rules already couple target visibility, player access, and box placement. Use those interactions before adding another mechanic. [G; application of M's rule-value principle]

Useful puzzle motifs include:

| Motif | Player's question | What gives it substance |
|---|---|---|
| Cross-axis assembly | From which direction can I create this adjacency? | A visually close box may need to approach from a different axis. |
| Firing-position dependency | Where will I stand for the following pull? | A locally attractive placement occupies or cuts off a needed firing tile. |
| Screening | Which box can I actually target? | Moving the first box changes access to a farther one, possibly at a cost. |
| Edge commitment | Should I bring this box inward yet? | The move removes a future edge-placement possibility. |
| Temporary displacement | Must I undo apparent progress geometrically? | Breaking a useful arrangement opens a necessary route or ray. |
| Enclosure | Will I still have somewhere useful to go? | Boxes and pillars can isolate the player before the goal is achieved. |

These are **design recommendations**, not claims that the current single CLI level demonstrates every motif or that every motif must appear in every puzzle.

A pillar earns its place by affecting routes, targeting, a meaningful alternative, or the board's teaching purpose. Do not equate “removing it leaves one known solution intact” with “it is irrelevant”: it may shape the choices and failures around that solution. Equally, more pillars do not automatically mean a deeper puzzle.

## 5. Teach consequences through small, legible situations

The existing design draft proposes a progression from endpoint placement to cross-axis adjacency, edge commitment, opaque pillars, access order, and enclosure. This is a sensible content direction, not an already-delivered campaign. [G]

Recommended player-facing progression:

1. **First success:** a one-pull L demonstrates the endpoint rule and immediately recognisable victory. Keep the same three boxes and L objective used later.
2. **Assembly:** expose why adjacency must be made from the other axis. Let the player discover a useful position rather than memorise an unexplained prohibition.
3. **Commitment and recovery:** demonstrate an edge departure and make undo available as part of normal reasoning.
4. **Occlusion:** use a clearly relevant pillar so the player must find another route or firing angle.
5. **Order:** make two individually plausible placements differ in whether a later firing tile remains accessible.
6. **Combination:** combine already-understood ideas, including a recoverable non-winning enclosure.

Do not treat this as a mandatory difficulty ranking. For example, an edge lesson with many plausible destinations can be harder than a plainly visible pillar. Each early board should have one dominant insight, even though all the underlying rules remain active.

**Quality criterion:** after solving, the player can describe a reusable idea—not only repeat the coordinates of the solution.

## 6. Make difficulty about reasoning, not inconvenience

**Recommendation:** distinguish solution length from conceptual difficulty. The existing draft already treats par, solution count, and dead states as different properties rather than interchangeable difficulty measures. [G]

A short puzzle can require a difficult reorganisation; a long puzzle can be a series of obvious pulls. Judge the experience through:

- **Planning dependency:** how many later placements rely on the current decision?
- **Plausible alternatives:** are wrong turns attractive for intelligible reasons, or simply numerous?
- **Perceptual clarity:** can the player see the relevant ray, corridor, and endpoint?
- **Recovery distance:** after understanding a mistake, how much replay is needed to act on that understanding?
- **Insight reuse:** does the next board develop an idea, or just repeat its execution?

Avoid using extra walking, a visually cluttered board, hidden exceptions, more dead ends, or higher pull counts as automatic substitutes for difficulty. Do not require a unique solution merely for neatness. Alternative solutions can reward understanding of the system.

### Preserve uncertainty about the solution, not about the rules

Little distinguishes uncertainty, randomness, and luck in his design framework. Costikyan's *Uncertainty in Games*, recommended in that thread, includes analytic complexity among the sources of uncertainty described by its publisher. Neither provides a reason to add random outcomes to every game. [B, U]

**Application:** Tether's uncertainty is the player's unresolved plan on a visible, deterministic board. Keep it there. A clear pull preview can remove a misunderstanding without explaining the future sequence; a random pull distance would instead undermine the endpoint reasoning on which the game rests. Prefer surprises that follow from known rules over unpredictable rule outcomes.

## 7. Let mistakes teach without punishing exploration

Unlimited undo fits a deterministic puzzle with irreversible ordinary moves. It lets the player investigate a spatial hypothesis and revise it after seeing the consequence. Preserve that relationship instead of treating undo use as a moral failure or a reason to withhold completion. [G; recommendation]

- Keep undo tied to a successful pull, not every walking command. The meaningful commitment is the box movement.
- Preserve best score through reset within the current session. A fresh attempt should invite refinement rather than erase achievement.
- Separate **no legal moving pull anywhere reachable** from **no possible solution**. The former does not justify a general unsolvability claim about every position with legal moves remaining.
- Give a recoverable trapped state an understandable explanation and access to undo/reset. Do not force a restart.
- Recognise a completed L immediately. Escaping afterward is not part of this goal.

Potential hints should preserve agency: first restate a relevant rule, then direct attention to a route or firing position, and only finally offer a move if requested. This is a proposed assistance policy, not a description of implemented hints.

## 8. Reward completion first, refinement second

The observed replay loop was useful: an initial four-pull completion was improved to three by choosing a better first stopping position. That is concrete evidence that this level supports refinement—not evidence of a universal replay loop or of an optimal three-pull solution. [G]

**Recommendation:** make solving the primary achievement and fewer pulls an optional second challenge.

- Show current pulls and personal best without implying that a non-minimal solution is a failure.
- If an actual minimum has been established, label it as par; otherwise do not promote a discovered score into an optimality claim.
- Avoid a timer in the core mode. It would reward speed alongside the existing spatial-planning objective.
- Seek replay through a new insight, a different solution, or a cleaner sequence—not compulsory repetition of known walking routes.

Little's “atom of play” asks for the smallest increment that delivers a satisfying experience. [B] For Tether, a recommended content target is a compact puzzle with a recognisable insight and a clear finish—not a mandated number of minutes or pulls. Let a session end comfortably after a level, and let later levels introduce new uses of known rules rather than simply prolonging the same manoeuvre.

The CLI currently starts a fresh session when launched. Best-score preservation across process restarts is a design-draft aspiration, not something established by these CLI sessions.

## 9. A concrete lesson from the current level

Coordinates are `(x, y)`, east and south increasing. The CLI starts the player at `(0,0)`, with boxes at `(1,0)`, `(2,0)`, `(2,3)` and a pillar at `(3,1)`.

### A plausible-looking placement can remove all access

```text
walk 1 2
pull N
walk 2 1
pull S
```

The first pull places a box at `(1,1)`. The second places one at `(2,2)`, leaving the player at `(2,1)` surrounded by those boxes, the box at `(2,0)`, and the pillar at `(3,1)`. The boxes are not an L. The live CLI reported `Phase: NO_PULLS` at two pulls; `undo` restored `READY` at one pull.

The teaching value is the visible connection between the move and the lost access. The sequence is verified; whether a new player naturally chooses it is not established.

### The same first pull admits a winning continuation

After undoing the second pull:

```text
walk 0 0
pull E
walk 2 0
pull S
```

The live CLI reported `WON` at three pulls. A different fresh-start solution also won in three:

```text
walk 1 3
pull N
walk 0 3
pull E
walk 2 3
pull N
```

This supports three bounded conclusions: move order matters on this board; a losing branch can be recovered without restarting; and the board permits different successful three-pull sequences. It does not establish the minimum, a human difficulty rating, or the quality of a full level set.

## 10. Priorities for Tether's player experience

In order of relevance to the game as played:

1. **Explain the actual contract at the point of play.** The CLI help currently lists commands but does not explain the adjacent stopping tile or the L objective. Make those fundamentals available without requiring an external description.
2. **Let geometry supply the challenge.** Use the existing pull rule, cross-axis assembly, and access dependencies to create different insights before introducing another verb or box type.
3. **Make recovery understandable.** The verified enclosure currently reports `NO_PULLS`; an explanation that no moving pull is available and that undo/reset remain possible would teach more than a phase label alone.
4. **Separate solving from mastery.** Preserve completion, optional pull optimisation, and different successful solutions. Do not add time pressure or enforce an unverified par.
5. **Keep quality criteria qualitative where they need to be.** A small move count, three choices, equal numerical values, or a unique solution is not a substitute for a readable and worthwhile decision.

These are gameplay recommendations only; no rules or interface changes accompany this guide.

## Sources and evidence

### Local gameplay evidence

**[G]** [Existing design draft, Part 1](../design-draft.md), [shared playable level](../src/level.ts), [pull rules](../src/game/pull.ts), [goal and reachability rules](../src/game/board.ts), [session rules](../src/game/session.ts), and [CLI behaviour](../src/cli/game.ts). The gameplay examples above were exercised with `pnpm cli` on 2026-09-13, including blocked/adjacent rejected pulls, the enclosure, undo, both winning sequences, and reset preserving the in-session best. CLI play also established the earlier four-to-three-pull improvement. The design draft includes proposals beyond the current CLI; this guide distinguishes them from observed behaviour.

### External reading

**[M]** Vit S, [“Board game design”](https://medium.com/@vstarush/board-game-design-29c6f9a72219). Article text read; useful sections are “Clear focus,” “Consistency checks,” “Value checks,” and “Clear choices.” Its multiplayer War Hands examples are the author's reported experience, not controlled evidence or universal cognitive limits. The applications to a solo spatial puzzle are this guide's synthesis.

The article's substantive outgoing link is Extra Credits, [“Fail Faster — A Mantra for Creative Thinkers”](https://www.youtube.com/watch?v=rDjrOaoHz9s). Its title and description were accessible, but not a transcript. It concerns creative iteration and is excluded from the gameplay recommendations; no claims here rely on unseen video content.

**[B]** Jay Little, [“Game Design 101 >> The Power of Three”](https://boardgamegeek.com/thread/1320424/game-design-101-the-power-of-three), posted 2015-02-14. Current BGG access returned HTTP 403; the full article and three replies were read in the [2015-09-22 archived copy](https://web.archive.org/web/20150922232752id_/http://boardgamegeek.com/thread/1320424/game-design-101-power-three). The archived slug differs, but the thread ID, title, and author match. The personal-guideline caveat is part of the article, not an added qualification.

**[U]** Greg Costikyan, [*Uncertainty in Games*—MIT Press description](https://mitpress.mit.edu/9780262527538/uncertainty-in-games/), read through an [accessible text rendering of the publisher page](https://r.jina.ai/https://mitpress.mit.edu/9780262527538/uncertainty-in-games/). This supports the limited claim about analytic complexity and different sources of uncertainty. The full book was not read; Tether-specific applications are not attributed to Costikyan.

**[R]** u/TigrisCallidus, [“Guide: How to start making a board game and balance it.”](https://www.reddit.com/r/gamedesign/comments/116modg/guide_how_to_start_making_a_board_game_and/). Current Reddit routes returned a shell or access denial; the actual post and available discussion were read in the [2023-02-23 archived copy](https://web.archive.org/web/20230223031005id_/https://www.reddit.com/r/gamedesign/comments/116modg/guide_how_to_start_making_a_board_game_and/). This is predominantly an inspiration, workflow, and mathematical-balancing guide. Its strong math-first prescriptions are the author's position, not a consensus; a reply explicitly challenges its dogmatic assertions. This guide uses the opportunity-cost insight but does not import the workflow or resource-equality prescription.

**[R1]** The same author's linked [“Creating a Point Based System” explanation](https://www.reddit.com/r/gamedesign/comments/116modg/comment/j979h86/) and its “Creating a Point based Model in Detail Part 1” continuation (`j979j2x`). These are readable in the archived discussion above; the [dedicated archived explanation](https://web.archive.org/web/20230219201354id_/https://www.reddit.com/r/gamedesign/comments/116modg/comment/j979h86/) also preserves the resource-model discussion. The concrete source basis is its treatment of actions as resources, flexibility as a hidden cost, and resource-conversion loops—not a general proof that everything valuable in a game is interchangeable.

The point-system section also links an earlier [balancing-resource collection](https://www.reddit.com/r/tabletopgamedesign/comments/v75py8/comment/ibjdalh/), read in its [2022-06-07 archive](https://web.archive.org/web/20220607215357id_/https://www.reddit.com/r/tabletopgamedesign/comments/v75py8/comment/ibjdalh/). It explicitly presents a mathematical model as a starting point whose flaws and nuances still require play experience. The target thread also contains a reader's question about how a single point value could capture a Gloomhaven card's initiative and multiple actions; this reinforces the need to state the limits of the analogy, rather than treating the author's prescription as settled theory.

### Referenced material followed beyond the articles

Little's thread lists books as plain-text recommendations, not outgoing article hyperlinks. In addition to the Costikyan publisher description:

- [*Characteristics of Games*—Google Books overview](https://books.google.com/books?hl=en&id=Yyw3AgAAQBAJ): overview and contents available; confirms its broad, player-centred treatment of game characteristics. No unseen chapter-level claims are used.
- [*The Art of Game Design*—Schell Games](https://schellgames.com/art-of-game-design): official book/deck/app overview available; useful as a further-reading pointer, not evidence that the full book was read.
- [*The Kobold Guide to Board Game Design*—Kobold Press](https://koboldpress.com/kobold-guide-to-board-game-design/): official overview available; the recommendation comes from a thread reply. Its design/development/presentation overview contributes no separate gameplay prescription here.
- *Challenges for Game Designers*: named in Little's recommendations; full text was not verified and no claims are drawn from it.

The Reddit guide's linked inspiration and workflow subposts were also followed in archived form. Its inspiration trail includes the BGG mechanics directory, example board games, digital games, and media; these are sources of comparison rather than prescriptions for Tether. Its detailed card-economy, trading-card-game, RPG, unit-cost, and resource-scaling branches concern systems Tether does not have and were not exhaustively traversed. The relevant point-system material is covered in [R1]. This is a relevance-filtered reading trail, not a claim to have read every recursively linked page.

For a concrete continuation of that trail, the [archived workflow subpost](https://web.archive.org/web/20230219201507id_/https://www.reddit.com/r/gamedesign/comments/116modg/comment/j979mzy/) makes clear that its numerical values are internal, not a score the player must see. Its workflow instructions are excluded from this gameplay guide.

Navigation, storefront, social, and account links were excluded. Process-only material was not converted into gameplay advice.
