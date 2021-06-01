export var side;
(function (side) {
    side[side["Top"] = 0] = "Top";
    side[side["Right"] = 1] = "Right";
    side[side["Bottom"] = 2] = "Bottom";
    side[side["Left"] = 3] = "Left";
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
    colors["portal"] = "blue";
    colors["wall"] = "grey";
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