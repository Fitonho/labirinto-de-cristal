export var side;
(function (side) {
    side[side["north"] = 0] = "north";
    side[side["south"] = 1] = "south";
    side[side["east"] = 2] = "east";
    side[side["west"] = 3] = "west";
})(side || (side = {}));
export var wallState;
(function (wallState) {
    wallState[wallState["none"] = 0] = "none";
    wallState[wallState["portal"] = 1] = "portal";
})(wallState || (wallState = {}));
export var colors;
(function (colors) {
    colors["black"] = "#000000";
    colors["white"] = "#ffffff";
    colors["player"] = "magenta";
    colors["endOfLevel"] = "grey";
    colors["portal"] = "blue";
})(colors || (colors = {}));
export var BlockEvent;
(function (BlockEvent) {
    BlockEvent[BlockEvent["endOfLevel"] = 1] = "endOfLevel";
})(BlockEvent || (BlockEvent = {}));
export class Block {
    constructor(color) {
        this.color = color;
        this.walls = [];
        this.walls = [0, 0, 0, 0];
    }
    ;
}
//# sourceMappingURL=block.js.map