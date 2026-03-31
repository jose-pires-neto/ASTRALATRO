import { GameState } from './core/GameState.js';
import { evaluateHand } from './core/PokerEvaluator.js';
import { RelicSystem } from './core/RelicSystem.js';
import { Engine3D } from './graphics/Engine3D.js';
import { InputController } from './input/InputController.js';
import { UIManager } from './ui/UIManager.js';
import { ShopManager } from './ui/ShopManager.js';
import { ScreenManager } from './ui/ScreenManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { SFXManager } from './audio/SFXManager.js';

let gameState;
let engine;
let inputController;
let ui;
let shopManager;
let screenManager;
let audio;
let sfx;

const dealerPhrasesPlay = [
    "Vamos ver o que você tem.",
    "Desespero?",
    "Interessante...",
    "Não será suficiente."
];

function init() {
    // Inicializa a engine 3D SEMPRE (roda no fundo do menu)
    engine = new Engine3D('game-canvas');
    engine.animate();
    
    ui = new UIManager();
    screenManager = new ScreenManager();
    audio = new AudioManager();
    sfx = new SFXManager();

    // === Callbacks do ScreenManager ===
    screenManager.onStartGame = () => startNewGame();
    screenManager.onRestartGame = () => {
        screenManager.transitionTo('game');
        startNewGame();
    };
    screenManager.onBackToMenu = () => {
        engine.clearCards();
        engine.setShopMode(false);
        engine.setTitleMode(true);
        audio.playMenuMusic();
        document.getElementById('game-controls')?.classList.add('hidden');
        screenManager.transitionTo('title');
    };
    screenManager.onResumeGame = () => resumeGame();

    // onPauseToggle removido — pausa agora é controlada diretamente via triggerPause()

    // Mostra tela de título (jogo NÃO começa automático)
    engine.setTitleMode(true);
    screenManager.transitionTo('title');

    // Música do menu (precisa de interação do usuário pra autoplay)
    // Tenta tocar imediatamente, se bloqueado, toca no primeiro clique
    audio.playMenuMusic();
    document.addEventListener('click', function _firstClick() {
        audio.playMenuMusic();
        document.removeEventListener('click', _firstClick);
    }, { once: true });

    // Botão ÁUDIO no menu
    const menuMuteBtn = document.getElementById('btn-menu-mute');
    if (menuMuteBtn) {
        menuMuteBtn.addEventListener('click', () => {
            const muted = audio.toggleMute();
            sfx.setMuted(muted);
            menuMuteBtn.textContent = muted ? '🔇 MUDO' : '🎧 ÁUDIO';
            const hudMute = document.getElementById('btn-mute');
            if (hudMute) hudMute.textContent = muted ? '🔇' : '🔊';
        });
    }

    // === PAUSA: Binding direto ===
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
        pauseBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            triggerPause();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (screenManager.currentScreen === 'game') {
                triggerPause();
            } else if (screenManager.currentScreen === 'pause') {
                resumeGame();
            }
        }
    });
}

function triggerPause() {
    if (!gameState || gameState.state === 'paused') return;
    sfx.play('pause');
    gameState._pausedState = gameState.state;
    gameState.state = 'paused';
    screenManager.transitionTo('pause');
}

function resumeGame() {
    if (!gameState) return;
    gameState.state = gameState._pausedState || 'playing';
    screenManager.transitionTo('game');
}

function startNewGame() {
    engine.setTitleMode(false);
    gameState = new GameState();
    shopManager = new ShopManager(ui, gameState);

    shopManager.onNextBlind = () => {
        shopManager.closeShop();
        engine.setShopMode(false);
        nextBlind(); 
    };

    if (inputController) inputController.destroy();
    inputController = new InputController(engine, onCardClick, () => gameState.state);

    document.getElementById('btn-play').onclick = playHand;
    document.getElementById('btn-discard').onclick = discardHand;
    
    // Mute toggle
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
        muteBtn.onclick = () => {
            const muted = audio.toggleMute();
            sfx.setMuted(muted);
            muteBtn.textContent = muted ? '🔇' : '🔊';
        };
    }

    engine.clearCards();
    engine.setShopMode(false);
    gameState.createDeck();
    
    screenManager.transitionTo('game');
    document.getElementById('game-controls')?.classList.remove('hidden');
    
    // Música de run!
    audio.playRunMusic();
    
    // Delay para a tela transicionar antes de dar as cartas
    setTimeout(() => {
        dealHand(8);
        ui.showDealerDialogue("Bem-vindo à mesa... Tente sobreviver.", 4000);
        ui.updateEconomyHUD(gameState);
    }, 600);
}

