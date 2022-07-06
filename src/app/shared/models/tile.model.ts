import { BoardCoords } from './misc.model';

export class Tile {
	isFilled: boolean;
	isProjection: boolean;
	isMatch: boolean;
	coords: BoardCoords;

	constructor(
		iBlockRow: number,
		iBlock: number,
		iRow: number,
		iTile: number,
		isFilled: boolean = false,
		isProjection: boolean = false,
		isMatch: boolean = false,
	) {
		this.coords = new BoardCoords(iBlockRow, iBlock, iRow, iTile);
		this.isFilled = isFilled;
		this.isProjection = isProjection;
		this.isMatch = isMatch;
	}
}
