// The game screen: on top the back arrow up to the chapter's levels, the level's
// number, name and chapter, and the sound, colours and ⋯ buttons; then the
// board, Restart, the move counter and Undo over the touch area, and the result
// sheet that rises over two thirds of the screen once the level is won. Levels
// that bring in an idea open with the new-idea card. Home is drawn over all of
// it, so its Continue reveals this screen as it is. Plays the move's sound and
// vibration. All game changes go through the Redux store. The board and the app
// around it take their colours from the level's palette.
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, PixelRatio, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { directionsFor, LAB_CHAPTER } from '../src/levels/lab';
import { chapters, labSolutionsByLevelId, levels } from '../src/levels/index';
import { otherUnsolvedLevelOpen } from '../src/state/levelProgress';
import { sessionActions } from '../src/state/session';
import { settingsActions } from '../src/state/settings';
import { actions, selectNextPaletteId, selectPaletteId, type RootState } from '../src/state/store';
import { AppColoursProvider } from '../src/ui/AppColours';
import { Board } from '../src/ui/Board';
import { tileSizeFor, touchPadHeightFor } from '../src/ui/boardLayout';
import { ColourPicker } from '../src/ui/ColourPicker';
import type { Command } from '../src/ui/commands';
import { Home } from '../src/ui/Home';
import { levelNameFor, t, type StringKey } from '../src/ui/i18n';
import { IconButton } from '../src/ui/IconButton';
import { IdeaCard } from '../src/ui/IdeaCard';
import { IdeaGlow } from '../src/ui/IdeaGlow';
import { IDEA_CARD_CLOSE_DURATION, ideaCardsByLevelId, ideaHighlightFor, opensIdeaCard, opensStuckTip, type IdeaHighlight } from '../src/ui/levelIdeas';
import { openChapterFromGame, openChapters } from '../src/ui/levelsNavigation';
import { MoreSheet } from '../src/ui/MoreSheet';
import { ResultCard } from '../src/ui/ResultCard';
import { appColoursFor, boardPalettes, PALETTE_FADE_DURATION } from '../src/ui/theme';
import { TouchPad } from '../src/ui/TouchPad';
import { useHaptics } from '../src/ui/useHaptics';
import { useKeyboardCommands } from '../src/ui/useKeyboardCommands';
import { useSettings } from '../src/ui/useSettings';
import { useSounds } from '../src/ui/useSounds';
import { winResultFor } from '../src/ui/winResult';

/**
 * Height kept free of the board besides the touch area: the header, the Undo
 * and Restart row, and the padding and gaps between them, with a little room
 * for a header that wraps in a large font.
 */
const CONTROLS_HEIGHT = 172;
/** Time between the moves the Solve button plays, long enough to follow each slide. */
const SOLVE_STEP_INTERVAL = 320;

