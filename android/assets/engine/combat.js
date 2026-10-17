/**
 * Aether-Core: Character Classes, Nine-Sols Tactical Combat & Abilities
 * 
 * Implements precision parrying, momentum-scaled strikes,
 * and the secret god-like Farmer reality-warping mechanics.
 */

if (typeof require !== 'undefined' && typeof window === 'undefined') {
    const _phys = require('./physics.js');
    global.KinematicBody = _phys.KinematicBody;
    global.Vector2 = _phys.Vector2;
    try {
        const _inv = require('./inventory.js');
        global.Inventory = _inv.Inventory;
        global.BASE_ITEMS = _inv.BASE_ITEMS;
    } catch(e) {}
}

const CHARACTER_CLASS = {
    TECHNO_MAGE: 'TECHNO_MAGE',
    SUPER_SOLDIER: 'SUPER_SOLDIER',
    FARMER_GOD: 'FARMER_GOD'
};

const CLASS_SKILL_TREES = {
    SUPER_SOLDIER: [
        {
            id: 'warrior_titan_edge',
            name: 'Titan Edge',
            desc: 'Heavy cleave deals +35% damage with a wider swing arc.',
            tier: 1,
            cost: 1,
            icon: '⚔️',
            passive: true,
            req: null
        },
        {
            id: 'warrior_tungsten_bastion',
            name: 'Tungsten Bastion',
            desc: 'Max HP +40. Parries reflect 50% damage back to attackers.',
            tier: 1,
            cost: 1,
            icon: '🛡️',
            passive: true,
            req: null
        },
        {
            id: 'warrior_kinetic_overdrive',
            name: 'Kinetic Overdrive',
            desc: 'Dash speed +30% leaving a scorching trail that burns foes.',
            tier: 2,
            cost: 1,
            icon: '⚡',
            passive: true,
            req: 'warrior_titan_edge'
        },
        {
            id: 'warrior_whirlwind_strike',
            name: 'Whirlwind Strike',
            desc: 'Active Ability: 360° hurricane blade tempest dealing 85 AoE damage.',
            tier: 2,
            cost: 2,
            icon: '🌪️',
            passive: false,
            req: 'warrior_tungsten_bastion'
        },
        {
            id: 'warrior_juggernaut_stance',
            name: 'Juggernaut Stance',
            desc: 'Active Ultimate: Harden cyber-armor for 7s (+50% defense & poise).',
            tier: 3,
            cost: 2,
            icon: '🦾',
            passive: false,
            req: 'warrior_whirlwind_strike'
        }
    ],
    TECHNO_MAGE: [
        {
            id: 'mage_nanite_infusion',
            name: 'Nanite Infusion',
            desc: 'Twin-bolts gain +40% velocity and +30% detonation radius.',
            tier: 1,
            cost: 1,
            icon: '✨',
            passive: true,
            req: null
        },
        {
            id: 'mage_quantum_flux',
            name: 'Quantum Flux',
            desc: 'Energy regen increased by +60% and Max Energy +50.',
            tier: 1,
            cost: 1,
            icon: '🔮',
            passive: true,
            req: null
        },
        {
            id: 'mage_chrono_step',
            name: 'Chrono Step',
            desc: 'Dash becomes instant quantum blink teleportation through space.',
            tier: 2,
            cost: 1,
            icon: '⏳',
            passive: true,
            req: 'mage_nanite_infusion'
        },
        {
            id: 'mage_graviton_singularity',
            name: 'Graviton Singularity',
            desc: 'Active Ability: Dark-matter vortex pulls foes and implodes for 120 damage.',
            tier: 2,
            cost: 2,
            icon: '🌀',
            passive: false,
            req: 'mage_quantum_flux'
        },
        {
            id: 'mage_aegis_null_barrier',
            name: 'Aegis Null-Barrier',
            desc: 'Active Ultimate: Hexagonal photon shield absorbing 100 incoming damage.',
            tier: 3,
            cost: 2,
            icon: '🛡️',
            passive: false,
            req: 'mage_graviton_singularity'
        }
    ],
    FARMER_GOD: [
        {
            id: 'farmer_bountiful_earth',
            name: 'Bountiful Earth',
            desc: 'Slaying foes and harvesting quadruples all coin and resource drops.',
            tier: 1,
            cost: 1,
            icon: '🌾',
            passive: true,
            req: null
        },
        {
            id: 'farmer_spacetime_tillage',
            name: 'Spacetime Tillage',
            desc: 'Tilled earth emits cosmic healing pollen (+15 HP/sec).',
            tier: 1,
            cost: 1,
            icon: '🌱',
            passive: true,
            req: null
        },
        {
            id: 'farmer_solar_prominence',
            name: 'Solar Prominence',
            desc: 'Cosmic Scythe launches 16 seeking celestial star-seeds.',
            tier: 2,
            cost: 1,
            icon: '☀️',
            passive: true,
            req: 'farmer_bountiful_earth'
        },
        {
            id: 'farmer_gaia_cataclysm',
            name: 'Gaia Cataclysm',
            desc: 'Active Ability: Erupt Dyson World Tree roots, crushing foes for 150 damage.',
            tier: 2,
            cost: 2,
            icon: '🌳',
            passive: false,
            req: 'farmer_spacetime_tillage'
        },
        {
            id: 'farmer_eternal_harvest',
            name: 'Eternal Harvest',
            desc: 'Active Ultimate: Fully restores HP & Energy with golden deific invincibility.',
            tier: 3,
            cost: 2,
            icon: '👑',
            passive: false,
            req: 'farmer_gaia_cataclysm'
        }
    ]
};

