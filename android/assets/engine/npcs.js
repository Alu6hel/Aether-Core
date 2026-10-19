/**
 * Aether-Core: NPC Entity & Character-Specific Story Branching Engine
 * 
 * Manages friendly NPCs, interactive dialogue trees, character portraits,
 * quest progress, and deep narrative storylines that dynamically branch
 * based on whether the player is a Super Soldier, Techno-Mage, or Farmer God.
 */

const STORY_CHAPTER = {
    PROLOGUE: 'PROLOGUE',
    CH1_HAMLET_GATHERING: 'CH1_HAMLET_GATHERING',
    CH2_WOODS_RECON: 'CH2_WOODS_RECON',
    CH3_GROTTO_DESCENT: 'CH3_GROTTO_DESCENT',
    CH4_CORE_FINAL_STAND: 'CH4_CORE_FINAL_STAND'
};

class NpcManager {
    constructor() {
        this.npcs = [];
        this.activeDialogue = null;
        this.questStage = STORY_CHAPTER.CH1_HAMLET_GATHERING;
        this.activeQuestTitle = "A Gathering of Relics";
        this.activeQuestObjective = "Speak with Elder Oakhaven at the village square.";
        this.dialogueHistory = [];
    }

    /**
     * Spawns area-specific NPCs
     */
    initForArea(areaId) {
        this.npcs = [];

        if (areaId === 'CINDERWATCH_HAMLET') {
            this.npcs.push({
                id: 'ELDER_OAKHAVEN',
                name: 'Elder Oakhaven',
                title: 'Hamlet Patriarch & Scholar',
                portrait: 'ELDER',
                x: 28 * 16 + 8,
                y: 22 * 16 + 8,
                facing: 'down',
                wanderTimer: 2.0,
                homeX: 28 * 16 + 8,
                homeY: 22 * 16 + 8,
                wanderRadius: 16,
                spriteColor: '#6c5ce7',
                hairColor: '#dfe6e9'
            });

            this.npcs.push({
                id: 'BLACKSMITH_THORNE',
                name: 'Blacksmith Thorne',
                title: 'Master of the Anvil',
                portrait: 'SMITH',
                x: 42 * 16 + 8,
                y: 18 * 16 + 8,
                facing: 'left',
                wanderTimer: 3.5,
                homeX: 42 * 16 + 8,
                homeY: 18 * 16 + 8,
                wanderRadius: 12,
                spriteColor: '#d63031',
                hairColor: '#2d3436'
            });

            this.npcs.push({
                id: 'HERBALIST_MAEVE',
                name: 'Herbalist Maeve',
                title: 'Apothecary & Forager',
                portrait: 'HERBALIST',
                x: 18 * 16 + 8,
                y: 36 * 16 + 8,
                facing: 'right',
                wanderTimer: 2.8,
                homeX: 18 * 16 + 8,
                homeY: 36 * 16 + 8,
                wanderRadius: 20,
                spriteColor: '#00b894',
                hairColor: '#e17055'
            });

            this.npcs.push({
                id: 'SCAVENGER_JAX',
                name: 'Scavenger Jax',
                title: 'Relic Hunter',
                portrait: 'SCAVENGER',
                x: 35 * 16 + 8,
                y: 44 * 16 + 8,
                facing: 'up',
                wanderTimer: 1.8,
                homeX: 35 * 16 + 8,
                homeY: 44 * 16 + 8,
                wanderRadius: 24,
                spriteColor: '#fdcb6e',
                hairColor: '#636e72'
            });
        } else if (areaId === 'WHISPERING_WOODS') {
            this.npcs.push({
                id: 'WANDERER_LYRA',
                name: 'Wanderer Lyra',
                title: 'Frontier Ranger',
                portrait: 'RANGER',
                x: 36 * 16 + 8,
                y: 28 * 16 + 8,
                facing: 'down',
                wanderTimer: 3.0,
                homeX: 36 * 16 + 8,
                homeY: 28 * 16 + 8,
                wanderRadius: 28,
                spriteColor: '#0984e3',
                hairColor: '#ffeaa7'
            });
        } else if (areaId === 'SUNKEN_GROTTO') {
            this.npcs.push({
                id: 'HERMIT_KORV',
                name: 'Hermit Korv',
                title: 'Cave Oracle',
                portrait: 'HERMIT',
                x: 30 * 16 + 8,
                y: 26 * 16 + 8,
                facing: 'down',
                wanderTimer: 4.0,
                homeX: 30 * 16 + 8,
                homeY: 26 * 16 + 8,
                wanderRadius: 10,
                spriteColor: '#a29bfe',
                hairColor: '#b2bec3'
            });
        } else if (areaId === 'SUB_BEDROCK_CORE') {
            this.npcs.push({
                id: 'ARCHIVIST_UNIT_7',
                name: 'Archivist Unit-7',
                title: 'Quantum Facility Custodian',
                portrait: 'AUTOMATON',
                x: 32 * 16 + 8,
                y: 20 * 16 + 8,
                facing: 'down',
                wanderTimer: 99.0,
                homeX: 32 * 16 + 8,
                homeY: 20 * 16 + 8,
                wanderRadius: 0,
                spriteColor: '#00cec9',
                hairColor: '#74b9ff'
            });
        }
    }

