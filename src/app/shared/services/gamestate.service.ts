import { Injectable } from "@angular/core";
import { GameState } from "../enums/game-state.enum";

@Injectable({
    providedIn: 'root'
})
export class GameStateService {

    gameState: GameState = GameState.Menu;

    get isGameOver() {
        return this.gameState === GameState.GameOver;
    }
    get isGameRunning() {
        return this.gameState === GameState.InProgress;
    }
    get isGameMenu() {
        return this.gameState === GameState.Menu;
    }

    setGameState(state: GameState) {
        this.gameState = state;
    }
}