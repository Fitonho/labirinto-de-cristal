---
name: make-levels
description: Make new puzzle levels with the level generator, check them against the level rules, and, when Filipe picks some from the Lab, move them into a chapter with their tests, par, names and fingerprints. Use for "make levels", "generate boards", "fill the Lab", "keep Lab 19", "add this level to a chapter".
---

# Make and test levels

Two jobs that follow each other: **generate** boards into the Lab for Filipe to play, then **promote** the ones he keeps into a chapter. Do only the job that was asked. Filipe judges which levels are good; never promote a level he hasn't picked.

## Rules that every level keeps

- **Every piece matters.** Every portal is needed to win. With two stars, each star alone needs a push. No free star, no spare box that changes nothing. The generator checks the portals and stars; look at the board yourself for anything else that does nothing.
- **Each idea gets an easy teaching level, then at least one harder one** (a new shape, or combined with an earlier idea), so the idea card never gives a chapter away.
- **Par is the shortest solution**, or `Math.ceil(shortest × 1.1)` in the challenges. Par is not difficulty: Filipe rates levels by the thinking they take, not their length.
- **Solvers only on small new boards** (4x4 to 7x7, chapters 1 to 4, the challenges). Never run `npm run solve` or `shortestWin` over the 9x9 labyrinths (`drafts.json`): they are open-ended and take very long.

## Generate

1. Turn the ask into options for `npm run generate -- ...` (run it with no options for the full help):
   - `--size CxR` (required). 4x4 to 6x6 is quick; 7x7 is about the largest that stays practical.
   - `--needs` from `push`, `portal`, `carry` (a push moves a portal), `star-push`. `carry` and `star-push` need a portal; the default adds one.
   - `--stars 2`, `--portals N`, `--par MIN-MAX`, `--count`, `--time` (seconds), `--tag` (a word for the ids, e.g. `portals-5x5`), `--append` (keep what's in the Lab; without it the Lab is replaced).
   - Ask before replacing a Lab Filipe is still reviewing (see `notes/lab-review.md` in the project files). When in doubt, use `--append`.
2. Size the run so it stays short: about 40 s per 5x5 level, more on bigger boards. Par ranges that worked before are in `scripts/generate-batches.mjs`, by idea and size. Pure push 6x6 at 15–30 and 7x7 boards are rare, so give those a longer `--time` or fewer levels.
3. For a big spread (dozens of levels), use `node scripts/generate-batches.mjs [seconds per batch]` on Station-Fi, which has 20 cores, through a Remote Control session. It replaces the whole Lab.
4. Read what landed in `src/levels/lab.json`: size, par, portal count, solution. In each solution, count the pushes and flips, and notice boards whose solution is mostly walking. Drop a board that breaks a rule above and say why.
5. Run `npm test`. The Lab has no fingerprints and no solution tests, so new Lab levels don't need them.
6. Report: one line per level with its Lab number, id, size, par, and what the solution uses (pushes, flips, star pushes). Add the `?board=` links the generator printed, pointed at the PR's Netlify preview (`https://deploy-preview-<N>--labirinto-de-cristal.netlify.app/?board=...`) once there is one. Don't rate difficulty yourself; Filipe plays them.
7. Commit `lab.json` on the branch and open or update the PR, so Filipe can play the Lab on the preview or on his phone (see the `phone-test` skill).

## Promote a Lab level into a chapter

When Filipe says which Lab levels to keep and where:

1. Copy the board from `lab.json` into the chapter file (`first-steps.json`, `portals.json`, `crystals.json`, `moving-portals.json`, `challenges.json`): `version`, a new readable `id` that says what the level is about (not the `lab-...` id), `par`, `chapter`, `order`, `grid`, `start`, `portals`. Leave out `solution`. Renumber `order` for the levels after it.
2. Add `[id, solution in uppercase, shortest move count, searchAgain]` to `solutions` in `tests/engine.test.ts`, in menu order. Set `searchAgain` to true on small boards so the test checks no shorter solution exists. The test also checks par.
3. Add the level's name to `src/ui/i18n.ts` in Portuguese and English (`'levelName.<id>'`). Ask Filipe for names if he hasn't given them, or offer two or three.
4. If the level brings in an idea, add it to `ideaCardsByLevelId` in `src/ui/levelIdeas.ts` with what should glow, written as data. Its tip must show the rule, not this level's solution.
5. Run `node scripts/level-fingerprints.mjs` for the new id. Never change an existing board under its old id: saved bests are kept by id. A changed board gets a new id.
6. Take the level out of `lab.json` if Filipe wants the Lab tidy (ask), and update his notes in `notes/lab-review.md` in the project files.
7. Run `npm test` and `npm run build`, then commit with the level names in the message.
