# Labirinto de Cristal

A small push-and-flip puzzle game in TypeScript. You are a piece of one colour on a board of black and white tiles: tiles of the other colour are floor, tiles of your colour block you and can be pushed, and walking through a door (a dotted edge) flips your colour. Reach the crystal while you are the colour it shows. The web version is built now; a React Native (Expo) app that reuses the same engine is planned.

## Commands

- `npm install`, then `npm run build`: type-checks and bundles the site into `dist/` (esbuild). Netlify runs this.
- `npm test`: Vitest, about 10 s; the comparison test is the slow part.
- `npm run typecheck`: `tsc` only.
- `npm run solve -- <level id>`: shortest solution using the real engine. Only use it on small levels (the samples, new 4x4 to 7x7 boards). The 14 draft levels are open-ended, and searching them runs for a long time; the owner asked not to run solvers over them.
- Add `?debug` to the page URL to log every Redux action and its engine events to the console. Logging is on by default in every build except Netlify production (`__DEV__`, set in `scripts/build.mjs`).

## Layout

- `src/core/`: the rules engine. Pure TypeScript with no DOM, no Redux, no timers, no globals and no player-facing text. `move(state, direction)` returns `{ state, events }` and never mutates its input. Everything in `GameState` is plain JSON.
- `src/levels/`: levels as JSON (`drafts.json`, `samples.json`), listed in menu order by `index.ts`. Grid rows use `b` / `w`, uppercase for a crystal; doors are `[row, column, side]`.
- `src/web/`: the web shell. The Redux Toolkit store (`store.ts`) calls the engine, `render.ts` draws a `GameState`, `input.ts` maps keys and swipes to commands, `i18n.ts` holds the PT/EN text, and `logger.ts` is the dev logger.
- `src/tools/solver.ts`: breadth-first solver on top of the engine.
- `tests/`: engine, store and comparison tests. `tests/legacy/` is a verbatim copy of the original rules and levels, kept only so `compare.test.ts` can check the engine against them. Don't edit or restyle it.

## Rules the code must keep

Specs live outside the repo, in the project files: `specs/portal-spec.md` and `specs/goal-tile-spec.md`. The key points:

- Doors are stored on edges (`{ row, column, side: 'right' | 'down' }`), not on tiles. Their two sides always have different colours, so only one side can be pushed at a time. A pushed tile carries the doors on its four edges, including the one on its leading edge. The tile that slides back carries none. A flip moves no doors.
- A push is refused if, afterwards, any door would have the same colour on both sides or would face off the board (portal rule 6). Nothing can be pushed onto a crystal, but a crystal tile can itself be pushed.
- A push swaps whole tiles: the tile layer moves (colour, crystal), and a future board layer (pads, holes, walls) must stay put.
- Colours are game values (`'black' | 'white'`). Hex codes belong only in CSS.
- Winning sets `status: 'won'` once every crystal is collected, and further moves are blocked.
- New mechanics go into the engine as a new tile kind, tile property, door kind or win condition, never as a branch in the renderer. Bump `LevelData.version` when the level format changes.

## Code style (the owner's preferences)

- **Name every variable for what it holds**, including loop variables, callback parameters and destructured values: `door`, `tileIndex`, `direction`, `event`, `levelData`. No one- or two-letter names (`s`, `d`, `i`, `e`, `t`, `r`, `el`, `dx`) and no unclear abbreviations (`col` → `column`, `cols` → `columnCount`).
- Exceptions, agreed with the owner: well-known conventions stay short. That means `t()` for translations and the Redux shapes `(state, action)` in reducers and `store => next => action` in middleware. Generic type parameters still get descriptive names (`ElementType`, not `T`).
- **Arrays and other collections are plural** (`tiles`, `doors`, `movedDoors`, `pastStates`). A count is `somethingCount`, and a map is `valuesByKey`.
- Match the surrounding comment style: a short header comment per file and comments that explain why, not what.
- Keep the engine pure and covered by tests. A rule change gets a test in `tests/engine.test.ts`. If it deliberately changes old behaviour, also update the stop conditions in `tests/compare.test.ts` and say why there.

## Workflow

- The owner is Filipe (GitHub `Fitonho`). Work on a branch and open a PR to `master`. Netlify builds a preview at `deploy-preview-<N>--labirinto-de-cristal.netlify.app`. Only Filipe merges, and merging deploys https://labirinto-de-cristal.netlify.app.
- Before pushing, run `npm test` and `npm run build`. For UI changes, also open the built `dist/` in a browser at desktop and phone widths.
- Player-facing text needs both Portuguese and English entries in `src/web/i18n.ts`.
