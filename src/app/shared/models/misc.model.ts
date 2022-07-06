export class BoardCoords {
    iBlockRow: number = 0;
    iBlock: number = 0;
    iRow: number = 0;
    iTile: number = 0;

    get stringValue() {
        return `${this.iBlockRow};${this.iBlock};${this.iRow};${this.iTile}`;
    }
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
    pattern: any[];
    startPoint: string[];
    patternSize: any;
}

export interface Size {
    width: number;
    height: number;
}