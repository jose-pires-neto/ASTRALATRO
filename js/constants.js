export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_COLORS = { 'hearts': '#ff2244', 'diamonds': '#ff2244', 'clubs': '#44aaff', 'spades': '#44aaff' };
export const SUIT_SYMBOLS = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };

export const HAND_LEVELS = {
    'None': { chips: 0, mult: 0, name: 'Nenhuma' },
    'High Card': { chips: 5, mult: 1, name: 'Carta Alta' },
    'Pair': { chips: 10, mult: 2, name: 'Par' },
    'Two Pair': { chips: 20, mult: 2, name: 'Dois Pares' },
    'Three of a Kind': { chips: 30, mult: 3, name: 'Trinca' },
    'Straight': { chips: 30, mult: 4, name: 'Sequência' },
    'Flush': { chips: 35, mult: 4, name: 'Flush' },
    'Full House': { chips: 40, mult: 4, name: 'Full House' },
    'Four of a Kind': { chips: 60, mult: 7, name: 'Quadra' },
    'Straight Flush': { chips: 100, mult: 8, name: 'Straight Flush' },
    'Royal Flush': { chips: 150, mult: 10, name: 'Royal Flush' }
};
