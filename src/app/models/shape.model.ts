class Shape {
    pattern: any[] = [];
    isBeingDragged: boolean = false;
    dragPoint?: any;

    patternSize?: Size;
}

class InsertShapeData {
    pattern: any[];
    coords: BoardCoords;

    patternSize?: Size;

    constructor(iBlockRow: number, iBlock: number, iRow: number, iTile: number, pattern: any[], patternSize: any) {
        this.coords = new BoardCoords(iBlockRow, iBlock, iRow, iTile);
        this.pattern = pattern;

        this.patternSize = patternSize;
    }
}