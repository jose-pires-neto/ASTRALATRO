import { SUITS, RANKS } from '../constants.js';
import { createCardTexture } from '../graphics/TextureGenerator.js';

export class GameState {
    constructor() {
        this.deck = [];
        this.hand = [];
        this.selectedCards = [];
        this.score = 0;
        this.targetScore = 300;
        this.handsLeft = 4;
        this.discardsLeft = 3;
        this.state = 'playing';
        this.currentBlind = 1;

        // Economia e Progresso Sombrio
        this.souls = 0; 
        this.relics = [];

        // Stats da Run (para Game Over screen)
        this.runStats = {
            blindsReached: 0,
            bestHandName: '—',
            bestScore: 0,
            totalSouls: 0
        };
    }

    trackHandPlayed(handName, score) {
        if (score > this.runStats.bestScore) {
            this.runStats.bestScore = score;
            this.runStats.bestHandName = handName;
        }
    }

    createDeck() {
        this.deck = [];
        for (let suit of SUITS) {
            for (let rank of RANKS) {
                let chips = parseInt(rank);
                if (['J', 'Q', 'K'].includes(rank)) chips = 10;
                if (rank === 'A') chips = 11;

                this.deck.push({
                    id: Math.random().toString(36).substr(2, 9),
                    rank: rank,
                    suit: suit,
                    chips: chips,
                    mult: 0,
                    texture: createCardTexture(rank, suit)
                });
            }
        }
        // Shuffle
        this.deck.sort(() => Math.random() - 0.5);
    }

    reset() {
        this.currentBlind = 1;
        this.targetScore = 300;
        this.score = 0;
        this.handsLeft = 4;
        this.discardsLeft = 3;
        this.selectedCards = [];
        this.hand = [];
        this.state = 'playing';
        
        this.souls = 0;
        this.relics = []; 
        
        this.runStats = {
            blindsReached: 0,
            bestHandName: '—',
            bestScore: 0,
            totalSouls: 0
        };
        
        this.createDeck();
    }

    calculateBlindReward() {
        // Base ganha por sobreviver + bônus por mãos e descartes economizados
        const baseReward = 3;
        const handsBonus = this.handsLeft * 1;
        const discardsBonus = this.discardsLeft * 1; // Pode ser dobrado se Moeda de Caronte existir!
        
        const totalEarned = baseReward + handsBonus + discardsBonus;
        return { totalEarned, baseReward, handsBonus, discardsBonus };
    }

    nextBlind() {
        this.currentBlind++;
        this.runStats.blindsReached = this.currentBlind;
        this.runStats.totalSouls = this.souls;
        this.targetScore = Math.floor(this.targetScore * 2.5);
        this.score = 0;
        this.handsLeft = 4;
        this.discardsLeft = 3;
        this.selectedCards = [];
        this.hand = [];
        this.state = 'playing';
        this.createDeck();
    }
}
