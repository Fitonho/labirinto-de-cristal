export enum side {
    north = 0,
    south,
    east,
    west
}
export enum wallState {
    none = 0,
    portal = 1
}
export enum colors {
    black = '#000000',
    white = '#ffffff',
    player = 'magenta',
    endOfLevel = 'grey',
    portal = 'blue'
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