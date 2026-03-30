import { GameState } from './core/GameState.js';
import { evaluateHand } from './core/PokerEvaluator.js';
import { RelicSystem } from './core/RelicSystem.js';
import { Engine3D } from './graphics/Engine3D.js';
import { InputController } from './input/InputController.js';
import { UIManager } from './ui/UIManager.js';
import { ShopManager } from './ui/ShopManager.js';

let gameState;
let engine;
let inputController;
let ui;
let shopManager;

const dealerPhrasesPlay = [
    "Vamos ver o que você tem.",
    "Desespero?",
    "Interessante...",
    "Não será suficiente."
];

function init() {
    gameState = new GameState();
    ui = new UIManager();
    shopManager = new ShopManager(ui, gameState);

    // Conecta o evento de botão da loja
    shopManager.onNextBlind = () => {
        shopManager.closeShop();
        engine.setShopMode(false);
        nextBlind(); 
    };
    
    // Configuração do Three.js
    engine = new Engine3D('game-canvas');
    engine.animate();

    // Configuração do Input (recebe injeção de dependência para evitar circularidade)
    inputController = new InputController(engine, onCardClick, () => gameState.state);

    // Bind Botões UI
    document.getElementById('btn-play').addEventListener('click', playHand);
    document.getElementById('btn-discard').addEventListener('click', discardHand);

    // Primeiro Setup
    gameState.createDeck();
    dealHand(8);
    ui.showDealerDialogue("Bem-vindo à mesa... Tente sobreviver.", 4000);
}

function dealHand(count) {
    if (count <= 0) {
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
        if (dealtCount >= count) {
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
        setTimeout(dealNextCard, 80);
    };

    setTimeout(dealNextCard, 300);
}

function onCardClick(cardUserData) {
    if (cardUserData.isSelected) {
        cardUserData.isSelected = false;
        gameState.selectedCards = gameState.selectedCards.filter(c => c.id !== cardUserData.cardData.id);
    } else {
        if (gameState.selectedCards.length < 5) {
            cardUserData.isSelected = true;
            gameState.selectedCards.push(cardUserData.cardData);
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
    
    gameState.state = 'scoring';
    gameState.handsLeft--;
    ui.updateHUD(gameState);

    ui.showDealerDialogue(dealerPhrasesPlay[Math.floor(Math.random() * dealerPhrasesPlay.length)], 2000);

    const evalResult = evaluateHand(gameState.selectedCards);
    const modResult = RelicSystem.applyPlayModifiers(evalResult, gameState.selectedCards, gameState.relics);
    
    // Total Real Ganho
    const pointsGained = modResult.finalChips * modResult.finalMult;

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
        
        // Começa a queimar as cartas progressivamente
        engine.burnCards(sortedMeshes, () => {
            // Quando terminar de queimar, segunda rajada de fogo
            engine.triggerFireExplosion(fireCenter, 20);
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
        }, 50);

        setTimeout(() => {
            // Esmagamento consumado e score finalizado!
            removePlayedCards();
            engine.dealerState = 'idle';
            if (gameState.score >= gameState.targetScore) {
                // Venceu a rodada! 
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
                
                // Mãos tentam abraçar sua tela em gameover!
                engine.dealerState = 'absorbing';
                engine.handAnimSpeed = 0.05;
                engine.dealerTargetHandL.set(-8, 8, 8);
                engine.dealerTargetHandR.set(8, 8, 8);
                
                setTimeout(() => {
                    engine.dealerState = 'idle';
                    resetGame();
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
