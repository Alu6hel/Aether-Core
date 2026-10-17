/**
 * Test Suite: Multi-Area Generation, Rustic Collisions, NPCs, Story Dialogue Branching & Wildlife
 */

const assert = require('assert');
const { WorldMap, TILE, AREA_CONFIG } = require('../engine/world_generator.js');
const { NpcManager, STORY_CHAPTER } = require('../engine/npcs.js');
const { CritterManager } = require('../engine/critters.js');
const { CHARACTER_CLASS } = require('../engine/combat.js');

console.log("==================================================");
console.log(" MULTI-AREA, RUSTIC TILES, STORY & NPC TEST SUITE ");
console.log("==================================================");

// 1. TEST 1: Area Generation for all 4 distinct areas
console.log("\n--- TEST 1: Area Generation (4 Interconnected Maps) ---");
const seed = 0x8A3F12BC;

const hamlet = new WorldMap(seed, 64, 64, 'CINDERWATCH_HAMLET');
assert.strictEqual(hamlet.width, 64);
assert.strictEqual(hamlet.height, 64);
assert.strictEqual(hamlet.areaId, 'CINDERWATCH_HAMLET');
console.log("[PASS] Cinderwatch Hamlet (64x64) generated successfully");

const woods = new WorldMap(seed + 1, 80, 80, 'WHISPERING_WOODS');
assert.strictEqual(woods.width, 80);
assert.strictEqual(woods.height, 80);
assert.strictEqual(woods.areaId, 'WHISPERING_WOODS');
console.log("[PASS] Whispering Woods (80x80) generated successfully");

const grotto = new WorldMap(seed + 2, 64, 64, 'SUNKEN_GROTTO');
assert.strictEqual(grotto.width, 64);
assert.strictEqual(grotto.height, 64);
assert.strictEqual(grotto.areaId, 'SUNKEN_GROTTO');
console.log("[PASS] Sunken Grotto (64x64) generated successfully");

const core = new WorldMap(seed + 3, 64, 64, 'SUB_BEDROCK_CORE');
assert.strictEqual(core.width, 64);
assert.strictEqual(core.height, 64);
assert.strictEqual(core.areaId, 'SUB_BEDROCK_CORE');
console.log("[PASS] Sub-Bedrock Core (64x64) generated successfully");

// 2. TEST 2: Rustic Tile Composition & Density in Hamlet
console.log("\n--- TEST 2: Rustic Tile Composition & Features in Hamlet ---");
let cobbleCount = 0, bridgeCount = 0, fenceCount = 0, wallCount = 0, roofCount = 0, doorCount = 0, flowerCount = 0, reedsCount = 0;

for (let y = 0; y < hamlet.height; y++) {
    for (let x = 0; x < hamlet.width; x++) {
        const t = hamlet.get(x, y);
        if (t === TILE.PATH_COBBLE) cobbleCount++;
        else if (t === TILE.WOODEN_BRIDGE) bridgeCount++;
        else if (t === TILE.FENCE_WOOD) fenceCount++;
        else if (t === TILE.BUILDING_WALL) wallCount++;
        else if (t === TILE.BUILDING_ROOF) roofCount++;
        else if (t === TILE.BUILDING_DOOR) doorCount++;
        else if (t === TILE.FLOWER_BED) flowerCount++;
        else if (t === TILE.REEDS_WATER) reedsCount++;
    }
}

assert(cobbleCount >= 100, `Expected >= 100 cobblestones, found ${cobbleCount}`);
assert(bridgeCount >= 15, `Expected >= 15 bridge tiles over river, found ${bridgeCount}`);
assert(fenceCount >= 30, `Expected >= 30 fence tiles, found ${fenceCount}`);
assert(wallCount >= 40, `Expected >= 40 building wall tiles, found ${wallCount}`);
assert(roofCount >= 40, `Expected >= 40 building roof tiles, found ${roofCount}`);
assert(doorCount >= 3, `Expected >= 3 cottage door tiles, found ${doorCount}`);
assert(flowerCount >= 10, `Expected >= 10 flower tiles, found ${flowerCount}`);
assert(reedsCount >= 10, `Expected >= 10 river reeds, found ${reedsCount}`);

