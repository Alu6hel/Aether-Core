// tests/test_dash_and_attacks.js
// Dedicated automated test suite verifying:
// 1. Universal Dash (propulsion, i-frames, energy consumption, afterimage trail)
// 2. 3 Distinct Class Attacks (Warrior Cleave, Mage Dual Plasma, Farmer Cosmic Reap)
// 3. World Items, Quantum Supply Pods (Chests), and Foraging Sparkles

const { KinematicBody, Vector2 } = require('../engine/physics.js');
const { Character, CHARACTER_CLASS } = require('../engine/combat.js');
const { WorldMap, TILE } = require('../engine/world_generator.js');

function assert(condition, message) {
    if (!condition) {
        console.error(`[FAIL] ${message}`);
        process.exit(1);
    } else {
        console.log(`[PASS] ${message}`);
    }
}

console.log("==================================================");
console.log("   DASH, 3 CLASS ATTACKS & ITEM DISCOVERY TEST    ");
console.log("==================================================");

// ---------------------------------------------------------------------
// TEST 1: Universal Dash Mechanics Across All 3 Classes
// ---------------------------------------------------------------------
console.log("\n--- TEST 1: Universal Dash Mechanics ---");
const classes = [CHARACTER_CLASS.SUPER_SOLDIER, CHARACTER_CLASS.TECHNO_MAGE, CHARACTER_CLASS.FARMER_GOD];

for (const charClass of classes) {
    const p = new Character(charClass);
    p.pos = new Vector2(100, 100);
    p.facing = new Vector2(1, 0);
    p.cardinalFacing = 'RIGHT';

    const initialEnergy = p.energy;
    const initialPos = { x: p.pos.x, y: p.pos.y };

    // Trigger universal dash
    const dashSuccess = p.performDash();
    assert(dashSuccess === true, `${charClass}: performDash() returned true`);
    assert(p.state === 'DASHING', `${charClass}: State set to DASHING`);
    assert(p.invulnerableTimer > 0, `${charClass}: invulnerableTimer active (${p.invulnerableTimer.toFixed(2)}s)`);
    assert(p.stateTimer > 0, `${charClass}: stateTimer active (${p.stateTimer.toFixed(2)}s)`);
    assert(p.energy < initialEnergy, `${charClass}: Energy consumed for dash`);
    assert(Math.hypot(p.vel.x, p.vel.y) >= 440, `${charClass}: Velocity burst >= 440 px/s (actual: ${Math.hypot(p.vel.x, p.vel.y).toFixed(1)})`);
    assert(p.dashTrail && p.dashTrail.length > 0, `${charClass}: Dash afterimage trail generated`);

    // Verify invulnerability during dash
    const dmgResult = p.takeDamage(50, false);
    assert(dmgResult.damageTaken === 0, `${charClass}: Invulnerability frames negated incoming damage`);

    // Simulate physics step (KinematicBody.update) - dash speed must NOT be clamped by walk deceleration
    const mockMap = {
        width: 1000,
        height: 1000,
        isSolid: () => false
    };
    p.update(0.05, mockMap);
    assert(p.pos.x > initialPos.x + 15, `${charClass}: High-speed displacement occurred (dx: ${(p.pos.x - initialPos.x).toFixed(1)}px)`);
}

// ---------------------------------------------------------------------
// TEST 2: 3 Distinct Class Attacks & Visual Telemetries
// ---------------------------------------------------------------------
console.log("\n--- TEST 2: 3 Distinct Class Attacks ---");

// 2.1 Warrior Heavy Cleave Arc
const warrior = new Character(CHARACTER_CLASS.SUPER_SOLDIER);
warrior.pos = new Vector2(100, 100);
warrior.facing = new Vector2(1, 0);
warrior.cardinalFacing = 'RIGHT';
const dummyEnemy = { x: 125, y: 100, hp: 100, maxHp: 100, name: 'Target Dummy' };
const enemies = [dummyEnemy];

warrior.primaryAttack(enemies);
assert(dummyEnemy.hp < 100, `Warrior: Frontal cleave dealt damage (Dummy HP: ${dummyEnemy.hp}/100)`);
assert(warrior.attackSwing !== null, `Warrior: Visual attack swing telemetry generated`);
assert(warrior.attackSwing.type === 'WARRIOR_SLASH', `Warrior: Swing type is WARRIOR_SLASH`);
assert(warrior.attackSwing.arc > 2.0, `Warrior: Broadsword arc width is wide (actual: ${warrior.attackSwing.arc.toFixed(2)} rad)`);

