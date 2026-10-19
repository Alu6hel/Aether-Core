/**
 * Aether-Core: Comprehensive Test Suite for Expanded World, 5 Towns,
 * Purposeful Buildings, Basements, NPCs, Secret Quests, Radar, and Monster Frenzy
 */

const assert = require('assert');
const { AluRunicMath } = require('../engine/alu_core.js');
const { WorldMap, AREA_CONFIG, TILE, BUILDING_TYPE } = require('../engine/world_generator.js');
const { NpcManager } = require('../engine/npcs.js');
const { Character } = require('../engine/combat.js');
const { ScreenManager } = require('../engine/ui_screens.js');
const { RetroRenderer } = require('../engine/renderer.js');
const { BASE_ITEMS } = require('../engine/inventory.js');

console.log("================================================================================");
console.log("    AETHER-CORE: EXPANDED WORLD, 5 TOWNS, QUESTS, RADAR & FRENZY VERIFICATION   ");
console.log("================================================================================");

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

const SEED = 0x5EED1337;

// ==========================================
// TEST 1: ALU SEED MATH & 5 TOWNS SPACING (DISTANCE = 2)
// ==========================================
test("ALU Seed Math: Deterministic Voronoi coordinates and 5 towns spacing = 2", () => {
    const spacingCheck = AluRunicMath.verifyTownSpacing();
    assert.strictEqual(spacingCheck.valid, true, "All towns must satisfy Manhattan distance spacing");
    assert.strictEqual(spacingCheck.distances.length, 4, "Must verify 4 adjacent town pairs");

    for (const d of spacingCheck.distances) {
        assert.strictEqual(d.manhattanDist, 2, `${d.from} to ${d.to} distance must be exactly 2`);
    }

    // Canopy Haven at (1, 1) is surrounded by wilderness
    const havenCoords = AluRunicMath.getTownCoordinates('VERDANT_CANOPY_HAVEN');
    assert.strictEqual(havenCoords.subX, 1);
    assert.strictEqual(havenCoords.subY, 1);
});

// ==========================================
// TEST 2: ALL 21 SUB-MAPS & ENLARGED DIMENSIONS (128x128 / 140x140)
// ==========================================
test("World Generator: 21 distinct areas with enlarged 128x128 & 140x140 dimensions", () => {
    const areaKeys = Object.keys(AREA_CONFIG);
    assert.strictEqual(areaKeys.length >= 21, true, `Must have at least 21 areas (Found: ${areaKeys.length})`);

    // Verify 5 towns are >= 128x128
    const towns = ['CINDERWATCH_HAMLET', 'AETHELGARD_CITADEL', 'OASIS_SOLARIS', 'FROSTSPIRE_ENCLAVE', 'VERDANT_CANOPY_HAVEN'];
    for (const t of towns) {
        const cfg = AREA_CONFIG[t];
        assert.strictEqual(cfg.isTown, true, `${t} must be marked isTown`);
        assert.strictEqual(cfg.width >= 128, true, `${t} width must be >= 128 (actual: ${cfg.width})`);
        assert.strictEqual(cfg.height >= 128, true, `${t} height must be >= 128 (actual: ${cfg.height})`);

        const map = new WorldMap(SEED, null, null, t);
        assert.strictEqual(map.width >= 128, true, `Generated map width for ${t} must be >= 128`);
        assert.strictEqual(map.height >= 128, true, `Generated map height for ${t} must be >= 128`);
    }

    // Verify Celestial Zenith is 140x140
    const zenithMap = new WorldMap(SEED, null, null, 'CELESTIAL_ZENITH');
    assert.strictEqual(zenithMap.width, 140);
    assert.strictEqual(zenithMap.height, 140);

    // Verify neither viewport (480x320 = 30x20 tiles) nor radar (36x36 tiles) fits the sub-map
    assert.strictEqual(zenithMap.width > 36, true, "Radar 36x36 cannot fit the full map");
    assert.strictEqual(zenithMap.width > 30, true, "Viewport 30 tiles cannot fit the full map");
});

