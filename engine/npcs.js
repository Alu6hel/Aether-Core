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
        } else if (areaId === 'AETHELGARD_CITADEL') {
            this.npcs.push({
                id: 'LORD_COMMISSIONER_KRELL',
                name: 'Commissioner Krell',
                title: 'High Commander of the Citadel',
                portrait: 'ELDER',
                x: 48 * 16 + 8,
                y: 32 * 16 + 8,
                facing: 'down',
                wanderTimer: 3.5,
                homeX: 48 * 16 + 8,
                homeY: 32 * 16 + 8,
                wanderRadius: 14,
                spriteColor: '#78909c',
                hairColor: '#eceff1'
            });
            this.npcs.push({
                id: 'ENGINEER_BRUNOR',
                name: 'Chief Engineer Brunor',
                title: 'Master Mechanist',
                portrait: 'SMITH',
                x: 58 * 16 + 8,
                y: 36 * 16 + 8,
                facing: 'left',
                wanderTimer: 2.5,
                homeX: 58 * 16 + 8,
                homeY: 36 * 16 + 8,
                wanderRadius: 18,
                spriteColor: '#e65100',
                hairColor: '#3e2723'
            });
            this.npcs.push({
                id: 'INVENTOR_ZARA',
                name: 'Inventor Zara',
                title: 'Quantum Dynamo Specialist',
                portrait: 'HERBALIST',
                x: 64 * 16 + 8,
                y: 44 * 16 + 8,
                facing: 'down',
                wanderTimer: 3.0,
                homeX: 64 * 16 + 8,
                homeY: 44 * 16 + 8,
                wanderRadius: 20,
                spriteColor: '#00e5ff',
                hairColor: '#ff4081'
            });
            this.npcs.push({
                id: 'QUARTERMASTER_VOLKER',
                name: 'Quartermaster Volker',
                title: 'Citadel Armorer',
                portrait: 'SMITH',
                x: 40 * 16 + 8,
                y: 48 * 16 + 8,
                facing: 'right',
                wanderTimer: 4.0,
                homeX: 40 * 16 + 8,
                homeY: 48 * 16 + 8,
                wanderRadius: 12,
                spriteColor: '#d32f2f',
                hairColor: '#212121'
            });
            this.npcs.push({
                id: 'SCHOLAR_MALACHI',
                name: 'Scholar Malachi',
                title: 'Archivist of Aethelgard',
                portrait: 'ELDER',
                x: 52 * 16 + 8,
                y: 56 * 16 + 8,
                facing: 'up',
                wanderTimer: 2.8,
                homeX: 52 * 16 + 8,
                homeY: 56 * 16 + 8,
                wanderRadius: 16,
                spriteColor: '#9c27b0',
                hairColor: '#b0bec5'
            });
        } else if (areaId === 'OASIS_SOLARIS') {
            this.npcs.push({
                id: 'MERCHANT_PRINCE_FARUQ',
                name: 'Prince Faruq',
                title: 'Master of the Golden Bazaar',
                portrait: 'SCAVENGER',
                x: 54 * 16 + 8,
                y: 48 * 16 + 8,
                facing: 'down',
                wanderTimer: 2.4,
                homeX: 54 * 16 + 8,
                homeY: 48 * 16 + 8,
                wanderRadius: 22,
                spriteColor: '#ffd700',
                hairColor: '#263238'
            });
            this.npcs.push({
                id: 'ASTRONOMER_NABILAH',
                name: 'Astronomer Nabilah',
                title: 'Cosmic Stargazer',
                portrait: 'HERBALIST',
                x: 68 * 16 + 8,
                y: 40 * 16 + 8,
                facing: 'left',
                wanderTimer: 3.2,
                homeX: 68 * 16 + 8,
                homeY: 40 * 16 + 8,
                wanderRadius: 16,
                spriteColor: '#304ffe',
                hairColor: '#f48fb1'
            });
            this.npcs.push({
                id: 'MIRAGE_WEAVER_SAMIRA',
                name: 'Samira the Weaver',
                title: 'Desert Sorceress',
                portrait: 'RANGER',
                x: 42 * 16 + 8,
                y: 52 * 16 + 8,
                facing: 'right',
                wanderTimer: 3.5,
                homeX: 42 * 16 + 8,
                homeY: 52 * 16 + 8,
                wanderRadius: 18,
                spriteColor: '#ff6f00',
                hairColor: '#ffd54f'
            });
            this.npcs.push({
                id: 'NOMAD_SCOUT_TAHIR',
                name: 'Nomad Tahir',
                title: 'Dune Navigator',
                portrait: 'RANGER',
                x: 60 * 16 + 8,
                y: 64 * 16 + 8,
                facing: 'up',
                wanderTimer: 2.0,
                homeX: 60 * 16 + 8,
                homeY: 64 * 16 + 8,
                wanderRadius: 24,
                spriteColor: '#f57c00',
                hairColor: '#424242'
            });
            this.npcs.push({
                id: 'ALCHEMIST_ZARIUS',
                name: 'Alchemist Zarius',
                title: 'Solar Distiller',
                portrait: 'HERBALIST',
                x: 50 * 16 + 8,
                y: 36 * 16 + 8,
                facing: 'down',
                wanderTimer: 4.0,
                homeX: 50 * 16 + 8,
                homeY: 36 * 16 + 8,
                wanderRadius: 12,
                spriteColor: '#ffab00',
                hairColor: '#ffeb3b'
            });
        } else if (areaId === 'FROSTSPIRE_ENCLAVE') {
            this.npcs.push({
                id: 'HIGH_PRIESTESS_SYLVA',
                name: 'High Priestess Sylva',
                title: 'Guardian of the Glacial Shrine',
                portrait: 'ELDER',
                x: 56 * 16 + 8,
                y: 46 * 16 + 8,
                facing: 'down',
                wanderTimer: 3.0,
                homeX: 56 * 16 + 8,
                homeY: 46 * 16 + 8,
                wanderRadius: 14,
                spriteColor: '#e0f7fa',
                hairColor: '#ffffff'
            });
            this.npcs.push({
                id: 'FROSTSMITH_GUNNAR',
                name: 'Frostsmith Gunnar',
                title: 'Glacial Forgemaster',
                portrait: 'SMITH',
                x: 44 * 16 + 8,
                y: 54 * 16 + 8,
                facing: 'right',
                wanderTimer: 3.2,
                homeX: 44 * 16 + 8,
                homeY: 54 * 16 + 8,
                wanderRadius: 16,
                spriteColor: '#81d4fa',
                hairColor: '#37474f'
            });
            this.npcs.push({
                id: 'CRYOMANCER_YURA',
                name: 'Cryomancer Yura',
                title: 'Frost Astrologer',
                portrait: 'HERBALIST',
                x: 66 * 16 + 8,
                y: 50 * 16 + 8,
                facing: 'left',
                wanderTimer: 2.8,
                homeX: 66 * 16 + 8,
                homeY: 50 * 16 + 8,
                wanderRadius: 18,
                spriteColor: '#4fc3f7',
                hairColor: '#e1f5fe'
            });
            this.npcs.push({
                id: 'RANGER_ERIK',
                name: 'Ranger Erik',
                title: 'Alpine Pass Watchman',
                portrait: 'RANGER',
                x: 50 * 16 + 8,
                y: 64 * 16 + 8,
                facing: 'up',
                wanderTimer: 2.5,
                homeX: 50 * 16 + 8,
                homeY: 64 * 16 + 8,
                wanderRadius: 22,
                spriteColor: '#29b6f6',
                hairColor: '#b0bec5'
            });
            this.npcs.push({
                id: 'SEERESS_ASTRID',
                name: 'Seeress Astrid',
                title: 'Glacial Rune Oracle',
                portrait: 'HERMIT',
                x: 58 * 16 + 8,
                y: 34 * 16 + 8,
                facing: 'down',
                wanderTimer: 3.8,
                homeX: 58 * 16 + 8,
                homeY: 34 * 16 + 8,
                wanderRadius: 10,
                spriteColor: '#b3e5fc',
                hairColor: '#eceff1'
            });
        } else if (areaId === 'VERDANT_CANOPY_HAVEN') {
            this.npcs.push({
                id: 'MATRIARCH_ELENORA',
                name: 'Matriarch Elenora',
                title: 'Keeper of the Canopy',
                portrait: 'ELDER',
                x: 52 * 16 + 8,
                y: 44 * 16 + 8,
                facing: 'down',
                wanderTimer: 3.0,
                homeX: 52 * 16 + 8,
                homeY: 44 * 16 + 8,
                wanderRadius: 15,
                spriteColor: '#4caf50',
                hairColor: '#a5d6a7'
            });
            this.npcs.push({
                id: 'BOTANIST_ALDEN',
                name: 'Botanist Alden',
                title: 'Canopy Herbalist & Alchemist',
                portrait: 'HERBALIST',
                x: 42 * 16 + 8,
                y: 52 * 16 + 8,
                facing: 'right',
                wanderTimer: 2.6,
                homeX: 42 * 16 + 8,
                homeY: 52 * 16 + 8,
                wanderRadius: 18,
                spriteColor: '#81c784',
                hairColor: '#558b2f'
            });
            this.npcs.push({
                id: 'GROVE_DEFENDER_KYLE',
                name: 'Sentinel Kyle',
                title: 'Grove Defender',
                portrait: 'RANGER',
                x: 64 * 16 + 8,
                y: 48 * 16 + 8,
                facing: 'left',
                wanderTimer: 2.2,
                homeX: 64 * 16 + 8,
                homeY: 48 * 16 + 8,
                wanderRadius: 20,
                spriteColor: '#2e7d32',
                hairColor: '#33691e'
            });
            this.npcs.push({
                id: 'MYSTIC_ROWAN',
                name: 'Mystic Rowan',
                title: 'Druid of the Green',
                portrait: 'HERMIT',
                x: 58 * 16 + 8,
                y: 58 * 16 + 8,
                facing: 'up',
                wanderTimer: 3.4,
                homeX: 58 * 16 + 8,
                homeY: 58 * 16 + 8,
                wanderRadius: 12,
                spriteColor: '#1b5e20',
                hairColor: '#81c784'
            });
            this.npcs.push({
                id: 'PIONEER_SEEDSMAN_SILAS',
                name: 'Seedsman Silas',
                title: 'Ancient Arborist',
                portrait: 'SCAVENGER',
                x: 48 * 16 + 8,
                y: 36 * 16 + 8,
                facing: 'down',
                wanderTimer: 3.1,
                homeX: 48 * 16 + 8,
                homeY: 36 * 16 + 8,
                wanderRadius: 16,
                spriteColor: '#aed581',
                hairColor: '#f1f8e9'
            });
        } else if (areaId === 'SOLARIUM_DUNES') {
            this.npcs.push({
                id: 'DESERT_CARTOGRAPHER_OMAR',
                name: 'Cartographer Omar',
                title: 'Dune Surveyor',
                portrait: 'SCAVENGER',
                x: 40 * 16 + 8,
                y: 36 * 16 + 8,
                facing: 'right',
                wanderTimer: 3.0,
                homeX: 40 * 16 + 8,
                homeY: 36 * 16 + 8,
                wanderRadius: 20,
                spriteColor: '#ff9800',
                hairColor: '#5d4037'
            });
        } else if (areaId === 'OBSIDIAN_CHASM') {
            this.npcs.push({
                id: 'ECLIPSE_ORACLE_NOCTIS',
                name: 'Oracle Noctis',
                title: 'Chasm Void Seer',
                portrait: 'HERMIT',
                x: 48 * 16 + 8,
                y: 42 * 16 + 8,
                facing: 'down',
                wanderTimer: 4.0,
                homeX: 48 * 16 + 8,
                homeY: 42 * 16 + 8,
                wanderRadius: 8,
                spriteColor: '#673ab7',
                hairColor: '#d1c4e9'
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

        // ==========================================
        // AETHELGARD CITADEL NPCS
        // ==========================================
        if (npc.id === 'LORD_COMMISSIONER_KRELL') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Stand tall, Pioneer. You stand within Aethelgard Citadel, the mechanical bulwark of the northern frontier."`,
                    `"Steam turbines and clockwork valves keep the Dyson power conduit stable, but the subterranean vaults groan at night."`,
                    `"Our Chief Mechanist Brunor and Inventor Zara are researching the quantum anomalies. Make yourself useful."`
                ]
            };
        }

        if (npc.id === 'ENGINEER_BRUNOR') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Hear that rhythmic hiss? That's fifty atmospheres of superheated geothermal steam powering our blast forges."`,
                    `"Deep in our Clockwork Vault, we sealed ancient automaton engines. Do not meddle with the basement stairs unless you're heavily armored."`,
                    `"If you seek the lost Sub-Core, talk to Zara. Her intellect burns brighter than molten titanium."`
                ]
            };
        }

        if (npc.id === 'INVENTOR_ZARA') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Eureka! Pioneer, your bio-electric signature matches the 64-bit harmonic frequency of our ALU core!"`,
                    `"I've compiled the cryptographic matrix needed to override the sealed blast doors leading into the Sub-Bedrock Quantum Core."`,
                    `"Take this Sub-Bedrock Quantum Cipher. The heavy vault door in Sunken Grotto will open for you. Decommission the rogue Dreadnought!"`
                ],
                questUpdate: {
                    stage: 'QUEST_SUB_BEDROCK_CIPHER',
                    title: "The Sub-Core Key",
                    objective: "Breach the Sub-Bedrock Quantum Core using Zara's Quantum Cipher.",
                    rewardItem: 'SUB_CORE_CIPHER'
                }
            };
        }

        if (npc.id === 'QUARTERMASTER_VOLKER') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Armor plates, reinforced greaves, kinetic shock absorbers—Aethelgard forged steel will save your life out there."`,
                    `"Remember this combat rule: parry right before the monster strike lands. A perfect deflection staggers them and opens a lethal counter!"`
                ]
            };
        }

        if (npc.id === 'SCHOLAR_MALACHI') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"The ancient scrolls describe five sanctuaries on Archaea-09, each separated by two wilderness expanses in perfect mathematical harmony."`,
                    `"The Dyson Sphere above us is not merely a power collector—it is a conscious cosmic clockwork guiding our planetary evolution."`
                ]
            };
        }

        // ==========================================
        // OASIS SOLARIS NPCS
        // ==========================================
        if (npc.id === 'MERCHANT_PRINCE_FARUQ') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Ahlan wa sahlan! Welcome to Oasis Solaris, jewel of the golden dunes!"`,
                    `"Trade winds carry fortunes from across the continent. Rest beneath our date palms and replenish your provisions."`,
                    `"Beware the heat mirages at the borders of the desert—walk into them, and your senses will dissolve in the shimmer."`
                ]
            };
        }

        if (npc.id === 'ASTRONOMER_NABILAH') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"The stars whisper secrets across the desert sky, Pioneer. The Dyson superstructure aligns with the Celestial Zenith Peak!"`,
                    `"I have focused starlight through a prism of resonant solar quartz to synthesize this Celestial Zenith Keystone."`,
                    `"Take it. Ascend the cloud stairway in the high mountain pass to pierce the celestial clouds and enter the Zenith."`
                ],
                questUpdate: {
                    stage: 'QUEST_ZENITH_KEYSTONE',
                    title: "Ascent to the Zenith",
                    objective: "Unlock the pathway to Celestial Zenith with Nabilah's Astral Keystone.",
                    rewardItem: 'ASTRAL_KEYSTONE'
                }
            };
        }

        if (npc.id === 'MIRAGE_WEAVER_SAMIRA') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"The sands are alive with memory. Beneath our bazaar lie the Sunken Pharaoh Catacombs."`,
                    `"Those who descend the basement stairs face ancient desert guardians, but the treasure chests within contain relics of solar glass."`
                ]
            };
        }

        if (npc.id === 'NOMAD_SCOUT_TAHIR') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Keep water close and your blade sharp. Sand-scorpions and solar sentinels hunt the dunes."`,
                    `"When night falls and the monster frenzy begins, even seasoned nomads find shelter within the town walls."`
                ]
            };
        }

        if (npc.id === 'ALCHEMIST_ZARIUS') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"I distill the harsh desert heat into restorative sunfire tonics."`,
                    `"Harvest medicinal herbs and glowing cacti from the oasis borders, and you shall never succumb to venom."`
                ]
            };
        }

        // ==========================================
        // FROSTSPIRE ENCLAVE NPCS
        // ==========================================
        if (npc.id === 'HIGH_PRIESTESS_SYLVA') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"May the crystal snows bring peace to your spirit, traveler."`,
                    `"Frostspire Enclave preserves the quiet solemnity of the ancient glacier. Beyond our shrine lies the biting blizzard haze."`,
                    `"Keep your inner flame lit, for the cold tests the soul as fiercely as any blade."`
                ]
            };
        }

        if (npc.id === 'FROSTSMITH_GUNNAR') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Steel quenched in glacial springwater never dulls and never shatters."`,
                    `"Deep in our Glacial Crypts beneath the forge, ancient cryo-beasts guard frozen chests of primordial metal."`
                ]
            };
        }

        if (npc.id === 'CRYOMANCER_YURA') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"The ice here does not melt—it holds memories of the first settlers who arrived through the Dyson gate."`,
                    `"Watch the northern sky during the deep night. The auroras dance with the rhythm of the stellar core."`
                ]
            };
        }

        if (npc.id === 'RANGER_ERIK') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"I patrol the Glacial Steppe. The snow wolves are territorial, but they fear the warmth of campfires."`,
                    `"Travel during daylight when possible. At night, the cold bite slows your step while the monsters quicken."`
                ]
            };
        }

        if (npc.id === 'SEERESS_ASTRID') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"I have cast the glacial runes. They speak of a great shadow cast upon Archaea-09 by the Eclipse Void."`,
                    `"A hero must rise with relics of starlight, iron, and green flora to restore planetary balance."`
                ]
            };
        }

        // ==========================================
        // VERDANT CANOPY HAVEN NPCS
        // ==========================================
        if (npc.id === 'MATRIARCH_ELENORA') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Welcome to the high boughs of Verdant Canopy Haven, where the branches of the living Yggdrasil embrace the clouds."`,
                    `"Here, nature and quantum technology weave together in perfect symmetry."`,
                    `"Respect the forest, Pioneer, and the forest will yield its most miraculous secrets."`
                ]
            };
        }

        if (npc.id === 'BOTANIST_ALDEN') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"The sap of the Great Canopy contains bioactive compounds capable of instant cellular rejuvenation."`,
                    `"Bring me wild berries and herbs from the woodland floor, and I can brew life-saving elixirs."`
                ]
            };
        }

        if (npc.id === 'GROVE_DEFENDER_KYLE') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"The wooden suspension bridges are secured. No corrupted monstrosity crosses into our haven."`,
                    `"We keep watchful eyes on the enchanted mist surrounding our tree canopy."`
                ]
            };
        }

        if (npc.id === 'MYSTIC_ROWAN') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Pioneer of the stars... the ancient roots feel a tremor of pure void emanating from the Obsidian Chasm."`,
                    `"A dimensional fissure has torn reality itself. Without protection, your mind would shatter upon crossing the threshold."`,
                    `"Take this consecrated Eclipse Void Amulet. With it, the dimensional veil into the Eclipse Void Sanctuary will yield to you."`
                ],
                questUpdate: {
                    stage: 'QUEST_WHISPERING_ECLIPSE',
                    title: "Secrets of the Void",
                    objective: "Enter the Eclipse Void Sanctuary in the Obsidian Chasm with Rowan's Amulet.",
                    rewardItem: 'ECLIPSE_AMULET'
                }
            };
        }

        if (npc.id === 'PIONEER_SEEDSMAN_SILAS') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Every grand forest begins with a single sacred seed planted in fertile arable soil."`,
                    `"If you ever encounter an arable plot in your journeys, till it with care. Life will return to even the coldest metal core."`
                ]
            };
        }

        // ==========================================
        // WILDERNESS OUTPOST NPCS
        // ==========================================
        if (npc.id === 'DESERT_CARTOGRAPHER_OMAR') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"Mapping the Solarium Dunes is tricky with the shifting sands and heat mirages."`,
                    `"Always check your radar minimap—the directional compass arrow points true even when the horizon wavers!"`
                ]
            };
        }

        if (npc.id === 'ECLIPSE_ORACLE_NOCTIS') {
            return {
                speaker: npc.name,
                title: npc.title,
                portrait: npc.portrait,
                lines: [
                    `"You walk along the edge of the bottomless chasm, Pioneer. The cosmic void gazes back at you."`,
                    `"Only those who bear the sacred amulet from the Canopy Haven may step through the twilight rift unscathed."`
                ]
            };
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
