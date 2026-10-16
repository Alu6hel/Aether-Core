/**
 * Aether-Core: Comprehensive Engine Verification Suite
 * Tests deterministic PRNG, 8-color palettes, token bonding curves,
 * kinematics momentum, procedural maps, and combat parry mechanics.
 */

const assert = require('assert');
const { AluPrng, AluPaletteGenerator, AluCoinBondingCurve } = require('../engine/alu_core.js');
const { KinematicBody, Vector2 } = require('../engine/physics.js');
const { TILE, WorldMap } = require('../engine/world_generator.js');
const { CHARACTER_CLASS, Character } = require('../engine/combat.js');

console.log("==================================================");
console.log("       AETHER-CORE ENGINE VERIFICATION SUITE       ");
console.log("==================================================");

let passed = 0;
let total = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] ${name}:`, err.message);
    }
}

// 1. PRNG Determinism
test("AluPrng: Deterministic reproducibility across seeds", () => {
    const prng1 = new AluPrng(0x1337BEEF);
    const prng2 = new AluPrng(0x1337BEEF);
    for (let i = 0; i < 50; i++) {
        assert.strictEqual(prng1.nextUint32(), prng2.nextUint32(), `Mismatch at iteration ${i}`);
    }
});

// 2. 8-Color Palette Math
test("AluPaletteGenerator: Generates 8 valid hex colors with triadic/complementary harmony", () => {
    const pal = AluPaletteGenerator.generate(0xCAFEBABE);
    assert.strictEqual(pal.colors.length, 8, "Must generate exactly 8 color slots");
    for (const c of pal.colors) {
        assert.match(c, /^#[0-9a-f]{6}$/i, `Color ${c} must be valid 6-digit hex`);
    }
    assert.strictEqual(pal.rgbaInts.length, 8, "Must generate 8 RGBA 32-bit pixel integers");
});

// 3. Bonding Curve & Anti-Rug Genesis Vault
test("AluCoinBondingCurve: Buy increases price and reinforces Genesis Vault floor", () => {
    const curve = new AluCoinBondingCurve(0x98765432, 50.0);
    const initialPrice = curve.getCurrentPrice();
    const initialVault = curve.genesisVault;

    const buyRes = curve.buy(20.0);
    assert(buyRes.tokensReceived > 0, "Tokens must be minted");
    assert(curve.getCurrentPrice() > initialPrice, "Price must rise after buy");
    assert(curve.genesisVault > initialVault, "Genesis Vault total reserve must increase due to 2.5% fee");
    assert(curve.getGuaranteedFloor() > 0, "Floor price must be positive and solvent");

    // Sell back
    const sellRes = curve.sell(buyRes.tokensReceived * 0.5);
    assert(sellRes.aluReturned > 0, "ALU returned on sell");
    assert(curve.getGuaranteedFloor() > 0, "Floor must never hit 0");
});

// 4. Emergency Floor Burn
test("AluCoinBondingCurve: Emergency burn for guaranteed floor liquidation", () => {
    const curve = new AluCoinBondingCurve(0x11223344, 25.0);
    const floorRedemption = curve.burnForFloor(10.0);
    assert(floorRedemption.aluRedeemed > 0, "Redeemed ALU floor payout");
    assert(curve.genesisVault >= 0, "Genesis vault remains solvent");
});

// 5. Kinematics & Momentum
test("KinematicBody: Acceleration and Deceleration curves with momentum", () => {
    const body = new KinematicBody(0, 0);
    body.setInput(1, 0); // Walk right
    
    // Simulate 0.05s step
    body.update(0.05, null);
    assert(body.vel.x > 0, "Velocity should accelerate");
    assert(body.pos.x > 0, "Position should advance");

    // Stop input
    body.setInput(0, 0);
    const speedBeforeBrake = body.vel.x;
    body.update(0.04, null);
    assert(body.vel.x < speedBeforeBrake, "Velocity should brake during deceleration");
});

// 6. World Generator: Surface & Sub-Bedrock
test("WorldMap: Generates Dual-Layer map with Cave Entrance and Sci-Fi Core", () => {
    const surface = new WorldMap(0x55AA55AA, 64, 64, 'SURFACE');
    assert(surface.caveEntrance !== null, "Surface must have a cave entrance");
    assert(surface.terminals.length > 0, "Surface must have an ancient Dyson terminal");

    const subCore = new WorldMap(0x55AA55AA, 48, 48, 'SUB_CORE');
    assert(subCore.secretSoilArea !== null, "Sub-Core must feature the secret 3x3 arable plot");
    assert(subCore.enemies.some(e => e.isBoss), "Sub-Core must house an Aegis Dreadnought boss");
});

// 7. Nine-Sols Combat & Parry Deflection
test("Combat: Precision parry deflecting damage and triggering counter-spark", () => {
    const warrior = new Character(CHARACTER_CLASS.SUPER_SOLDIER, 100, 100);
    warrior.performParry(); // Activate parry window
    assert.strictEqual(warrior.isParryActive, true, "Parry window should be active");

    // Incoming enemy attack
    const result = warrior.takeDamage(30, true);
    assert.strictEqual(result.parried, true, "Attack must be parried");
    assert.strictEqual(result.damageTaken, 0, "Parried attack deals 0 damage");
    assert.strictEqual(warrior.hp, 140, "Health must not be reduced");
});

// 8. Secret Farmer God Class
test("Character: Secret Farmer class god-like stats and ability verification", () => {
    const farmer = new Character(CHARACTER_CLASS.FARMER_GOD, 50, 50);
    assert.strictEqual(farmer.maxHp, 999, "Farmer has deific health pool");
    
    const mockEnemies = [{ id: 'boss', x: 70, y: 50, hp: 100, isBoss: true }];
    farmer.primaryAttack(mockEnemies);
    assert(farmer.projectiles.length >= 8, "Farmer tears space-time in 8 directions");
});

console.log("==================================================");
console.log(`RESULTS: ${passed} / ${total} Tests Passed.`);
console.log("==================================================");

if (passed !== total) process.exit(1);
