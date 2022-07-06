export class BoardCoords {
    iBlockRow: number = 0;
    iBlock: number = 0;
    iRow: number = 0;
    iTile: number = 0;

    get numberValue() {
        return +`${this.iBlockRow}${this.iBlock}${this.iRow}${this.iTile}`;
    }

    constructor(iBlockRow: number, iBlock: number, iRow: number, iTile: number) {
        this.iBlockRow = iBlockRow;
        this.iBlock = iBlock;
        this.iRow = iRow;
        this.iTile = iTile;
    }
}

export interface CurrentlyDragged {
    index: number;
    pattern: any[];
    startPoint: number[];
    patternSize: any;
}

export interface Size {
    width: number;
    height: number;
}

export interface DeltaCoords {
    dBlockRow: number;
    dBlock: number;
    dRow: number;
    dTile: number;
}