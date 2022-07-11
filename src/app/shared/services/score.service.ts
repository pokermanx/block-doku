import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ScoreService {

    readonly HIGHSCORE_KEY = 'highscore';

    highscore = 0;

    constructor() {
        const scoreFromStorage = localStorage.getItem(this.HIGHSCORE_KEY);
        if (scoreFromStorage) {
            this.highscore = +scoreFromStorage;
        }
    }

    setHighScore(score: number) {
        if (score > this.highscore) {
            localStorage.setItem(this.HIGHSCORE_KEY, score.toString());
            this.highscore = score;
        }
    }
}