/**
 * AudioManager — Motor de Áudio do AstraLatro
 * 
 * Gerencia BGM (menu + runs) com crossfade automático.
 * Para adicionar novas músicas de run, basta colocar o .ogg na pasta
 * assets/musics/ e adicionar o path no array RUN_TRACKS abaixo.
 */

// ==============================
// CONFIGURAÇÃO DE TRACKS
// Adicione novas músicas de run aqui!
// ==============================
const MENU_TRACK = 'assets/musics/Main_Theme.ogg';

const RUN_TRACKS = [
    'assets/musics/Dark-Industrial.ogg',
    'assets/musics/High-Stakes-Static.ogg',
    'assets/musics/In-The-Club.ogg',
    'assets/musics/Steel-Nerve-Protocol.ogg',
];

// ==============================
// CONSTANTES
// ==============================
const CROSSFADE_DURATION = 2.5;       // Segundos do crossfade
const NEAR_END_THRESHOLD = 8;         // Segundos antes do fim para iniciar transição
const DEFAULT_BGM_VOLUME = 0.15;
const MENU_VOLUME = 0.45;

export class AudioManager {
    constructor() {
        // Dois canais de áudio para crossfade suave
        this.channelA = new Audio();
        this.channelB = new Audio();
        this.channelA.loop = false;
        this.channelB.loop = false;

        this.activeChannel = this.channelA;
        this.inactiveChannel = this.channelB;

        this.masterVolume = 1.0;
        this.bgmVolume = DEFAULT_BGM_VOLUME;
        this.isMuted = false;

        // Estado do shuffle
        this._runQueue = [];
        this._currentTrackPath = null;
        this._crossfading = false;
        this._checkInterval = null;
        this._fadeInterval = null;
        this._mode = 'none'; // 'menu', 'run', 'none'

        // Quando a track ativa terminar naturalmente, pula pra próxima
        this.channelA.addEventListener('ended', () => this._onTrackEnded(this.channelA));
        this.channelB.addEventListener('ended', () => this._onTrackEnded(this.channelB));
    }

    // ==============================
    // API PÚBLICA
    // ==============================

    /** Toca a música do menu principal com fade-in */
    playMenuMusic() {
        this._mode = 'menu';
        this._stopNearEndCheck();
        this._crossfadeTo(MENU_TRACK, MENU_VOLUME, true);
    }

    /** Inicia o sistema de run: pega track aleatória e começa o loop infinito */
    playRunMusic() {
        this._mode = 'run';
        this._shuffleQueue();
        const track = this._getNextTrack();
        this._crossfadeTo(track, this.bgmVolume, false);
        this._startNearEndCheck();
    }

    /** Força transição para próxima música da run (ex: novo blind) */
    nextRunTrack() {
        if (this._mode !== 'run') return;
        if (this._crossfading) return;
        const track = this._getNextTrack();
        this._crossfadeTo(track, this.bgmVolume, false);
    }

    /** Para tudo com fade-out */
    stopAll() {
        this._mode = 'none';
        this._stopNearEndCheck();
        this._fadeOut(this.activeChannel, 1.5);
        this._fadeOut(this.inactiveChannel, 1.5);
    }

    /** Toggle mute */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.channelA.muted = this.isMuted;
        this.channelB.muted = this.isMuted;
        return this.isMuted;
    }

    /** Define volume master (0–1) */
    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
    }

    // ==============================
    // CROSSFADE ENGINE
    // ==============================

    _crossfadeTo(trackPath, targetVolume, loop) {
        if (this._crossfading && this._fadeInterval) {
            clearInterval(this._fadeInterval);
        }
        this._crossfading = true;
        this._currentTrackPath = trackPath;

        // Prepara o canal inativo com a nova música
        const incoming = this.inactiveChannel;
        incoming.src = trackPath;
        incoming.loop = loop;
        incoming.volume = 0;
        incoming.muted = this.isMuted;
        incoming.play().catch(() => { }); // Autoplay policy

        const outgoing = this.activeChannel;
        const outVolume = outgoing.volume;
        const steps = Math.floor(CROSSFADE_DURATION * 20); // 50ms steps
        let step = 0;

        this._fadeInterval = setInterval(() => {
            step++;
            const progress = step / steps;

            // Fade out do canal ativo
            outgoing.volume = Math.max(0, outVolume * (1 - progress)) * this.masterVolume;

            // Fade in do canal novo
            incoming.volume = Math.min(targetVolume, targetVolume * progress) * this.masterVolume;

            if (step >= steps) {
                clearInterval(this._fadeInterval);
                this._fadeInterval = null;
                outgoing.pause();
                outgoing.currentTime = 0;

                // Swap dos canais
                this.activeChannel = incoming;
                this.inactiveChannel = outgoing;
                this._crossfading = false;
            }
        }, 50);
    }

    _fadeOut(channel, duration) {
        const startVol = channel.volume;
        const steps = Math.floor(duration * 20);
        let step = 0;
        const interval = setInterval(() => {
            step++;
            channel.volume = Math.max(0, startVol * (1 - step / steps));
            if (step >= steps) {
                clearInterval(interval);
                channel.pause();
                channel.currentTime = 0;
            }
        }, 50);
    }

    // ==============================
    // SHUFFLE & QUEUE
    // ==============================

    _shuffleQueue() {
        // Fisher-Yates shuffle
        this._runQueue = [...RUN_TRACKS];
        for (let i = this._runQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._runQueue[i], this._runQueue[j]] = [this._runQueue[j], this._runQueue[i]];
        }
    }

    _getNextTrack() {
        // Se a fila esvaziou, re-shuffle
        if (this._runQueue.length === 0) {
            this._shuffleQueue();
        }
        return this._runQueue.pop();
    }

    // ==============================
    // NEAR-END AUTO TRANSITION
    // ==============================

    _startNearEndCheck() {
        this._stopNearEndCheck();
        this._checkInterval = setInterval(() => {
            if (this._mode !== 'run') return;
            if (this._crossfading) return;

            const ch = this.activeChannel;
            if (!ch.duration || isNaN(ch.duration)) return;

            const remaining = ch.duration - ch.currentTime;
            if (remaining <= NEAR_END_THRESHOLD && remaining > 0) {
                // Hora de transicionar!
                const next = this._getNextTrack();
                this._crossfadeTo(next, this.bgmVolume, false);
            }
        }, 1000); // Checa a cada segundo
    }

    _stopNearEndCheck() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
            this._checkInterval = null;
        }
    }

    _onTrackEnded(channel) {
        // Safety net: se a música terminou sem o near-end catch
        if (this._mode === 'run' && channel === this.activeChannel && !this._crossfading) {
            const next = this._getNextTrack();
            this._crossfadeTo(next, this.bgmVolume, false);
        }
    }
}