function dealHand(count) {
    // Garante que a mão nunca ultrapasse 8 cartas
    const maxHandSize = 8;
    const actualCount = Math.min(count, maxHandSize - gameState.hand.length);
    
    if (actualCount <= 0) {
        ui.updateHUD(gameState);
        return;
    }

    // Prepara o monstro para "sacar" cartas DO MONTANTE
    engine.dealerState = 'dealing';
    engine.handAnimSpeed = 0.2;
    
    // A mão esquerda estica pro Deck Pile físico!
    const pilePos = engine.deckPileMesh.position.clone();
    pilePos.y += 1.5;
    engine.dealerTargetHandL.copy(pilePos);
    engine.dealerLeftHand.rotation.z = -Math.PI / 3;

    let dealtCount = 0;

    const dealNextCard = () => {
        if (dealtCount >= actualCount) {
            engine.dealerState = 'idle';
            ui.updateHUD(gameState);
            return;
        }

        if (gameState.deck.length === 0) gameState.createDeck();
        const cardData = gameState.deck.pop();
        gameState.hand.push(cardData);
        
        const mesh = engine.spawnCardMesh(cardData);
        // Carta nasce no topo do montante visual!
        mesh.position.copy(engine.deckPileMesh.position);
        mesh.position.y += 0.8;
        mesh.rotation.y = Math.PI; // vem virada (costas)
        mesh.scale.set(0.4, 0.4, 0.4); // começa menor e cresce
        
        // Flick visual do braço "puxando" carta
        engine.dealerTargetHandL.y += 1.2;
        setTimeout(() => { engine.dealerTargetHandL.y -= 1.2; }, 60);

        engine.updateCardPositions(12, gameState.state);

        dealtCount++;
        sfx.play('card_deal');
        setTimeout(dealNextCard, 80);
    };

    setTimeout(dealNextCard, 300);
}

function onCardClick(cardUserData) {
    if (cardUserData.isSelected) {
        cardUserData.isSelected = false;
        gameState.selectedCards = gameState.selectedCards.filter(c => c.id !== cardUserData.cardData.id);
        sfx.play('card_deselect');
    } else {
        if (gameState.selectedCards.length < 5) {
            cardUserData.isSelected = true;
            gameState.selectedCards.push(cardUserData.cardData);
            sfx.play('card_select');
        }
    }
    
    engine.updateCardPositions(12, gameState.state);
    
    // Atualiza base visual e aplica Sombrios para Preview!
    const evalResult = evaluateHand(gameState.selectedCards);
    const modResult = RelicSystem.applyPlayModifiers(evalResult, gameState.selectedCards, gameState.relics);
    
    const previewResult = {
        chips: modResult.finalChips,
        mult: modResult.finalMult,
        name: evalResult.name
    };
    
    // Usa a mesma assinatura pq chips/mult já vieram modificados e embutidos
    ui.updateHandEvaluation(previewResult, []); 
    ui.updateHUD(gameState);
}

