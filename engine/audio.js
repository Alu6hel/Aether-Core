/**
 * Aether-Core: Procedural Chiptune Music & Sound FX Synthesizer
 * 
 * Multi-channel procedural Web Audio sound generator:
 * - Lead melody (Square wave)
 * - Bassline (Triangle wave)
 * - Percussion (Procedural noise buffer)
 * - Atmospheric BGM tracks for Overworld, Sub-Bedrock Dungeons, and Boss Battles.
 */

class ChiptuneSynth {
    constructor() {
        this.ctx = null;
        this.currentTrack = null;
        this.bgmTimer = null;
        this.noteIndex = 0;
        this.isPlayingBgm = false;
    }

    init() {
        if (!this.ctx && typeof AudioContext !== 'undefined') {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playNote(freq, type = 'square', duration = 0.12, volume = 0.08) {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playNoise(duration = 0.08, volume = 0.06) {
        if (!this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            noise.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        } catch (e) {}
    }

    // SFX Methods
    playSlash(comboStep = 1) {
        const freqs = [220, 280, 380];
        const f = freqs[(comboStep - 1) % 3] || 220;
        this.playNote(f, 'sawtooth', 0.1, 0.08);
        this.playNoise(0.04, 0.04);
    }

    playShoot() {
        this.playNote(740, 'triangle', 0.14, 0.07);
        setTimeout(() => this.playNote(880, 'sine', 0.1, 0.05), 40);
    }

    playParry() {
        // High crisp dual-tone metallic "CLANG!"
        this.playNote(1250, 'square', 0.28, 0.14);
        setTimeout(() => this.playNote(1880, 'sine', 0.22, 0.1), 25);
    }

    playCoin() {
        this.playNote(987.77, 'sine', 0.08, 0.1);
        setTimeout(() => this.playNote(1318.51, 'sine', 0.16, 0.1), 70);
    }

    playBossLaser() {
        this.playNote(160, 'sawtooth', 0.45, 0.15);
        this.playNoise(0.3, 0.08);
    }

    playHarvest() {
        const notes = [440, 554, 659, 880];
        notes.forEach((n, i) => {
            setTimeout(() => this.playNote(n, 'triangle', 0.2, 0.08), i * 60);
        });
    }

    // Background Music Sequencer
    startBgm(theme = 'OVERWORLD') {
        if (!this.ctx) return;
        this.stopBgm();
        this.isPlayingBgm = true;
        this.noteIndex = 0;

        // Note frequencies: [A3, C4, D4, E4, G4, A4, C5]
        const OVERWORLD_MELODY = [
            220, 0, 261.63, 293.66, 329.63, 0, 392.00, 329.63,
            293.66, 0, 261.63, 220.00, 261.63, 293.66, 329.63, 0
        ];
        const DUNGEON_MELODY = [
            110, 0, 110, 130.81, 146.83, 0, 110, 164.81,
            98, 0, 98, 123.47, 146.83, 0, 130.81, 0
        ];

        const melody = (theme === 'SUB_CORE') ? DUNGEON_MELODY : OVERWORLD_MELODY;
        const stepTime = 220; // ms per 16th step

        this.bgmTimer = setInterval(() => {
            if (!this.isPlayingBgm) return;
            const note = melody[this.noteIndex % melody.length];
            if (note > 0) {
                this.playNote(note, (theme === 'SUB_CORE') ? 'sawtooth' : 'triangle', 0.16, 0.035);
            }
            if (this.noteIndex % 4 === 0) {
                this.playNoise(0.04, 0.015); // Gentle hi-hat
            }
            this.noteIndex++;
        }, stepTime);
    }

    stopBgm() {
        this.isPlayingBgm = false;
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChiptuneSynth };
}
