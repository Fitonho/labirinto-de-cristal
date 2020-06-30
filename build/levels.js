import { Block, colors, side, wallState, BlockEvent } from './block.js';
export function level3(matriz) {
    let rowSize = 9;
    let colSize = 9;
    for (let i = 0; i < rowSize; i++) {
        matriz[i] = [];
        for (let j = 0; j < colSize; j++) {
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
//# sourceMappingURL=levels.js.map

 export function level4(matriz) {
	 let rowSize = 9;
	 let colSize = 9;
	 for (let i = 0; i < rowSize, i++){
		matriz[i]=[];
		for (let j = 0; j < colSize; j++){
			matriz[i][j] = new Block(colors.white);
		}
	 }
	 let list = [0,1,7];
	 for (let i of list){
		 matriz[i][0] = new Block(colors.black);
		 matriz[i][8] = new Block(colors.black);
	 }
	 let list = [0,1]
	 for (let i of list){
		 matriz[i][1] = new Block(colors.black);
		 matriz[i][7] = new Block(colors.black);
	 }
	 let list = [1, 3, 7, 8];
	 for (let i of list){
		 matriz[i][2] = new Block(colors.black);
		 matriz[i][6] = new Block(colors.black);
	 }
	 let list = [0,3,4,7,8];
	 for ( let i of list) {
		 matriz[i][3] = new Block(colors.black);
		 matriz[i][5] = new Block(colors.black);
	 }
	 let list = [0,3,4];
	 for ( let i of list) {
		 matriz[i][4] = new Block(colors.black);
	 }
	 matriz[5][4].walls[side.north] = wallState.portal;
	 matriz[4][4].walls[side.south] = wallState.portal;
	 matriz[0][4].event = BlockEvent.endOfLevel;
	 matriz[0][4].color =colors.endOfLevel;
	}
	