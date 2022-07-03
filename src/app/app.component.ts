import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import * as _ from 'lodash';

class BoardCoords {
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

class Tile {
  isFilled: boolean;
  isProjection: boolean;
  isMatchPreview: boolean;
  coords: BoardCoords;

  constructor(
    iBlockRow: number,
    iBlock: number,
    iRow: number,
    iTile: number,
    isFilled: boolean = false,
    isProjection: boolean = false,
    isMatchPreview: boolean = false,
  ) {
    this.coords = new BoardCoords(iBlockRow, iBlock, iRow, iTile);
    this.isFilled = isFilled;
    this.isProjection = isProjection;
    this.isMatchPreview = isMatchPreview;
  }
}

class InsertShapeData {
  pattern: any[];
  coords: BoardCoords;

  constructor(iBlockRow: number, iBlock: number, iRow: number, iTile: number, pattern: any[]) {
    this.coords = new BoardCoords(iBlockRow, iBlock, iRow, iTile);
    this.pattern = pattern;
  }
}

class Shape {
  pattern: any[] = [];
  isBeingDragged: boolean = false;
  dragPoint?: any;
}

class CurrentlyDragged {
  pattern: any[] = [];
  startPoint: string[] = [];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  currentlyDragged: CurrentlyDragged | undefined;

  shapeSet: Shape[] = [];
  board: Tile[][][][] = [];
  flatBoard: Tile[] = [];

  generatorBoard: Tile[][][][] = [];

  score: number = 0;

  readonly patterns = [
    [
      [
        [
          [new Tile(0, 0, 0, 0, true), new Tile(0, 0, 0, 1, true), new Tile(0, 0, 0, 2, true)],
        ]
      ]
    ],
    [
      [
        [
          [new Tile(0, 0, 0, 0, true), new Tile(0, 0, 0, 1, true), new Tile(0, 0, 0, 2, false)],
          [new Tile(0, 0, 1, 0, true), new Tile(0, 0, 1, 1, true), new Tile(0, 0, 1, 2, false)],
        ]
      ]
    ],
  ];

  readonly BOARD_BLOCK_ROW_LIMIT = 3;
  readonly BOARD_BLOCK_LIMIT = 3;
  readonly BOARD_ROW_LIMIT = 3;
  readonly BOARD_TILE_LIMIT = 3;

  readonly LINE_SCORE = 9;
  readonly BLOCK_SCORE = 9;

  get emptyBoard() {
    return Array.from(
      { length: this.BOARD_BLOCK_ROW_LIMIT },
      (el, iBlockRow) => Array.from(
        { length: this.BOARD_BLOCK_LIMIT },
        (el, iBlock) => Array.from(
          { length: this.BOARD_ROW_LIMIT },
          (el, iRow) => Array.from(
            { length: this.BOARD_TILE_LIMIT },
            (el, iTile) => new Tile(iBlockRow, iBlock, iRow, iTile)
          )
        )
      )
    );
  }

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    this.createBoard();
    this.generateShapes();
  }

  onDragStart($event: DragEvent, shape: Shape) {
    if (!shape.dragPoint) {
      $event.preventDefault();
      return;
    }

    this.currentlyDragged = {
      pattern: shape.pattern,
      startPoint: shape.dragPoint.id.split(';').slice(1)
    };

    $event.dataTransfer?.setData(
      'shape',
      JSON.stringify({
        pattern: shape.pattern,
        startPoint: shape.dragPoint.id.split(';').slice(1)
      })
    )

    // console.log('---drag---')
    // console.log($event)
  }

  onDrop($event: DragEvent) {
    const shapeDataStr = $event.dataTransfer?.getData('shape');

    if (shapeDataStr) {
      const shapeDataJson: any = JSON.parse(shapeDataStr);
      const shapeData = new InsertShapeData(+shapeDataJson.startPoint[0], +shapeDataJson.startPoint[1], +shapeDataJson.startPoint[2], +shapeDataJson.startPoint[3], shapeDataJson.pattern);

      const dropCoordsArray: number[] = ($event.target as HTMLElement).id.split(';').slice(1).map(el => +el);

      const dropCoords = new BoardCoords(dropCoordsArray[0], dropCoordsArray[1], dropCoordsArray[2], dropCoordsArray[3]);

      this.insertShape(shapeData, dropCoords);
    }
  }

