import {Block,colors,side,wallState,BlockEvent} from './block.js'

const M = 9;
const N = 9;
let rows = document.querySelectorAll(".row");
let playerSprite = document.createElement("div");
playerSprite.classList.add("player")
let endOfLevel = document.createElement("div");
endOfLevel.setAttribute("id","diamond");

export class Tela {
    public matriz: Block[][] = [];
    public playerPos: [number, number];
    public playerColor: colors;
    constructor(level: Function) {
        this.playerPos = level(this.matriz);
        this.playerColor = this.invertColor(this.matriz[this.playerPos[0]][this.playerPos[1]].color);
        playerSprite.style.backgroundColor = this.playerColor;
    }

    paint() {
        let blockDOM:HTMLElement;
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < rows[i].children.length; j++) {
                blockDOM = (<HTMLElement>rows[i].children[j])
                blockDOM.style.backgroundColor = this.matriz[i][j].color;
                this.matriz[i][j].walls.forEach((wall, index) => {
                    if (wall != 0) {
                        switch(<side>index){
                            case side.north:
                                blockDOM.style.borderTopColor = colors.portal;
                                break;
                            case side.south:
                                blockDOM.style.borderBottomColor = colors.portal;
                                break;
                            case side.east:
                                blockDOM.style.borderRightColor = colors.portal;
                                break;
                            case side.west:
                                blockDOM.style.borderLeftColor = colors.portal;
                                break;
                        }
                    }
                })
                if(this.matriz[i][j].event == BlockEvent.endOfLevel){
                    (<any>document.styleSheets[1]).cssRules[4].style.borderTopColor = this.invertColor(this.matriz[i][j].color);
                    (<any>document.styleSheets[1]).cssRules[3].style.borderBottomColor = this.invertColor(this.matriz[i][j].color);
                    blockDOM.appendChild(endOfLevel);   
                }
            }
        }
        blockDOM = (<HTMLElement>rows[this.playerPos[0]].children[this.playerPos[1]])
        playerSprite.style.backgroundColor = this.playerColor;
        blockDOM.appendChild(playerSprite);
    }

    move(direction: side) {
        let nextPos = [this.playerPos[0], this.playerPos[1]];
        let blockBehind:[number,number];
        switch (direction) {
            case side.north:
                if (nextPos[0] > 0){
                    nextPos[0] -= 1
                    blockBehind = [nextPos[0]-1,nextPos[1]];
                }
                break;
            case side.west:
                if (nextPos[1] > 0){
                    nextPos[1] -= 1
                    blockBehind = [nextPos[0],nextPos[1]-1];
                }
                break;
            case side.south:
                if (nextPos[0] < M - 1){
                    nextPos[0] += 1
                    blockBehind = [nextPos[0]+1,nextPos[1]];
                }
                break;
            case side.east:
                if (nextPos[1] < N - 1){
                    nextPos[1] += 1
                    blockBehind = [nextPos[0],nextPos[1]+1];
                }
                break;
        }
        if (this.matriz[nextPos[0]][nextPos[1]].color != this.playerColor ||
            this.matriz[this.playerPos[0]][this.playerPos[1]].walls[direction] == wallState.portal) {
            if(this.matriz[this.playerPos[0]][this.playerPos[1]].walls[direction] == wallState.portal){
                this.playerColor = this.invertColor(this.matriz[nextPos[0]][nextPos[1]].color);
            }
            this.playerPos = [nextPos[0], nextPos[1]];
        }
        else {
            
            if(this.matriz[nextPos[0]][nextPos[1]].color == this.playerColor && 
                0<=blockBehind[0] && blockBehind[0]<M && 0<=blockBehind[1] && blockBehind[1]<N &&
                this.matriz[blockBehind[0]][blockBehind[1]].event != BlockEvent.endOfLevel &&
                this.matriz[blockBehind[0]][blockBehind[1]].color != this.playerColor){
                    [this.matriz[blockBehind[0]][blockBehind[1]].color,this.matriz[nextPos[0]][nextPos[1]].color] = [this.matriz[nextPos[0]][nextPos[1]].color,this.matriz[blockBehind[0]][blockBehind[1]].color];
                    this.playerPos = [nextPos[0], nextPos[1]];
            }
            //TODO lidar com empurrar blocos com portais e blocos de evento
        }
        this.paint();
        if(this.matriz[this.playerPos[0]][this.playerPos[1]].event == BlockEvent.endOfLevel){
            alert('nível completo!')
        }
    }

    invertColor(hexTripletColor:string) {
        var color:any = hexTripletColor;
        color = color.substring(1); // remove #
        color = parseInt(color, 16); // convert to integer
        color = 0xFFFFFF ^ color; // invert three bytes
        color = color.toString(16); // convert to hex
        color = ("000000" + color).slice(-6); // pad with leading zeros
        color = "#" + color; // prepend #
        return color;
    }
}