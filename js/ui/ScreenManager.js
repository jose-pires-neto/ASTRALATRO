import { SUITS, RANKS } from '../constants.js';
import { createCardTexture } from '../graphics/TextureGenerator.js';

export class ScreenManager {
    constructor() {
        this.screens = {
            title: document.getElementById('title-screen'),
            game: document.getElementById('ui-layer'),
            gameover: document.getElementById('gameover-screen'),
            pause: document.getElementById('pause-screen')
        };

        this.currentScreen = 'title';
        
        // Callbacks configuráveis pelo main.js
        this.onStartGame = null;
        this.onRestartGame = null;
        this.onBackToMenu = null;
        this.onResumeGame = null;

        this._bindButtons();
        
        // Card Rain: inicia se estiver no título
        this._cardRainInterval = null;
        this._startCardRain();
    }

    _bindButtons() {
        // Título
        document.getElementById('btn-start-ritual')?.addEventListener('click', () => {
            if (this.onStartGame) this.onStartGame();
        });

        // Game Over
        document.getElementById('btn-retry')?.addEventListener('click', () => {
            if (this.onRestartGame) this.onRestartGame();
        });
        document.getElementById('btn-go-menu')?.addEventListener('click', () => {
            if (this.onBackToMenu) this.onBackToMenu();
        });

        // Pause
        document.getElementById('btn-resume')?.addEventListener('click', () => {
            if (this.onResumeGame) this.onResumeGame();
        });
        document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
            if (this.onRestartGame) this.onRestartGame();
        });
        document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
            if (this.onBackToMenu) this.onBackToMenu();
        });
    }

    _bindPause() {
        // Tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.currentScreen === 'game') {
                    if (this.onPauseToggle) this.onPauseToggle(true);
                } else if (this.currentScreen === 'pause') {
                    if (this.onResumeGame) this.onResumeGame();
                }
            }
        });

        // Botão mobile de pausa
        document.getElementById('btn-pause')?.addEventListener('click', () => {
            if (this.currentScreen === 'game') {
                if (this.onPauseToggle) this.onPauseToggle(true);
            }
        });
    }

    transitionTo(screenName, data = {}) {
        // === Caso especial: PAUSE (overlay, não troca de tela) ===
        if (screenName === 'pause') {
            const pauseEl = this.screens['pause'];
            if (pauseEl) {
                pauseEl.classList.remove('hidden');
                pauseEl.classList.add('screen-fade-in');
                setTimeout(() => pauseEl.classList.remove('screen-fade-in'), 500);
            }
            this.currentScreen = 'pause';
            return;
        }

        // === Caso especial: saindo do PAUSE (volta pro game) ===
        if (this.currentScreen === 'pause' && screenName === 'game') {
            const pauseEl = this.screens['pause'];
            if (pauseEl) {
                pauseEl.classList.add('hidden');
            }
            this.currentScreen = 'game';
            return;
        }

        // === Transição normal entre telas ===
        const current = this.screens[this.currentScreen];
        if (current) {
            current.classList.add('screen-fade-out');
            setTimeout(() => {
                current.classList.add('hidden');
                current.classList.remove('screen-fade-out');
            }, 400);
        }

        // Mostra nova tela
        const next = this.screens[screenName];
        if (next) {
            setTimeout(() => {
                next.classList.remove('hidden');
                next.classList.add('screen-fade-in');
                setTimeout(() => next.classList.remove('screen-fade-in'), 500);
            }, 400);
        }

        // Popula dados especiais
        if (screenName === 'gameover' && data.stats) {
            this._populateGameOver(data.stats);
        }

        // Card Rain: liga/desliga
        if (screenName === 'title') {
            this._startCardRain();
        } else {
            this._stopCardRain();
        }

        this.currentScreen = screenName;
    }

    _populateGameOver(stats) {
        const el = (id) => document.getElementById(id);
        if (el('stat-blinds')) el('stat-blinds').innerText = stats.blindsReached || 0;
        if (el('stat-best-hand')) el('stat-best-hand').innerText = stats.bestHandName || '—';
        if (el('stat-best-score')) el('stat-best-score').innerText = (stats.bestScore || 0).toLocaleString();
        if (el('stat-total-souls')) el('stat-total-souls').innerText = stats.totalSouls || 0;
    }

    /* === Card Rain (Menu Background Animation) === */
    _startCardRain() {
        const container = document.getElementById('card-rain-container');
        if (!container) return;

        // Pré-gera um pool de imagens de cartas reais do jogo
        if (!this._cardImagePool) {
            this._cardImagePool = [];
            for (let i = 0; i < 16; i++) {
                const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
                const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
                const tex = createCardTexture(rank, suit);
                // Extrai o canvas usado pelo Three.js texture
                const dataUrl = tex.image.toDataURL();
                this._cardImagePool.push(dataUrl);
            }
        }

        const spawnCard = () => {
            const card = document.createElement('div');
            card.className = 'rain-card';
            
            // Usa uma carta real aleatória do pool
            const img = this._cardImagePool[Math.floor(Math.random() * this._cardImagePool.length)];
            card.style.backgroundImage = `url(${img})`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
            
            // Posição horizontal aleatória
            card.style.left = `${5 + Math.random() * 90}%`;
            card.style.bottom = `-80px`;
            
            // Duração aleatória (8-14s)
            const duration = 8 + Math.random() * 6;
            card.style.animationDuration = `${duration}s`;
            
            // Tamanho variável sutil
            const scale = 0.7 + Math.random() * 0.6;
            card.style.width = `${50 * scale}px`;
            card.style.height = `${75 * scale}px`;

            container.appendChild(card);

            // Remove quando a animação termina
            setTimeout(() => {
                card.remove();
            }, duration * 1000);
        };

        // Spawn inicial
        for (let i = 0; i < 5; i++) {
            setTimeout(() => spawnCard(), i * 800);
        }

        // Spawn contínuo
        this._cardRainInterval = setInterval(spawnCard, 1200);
    }

    _stopCardRain() {
        if (this._cardRainInterval) {
            clearInterval(this._cardRainInterval);
            this._cardRainInterval = null;
        }
        const container = document.getElementById('card-rain-container');
        if (container) container.innerHTML = '';
    }
}
