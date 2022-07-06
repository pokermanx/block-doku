import { BoardCoords, Size } from './misc.model';

export class Shape {
    pattern: any[] = [];
    isBeingDragged: boolean = false;
    dragPoint?: any;

    patternSize?: Size;

    constructor(pattern: any[], patternSize: Size) {
        this.pattern = pattern;
        this.patternSize = patternSize;
    }
}

export class InsertShapeData {
    pattern: any[];
    coords: BoardCoords;

    patternSize?: Size;

    constructor(iBlockRow: number, iBlock: number, iRow: number, iTile: number, pattern: any[], patternSize: any) {
        this.coords = new BoardCoords(iBlockRow, iBlock, iRow, iTile);
        this.pattern = pattern;

        this.patternSize = patternSize;
    }
}