var side;
(function (side) {
    side[side["north"] = 0] = "north";
    side[side["south"] = 1] = "south";
    side[side["east"] = 2] = "east";
    side[side["west"] = 3] = "west";
})(side || (side = {}));
var wallState;
(function (wallState) {
    wallState[wallState["none"] = 0] = "none";
    wallState[wallState["portal"] = 1] = "portal";
})(wallState || (wallState = {}));
var colors;
(function (colors) {
    colors["black"] = "#000000";
    colors["white"] = "#ffffff";
    colors["player"] = "magenta";
    colors["endOfLevel"] = "grey";
    colors["portal"] = "blue";
})(colors || (colors = {}));
var BlockEvent;
(function (BlockEvent) {
    BlockEvent[BlockEvent["endOfLevel"] = 1] = "endOfLevel";
})(BlockEvent || (BlockEvent = {}));
var Block = /** @class */ (function () {
    function Block(color) {
        this.color = color;
        this.walls = [];
        this.walls = [0, 0, 0, 0];
    }
    ;
    return Block;
}());
var M = 9;
var N = 9;
var rows = document.querySelectorAll(".row");
var playerSprite = document.createElement("div");
playerSprite.classList.add("player");
var Tela = /** @class */ (function () {
    function Tela(level) {
        this.matriz = [];
        this.playerPos = level(this.matriz);
        this.playerColor = invertColor(this.matriz[this.playerPos[0]][this.playerPos[1]].color);
        playerSprite.style.backgroundColor = this.playerColor;
    }
    Tela.prototype.paint = function () {
        var blockDOM;
        for (var i = 0; i < rows.length; i++) {
            for (var j = 0; j < rows[i].children.length; j++) {
                blockDOM = rows[i].children[j];
                blockDOM.style.backgroundColor = this.matriz[i][j].color;
                this.matriz[i][j].walls.forEach(function (wall, index) {
                    if (wall != 0) {
                        switch (index) {
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
                });
            }
        }
        blockDOM = rows[this.playerPos[0]].children[this.playerPos[1]];
        playerSprite.style.backgroundColor = this.playerColor;
        blockDOM.appendChild(playerSprite);
    };
    Tela.prototype.move = function (direction) {
        var nextPos = [this.playerPos[0], this.playerPos[1]];
        switch (direction) {
            case side.north:
                if (nextPos[0] > 0)
                    nextPos[0] -= 1;
                break;
            case side.west:
                if (nextPos[1] > 0)
                    nextPos[1] -= 1;
                break;
            case side.south:
                if (nextPos[0] < M - 1)
                    nextPos[0] += 1;
                break;
            case side.east:
                if (nextPos[1] < N - 1)
                    nextPos[1] += 1;
                break;
        }
        if (this.matriz[nextPos[0]][nextPos[1]].color != this.playerColor ||
            this.matriz[this.playerPos[0]][this.playerPos[1]].walls[direction] == wallState.portal) {
            this.playerColor = invertColor(this.matriz[nextPos[0]][nextPos[1]].color);
            this.playerPos = [nextPos[0], nextPos[1]];
        }
        else {
            //TODO empurrar bloco
            //TODO checar se bloco atrás do bloco a ser empurrado não é da mesma cor
        }
        tela.paint();
    };
    return Tela;
}());
function level3(matriz) {
    for (var i = 0; i < M; i++) {
        matriz[i] = [];
        for (var j = 0; j < N; j++) {
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
var tela = new Tela(level3);
tela.paint();
// tela.gameLoop();
document.addEventListener('keypress', function (event) {
    'wsda'.split('').forEach(function (key, index) {
        console.log(key + " pressed");
        if (key == event.key) {
            tela.move(index);
        }
    });
});
function invertColor(hexTripletColor) {
    var color = hexTripletColor;
    color = color.substring(1); // remove #
    color = parseInt(color, 16); // convert to integer
    color = 0xFFFFFF ^ color; // invert three bytes
    color = color.toString(16); // convert to hex
    color = ("000000" + color).slice(-6); // pad with leading zeros
    color = "#" + color; // prepend #
    return color;
}
//# sourceMappingURL=main.js.map