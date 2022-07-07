import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';
import { GameState } from './shared/enums/game-state.enum';

import { BoardCoords, CurrentlyDragged, DeltaCoords, Size } from './shared/models/misc.model';
import { InsertShapeData, Shape } from './shared/models/shape.model';
import { Tile } from './shared/models/tile.model';
import { GameStateService } from './shared/services/gamestate.service';
import { ShapesService } from './shared/services/shapes.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    board: Tile[][][][] = [];
    flatBoard: Tile[] = [];

    shapeSet: Shape[] = [];
    currentPlayShapes: Shape[] = [];

    generatorBoard: Tile[][][][] = [];

    currentlyDragged: CurrentlyDragged | undefined;

    score: number = 0;

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
        return this.separateByRows(this.board);
    }

    private get boardsColumns(): Tile[][] {
        return this.separateByColumns(this.board);
    }

    constructor(
        public gameState: GameStateService,

        private shapesService: ShapesService,
    ) {
        this.createBoard();
        this.generateShapes();
    }

    ngOnInit(): void {
        this.startGame();
    }

    startGame() {
        this.flatBoard.forEach(tile => {
            tile.isFilled = false;
            tile.isMatch = false;
            tile.isProjection = false;
        });

        this.score = 0;

        this.updateCurrentPlayShapes();

        this.gameState.setGameState(GameState.InProgress);
    }

    onDragStart($event: DragEvent, shape: Shape): void {
        if (!shape.dragPoint) {
            $event.preventDefault();
            return;
        }

        this.currentlyDragged = {
            index: shape.index as number,
            pattern: shape.pattern,
            startPoint: shape.dragPoint.id.split(';').slice(1),
            patternSize: shape.patternSize
        };
    }

    onDrop($event: DragEvent): void {
        this.insertShape();
    }

    onDragOver($event: DragEvent): void {
        $event.preventDefault();

        this.runCleanProjection();

        if (this.currentlyDragged) {
            const shapeData = new InsertShapeData(
                this.currentlyDragged.startPoint[0],
                this.currentlyDragged.startPoint[1],
                this.currentlyDragged.startPoint[2],
                this.currentlyDragged.startPoint[3],
                this.currentlyDragged.pattern,
                this.currentlyDragged.patternSize
            );

            const dropCoordsArray: number[] = ($event.target as HTMLElement).id.split(';').slice(1).map(el => +el);
            const dropCoords = new BoardCoords(dropCoordsArray[0], dropCoordsArray[1], dropCoordsArray[2], dropCoordsArray[3]);

            const projectedTiles = this.projectShape(shapeData, dropCoords);

            if (!!projectedTiles.length) {
                projectedTiles.forEach(tile => tile.isProjection = true);
                this.runMathes();
            }
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
            .map(x => x.map(y => y.map(z => z.map(u => `/new Tile(${u.coords.iBlockRow},${u.coords.iBlock},${u.coords.iRow},${u.coords.iTile},${u.isFilled})/`))));

        console.table(JSON.stringify(shape).replace(/\"/g, '').replace(/\//g, ''));
    }

    private updateCurrentPlayShapes() {
        this.currentPlayShapes = _.sampleSize(this.shapeSet, 3);
        this.currentPlayShapes.forEach((shape, i) => shape.index = i);
    }

    private insertShape(): void {
        if (this.currentlyDragged && this.flatBoard.some(x => x.isProjection)) {
            this.applyShape();
            this.applyMatches();

            this.currentPlayShapes = this.currentPlayShapes.filter(x => x.index !== this.currentlyDragged?.index)

            if (this.currentPlayShapes.length === 0) {
                this.updateCurrentPlayShapes();
            }

            if (this.checkGameOver()) {
                this.gameState.setGameState(GameState.GameOver);
            }
        }
    }

    private projectShape(shapeData: InsertShapeData, dropCoords: BoardCoords): Tile[] {
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
            return [];
        }

        const toProjectTiles = _.flattenDeep(shapeData.pattern)
            .map((tile: Tile) => {
                if (!tile.isFilled) {
                    return;
                }

                const { dxBlockRow, dxBlock, dxRow, dxTile }: any = this.calculateTilePosition(tile, { dBlockRow, dBlock, dRow, dTile });
                const dCoords = new BoardCoords(dxBlockRow, dxBlock, dxRow, dxTile);

                return this.flatBoard.find(x => x.coords.numberValue === dCoords.numberValue);
            })
            .filter(x => !!x) as Tile[];

        if (toProjectTiles.some(x => x.isFilled)) {
            return [];
        }

        return toProjectTiles;
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

        matches.forEach(match => {
            match.isFilled = false;
            match.isMatch = false;
            match.isProjection = false;
        });
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

        this.generatorBoard = this.emptyBoard;

        this.flatBoard = _.flattenDeep(this.board);
    }

    private generateShapes(): void {
        this.shapeSet = this.shapesService.shapes.map(pattern => new Shape(pattern, this.calculatePatternSize(pattern)));
        console.log(this.shapeSet)
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

        const mappedRows = this.separateByRows(projection).map(row => row.map(tile => tile.isFilled));
        const mappedColumns = this.separateByColumns(projection).map(column => column.map(tile => tile.isFilled));

        return {
            width: Math.max(...mappedRows.map(row => row.lastIndexOf(true) + 1)),
            height: Math.max(...mappedColumns.map(row => row.lastIndexOf(true) + 1)),
        };
    }

    private separateByRows(board: Tile[][][][]) {
        return _.flatten(board.map(blockRow => {
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

    private separateByColumns(board: Tile[][][][]) {
        const columns: Tile[][] = [];
        const rows = this.separateByRows(board);

        for (let columnI = 0; columnI < this.boardTileHeight; columnI++) {
            columns[columnI] = rows.map(row => row[columnI]);
        }

        return columns;
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

    private checkGameOver() {
        const emptyTiles = this.flatBoard.filter(x => !x.isFilled);

        for (let shapeI = 0; shapeI < this.currentPlayShapes.length; shapeI++) {
            const flatShapeTiles = _.flattenDeep(this.currentPlayShapes[shapeI].pattern) as Tile[];

            const firstDragPoint = flatShapeTiles.find(x => x.isFilled);

            if (!firstDragPoint) {
                throw new Error('Empty Shape');
            }

            const shapeData = new InsertShapeData(
                firstDragPoint.coords.iBlockRow,
                firstDragPoint.coords.iBlock,
                firstDragPoint.coords.iRow,
                firstDragPoint.coords.iTile,
                this.currentPlayShapes[shapeI].pattern,
                this.currentPlayShapes[shapeI].patternSize
            );

            for (let emptyTileI = 0; emptyTileI < emptyTiles.length; emptyTileI++) {
                const dropCoords = new BoardCoords(
                    emptyTiles[emptyTileI].coords.iBlockRow,
                    emptyTiles[emptyTileI].coords.iBlock,
                    emptyTiles[emptyTileI].coords.iRow,
                    emptyTiles[emptyTileI].coords.iTile
                );

                const projectedTiles = this.projectShape(shapeData, dropCoords);

                if (!!projectedTiles.length) {
                    return false;
                }
            }
        }

        return true;
    }
}