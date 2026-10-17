/**
 * Aether-Core: Nostalgic 4-Voice Chiptune Synth & Beefy Tactical Audio Engine
 * 
 * Provides:
 * - 4-Channel polyphonic background music:
 *     Voice 1: Warm filtered pulse lead with analog vibrato (Nostalgic GBA adventure melody)
 *     Voice 2: Soft triangle harmony & chord arpeggiator
 *     Voice 3: Resonant punchy sub-bass with low-pass filter (beefy console low-end)
 *     Voice 4: Filtered analog percussion (deep pitch-drop kick & soft noise hi-hat)
 * - Beefy, solid sound effects with low-end impact, crisp transients, and metallic resonance.
 */

class ChiptuneSynth {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.filterNode = null;
        this.compressor = null;
        this.bgmTimer = null;
        this.stepIndex = 0;
        this.isPlayingBgm = false;
        this.currentTheme = 'OVERWORLD';
    }

    init() {
        if (!this.ctx && typeof AudioContext !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            // Dynamics Compressor for cohesive, glued retro console sound without clipping
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

            // Master analog low-pass filter (removes harsh digital aliasing, gives warm GBA DAC warmth)
            this.filterNode = this.ctx.createBiquadFilter();
            this.filterNode.type = 'lowpass';
            this.filterNode.frequency.setValueAtTime(9500, this.ctx.currentTime);

            // Master Volume Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.45, this.ctx.currentTime);

            this.masterGain.connect(this.filterNode);
            this.filterNode.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);
        }

        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Warm filtered note generator with ADSR envelope
    playWarmNote(freq, type = 'square', duration = 0.16, volume = 0.08, filterFreq = 2600) {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const flt = this.ctx.createBiquadFilter();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            // Soft lowpass on the voice
            flt.type = 'lowpass';
            flt.frequency.setValueAtTime(filterFreq, now);

            // Smooth ADSR envelope
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(volume, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(volume * 0.7, now + duration * 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(flt);
            flt.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {}
    }

    // Beefy sub-bass note with resonant low-end punch
    playSubBass(freq, duration = 0.22, volume = 0.14) {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const flt = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            // Resonant low-pass filter around 220Hz
            flt.type = 'lowpass';
            flt.frequency.setValueAtTime(260, now);
            flt.Q.setValueAtTime(2.2, now);

            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(flt);
            flt.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {}
    }

    // Punchy retro kick drum (frequency drop from 120Hz to 35Hz)
    playRetroKick() {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.09);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    // Soft retro hi-hat (bandpass noise)
    playSoftHiHat() {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const duration = 0.035;
            const bufferSize = Math.floor(this.ctx.sampleRate * duration);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const flt = this.ctx.createBiquadFilter();
            flt.type = 'highpass';
            flt.frequency.setValueAtTime(6500, this.ctx.currentTime);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            noise.connect(flt);
            flt.connect(gain);
            gain.connect(this.masterGain);

            noise.start();
        } catch (e) {}
    }

    // Legacy helper compatibility
    playNote(freq, type = 'square', duration = 0.12, volume = 0.08) {
        return this.playWarmNote(freq, type, duration, volume);
    }

    playTone(freq, type = 'square', duration = 0.12, volume = 0.08) {
        return this.playWarmNote(freq, type, duration, volume);
    }

    playNoise(duration = 0.08, volume = 0.06) {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const bufferSize = Math.floor(this.ctx.sampleRate * duration);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            noise.connect(gain);
            gain.connect(this.masterGain);
            noise.start();
        } catch (e) {}
    }

    // ==========================================
    // TACTILE UI & MENU SOUND FX
    // ==========================================

    playMenuMove() {
        // Soft wooden tactile click (pitch drop 520Hz -> 280Hz)
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(540, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.025);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.025);
        } catch(e) {}
    }

    playBlip() {
        this.playMenuMove();
    }

    playMenuSelect() {
        // Crisp warm ascending confirmation chime
        this.playWarmNote(587.33, 'triangle', 0.06, 0.08, 3200); // D5
        setTimeout(() => this.playWarmNote(880.00, 'triangle', 0.12, 0.08, 3800), 45); // A5
    }

    playRoll() {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => this.playWarmNote(320 + i * 110, 'triangle', 0.04, 0.06, 2400), i * 35);
        }
    }

    playCancel() {
        this.playWarmNote(440, 'triangle', 0.06, 0.06, 2000);
        setTimeout(() => this.playWarmNote(293.66, 'triangle', 0.10, 0.06, 1600), 45);
    }

    playTypewriter() {
        this.playMenuMove();
    }

    // ==========================================
    // BEEFY COMBAT & TACTICAL SFX
    // ==========================================

    // Solid Melee Slash: Low-end punch + crisp metallic slicing transient
    playSlash(comboStep = 1) {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // 1. Low-end kinetic thud
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            const baseF = comboStep === 2 ? 310 : (comboStep === 3 ? 360 : 250);
            osc.frequency.setValueAtTime(baseF, now);
            osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.12);

            // 2. High-speed whoosh
            this.playNoise(0.05, 0.04);
        } catch(e) {}
    }

    // Kinetic Dash Whoosh: Weighty air displacement with pitch slide
    playDash() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const flt = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

            flt.type = 'bandpass';
            flt.frequency.setValueAtTime(900, now);
            flt.Q.setValueAtTime(1.5, now);

            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            osc.connect(flt);
            flt.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.16);
        } catch(e) {}
    }

    playShoot() {
        // Techno-Mage Arcane Pulse: Resonant dual-tone electric pulse
        this.playWarmNote(740, 'triangle', 0.12, 0.08, 4200);
        setTimeout(() => this.playWarmNote(987.77, 'sine', 0.14, 0.07, 3600), 30);
    }

    playParry() {
        // High crisp metallic "CLANG!" with resonant sub-thud
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // High metallic bell ring
            const bell = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            bell.type = 'square';
            bell.frequency.setValueAtTime(1420, now);
            bGain.gain.setValueAtTime(0.16, now);
            bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            bell.connect(bGain);
            bGain.connect(this.masterGain);
            bell.start(now);
            bell.stop(now + 0.28);

            // Sub thud
            const thud = this.ctx.createOscillator();
            const tGain = this.ctx.createGain();
            thud.type = 'sine';
            thud.frequency.setValueAtTime(220, now);
            thud.frequency.exponentialRampToValueAtTime(60, now + 0.14);
            tGain.gain.setValueAtTime(0.2, now);
            tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            thud.connect(tGain);
            tGain.connect(this.masterGain);
            thud.start(now);
            thud.stop(now + 0.14);
        } catch(e) {}
    }

    playCoin() {
        this.playWarmNote(987.77, 'sine', 0.08, 0.10, 4800);
        setTimeout(() => this.playWarmNote(1318.51, 'sine', 0.16, 0.10, 4800), 60);
    }

    // Triumphant GBA Item Obtained Fanfare (C5 -> E5 -> G5 -> C6)
    playItemObtained() {
        const arpeggio = [523.25, 659.25, 783.99, 1046.50];
        arpeggio.forEach((freq, idx) => {
            setTimeout(() => {
                this.playWarmNote(freq, 'triangle', idx === 3 ? 0.35 : 0.12, 0.12, 4500);
            }, idx * 65);
        });
    }

    playBossLaser() {
        this.playWarmNote(140, 'sawtooth', 0.40, 0.15, 1200);
        this.playNoise(0.25, 0.07);
    }

    playHarvest() {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((n, i) => {
            setTimeout(() => this.playWarmNote(n, 'triangle', 0.22, 0.09, 3500), i * 55);
        });
    }

    // Triumphant Level Up Fanfare (A4 -> C#5 -> E5 -> A5 -> C#6 -> E6)
    playLevelUp() {
        const arpeggio = [440.00, 554.37, 659.25, 880.00, 1108.73, 1318.51];
        arpeggio.forEach((freq, idx) => {
            setTimeout(() => {
                this.playWarmNote(freq, 'triangle', idx === 5 ? 0.45 : 0.14, 0.14, 5200);
            }, idx * 70);
        });
    }

    // Skill Unlock Chime
    playSkillUnlocked() {
        this.playWarmNote(659.25, 'triangle', 0.12, 0.12, 4400);
        setTimeout(() => this.playWarmNote(880.00, 'triangle', 0.12, 0.12, 4600), 75);
        setTimeout(() => this.playWarmNote(1318.51, 'sine', 0.28, 0.15, 5200), 150);
    }

    // Super Soldier Whirlwind Strike Swoosh
    playWhirlwind() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(540, now + 0.18);
            osc.frequency.linearRampToValueAtTime(120, now + 0.36);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.36);
        } catch(e) {}
    }

    // Techno-Mage Graviton Singularity Vortex
    playSingularity() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const flt = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(65, now + 0.45);
            flt.type = 'lowpass';
            flt.frequency.setValueAtTime(2200, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.connect(flt);
            flt.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.45);
        } catch(e) {}
    }

    // Farmer God Gaia Cataclysm Primordial Root Eruption
    playGaiaRoot() {
        this.playSubBass(75, 0.35, 0.18);
        this.playWarmNote(330, 'triangle', 0.25, 0.12, 1800);
    }

    // ==========================================
    // NOSTALGIC 4-VOICE BGM SEQUENCER
    // ==========================================

    startBgm(theme = 'OVERWORLD') {
        if (!this.ctx) return;
        this.stopBgm();
        this.isPlayingBgm = true;
        this.currentTheme = theme;
        this.stepIndex = 0;

        // =========================================================================
        // 64-STEP NOSTALGIC GBA MULTI-MOVEMENT COMPOSITIONS
        // Designed for immersive non-repetitive listening across distinct areas
        // =========================================================================

        // 1. CINDERWATCH HAMLET / OVERWORLD (D Major / B Minor pastoral adventure)
        const OVERWORLD_LEAD = [
            // Movement A: Pastoral GBA lilt (Steps 0-15)
            293.66, 0, 329.63, 369.99,  440.00, 0, 493.88, 440.00,
            369.99, 0, 329.63, 293.66,  329.63, 369.99, 440.00, 0,
            // Movement A2: Echoing phrase (Steps 16-31)
            493.88, 0, 587.33, 493.88,  440.00, 369.99, 440.00, 0,
            329.63, 0, 293.66, 246.94,  293.66, 0, 0, 0,
            // Movement B: Soaring thematic ascension (Steps 32-47)
            587.33, 0, 659.25, 739.99,  659.25, 0, 587.33, 493.88,
            440.00, 0, 493.88, 587.33,  493.88, 440.00, 369.99, 0,
            // Movement C: Reflective golden-hour cadence (Steps 48-63)
            392.00, 0, 440.00, 493.88,  440.00, 0, 369.99, 293.66,
            329.63, 0, 369.99, 329.63,  293.66, 0, 0, 0
        ];

        const OVERWORLD_BASS = [
            146.83, 0, 146.83, 0,  123.47, 0, 123.47, 0, // D3 -> B2
            98.00,  0, 98.00,  0,  110.00, 0, 110.00, 0, // G2 -> A2
            146.83, 0, 146.83, 0,  123.47, 0, 123.47, 0,
            98.00,  0, 110.00, 0,  146.83, 0, 146.83, 0,
            98.00,  0, 98.00,  0,  110.00, 0, 110.00, 0, // G2 -> A2
            123.47, 0, 123.47, 0,  98.00,  0, 98.00,  0, // B2 -> G2
            82.41,  0, 92.50,  0,  110.00, 0, 110.00, 0, // E2 -> F#2 -> A2
            146.83, 0, 146.83, 0,  146.83, 0, 0, 0
        ];

        const OVERWORLD_CHORDS = [
            440.00, 0, 587.33, 0,  369.99, 0, 493.88, 0,
            392.00, 0, 493.88, 0,  440.00, 0, 554.37, 0,
            440.00, 0, 587.33, 0,  369.99, 0, 493.88, 0,
            392.00, 0, 440.00, 0,  587.33, 0, 0, 0,
            587.33, 0, 739.99, 0,  554.37, 0, 659.25, 0,
            493.88, 0, 587.33, 0,  392.00, 0, 493.88, 0,
            329.63, 0, 369.99, 0,  440.00, 0, 554.37, 0,
            587.33, 0, 440.00, 0,  293.66, 0, 0, 0
        ];

        // 2. WHISPERING WOODS (E Dorian ethereal forest mystery)
        const WOODS_LEAD = [
            329.63, 0, 392.00, 0,      440.00, 493.88, 587.33, 0,
            493.88, 0, 440.00, 392.00, 329.63, 0, 293.66, 0,
            329.63, 0, 392.00, 440.00, 493.88, 0, 554.37, 0,
            587.33, 0, 493.88, 0,      440.00, 0, 0, 0,
            659.25, 0, 587.33, 0,      493.88, 554.37, 587.33, 0,
            493.88, 0, 440.00, 0,      392.00, 440.00, 493.88, 0,
            440.00, 0, 392.00, 329.63, 293.66, 0, 246.94, 0,
            329.63, 0, 392.00, 0,      329.63, 0, 0, 0
        ];

        const WOODS_BASS = [
            82.41, 0, 82.41, 0,   98.00,  0, 98.00,  0,
            110.00, 0, 110.00, 0, 123.47, 0, 123.47, 0,
            82.41, 0, 82.41, 0,   98.00,  0, 98.00,  0,
            110.00, 0, 123.47, 0, 82.41,  0, 0, 0,
            123.47, 0, 123.47, 0, 110.00, 0, 110.00, 0,
            98.00,  0, 98.00,  0, 82.41,  0, 82.41,  0,
            73.42,  0, 73.42,  0, 61.74,  0, 61.74,  0,
            82.41,  0, 82.41,  0, 82.41,  0, 0, 0
        ];

        const WOODS_CHORDS = [
            329.63, 0, 493.88, 0, 392.00, 0, 587.33, 0,
            440.00, 0, 554.37, 0, 493.88, 0, 587.33, 0,
            329.63, 0, 493.88, 0, 392.00, 0, 587.33, 0,
            440.00, 0, 493.88, 0, 329.63, 0, 0, 0,
            493.88, 0, 659.25, 0, 440.00, 0, 587.33, 0,
            392.00, 0, 493.88, 0, 329.63, 0, 440.00, 0,
            293.66, 0, 369.99, 0, 246.94, 0, 329.63, 0,
            329.63, 0, 493.88, 0, 329.63, 0, 0, 0
        ];

        // 3. SUNKEN GROTTO (A Minor / D Dorian subterranean crystalline echoes)
        const GROTTO_LEAD = [
            220.00, 0, 261.63, 0,      329.63, 0, 392.00, 329.63,
            293.66, 0, 261.63, 0,      246.94, 0, 220.00, 0,
            174.61, 0, 220.00, 0,      261.63, 0, 293.66, 0,
            329.63, 0, 293.66, 0,      220.00, 0, 0, 0,
            440.00, 0, 392.00, 0,      329.63, 0, 293.66, 261.63,
            220.00, 0, 261.63, 0,      293.66, 0, 329.63, 0,
            261.63, 0, 220.00, 0,      196.00, 0, 174.61, 0,
            220.00, 0, 246.94, 0,      220.00, 0, 0, 0
        ];

        const GROTTO_BASS = [
            55.00, 0, 55.00, 0,   65.41, 0, 65.41, 0,  // A1 -> C2
            73.42, 0, 73.42, 0,   55.00, 0, 55.00, 0,  // D2 -> A1
            43.65, 0, 43.65, 0,   55.00, 0, 55.00, 0,  // F1 -> A1
            65.41, 0, 73.42, 0,   55.00, 0, 0, 0,
            55.00, 0, 55.00, 0,   65.41, 0, 65.41, 0,
            73.42, 0, 73.42, 0,   87.31, 0, 87.31, 0,  // F2
            65.41, 0, 55.00, 0,   49.00, 0, 43.65, 0,  // G1 -> F1
            55.00, 0, 55.00, 0,   55.00, 0, 0, 0
        ];

        const GROTTO_CHORDS = [
            220.00, 0, 329.63, 0, 261.63, 0, 392.00, 0,
            293.66, 0, 440.00, 0, 220.00, 0, 329.63, 0,
            174.61, 0, 261.63, 0, 220.00, 0, 329.63, 0,
            261.63, 0, 293.66, 0, 220.00, 0, 0, 0,
            440.00, 0, 523.25, 0, 392.00, 0, 493.88, 0,
            329.63, 0, 392.00, 0, 293.66, 0, 349.23, 0,
            261.63, 0, 329.63, 0, 220.00, 0, 261.63, 0,
            220.00, 0, 261.63, 0, 220.00, 0, 0, 0
        ];

        // 4. SUB-BEDROCK QUANTUM CORE (D Minor industrial cyber-pulse)
        const CORE_LEAD = [
            146.83, 0, 174.61, 0,      220.00, 0, 261.63, 220.00,
            196.00, 0, 174.61, 0,      164.81, 0, 146.83, 0,
            130.81, 0, 146.83, 0,      174.61, 0, 196.00, 0,
            220.00, 0, 174.61, 0,      146.83, 0, 0, 0,
            293.66, 0, 261.63, 0,      220.00, 0, 207.65, 0, // Ab4
            196.00, 0, 174.61, 0,      164.81, 0, 146.83, 0,
            130.81, 0, 146.83, 0,      174.61, 0, 207.65, 0,
            220.00, 0, 174.61, 0,      146.83, 0, 0, 0
        ];

        const CORE_BASS = [
            73.42, 0, 73.42, 0,   65.41, 0, 65.41, 0,  // D2 -> C2
            55.00, 0, 55.00, 0,   73.42, 0, 73.42, 0,  // A1 -> D2
            73.42, 0, 73.42, 0,   65.41, 0, 65.41, 0,
            55.00, 0, 65.41, 0,   73.42, 0, 0, 0,
            73.42, 0, 73.42, 0,   65.41, 0, 65.41, 0,
            51.91, 0, 51.91, 0,   55.00, 0, 55.00, 0,  // Ab1 -> A1
            73.42, 0, 73.42, 0,   65.41, 0, 65.41, 0,
            55.00, 0, 65.41, 0,   73.42, 0, 0, 0
        ];

        let leadTrack = OVERWORLD_LEAD;
        let bassTrack = OVERWORLD_BASS;
        let chordTrack = OVERWORLD_CHORDS;
        let stepTimeMs = 185; // Warm, steady nostalgic tempo

        if (theme === 'SUB_CORE' || theme === 'SUB_BEDROCK_CORE') {
            leadTrack = CORE_LEAD;
            bassTrack = CORE_BASS;
            chordTrack = CORE_LEAD;
            stepTimeMs = 170;
        } else if (theme === 'WHISPERING_WOODS') {
            leadTrack = WOODS_LEAD;
            bassTrack = WOODS_BASS;
            chordTrack = WOODS_CHORDS;
            stepTimeMs = 190;
        } else if (theme === 'SUNKEN_GROTTO') {
            leadTrack = GROTTO_LEAD;
            bassTrack = GROTTO_BASS;
            chordTrack = GROTTO_CHORDS;
            stepTimeMs = 205; // Placid, cavernous pacing
        }

        this.bgmTimer = setInterval(() => {
            if (!this.isPlayingBgm) return;
            const step = this.stepIndex % leadTrack.length;

            // 1. Lead Melody (Voice 1: Warm filtered pulse)
            const leadFreq = leadTrack[step];
            if (leadFreq > 0) {
                const leadDuration = (theme === 'SUNKEN_GROTTO') ? 0.20 : 0.14;
                const leadCutoff = (theme === 'WHISPERING_WOODS') ? 2800 : 2400;
                this.playWarmNote(leadFreq, 'square', leadDuration, 0.045, leadCutoff);
            }

            // 2. Chords & Arpeggio (Voice 2: Soft triangle)
            const chordFreq = chordTrack[step];
            if (chordFreq > 0 && theme !== 'SUB_CORE' && theme !== 'SUB_BEDROCK_CORE') {
                this.playWarmNote(chordFreq, 'triangle', 0.12, 0.022, 1750);
            }

            // 3. Beefy Sub-Bass (Voice 3: Resonant punchy low-end)
            const bassFreq = bassTrack[step];
            if (bassFreq > 0) {
                const bassDuration = (theme === 'SUNKEN_GROTTO') ? 0.24 : 0.18;
                this.playSubBass(bassFreq, bassDuration, 0.09);
            }

            // 4. Soft Tactical Percussion (Voice 4)
            if (theme === 'SUNKEN_GROTTO') {
                // Placid subterranean water drops instead of aggressive drums
                if (step % 16 === 0) {
                    this.playWarmNote(1200, 'sine', 0.04, 0.015, 3000); // Water drip
                } else if (step % 8 === 4) {
                    this.playSoftHiHat();
                }
            } else if (theme === 'WHISPERING_WOODS') {
                // Gentle brush rhythm
                if (step % 8 === 0) {
                    this.playRetroKick();
                }
                if (step % 4 === 2) {
                    this.playSoftHiHat();
                }
            } else {
                // Overworld & Sub-Core: Classic punchy kick & hi-hat cadence
                if (step % 8 === 0) {
                    this.playRetroKick(); // Downbeat
                } else if (step % 4 === 2) {
                    this.playRetroKick(); // Backbeat
                }
                if (step % 2 === 0) {
                    this.playSoftHiHat(); // Soft rhythm
                }
            }

            this.stepIndex++;
        }, stepTimeMs);
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