console.log(`[PASS] Hamlet Features verified:`);
console.log(`       - Cobblestone paths: ${cobbleCount} tiles`);
console.log(`       - Wooden Bridges: ${bridgeCount} tiles`);
console.log(`       - Cottages: ${wallCount} walls, ${roofCount} roofs, ${doorCount} doors`);
console.log(`       - Fences: ${fenceCount} tiles`);
console.log(`       - Flowers & Reeds: ${flowerCount} flowers, ${reedsCount} reeds`);

// 3. TEST 3: Collision Rigor (Bridges Walkable, Walls/Fences Solid)
console.log("\n--- TEST 3: Collision Rigor ---");
let foundBridge = null;
let foundWall = null;
let foundFence = null;
let foundDoor = null;
let foundCobble = null;

for (let y = 0; y < hamlet.height; y++) {
    for (let x = 0; x < hamlet.width; x++) {
        const t = hamlet.get(x, y);
        if (t === TILE.WOODEN_BRIDGE && !foundBridge) foundBridge = { x, y };
        if (t === TILE.BUILDING_WALL && !foundWall) foundWall = { x, y };
        if (t === TILE.FENCE_WOOD && !foundFence) foundFence = { x, y };
        if (t === TILE.BUILDING_DOOR && !foundDoor) foundDoor = { x, y };
        if (t === TILE.PATH_COBBLE && !foundCobble) foundCobble = { x, y };
    }
}

assert(foundBridge, "Hamlet must have a bridge tile");
assert.strictEqual(hamlet.isSolid(foundBridge.x, foundBridge.y), false, "Wooden Bridge MUST be walkable (non-solid)!");

assert(foundWall, "Hamlet must have a wall tile");
assert.strictEqual(hamlet.isSolid(foundWall.x, foundWall.y), true, "Cottage wall MUST be solid (impassable)!");

assert(foundFence, "Hamlet must have a fence tile");
assert.strictEqual(hamlet.isSolid(foundFence.x, foundFence.y), true, "Split-rail fence MUST be solid (impassable)!");

assert(foundDoor, "Hamlet must have a door tile");
assert.strictEqual(hamlet.isSolid(foundDoor.x, foundDoor.y), false, "Cottage doorway threshold MUST be walkable!");

assert(foundCobble, "Hamlet must have cobblestone");
assert.strictEqual(hamlet.isSolid(foundCobble.x, foundCobble.y), false, "Cobblestone path MUST be walkable!");

console.log("[PASS] Collisions strictly verified: Bridges and doors are walkable, walls and fences are solid.");

// 4. TEST 4: Portals & Navigation Interconnections
console.log("\n--- TEST 4: Portals & Area Interconnections ---");
assert(hamlet.portals.length >= 1, "Hamlet must have at least 1 exit portal");
const hamletExit = hamlet.portals.find(p => p.id === 'portal_to_woods');
assert(hamletExit, "Hamlet must contain portal portal_to_woods");
assert.strictEqual(hamletExit.targetArea, 'WHISPERING_WOODS');

const nearbyP = hamlet.findNearbyPortal(hamletExit.x, hamletExit.y, 32);
assert(nearbyP, "findNearbyPortal must find portal when player is within radius");
assert.strictEqual(nearbyP.id, 'portal_to_woods');

const woodsHamletPortal = woods.portals.find(p => p.id === 'portal_to_hamlet');
assert(woodsHamletPortal, "Whispering Woods must have return portal portal_to_hamlet");
assert.strictEqual(woodsHamletPortal.targetArea, 'CINDERWATCH_HAMLET');

const woodsGrottoPortal = woods.portals.find(p => p.id === 'portal_to_grotto');
assert(woodsGrottoPortal, "Whispering Woods must have cave entrance portal_to_grotto");
assert.strictEqual(woodsGrottoPortal.targetArea, 'SUNKEN_GROTTO');

const grottoCorePortal = grotto.portals.find(p => p.id === 'portal_to_core');
assert(grottoCorePortal, "Sunken Grotto must have blast door portal_to_core");
assert.strictEqual(grottoCorePortal.targetArea, 'SUB_BEDROCK_CORE');

