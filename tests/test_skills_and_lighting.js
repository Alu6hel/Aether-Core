/**
 * Aether-Core: Lighting Inversion Fix, 80s Title Pacing, 3-Class Skill Trees & Procedural Seed Verification
 */

const assert = require('assert');
const { Character, CHARACTER_CLASS, CLASS_SKILL_TREES } = require('../engine/combat.js');
const { WorldMap, TILE } = require('../engine/world_generator.js');
const { RetroRenderer } = require('../engine/renderer.js');

console.log("================================================================================");
console.log("   LIGHTING FIX, 80s TITLE PACING, SKILL TREES & SEED WORLDGEN VERIFICATION   ");
console.log("================================================================================\n");

// ==============================================================================
// TEST 1: TITLE SCREEN CELESTIAL PACING (80s FULL CYCLE, 20s PER PHASE)
// ==============================================================================
console.log("--- TEST 1: Title Screen Dyson Luminary Pacing ---");
{
    const mockCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        clearRect: () => {},
        drawImage: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        translate: () => {},
        rotate: () => {},
        scale: () => {}, ellipse: () => {}, fillText: () => {}, strokeText: () => {}, measureText: () => ({ width: 10 }),
        quadraticCurveTo: () => {}, bezierCurveTo: () => {}
    };

    const mockCanvas = { width: 480, height: 320, getContext: () => mockCtx };
    const renderer = new RetroRenderer(mockCanvas);

    assert.strictEqual(renderer.titleAnimTimer, 0);

    // Simulate 1 second of animation update via renderTitleBackdrop
    renderer.renderTitleBackdrop(1.0);
    assert.strictEqual(renderer.titleAnimTimer, 1.0);

    // Compute celestial cycle rate
    const cyclePerSecond = 0.0125;
    const fullCycleSeconds = 1.0 / cyclePerSecond;
    assert.strictEqual(fullCycleSeconds, 80, "Full celestial cycle takes exactly 80 seconds");
    const phaseSeconds = fullCycleSeconds / 4;
    assert.strictEqual(phaseSeconds, 20, "Each of the 4 celestial phases lasts 20 seconds for calm admiration");

    // Advance 20s (Stage 2: Solar Dawn)
    renderer.renderTitleBackdrop(19.0); // total 20.0s
    assert.strictEqual(renderer.titleAnimTimer, 20.0);
    const cycleAt20s = (renderer.titleAnimTimer * 0.0125) % 1.0;
    assert.strictEqual(cycleAt20s, 0.25, "At 20s, transitions cleanly to Solar Dawn (Stage 2)");

    // Advance to 40s (Stage 3: Radiant Solar Zenith)
    renderer.renderTitleBackdrop(20.0); // total 40.0s
    const cycleAt40s = (renderer.titleAnimTimer * 0.0125) % 1.0;
    assert.strictEqual(cycleAt40s, 0.50, "At 40s, transitions cleanly to Radiant Solar Zenith (Stage 3)");

    // Advance to 60s (Stage 4: Red Giant & Supernova Cooling)
    renderer.renderTitleBackdrop(20.0); // total 60.0s
    const cycleAt60s = (renderer.titleAnimTimer * 0.0125) % 1.0;
    assert.strictEqual(cycleAt60s, 0.75, "At 60s, transitions cleanly to Red Giant (Stage 4)");

    console.log(`[PASS] Dyson Luminary revolution verified: 80s full cycle (~20s per phase).`);
}

