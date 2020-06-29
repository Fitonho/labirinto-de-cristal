enum side {
    north = 0,
    south,
    east,
    west
}
enum wallState {
    none = 0,
    portal = 1
}
enum colors {
    black = '#000000',
    white = '#ffffff',
    player = 'magenta',
    endOfLevel = 'grey',
    portal = 'blue'
}
enum BlockEvent {
    endOfLevel = 1
}
class Block {

    walls: wallState[] = [];
    event: BlockEvent;

    constructor(
        public color: colors
    ) { this.walls = [0, 0, 0, 0] };

}

const M = 9;
const N = 9;
let rows = document.querySelectorAll(".row");
let playerSprite = document.createElement("div");
playerSprite.classList.add("player")


class Tela {
    public matriz: Block[][] = [];
    public playerPos: [number, number];
    public playerColor: colors;
    constructor(level: Function) {
        this.playerPos = level(this.matriz);
        this.playerColor = invertColor(this.matriz[this.playerPos[0]][this.playerPos[1]].color);
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
                this.playerColor = invertColor(this.matriz[nextPos[0]][nextPos[1]].color);
                this.playerPos = [nextPos[0], nextPos[1]];
        }
        else {
            
            if(this.matriz[nextPos[0]][nextPos[1]].color == this.playerColor &&
                this.matriz[blockBehind[0]][blockBehind[1]].color != this.playerColor){
                    [this.matriz[blockBehind[0]][blockBehind[1]].color,this.matriz[nextPos[0]][nextPos[1]].color] = [this.matriz[nextPos[0]][nextPos[1]].color,this.matriz[blockBehind[0]][blockBehind[1]].color];
                    this.playerPos = [nextPos[0], nextPos[1]];
            }
            //TODO lidar com empurrar blocos com portais e blocos de evento
        }
        tela.paint();
    }
}

function level3(matriz: Block[][]) {
    for (let i = 0; i < M; i++) {
        matriz[i] = [];
        for (let j = 0; j < N; j++) {
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

let tela = new Tela(level3);
tela.paint();

document.addEventListener('keypress', (event) => {
    console.log(event.key + " pressed");
    'wsda'.split('').forEach((key, index) => {
        if (key == event.key){
            tela.move(<side>index);
        }
    })
});

function invertColor(hexTripletColor:string) {
    var color:any = hexTripletColor;
    color = color.substring(1); // remove #
    color = parseInt(color, 16); // convert to integer
    color = 0xFFFFFF ^ color; // invert three bytes
    color = color.toString(16); // convert to hex
    color = ("000000" + color).slice(-6); // pad with leading zeros
    color = "#" + color; // prepend #
    return color;
}