console.log("[PASS] Seamless 4-way area portal network validated:");
console.log(`       - Hamlet -> Woods [(${hamletExit.x}, ${hamletExit.y}) -> WHISPERING_WOODS]`);
console.log(`       - Woods -> Hamlet [(${woodsHamletPortal.x}, ${woodsHamletPortal.y}) -> CINDERWATCH_HAMLET]`);
console.log(`       - Woods -> Grotto [(${woodsGrottoPortal.x}, ${woodsGrottoPortal.y}) -> SUNKEN_GROTTO]`);
console.log(`       - Grotto -> Core   [(${grottoCorePortal.x}, ${grottoCorePortal.y}) -> SUB_BEDROCK_CORE]`);

// 5. TEST 5: NPC Spawning & Character-Specific Dialogue Trees
console.log("\n--- TEST 5: NPC Spawning & Character-Specific Dialogue Trees ---");
const npcMgr = new NpcManager();

npcMgr.initForArea('CINDERWATCH_HAMLET');
const hamletNpcs = npcMgr.npcs;
assert.strictEqual(hamletNpcs.length, 4, `Expected 4 NPCs in Hamlet, found ${hamletNpcs.length}`);
const elder = hamletNpcs.find(n => n.id === 'ELDER_OAKHAVEN');
const blacksmith = hamletNpcs.find(n => n.id === 'BLACKSMITH_THORNE');
const herbalist = hamletNpcs.find(n => n.id === 'HERBALIST_MAEVE');
const scavenger = hamletNpcs.find(n => n.id === 'SCAVENGER_JAX');
assert(elder && blacksmith && herbalist && scavenger, "All 4 Hamlet NPCs must exist");

const classes = ['SUPER_SOLDIER', 'TECHNO_MAGE', 'FARMER_GOD'];

for (const cls of classes) {
    const elderDialogue = npcMgr.getDialogueFor(elder, cls);
    assert(elderDialogue && elderDialogue.lines.length >= 2, `Elder must provide multi-line dialogue for ${cls}`);
    assert.strictEqual(elderDialogue.speaker, "Elder Oakhaven");

    const smithDialogue = npcMgr.getDialogueFor(blacksmith, cls);
    assert(smithDialogue && smithDialogue.lines.length >= 2, `Blacksmith must provide multi-line dialogue for ${cls}`);

    if (cls === 'SUPER_SOLDIER') {
        assert(elderDialogue.lines.some(l => l.includes('Aegis') || l.includes('soldier') || l.includes('Vanguard')), "Super Soldier should receive military combat lore");
        assert(smithDialogue.lines.some(l => l.includes('tungsten chassis') || l.includes('kinetic')), "Smith should comment on soldier's armor");
    } else if (cls === 'TECHNO_MAGE') {
        assert(elderDialogue.lines.some(l => l.includes('chronometer') || l.includes('quantum') || l.includes('Arcanist')), "Techno-Mage should receive spacetime weave lore");
        assert(smithDialogue.lines.some(l => l.includes('plasma sparks') || l.includes('kinetic barrier')), "Smith should comment on mage energy");
    } else if (cls === 'FARMER_GOD') {
        assert(elderDialogue.lines.some(l => l.includes('soil') || l.includes('cabbage') || l.includes('Elder')), "Farmer God should be recognized by Elder as progenitor");
        assert(smithDialogue.lines.some(l => l.includes('scythe') || l.includes('hammer cracked')), "Smith should remark on unbreakable God scythe");
    }
}
console.log("[PASS] Hamlet NPC dialogue trees fully verified across all 3 character classes");

// Test Sub-Bedrock Core Unit-7 Recognition
npcMgr.initForArea('SUB_BEDROCK_CORE');
const unit7 = npcMgr.npcs.find(n => n.id === 'ARCHIVIST_UNIT_7');
assert(unit7, "Archivist Unit-7 must exist in Sub-Bedrock Core");
const unit7Soldier = npcMgr.getDialogueFor(unit7, 'SUPER_SOLDIER');
const unit7Mage = npcMgr.getDialogueFor(unit7, 'TECHNO_MAGE');
const unit7Farmer = npcMgr.getDialogueFor(unit7, 'FARMER_GOD');

