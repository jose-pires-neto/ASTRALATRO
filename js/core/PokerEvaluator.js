import { HAND_LEVELS } from '../constants.js';

export function evaluateHand(cards) {
    if (cards.length === 0) return HAND_LEVELS['None'];

    const values = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);

    const valueCounts = {};
    values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);
    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    const isFlush = suits.length > 0 && suits.every(s => s === suits[0]) && cards.length === 5;

    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let sortedIndices = values.map(v => rankOrder.indexOf(v)).sort((a, b) => a - b);
    
    // Tratativa para A,2,3,4,5
    if (sortedIndices.join(',') === '0,1,2,3,12') sortedIndices = [-1, 0, 1, 2, 3];

    let isStraight = cards.length === 5 && sortedIndices.every((val, i, arr) => !i || val === arr[i - 1] + 1);

    let handType = 'High Card';
    if (isStraight && isFlush && values.includes('A') && values.includes('K')) handType = 'Royal Flush';
    else if (isStraight && isFlush) handType = 'Straight Flush';
    else if (counts[0] === 4) handType = 'Four of a Kind';
    else if (counts[0] === 3 && counts[1] === 2) handType = 'Full House';
    else if (isFlush) handType = 'Flush';
    else if (isStraight) handType = 'Straight';
    else if (counts[0] === 3) handType = 'Three of a Kind';
    else if (counts[0] === 2 && counts[1] === 2) handType = 'Two Pair';
    else if (counts[0] === 2) handType = 'Pair';

    return {
        type: handType,
        chips: HAND_LEVELS[handType].chips,
        mult: HAND_LEVELS[handType].mult,
        name: HAND_LEVELS[handType].name
    };
}