class Character extends KinematicBody {
    constructor(charClass = CHARACTER_CLASS.SUPER_SOLDIER, x = 0, y = 0) {
        super(x, y, 12, 12);
        this.charClass = charClass;
        this.hp = 100;
        this.maxHp = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.coinsCollected = 0; // In-world ALU coins

        // Level & EXP Progression System
        this.level = 1;
        this.exp = 0;
        this.expToNext = 100;
        this.skillPoints = 0;
        this.unlockedSkills = {};
        
        // Combat & Animation States
        this.state = 'IDLE';     // IDLE, MOVING, ATTACKING, PARRYING, DASHING, HURT
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.dashCooldown = 0;
        this.abilityCooldowns = [0, 0, 0];
        this.invulnerableTimer = 0;

        // Visual combat trails & swings
        this.dashTrail = [];
        this.dashSpawnTimer = 0;
        this.attackSwing = null;

        // Inventory bag
        if (typeof Inventory !== 'undefined') {
            this.inventory = new Inventory();
        }

        // Parry & Deflection System (Nine-Sols inspired)
        this.isParryActive = false;
        this.parryWindow = 0.18; // 180ms tight parry window
        this.parrySuccessTimer = 0;

        // Visual effects / particles
        this.projectiles = [];
        this.activeVortices = [];
        this.crops = [];
        this.sparks = [];

        this.applyClassStats();
    }