assert(unit7Soldier.lines.some(l => l.includes('MIL-SPEC') || l.includes('Aegis Dreadnought')), "Unit-7 must recognize soldier military callsign");
assert(unit7Mage.lines.some(l => l.includes('Chronal anomaly') || l.includes('Spacetime')), "Unit-7 must recognize mage tachyon readings");
assert(unit7Farmer.lines.some(l => l.includes('PRIMARY TERRAFORMER') || l.includes('GENESIS ARCHITECT')), "Unit-7 must salute Farmer God as Primary Terraformer");
console.log("[PASS] Unit-7 Dyson Vault AI dialogue branching validated for all 3 classes");

// 6. TEST 6: Story Chapters & Quest Objectives
console.log("\n--- TEST 6: Story Chapters & Quest Progression ---");
assert.strictEqual(npcMgr.questStage, STORY_CHAPTER.CH1_HAMLET_GATHERING);
assert.strictEqual(npcMgr.activeQuestTitle, "A Gathering of Relics");

// Simulate completing chapter 1 via Elder dialogue
const elderD = npcMgr.getDialogueFor(elder, 'SUPER_SOLDIER');
if (elderD.questUpdate) {
    npcMgr.questStage = elderD.questUpdate.stage;
    npcMgr.activeQuestTitle = elderD.questUpdate.title;
    npcMgr.activeQuestObjective = elderD.questUpdate.objective;
}
assert.strictEqual(npcMgr.questStage, STORY_CHAPTER.CH2_WOODS_RECON);
assert.strictEqual(npcMgr.activeQuestTitle, "Vanguard's Reckoning");
console.log("[PASS] Story Chapter progression and Quest Tracker update validated");

// 7. TEST 7: Living World Critters & Wildlife Simulation
console.log("\n--- TEST 7: Living World Wildlife Simulation ---");
const critters = new CritterManager();
critters.initForArea('CINDERWATCH_HAMLET', hamlet.width, hamlet.height);

assert(hamlet.chimneys.length >= 3, `Expected >= 3 cottage chimneys on hamlet map, got ${hamlet.chimneys.length}`);
for (const ch of hamlet.chimneys) {
    critters.addChimneyEmitter(ch.x, ch.y);
}

assert(critters.rabbits.length >= 6, `Expected >= 6 rabbits in hamlet, got ${critters.rabbits.length}`);
assert(critters.butterflies.length >= 10, `Expected >= 10 butterflies in hamlet, got ${critters.butterflies.length}`);
assert(critters.chimneyEmitters.length >= 3, `Expected >= 3 cottage chimney smoke emitters, got ${critters.chimneyEmitters.length}`);

const rabbit = critters.rabbits[0];
rabbit.x = 200;
rabbit.y = 200;
rabbit.state = 'IDLE';

// Place player 30px away (within 65px flee radius)
const playerNear = { x: 230, y: 200 };
critters.update(0.1, playerNear, hamlet, false);
assert.strictEqual(rabbit.state, 'FLEEING', "Rabbit must switch to FLEEING state when player is nearby!");
assert(rabbit.vx < 0, "Rabbit should flee away from player (vx < 0 when player is to the right)");

const initialSmokeCount = critters.chimneySmoke.length;
for (let i = 0; i < 20; i++) {
    critters.update(0.1, { x: 0, y: 0 }, hamlet, false);
}
assert(critters.chimneySmoke.length > initialSmokeCount, "Chimneys must actively generate ascending smoke particles");

console.log(`[PASS] Living World Critters validated:`);
console.log(`       - Rabbits (${critters.rabbits.length}) react and flee from player`);
console.log(`       - Butterflies (${critters.butterflies.length}) flutter`);
console.log(`       - Chimney smoke emitters (${critters.chimneyEmitters.length}) produce rising puffs`);

console.log("\n==================================================");
console.log(" ALL MULTI-AREA, NPC & STORY TESTS PASSED (7/7) ");
console.log("==================================================");
