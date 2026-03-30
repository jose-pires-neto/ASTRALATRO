// Biblioteca de Relíquias (Jokers)

export const AVAILABLE_RELICS = [
    {
        id: 'chalice',
        name: 'Cálice de Sangue',
        description: '+15 Multiplicador para cada carta de Copas na mão jogada.',
        price: 4,
        icon: '🍷'
    },
    {
        id: 'coin',
        name: 'Moeda de Caronte',
        description: 'Receba +1 Alma bônus para cada Descarte poupado no fim da rodada.',
        price: 3,
        icon: '🪙'
    },
    {
        id: 'eye',
        name: 'Olho da Entidade',
        description: 'Garante x2 Multiplicador Final nesta jogada se conter uma carta PAR (2,4,6,8,10).',
        price: 6,
        icon: '👁️'
    }
];

// O Motor que intercepta a matemática
export class RelicSystem {
    // Aplica bônus matemáticos antes do resultado da Jogada
    static applyPlayModifiers(evalResult, selectedCards, activeRelics) {
        let finalChips = evalResult.chips + selectedCards.reduce((s, c) => s + c.chips, 0);
        let finalMult = evalResult.mult + selectedCards.reduce((s, c) => s + c.mult, 0);

        // Verifica cada relíquia equipada
        activeRelics.forEach(relicId => {
            if (relicId === 'chalice') {
                const copasCount = selectedCards.filter(c => c.suit === 'hearts').length;
                if (copasCount > 0) {
                    finalMult += (15 * copasCount);
                    console.log(`[RELIC] Cálice de Sangue ativado: +${15 * copasCount} Mult!`);
                }
            }
            if (relicId === 'eye') {
                const evens = ['2', '4', '6', '8', '10'];
                const hasEven = selectedCards.some(c => evens.includes(c.rank));
                if (hasEven) {
                    finalMult *= 2; 
                    console.log(`[RELIC] Olho da Entidade ativado: X2 Mult!`);
                }
            }
        });

        return { finalChips, finalMult };
    }

    // Aplica bônus de economia após a vitória de um Blind
    static applyEconomyModifiers(baseTotal, gameState) {
        let souls = baseTotal.totalEarned;
        let bônusReliquia = 0;

        gameState.relics.forEach(relicId => {
            if (relicId === 'coin') {
                // Moeda de caronte dobra a recompensa por descartes intocados (pois na base já ganhava 1)
                bônusReliquia += gameState.discardsLeft; 
            }
        });

        if (bônusReliquia > 0) {
            console.log(`[RELIC] Moeda de Caronte ativada: +${bônusReliquia} Almas Extras!`);
        }

        return souls + bônusReliquia;
    }
}
