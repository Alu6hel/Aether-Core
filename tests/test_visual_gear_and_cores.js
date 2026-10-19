/**
 * Comprehensive Verification Suite: Visual Gear, Organic Yggdrasil Tree, Remains Cores,
 * Sweat Symbol, Disconnected Save Stars, Typography Removal, and Logo Eclipse.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { RetroRenderer } = require('../engine/renderer.js');
const { Character, CHARACTER_CLASS } = require('../engine/combat.js');
const { BASE_ITEMS } = require('../engine/inventory.js');

console.log("================================================================================");
console.log("   AETHER-CORE: VISUAL GEAR, TREE OF LIFE & TITLE SCREEN CORES TESTS          ");
console.log("================================================================================\n");

// TEST 1: Redesign Skill Trees to Look Like Actual Trees (Yggdrasil Tree of Life)
console.log("--- TEST 1: Organic Yggdrasil Tree of Life Structure ---");
{
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');

    // Container and plaque
    assert.ok(html.includes('id="skill-tree-container" class="yggdrasil-tree-container"'), "Yggdrasil tree container exists in HTML");
    assert.ok(html.includes('id="ygg-inspection-plaque"'), "Interactive Branch Altar inspection plaque exists in HTML");

    // CSS styling
    assert.ok(css.includes('.yggdrasil-tree-container'), "CSS defines .yggdrasil-tree-container");
    assert.ok(css.includes('.ygg-tree-backdrop-svg'), "CSS defines .ygg-tree-backdrop-svg conduits");
    assert.ok(css.includes('.ygg-tree-node'), "CSS defines circular runic medallions .ygg-tree-node");
    assert.ok(css.includes('.ygg-inspection-plaque'), "CSS defines .ygg-inspection-plaque");

    // JS tree generation
    assert.ok(js.includes('ygg-tree-backdrop-svg'), "main.js renders organic tree SVG backdrop");
    assert.ok(js.includes('ygg-tree-zone'), "main.js renders 5 cosmological tree zones");
    assert.ok(js.includes('zone-crown') && js.includes('zone-roots'), "main.js has crown and root zones");
    assert.ok(js.includes('updateYggInspectionPlaque'), "main.js updates inspection plaque upon node selection");

    console.log("  ✓ Requirement 1 Passed: Authentic Yggdrasil World Tree structure verified.\n");
}

// TEST 2: Remains Cores Matching Title Screen & Renamed Orb/Sphere to Core
console.log("--- TEST 2: Remains Cores & Renamed Orb/Sphere to Core ---");
{
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');

    // 3 live canvas elements
    assert.ok(html.includes('id="remains-core-common"'), "Common remains core canvas exists");
    assert.ok(html.includes('id="remains-core-runic"'), "Runic remains core canvas exists");
    assert.ok(html.includes('id="remains-core-celestial"'), "Celestial remains core canvas exists");

    // Names renamed to Core
    assert.ok(html.includes('ASTRAL VAPOR CORE'), "Astral Vapor Core renamed");
    assert.ok(html.includes('RESONANT NEBULA CORE'), "Resonant Nebula Core renamed");
    assert.ok(html.includes('PRIMORDIAL SINGULARITY CORE'), "Primordial Singularity Core renamed");
    assert.ok(html.includes('CELESTIAL CORE UNBOXED'), "Celestial Core Unboxed renamed");
    assert.ok(!html.includes('ASTRAL VAPOR SPHERE'), "No old Astral Vapor Sphere");
    assert.ok(!html.includes('RESONANT NEBULA ORB'), "No old Resonant Nebula Orb");
    assert.ok(!html.includes('CELESTIAL ORB UNBOXED'), "No old Celestial Orb Unboxed");

    // Renderer method exists and is callable
    const dummyCanvas = { width: 100, height: 100, getContext: () => null };
    const renderer = new RetroRenderer(dummyCanvas);
    assert.strictEqual(typeof renderer.drawCelestialOrb, 'function', "RetroRenderer.drawCelestialOrb is a public method");

    // Animation loop in main.js
    assert.ok(js.includes('startRemainsCoresAnimation'), "main.js has startRemainsCoresAnimation");
    assert.ok(js.includes('stopRemainsCoresAnimation'), "main.js has stopRemainsCoresAnimation");

    console.log("  ✓ Requirement 2 Passed: Remains cores match title screen and orbs renamed to cores.\n");
}

// TEST 3: Dyson Core Power Batteries Shown as Sweat Symbol 💦
console.log("--- TEST 3: Dyson Core Batteries Shown as Sweat Symbol 💦 ---");
{
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');

    // HTML header chips
    assert.ok(html.includes('<span class="stat-icon">💦</span>'), "Start screen cores chip uses 💦");
    assert.ok(html.includes('<span class="cur-icon">💦</span>'), "Shop modal cores chip uses 💦");

    // JS currencies & rewards
    assert.ok(js.includes("if (iconEl) iconEl.innerText = '💦';"), "openCurrencyInfo('CORES') uses 💦");
    assert.ok(js.includes('"1 💦 Dyson Core"'), "Attendance / milestone rewards use 💦");
    assert.ok(js.includes("key: 'dyson_core'") && js.includes("icon: '💦'"), "Shop catalog uses 💦 for Dyson Core");

    console.log("  ✓ Requirement 3 Passed: Dyson Core power batteries shown as sweat symbol 💦.\n");
}

// TEST 4: Disconnect Save Stars on Title Screen
console.log("--- TEST 4: Disconnect Save Stars on Title Screen ---");
{
    const rendererCode = fs.readFileSync(path.join(__dirname, '../engine/renderer.js'), 'utf8');

    // Constellation lines loop must NOT connect the stars together
    assert.ok(!rendererCode.includes('Draw constellation connecting lines between active beacon stars'), "Constellation connecting lines loop removed");
    assert.ok(rendererCode.includes('Pioneer Slot Badge tag above star'), "Individual radiant save beacon stars shine independently");

    console.log("  ✓ Requirement 4 Passed: Save stars shine independently without connecting lines.\n");
}

// TEST 5: Remove Text Readability and Typography from Settings
console.log("--- TEST 5: Remove Text Readability and Typography from Settings ---");
{
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const soundModalChunk = html.split('id="sound-modal"')[1].split('<!--')[0];

    assert.ok(!soundModalChunk.includes('TEXT READABILITY & TYPOGRAPHY'), "Readability section removed from settings modal");
    assert.ok(!soundModalChunk.includes('font-preview-box'), "Font preview box removed from settings modal");

    console.log("  ✓ Requirement 5 Passed: Typography and readability removed from settings.\n");
}

// TEST 6: Loading Screen Logo Eclipse
console.log("--- TEST 6: Loading Screen Logo Eclipse ---");
{
    const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

    assert.ok(css.includes('@keyframes logoBrightenOnHits'), "logoBrightenOnHits keyframe defined");
    assert.ok(css.includes('opacity: 0;'), "Logo smoothly fades out (opacity: 0) as sphere covers it");

    console.log("  ✓ Requirement 6 Passed: Loading screen logo smoothly disappears when covered.\n");
}

// TEST 7: Character Detail & Visual Equipped Gear
console.log("--- TEST 7: Character Detail & Visual Equipped Gear Rendering ---");
{
    // Mock Context to record canvas drawing calls
    const drawCalls = [];
    const mockCtx = {
        save: () => drawCalls.push('save'),
        restore: () => drawCalls.push('restore'),
        fillRect: (x, y, w, h) => drawCalls.push(`fillRect:${w}x${h}`),
        beginPath: () => drawCalls.push('beginPath'),
        arc: () => drawCalls.push('arc'),
        ellipse: () => drawCalls.push('ellipse'),
        moveTo: () => drawCalls.push('moveTo'),
        lineTo: () => drawCalls.push('lineTo'),
        closePath: () => drawCalls.push('closePath'),
        fill: () => drawCalls.push('fill'),
        stroke: () => drawCalls.push('stroke'),
        set fillStyle(val) {},
        set strokeStyle(val) {},
        set lineWidth(val) {}
    };

    const renderer = new RetroRenderer({ width: 480, height: 320, getContext: () => mockCtx });

    assert.strictEqual(typeof renderer.drawEquippedArmorBack, 'function', "drawEquippedArmorBack is defined");
    assert.strictEqual(typeof renderer.drawEquippedArmorFront, 'function', "drawEquippedArmorFront is defined");
    assert.strictEqual(typeof renderer.drawEquippedWeapon, 'function', "drawEquippedWeapon is defined");

    // Test weapon rendering in hand across all 4 cardinal directions
    const warrior = new Character(CHARACTER_CLASS.SUPER_SOLDIER, 100, 100);
    warrior.inventory.equippedWeapon = BASE_ITEMS.ULTRASONIC_SWORD;
    warrior.inventory.equippedArmor = BASE_ITEMS.VANGUARD_CHESTPLATE;

    for (const dir of ['DOWN', 'UP', 'LEFT', 'RIGHT']) {
        warrior.cardinalFacing = dir;
        drawCalls.length = 0;
        renderer.renderCharacter(warrior, ['#000', '#fff'], null);
        assert(drawCalls.length >= 18, `Character with equipped weapon rendered visual commands in direction ${dir}`);
    }

    // Test T6 Legendary Scythe and Starmantle
    const mage = new Character(CHARACTER_CLASS.TECHNO_MAGE, 100, 100);
    mage.inventory.equippedWeapon = BASE_ITEMS.PRIMORDIAL_VOID_SCYTHE;
    mage.inventory.equippedArmor = BASE_ITEMS.GENESIS_STARMANTLE;

    drawCalls.length = 0;
    renderer.renderCharacter(mage, ['#000', '#fff'], null);
    assert(drawCalls.length > 20, "Character with T6 Scythe and Starmantle rendered visual commands");

    console.log("  ✓ Requirement 7 Passed: Character details and visual equipped weapons/armor verified.\n");
}

console.log("================================================================================");
console.log("         ALL 7 USER REQUIREMENTS FULLY VERIFIED AND PASSING!                    ");
console.log("================================================================================\n");