    applyClassStats() {
        if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
            this.maxSpeed = 115.0;
            this.maxHp = 80;
            this.hp = 80;
            this.maxEnergy = 150;
            this.energy = 150;
            this.name = "Techno-Mage";
            this.title = "The Arcane Machinist";
        } else if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
            this.maxSpeed = 135.0;
            this.maxHp = 140;
            this.hp = 140;
            this.maxEnergy = 90;
            this.energy = 90;
            this.name = "Super-Soldier";
            this.title = "The Dreadnought";
        } else if (this.charClass === CHARACTER_CLASS.FARMER_GOD) {
            this.maxSpeed = 150.0;
            this.maxHp = 999;
            this.hp = 999;
            this.maxEnergy = 999;
            this.energy = 999;
            this.name = "The Farmer";
            this.title = "Deific Harvester of Space-Time";
        }
    }

    updateCombat(dt, enemies = []) {
        // Decrement timers
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
        for (let i = 0; i < this.abilityCooldowns.length; i++) {
            if (this.abilityCooldowns[i] > 0) this.abilityCooldowns[i] -= dt;
        }

        // Energy passive regen
        this.energy = Math.min(this.maxEnergy, this.energy + 18 * dt);

        // State machine timers
        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = this.isMoving ? 'MOVING' : 'IDLE';
                this.isParryActive = false;
            }
        }

        // Attack Swing visual decay
        if (this.attackSwing) {
            this.attackSwing.timer -= dt;
            if (this.attackSwing.timer <= 0) {
                this.attackSwing = null;
            }
        }

        // Dash trail update & spawn
        if (this.state === 'DASHING') {
            this.dashSpawnTimer -= dt;
            if (this.dashSpawnTimer <= 0) {
                this.dashSpawnTimer = 0.04;
                this.dashTrail.push({
                    x: this.pos.x,
                    y: this.pos.y,
                    charClass: this.charClass,
                    cardinalFacing: this.cardinalFacing || 'DOWN',
                    alpha: 0.7
                });
            }
        }
        for (let i = this.dashTrail.length - 1; i >= 0; i--) {
            const tr = this.dashTrail[i];
            tr.alpha -= dt * 3.5;
            if (tr.alpha <= 0) this.dashTrail.splice(i, 1);
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Homing logic if projectile has target
            if (p.isSeeking && enemies && enemies.length > 0) {
                let closest = null, minDist = 180;
                for (const e of enemies) {
                    if (e.hp > 0) {
                        const d = Math.hypot(e.x - p.x, e.y - p.y);
                        if (d < minDist) { minDist = d; closest = e; }
                    }
                }
                if (closest) {
                    const angle = Math.atan2(closest.y - p.y, closest.x - p.x);
                    p.vx += Math.cos(angle) * 400 * dt;
                    p.vy += Math.sin(angle) * 400 * dt;
                }
            }

            // Check hit against enemies
            for (const enemy of enemies) {
                if (enemy.hp > 0 && Math.hypot(p.x - enemy.x, p.y - enemy.y) < (p.radius || 16)) {
                    enemy.hp -= p.damage;
                    this.addSpark(p.x, p.y, p.color || '#ffff00', 10);
                    // Area explosion if splash projectile
                    if (p.splashRadius) {
                        for (const other of enemies) {
                            if (other !== enemy && other.hp > 0 && Math.hypot(p.x - other.x, p.y - other.y) < p.splashRadius) {
                                other.hp -= Math.floor(p.damage * 0.65);
                                if (other.hp <= 0) this.onEnemyDefeated(other);
                            }
                        }
                    }
                    p.life = 0;
                    if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                    break;
                }
            }

            if (p.life <= 0) {
                if (p.splashRadius) this.addSpark(p.x, p.y, p.color || '#00e5ff', 14);
                this.projectiles.splice(i, 1);
            }
        }

        // Update active vortices (Techno-Mage Singularity)
        for (let i = this.activeVortices.length - 1; i >= 0; i--) {
            const v = this.activeVortices[i];
            v.life -= dt;
            // Pull surrounding enemies toward vortex center
            for (const enemy of enemies) {
                if (enemy.hp > 0) {
                    const dx = v.x - enemy.x;
                    const dy = v.y - enemy.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 120 && dist > 4) {
                        enemy.x += (dx / dist) * 160 * dt;
                        enemy.y += (dy / dist) * 160 * dt;
                    }
                }
            }
            if (v.life <= 0) {
                // Detonate vortex
                for (const enemy of enemies) {
                    if (enemy.hp > 0 && Math.hypot(v.x - enemy.x, v.y - enemy.y) < 60) {
                        enemy.hp -= 45;
                        if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                    }
                }
                this.addSpark(v.x, v.y, '#00ffff', 24);
                this.activeVortices.splice(i, 1);
            }
        }

        // Update Sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= dt;
            if (s.life <= 0) this.sparks.splice(i, 1);
        }
    }

    // PRIMARY ATTACK (Key 'J' / Virtual Button 'A')
    primaryAttack(enemies = []) {
        if (this.attackCooldown > 0 || this.state === 'PARRYING') return;

        this.state = 'ATTACKING';
        this.stateTimer = 0.24;
        this.attackCooldown = 0.26;

        const dir = (this.facing && typeof this.facing.clone === 'function') ? this.facing.clone().normalize() : new Vector2(this.facing ? this.facing.x : 0, this.facing ? this.facing.y : 1).normalize();
        const baseAngle = Math.atan2(dir.y, dir.x);

        if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
            // Arcane Plasma Twin-Bolts: Dual swirling plasma charges with splash detonation
            this.attackSwing = {
                type: 'MAGE_PULSE',
                x: this.pos.x + dir.x * 12,
                y: this.pos.y + dir.y * 12,
                angle: baseAngle,
                timer: 0.24,
                maxTimer: 0.24
            };

            const perpX = -dir.y * 5;
            const perpY = dir.x * 5;

            const splashRad = this.hasSkill('mage_nanite_infusion') ? 42 : 28;
            const boltSpeed = this.hasSkill('mage_nanite_infusion') ? 440 : 320;
            const boltDmg = this.hasSkill('mage_nanite_infusion') ? 34 : 24;

            // Bolt 1
            this.projectiles.push({
                x: this.pos.x + dir.x * 10 + perpX,
                y: this.pos.y + dir.y * 10 + perpY,
                vx: dir.x * boltSpeed,
                vy: dir.y * boltSpeed,
                damage: boltDmg,
                life: 1.1,
                color: '#00ffff',
                radius: 12,
                splashRadius: splashRad
            });
            // Bolt 2
            this.projectiles.push({
                x: this.pos.x + dir.x * 10 - perpX,
                y: this.pos.y + dir.y * 10 - perpY,
                vx: dir.x * (boltSpeed - 10),
                vy: dir.y * (boltSpeed - 10),
                damage: boltDmg,
                life: 1.1,
                color: '#e040fb',
                radius: 12,
                splashRadius: splashRad
            });
            this.addSpark(this.pos.x + dir.x * 12, this.pos.y + dir.y * 12, '#00e5ff', 8);

        } else if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
            // Ultrasonic Broadsword Heavy Cleave: Wide frontal arc slash
            const currentSpeed = this.vel.length();
            const momentumBonus = Math.floor(currentSpeed * 0.18);
            let totalDamage = 34 + momentumBonus;
            if (this.hasSkill('warrior_titan_edge')) {
                totalDamage = Math.floor(totalDamage * 1.35);
            }
            const slashRange = this.hasSkill('warrior_titan_edge') ? 44 : 36;
            const slashArc = this.hasSkill('warrior_titan_edge') ? Math.PI * 1.1 : Math.PI * 0.8;

            this.attackSwing = {
                type: 'WARRIOR_SLASH',
                x: this.pos.x,
                y: this.pos.y,
                angle: baseAngle,
                range: slashRange,
                arc: slashArc,
                timer: 0.24,
                maxTimer: 0.24
            };

            // Hit detection in frontal cone arc
            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const ex = enemy.x - this.pos.x;
                const ey = enemy.y - this.pos.y;
                const dist = Math.hypot(ex, ey);
                if (dist <= (slashRange + 2)) {
                    const enemyAngle = Math.atan2(ey, ex);
                    let angleDiff = Math.abs(enemyAngle - baseAngle);
                    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
                    if (angleDiff <= (slashArc * 0.55)) {
                        enemy.hp -= totalDamage;
                        // Heavy kinetic pushback
                        enemy.x += dir.x * 32;
                        enemy.y += dir.y * 32;
                        this.addSpark(enemy.x, enemy.y, '#ff9100', 14);
                        if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                    }
                }
            }
            this.addSpark(this.pos.x + dir.x * 18, this.pos.y + dir.y * 18, '#ff5722', 12);

        } else if (this.charClass === CHARACTER_CLASS.FARMER_GOD) {
            // Cosmic Scythe Reap & Celestial Seeds: Massive reality sweep
            this.attackSwing = {
                type: 'FARMER_REAP',
                x: this.pos.x,
                y: this.pos.y,
                angle: baseAngle,
                range: 48,
                arc: Math.PI * 1.5,
                timer: 0.24,
                maxTimer: 0.24
            };

            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const dist = Math.hypot(enemy.x - this.pos.x, enemy.y - this.pos.y);
                if (dist <= 50) {
                    enemy.hp -= 90;
                    enemy.x += dir.x * 24;
                    enemy.y += dir.y * 24;
                    this.addSpark(enemy.x, enemy.y, '#76ff03', 18);
                    if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                }
            }

            // Seeking star seeds tearing space-time in all directions
            const count = this.hasSkill('farmer_solar_prominence') ? 16 : 8;
            const stepAngle = (Math.PI * 2) / count;
            for (let angle = 0; angle < Math.PI * 2; angle += stepAngle) {
                this.projectiles.push({
                    x: this.pos.x + Math.cos(angle) * 12,
                    y: this.pos.y + Math.sin(angle) * 12,
                    vx: Math.cos(angle) * 320,
                    vy: Math.sin(angle) * 320,
                    damage: 65,
                    life: 0.9,
                    color: '#76ff03',
                    isSeeking: true,
                    radius: 14
                });
            }
            this.addSpark(this.pos.x, this.pos.y, '#ffd700', 24);
        }
    }

    // PARRY / DEFLECTION (Key 'K' / Virtual Button 'B' - Nine Sols timing!)
    performParry() {
        if (this.state === 'ATTACKING') return;
        this.state = 'PARRYING';
        this.stateTimer = this.parryWindow;
        this.isParryActive = true;
        this.addSpark(this.pos.x, this.pos.y, '#ffffff', 6);
    }

    // UNIVERSAL KINETIC DASH (Key 'L' / Virtual Button 'C')
    performDash() {
        if (this.dashCooldown > 0) return false;

        // Energy check: Costs 12 energy; if low, still dashes at 80% speed
        const hasEnergy = this.energy >= 12;
        if (hasEnergy) {
            this.energy -= 12;
        }

        this.dashCooldown = 0.35;
        this.state = 'DASHING';
        this.stateTimer = 0.22;
        this.invulnerableTimer = 0.28; // i-frames

        // Determine dash trajectory from active input or current facing
        let dx = this.facing.x;
        let dy = this.facing.y;
        if (this.input && (this.input.x !== 0 || this.input.y !== 0)) {
            const inputLen = this.input.length();
            if (inputLen > 0.1) {
                dx = this.input.x / inputLen;
                dy = this.input.y / inputLen;
            }
        }

        // Distinct speed and effects per class
        let dashSpeed = 430;
        let sparkColor = '#ffaa00';

        if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
            dashSpeed = hasEnergy ? 440 : 360;
            if (this.hasSkill('warrior_kinetic_overdrive')) {
                dashSpeed = hasEnergy ? 560 : 450;
            }
            sparkColor = '#ff6d00';
            this.addSpark(this.pos.x, this.pos.y, sparkColor, 16);
            this.addSpark(this.pos.x - dx * 10, this.pos.y - dy * 10, '#ffffff', 8);
        } else if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
            dashSpeed = hasEnergy ? 470 : 380;
            if (this.hasSkill('mage_chrono_step')) {
                // Instant Quantum Blink Teleport
                this.pos.x += dx * 52;
                this.pos.y += dy * 52;
                this.invulnerableTimer = 0.40;
                dashSpeed = 300;
            }
            sparkColor = '#00e5ff';
            this.addSpark(this.pos.x, this.pos.y, sparkColor, 18);
            this.addSpark(this.pos.x - dx * 8, this.pos.y - dy * 8, '#e040fb', 10);
        } else if (this.charClass === CHARACTER_CLASS.FARMER_GOD) {
            dashSpeed = hasEnergy ? 520 : 420;
            sparkColor = '#76ff03';
            this.addSpark(this.pos.x, this.pos.y, sparkColor, 20);
            this.addSpark(this.pos.x, this.pos.y, '#ffd700', 12);
        }

        this.vel.set(dx * dashSpeed, dy * dashSpeed);
        this.dashTrail.push({
            x: this.pos.x,
            y: this.pos.y,
            charClass: this.charClass,
            cardinalFacing: this.cardinalFacing || 'DOWN',
            alpha: 0.8
        });

        return true;
    }

    // ACTIVE CLASS ABILITY / ULTIMATE (Key 'U' / Virtual Button 'SP')
    performClassAbility(enemies = [], map = null) {
        if (this.abilityCooldowns[0] > 0) return false;

        const dir = (this.facing && typeof this.facing.clone === 'function') 
            ? this.facing.clone().normalize() 
            : new Vector2(this.facing ? this.facing.x : 0, this.facing ? this.facing.y : 1).normalize();

        if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
            // Whirlwind Strike
            const cost = 24;
            if (this.energy < cost) return false;
            this.energy -= cost;
            this.abilityCooldowns[0] = 3.5;
            this.state = 'ATTACKING';
            this.stateTimer = 0.36;

            const baseDmg = this.hasSkill('warrior_whirlwind_strike') ? 85 : 55;
            const radius = this.hasSkill('warrior_whirlwind_strike') ? 54 : 40;

            this.attackSwing = {
                type: 'WARRIOR_WHIRLWIND',
                x: this.pos.x,
                y: this.pos.y,
                angle: 0,
                range: radius,
                timer: 0.36,
                maxTimer: 0.36
            };

            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const d = Math.hypot(enemy.x - this.pos.x, enemy.y - this.pos.y);
                if (d <= radius) {
                    enemy.hp -= baseDmg;
                    const knockAngle = Math.atan2(enemy.y - this.pos.y, enemy.x - this.pos.x);
                    enemy.x += Math.cos(knockAngle) * 45;
                    enemy.y += Math.sin(knockAngle) * 45;
                    this.addSpark(enemy.x, enemy.y, '#ff3d00', 16);
                    if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                }
            }
            return { type: 'WHIRLWIND', damage: baseDmg };

        } else if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
            // Graviton Singularity Vortex
            const cost = 30;
            if (this.energy < cost) return false;
            this.energy -= cost;
            this.abilityCooldowns[0] = 4.5;
            this.state = 'ATTACKING';
            this.stateTimer = 0.28;

            const targetX = this.pos.x + dir.x * 65;
            const targetY = this.pos.y + dir.y * 65;

            this.activeVortices.push({
                x: targetX,
                y: targetY,
                life: 2.2,
                maxLife: 2.2,
                damage: this.hasSkill('mage_graviton_singularity') ? 120 : 75
            });
            this.addSpark(targetX, targetY, '#00e5ff', 20);
            return { type: 'SINGULARITY', x: targetX, y: targetY };

        } else if (this.charClass === CHARACTER_CLASS.FARMER_GOD) {
            // Gaia Cataclysm Primordial Root Burst
            const cost = 35;
            if (this.energy < cost) return false;
            this.energy -= cost;
            this.abilityCooldowns[0] = 4.0;
            this.state = 'ATTACKING';
            this.stateTimer = 0.35;

            this.attackSwing = {
                type: 'GAIA_CATACLYSM',
                x: this.pos.x,
                y: this.pos.y,
                angle: 0,
                range: 75,
                timer: 0.35,
                maxTimer: 0.35
            };

            const rootDmg = this.hasSkill('farmer_gaia_cataclysm') ? 150 : 90;
            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const d = Math.hypot(enemy.x - this.pos.x, enemy.y - this.pos.y);
                if (d <= 95) {
                    enemy.hp -= rootDmg;
                    this.addSpark(enemy.x, enemy.y, '#76ff03', 20);
                    if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                }
            }
            this.addSpark(this.pos.x, this.pos.y, '#ffd700', 30);
            return { type: 'GAIA', damage: rootDmg };
        }

        return false;
    }

    // EXP & LEVEL PROGRESSION
    gainExp(amount) {
        this.exp += amount;
        let leveledUp = false;
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.skillPoints++;
            this.expToNext = Math.floor(100 * Math.pow(1.35, this.level - 1));
            leveledUp = true;

            // Stat growth per class
            if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
                this.maxHp += 20;
                this.hp = this.maxHp;
                this.maxEnergy += 10;
                this.energy = this.maxEnergy;
            } else if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
                this.maxHp += 12;
                this.hp = this.maxHp;
                this.maxEnergy += 25;
                this.energy = this.maxEnergy;
            } else if (this.charClass === CHARACTER_CLASS.FARMER_GOD) {
                this.maxHp += 100;
                this.hp = this.maxHp;
                this.maxEnergy += 100;
                this.energy = this.maxEnergy;
            }
            this.addSpark(this.pos.x, this.pos.y, '#ffd700', 30);
        }
        return leveledUp;
    }

    unlockSkill(skillId) {
        const tree = CLASS_SKILL_TREES[this.charClass] || [];
        const skill = tree.find(s => s.id === skillId);
        if (!skill) return false;
        if (this.unlockedSkills[skillId]) return false;
        if (skill.req && !this.unlockedSkills[skill.req]) return false;
        if (this.skillPoints < skill.cost) return false;

        this.skillPoints -= skill.cost;
        this.unlockedSkills[skillId] = true;

        // Apply immediate passives
        if (skillId === 'warrior_tungsten_bastion') {
            this.maxHp += 40;
            this.hp = Math.min(this.maxHp, this.hp + 40);
        } else if (skillId === 'mage_quantum_flux') {
            this.maxEnergy += 50;
            this.energy = Math.min(this.maxEnergy, this.energy + 50);
        }

        this.addSpark(this.pos.x, this.pos.y, '#00e5ff', 24);
        return true;
    }

    hasSkill(skillId) {
        return !!this.unlockedSkills[skillId];
    }

    // DEFENSIVE / MOBILITY SKILL (Aliases & Secondary)
    specialSkill() {
        return this.performDash();
    }

    // Aliases for skills and dash (Virtual Button 'C')
    performSkill(enemies = []) {
        return this.performClassAbility(enemies) || this.performDash();
    }

    takeDamage(amount, isParryable = true) {
        if (this.invulnerableTimer > 0) return { parried: false, damageTaken: 0 };

        // Check if player executed a clean parry during the active window
        if (this.isParryActive && isParryable) {
            this.parrySuccessTimer = 0.3;
            this.invulnerableTimer = 0.4;
            this.energy = Math.min(this.maxEnergy, this.energy + 30);
            this.addSpark(this.pos.x, this.pos.y, '#00e5ff', 25);
            let reflectDamage = 0;
            if (this.hasSkill('warrior_tungsten_bastion')) {
                reflectDamage = Math.floor(amount * 0.5);
                this.addSpark(this.pos.x, this.pos.y, '#ffd54f', 20);
            }
            return { parried: true, damageTaken: 0, reflectDamage };
        }

        // Hit confirmed
        this.hp = Math.max(0, this.hp - amount);
        this.invulnerableTimer = 0.5; // i-frames
        this.state = 'HURT';
        this.stateTimer = 0.2;
        this.addSpark(this.pos.x, this.pos.y, '#ff1744', 10);
        return { parried: false, damageTaken: amount };
    }

    onEnemyDefeated(enemy) {
        // Collect ALU world coin fragments & grant EXP
        let loot = enemy.isBoss ? 50 : 8;
        if (this.hasSkill('farmer_bountiful_earth')) loot *= 4;
        this.coinsCollected += loot;

        const expGain = enemy.isBoss ? 500 : 35;
        const leveledUp = this.gainExp(expGain);

        this.addSpark(enemy.x, enemy.y, '#ffd700', 18);
        return { coins: loot, exp: expGain, leveledUp };
    }

    addSpark(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 40 + Math.random() * 90;
            this.sparks.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color,
                life: 0.2 + Math.random() * 0.25
            });
        }
    }
}

if (typeof window !== 'undefined') {
    window.CHARACTER_CLASS = CHARACTER_CLASS;
    window.Character = Character;
    window.CLASS_SKILL_TREES = CLASS_SKILL_TREES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHARACTER_CLASS, Character, CLASS_SKILL_TREES };
}