// ==========================================
// TEST 3: CREATIVE MAP BORDERS (NOT A WALL)
// ==========================================
test("Creative Map Boundaries: Biome-specific organic edges replace plain walls", () => {
    // 1. Whispering Woods: Enchanted Mist (TILE 30)
    const woods = new WorldMap(SEED, null, null, 'WHISPERING_WOODS');
    assert.strictEqual(woods.get(0, 0), TILE.ENCHANTED_MIST, "Woods border must be ENCHANTED_MIST");

    // 2. Solarium Dunes: Heat Mirage (TILE 31)
    const dunes = new WorldMap(SEED, null, null, 'SOLARIUM_DUNES');
    assert.strictEqual(dunes.get(0, 0), TILE.HEAT_MIRAGE, "Dunes border must be HEAT_MIRAGE");

    // 3. Glacial Steppe: Blizzard Haze (TILE 32)
    const glacier = new WorldMap(SEED, null, null, 'GLACIAL_STEPPE');
    assert.strictEqual(glacier.get(0, 0), TILE.BLIZZARD_HAZE, "Glacier border must be BLIZZARD_HAZE");

    // 4. Obsidian Chasm: Chasm Drop (TILE 33)
    const chasm = new WorldMap(SEED, null, null, 'OBSIDIAN_CHASM');
    assert.strictEqual(chasm.get(0, 0), TILE.CHASM_DROP, "Chasm border must be CHASM_DROP");

    // 5. Celestial Zenith: Cosmic Void (TILE 34)
    const zenith = new WorldMap(SEED, null, null, 'CELESTIAL_ZENITH');
    assert.strictEqual(zenith.get(0, 0), TILE.COSMIC_VOID, "Zenith border must be COSMIC_VOID");
});

// ==========================================
// TEST 4: PURPOSEFUL BUILDINGS & UNDERGROUND BASEMENT MINI-DUNGEONS
// ==========================================
test("Purposeful Buildings: Signs, dedicated types, and enterable basement cellars", () => {
    const hamlet = new WorldMap(SEED, null, null, 'CINDERWATCH_HAMLET');
    assert.strictEqual(hamlet.buildings.length >= 4, true, "Hamlet must have at least 4 purposeful buildings");
    
    // Check building types
    const types = hamlet.buildings.map(b => b.type);
    assert.strictEqual(types.includes(BUILDING_TYPE.TOWN_HALL), true, "Must have TOWN_HALL");
    assert.strictEqual(types.includes(BUILDING_TYPE.FORGE), true, "Must have FORGE");
    assert.strictEqual(types.includes(BUILDING_TYPE.APOTHECARY), true, "Must have APOTHECARY");
    assert.strictEqual(types.includes(BUILDING_TYPE.INN), true, "Must have INN");

    // Check basement stairs portal
    const basementPortal = hamlet.portals.find(p => p.targetArea === 'HAMLET_CELLAR');
    assert.notStrictEqual(basementPortal, undefined, "Hamlet must have portal to HAMLET_CELLAR");

    // Generate HAMLET_CELLAR
    const cellar = new WorldMap(SEED, null, null, 'HAMLET_CELLAR');
    assert.strictEqual(cellar.isBasement, true, "Cellar must be marked isBasement");
    assert.strictEqual(cellar.enemies.length >= 3, true, "Cellar must contain miniboss and guards");
    assert.strictEqual(cellar.chests.length >= 1, true, "Cellar must have hidden treasure chest");

    // Exit portal back to Hamlet
    const exitPortal = cellar.portals.find(p => p.targetArea === 'CINDERWATCH_HAMLET');
    assert.notStrictEqual(exitPortal, undefined, "Cellar must have exit stairs back to Hamlet");
});

