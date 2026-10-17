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

    // ==========================================
    // NOSTALGIC 4-VOICE BGM SEQUENCER
    // ==========================================

    startBgm(theme = 'OVERWORLD') {
        if (!this.ctx) return;
        this.stopBgm();
        this.isPlayingBgm = true;
        this.currentTheme = theme;
        this.stepIndex = 0;

        // 32-Step Nostalgic GBA Overworld Progression (D Major / B Minor Pentatonic)
        // Authentic Route 101 / Minish Cap Hyrule Field feeling!
        const OVERWORLD_LEAD = [
            293.66, 0, 329.63, 369.99,  440.00, 0, 493.88, 440.00, // D4, E4, F#4, A4, B4, A4
            369.99, 0, 329.63, 293.66,  329.63, 369.99, 440.00, 0,
            493.88, 0, 587.33, 493.88,  440.00, 369.99, 440.00, 0, // B4, D5, B4, A4, F#4, A4
            329.63, 0, 293.66, 246.94,  293.66, 0, 0, 0
        ];

        const OVERWORLD_BASS = [
            146.83, 0, 146.83, 0,  123.47, 0, 123.47, 0, // D3 -> B2
            98.00,  0, 98.00,  0,  110.00, 0, 110.00, 0, // G2 -> A2
            146.83, 0, 146.83, 0,  123.47, 0, 123.47, 0,
            98.00,  0, 110.00, 0,  146.83, 0, 146.83, 0
        ];

        const OVERWORLD_CHORDS = [
            440.00, 0, 587.33, 0,  369.99, 0, 493.88, 0,
            392.00, 0, 493.88, 0,  440.00, 0, 554.37, 0,
            440.00, 0, 587.33, 0,  369.99, 0, 493.88, 0,
            392.00, 0, 440.00, 0,  587.33, 0, 0, 0
        ];

        // Atmospheric Sub-Bedrock Dungeon Theme (D Dorian with deep resonant bass)
        const DUNGEON_LEAD = [
            146.83, 0, 174.61, 0,  220.00, 0, 261.63, 220.00,
            196.00, 0, 174.61, 0,  164.81, 0, 146.83, 0,
            130.81, 0, 146.83, 0,  174.61, 0, 196.00, 0,
            220.00, 0, 174.61, 0,  146.83, 0, 0, 0
        ];

        const DUNGEON_BASS = [
            73.42, 0, 73.42, 0,   65.41, 0, 65.41, 0,  // D2 -> C2
            55.00, 0, 55.00, 0,   73.42, 0, 73.42, 0,  // A1 -> D2
            73.42, 0, 73.42, 0,   65.41, 0, 65.41, 0,
            55.00, 0, 65.41, 0,   73.42, 0, 0, 0
        ];

        const isDungeon = (theme === 'SUB_CORE');
        const leadTrack = isDungeon ? DUNGEON_LEAD : OVERWORLD_LEAD;
        const bassTrack = isDungeon ? DUNGEON_BASS : OVERWORLD_BASS;
        const chordTrack = isDungeon ? DUNGEON_LEAD : OVERWORLD_CHORDS;
        const stepTimeMs = 175; // Upbeat, energetic GBA tempo (~170 BPM 16th-notes)

        this.bgmTimer = setInterval(() => {
            if (!this.isPlayingBgm) return;
            const step = this.stepIndex % leadTrack.length;

            // 1. Lead Melody (Voice 1: Warm filtered pulse)
            const leadFreq = leadTrack[step];
            if (leadFreq > 0) {
                this.playWarmNote(leadFreq, 'square', 0.14, 0.045, 2400);
            }

            // 2. Chords & Arp (Voice 2: Soft triangle)
            const chordFreq = chordTrack[step];
            if (chordFreq > 0 && !isDungeon) {
                this.playWarmNote(chordFreq, 'triangle', 0.12, 0.025, 1800);
            }

            // 3. Beefy Sub-Bass (Voice 3: Resonant bass)
            const bassFreq = bassTrack[step];
            if (bassFreq > 0) {
                this.playSubBass(bassFreq, 0.18, 0.09);
            }

            // 4. Drums / Percussion (Voice 4: Punchy kick & hi-hat)
            if (step % 8 === 0) {
                this.playRetroKick(); // Downbeat punch
            } else if (step % 4 === 2) {
                this.playRetroKick(); // Backbeat punch
            }
            if (step % 2 === 0) {
                this.playSoftHiHat(); // Soft rhythm sizzle
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
