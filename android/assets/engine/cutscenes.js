/**
 * Aether-Core: Cutscene & Scripted Narrative Sequence Engine
 * 
 * Provides GBA-style portrait dialogue presentations (with typewriter sound/text),
 * dynamic camera staging, and secret unlock event sequences.
 */

class CutsceneEngine {
    constructor() {
        this.activeSequence = null;
        this.currentStepIndex = 0;
        this.stepTimer = 0;
        this.charIndex = 0;
        this.typewriterTimer = 0;
        this.displayedText = "";
        this.isComplete = true;
        this.cameraTarget = { x: 0, y: 0 };
        this.portrait = null; // Image/Sprite for the speaking character
        this.speakerName = "";
        this.onCompleteCallback = null;
    }

    startIntroSequence(onDone) {
        this.onCompleteCallback = onDone;
        this.isComplete = false;
        this.currentStepIndex = 0;
        this.stepTimer = 0;
        this.activeSequence = [
            {
                type: 'DIALOGUE',
                speaker: 'Chief Overseer Vance',
                title: 'Planetary Genesis Dispatch',
                portrait: 'OVERSEER',
                text: "Welcome, Pioneer. You have awakened on Archaea-09. To the settlers above, this realm is one of elemental sorcery and ancient dungeons.",
                duration: 4.5
            },
            {
                type: 'DIALOGUE',
                speaker: 'Chief Overseer Vance',
                title: 'Planetary Genesis Dispatch',
                portrait: 'OVERSEER',
                text: "Do not be deceived. What they call 'magic' is the residual coolant and nanite radiation of a buried Dyson engine. Every dungeon was once a quantum facility.",
                duration: 5.0
            },
            {
                type: 'DIALOGUE',
                speaker: 'Chief Overseer Vance',
                title: 'Planetary Genesis Dispatch',
                portrait: 'OVERSEER',
                text: "Your world is minted directly to the ALU Coin Matrix. Clear the subterranean reactors, extract the core tokens, and beware the cataclysm. Choose your pioneer...",
                duration: 5.5
            }
        ];
        this.loadStep(0);
    }

    startFarmerUnlockSequence(onDone) {
        this.onCompleteCallback = onDone;
        this.isComplete = false;
        this.currentStepIndex = 0;
        this.stepTimer = 0;
        this.activeSequence = [
            {
                type: 'PAN',
                text: "*The cracked sci-fi conduit splits open under your strike... Ancient terraforming nanites swarm the soil!*",
                duration: 3.0
            },
            {
                type: 'DIALOGUE',
                speaker: 'Old Man Gable',
                title: 'The Deific Harvester',
                portrait: 'FARMER',
                text: "'Well, butter my biscuits. You folks are fussin' over plasma cannons and ancient reactors when all this soil needed was a proper hoein'.'",
                duration: 4.5
            },
            {
                type: 'DIALOGUE',
                speaker: 'Old Man Gable',
                title: 'The Deific Harvester',
                portrait: 'FARMER',
                text: "*Tips straw hat* 'Allow me to demonstrate how we harvest the spacetime continuum back in the old colonies.'",
                duration: 4.5
            }
        ];
        this.loadStep(0);
    }

    loadStep(index) {
        if (!this.activeSequence || index >= this.activeSequence.length) {
            this.isComplete = true;
            if (this.onCompleteCallback) this.onCompleteCallback();
            return;
        }

        this.currentStepIndex = index;
        const step = this.activeSequence[index];
        this.stepTimer = step.duration;
        this.speakerName = step.speaker || "";
        this.portrait = step.portrait || null;
        this.displayedText = "";
        this.charIndex = 0;
        this.typewriterTimer = 0;
    }

    update(dt) {
        if (this.isComplete || !this.activeSequence) return;

        const step = this.activeSequence[this.currentStepIndex];

        // Typewriter text pacing
        if (step.text && this.charIndex < step.text.length) {
            this.typewriterTimer += dt;
            if (this.typewriterTimer >= 0.025) { // 25ms per character
                this.typewriterTimer = 0;
                this.displayedText += step.text[this.charIndex];
                this.charIndex++;
            }
        }

        this.stepTimer -= dt;
        if (this.stepTimer <= 0) {
            this.loadStep(this.currentStepIndex + 1);
        }
    }

    skipStep() {
        if (this.isComplete) return;
        const step = this.activeSequence[this.currentStepIndex];
        // If text is still typing, finish typing instantly
        if (this.displayedText.length < (step.text ? step.text.length : 0)) {
            this.displayedText = step.text;
            this.charIndex = step.text.length;
        } else {
            // Next step
            this.loadStep(this.currentStepIndex + 1);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CutsceneEngine };
}