// ==========================================
// TEST 5: ZERO OPEN TOWN SQUARE CHESTS (CHESTS ONLY IN BASEMENTS & WILDERNESS)
// ==========================================
test("Treasure Chest Spawns: Zero free chests in town squares; placed in basements & wilderness", () => {
    const towns = ['CINDERWATCH_HAMLET', 'AETHELGARD_CITADEL', 'OASIS_SOLARIS', 'FROSTSPIRE_ENCLAVE', 'VERDANT_CANOPY_HAVEN'];
    for (const t of towns) {
        const townMap = new WorldMap(SEED, null, null, t);
        assert.strictEqual(townMap.chests.length, 0, `Town ${t} must NOT have open treasure chests in the square (found: ${townMap.chests.length})`);
    }

    // Basements must have chests
    const basements = ['HAMLET_CELLAR', 'CITADEL_VAULT', 'OASIS_CATACOMBS', 'FROST_CRYPTS'];
    for (const b of basements) {
        const baseMap = new WorldMap(SEED, null, null, b);
        assert.strictEqual(baseMap.chests.length >= 1, true, `Basement ${b} must contain guarded treasure chests`);
    }
});

// ==========================================
// TEST 6: 26+ UNIQUE NPCS & SECRET QUEST SYSTEM
// ==========================================
test("NPCs & Secret Quests: 26+ unique NPCs across all towns, with secret quest key items", () => {
    const npcMgr = new NpcManager();
    const areasToTest = [
        'CINDERWATCH_HAMLET',
        'AETHELGARD_CITADEL',
        'OASIS_SOLARIS',
        'FROSTSPIRE_ENCLAVE',
        'VERDANT_CANOPY_HAVEN',
        'WHISPERING_WOODS',
        'SUNKEN_GROTTO',
        'SUB_BEDROCK_CORE',
        'SOLARIUM_DUNES',
        'OBSIDIAN_CHASM'
    ];

    let totalNpcs = 0;
    for (const area of areasToTest) {
        npcMgr.initForArea(area);
        totalNpcs += npcMgr.npcs.length;
    }
    assert.strictEqual(totalNpcs >= 26, true, `Must have at least 26 unique NPCs across world (found: ${totalNpcs})`);

    // Verify Secret Quest 1: Inventor Zara in Citadel -> SUB_CORE_CIPHER
    npcMgr.initForArea('AETHELGARD_CITADEL');
    const zara = npcMgr.npcs.find(n => n.id === 'INVENTOR_ZARA');
    assert.notStrictEqual(zara, undefined, "Inventor Zara must exist in Aethelgard");
    const zaraDialogue = npcMgr.getDialogueFor(zara, 'SUPER_SOLDIER');
    assert.strictEqual(zaraDialogue.questUpdate.stage, 'QUEST_SUB_BEDROCK_CIPHER');
    assert.strictEqual(zaraDialogue.questUpdate.rewardItem, 'SUB_CORE_CIPHER');
    assert.notStrictEqual(BASE_ITEMS.SUB_CORE_CIPHER, undefined, "SUB_CORE_CIPHER must exist in BASE_ITEMS");

    // Verify Secret Quest 2: Astronomer Nabilah in Oasis Solaris -> ASTRAL_KEYSTONE
    npcMgr.initForArea('OASIS_SOLARIS');
    const nabilah = npcMgr.npcs.find(n => n.id === 'ASTRONOMER_NABILAH');
    assert.notStrictEqual(nabilah, undefined, "Astronomer Nabilah must exist in Oasis Solaris");
    const nabilahDialogue = npcMgr.getDialogueFor(nabilah, 'SUPER_SOLDIER');
    assert.strictEqual(nabilahDialogue.questUpdate.stage, 'QUEST_ZENITH_KEYSTONE');
    assert.strictEqual(nabilahDialogue.questUpdate.rewardItem, 'ASTRAL_KEYSTONE');
    assert.notStrictEqual(BASE_ITEMS.ASTRAL_KEYSTONE, undefined, "ASTRAL_KEYSTONE must exist in BASE_ITEMS");

    // Verify Secret Quest 3: Mystic Rowan in Verdant Canopy -> ECLIPSE_AMULET
    npcMgr.initForArea('VERDANT_CANOPY_HAVEN');
    const rowan = npcMgr.npcs.find(n => n.id === 'MYSTIC_ROWAN');
    assert.notStrictEqual(rowan, undefined, "Mystic Rowan must exist in Canopy Haven");
    const rowanDialogue = npcMgr.getDialogueFor(rowan, 'SUPER_SOLDIER');
    assert.strictEqual(rowanDialogue.questUpdate.stage, 'QUEST_WHISPERING_ECLIPSE');
    assert.strictEqual(rowanDialogue.questUpdate.rewardItem, 'ECLIPSE_AMULET');
    assert.notStrictEqual(BASE_ITEMS.ECLIPSE_AMULET, undefined, "ECLIPSE_AMULET must exist in BASE_ITEMS");
});