export default function GameScreen() {
  const dispatch = useDispatch();
  const { history, events, language, levelIndex, steps } = useSelector((rootState: RootState) => rootState.game);
  const { homeOpen, homeExit } = useSelector((rootState: RootState) => rootState.session);
  const bestMovesByLevelId = useSelector((rootState: RootState) => rootState.progress.bestMovesByLevelId);
  const state = history.present;
  const level = levels[levelIndex];
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [moreVisible, setMoreVisible] = useState(false);
  const [colourPickerVisible, setColourPickerVisible] = useState(false);
  const { soundOn, vibrationOn, tapMovesOn, paletteChoice, toggleSound, toggleVibration, toggleTapMoves, choosePalette } = useSettings();
  // False while the levels screen covers this one, so its keys go to that screen.
  const isFocused = useIsFocused();
  const boardPalette = boardPalettes[useSelector(selectPaletteId)];
  const nextPaletteId = useSelector(selectNextPaletteId);
  const lastWin = useSelector((rootState: RootState) => rootState.progress.lastWin);
  const won = state.status === 'won';
  const isLastLevel = levelIndex === levels.length - 1;
  const chapterDone = isLastLevel || levels[levelIndex + 1].chapter !== level.chapter;
  const levelName = levelNameFor(language, level.id, level.order);
  const chapterName = t(language, `chapter.${level.chapter}` as StringKey);
  const ideaCard = ideaCardsByLevelId[level.id] ?? null;
  const idea = ideaCard?.idea ?? null;
  const [ideaCardOpen, setIdeaCardOpen] = useState(false);
  // The card shows the stuck tip instead of the level's idea while this is on.
  const [stuckTipShowing, setStuckTipShowing] = useState(false);
  const stuckTipSeen = useSelector((rootState: RootState) => rootState.settings.stuckTipSeen);
  const [ideaKeyPressCount, setIdeaKeyPressCount] = useState(0);
  const [ideaGlowCount, setIdeaGlowCount] = useState(0);
  const [ideaHighlight, setIdeaHighlight] = useState<IdeaHighlight | null>(null);
  // Read through refs, so the card opens only when the level changes or home closes, not on every move.
  const openingFacts = useRef({ bestMovesByLevelId, steps });
  openingFacts.current = { bestMovesByLevelId, steps };
  useEffect(() => {
    if (homeOpen) return;
    setStuckTipShowing(false);
    setIdeaCardOpen(opensIdeaCard(level.id, openingFacts.current.bestMovesByLevelId, openingFacts.current.steps));
  }, [level.id, homeOpen]);
  // The board is read through a ref, so a move doesn't hand the card a new handler and redraw it.
  const presentStateRef = useRef(state);
  presentStateRef.current = state;
  const stuckTipShowingRef = useRef(stuckTipShowing);
  stuckTipShowingRef.current = stuckTipShowing;
  const closeIdeaCard = useCallback(() => {
    setIdeaCardOpen(false);
    if (stuckTipShowingRef.current) {
      // Back to the level's own idea once the card has folded away, so the name in the header reopens that.
      setTimeout(() => setStuckTipShowing(false), IDEA_CARD_CLOSE_DURATION);
      return;
    }
    if (ideaCard) setIdeaHighlight(ideaHighlightFor(ideaCard.glow, presentStateRef.current));
    setIdeaGlowCount((count) => count + 1);
  }, [ideaCard]);
  const ideaCardOpenRef = useRef(ideaCardOpen);
  ideaCardOpenRef.current = ideaCardOpen;
  const homeOpenRef = useRef(homeOpen);
  homeOpenRef.current = homeOpen;
  // Lab levels have a Solve button that plays their shortest solution from the start, one move at a time.
  const labSolution = labSolutionsByLevelId[level.id] ?? null;
  const [solving, setSolving] = useState(false);
  useEffect(() => setSolving(false), [level.id]);
  useEffect(() => {
    if (!solving || !labSolution) return;
    dispatch(actions.reset());
    const directions = directionsFor(labSolution);
    let moveIndex = 0;
    const timer = setInterval(() => {
      if (moveIndex >= directions.length) {
        setSolving(false);
        return;
      }
      dispatch(actions.move(directions[moveIndex]));
      moveIndex += 1;
    }, SOLVE_STEP_INTERVAL);
    return () => clearInterval(timer);
  }, [solving, labSolution, dispatch]);
  // A player who keeps restarting one level hears, once ever, that they can leave it for later.
  useEffect(() => {
    if (homeOpen || ideaCardOpenRef.current) return;
    const solved = bestMovesByLevelId[level.id] !== undefined;
    if (!opensStuckTip(steps, solved, stuckTipSeen, () => otherUnsolvedLevelOpen(chapters, levels, bestMovesByLevelId, level.id))) return;
    setStuckTipShowing(true);
    setIdeaCardOpen(true);
    dispatch(settingsActions.stuckTipShown());
  }, [steps, stuckTipSeen, homeOpen, bestMovesByLevelId, level.id, dispatch]);
  const { starCount, parCount, allSolved } = useMemo(() => {
    // The Lab is for judging boards, so it counts toward nothing.
    const playerLevels = levels.filter((eachLevel) => eachLevel.chapter !== LAB_CHAPTER);
    const levelsWithPar = playerLevels.filter((eachLevel) => eachLevel.par !== undefined);
    return {
      starCount: levelsWithPar.filter((eachLevel) => (bestMovesByLevelId[eachLevel.id] ?? Infinity) <= (eachLevel.par ?? 0)).length,
      parCount: levelsWithPar.length,
      allSolved: playerLevels.every((eachLevel) => bestMovesByLevelId[eachLevel.id] !== undefined),
    };
  }, [bestMovesByLevelId]);
  const result = useMemo(
    () => (won && lastWin && lastWin.levelId === level.id ? winResultFor(lastWin.moveCount, level.par, lastWin.previousBestMoves) : null),
    [won, lastWin, level],
  );
  // Counts taps and swipes during the win moment; each one lands the result card at once.
  const [skipCount, setSkipCount] = useState(0);
  // The colour choice from when the colour picker opened, put back if the player cancels.
  const choiceBeforePicker = useRef(paletteChoice);
  const openColourPicker = useCallback(() => {
    choiceBeforePicker.current = paletteChoice;
    setColourPickerVisible(true);
  }, [paletteChoice]);
  const openMore = useCallback(() => setMoreVisible(true), []);
  const appColours = useMemo(() => appColoursFor(boardPalette), [boardPalette]);
  // Built once per palette, so a move hands the same style objects to the screen and restyles nothing.
  const paletteStyles = useMemo(
    () => ({
      page: { backgroundColor: appColours.page, transitionProperty: 'backgroundColor', transitionDuration: PALETTE_FADE_DURATION } as const,
      control: { borderColor: appColours.controlBorder, backgroundColor: appColours.control },
      ink: { color: appColours.ink },
      accent: { color: appColours.accent },
      quiet: { color: appColours.quiet },
      // A thin edge round the board, so a floor close to the page colour still shows where the board ends.
      boardEdge: { boxShadow: `0 0 0 1px ${appColours.boardEdge}, 0 2px 8px ${appColours.boardEdge}` },
    }),
    [appColours],
  );

  const goToLevel = useCallback(
    (nextLevelIndex: number) => {
      // Build the new board on a later frame, so a closing picker or a dropping card can draw first. Building it
      // redraws every tile, and doing that in the same frame held the picker on screen after the tap.
      requestAnimationFrame(() => requestAnimationFrame(() => dispatch(actions.selectLevel(nextLevelIndex))));
    },
    [dispatch],
  );
  const openLevels = useCallback(() => openChapterFromGame(level.chapter), [level.chapter]);
  // After a chapter's last level the chapters come next, where the next chapter's card waits.
  const goToNextLevel = useCallback(() => {
    if (chapterDone) openChapters();
    else goToLevel(levelIndex + 1);
  }, [chapterDone, goToLevel, levelIndex]);
  const continueGame = useCallback(() => dispatch(sessionActions.closeHome({ animated: true })), [dispatch]);
  const playAgain = useCallback(() => dispatch(actions.reset()), [dispatch]);
  const undo = useCallback(() => dispatch(actions.undo()), [dispatch]);

  // Read through a ref, so winning doesn't hand the board a new command handler and redraw it.
  const wonRef = useRef(won);
  wonRef.current = won;
  const run = useCallback(
    (command: Command) => {
      // Home takes only Enter (Continue) and L (the chapters); the rest waits for the game.
      if (homeOpenRef.current) {
        if (command.type === 'next') continueGame();
        else if (command.type === 'levels') openChapters();
        else return false;
        return true;
      }
      // A key on the new-idea card counts as a tap on it; Undo and Restart wait until it's gone.
      if (ideaCardOpenRef.current) {
        if (command.type === 'move' || command.type === 'next') setIdeaKeyPressCount((count) => count + 1);
        else if (command.type === 'toggleSound') toggleSound();
        else if (command.type === 'toggleVibration') toggleVibration();
        else return false;
        return true;
      }
      const won = wonRef.current;
      // Once the level is won a move does nothing but land the result card.
      if (command.type === 'move' && won) setSkipCount((count) => count + 1);
      else if (command.type === 'move') dispatch(actions.move(command.direction));
      if (command.type === 'undo') undo();
      if (command.type === 'reset') playAgain();
      if (command.type === 'toggleSound') toggleSound();
      if (command.type === 'toggleVibration') toggleVibration();
      if (command.type === 'next' && won) goToNextLevel();
      if (command.type === 'levels' || command.type === 'back') openLevels();
      // Enter and Space only mean Next once the level is won; before that they press the focused button.
      return command.type !== 'next' || won;
    },
    [dispatch, undo, playAgain, toggleSound, toggleVibration, goToNextLevel, openLevels, continueGame],
  );
  useKeyboardCommands(run, isFocused && !moreVisible && !colourPickerVisible);
  // Android's back button goes up one screen, to the levels, as the back arrow does. On home it closes the app.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (homeOpenRef.current) return false;
        openLevels();
        return true;
      });
      return () => subscription.remove();
    }, [openLevels]),
  );
  useHaptics(vibrationOn, level.par);
  useSounds(soundOn, level.par);
  useEffect(() => {
    // Screen readers and translators on the web read the page language.
    if (Platform.OS === 'web') document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
  }, [language]);

  const safeAreaInsets = useSafeAreaInsets();
  const touchPadHeight = touchPadHeightFor(screenHeight - safeAreaInsets.top - safeAreaInsets.bottom);
  const reservedHeight = CONTROLS_HEIGHT + touchPadHeight + safeAreaInsets.top + safeAreaInsets.bottom;
  const tileSize = tileSizeFor(state, Math.min(screenWidth, 640), screenHeight, PixelRatio.get(), reservedHeight);
  const moveUnit = t(language, state.moveCount === 1 ? 'moveUnit' : 'movesUnit');
  const moveText = `${state.moveCount} ${moveUnit}${level.par ? ` · ${t(language, 'par')} ${level.par}` : ''}`;

  const hint = state.moveCount === 0 ? t(language, tapMovesOn ? 'hintTapOrSwipe' : 'hintSwipe') : null;

  return (
    <AppColoursProvider value={appColours}>
      {/* The page fades to a new level's colours; the board itself switches at once with its new tiles. */}
      <Animated.View style={[styles.page, paletteStyles.page]}>
        <SafeAreaView style={styles.page}>
          <View style={styles.column}>
            <View style={styles.header}>
              <IconButton icon="back" label={t(language, 'levels')} onPress={openLevels} size={44} />
              {/* On a level with an idea, the name opens its card again. */}
              <Pressable
                accessibilityRole={idea ? 'button' : undefined}
                accessibilityLabel={idea ? `${level.order} · ${levelName}, ${t(language, 'showIdea')}` : undefined}
                disabled={!idea}
                onPress={() => setIdeaCardOpen(true)}
                style={styles.titleBlock}
              >
                <Text accessibilityRole="header" numberOfLines={1} style={[styles.levelName, paletteStyles.ink]}>
                  {`${level.order} · ${levelName}`}
                </Text>
                <Text numberOfLines={1} style={[styles.chapterName, paletteStyles.quiet]}>
                  {chapterName}
                </Text>
              </Pressable>
              <IconButton icon="sound" label={t(language, 'sound')} switchedOn={soundOn} onPress={toggleSound} size={40} />
              <IconButton icon="colours" label={t(language, 'colours')} onPress={openColourPicker} size={40} />
              <IconButton icon="more" label={t(language, 'moreOptions')} onPress={openMore} size={40} />
            </View>
            <View style={styles.boardArea}>
              <View style={paletteStyles.boardEdge}>
                <Board state={state} events={events} tileSize={tileSize} palette={boardPalette} onCommand={run} />
                <IdeaGlow highlight={ideaHighlight} tileSize={tileSize} seamColour={boardPalette.seamColour} glowCount={ideaGlowCount} />
              </View>
            </View>
            {/* Undo and Restart sit at the top of the touch area, away from where a thumb rests while tapping.
                Undo, pressed far more often, is on the right, under most players' thumb. */}
            <View style={styles.statusRow}>
              <IconButton icon="restart" label={t(language, 'reset')} onPress={() => run({ type: 'reset' })} size={48} />
              <View style={styles.statusBlock}>
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.status, won ? paletteStyles.accent : paletteStyles.quiet, won && styles.wonStatus]}
                >
                  {won ? `${t(language, 'won')} ${moveText}` : moveText}
                </Text>
                {labSolution !== null && (
                  <Pressable accessibilityRole="button" onPress={() => setSolving((wasSolving) => !wasSolving)} hitSlop={8}>
                    <Text style={[styles.solve, paletteStyles.accent]}>{t(language, solving ? 'stopSolving' : 'solve')}</Text>
                  </Pressable>
                )}
              </View>
              <IconButton icon="undo" label={t(language, 'undo')} onPress={() => run({ type: 'undo' })} size={48} />
            </View>
            <View style={{ height: touchPadHeight }}>
              <TouchPad tapMovesOn={tapMovesOn} hint={hint} label={t(language, 'touchArea')} onCommand={run} />
            </View>
          </View>
          <ResultCard
            won={won}
            result={result}
            isLastLevel={isLastLevel}
            chapterDone={chapterDone}
            language={language}
            seamColour={boardPalette.seamColour}
            nextTileColours={nextPaletteId ? boardPalettes[nextPaletteId].tileColours : null}
            skipCount={skipCount}
            bottomInset={safeAreaInsets.bottom}
            onNext={goToNextLevel}
            onPlayAgain={playAgain}
            onUndo={undo}
            onLevels={openLevels}
            onChapters={openChapters}
          />
          <IdeaCard
            open={ideaCardOpen}
            idea={stuckTipShowing ? 'skip' : idea}
            levelName={levelName}
            levelPlace={`${chapterName} ${level.order}`}
            language={language}
            tileColours={boardPalette.tileColours}
            seamColour={boardPalette.seamColour}
            keyPressCount={ideaKeyPressCount}
            onClose={closeIdeaCard}
          />
          <Home
            open={homeOpen}
            exit={homeExit}
            state={homeOpen ? state : null}
            level={level}
            language={language}
            palette={boardPalette}
            starCount={starCount}
            parCount={parCount}
            allSolved={allSolved}
            soundOn={soundOn}
            onToggleSound={toggleSound}
            onOpenColours={openColourPicker}
            onOpenMore={openMore}
            onContinue={continueGame}
            onOpenChapters={openChapters}
          />
          <MoreSheet
            visible={moreVisible}
            language={language}
            vibrationOn={vibrationOn}
            tapMovesOn={tapMovesOn}
            onToggleVibration={toggleVibration}
            onToggleTapMoves={toggleTapMoves}
            onChooseLanguage={(chosenLanguage) => dispatch(settingsActions.setLanguageChoice(chosenLanguage))}
            onClose={() => setMoreVisible(false)}
          />
          <ColourPicker
            visible={colourPickerVisible}
            language={language}
            paletteChoice={paletteChoice}
            onPick={choosePalette}
            onConfirm={() => setColourPickerVisible(false)}
            onCancel={() => {
              choosePalette(choiceBeforePicker.current);
              setColourPickerVisible(false);
            }}
          />
        </SafeAreaView>
      </Animated.View>
    </AppColoursProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleBlock: { flex: 1, minWidth: 0 },
  levelName: { fontSize: 17, fontWeight: '600' },
  chapterName: { fontSize: 13 },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBlock: { flex: 1, alignItems: 'center', gap: 2 },
  status: { textAlign: 'center', fontSize: 16 },
  solve: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  wonStatus: { fontWeight: '600' },
});