  onDragOver($event: DragEvent) {
    $event.preventDefault();

    this.runCleanProjection();

    if (this.currentlyDragged) {
      const shapeData = new InsertShapeData(
        +this.currentlyDragged.startPoint[0],
        +this.currentlyDragged.startPoint[1],
        +this.currentlyDragged.startPoint[2],
        +this.currentlyDragged.startPoint[3],
        this.currentlyDragged.pattern
      );

      const dropCoordsArray: number[] = ($event.target as HTMLElement).id.split(';').slice(1).map(el => +el);
      const dropCoords = new BoardCoords(dropCoordsArray[0], dropCoordsArray[1], dropCoordsArray[2], dropCoordsArray[3]);

      this.projectShape(shapeData, dropCoords);

      this.runMathes((tile: Tile) => tile.isMatchPreview = true, true);
    }
  }

  setStartPoint($event: MouseEvent, shape: Shape) {
    shape.isBeingDragged = true;
    shape.dragPoint = $event.target || undefined;
    console.log('---- start child---')
    console.log($event)
  }

  onDragEnd($event: MouseEvent, shape: Shape) {
    shape.isBeingDragged = false;
    shape.dragPoint = undefined;
    this.runCleanProjection();
    delete this.currentlyDragged;
  }

  generateShape() {
    const shape = this.generatorBoard
      .filter(x => x.some(y => y.some(z => z.some(u => u.isFilled))))
      .map(x => x.map(y => y.map(z => z.map(u => `/new Tile(${u.coords.iBlock},${u.coords.iRow},${u.coords.iTile},${u.isFilled})/`))));

    console.table(JSON.stringify(shape).replace(/\"/g, '').replace(/\//g, ''));
  }

  private insertShape(shapeData: InsertShapeData, dropCoords: BoardCoords) {
    const dTile = dropCoords.iTile - shapeData.coords.iTile;
    const dRow = dropCoords.iRow - shapeData.coords.iRow;
    const dBlock = dropCoords.iBlock - shapeData.coords.iBlock;
    const dBlockRow = dropCoords.iBlockRow - shapeData.coords.iBlockRow;

    // console.log(dTile)
    // console.log(dRow)
    // console.log(dBlock)

    // console.log(shapeData.coords)
    // console.log(dropCoords)

    _.flattenDeep(shapeData.pattern).forEach((tile: Tile) => {
      this.applyTile(
        tile,
        dBlockRow,
        dBlock,
        dRow,
        dTile,
        (projectedTile: Tile) => projectedTile.isFilled = true
      );
    });

    let matchedTiles: Tile[] = [];

    this.runMathes((tile: Tile) => {
      if (!matchedTiles.find(x => x.coords.stringValue === tile.coords.stringValue)) {
        matchedTiles.push(tile);
      }
    });

    matchedTiles.forEach(tile => tile.isFilled = false);
  }

  private projectShape(shapeData: InsertShapeData, dropCoords: BoardCoords) {
    const dTile = dropCoords.iTile - shapeData.coords.iTile;
    const dRow = dropCoords.iRow - shapeData.coords.iRow;
    const dBlock = dropCoords.iBlock - shapeData.coords.iBlock;
    const dBlockRow = dropCoords.iBlockRow - shapeData.coords.iBlockRow;

    // console.log(dTile)
    // console.log(dRow)
    // console.log(dBlock)

    // console.log(shapeData.coords)
    // console.log(dropCoords)

    _.flattenDeep(shapeData.pattern).forEach((tile: Tile) => {
      this.applyTile(
        tile,
        dBlockRow,
        dBlock,
        dRow,
        dTile,
        (projectedTile: Tile) => projectedTile.isProjection = true
      );
    });
  }

  private runMathes(tileAction: Function, includeProjection: boolean = false) {
    this.board.forEach(blockRow => {
      blockRow.forEach(block => {
        if (block.every(row => row.every(tile => tile.isFilled || (includeProjection && tile.isProjection)))) {
          block.forEach((row => row.forEach(tile => tileAction(tile))))

          if (!includeProjection) {
            this.score += this.BLOCK_SCORE;
          }
        }
      });
    });

    const flatBoard: Tile[] = _.flattenDeep(this.board);

    const horizontalLines: Tile[][] = Array.from({ length: 9 }, () => []);
    const verticalLines: Tile[][] = Array.from({ length: 9 }, () => []);

    for (let i = 0; i < flatBoard.length; i++) {
      let horizontalIndexOffset = 0;
      if (flatBoard[i].coords.iBlock <= 2) {
        horizontalIndexOffset = 0;
      } else if (flatBoard[i].coords.iBlock <= 5) {
        horizontalIndexOffset = 3;
      } else {
        horizontalIndexOffset = 6;
      }

      const iHorizontal = horizontalIndexOffset + flatBoard[i].coords.iRow;
      horizontalLines[iHorizontal].push(flatBoard[i]);

      let verticalIndexOffset = 0;
      if (flatBoard[i].coords.iBlock % 3 === 0) {
        verticalIndexOffset = 0;
      } else if (flatBoard[i].coords.iBlock % 3 === 1) {
        verticalIndexOffset = 3;
      } else {
        verticalIndexOffset = 6;
      }

      const iVertical = verticalIndexOffset + flatBoard[i].coords.iTile;
      verticalLines[iVertical].push(flatBoard[i]);
    }

    const lines: Tile[][] = [...verticalLines, ...horizontalLines];
    // console.log(lines)

    lines.forEach(line => {
      if (line.every(tile => tile.isFilled || (includeProjection && tile.isProjection))) {
        line.forEach(tile => tileAction(tile));

        if (!includeProjection) {
          this.score += this.LINE_SCORE;
        }
      }
    });
  }

  private runCleanProjection() {
    for (let i = 0; i < this.flatBoard.length; i++) {
      this.flatBoard[i].isProjection = false;
      this.flatBoard[i].isMatchPreview = false;
    }
  }

  private applyTile(
    tile: Tile,
    dBlockRow: number,
    dBlock: number,
    dRow: number,
    dTile: number,
    tileActionCallback: Function
  ) {
    if (!tile.isFilled) {
      return;
    }

    let dxBlockRow = tile.coords.iBlockRow + dBlockRow;
    let dxBlock = tile.coords.iBlock + dBlock;
    let dxRow = tile.coords.iRow + dRow;
    let dxTile = tile.coords.iTile + dTile;

    // console.log('0-----0')
    // console.log(tile.coords)
    // console.log({ dBlockRow, dBlock, dRow, dTile })
    // console.log({ dxBlockRow, dxBlock, dxRow, dxTile })

    if (dxTile > this.BOARD_TILE_LIMIT - 1) {
      dxBlock += 1;
      dxTile = Math.abs(Math.abs(dxTile) - this.BOARD_TILE_LIMIT);
    } else if (dxTile < 0) {
      dxBlock -= 1;
      dxTile = this.BOARD_TILE_LIMIT - Math.abs(dxTile);
    }

    if (dxRow > this.BOARD_ROW_LIMIT - 1) {
      dxBlockRow += 1;
      dxRow = Math.abs(Math.abs(dxRow) - this.BOARD_ROW_LIMIT);
    } else if (dxRow < 0) {
      dxBlockRow -= 1;
      dxRow = this.BOARD_ROW_LIMIT - Math.abs(dxRow);
    }

    const dCoords = new BoardCoords(dxBlockRow, dxBlock, dxRow, dxTile);

    // console.log(dCoords)

    const tileInBoard = this.flatBoard.find(x => x.coords.stringValue === dCoords.stringValue);


    if (!!tileInBoard) {
      tileActionCallback(tileInBoard);
    }
  }

  private createBoard() {
    this.board = this.emptyBoard;
    console.table(this.board)
    // this.cdr.detectChanges();

    this.generatorBoard = this.emptyBoard;

    this.flatBoard = _.flattenDeep(this.board);
  }

  private generateShapes() {
    this.shapeSet = this.patterns.map(pattern => {
      const shape = new Shape();
      shape.pattern = pattern;
      return shape;
    })
    // const shape = new Shape();
    // // shape.pattern = Array.from({ length: 1 }, (el, iBlock) => Array.from({ length: 2 }, (el, iRow) => Array.from({ length: 2 }, (el, iTile) => new Tile(iBlock, iRow, iTile, true))));
    // shape.pattern = [[[new Tile(0,0,0,true),new Tile(0,0,1,true),new Tile(0,0,2,false)],[new Tile(0,1,0,true),new Tile(0,1,1,false),new Tile(0,1,2,false)],[new Tile(0,2,0,true),new Tile(0,2,1,false),new Tile(0,2,2,false)]]];
    // this.shapeSet.push(shape)

    // const shape2 = new Shape();
    // shape2.pattern = [
    //   [
    //     [new Tile(3, 0, 0, false), new Tile(3, 0, 1, false), new Tile(3, 0, 2, false)], 
    //     [new Tile(3, 1, 0, false), new Tile(3, 1, 1, false), new Tile(3, 1, 2, true)], 
    //     [new Tile(3, 2, 0, false), new Tile(3, 2, 1, false), new Tile(3, 2, 2, false)]
    //   ], [[new Tile(4, 0, 0, false), new Tile(4, 0, 1, false), new Tile(4, 0, 2, false)], 
    //   [new Tile(4, 1, 0, true), new Tile(4, 1, 1, false), new Tile(4, 1, 2, true)], [new Tile(4, 2, 0, true), new Tile(4, 2, 1, false), new Tile(4, 2, 2, true)]], [[new Tile(5, 0, 0, false), new Tile(5, 0, 1, false), new Tile(5, 0, 2, false)], [new Tile(5, 1, 0, true), new Tile(5, 1, 1, false), new Tile(5, 1, 2, false)], [new Tile(5, 2, 0, false), new Tile(5, 2, 1, false), new Tile(5, 2, 2, false)]], [[new Tile(7, 0, 0, true), new Tile(7, 0, 1, true), new Tile(7, 0, 2, true)], [new Tile(7, 1, 0, false), new Tile(7, 1, 1, false), new Tile(7, 1, 2, false)], [new Tile(7, 2, 0, false), new Tile(7, 2, 1, false), new Tile(7, 2, 2, false)]]];
    // this.shapeSet.push(shape2)

    // const shape3 = new Shape();
    // shape3.pattern = [[[new Tile(0, 0, 0, false), new Tile(0, 0, 1, false), new Tile(0, 0, 2, false)], [new Tile(0, 1, 0, false), new Tile(0, 1, 1, false), new Tile(0, 1, 2, true)], [new Tile(0, 2, 0, false), new Tile(0, 2, 1, true), new Tile(0, 2, 2, true)]], [[new Tile(1, 0, 0, false), new Tile(1, 0, 1, false), new Tile(1, 0, 2, false)], [new Tile(1, 1, 0, true), new Tile(1, 1, 1, false), new Tile(1, 1, 2, true)], [new Tile(1, 2, 0, true), new Tile(1, 2, 1, true), new Tile(1, 2, 2, true)]], [[new Tile(2, 0, 0, false), new Tile(2, 0, 1, false), new Tile(2, 0, 2, false)], [new Tile(2, 1, 0, true), new Tile(2, 1, 1, false), new Tile(2, 1, 2, false)], [new Tile(2, 2, 0, true), new Tile(2, 2, 1, true), new Tile(2, 2, 2, false)]], [[new Tile(3, 0, 0, false), new Tile(3, 0, 1, true), new Tile(3, 0, 2, true)], [new Tile(3, 1, 0, false), new Tile(3, 1, 1, false), new Tile(3, 1, 2, true)], [new Tile(3, 2, 0, false), new Tile(3, 2, 1, false), new Tile(3, 2, 2, false)]], [[new Tile(4, 0, 0, true), new Tile(4, 0, 1, true), new Tile(4, 0, 2, true)], [new Tile(4, 1, 0, true), new Tile(4, 1, 1, true), new Tile(4, 1, 2, true)], [new Tile(4, 2, 0, true), new Tile(4, 2, 1, true), new Tile(4, 2, 2, true)]], [[new Tile(5, 0, 0, true), new Tile(5, 0, 1, true), new Tile(5, 0, 2, false)], [new Tile(5, 1, 0, true), new Tile(5, 1, 1, false), new Tile(5, 1, 2, false)], [new Tile(5, 2, 0, false), new Tile(5, 2, 1, false), new Tile(5, 2, 2, false)]], [[new Tile(7, 0, 0, false), new Tile(7, 0, 1, true), new Tile(7, 0, 2, false)], [new Tile(7, 1, 0, false), new Tile(7, 1, 1, false), new Tile(7, 1, 2, false)], [new Tile(7, 2, 0, false), new Tile(7, 2, 1, false), new Tile(7, 2, 2, false)]]];
    // this.shapeSet.push(shape3)

    // const shape4 = new Shape();
    // shape4.pattern = [[[new Tile(0, 0, 0, true), new Tile(0, 0, 1, true), new Tile(0, 0, 2, false)], [new Tile(0, 1, 0, false), new Tile(0, 1, 1, false), new Tile(0, 1, 2, true)], [new Tile(0, 2, 0, false), new Tile(0, 2, 1, false), new Tile(0, 2, 2, true)]], [[new Tile(1, 0, 0, false), new Tile(1, 0, 1, true), new Tile(1, 0, 2, false)], [new Tile(1, 1, 0, true), new Tile(1, 1, 1, false), new Tile(1, 1, 2, true)], [new Tile(1, 2, 0, false), new Tile(1, 2, 1, true), new Tile(1, 2, 2, false)]], [[new Tile(2, 0, 0, false), new Tile(2, 0, 1, true), new Tile(2, 0, 2, true)], [new Tile(2, 1, 0, true), new Tile(2, 1, 1, false), new Tile(2, 1, 2, false)], [new Tile(2, 2, 0, true), new Tile(2, 2, 1, false), new Tile(2, 2, 2, false)]], [[new Tile(3, 0, 0, false), new Tile(3, 0, 1, true), new Tile(3, 0, 2, true)], [new Tile(3, 1, 0, true), new Tile(3, 1, 1, true), new Tile(3, 1, 2, false)], [new Tile(3, 2, 0, true), new Tile(3, 2, 1, false), new Tile(3, 2, 2, true)]], [[new Tile(4, 0, 0, false), new Tile(4, 0, 1, false), new Tile(4, 0, 2, false)], [new Tile(4, 1, 0, true), new Tile(4, 1, 1, true), new Tile(4, 1, 2, true)], [new Tile(4, 2, 0, false), new Tile(4, 2, 1, true), new Tile(4, 2, 2, false)]], [[new Tile(5, 0, 0, true), new Tile(5, 0, 1, true), new Tile(5, 0, 2, false)], [new Tile(5, 1, 0, false), new Tile(5, 1, 1, true), new Tile(5, 1, 2, true)], [new Tile(5, 2, 0, true), new Tile(5, 2, 1, false), new Tile(5, 2, 2, true)]], [[new Tile(6, 0, 0, true), new Tile(6, 0, 1, false), new Tile(6, 0, 2, false)], [new Tile(6, 1, 0, true), new Tile(6, 1, 1, true), new Tile(6, 1, 2, true)], [new Tile(6, 2, 0, false), new Tile(6, 2, 1, false), new Tile(6, 2, 2, true)]], [[new Tile(7, 0, 0, true), new Tile(7, 0, 1, false), new Tile(7, 0, 2, true)], [new Tile(7, 1, 0, false), new Tile(7, 1, 1, true), new Tile(7, 1, 2, false)], [new Tile(7, 2, 0, true), new Tile(7, 2, 1, true), new Tile(7, 2, 2, true)]], [[new Tile(8, 0, 0, false), new Tile(8, 0, 1, false), new Tile(8, 0, 2, true)], [new Tile(8, 1, 0, true), new Tile(8, 1, 1, true), new Tile(8, 1, 2, true)], [new Tile(8, 2, 0, true), new Tile(8, 2, 1, false), new Tile(8, 2, 2, false)]]];
    // this.shapeSet.push(shape4)
  }
}