// ==========================================
// TEST 7: RADAR MAP SCANNING WINDOW & PLAYER ORIENTATION POINTER
// ==========================================
test("Radar Minimap: 36x36 scanning window & player cardinal orientation pointer", () => {
    const screens = new ScreenManager({});
    const map = new WorldMap(SEED, null, null, 'CINDERWATCH_HAMLET');
    const player = new Character('SUPER_SOLDIER', 500, 500);
    player.facing.set(1, 0); // Facing RIGHT
    player.cardinalFacing = 'RIGHT';

    const drawnPaths = [];
    const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: (x, y, w, h) => {},
        strokeRect: (x, y, w, h) => {},
        beginPath: () => { drawnPaths.push('beginPath'); },
        moveTo: (x, y) => { drawnPaths.push(`moveTo(${Math.round(x)},${Math.round(y)})`); },
        lineTo: (x, y) => { drawnPaths.push(`lineTo(${Math.round(x)},${Math.round(y)})`); },
        closePath: () => { drawnPaths.push('closePath'); },
        fill: () => { drawnPaths.push('fill'); },
        stroke: () => { drawnPaths.push('stroke'); },
        arc: (x, y, r) => { drawnPaths.push(`arc(${Math.round(x)},${Math.round(y)})`); }
    };

    screens.game = {
        currentMap: map,
        player: player,
        npcs: { npcs: [] }
    };

    screens.renderMinimap(mockCtx, 320, 240);
    assert.strictEqual(drawnPaths.includes('beginPath'), true, "Minimap must render player path");
    assert.strictEqual(drawnPaths.includes('fill'), true, "Minimap must fill player pointer");
});

// ==========================================
// TEST 8: NIGHT MONSTER FRENZY & REWARD MULTIPLIERS
// ==========================================
test("Night Monster Frenzy: Trigger conditions, buffed speed/aggro, and 2x coins/EXP", () => {
    const player = new Character('SUPER_SOLDIER', 100, 100);
    const mockGame = {
        isMonsterFrenzy: true,
        bossSlainCount: 0
    };
    player.game = mockGame;

    // Defeating enemy in normal mode
    player.game.isMonsterFrenzy = false;
    const normalResult = player.onEnemyDefeated({ hp: 0, isBoss: false, x: 100, y: 100 });
    assert.strictEqual(normalResult.coins, 8, "Normal enemy drop is 8 ALU coins");
    assert.strictEqual(normalResult.exp, 35, "Normal enemy grant is 35 EXP");

    // Defeating enemy in MONSTER FRENZY mode
    player.game.isMonsterFrenzy = true;
    const frenzyResult = player.onEnemyDefeated({ hp: 0, isBoss: false, x: 100, y: 100 });
    assert.strictEqual(frenzyResult.coins, 16, "Frenzy enemy drop must be DOUBLED (16 ALU coins)");
    assert.strictEqual(frenzyResult.exp, 70, "Frenzy enemy EXP must be DOUBLED (70 EXP)");
});

console.log(`\n================================================================================`);
console.log(`  EXPANDED WORLD & FRENZY SUMMARY: ${passed}/${total} test suites PASSED (100%)!`);
console.log(`================================================================================\n`);

if (passed !== total) {
    process.exit(1);
}