function playHand() {
    if (gameState.selectedCards.length === 0 || gameState.handsLeft <= 0 || gameState.state !== 'playing') return;
    
    sfx.play('card_play');
    gameState.state = 'scoring';
    gameState.handsLeft--;
    ui.updateHUD(gameState);

    ui.showDealerDialogue(dealerPhrasesPlay[Math.floor(Math.random() * dealerPhrasesPlay.length)], 2000);

    const evalResult = evaluateHand(gameState.selectedCards);
    const modResult = RelicSystem.applyPlayModifiers(evalResult, gameState.selectedCards, gameState.relics);
    
    // Total Real Ganho
    const pointsGained = modResult.finalChips * modResult.finalMult;

    // Registra stats da run
    gameState.trackHandPlayed(evalResult.name, pointsGained);

    // Animação Macabra: As Mãos esticam para absorver
    engine.dealerState = 'absorbing';
    engine.handAnimSpeed = 0.15;
    engine.dealerTargetHandL.set(-1.5, 3.5, -6);
    engine.dealerRightHand.rotation.z = Math.PI / 2;
    engine.dealerLeftHand.rotation.z = -Math.PI / 2;
    engine.dealerTargetHandR.set(1.5, 3.5, -6);

    let delay = 0;
    const sortedMeshes = engine.cardMeshes.filter(m => m.userData.isSelected);

    sortedMeshes.forEach((mesh, index) => {
        mesh.userData.state = 'playing';
        mesh.userData.isSelected = false;

        setTimeout(() => {
            // Voo Rápido pro rosto/mãos da Entidade
            mesh.userData.targetPos.set((index - sortedMeshes.length / 2) * 1.2 + 0.6, 3.5, -5 + (index * 0.01));
            mesh.userData.targetRot.set(-Math.PI / 5, 0, 0);
            mesh.userData.targetScale.set(1.2, 1.2, 1.2);
        }, delay * 100);
        delay++;
    });

    setTimeout(() => {
        // Impacto Esmagamento: As Mãos batem e juntam as cartas no ar
        engine.handAnimSpeed = 0.5;
        engine.dealerTargetHandL.set(0.5, 3.5, -5.5);
        engine.dealerTargetHandR.set(-0.5, 3.5, -5.5);

        // === VFX: Fogo e Combustão ===
        const fireCenter = new THREE.Vector3(0, 3.5, -5.5);
        engine.triggerFireExplosion(fireCenter, 40);
        
        // === VFX: Screen Shake (proporcional ao multiplicador!) ===
        const shakeForce = Math.min(0.2 + (modResult.finalMult * 0.05), 1.5);
        engine.triggerScreenShake(shakeForce);
        
        // === VFX: Flash de Impacto ===
        ui.triggerImpactFlash();
        sfx.play('impact');
        
        // Começa a queimar as cartas progressivamente
        engine.burnCards(sortedMeshes, () => {
            // Quando terminar de queimar, segunda rajada de fogo
            engine.triggerFireExplosion(fireCenter, 20);
            sfx.play('card_burn');
        });
        
        // Envia feedback pra UI refletindo os multiplicadores Sombrios
        const fullEval = {
            chips: modResult.finalChips,
            mult: modResult.finalMult,
            name: evalResult.name
        };
        ui.showScorePopup(fullEval);

        let currentTotal = gameState.score;
        const targetTotal = gameState.score + pointsGained;
        const interval = setInterval(() => {
            currentTotal += Math.ceil(pointsGained / 20);
            if (currentTotal >= targetTotal) {
                currentTotal = targetTotal;
                clearInterval(interval);
            }
            gameState.score = currentTotal;
            ui.updateHUD(gameState);
            sfx.play('score_tick');
        }, 50);

        setTimeout(() => {
            // Esmagamento consumado e score finalizado!
            removePlayedCards();
            engine.dealerState = 'idle';
            if (gameState.score >= gameState.targetScore) {
                // Venceu a rodada! 
                sfx.play('blind_win');
                const earnResult = gameState.calculateBlindReward();
                gameState.souls = RelicSystem.applyEconomyModifiers(earnResult, gameState);
                
                ui.showDealerDialogue("Sobreviveu... Visite a loja e reze.", 3000);
                ui.updateEconomyHUD(gameState);

                setTimeout(() => {
                    engine.setShopMode(true);
                    shopManager.openShop();
                }, 3000);

            } else if (gameState.handsLeft === 0) {
                ui.showDealerDialogue("SUA ALMA É MINHA.", 5000, true);
                
                // VFX: Screen Shake e Flash na Derrota!
                sfx.play('blind_fail');
                engine.triggerScreenShake(1.5);
                ui.triggerImpactFlash();
                
                // Mãos tentam abraçar sua tela em gameover!
                engine.dealerState = 'absorbing';
                engine.handAnimSpeed = 0.05;
                engine.dealerTargetHandL.set(-8, 8, 8);
                engine.dealerTargetHandR.set(8, 8, 8);
                
                // Atualiza stats finais
                gameState.runStats.blindsReached = gameState.currentBlind;
                gameState.runStats.totalSouls = gameState.souls;
                
                setTimeout(() => {
                    engine.dealerState = 'idle';
                    screenManager.transitionTo('gameover', { stats: gameState.runStats });
                }, 4000);
            } else {
                dealHand(gameState.selectedCards.length);
                gameState.selectedCards = [];
                gameState.state = 'playing';
                
                const nextEval = evaluateHand(gameState.selectedCards);
                ui.updateHandEvaluation(nextEval, gameState.selectedCards);
                ui.updateHUD(gameState);
            }
        }, 1800);

    }, delay * 100 + 300); // Trigger do smasher
}

