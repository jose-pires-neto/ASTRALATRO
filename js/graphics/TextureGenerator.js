import { SUIT_COLORS, SUIT_SYMBOLS } from '../constants.js';

export function createHandTexture(isLeft) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);

    // Palma da mão macabra
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(64, 90, 25, 0, Math.PI * 2); 
    ctx.fill();

    // Dedos ossudos e tortos
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(64, 90);
        
        // Espalhando os dedos direcionalmente (inverte o ângulo se for esquerda)
        let angle = (i - 1.5) * 0.4;
        if (isLeft) angle = -angle;
        
        ctx.rotate(angle);
        
        // Dedo (Falange principal)
        ctx.fillStyle = '#050505';
        ctx.fillRect(-6, -60, 12, 60);
        
        // Detalhes cinzas (Nós dos dedos)
        ctx.fillStyle = '#222';
        ctx.fillRect(-4, -30, 8, 4);
        ctx.fillRect(-4, -10, 8, 4);
        
        // Garra suja de sangue
        ctx.fillStyle = '#880000';
        ctx.beginPath();
        ctx.moveTo(-5, -60);
        ctx.lineTo(5, -60);
        ctx.lineTo(0, -85 + Math.random() * 5); // pontuda
        ctx.fill();
        
        // Sangue escorrendo p/ as juntas da garra
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-1, -63, 2, 4);

        ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

export function createCardTexture(rank, suit) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let i = 0; i < 150; i++) {
        ctx.fillRect(Math.floor(Math.random() * canvas.width), Math.floor(Math.random() * canvas.height), 1, 1);
    }

    const color = SUIT_COLORS[suit];
    const symbol = SUIT_SYMBOLS[suit];

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 16px Courier New';
    ctx.fillText(rank, 12, 16);
    ctx.font = '14px Courier New';
    ctx.fillText(symbol, 12, 30);

    ctx.save();
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(rank, 12, 16);
    ctx.font = '14px Courier New';
    ctx.fillText(symbol, 12, 30);
    ctx.restore();

    ctx.font = '40px Courier New';
    ctx.fillText(symbol, canvas.width / 2, canvas.height / 2 + 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    return texture;
}

export function createCardBackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111115';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#330000';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.fillStyle = '#440000';
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 12; j++) {
            if ((i + j) % 2 === 0) ctx.fillRect(i * 8, j * 8, 8, 8);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

export function createDealerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 128, 128);

    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(64, 50, 30, 0, Math.PI * 2); 
    ctx.fill();
    ctx.fillRect(20, 80, 88, 50);

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(48, 40, 8, 8);
    ctx.fillRect(72, 40, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, 42, 2, 2);
    ctx.fillRect(74, 42, 2, 2);

    ctx.fillStyle = '#dddddd';
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(44 + (i * 8), 65 + (i === 0 || i === 5 ? -2 : 0), 4, 6);
    }

    ctx.fillStyle = '#880000';
    ctx.fillRect(50, 71, 2, 6);
    ctx.fillRect(70, 71, 2, 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}