    /**
     * Get nearby NPC within interaction distance (e.g. 28px)
     */
    getNearbyNpc(playerX, playerY, maxDist = 28) {
        for (const npc of this.npcs) {
            const dx = npc.x - playerX;
            const dy = npc.y - playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= maxDist) return npc;
        }
        return null;
    }

    /**
     * Update NPC idle wander and facing
     */
    update(dt, playerX, playerY) {
        for (const npc of this.npcs) {
            // If in active dialogue with this NPC, face the player directly
            if (this.activeDialogue && this.activeDialogue.npcId === npc.id) {
                const dx = playerX - npc.x;
                const dy = playerY - npc.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    npc.facing = dx > 0 ? 'right' : 'left';
                } else {
                    npc.facing = dy > 0 ? 'down' : 'up';
                }
                continue;
            }

            // Gentle autonomous wander
            npc.wanderTimer -= dt;
            if (npc.wanderTimer <= 0) {
                npc.wanderTimer = 2.0 + Math.random() * 3.5;
                if (Math.random() < 0.45 && npc.wanderRadius > 0) {
                    // Step toward home
                    const ang = Math.random() * Math.PI * 2;
                    const nx = npc.homeX + Math.cos(ang) * (Math.random() * npc.wanderRadius);
                    const ny = npc.homeY + Math.sin(ang) * (Math.random() * npc.wanderRadius);
                    const stepDx = nx - npc.x;
                    const stepDy = ny - npc.y;
                    if (Math.abs(stepDx) > Math.abs(stepDy)) {
                        npc.facing = stepDx > 0 ? 'right' : 'left';
                    } else {
                        npc.facing = stepDy > 0 ? 'down' : 'up';
                    }
                    npc.x = nx;
                    npc.y = ny;
                } else {
                    // Turn in place
                    const dirs = ['up', 'down', 'left', 'right'];
                    npc.facing = dirs[Math.floor(Math.random() * dirs.length)];
                }
            }
        }
    }

    /**
     * Generates character-specific dialogue lines based on chosen class
     */
    getDialogueFor(npc, playerClass, callsign = 'ALU-01') {
        const cls = playerClass || 'SUPER_SOLDIER';

        // 1. ELDER OAKHAVEN
        if (npc.id === 'ELDER_OAKHAVEN') {
            if (cls === 'SUPER_SOLDIER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"By the Dyson stars... an Aegis Vanguard soldier. Keep that tungsten blade grounded, ${callsign}."`,
                        `"The tremors shaking Cinderwatch come from the ancient Sub-Core beneath our feet. An automated war machine—the Aegis Dreadnought—has awakened."`,
                        `"You were forged for this battle. Seek Wanderer Lyra in the Whispering Woods to the north; she knows the secret grotto entrance."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH2_WOODS_RECON,
                        title: "Vanguard's Reckoning",
                        objective: "Head North into Whispering Woods and meet Wanderer Lyra at the bridge."
                    }
                };
            } else if (cls === 'TECHNO_MAGE') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Greetings, Arcanist ${callsign}. The leyline chronometers are fluctuating wildly."`,
                        `"Our people call it 'magic', but your academy scrolls know the truth: quantum nanite radiation leaking from the subterranean Dyson lattice."`,
                        `"If you can tune the resonance frequencies and bypass the reactor safeguards, you can avert a total spacetime collapse. Seek Lyra in the Woods."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH2_WOODS_RECON,
                        title: "Harmonic Resonance",
                        objective: "Venture North into Whispering Woods and find Lyra's ranger station."
                    }
                };
            } else if (cls === 'CHRONO_GLITCHER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"By the chronos stars... you walk between split seconds, ${callsign}."`,
                        `"The tremors in Cinderwatch are not merely physical; they are tachyon shockwaves from the Sub-Core fracturing our timeline."`,
                        `"Your temporal rewinds can bypass impossible hazards. Seek Wanderer Lyra in the Whispering Woods; she tracks the spacetime fissures."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH2_WOODS_RECON,
                        title: "Paradox Stalker",
                        objective: "Head North into Whispering Woods to track the timeline fracture."
                    }
                };
            } else if (cls === 'SOLARION_ARCHITECT') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"*Bows head in reverence*... A Master Architect of the Dyson Luminary walks among us."`,
                        `"The grand core above is struggling to balance its diurnal solar transitions. The core mechanisms deep below have fallen into discord."`,
                        `"Deploy your hard-light prisms and restore geometric balance to our world. Seek Wanderer Lyra in the Woods."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH2_WOODS_RECON,
                        title: "Architect's Blueprint",
                        objective: "Venture North into Whispering Woods to inspect the Dyson lattice pylons."
                    }
                };
            } else { // FARMER_GOD
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Praise be... old friend. I watched the wild cabbages stand tall and bloom the moment your straw hat entered our gates."`,
                        `"The settlers think you are just a wandering tiller, but the soil never forgets its Prime Terraformer."`,
                        `"The metallic roots below are decaying, Harvester. Breathe cosmic life back into the subterranean earth and soothe the screaming machinery."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH2_WOODS_RECON,
                        title: "The Great Awakening",
                        objective: "Walk the Whispering Woods North to awaken the slumbering forest leylines."
                    }
                };
            }
        }

        // 2. BLACKSMITH THORNE
        if (npc.id === 'BLACKSMITH_THORNE') {
            if (cls === 'SUPER_SOLDIER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Look at that reinforced tungsten chassis! Real Pre-Collapse combat alloys."`,
                        `"If you're heading into the deep ruins, make sure you keep your stone axe sharp and your dash thrusters lubricated. The automatons hit hard."`,
                        `"Parry right as their strikes hit (Button B) to stagger them with a kinetic deflection shockwave!"`
                    ]
                };
            } else if (cls === 'TECHNO_MAGE') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Careful with those plasma sparks near my coal piles, Arcanist! You'll ignite the forge!"`,
                        `"Though I admit... your kinetic barrier field is fascinating. Never seen energy weave itself into solid armor before."`,
                        `"Mine the flint boulders out in the wild if you need spark catalysts for your field craft."`
                    ]
                };
            } else if (cls === 'CHRONO_GLITCHER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Your blade... it's vibrating at a frequency that makes my anvil sing without me touching it!"`,
                        `"A Temporal Tuning Blade. One swing and you cut not just steel, but the moment in time when the steel was forged."`,
                        `"Keep your phase engine cooled. Reality doesn't like being cut into ribbons, traveler."`
                    ]
                };
            } else if (cls === 'SOLARION_ARCHITECT') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Great stars above! Hard-light photon emitters?! I've only read of such metallurgy in the First Age archives!"`,
                        `"You don't need a blacksmith when you can construct solid matter directly from sunlight and laser geometry."`,
                        `"If you find Sunstone nodes out in the dunes, use their crystalline cores to focus your orbital beam arrays."`
                    ]
                };
            } else { // FARMER_GOD
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"I took a tap at your harvesting scythe earlier when you rested... My master-grade hammer cracked clean in half!"`,
                        `"What in the world is that tool forged from?! Star-matter?! Cosmic obsidian?!"`,
                        `"Whatever it is... keep swinging it, Elder. You're the sharpest thing in this entire realm."`
                    ]
                };
            }
        }

        // 3. HERBALIST MAEVE
        if (npc.id === 'HERBALIST_MAEVE') {
            if (cls === 'SUPER_SOLDIER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Soldier! Even cybernetic plating needs biological maintenance."`,
                        `"Gather wild medicinal herbs and roast cabbages over a campfire to keep your vital organs running."`,
                        `"Here, take this advice: Craft a Herbal Salve from 2 medicinal herbs whenever your armor integrity drops."`
                    ]
                };
            } else if (cls === 'TECHNO_MAGE') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Your aura smells of ionized ozone and blue lotus... a true quantum scholar!"`,
                        `"Did you know the bioluminescent mushrooms in the Sunken Grotto amplify mental energy (NRG) tenfold?"`,
                        `"Combine grotto flora with your arcane catalyst to distill legendary restorative drafts."`
                    ]
                };
            } else if (cls === 'CHRONO_GLITCHER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"You flicker like a mirage, time-traveler! One moment you're here, the next you're three seconds ago."`,
                        `"Drinking brewed medicinal teas helps anchor your consciousness in the present continuum."`,
                        `"Don't lose yourself in the glitch. Take care of your mortal vessel."`
                    ]
                };
            } else if (cls === 'SOLARION_ARCHITECT') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Architect! The solar radiance surrounding your power suit makes the herbs sprout in real time!"`,
                        `"Plants adore hard-light photons. If you ever build a greenhouse, call me—we'll make the wasteland bloom."`,
                        `"Stay hydrated out in the Solarium Dunes; the sun burns bright even for its architects."`
                    ]
                };
            } else { // FARMER_GOD
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"*Gasp*... The wilting medicinal herbs in my basket just blossomed into pure golden petals as you walked by!"`,
                        `"You possess the deific touch of the ancient harvest gods. Teach me your ways, venerable master!"`,
                        `"The land itself is alive, and it listens to every word you utter."`
                    ]
                };
            }
        }

        // 4. SCAVENGER JAX
        if (npc.id === 'SCAVENGER_JAX') {
            if (cls === 'SUPER_SOLDIER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Hey soldier! Found any ancient military supply pods out there?"`,
                        `"The Quantum Supply Pods scattered across the overworld hold encrypted sub-core keycards and ALU coin nuggets. Examine them with Button A!"`
                    ]
                };
            } else if (cls === 'TECHNO_MAGE') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Arcanist! I saw strange holographic glints shimmering in the tall grass."`,
                        `"Step over those foraging sparkles—they discharge raw ALU matrix coins directly into your digital wallet!"`
                    ]
                };
            } else if (cls === 'CHRONO_GLITCHER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Whoa! Did you just phase through that wooden fence?! That's the best trick for looting locked vault rooms I've ever seen!"`,
                        `"Keep an eye out for quantum chest anomalies—they appear in places where time runs backwards."`
                    ]
                };
            } else if (cls === 'SOLARION_ARCHITECT') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Look at that golden gear! You look like you just walked off an orbital flagship."`,
                        `"Out in the Solarium Dunes to the south, there are ancient solar condensers loaded with rare sunstone relics."`
                    ]
                };
            } else { // FARMER_GOD
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Old timer, you carry yourself like you own every blade of grass in this valley."`,
                        `"...And strangely enough, I think you actually do. May your harvest be endless, friend."`
                    ]
                };
            }
        }

        // 5. WANDERER LYRA (WHISPERING WOODS)
        if (npc.id === 'WANDERER_LYRA') {
            if (cls === 'SUPER_SOLDIER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Vanguard! You made it past the forest river. The automatons are patrolling ahead."`,
                        `"Behind me lies the mossy entrance to the Sunken Grotto. Inside, the ancient water pipes channel directly down into the Sub-Bedrock Core."`,
                        `"Prepare your blade. Once you enter the facility, the Aegis Dreadnought will seal the blast doors."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH3_GROTTO_DESCENT,
                        title: "Descent to the Deep",
                        objective: "Enter the Sunken Grotto cave mouth and navigate the underground falls."
                    }
                };
            } else if (cls === 'TECHNO_MAGE') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"The air hums around you, Weaver. The forest animals aren't frightened; they know you understand the leylines."`,
                        `"The cavern ahead plunges into the Sunken Grotto. Watch out for the falling water currents—they carry residual nanite coolant."`,
                        `"Let your arcane light guide the way through the underground dark."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH3_GROTTO_DESCENT,
                        title: "The Phosphor Trail",
                        objective: "Descend into the Sunken Grotto and trace the nanite coolant pipes."
                    }
                };
            } else if (cls === 'CHRONO_GLITCHER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"You are a ghost in the timestream, Glitcher. The leylines are rippling in your wake."`,
                        `"Ahead lies the Celestial Zenith bridge to the west, and the Sunken Grotto deep below."`,
                        `"Use your temporal rewind if the Dreadnought's laser grid traps you. You can rewrite your position in spacetime."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH3_GROTTO_DESCENT,
                        title: "Rewriting History",
                        objective: "Breach the Grotto or follow the sky bridges to the Celestial Zenith."
                    }
                };
            } else if (cls === 'SOLARION_ARCHITECT') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"Architect! The stars above align to your presence."`,
                        `"The sky portal leading to the Celestial Zenith is open to the west. Ancient Dyson observation platforms float in the clouds."`,
                        `"Deploy your laser prisms to suppress the rogue security grid."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH3_GROTTO_DESCENT,
                        title: "Zenith Alignment",
                        objective: "Ascend toward the Celestial Zenith or descend into the Sub-Core reactor."
                    }
                };
            } else { // FARMER_GOD
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"The forest whispers your true name, Great Harvester."`,
                        `"Beneath the moss and stone lies the forgotten 3x3 Genesis Arable Plot. Till that sacred earth, and the ancient Dyson engine will recognize its creator."`,
                        `"Go forth. The cosmos awaits your celestial reap."`
                    ],
                    questUpdate: {
                        stage: STORY_CHAPTER.CH3_GROTTO_DESCENT,
                        title: "Reclaiming the Soil",
                        objective: "Descend into the Grotto and find the passage to the Sub-Bedrock Core."
                    }
                };
            }
        }

        // 6. HERMIT KORV (SUNKEN GROTTO)
        if (npc.id === 'HERMIT_KORV') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Drip... drip... do you hear it? The heartbeat of Archaea-09."`,
                    `"Through the blast door to the south lies the Sub-Bedrock Core. The Aegis Dreadnought waits atop the reactor floor."`,
                    `"Take this blessing of the cavern dew, traveler. May your soul remain unbroken in the depths."`
                ],
                questUpdate: {
                    stage: STORY_CHAPTER.CH4_CORE_FINAL_STAND,
                    title: "The Final Vault",
                    objective: "Breach the Sub-Bedrock Quantum Core and challenge the Aegis Dreadnought."
                }
            };
        }

        // 7. ARCHIVIST UNIT-7 (SUB_BEDROCK_CORE)
        if (npc.id === 'ARCHIVIST_UNIT_7') {
            if (cls === 'SUPER_SOLDIER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"[VOICE SYNTHESIS]: Security Scan: Aegis Vanguard detected. Unit Serial: ${callsign}."`,
                        `"[DIRECTIVE]: Aegis Dreadnought has exceeded autonomy threshold. Protocol Omega active."`,
                        `"[ENGAGE]: Decommission the rogue command unit. Free the Dyson Core."`
                    ]
                };
            } else if (cls === 'TECHNO_MAGE') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"[VOICE SYNTHESIS]: High Psionic Resonance detected. Class: Quantum Weaver."`,
                        `"[ANALYSIS]: Spacetime flux at 94.2%. Dyson matrix stability critical."`,
                        `"[OVERRIDE]: Neutralize the rogue core governor to synchronize the temporal continuum."`
                    ]
                };
            } else if (cls === 'CHRONO_GLITCHER') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"[ANOMALY DETECTED]: Causality loop breach. Pioneer exists across multiple world-lines."`,
                        `"[TACHYON TRACE]: Reality coefficient destabilizing at 88.4%."`,
                        `"[OVERCLOCK AUTHORIZED]: Execute temporal rewinds to shatter the Dreadnought's temporal anchor."`
                    ]
                };
            } else if (cls === 'SOLARION_ARCHITECT') {
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"[RECOGNITION]: Master Architect credentials validated. Access level: ALPHA PRIME."`,
                        `"[STATUS REPORT]: Dyson Core Luminary containment rings operating at 62% efficiency."`,
                        `"[SUB-SYSTEM PURGE]: Commandeer orbital hard-light emitters. Overwrite the rogue Dreadnought subroutines."`
                    ]
                };
            } else { // FARMER_GOD
                return {
                    speaker: npc.name,
                    title: npc.title,
                    portrait: npc.portrait,
                    lines: [
                        `"[ALERT]: Biosignature matches... PRIMARY TERRAFORMER / GENESIS ARCHITECT."`,
                        `"[SYSTEM ACKNOWLEDGEMENT]: Welcome home, Creator. The soil has waited ten thousand cycles."`,
                        `"[DIRECTIVE]: Purge the metallic corruption from the arable heart of the world."`
                    ]
                };
            }
        }

        // Default fallback
        return {
            speaker: npc.name,
            title: npc.title,
            portrait: npc.portrait,
            lines: [`"Safe travels on Archaea-09, traveler."`]
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NpcManager, STORY_CHAPTER };
}
