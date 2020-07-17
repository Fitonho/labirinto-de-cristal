import { Block, colors, side, wallState, BlockEvent } from './block.js'



function printGrid(rowSize: number, colSize: number) {
    let c = document.querySelector("#board");
    for (let i = 0; i < rowSize; i++) {
        let row = document.createElement("div");
        row.classList.add("row");
        row.classList.add("row-size")
        row.style.width=`${50*colSize}px`
        for (let j = 0; j < colSize; j++) {
            let col = document.createElement("div");
            col.classList.add("col-sm");
            col.classList.add("block-size");
            row.appendChild(col);
        }
        c.appendChild(row);
    }
}

function invertSide(direction: number){
    direction = direction + 2;
    if (direction > 3){
        direction = direction - 4;
    }

    return direction;
}

function invertPotals( matriz: Block[][], nextPos: number[]){
    for (let i = 0; i < matriz.length; i++) {
        for (let j = 0; j < matriz[0].length; j++) {
            if (matriz[i][j].color == matriz[nextPos[0]][nextPos[1]].color){
                for (let k = 0; k < 4; k++){
                    if(matriz[i][j].walls[k] == wallState.portal){
                        let newBlock : number [] = [];
                        switch(k){
                            case side.Top: 
                                    newBlock = [i - 1, j];                                
                                break;
                            case side.Bottom:
                                    newBlock = [i + 1, j];
                                break;
                            case side.Left:
                                    newBlock = [i, j - 1];
                                break;
                            case side.Right:
                                    newBlock =[i, j + 1];
                                break;
                        }
                        if(newBlock[0] >= 0 && newBlock[0] < matriz.length
                        && newBlock[1] >= 0 && newBlock[1] < matriz[0].length
                        ){
                            if (matriz[newBlock[0]][newBlock[1]].color != matriz[i][j].color
                                ){
                                matriz[newBlock[0]][newBlock[1]].walls[invertSide(k)] = wallState.portal;
                            }
                        matriz[i][j].walls[k] = wallState.none;
                        }
                        //invertendo portal
                    }
                }                    
            }
        }
    }
}


export class Tela {
    M:number;
    N:number;
    rows:NodeListOf<Element>;
    playerSprite = document.createElement("div");
    endOfLevel = document.createElement("div");

    public matriz: Block[][] = [];
    public playerPos: [number, number];
    public playerColor: colors;
    constructor(level: Function) {
        this.playerPos = level(this.matriz);
        printGrid(this.matriz.length, this.matriz[0].length);
        [this.M, this.N]=[this.matriz.length, this.matriz[0].length];
        this.rows = document.querySelectorAll(".row-size");
        this.playerSprite.classList.add("player");
        this.endOfLevel.setAttribute("id", "diamond");
        this.playerColor = this.invertColor(this.matriz[this.playerPos[0]][this.playerPos[1]].color);
        this.playerSprite.style.backgroundColor = this.playerColor;
        this.paint()
    }

    paint() {
        let blockDOM: HTMLElement;
        for (let i = 0; i < this.rows.length; i++) {
            for (let j = 0; j < this.rows[i].children.length; j++) {
                blockDOM = (<HTMLElement>this.rows[i].children[j])
                blockDOM.style.backgroundColor = this.matriz[i][j].color;
                this.matriz[i][j].walls.forEach((wall, index) => {
                    blockDOM.style[`border${Object.keys(side)[index+4]}`] = (wall != 0) ? 
                    `3px dotted ${this.invertColor(this.matriz[i][j].color)}` : `3px solid ${this.invertColor(this.matriz[i][j].color)}`
                })
                if (this.matriz[i][j].event == BlockEvent.endOfLevel) {
                    (<any>document.styleSheets[1]).cssRules[1].style.borderTopColor = this.invertColor(this.matriz[i][j].color);
                    (<any>document.styleSheets[1]).cssRules[0].style.borderBottomColor = this.invertColor(this.matriz[i][j].color);
                    blockDOM.appendChild(this.endOfLevel);
                }
            }
        }
        blockDOM = (<HTMLElement>this.rows[this.playerPos[0]].children[this.playerPos[1]])
        this.playerSprite.style.backgroundColor = this.playerColor;
        blockDOM.appendChild(this.playerSprite);
    }

    move(direction: side) {
        let nextPos = [this.playerPos[0], this.playerPos[1]];
        let blockBehind: [number, number];
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
        //if(destino.cor != player.cor || posAtual.parede[direção] == portal )
        if (this.matriz[nextPos[0]][nextPos[1]].color != this.playerColor ||
            this.matriz[nextPos[0]][nextPos[1]].walls[invertSide(direction)] == wallState.portal) {
            //if(posAtual.parede[direção] == portal )
            if (this.matriz[nextPos[0]][nextPos[1]].walls[invertSide(direction)] == wallState.portal) {
                this.playerColor = this.invertColor(this.matriz[nextPos[0]][nextPos[1]].color);
                invertPotals( this.matriz, nextPos);
            }
            this.playerPos = [nextPos[0], nextPos[1]];
        }
        else {
            /** if(destino.cor == player.cor && 
             * &&  blocoAtrasDoDestino está dentro dos limites
             * &&  blocoAtrasDoDestino.evento != fimDoNível
             * &&  blocoAtrasDoDestino.cor != player.cor)
            */
            if (this.matriz[nextPos[0]][nextPos[1]].color == this.playerColor &&
                0 <= blockBehind[0] && blockBehind[0] < this.M && 0 <= blockBehind[1] && blockBehind[1] < this.N &&
                this.matriz[blockBehind[0]][blockBehind[1]].event != BlockEvent.endOfLevel &&
                this.matriz[blockBehind[0]][blockBehind[1]].color != this.playerColor) {
                [this.matriz[blockBehind[0]][blockBehind[1]], this.matriz[nextPos[0]][nextPos[1]]] = [this.matriz[nextPos[0]][nextPos[1]], this.matriz[blockBehind[0]][blockBehind[1]]];
                this.playerPos = [nextPos[0], nextPos[1]];
            }
            //TODO lidar com empurrar blocos com portais e blocos de evento
        }
        this.paint();
        if (this.matriz[this.playerPos[0]][this.playerPos[1]].event == BlockEvent.endOfLevel) {
            alert('nível completo!')
        }
    }

    invertColor(hexTripletColor: string) {
        var color: any = hexTripletColor;
        color = color.substring(1); // remove #
        color = parseInt(color, 16); // convert to integer
        color = 0xFFFFFF ^ color; // invert three bytes
        color = color.toString(16); // convert to hex
        color = ("000000" + color).slice(-6); // pad with leading zeros
        color = "#" + color; // prepend #
        return color;
    }
}