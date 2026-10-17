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

            // Bolt 1
            this.projectiles.push({
                x: this.pos.x + dir.x * 10 + perpX,
                y: this.pos.y + dir.y * 10 + perpY,
                vx: dir.x * 320,
                vy: dir.y * 320,
                damage: 24,
                life: 1.1,
                color: '#00ffff',
                radius: 12,
                splashRadius: 28
            });
            // Bolt 2
            this.projectiles.push({
                x: this.pos.x + dir.x * 10 - perpX,
                y: this.pos.y + dir.y * 10 - perpY,
                vx: dir.x * 310,
                vy: dir.y * 310,
                damage: 24,
                life: 1.1,
                color: '#e040fb',
                radius: 12,
                splashRadius: 28
            });
            this.addSpark(this.pos.x + dir.x * 12, this.pos.y + dir.y * 12, '#00e5ff', 8);

        } else if (this.charClass === CHARACTER_CLASS.SUPER_SOLDIER) {
            // Ultrasonic Broadsword Heavy Cleave: Wide 140° frontal arc slash
            const currentSpeed = this.vel.length();
            const momentumBonus = Math.floor(currentSpeed * 0.18);
            const totalDamage = 34 + momentumBonus;

            this.attackSwing = {
                type: 'WARRIOR_SLASH',
                x: this.pos.x,
                y: this.pos.y,
                angle: baseAngle,
                range: 36,
                arc: Math.PI * 0.8,
                timer: 0.24,
                maxTimer: 0.24
            };

            // Hit detection in frontal cone arc
            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const ex = enemy.x - this.pos.x;
                const ey = enemy.y - this.pos.y;
                const dist = Math.hypot(ex, ey);
                if (dist <= 38) {
                    const enemyAngle = Math.atan2(ey, ex);
                    let angleDiff = Math.abs(enemyAngle - baseAngle);
                    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
                    if (angleDiff <= Math.PI * 0.45) {
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
            // Cosmic Scythe Reap & Celestial Seeds: Massive 270° reality sweep
            this.attackSwing = {
                type: 'FARMER_REAP',
                x: this.pos.x,
                y: this.pos.y,
                angle: baseAngle,
                range: 46,
                arc: Math.PI * 1.5,
                timer: 0.24,
                maxTimer: 0.24
            };

            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const dist = Math.hypot(enemy.x - this.pos.x, enemy.y - this.pos.y);
                if (dist <= 48) {
                    enemy.hp -= 85;
                    enemy.x += dir.x * 24;
                    enemy.y += dir.y * 24;
                    this.addSpark(enemy.x, enemy.y, '#76ff03', 18);
                    if (enemy.hp <= 0) this.onEnemyDefeated(enemy);
                }
            }

            // 8 Celestial seeking star seeds tearing space-time in all directions
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
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
            sparkColor = '#ff6d00';
            this.addSpark(this.pos.x, this.pos.y, sparkColor, 16);
            this.addSpark(this.pos.x - dx * 10, this.pos.y - dy * 10, '#ffffff', 8);
        } else if (this.charClass === CHARACTER_CLASS.TECHNO_MAGE) {
            dashSpeed = hasEnergy ? 470 : 380;
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

    // DEFENSIVE / MOBILITY SKILL (Aliases & Secondary)
    specialSkill() {
        return this.performDash();
    }

    // Aliases for skills and dash (Virtual Button 'C')
    performSkill(enemies = []) {
        return this.performDash();
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