// 2.2 Techno-Mage Dual Homing Plasma Bolts
const mage = new Character(CHARACTER_CLASS.TECHNO_MAGE);
mage.pos = new Vector2(100, 100);
mage.facing = new Vector2(0, -1);
mage.cardinalFacing = 'UP';
const mageDummy = { x: 100, y: 50, hp: 100, maxHp: 100, name: 'Target Dummy' };

mage.primaryAttack([mageDummy]);
assert(mage.projectiles.length === 2, `Techno-Mage: Fired dual plasma bolts (Count: ${mage.projectiles.length})`);
assert(mage.projectiles[0].splashRadius === 28, `Techno-Mage: Projectiles have 28px AoE splash radius`);
assert(mage.attackSwing !== null && mage.attackSwing.type === 'MAGE_PULSE', `Techno-Mage: Electric muzzle pulse telemetry generated`);

// 2.3 Farmer Cosmic Scythe Reap
const farmer = new Character(CHARACTER_CLASS.FARMER_GOD);
farmer.pos = new Vector2(100, 100);
farmer.facing = new Vector2(-1, 0);
farmer.cardinalFacing = 'LEFT';
const farmerDummy = { x: 75, y: 100, hp: 200, maxHp: 200, name: 'Target Dummy' };

farmer.primaryAttack([farmerDummy]);
assert(farmerDummy.hp < 200, `Farmer: Cosmic Scythe dealt massive cleave damage (Dummy HP: ${farmerDummy.hp}/200)`);
assert(farmer.projectiles.length === 8, `Farmer: Discharged 8-directional celestial seed projectiles (Count: ${farmer.projectiles.length})`);
assert(farmer.attackSwing !== null && farmer.attackSwing.type === 'FARMER_REAP', `Farmer: Cosmic scythe reap telemetry generated`);

// ---------------------------------------------------------------------
// TEST 3: World Chests & Foraging Sparkles Generation & Interaction
// ---------------------------------------------------------------------
console.log("\n--- TEST 3: World Chests & Sparkle Discovery ---");
const surfaceWorld = new WorldMap(12345, 64, 64, 'SURFACE');
surfaceWorld.generateSurface();

assert(Array.isArray(surfaceWorld.chests), `Surface: chests array initialized`);
assert(surfaceWorld.chests.length >= 4, `Surface: Generated at least 4 Supply Pods (Actual: ${surfaceWorld.chests.length})`);
assert(Array.isArray(surfaceWorld.sparkles), `Surface: sparkles array initialized`);
assert(surfaceWorld.sparkles.length >= 7, `Surface: Generated at least 7 Foraging Sparkles (Actual: ${surfaceWorld.sparkles.length})`);

// Verify chest properties
const pod = surfaceWorld.chests[0];
assert(pod.x > 0 && pod.y > 0, `Supply Pod has valid coordinates (${pod.x}, ${pod.y})`);
assert(pod.itemId !== undefined, `Supply Pod contains an item: ${pod.itemId}`);
assert(pod.opened === false, `Supply Pod starts unopened`);

// Verify sparkle properties
const sparkle = surfaceWorld.sparkles[0];
assert(sparkle.x > 0 && sparkle.y > 0, `Foraging Sparkle has valid coordinates (${sparkle.x}, ${sparkle.y})`);
assert(sparkle.coins > 0, `Foraging Sparkle awards coins (${sparkle.coins} ALU)`);
assert(sparkle.collected === false, `Foraging Sparkle starts uncollected`);

// Sub-Core chest generation
const subCoreWorld = new WorldMap(12345, 64, 64, 'SUB_CORE');
subCoreWorld.generateSubCore();
assert(subCoreWorld.chests.length >= 3, `Sub-Core: Generated at least 3 Vault Crates (Actual: ${subCoreWorld.chests.length})`);
assert(subCoreWorld.sparkles.length >= 6, `Sub-Core: Generated at least 6 Data Glints (Actual: ${subCoreWorld.sparkles.length})`);

console.log("\n==================================================");
console.log("   RESULTS: All Dash, Attacks & Chest Tests Passed!  ");
console.log("==================================================");
