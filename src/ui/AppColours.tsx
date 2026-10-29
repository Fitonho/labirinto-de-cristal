// The app's colours around the board, shared through React context. The game
// screen provides the colours of the level's palette; buttons, the touch area
// and the pickers read them here. They change only when a level starts or the
// player picks other colours, so moves re-render nothing through this.
import { createContext, useContext } from 'react';
import { appColoursFor, boardPalettes, type AppColours } from './theme';

const AppColoursContext = createContext<AppColours>(appColoursFor(boardPalettes.ink));

export const AppColoursProvider = AppColoursContext.Provider;

export function useAppColours(): AppColours {
  return useContext(AppColoursContext);
}
