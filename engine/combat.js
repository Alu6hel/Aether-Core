/**
 * Aether-Core: Character Classes, Nine-Sols Tactical Combat & Abilities
 * 
 * Implements precision parrying, momentum-scaled strikes,
 * and the secret god-like Farmer reality-warping mechanics.
 */

if (typeof require !== 'undefined') {
    var { KinematicBody, Vector2 } = require('./physics.js');
}

const CHARACTER_CLASS = {
    TECHNO_MAGE: 'TECHNO_MAGE',
    SUPER_SOLDIER: 'SUPER_SOLDIER',
    FARMER_GOD: 'FARMER_GOD'
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
        
        // Combat & Animation States
        this.state = 'IDLE';     // IDLE, MOVING, ATTACKING, PARRYING, DASHING, HURT
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.abilityCooldowns = [0, 0, 0];
        this.invulnerableTimer = 0;

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
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
        for (let i = 0; i < this.abilityCooldowns.length; i++) {
            if (this.abilityCooldowns[i] > 0) this.abilityCooldowns[i] -= dt;
        }

        // Energy passive regen
        this.energy = Math.min(this.maxEnergy, this.energy + 15 * dt);

        // State machine timers
        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = this.isMoving ? 'MOVING' : 'IDLE';
                this.isParryActive = false;
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Check hit against enemies
            for (const enemy of enemies) {
                if (enemy.hp > 0 && Math.hypot(p.x - enemy.x, p.y - enemy.y) < 16) {
                    enemy.hp -= p.damage;
                    this.addSpark(p.x, p.y, '#ffff00', 8);
                    p.life = 0;
                    if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                    break;
                }
            }

            if (p.life <= 0) this.projectiles.splice(i, 1);
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
        this.stateTimer = 0.22;
        this.attackCooldown = 0.28;

        if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
            // Photon Dart homing plasma pulse
            const dir = this.facing.clone().normalize();
            this.projectiles.push({
                x: this.pos.x + dir.x * 10,
                y: this.pos.y + dir.y * 10,
                vx: dir.x * 260,
                vy: dir.y * 260,
                damage: 22,
                life: 1.2,
                color: '#00ffff'
            });
        } else if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
            // Ultrasonic Momentum Slash: Damage scales with player velocity!
            const currentSpeed = this.vel.length();
            const momentumBonus = Math.floor(currentSpeed * 0.15);
            const totalDamage = 28 + momentumBonus;

            // Strike in arc in front
            const hitBoxCenter = {
                x: this.pos.x + this.facing.x * 16,
                y: this.pos.y + this.facing.y * 16
            };
            this.addSpark(hitBoxCenter.x, hitBoxCenter.y, '#ff4400', 12);

            for (const enemy of enemies) {
                if (enemy.hp > 0 && Math.hypot(hitBoxCenter.x - enemy.x, hitBoxCenter.y - enemy.y) < 22) {
                    enemy.hp -= totalDamage;
                    // Pushback
                    enemy.x += this.facing.x * 24;
                    enemy.y += this.facing.y * 24;
                    if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                }
            }
        } else if (this.charClass === CHARACTER_CLASS.FARMER_GOD) {
            // Tillage of Space-Time: Tears bedrock apart in a massive shockwave
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                this.projectiles.push({
                    x: this.pos.x,
                    y: this.pos.y,
                    vx: Math.cos(angle) * 320,
                    vy: Math.sin(angle) * 320,
                    damage: 99,
                    life: 0.8,
                    color: '#76ff03'
                });
            }
            this.addSpark(this.pos.x, this.pos.y, '#76ff03', 30);
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

    // DEFENSIVE / MOBILITY SKILL (Key 'L' / Virtual Button 'R')
    specialSkill() {
        if (this.abilityCooldowns[0] > 0 || this.energy < 25) return;
        this.energy -= 25;
        this.abilityCooldowns[0] = 2.0;

        if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
            // Singularity Surge: Spawns pulling magnetic vortex
            this.activeVortices.push({
                x: this.pos.x + this.facing.x * 48,
                y: this.pos.y + this.facing.y * 48,
                life: 2.2
            });
        } else if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
            // Thruster Dash: 300px burst with invulnerability frames
            this.state = 'DASHING';
            this.stateTimer = 0.18;
            this.invulnerableTimer = 0.25;
            this.vel.set(this.facing.x * 380, this.facing.y * 380);
            this.addSpark(this.pos.x, this.pos.y, '#ffaa00', 16);
        } else if (this.charClass === CHARACTER_CLASS.FARMER_GOD) {
            // Sprout of Annihilation & Bountiful Harvest
            this.invulnerableTimer = 3.0;
            this.hp = this.maxHp;
            for (let i = 0; i < 16; i++) {
                this.addSpark(this.pos.x + (Math.random()-0.5)*80, this.pos.y + (Math.random()-0.5)*80, '#00e676', 10);
            }
        }
    }

    // Aliases for skills and dash (Virtual Button 'C')
    performSkill(enemies = []) {
        return this.specialSkill(enemies);
    }

    performDash() {
        return this.specialSkill();
    }

    takeDamage(amount, isParryable = true) {
        if (this.invulnerableTimer > 0) return { parried: false, damageTaken: 0 };

        // Check if player executed a clean parry during the active window
        if (this.isParryActive && isParryable) {
            this.parrySuccessTimer = 0.3;
            this.invulnerableTimer = 0.4;
            this.energy = Math.min(this.maxEnergy, this.energy + 30);
            this.addSpark(this.pos.x, this.pos.y, '#00e5ff', 25);
            return { parried: true, damageTaken: 0 };
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
        // Collect ALU world coin fragments
        const loot = enemy.isBoss ? 50 : 8;
        this.coinsCollected += loot;
        this.addSpark(enemy.x, enemy.y, '#ffd700', 18);
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHARACTER_CLASS, Character };
}
