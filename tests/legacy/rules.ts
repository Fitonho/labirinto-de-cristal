// The movement rules exactly as src/tela.ts had them before the engine split
// (Tela.move, invertPotals, invertSide, findAdjacent, invertColor), with the
// DOM and alert removed. Kept only as a reference for the comparison tests.
import { Block, colors, side, wallState, BlockEvent } from './block';

function invertSide(direction: number) {
    direction = direction + 2;
    if (direction > 3) {
        direction = direction - 4;
    }
    return direction;
}

function findAdjacent(i: number, j: number, wallside: number) {
    switch (wallside) {
        case side.Top:
            return [i - 1, j];
        case side.Bottom:
            return [i + 1, j];
        case side.Left:
            return [i, j - 1];
        case side.Right:
            return [i, j + 1];
    }
}

function invertPotals(matriz: Block[][], nextPos: number[]) {
    for (let i = 0; i < matriz.length; i++) {
        for (let j = 0; j < matriz[0].length; j++) {
            if (matriz[i][j].color == matriz[nextPos[0]][nextPos[1]].color) {
                for (let k = 0; k < 4; k++) {
                    if (matriz[i][j].walls[k] == wallState.portal) {
                        let newBlock: number[] = findAdjacent(i, j, k)!;
                        if (newBlock[0] >= 0 && newBlock[0] < matriz.length
                            && newBlock[1] >= 0 && newBlock[1] < matriz[0].length
                        ) {
                            if (matriz[newBlock[0]][newBlock[1]].color != matriz[i][j].color) {
                                matriz[newBlock[0]][newBlock[1]].walls[invertSide(k)] = wallState.portal;
                            }
                            matriz[i][j].walls[k] = wallState.none;
                        }
                    }
                }
            }
        }
    }
}

export function invertColor(hexTripletColor: string) {
    let color: any = hexTripletColor;
    color = color.substring(1);
    color = parseInt(color, 16);
    color = 0xFFFFFF ^ color;
    color = color.toString(16);
    color = ("000000" + color).slice(-6);
    color = "#" + color;
    return color;
}

export class LegacyGame {
    M: number;
    N: number;
    matriz: Block[][] = [];
    playerPos: [number, number];
    playerColor: colors;
    won = false;

    constructor(level: Function) {
        this.playerPos = level(this.matriz);
        [this.M, this.N] = [this.matriz.length, this.matriz[0].length];
        this.playerColor = invertColor(this.matriz[this.playerPos[0]][this.playerPos[1]].color);
    }

    move(direction: side) {
        let nextPos = [this.playerPos[0], this.playerPos[1]];
        let blockBehind: [number, number] = undefined!;
        switch (direction) {
            case side.Top:
                if (nextPos[0] > 0) {
                    nextPos[0] -= 1
                    blockBehind = [nextPos[0] - 1, nextPos[1]];
                }
                break;
            case side.Left:
                if (nextPos[1] > 0) {
                    nextPos[1] -= 1
                    blockBehind = [nextPos[0], nextPos[1] - 1];
                }
                break;
            case side.Bottom:
                if (nextPos[0] < this.M - 1) {
                    nextPos[0] += 1
                    blockBehind = [nextPos[0] + 1, nextPos[1]];
                }
                break;
            case side.Right:
                if (nextPos[1] < this.N - 1) {
                    nextPos[1] += 1
                    blockBehind = [nextPos[0], nextPos[1] + 1];
                }
                break;
        }
        if (this.matriz[nextPos[0]][nextPos[1]].color != this.playerColor ||
            this.matriz[nextPos[0]][nextPos[1]].walls[invertSide(direction)] == wallState.portal) {
            if (this.matriz[nextPos[0]][nextPos[1]].walls[invertSide(direction)] == wallState.portal) {
                this.playerColor = invertColor(this.matriz[nextPos[0]][nextPos[1]].color);
                invertPotals(this.matriz, nextPos);
            }
            this.playerPos = [nextPos[0], nextPos[1]];
        }
        else {
            if (this.matriz[nextPos[0]][nextPos[1]].color == this.playerColor &&
                0 <= blockBehind[0] && blockBehind[0] < this.M && 0 <= blockBehind[1] && blockBehind[1] < this.N &&
                this.matriz[blockBehind[0]][blockBehind[1]].event != BlockEvent.endOfLevel &&
                this.matriz[blockBehind[0]][blockBehind[1]].color != this.playerColor) {
                [this.matriz[blockBehind[0]][blockBehind[1]], this.matriz[nextPos[0]][nextPos[1]]] = [this.matriz[nextPos[0]][nextPos[1]], this.matriz[blockBehind[0]][blockBehind[1]]];
                this.playerPos = [nextPos[0], nextPos[1]];
            }
        }
        if (this.matriz[this.playerPos[0]][this.playerPos[1]].event == BlockEvent.endOfLevel) {
            this.won = true;
        }
    }
}

export const legacyLevelNames = (levels: object) =>
    Object.getOwnPropertyNames(Object.getPrototypeOf(levels)).slice(1);
