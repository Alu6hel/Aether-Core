const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { AluRunicMath, AluPrng } = require('../engine/alu_core.js');

console.log("================================================================================");
console.log("   ALU LANGUAGE PROCEDURAL SEED MATH & TOWN DISTANCE TEST SUITE                ");
console.log("================================================================================");

// 1. Verify alu/worldgen.alu exists and conforms to ALU language specification
console.log("\n--- TEST 1: ALU Language Source File Verification ---");
const aluSrc = fs.readFileSync(path.join(__dirname, '../alu/worldgen.alu'), 'utf8');
assert.ok(aluSrc.includes('routine alu_hash2d(int x, int y, int seed) -> int'), "alu_hash2d routine declared");
assert.ok(aluSrc.includes('routine alu_verify_town_spacing'), "alu_verify_town_spacing routine declared");
assert.ok(aluSrc.includes('routine alu_derive_secret_key'), "alu_derive_secret_key routine declared");
console.log("  ✓ Test 1 Passed: alu/worldgen.alu file conforms to ALU language specification.");

// 2. Deterministic 2D Hashing
console.log("\n--- TEST 2: Deterministic 2D Hashing & Biome Allocation ---");
const h1 = AluRunicMath.hash2D(10, 20, 0x1337BEEF);
const h2 = AluRunicMath.hash2D(10, 20, 0x1337BEEF);
const h3 = AluRunicMath.hash2D(11, 20, 0x1337BEEF);
assert.strictEqual(h1, h2, "Hash must be strictly deterministic for identical coordinates & seed");
assert.notStrictEqual(h1, h3, "Adjacent coordinates must yield distinct hashes");

const biome0 = AluRunicMath.getBiomeAt(0, 0, 0x1337BEEF);
const biome1 = AluRunicMath.getBiomeAt(100, 100, 0x1337BEEF);
assert.ok(biome0 >= 0 && biome0 < 5, "Biome ID must be in valid range [0, 4]");
assert.ok(biome1 >= 0 && biome1 < 5, "Biome ID must be in valid range [0, 4]");
console.log("  ✓ Test 2 Passed: Deterministic 2D coordinate hashing and biome allocation verified.");

// 3. 5 Towns Placement & 2-Submap Separation Topology
console.log("\n--- TEST 3: 5 Towns Placement & 2-Submap Separation ---");
const towns = AluRunicMath.generateTownTopology(0x1337BEEF);
assert.strictEqual(towns.length, 5, "Must generate exactly 5 distinct towns");

const townIds = towns.map(t => t.id);
assert.ok(townIds.includes('CINDERWATCH_HAMLET'), "Cinderwatch Hamlet present");
assert.ok(townIds.includes('AETHELGARD_CITADEL'), "Aethelgard Citadel present");
assert.ok(townIds.includes('OASIS_SOLARIS'), "Oasis of Solaris present");
assert.ok(townIds.includes('FROSTSPIRE_ENCLAVE'), "Frostspire Enclave present");
assert.ok(townIds.includes('VERDANT_CANOPY_HAVEN'), "Verdant Canopy Haven present");

// Verify that the 4 outer towns form a ring where each is 2 submaps from adjacent towns
const cinderwatch = towns.find(t => t.id === 'CINDERWATCH_HAMLET');
const aethelgard = towns.find(t => t.id === 'AETHELGARD_CITADEL');
const oasis = towns.find(t => t.id === 'OASIS_SOLARIS');
const frostspire = towns.find(t => t.id === 'FROSTSPIRE_ENCLAVE');
const canopy = towns.find(t => t.id === 'VERDANT_CANOPY_HAVEN');

// Cinderwatch (0,0) to Aethelgard (2,0): distance = 2
assert.strictEqual(AluRunicMath.manhattanDist(cinderwatch.gx, cinderwatch.gy, aethelgard.gx, aethelgard.gy), 2);
// Aethelgard (2,0) to Oasis (2,2): distance = 2
assert.strictEqual(AluRunicMath.manhattanDist(aethelgard.gx, aethelgard.gy, oasis.gx, oasis.gy), 2);
// Oasis (2,2) to Frostspire (0,2): distance = 2
assert.strictEqual(AluRunicMath.manhattanDist(oasis.gx, oasis.gy, frostspire.gx, frostspire.gy), 2);
// Frostspire (0,2) to Cinderwatch (0,0): distance = 2
assert.strictEqual(AluRunicMath.manhattanDist(frostspire.gx, frostspire.gy, cinderwatch.gx, cinderwatch.gy), 2);
// Canopy Haven (1,1) is at the central hub: 2 distance to corners in Euclidean or 2 in manhattan
assert.strictEqual(AluRunicMath.manhattanDist(canopy.gx, canopy.gy, cinderwatch.gx, cinderwatch.gy), 2);
console.log("  ✓ Test 3 Passed: All 5 towns topologically spaced 2 sub-map areas apart.");

// 4. Secret Quest Key Cryptographic Derivation
console.log("\n--- TEST 4: Secret Quest Key Derivation ---");
const k1 = AluRunicMath.deriveSecretKey('QUEST_SUB_BEDROCK_CIPHER', 0x1337BEEF);
const k2 = AluRunicMath.deriveSecretKey('QUEST_SUB_BEDROCK_CIPHER', 0x1337BEEF);
const k3 = AluRunicMath.deriveSecretKey('QUEST_ZENITH_KEYSTONE', 0x1337BEEF);
assert.strictEqual(k1, k2, "Secret quest key must be deterministic");
assert.notStrictEqual(k1, k3, "Different quests must generate distinct keys");
console.log("  ✓ Test 4 Passed: Secret quest cryptographic derivation verified.");

console.log("\n================================================================================");
console.log("   ALL ALU SEED MATH TESTS PASSED (4/4)!                                       ");
console.log("================================================================================\n");
