export class UIManager {
    constructor() {
        this.elements = {
            currentScore: document.getElementById('current-score'),
            targetScore: document.getElementById('target-score'),
            handsLeft: document.getElementById('hands-left'),
            discardsLeft: document.getElementById('discards-left'),
            scoreBar: document.getElementById('score-bar'),
            btnPlay: document.getElementById('btn-play'),
            btnDiscard: document.getElementById('btn-discard'),
            dealerDialogue: document.getElementById('dealer-dialogue'),
            currentHandType: document.getElementById('current-hand-type'),
            baseChips: document.getElementById('base-chips'),
            baseMult: document.getElementById('base-mult'),
            handNamePopup: document.getElementById('hand-name'),
            scorePopup: document.getElementById('score-popup'),
            popupChips: document.getElementById('popup-chips'),
            popupMult: document.getElementById('popup-mult'),
            
            // Novos Elementos: Purgatório (Loja) e Economia
            combatHud: document.getElementById('combat-hud'),
            shopOverlay: document.getElementById('shop-overlay'),
            shopSlots: document.getElementById('shop-slots'),
            btnNextBlind: document.getElementById('btn-next-blind'),
            soulsCounter: document.getElementById('souls-counter'),
            relicsTray: document.getElementById('relics-tray'),
            
            // VFX Overlays
            impactFlash: document.getElementById('impact-flash'),
            vignetteOverlay: document.getElementById('vignette-overlay')
        };

        this._lastDisplayedScore = 0;
    }

    updateHUD(gameState) {
        // === SLOT MACHINE SCORE ===
        this._animateSlotScore(this.elements.currentScore, gameState.score);
        
        this.elements.targetScore.innerText = gameState.targetScore.toLocaleString();
        this.elements.handsLeft.innerText = gameState.handsLeft;
        this.elements.discardsLeft.innerText = gameState.discardsLeft;

        this.elements.btnPlay.disabled = gameState.selectedCards.length === 0 || gameState.state !== 'playing';
        this.elements.btnDiscard.disabled = gameState.selectedCards.length === 0 || gameState.discardsLeft === 0 || gameState.state !== 'playing';

        const progress = Math.min((gameState.score / gameState.targetScore) * 100, 100);
        this.elements.scoreBar.style.width = `${progress}%`;

        // === VINHETA DINÂMICA ===
        this.updateVignette(gameState);
    }

    _animateSlotScore(element, targetValue) {
        const targetStr = targetValue.toLocaleString();
        const currentStr = this._lastDisplayedScore.toLocaleString();
        
        // Se m é o mesmo, não faz nada
        if (targetStr === currentStr && element.querySelector('.slot-digit-wrapper')) return;
        
        this._lastDisplayedScore = targetValue;
        
        // Constrói os slots dos dígitos
        let html = '';
        for (let i = 0; i < targetStr.length; i++) {
            const char = targetStr[i];
            if (char === '.' || char === ',') {
                html += `<span>${char}</span>`;
                continue;
            }
            // Slot roller: mostra dígito atual e o próximo "rolando"
            const digit = parseInt(char);
            const prevDigit = (digit + 10 - 1) % 10;
            html += `<span class="slot-digit-wrapper">`;
            html += `<span class="slot-digit-inner" style="transform: translateY(-1.2em)">`;
            html += `<span>${prevDigit}</span><span>${digit}</span>`;
            html += `</span></span>`;
        }
        element.innerHTML = html;
    }

    updateHandEvaluation(evalResult, selectedCards) {
        let totalCardChips = selectedCards.reduce((sum, card) => sum + card.chips, 0);
        let totalCardMult = selectedCards.reduce((sum, card) => sum + card.mult, 0);

        this.elements.currentHandType.innerText = evalResult.name;
        this.elements.baseChips.innerText = evalResult.chips + totalCardChips;
        this.elements.baseMult.innerText = evalResult.mult + totalCardMult;
    }

    showDealerDialogue(text, duration = 3000, isGlitch = false) {
        const box = this.elements.dealerDialogue;
        box.innerText = `"${text}"`;
        box.style.opacity = '1';

        if (isGlitch) box.classList.add('glitch-text');
        else box.classList.remove('glitch-text');

        setTimeout(() => {
            box.style.opacity = '0';
        }, duration);
    }

    showScorePopup(handEvalResult) {
        const typeEl = this.elements.handNamePopup;
        const scoreEl = this.elements.scorePopup;

        this.elements.popupChips.innerText = handEvalResult.chips;
        this.elements.popupMult.innerText = handEvalResult.mult;
        typeEl.innerText = handEvalResult.name;

        typeEl.classList.remove('score-anim');
        scoreEl.classList.remove('score-anim');
        
        // Reflow hack para reiniciar animação CSS
        void typeEl.offsetWidth;

        typeEl.classList.add('score-anim');
        scoreEl.classList.add('score-anim');
    }

    /* SISTEMA DE TRANSIÇÃO E ECONOMIA */
    toggleCombatHud(isVisible) {
        if (isVisible) {
            this.elements.combatHud.classList.remove('opacity-0');
            this.elements.combatHud.classList.remove('pointer-events-none');
        } else {
            this.elements.combatHud.classList.add('opacity-0');
            this.elements.combatHud.classList.add('pointer-events-none');
        }
    }

    toggleShop(isVisible) {
        if (isVisible) {
            this.elements.shopOverlay.classList.remove('hidden');
            // Pequeno delay pra ativar a opacidade pro CSS animation pegar a transition
            setTimeout(() => this.elements.shopOverlay.classList.remove('opacity-0'), 50);
        } else {
            this.elements.shopOverlay.classList.add('opacity-0');
            setTimeout(() => this.elements.shopOverlay.classList.add('hidden'), 1000);
        }
    }

    updateEconomyHUD(gameState) {
        this.elements.soulsCounter.innerText = gameState.souls;
        
        // Render Tray Icons
        import('../core/RelicSystem.js').then(module => {
            const catalog = module.AVAILABLE_RELICS;
            this.elements.relicsTray.innerHTML = '';
            
            gameState.relics.forEach(relicId => {
                const found = catalog.find(r => r.id === relicId);
                if (found) {
                    const iconEl = document.createElement('div');
                    iconEl.className = 'w-10 h-12 bg-gray-900 border border-gray-600 flex items-center justify-center text-xl rounded shadow-[0_0_8px_rgba(255,255,255,0.1)] relative group cursor-help';
                    iconEl.innerText = found.icon;
                    
                    iconEl.title = `${found.name}\n${found.description}`;
                    this.elements.relicsTray.appendChild(iconEl);
                }
            });
        });
    }

    /* === VFX: Flash de Impacto === */
    triggerImpactFlash() {
        const flash = this.elements.impactFlash;
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 80);
    }

    /* === VFX: Vinheta Dinâmica === */
    updateVignette(gameState) {
        const vig = this.elements.vignetteOverlay;
        if (!vig) return;
        
        const progress = gameState.score / gameState.targetScore;
        const handsRatio = gameState.handsLeft / 4;
        
        // Tense: últimas mãos E score baixo
        if (handsRatio <= 0.5 && progress < 0.7) {
            vig.classList.add('tense');
        } else {
            vig.classList.remove('tense');
        }
    }
}