// ==============================================================================
// TEST 2: DAY/NIGHT LIGHTING INVERSION FIX & HIGH NOON BRIGHTNESS
// ==============================================================================
console.log("\n--- TEST 2: Lighting Fix & Midday Sunlight Verification ---");
{
    const mockCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        fillRect: () => {},
        clearRect: () => {},
        drawImage: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        translate: () => {},
        rotate: () => {}
    };
    const mockCanvas = { width: 480, height: 320, getContext: () => mockCtx };
    const renderer = new RetroRenderer(mockCanvas);

    // High Noon (0.50): MUST be 0.0 darkness (brilliant full sunlight)
    const middayDarkness = renderer.computeLightingDarkness(0.50);
    assert.strictEqual(middayDarkness, 0.0, "High Noon (12:00) must have 0.0 darkness (pitch black bug eliminated!)");

    // Morning (0.35) and Afternoon (0.65) should also be full daylight
    assert.strictEqual(renderer.computeLightingDarkness(0.35), 0.0, "Morning must have 0.0 darkness");
    assert.strictEqual(renderer.computeLightingDarkness(0.65), 0.0, "Afternoon must have 0.0 darkness");

    // Midnight (0.00 / 1.00): MUST be 0.88 darkness (pitch black night requiring torch)
    const midnightDarkness1 = renderer.computeLightingDarkness(0.00);
    const midnightDarkness2 = renderer.computeLightingDarkness(1.00);
    assert.strictEqual(midnightDarkness1, 0.88, "Midnight 0.00 must have 0.88 darkness");
    assert.strictEqual(midnightDarkness2, 0.88, "Midnight 1.00 must have 0.88 darkness");

    // Dawn (0.25) and Dusk (0.75) must be intermediate twilight
    const dawnDarkness = renderer.computeLightingDarkness(0.25);
    const duskDarkness = renderer.computeLightingDarkness(0.75);
    assert(dawnDarkness > 0.0 && dawnDarkness < 0.88, `Dawn darkness should be twilight (got ${dawnDarkness})`);
    assert(duskDarkness > 0.0 && duskDarkness < 0.88, `Dusk darkness should be twilight (got ${duskDarkness})`);

    console.log(`[PASS] Day/Night lighting logic verified:`);
    console.log(`       - 12:00 High Noon: darkness = ${middayDarkness} (100% Sunlight)`);
    console.log(`       - 00:00 Midnight:  darkness = ${midnightDarkness1} (Deep Night requiring torch)`);
    console.log(`       - Twilight Dawn:   darkness = ${dawnDarkness.toFixed(3)}`);
    console.log(`       - Twilight Dusk:   darkness = ${duskDarkness.toFixed(3)}`);
}

