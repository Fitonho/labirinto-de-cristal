import { Block, colors, side, wallState, BlockEvent } from './block.js';
export function level_teste(matriz) {
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
    return [8, 2];
}
export function level_1(matriz) {
    let colSize = 10;
    let rowSize = 9;
    for (let i = 0; i < rowSize; i++) {
        matriz[i] = [];
        for (let j = 0; j < colSize; j++) {
            matriz[i][j] = new Block(colors.white);
        }
    }
    let list = [1, 2, 3, 4, 5, 6, 7, 8]; //Coluna_1
    for (let i of list) {
        matriz[i][1] = new Block(colors.black);
    }
    list = [1, 8]; //Coluna_2
    for (let i of list) {
        matriz[i][2] = new Block(colors.black);
    }
    list = [1, 3, 4, 5, 6, 8]; //Coluna_3'
    for (let i of list) {
        matriz[i][3] = new Block(colors.black);
    }
    list = [1, 3, 6, 8]; //Coluna_4'
    for (let i of list) {
        matriz[i][4] = new Block(colors.black);
    }
    list = [1, 3, 4, 6, 8]; //Coluna_5'
    for (let i of list) {
        matriz[i][5] = new Block(colors.black);
    }
    list = [1, 6, 8]; //Coluna_6'
    for (let i of list) {
        matriz[i][6] = new Block(colors.black);
    }
    list = [1, 2, 3, 4, 5, 6, 8]; //Coluna_7'
    for (let i of list) {
        matriz[i][7] = new Block(colors.black);
    }
    list = [8]; //Coluna_8'
    for (let i of list) {
        matriz[i][8] = new Block(colors.black);
    }
    list = [0, 1, 2, 3, 4, 5, 6, 7, 8]; //Coluna_9'
    for (let i of list) {
        matriz[i][9] = new Block(colors.black);
    }
    matriz[4][5].walls[side.west] = wallState.portal;
    matriz[4][4].walls[side.east] = wallState.portal;
    matriz[8][8].event = BlockEvent.endOfLevel;
    return [8, 0];
}
export function level_2(matriz) {
    let rowSize = 10;
    let colSize = 9;
    for (let i = 0; i < rowSize; i++) {
        matriz[i] = [];
        for (let j = 0; j < colSize; j++) {
            matriz[i][j] = new Block(colors.white);
        }
    }
    let list = [1, 2, 3, 4, 5, 6, 7, 8];
    'Coluna_1';
    for (let i of list) {
        matriz[i][1] = new Block(colors.black);
    }
    list = [1, 8];
    'Coluna_2';
    for (let i of list) {
        matriz[i][2] = new Block(colors.black);
    }
    list = [1, 3, 4, 5, 6, 8];
    'Coluna_3';
    for (let i of list) {
        matriz[i][3] = new Block(colors.black);
    }
    list = [1, 3, 6, 8];
    'Coluna_4';
    for (let i of list) {
        matriz[i][4] = new Block(colors.black);
    }
    list = [1, 3, 4, 6, 8];
    'Coluna_5';
    for (let i of list) {
        matriz[i][5] = new Block(colors.black);
    }
    list = [2, 6, 8];
    'Coluna_6';
    for (let i of list) {
        matriz[i][6] = new Block(colors.black);
    }
    list = [1, 2, 3, 4, 5, 6, 8];
    'Coluna_7';
    for (let i of list) {
        matriz[i][7] = new Block(colors.black);
    }
    list = [8];
    'Coluna_8';
    for (let i of list) {
        matriz[i][8] = new Block(colors.black);
    }
    list = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    'Coluna_9';
    for (let i of list) {
        matriz[i][9] = new Block(colors.black);
    }
    matriz[4][5].walls[side.west] = wallState.portal;
    matriz[4][4].walls[side.east] = wallState.portal;
    matriz[0][8].event = BlockEvent.endOfLevel;
    return [8, 8];
}
export function level_3(matriz) {
    let rowSize = 9;
    let colSize = 9;
    for (let i = 0; i < rowSize; i++) {
        matriz[i] = [];
        for (let j = 0; j < colSize; j++) {
            matriz[i][j] = new Block(colors.white);
        }
    }
    let list = [0, 1, 7];
    for (let i of list) {
        matriz[i][0] = new Block(colors.black);
        matriz[i][8] = new Block(colors.black);
    }
    list = [0, 1];
    for (let i of list) {
        matriz[i][1] = new Block(colors.black);
        matriz[i][7] = new Block(colors.black);
    }
    list = [1, 3, 7, 8];
    for (let i of list) {
        matriz[i][2] = new Block(colors.black);
        matriz[i][6] = new Block(colors.black);
    }
    list = [0, 3, 4, 7, 8];
    for (let i of list) {
        matriz[i][3] = new Block(colors.black);
        matriz[i][5] = new Block(colors.black);
    }
    list = [0, 3, 4];
    for (let i of list) {
        matriz[i][4] = new Block(colors.black);
    }
    matriz[5][4].walls[side.north] = wallState.portal;
    matriz[4][4].walls[side.south] = wallState.portal;
    matriz[0][4].event = BlockEvent.endOfLevel;
    return [8, 4];
}
export function level_4(matriz) {
    let rowSize = 9;
    let colSize = 9;
    for (let i = 0; i < rowSize; i++) {
        matriz[i] = [];
        for (let j = 0; j < colSize; j++) {
            matriz[i][j] = new Block(colors.white);
        }
    }
    let list = [1, 2, 3, 4, 6, 8];
    for (let i of list) {
        matriz[i][0] = new Block(colors.black);
        matriz[i][8] = new Block(colors.black);
    }
    list = [1, 2, 3, 4, 8];
    for (let i of list) {
        matriz[i][1] = new Block(colors.black);
        matriz[i][7] = new Block(colors.black);
    }
    list = [0, 4, 5, 6, 7];
    for (let i of list) {
        matriz[i][2] = new Block(colors.black);
        matriz[i][6] = new Block(colors.black);
    }
    list = [0, 4, 5, 6, 7];
    for (let i of list) {
        matriz[i][3] = new Block(colors.black);
        matriz[i][5] = new Block(colors.black);
    }
    list = [2, 4, 5, 7];
    for (let i of list) {
        matriz[i][4] = new Block(colors.black);
    }
    matriz[8][1].walls[side.east] = wallState.portal;
    matriz[8][6].walls[side.east] = wallState.portal;
    matriz[8][2].walls[side.west] = wallState.portal;
    matriz[8][7].walls[side.west] = wallState.portal;
    matriz[0][4].event = BlockEvent.endOfLevel;
    return [8, 4];
}
//# sourceMappingURL=levels.js.map