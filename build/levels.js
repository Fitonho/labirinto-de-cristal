import { Block, colors, side, wallState, BlockEvent } from './block.js';
export function level3(matriz) {
    let rowSize = 9;
    let colSize = 9;
    for (let i = 0; i < rowSize; i++) {
        matriz[i] = [];
        for (let j = 0; j < colSize; j++) {
            if (j % 2)
                matriz[i][j] = new Block(colors.white);
            else
                matriz[i][j] = new Block(colors.black);
        }
    }
    matriz[4][1].walls[side.east] = wallState.portal;
    matriz[4][2].walls[side.west] = wallState.portal;
    matriz[0][6].event = BlockEvent.endOfLevel;
    matriz[0][6].color = colors.endOfLevel;
    return [8, 2];
}
//# sourceMappingURL=levels.js.map