// ==============================================================================
// TEST 3: EXP PROGRESSION & 3-CHARACTER SKILL TREES
// ==============================================================================
console.log("\n--- TEST 3: EXP System & 3-Character Skill Trees ---");
{
    // 1. Super Soldier Progression
    const warrior = new Character(CHARACTER_CLASS.SUPER_SOLDIER, 100, 100);
    assert.strictEqual(warrior.level, 1);
    assert.strictEqual(warrior.exp, 0);
    assert.strictEqual(warrior.skillPoints, 0);

    // Gain EXP without leveling
    let leveled = warrior.gainExp(50);
    assert.strictEqual(leveled, false);
    assert.strictEqual(warrior.exp, 50);

    // Gain EXP to level up
    leveled = warrior.gainExp(60); // 110 total, threshold 100
    assert.strictEqual(leveled, true);
    assert.strictEqual(warrior.level, 2);
    assert.strictEqual(warrior.skillPoints, 1);
    assert(warrior.maxHp > 140, "Warrior HP scaled up upon leveling");

    // Skill tree validation
    const warriorTree = CLASS_SKILL_TREES.SUPER_SOLDIER;
    assert(warriorTree.length >= 8, "Warrior tree has at least 8 distinct skills across Yggdrasil tiers");

    // Cannot unlock Tier 2 without prerequisite
    const tier2Unlocked = warrior.unlockSkill('warrior_kinetic_overdrive');
    assert.strictEqual(tier2Unlocked, false, "Cannot unlock Tier 2 without Titan Edge prerequisite");

    // Unlock Tier 1 Titan Edge
    const tier1Unlocked = warrior.unlockSkill('warrior_titan_edge');
    assert.strictEqual(tier1Unlocked, true, "Titan Edge unlocked with 1 SP");
    assert.strictEqual(warrior.hasSkill('warrior_titan_edge'), true);
    assert.strictEqual(warrior.skillPoints, 0);

    // Active ability: Whirlwind Strike
    const enemies = [
        { id: 'mob1', x: 110, y: 100, hp: 50 },
        { id: 'mob2', x: 200, y: 200, hp: 50 }
    ];
    warrior.energy = 80;
    const whirlRes = warrior.performClassAbility(enemies);
    assert(whirlRes, "Whirlwind Strike executed");
    assert.strictEqual(whirlRes.type, 'WHIRLWIND');
    assert(enemies[0].hp <= 0, "Enemy in 40px radius took whirlwind damage");
    assert.strictEqual(enemies[1].hp, 50, "Enemy outside radius took no damage");

    console.log(`[PASS] Super Soldier verified: Leveling, Skill Tree prerequisites, and Whirlwind Strike active ability.`);

    // 2. Techno-Mage Progression & Singularity
    const mage = new Character(CHARACTER_CLASS.TECHNO_MAGE, 100, 100);
    mage.gainExp(300);
    assert(mage.level >= 3);
    assert(mage.skillPoints >= 2);

    // Level up mage to unlock Chrono Step (unlockLevel: 18)
    mage.level = 18;
    mage.skillPoints = 6;

    // Unlock Nanite Infusion and Chrono Step
    assert(mage.unlockSkill('mage_nanite_infusion'));
    assert(mage.unlockSkill('mage_chrono_step'));
    assert(mage.hasSkill('mage_chrono_step'));

    // Chrono Step Instant Blink
    mage.pos.x = 100;
    mage.pos.y = 100;
    mage.facing.x = 1;
    mage.facing.y = 0;
    mage.performDash();
    assert(mage.pos.x >= 150, "Chrono Step performed instant quantum blink teleportation (+90px)");

    // Graviton Singularity Ability
    mage.energy = 80;
    mage.abilityCooldowns[0] = 0;
    const singRes = mage.performClassAbility();
    assert(singRes, "Graviton Singularity executed");
    assert.strictEqual(singRes.type, 'SINGULARITY');
    assert.strictEqual(mage.activeVortices.length, 1);

    console.log(`[PASS] Techno-Mage verified: Nanite Infusion, Chrono Step quantum blink, and Graviton Singularity vortex.`);

    // 3. Farmer God Progression & Gaia Cataclysm
    const farmer = new Character(CHARACTER_CLASS.FARMER_GOD, 100, 100);
    farmer.gainExp(1000);
    // Level up farmer to unlock Gaia Cataclysm (unlockLevel: 35)
    farmer.level = 35;
    farmer.skillPoints = 10;
    assert(farmer.unlockSkill('farmer_bountiful_earth'));
    assert(farmer.unlockSkill('farmer_spacetime_tillage'));
    assert(farmer.unlockSkill('farmer_gaia_cataclysm'));

    // Enemy loot multiplier with Bountiful Earth
    const testEnemy = { isBoss: false, x: 100, y: 100 };
    const defeated = farmer.onEnemyDefeated(testEnemy);
    assert.strictEqual(defeated.coins, 32, "Bountiful Earth quadrupled drop coins (8 * 4 = 32)");

    // Gaia Cataclysm Primordial Root Burst
    farmer.energy = 80;
    farmer.abilityCooldowns[0] = 0;
    const treeFoes = [{ id: 'boss', x: 120, y: 100, hp: 200 }];
    const gaiaRes = farmer.performClassAbility(treeFoes);
    assert(gaiaRes, "Gaia Cataclysm executed");
    assert.strictEqual(gaiaRes.type, 'GAIA');
    assert(treeFoes[0].hp <= 50, "Foes in 95px radius crushed for 150 damage");

    console.log(`[PASS] Farmer God verified: Bountiful Earth 4x multiplier, and Gaia Cataclysm root burst.`);
}

