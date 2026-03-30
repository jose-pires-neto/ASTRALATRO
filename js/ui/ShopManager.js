import { AVAILABLE_RELICS } from '../core/RelicSystem.js';

export class ShopManager {
    constructor(uiManager, gameState) {
        this.ui = uiManager;
        this.gameState = gameState;
        this.currentStock = [];
        this.onNextBlind = null;

        this.ui.elements.btnNextBlind.addEventListener('click', () => {
            if (this.onNextBlind) this.onNextBlind();
        });
    }

    openShop() {
        this.gameState.state = 'shop';
        this.currentStock = this.generateStock();
        this.renderStore();
        
        this.ui.toggleCombatHud(false);
        setTimeout(() => this.ui.toggleShop(true), 500); // Aguarda fade do combate
    }

    closeShop() {
        this.ui.toggleShop(false);
        setTimeout(() => this.ui.toggleCombatHud(true), 1000);
    }

    generateStock() {
        // Pega 2 relics arbitrárias diferentes pro shop
        let shuffled = [...AVAILABLE_RELICS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 2);
    }

    renderStore() {
        const slotsContainer = this.ui.elements.shopSlots;
        slotsContainer.innerHTML = ''; // Limpa

        this.currentStock.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-gray-900 border-2 border-red-900 p-4 md:p-6 rounded-lg shadow-[0_0_15px_rgba(255,0,0,0.3)] w-full max-w-[280px] md:w-64 flex flex-col items-center cursor-pointer transition-transform hover:scale-105 hover:border-red-500 duration-200 shrink-0";
            
            const isOwned = this.gameState.relics.includes(item.id);
            const canAfford = this.gameState.souls >= item.price;
            
            let btnClass = "mt-4 w-full py-2 font-bold rounded uppercase ";
            let btnText = `Comprar (${item.price} Almas)`;

            if (isOwned) {
                btnClass += "bg-gray-600 text-gray-400 cursor-not-allowed";
                btnText = "Possuído";
            } else if (!canAfford) {
                btnClass += "bg-red-900 text-red-300 opacity-50 cursor-not-allowed";
            } else {
                btnClass += "bg-green-700 hover:bg-green-600 text-white";
                card.onclick = () => this.buyRelic(item);
            }

            card.innerHTML = `
                <div class="text-6xl mb-4">${item.icon}</div>
                <h3 class="text-xl text-red-500 font-bold mb-2 text-center h-14 flex items-center">${item.name}</h3>
                <p class="text-gray-400 text-sm text-center flex-grow mb-4">${item.description}</p>
                <button class="${btnClass}" ${isOwned || !canAfford ? 'disabled' : ''}>${btnText}</button>
            `;
            
            slotsContainer.appendChild(card);
        });

        this.ui.elements.btnNextBlind.innerText = `PROSSEGUIR (BLIND ${this.gameState.currentBlind + 1})`;
    }

    buyRelic(relic) {
        if (this.gameState.souls >= relic.price && this.gameState.relics.length < 5) {
            this.gameState.souls -= relic.price;
            this.gameState.relics.push(relic.id);
            
            this.ui.updateEconomyHUD(this.gameState);
            this.renderStore(); // Re-render to disable button

            console.log(`[SHOP] Comprado: ${relic.name}`);
        } else if (this.gameState.relics.length >= 5) {
            alert("Sua alma só suporta 5 Pactos.");
        }
    }
}
