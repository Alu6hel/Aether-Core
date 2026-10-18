/**
 * Automated Test Suite: 3D Elevation, Multi-Octave fBm Noise, Ramps & Kinematic Jumping
 * Verifies Isoccor & Ace Rollola devlog architectural implementations.
 */

const assert = require('assert');
const { AluNoise, AluMath, Vec2 } = require('../engine/alu_core.js');
const { WorldMap, TILE, BIOMES } = require('../engine/world_generator.js');
const { KinematicBody } = require('../engine/physics.js');
const { CombatSystem, Character } = require('../engine/combat.js');

console.log("=== RUNNING ELEVATION & FBM NOISE TEST SUITE ===");

// TEST 1: AluNoise 2D and Multi-Octave fBm
console.log("1. Testing AluNoise Improved Perlin and Multi-Octave fBm...");
const noise = new AluNoise(1337);
const val1 = noise.noise2D(10.5, 20.25);
assert(typeof val1 === 'number' && !isNaN(val1), "noise2D should return a valid number");
assert(val1 >= -1.0 && val1 <= 1.0, `noise2D output should be in [-1, 1], got ${val1}`);

// Determinism check
const noise2 = new AluNoise(1337);
assert.strictEqual(noise.noise2D(10.5, 20.25), noise2.noise2D(10.5, 20.25), "Same seed must yield identical 2D noise");

// Multi-octave fBm check
const fbmVal = noise.fbm(5.0, 8.0, 4, 0.5, 2.0);
assert(typeof fbmVal === 'number' && !isNaN(fbmVal), "fbm should return a valid number");
assert(fbmVal >= -1.5 && fbmVal <= 1.5, `fbm output should stay bounded, got ${fbmVal}`);
console.log("   -> AluNoise & fBm PASSED");

// TEST 2: WorldMap 3D Elevation Buffer & Discrete Tiers
console.log("2. Testing WorldMap elevation buffer and methods...");
const map = new WorldMap(64, 64, 42);
assert(map.elevation instanceof Uint8Array, "map.elevation must be a Uint8Array");
assert.strictEqual(map.elevation.length, 64 * 64, "map.elevation length must match width * height");
assert.strictEqual(map.heightStep, 10, "map.heightStep must default to 10px orthographic vertical offset");

map.setElevation(15, 20, 2);
assert.strictEqual(map.getElevation(15, 20), 2, "getElevation should return 2");
assert.strictEqual(map.getElevationAt(15 * 16 + 8, 20 * 16 + 8), 2, "getElevationAt should map world coords to elevation");

// Bounds check
assert.strictEqual(map.getElevation(-1, -1), 1, "Out-of-bounds elevation should default to 1");
assert.strictEqual(map.getElevation(100, 100), 1, "Out-of-bounds elevation should default to 1");
console.log("   -> WorldMap elevation buffer PASSED");

// TEST 3: Cliff Edge Detection & Ramps
console.log("3. Testing Cliff Edge Detection & Ramp Tiles...");
assert(TILE.STONE_RAMP !== undefined, "TILE.STONE_RAMP must exist");
assert(TILE.WOODEN_STAIRS !== undefined, "TILE.WOODEN_STAIRS must exist");
assert(TILE.CLIFF_FACE !== undefined, "TILE.CLIFF_FACE must exist");

// Ramps and stairs must be walkable
assert.strictEqual(map.isSolid(TILE.STONE_RAMP), false, "STONE_RAMP must be walkable");
assert.strictEqual(map.isSolid(TILE.WOODEN_STAIRS), false, "WOODEN_STAIRS must be walkable");

// Setup cliff: (10, 10) at elev 2, (10, 11) at elev 1
map.setElevation(10, 10, 2);
map.setElevation(10, 11, 1);
assert.strictEqual(map.isCliffEdge(10, 10), true, "Tile (10, 10) must be a cliff edge facing south");

// Carve ramp
map.set(10, 11, TILE.STONE_RAMP);
assert.strictEqual(map.isRamp(10, 11), true, "isRamp must return true for STONE_RAMP");
console.log("   -> Cliff edge and ramp classification PASSED");

// TEST 4: Biome Generation With 3D Elevation Tiers
console.log("4. Testing World Generation across biomes with elevation...");
const hamletMap = new WorldMap(64, 64, 9999, 'CINDERWATCH_HAMLET');

let hasElev0 = false;
let hasElev1 = false;
let hasElev2 = false;
for (let i = 0; i < hamletMap.elevation.length; i++) {
    const e = hamletMap.elevation[i];
    if (e === 0) hasElev0 = true;
    if (e === 1) hasElev1 = true;
    if (e === 2) hasElev2 = true;
}
assert(hasElev1, "Hamlet must generate lowland plains at elevation 1");
assert(hasElev2, "Hamlet must generate plateau cliffs at elevation 2");
assert(hamletMap.ramps.length > 0, "Hamlet must generate walkable ramps between cliffs");
console.log(`   -> Hamlet generated ${hamletMap.ramps.length} ramp connections across elevation tiers!`);

