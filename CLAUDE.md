# Labirinto de Cristal

A small push-and-flip puzzle game in TypeScript. You are a piece of one colour on a board of black and white tiles: tiles of the other colour are floor, tiles of your colour block you and can be pushed, and walking through a door (a glowing seam on an edge) flips your colour. Reach the crystal while you are the colour it shows. The game is one Expo (React Native) app that runs on Android, iOS and the web; Netlify serves its web export.

## Commands

- `npm install`, then `npm run build`: type-checks and exports the web version into `dist/` (`expo export`, via `scripts/build.mjs`). Netlify runs this.
- `npm start`: Expo dev server; scan the QR code with Expo Go on a phone. `npm run web` opens it in a browser.
- `npm run phone`: the production-like server for phone tests (`--tunnel ngrok --no-dev --minify --clear`); `npm run phone:dev` is the same in dev mode. Dev mode is 5 to 10 times slower, so judge speed with `npm run phone`.
- `npm test`: Vitest, about 10 s; the comparison test is the slow part.
- `npm run typecheck`: `tsc` only.
- `npm run solve -- <level id>`: shortest solution using the real engine. Only use it on small levels (the samples, new 4x4 to 7x7 boards). The 14 draft levels are open-ended, and searching them runs for a long time; the owner asked not to run solvers over them.
- Add `?debug` to the page URL to log every Redux action and its engine events to the console. Logging is on in dev (`__DEV__`) and in every web export except Netlify production (`EXPO_PUBLIC_DEBUG_LOGS`, set in `scripts/build.mjs`).
- Expo packages must match SDK 58: take versions from `node_modules/expo/bundledNativeModules.json` (`npx expo install` needs Expo's servers, which the cloud environment can't reach).

## Layout

- `src/core/`: the rules engine. Pure TypeScript with no DOM, no Redux, no timers, no globals and no player-facing text. `move(state, direction)` returns `{ state, events }` and never mutates its input. Everything in `GameState` is plain JSON.
- `src/levels/`: levels as JSON (`drafts.json`, `samples.json`), listed in menu order by `index.ts`. Grid rows use `b` / `w`, uppercase for a crystal; doors are `[row, column, side]`.
- `app/`: Expo Router screens. `_layout.tsx` creates the store; `index.tsx` is the game screen.
- `src/state/`: the Redux Toolkit store (`store.ts`), which calls the engine, the player's settings slice (`settings.ts`, saved whole by `src/ui/useSettings.ts`), and the dev logger (`logger.ts`). No React Native imports, so Vitest tests them.
- `src/ui/`: React Native components (`Board`, `BoardTile`, `Player` (the Pebble), `Crystal` (the Beacon star), `CollectBurst`, `LevelPicker`, `TouchPad` for the swipe and tap area under the board, `IconButton` for the switches and Undo/Restart), their animation hooks, and their pure helpers: `boardLayout.ts` (floor colour, box outline, door seams, tile size), `motion.ts` (slide, bump and flip timing from engine events), `pieceLooks.ts` (the Pebble's poses and eyes, the star's state and rings, all from engine events), `commands.ts` (keys, swipes and tap zones), `haptics.ts` and `sounds.ts` (which cue a move plays, and when; the web plays sounds through Web Audio in `webSounds.web.ts`), `i18n.ts` (PT/EN text), `theme.ts` (the only place with colour codes).
- `assets/sounds/`: the sound effects, written by `node scripts/make-sounds.mjs`. They are synthesised, so the repo owns them; change a sound in the script, rerun it and commit the files.
- `src/tools/solver.ts`: breadth-first solver on top of the engine.
- `tests/`: engine, store, UI helper and comparison tests. Tests import only pure TypeScript, never React Native components. `tests/legacy/` is a verbatim copy of the original rules and levels, kept only so `compare.test.ts` can check the engine against them. Don't edit or restyle it.

## Rules the code must keep

Specs live outside the repo, in the project files: `specs/portal-spec.md` and `specs/goal-tile-spec.md`. The key points:

- Doors are stored on edges (`{ row, column, side: 'right' | 'down' }`), not on tiles. Their two sides always have different colours, so only one side can be pushed at a time. A pushed tile carries the doors on its four edges, including the one on its leading edge. The tile that slides back carries none. A flip moves no doors.
- A push is refused if, afterwards, any door would have the same colour on both sides or would face off the board (portal rule 6). Nothing can be pushed onto a crystal, but a crystal tile can itself be pushed.
- A push swaps whole tiles: the tile layer moves (colour, crystal), and a future board layer (pads, holes, walls) must stay put.
- The board draws in layers: the floor is one rectangle, and every tile sits on it. Boxes (tiles in the player's colour) are inset with rounded corners (`BOX_INSET`, `BOX_CORNER_RADIUS`), so the floor between them is their outline; floor tiles are full squares in the floor colour. Don't go back to per-tile borders; they left seams on phones.
- A box's door side reaches the whole cell edge and curves out into it, and the door is a glowing half-pill seam on the floor side of that edge. A flip grows the old boxes into full tiles, swaps the floor and player colours halfway, then shrinks the new boxes out (`FLIP_GROW_DURATION`, `FLIP_SHRINK_DURATION`).
- Colours are game values (`'black' | 'white'`). Hex codes belong only in `src/ui/theme.ts`.
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
- To let Filipe test a branch on his phone, check it out on his Windows PC (Station-Fi) and run `powershell -ExecutionPolicy Bypass -File scripts/open-expo-window.ps1` there. It stops this project's old Expo and ngrok and starts `npm run phone` in a visible Windows Terminal tab, so he sees the exp:// address and QR code. Never start Expo as a hidden background job. `.claude/settings.json` allows that script and the `git fetch` / `git checkout -B claude/...` it needs without asking.
- Before pushing, run `npm test` and `npm run build`. For UI changes, also open the built `dist/` in a browser at desktop and phone widths. Native builds can't run in the cloud; Filipe checks them in Expo Go.
- Player-facing text needs both Portuguese and English entries in `src/ui/i18n.ts`.