function discardHand() {
    if (gameState.selectedCards.length === 0 || gameState.discardsLeft <= 0 || gameState.state !== 'playing') return;
    
    sfx.play('discard');
    gameState.state = 'discarding';
    gameState.discardsLeft--;
    ui.updateHUD(gameState);

    ui.showDealerDialogue("Lixo.", 1000);

    engine.cardMeshes.forEach((mesh) => {
        if (mesh.userData.isSelected) {
            mesh.userData.state = 'discarding';
            mesh.userData.isSelected = false;
            // Varre pra fora estilo Buckshot
            mesh.userData.targetPos.set(-20, -10, -5 + Math.random() * 5);
            mesh.userData.targetRot.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        }
    });

    // Mão direita do Boss varre lixo
    engine.dealerState = 'dealing';
    engine.handAnimSpeed = 0.3;
    engine.dealerTargetHandR.set(0, 0, -2);
    setTimeout(() => { engine.dealerTargetHandR.set(-10, -5, -5); }, 200);

    setTimeout(() => {
        engine.dealerState = 'idle';
        removePlayedCards();
        dealHand(gameState.selectedCards.length);
        gameState.selectedCards = [];
        gameState.state = 'playing';
        
        const nextEval = evaluateHand(gameState.selectedCards);
        ui.updateHandEvaluation(nextEval, gameState.selectedCards);
        ui.updateHUD(gameState);
    }, 600);
}

function removePlayedCards() {
    gameState.hand = gameState.hand.filter(c => !gameState.selectedCards.find(sc => sc.id === c.id));
    const meshesToRemove = engine.cardMeshes.filter(m => m.userData.state !== 'hand');
    engine.removeMeshes(meshesToRemove);
    engine.updateCardPositions(12, gameState.state);
}

function nextBlind() {
    gameState.nextBlind();
    engine.clearCards();
    dealHand(8);
    
    // Transição de música a cada novo blind
    audio.nextRunTrack();
    
    // Pequeno tweak pro evaluator das relics atualizar na interface ao inicio
    ui.updateEconomyHUD(gameState);
    
    // Atualiza base visual
    const evalR = evaluateHand(gameState.selectedCards);
    const modR = RelicSystem.applyPlayModifiers(evalR, gameState.selectedCards, gameState.relics);
    ui.updateHandEvaluation({
        chips: modR.finalChips,
        mult: modR.finalMult,
        name: evalR.name
    }, []);
    ui.updateHUD(gameState);

    ui.showDealerDialogue(`O Purgatório fecha. Mínimo de ${gameState.targetScore} almas exigido...`, 4000);
}

function resetGame() {
    gameState.reset();
    engine.clearCards();
    dealHand(8);
    
    ui.updateEconomyHUD(gameState);

    const evalR = evaluateHand(gameState.selectedCards);
    const modR = RelicSystem.applyPlayModifiers(evalR, gameState.selectedCards, gameState.relics);
    ui.updateHandEvaluation({
        chips: modR.finalChips,
        mult: modR.finalMult,
        name: evalR.name
    }, []);
    ui.updateHUD(gameState);
}

window.onload = init;