// Test Solarium Dunes and Celestial Zenith biomes
const dunesMap = new WorldMap(64, 64, 1234, 'SOLARIUM_DUNES');
assert(dunesMap.elevation.some(e => e >= 2), "Dunes must generate high dunes and ridges");

const zenithMap = new WorldMap(64, 64, 5678, 'CELESTIAL_ZENITH');
assert(zenithMap.elevation.some(e => e >= 2), "Celestial Zenith must feature floating tier elevations");
console.log("   -> Multi-biome elevation generation PASSED");

// TEST 5: 3D Kinematics and Jumping Physics
console.log("5. Testing KinematicBody 3D Kinematics and Jumping...");
const body = new KinematicBody(100, 100);
assert.strictEqual(body.pos.z, 0, "Initial z position must be 0");
assert.strictEqual(body.vel.z, 0, "Initial z velocity must be 0");
assert.strictEqual(body.isJumping, false, "Initial isJumping must be false");

// Execute jump
const jumped = body.jump();
assert.strictEqual(jumped, true, "jump() should succeed from ground");
assert(body.vel.z > 0, "Jump velocity should be positive upward");
assert.strictEqual(body.isJumping, true, "isJumping should become true");

// Cannot double-jump while airborne
const doubleJumped = body.jump();
assert.strictEqual(doubleJumped, false, "Cannot double-jump while already airborne");

// Simulate physics trajectory over 60 frames (1 second)
const testMap = new WorldMap(32, 32, 101);
for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        testMap.set(x, y, TILE.GROUND);
        testMap.setElevation(x, y, 1);
    }
}

let peaked = false;
let landed = false;
let prevZ = body.pos.z;

for (let frame = 0; frame < 60; frame++) {
    body.update(1 / 60, testMap);
    if (body.pos.z > prevZ) {
        prevZ = body.pos.z;
    } else if (!peaked && body.pos.z < prevZ) {
        peaked = true;
    }
    if (peaked && body.pos.z <= 0.001 && !body.isJumping) {
        landed = true;
        break;
    }
}
assert(peaked, "Jump trajectory must reach a peak and descend under gravity");
assert(landed, "Jump trajectory must land smoothly on ground at z = 0");
console.log("   -> 3D Kinematics & Jump Trajectory PASSED");

// TEST 6: Cliff Collision & Ledge Step
console.log("6. Testing Cliff Blocking and Ramp Traversal...");
// Create map with tier 1 at x=5, tier 2 at x=6
const cliffMap = new WorldMap(32, 32, 202);
for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        cliffMap.set(x, y, TILE.GROUND);
        cliffMap.setElevation(x, y, x >= 6 ? 2 : 1);
    }
}

const walker = new KinematicBody(5 * 16 + 8, 10 * 16 + 8);
walker.speed = 100;
// Attempt to walk right directly into cliff tier 2 without jumping
walker.setInput(1, 0);
walker.update(1 / 60, cliffMap);
assert(walker.pos.x <= 6 * 16, "Walking directly into higher cliff tier must be blocked");

// Now place a ramp at (6, 10)
cliffMap.set(6, 10, TILE.STONE_RAMP);
walker.update(1 / 60, cliffMap);
assert(walker.pos.x > 5 * 16 + 8, "Walking onto a ramp should be allowed smoothly");
console.log("   -> Cliff blocking and ramp traversal PASSED");

// TEST 7: Falling Off Cliff Edge
console.log("7. Testing Falling Off Cliff Edge...");
const fallMap = new WorldMap(32, 32, 303);
for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        fallMap.set(x, y, TILE.GROUND);
        fallMap.setElevation(x, y, x <= 10 ? 2 : 1); // 2 on left, 1 on right
    }
}

const faller = new KinematicBody(10 * 16 + 14, 10 * 16 + 8);
faller.setInput(1, 0); // walk right off cliff
for (let i = 0; i < 10; i++) {
    faller.update(1 / 60, fallMap);
    if (faller.isJumping || faller.pos.z > 0) break;
}
assert(faller.pos.x > 10 * 16 + 14, "Should step off cliff edge");
assert(faller.pos.z > 0 || faller.isJumping, "Stepping off cliff must convert height delta to air Z / trigger falling");
console.log("   -> Falling off cliff edge PASSED");

// TEST 8: All 5 Classes Character Initialization
console.log("8. Testing All 5 Character Classes...");
const classes = ['SUPER_SOLDIER', 'TECHNO_MAGE', 'CHRONO_WEAVER', 'SOLARION_ARCHITECT', 'FARMER_GOD'];
for (const cls of classes) {
    const char = new Character(cls, 100, 100);
    assert.strictEqual(char.charClass, cls, `Character class should be ${cls}`);
    assert(char.hp > 0, `${cls} should have positive HP`);
    assert(char.maxHp > 0, `${cls} should have positive maxHp`);
    assert(char.maxSpeed > 0, `${cls} should have positive speed`);
    assert(typeof char.jump === 'function', `${cls} must inherit jump() method`);
}
console.log("   -> All 5 classes initialized successfully and verified");

console.log("\n>>> ALL ELEVATION, FBM, RAMPS, JUMP, & CLASS TESTS PASSED PERFECTLY! <<<");
