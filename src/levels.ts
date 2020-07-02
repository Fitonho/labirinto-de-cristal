import { Block, colors, side, wallState, BlockEvent } from './block.js'

function paintMatrix(mg: number[][], cores: colors[], matriz: Block[][]) {
    for (let i = 0; i < mg.length; i++) {
        matriz[i] = [];
        for (let j = 0; j < mg[0].length; j++) {
            matriz[i][j] = new Block(cores[mg[i][j]])
        }
    }
}

export function level_teste(matriz: Block[][]) {

    let mg =[ 
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0]];
    
    paintMatrix(mg, [colors.black, colors.white], matriz);

    matriz[4][1].walls[side.east] = wallState.portal;
    matriz[4][2].walls[side.west] = wallState.portal;
    matriz[0][6].event = BlockEvent.endOfLevel;

    return [8, 2];
}

//export function level_1(matriz: Block[][]) 

//export function level_2(matriz: Block[][]) 

export function level_3(matriz: Block[][]) {
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
    list = [0, 1]
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

export function level_4(matriz: Block[][]) {
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
    list = [1, 2, 3, 4, 8]
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
