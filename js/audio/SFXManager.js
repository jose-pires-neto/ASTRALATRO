/**
 * SFXManager — Efeitos Sonoros Procedurais do AstraLatro
 * 
 * Usa Web Audio API para gerar SFX em tempo real.
 * Para substituir por arquivos .ogg, basta:
 *   1. Colocar o .ogg em assets/sfx/
 *   2. Adicionar no objeto FILE_OVERRIDES abaixo
 *   3. O sistema automaticamente usa o arquivo ao invés do procedural
 * 
 * Exemplo:
 *   FILE_OVERRIDES = {
 *       'card_select': 'assets/sfx/card_select.ogg',
 *       'card_play':   'assets/sfx/card_play.ogg',
 *   };
 */

// ==============================
// SUBSTITUIÇÕES POR ARQUIVO
// Adicione aqui quando tiver os .ogg!
// ==============================
const FILE_OVERRIDES = {
    // 'card_select':  'assets/sfx/card_select.ogg',
    // 'card_deselect':'assets/sfx/card_deselect.ogg',
    // 'card_deal':    'assets/sfx/card_deal.ogg',
    // 'card_play':    'assets/sfx/card_play.ogg',
    // 'card_burn':    'assets/sfx/card_burn.ogg',
    // 'score_tick':   'assets/sfx/score_tick.ogg',
    // 'impact':       'assets/sfx/impact.ogg',
    // 'blind_win':    'assets/sfx/blind_win.ogg',
    // 'blind_fail':   'assets/sfx/blind_fail.ogg',
    // 'shop_buy':     'assets/sfx/shop_buy.ogg',
    // 'btn_click':    'assets/sfx/btn_click.ogg',
    // 'btn_hover':    'assets/sfx/btn_hover.ogg',
    // 'pause':        'assets/sfx/pause.ogg',
    // 'deal_whoosh':  'assets/sfx/deal_whoosh.ogg',
};

const SFX_VOLUME = 0.4;

export class SFXManager {
    constructor() {
        this.ctx = null; // AudioContext criado no primeiro uso (autoplay policy)
        this.masterGain = null;
        this.isMuted = false;
        this._fileCache = {};
    }

    /** Inicializa o AudioContext (chamado na primeira interação) */
    _ensureContext() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = SFX_VOLUME;
        this.masterGain.connect(this.ctx.destination);
    }

    /** Toggle mute dos SFX */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : SFX_VOLUME;
        }
        return this.isMuted;
    }

    setMuted(val) {
        this.isMuted = val;
        if (this.masterGain) {
            this.masterGain.gain.value = val ? 0 : SFX_VOLUME;
        }
    }

    // ==============================
    // TOCA SFX (verifica override primeiro)
    // ==============================
    play(name) {
        this._ensureContext();
        if (this.isMuted) return;

        // Se tiver arquivo override, toca ele
        if (FILE_OVERRIDES[name]) {
            this._playFile(FILE_OVERRIDES[name]);
            return;
        }

        // Senão, gera proceduralmente
        const generator = this._generators[name];
        if (generator) {
            generator.call(this);
        }
    }

    async _playFile(path) {
        try {
            if (!this._fileCache[path]) {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                this._fileCache[path] = await this.ctx.decodeAudioData(arrayBuffer);
            }
            const source = this.ctx.createBufferSource();
            source.buffer = this._fileCache[path];
            source.connect(this.masterGain);
            source.start();
        } catch (e) {
            console.warn(`SFX: Falha ao carregar ${path}`, e);
        }
    }

    // ==============================
    // HELPERS DE ÁUDIO PROCEDURAL
    // ==============================
    _osc(type, freq, duration, volume = 0.3) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    _noise(duration, volume = 0.15, filterFreq = 3000) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start();
        source.stop(this.ctx.currentTime + duration);
    }

    _sweep(startFreq, endFreq, duration, type = 'sine', volume = 0.2) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // ==============================
    // GERADORES PROCEDURAIS
    // ==============================
    get _generators() {
        return {
            // --- CARTAS ---
            'card_select': () => {
                // Click suave agudo
                this._osc('sine', 800, 0.08, 0.25);
                this._osc('triangle', 1200, 0.06, 0.1);
            },

            'card_deselect': () => {
                // Click reverso, mais grave
                this._osc('sine', 500, 0.08, 0.2);
                this._osc('triangle', 350, 0.06, 0.1);
            },

            'card_deal': () => {
                // Whoosh curto + tap
                this._noise(0.06, 0.15, 4000);
                setTimeout(() => {
                    this._osc('triangle', 300 + Math.random() * 200, 0.04, 0.15);
                }, 30);
            },

            'card_play': () => {
                // Swoosh dramático
                this._sweep(200, 800, 0.15, 'sawtooth', 0.15);
                this._noise(0.12, 0.1, 5000);
                this._osc('sine', 600, 0.1, 0.2);
            },

            'card_burn': () => {
                // Fogo crepitando
                this._noise(0.4, 0.2, 2000);
                this._sweep(400, 100, 0.3, 'sawtooth', 0.1);
                setTimeout(() => this._noise(0.2, 0.1, 1500), 100);
                setTimeout(() => this._noise(0.15, 0.08, 1000), 200);
            },

            // --- SCORE / FEEDBACK ---
            'score_tick': () => {
                // Tick rápido de slot machine
                this._osc('square', 1400 + Math.random() * 200, 0.03, 0.12);
            },

            'impact': () => {
                // Impacto pesado
                this._osc('sine', 80, 0.3, 0.5);
                this._osc('square', 60, 0.15, 0.3);
                this._noise(0.15, 0.25, 800);
            },

            'blind_win': () => {
                // Vitória: arpejo ascendente
                const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
                notes.forEach((freq, i) => {
                    setTimeout(() => {
                        this._osc('triangle', freq, 0.25, 0.2);
                        this._osc('sine', freq * 2, 0.15, 0.08);
                    }, i * 100);
                });
            },

            'blind_fail': () => {
                // Derrota: descida sombria
                this._sweep(400, 60, 0.8, 'sawtooth', 0.2);
                this._osc('sine', 80, 0.6, 0.3);
                this._noise(0.5, 0.15, 600);
            },

            // --- LOJA ---
            'shop_buy': () => {
                // Ka-ching satisfatório
                this._osc('triangle', 1200, 0.08, 0.25);
                setTimeout(() => {
                    this._osc('triangle', 1600, 0.12, 0.2);
                    this._osc('sine', 2400, 0.1, 0.1);
                }, 80);
            },

            // --- UI ---
            'btn_click': () => {
                this._osc('sine', 600, 0.05, 0.15);
                this._osc('triangle', 900, 0.03, 0.08);
            },

            'btn_hover': () => {
                this._osc('sine', 1000, 0.025, 0.06);
            },

            'pause': () => {
                // Efeito de "congelar"
                this._sweep(800, 200, 0.3, 'sine', 0.2);
                this._osc('triangle', 150, 0.2, 0.15);
            },

            'deal_whoosh': () => {
                // Whoosh da entidade puxando carta do montante
                this._noise(0.15, 0.12, 6000);
                this._sweep(300, 1200, 0.1, 'sine', 0.08);
            },

            'discard': () => {
                // Descarte rápido
                this._sweep(600, 200, 0.12, 'triangle', 0.15);
                this._noise(0.08, 0.1, 3000);
            },
        };
    }
}
