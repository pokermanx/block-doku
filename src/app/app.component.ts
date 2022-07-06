import { Component } from '@angular/core';
import * as _ from 'lodash';

import { BoardCoords, CurrentlyDragged, DeltaCoords, Size } from './shared/models/misc.model';
import { InsertShapeData, Shape } from './shared/models/shape.model';
import { Tile } from './shared/models/tile.model';

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
                    [new Tile(0, 0, 0, 0, true), new Tile(0, 0, 0, 1, true), new Tile(0, 0, 0, 2, true)],
                ],
                [
                    [new Tile(0, 1, 0, 0, true), new Tile(0, 1, 0, 1, true), new Tile(0, 1, 0, 2, true)],
                ]
            ]
        ],
        [
            [
                [
                    [new Tile(0, 0, 0, 0, true), new Tile(0, 0, 0, 1, false), new Tile(0, 0, 0, 2, false)],
                    [new Tile(0, 0, 1, 0, true), new Tile(0, 0, 1, 1, false), new Tile(0, 0, 1, 2, false)],
                    [new Tile(0, 0, 2, 0, true), new Tile(0, 0, 2, 1, false), new Tile(0, 0, 2, 2, false)],
                ],
                [
                    [new Tile(0, 1, 0, 0, false), new Tile(0, 1, 0, 1, false), new Tile(0, 1, 0, 2, false)],
                    [new Tile(0, 1, 1, 0, false), new Tile(0, 1, 1, 1, false), new Tile(0, 1, 1, 2, false)],
                    [new Tile(0, 1, 2, 0, false), new Tile(0, 1, 2, 1, false), new Tile(0, 1, 2, 2, false)],
                ],
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

    readonly TILE_SCORE = 5;

    get boardTileHeight(): number {
        return this.BOARD_BLOCK_ROW_LIMIT * this.BOARD_ROW_LIMIT;
    }
    get boardTileWidth(): number {
        return this.BOARD_BLOCK_LIMIT * this.BOARD_TILE_LIMIT;
    }

    get emptyBoard(): Tile[][][][] {
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

    // This looks like a better approach to making rows and columns 
    // that I once came up with but I can`t really remember
    // what logic was I following so it`s here for the better day
    /*
        for (let i = 0; i < this.flatBoard.length; i++) {
            let horizontalIndexOffset = 0;
            if (this.flatBoard[i].coords.iBlock <= 2) {
                horizontalIndexOffset = 0;
            } else if (this.flatBoard[i].coords.iBlock <= 5) {
                horizontalIndexOffset = 3;
            } else {
                horizontalIndexOffset = 6;
            }
    
            const iHorizontal = horizontalIndexOffset + this.flatBoard[i].coords.iRow;
            horizontalLines[iHorizontal].push(this.flatBoard[i]);
    
            let verticalIndexOffset = 0;
            if (this.flatBoard[i].coords.iBlock % 3 === 0) {
                verticalIndexOffset = 0;
            } else if (this.flatBoard[i].coords.iBlock % 3 === 1) {
                verticalIndexOffset = 3;
            } else {
                verticalIndexOffset = 6;
            }
    
            const iVertical = verticalIndexOffset + this.flatBoard[i].coords.iTile;
            verticalLines[iVertical].push(this.flatBoard[i]);
        }
    */

    private get boardsRows(): Tile[][] {
        return _.flatten(this.board.map(blockRow => {
            const rows: Tile[][] = [];

            for (let rowI = 0; rowI < this.BOARD_ROW_LIMIT; rowI++) {
                blockRow.map(block => {
                    if (!rows[rowI]) {
                        rows[rowI] = [];
                    }

                    rows[rowI] = rows[rowI].concat(block[rowI]);
                });
            }

            return rows;
        }));
    }

    private get boardsColumns(): Tile[][] {
        const columns: Tile[][] = [];
        const rows = this.boardsRows;

        for (let columnI = 0; columnI < this.boardTileHeight; columnI++) {
            columns[columnI] = rows.map(row => row[columnI]);
        }

        return columns;
    }

    constructor() {
        this.createBoard();
        this.generateShapes();
    }

    onDragStart($event: DragEvent, shape: Shape): void {
        if (!shape.dragPoint) {
            $event.preventDefault();
            return;
        }

        this.currentlyDragged = {
            pattern: shape.pattern,
            startPoint: shape.dragPoint.id.split(';').slice(1),
            patternSize: shape.patternSize
        };
    }

    onDrop($event: DragEvent): void {
        if (this.currentlyDragged) {
            this.insertShape();
        }
    }

    onDragOver($event: DragEvent): void {
        $event.preventDefault();

        this.runCleanProjection();

        if (this.currentlyDragged) {
            const shapeData = new InsertShapeData(
                +this.currentlyDragged.startPoint[0],
                +this.currentlyDragged.startPoint[1],
                +this.currentlyDragged.startPoint[2],
                +this.currentlyDragged.startPoint[3],
                this.currentlyDragged.pattern,
                this.currentlyDragged.patternSize
            );

            const dropCoordsArray: number[] = ($event.target as HTMLElement).id.split(';').slice(1).map(el => +el);
            const dropCoords = new BoardCoords(dropCoordsArray[0], dropCoordsArray[1], dropCoordsArray[2], dropCoordsArray[3]);

            this.projectShape(shapeData, dropCoords);

            this.runMathes();
        }
    }

    setStartPoint($event: MouseEvent, shape: Shape): void {
        shape.isBeingDragged = true;
        shape.dragPoint = $event.target || undefined;
    }

    onDragEnd($event: MouseEvent, shape: Shape): void {
        shape.isBeingDragged = false;
        shape.dragPoint = undefined;
        this.runCleanProjection();
        delete this.currentlyDragged;
    }

    generateShape(): void {
        const shape = this.generatorBoard
            .filter(x => x.some(y => y.some(z => z.some(u => u.isFilled))))
            .map(x => x.map(y => y.map(z => z.map(u => `/new Tile(${u.coords.iBlock},${u.coords.iRow},${u.coords.iTile},${u.isFilled})/`))));

        console.table(JSON.stringify(shape).replace(/\"/g, '').replace(/\//g, ''));
    }

    private insertShape(): void {
        this.applyShape();
        this.applyMatches();
    }

    private projectShape(shapeData: InsertShapeData, dropCoords: BoardCoords): void {
        const dBlockRow = dropCoords.iBlockRow - shapeData.coords.iBlockRow;
        const dBlock = dropCoords.iBlock - shapeData.coords.iBlock;
        const dRow = dropCoords.iRow - shapeData.coords.iRow;
        const dTile = dropCoords.iTile - shapeData.coords.iTile;

        if (
            !this.shapeFitsInBoard(
                shapeData.patternSize as Size,
                { dBlockRow, dBlock, dRow, dTile }
            )
        ) {
            return;
        }

        const toProjectTiles = _.flattenDeep(shapeData.pattern)
            .map((tile: Tile) => {
                if (!tile.isFilled) {
                    return;
                }

                const { dxBlockRow, dxBlock, dxRow, dxTile }: any = this.calculateTilePosition(tile, { dBlockRow, dBlock, dRow, dTile });
                const dCoords = new BoardCoords(dxBlockRow, dxBlock, dxRow, dxTile);

                return this.flatBoard.find(x => x.coords.stringValue === dCoords.stringValue);
            })
            .filter(x => !!x) as Tile[];

        if (toProjectTiles.some(x => x.isFilled)) {
            return;
        }

        toProjectTiles.forEach(tile => tile.isProjection = true);
    }

    private runMathes(): void {
        this.board.forEach(blockRow => {
            blockRow.forEach(block => {
                if (block.every(row => row.every(tile => tile.isFilled || tile.isProjection))) {
                    block.forEach((row => row.forEach(tile => tile.isMatch = true)))
                }
            });
        });

        const lines: Tile[][] = [...this.boardsRows, ...this.boardsColumns];

        lines.forEach(line => {
            if (line.every(tile => tile.isFilled || tile.isProjection)) {
                line.forEach(tile => tile.isMatch = true);
            }
        });
    }

    private runCleanProjection() {
        for (let i = 0; i < this.flatBoard.length; i++) {
            this.flatBoard[i].isProjection = false;
            this.flatBoard[i].isMatch = false;
        }
    }

    private applyShape(): void {
        this.flatBoard.forEach(tile => {
            if (tile.isProjection) {
                tile.isFilled = true;
            }
        });
    }

    private applyMatches(): void {
        const matches = this.flatBoard.filter(x => x.isMatch);

        const multiplier = matches.length / 9;

        this.score += matches.length * multiplier * this.TILE_SCORE;

        matches.forEach(match => match.isFilled = false);
    }

    private calculateTilePosition(tile: Tile, deltaCoords: DeltaCoords) {
        let dxBlockRow = tile.coords.iBlockRow + deltaCoords.dBlockRow;
        let dxBlock = tile.coords.iBlock + deltaCoords.dBlock;
        let dxRow = tile.coords.iRow + deltaCoords.dRow;
        let dxTile = tile.coords.iTile + deltaCoords.dTile;

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

        return { dxBlockRow, dxBlock, dxRow, dxTile };
    }

    private createBoard(): void {
        this.board = this.emptyBoard;
        console.table(this.board)

        this.generatorBoard = this.emptyBoard;

        this.flatBoard = _.flattenDeep(this.board);
    }

    private generateShapes(): void {
        this.shapeSet = this.patterns.map(pattern => {
            const shape = new Shape();
            shape.pattern = pattern;
            shape.patternSize = this.calculatePatternSize(pattern);
            return shape;
        });
    }

    private calculatePatternSize(pattern: any[]): Size {
        const projection = this.emptyBoard;

        const flatPattern: any[] = _.flattenDeep(pattern);
        const flatProjection: any[] = _.flattenDeep(projection);

        flatPattern.forEach((tile: Tile) => {
            const existingTile = flatProjection.find((x: Tile) => x.coords.numberValue === tile.coords.numberValue);
            if (existingTile) {
                existingTile.isFilled = tile.isFilled;
            }
        });

        const mappedRows = _.flatten(projection
            .map(blockRow => {
                const rows: boolean[][] = [];

                for (let rowI = 0; rowI < this.BOARD_ROW_LIMIT; rowI++) {
                    blockRow.map(block => {
                        if (!rows[rowI]) {
                            rows[rowI] = [];
                        }

                        rows[rowI] = rows[rowI].concat(block[rowI].map(el => el.isFilled));
                    });
                }

                return rows;
            }));

        const mappedColumns: boolean[][] = [];

        for (let columnI = 0; columnI < this.boardTileHeight; columnI++) {
            mappedColumns[columnI] = mappedRows.map(row => row[columnI]);
        }

        return {
            width: Math.max(...mappedRows.map(row => row.lastIndexOf(true) + 1)),
            height: Math.max(...mappedColumns.map(row => row.lastIndexOf(true) + 1)),
        };
    }

    private shapeFitsInBoard(
        size: Size,
        deltaCoords: DeltaCoords
    ): boolean {
        if (deltaCoords.dBlock < 0 || (deltaCoords.dTile < 0 && deltaCoords.dBlock === 0)) {
            return false;
        }

        if (deltaCoords.dBlockRow < 0 || (deltaCoords.dRow < 0 && deltaCoords.dBlockRow === 0)) {
            return false;
        }

        const availableWidth = this.boardTileWidth - (deltaCoords.dBlock * this.BOARD_TILE_LIMIT) - deltaCoords.dTile;
        if (size.width > availableWidth) {
            return false;
        }

        const availableHeight = this.boardTileHeight - (deltaCoords.dBlockRow * this.BOARD_ROW_LIMIT) - deltaCoords.dRow;
        if (size.height > availableHeight) {
            return false;
        }

        return true;
    }
}