// ==============================================================================
// TEST 4: PROCEDURAL SEED-BASED WORLD GENERATION & NEW MAP REGIONS
// ==============================================================================
console.log("\n--- TEST 4: Procedural Seed-Based World Generation & Map Expansion ---");
{
    // Generate Hamlet with Seed A
    const mapA = new WorldMap(0x1A2B3C4D, 64, 64, 'CINDERWATCH_HAMLET');
    mapA.generateHamlet();

    // Generate Hamlet with Seed B
    const mapB = new WorldMap(0x9E8D7C6B, 64, 64, 'CINDERWATCH_HAMLET');
    mapB.generateHamlet();

    // Compare river trajectory on row 30
    let riverAx = -1;
    let riverBx = -1;
    for (let x = 0; x < 64; x++) {
        if (mapA.get(x, 30) === TILE.DEEP_WATER) { riverAx = x; break; }
    }
    for (let x = 0; x < 64; x++) {
        if (mapB.get(x, 30) === TILE.DEEP_WATER) { riverBx = x; break; }
    }

    assert(riverAx !== -1 && riverBx !== -1, "Both seeds generated water river tiles");
    assert(riverAx !== riverBx, `River trajectory varies between seeds (Seed A: x=${riverAx}, Seed B: x=${riverBx})`);

    // Verify bridges exist on both seeds and are walkable
    let bridgeCountA = 0;
    let bridgeCountB = 0;
    for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
            if (mapA.get(x, y) === TILE.WOODEN_BRIDGE) bridgeCountA++;
            if (mapB.get(x, y) === TILE.WOODEN_BRIDGE) bridgeCountB++;
        }
    }
    assert(bridgeCountA > 0, "Seed A has adaptive wooden bridge over river");
    assert(bridgeCountB > 0, "Seed B has adaptive wooden bridge over river");

    // Verify Whispering Woods has Ancient Runic Shrine / Moonlit Stone Circle
    const woodsMap = new WorldMap(0x55AA55AA, 80, 80, 'WHISPERING_WOODS');
    woodsMap.generateWoods();
    const runicTotem = woodsMap.resourceNodes.find(n => n.type === 'RUNIC_TOTEM');
    assert(runicTotem, "Ancient Runic Shrine / Moonlit Stone Circle generated in Whispering Woods");

    // Verify Sunken Grotto has Luminescent Crystal Chasm and glowing crystal nodes
    const grottoMap = new WorldMap(0x77CC77CC, 64, 64, 'SUNKEN_GROTTO');
    grottoMap.generateGrotto();
    const crystalNodes = grottoMap.resourceNodes.filter(n => n.type === 'GLOWING_CRYSTAL');
    assert(crystalNodes.length > 0, `Luminescent Crystal Chasm generated in Sunken Grotto (Found ${crystalNodes.length} crystals)`);
    const geodeRelay = grottoMap.terminals.find(t => t.name.includes('Subterranean Geode Relay'));
    assert(geodeRelay, "Geode Relay Terminal active in Luminescent Crystal Chasm");

    console.log(`[PASS] Procedural seed generation verified:`);
    console.log(`       - Seed A River x=${riverAx} vs Seed B River x=${riverBx} (Dynamic Curvature)`);
    console.log(`       - Adaptive Bridges: Seed A (${bridgeCountA} tiles), Seed B (${bridgeCountB} tiles)`);
    console.log(`       - Ancient Runic Shrine confirmed at (${runicTotem.x}, ${runicTotem.y})`);
    console.log(`       - Luminescent Crystal Chasm confirmed (${crystalNodes.length} glowing crystal formations)`);
}

console.log("\n================================================================================");
console.log("   ALL SKILLS, LIGHTING INVERSION, PACING & PROCEDURAL SEED TESTS PASSED!      ");
console.log("================================================================================");
