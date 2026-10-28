export enum side {
    Top = 0,
    Right,
    Bottom,
    Left
}
export enum wallState {
    none = 0,
    portal = 1
}
export enum colors {
    black = '#000000',
    white = '#ffffff',
    portal = 'blue',
    wall = 'grey'
}
export enum BlockEvent {
    endOfLevel = 1
}
export class Block {

    walls: wallState[] = [];
    event: BlockEvent;

    constructor(
        public color: colors
    ) { this.walls = [0, 0, 0, 0] };

}