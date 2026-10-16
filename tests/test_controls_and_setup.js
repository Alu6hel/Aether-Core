/**
 * Aether-Core: Controls, Setup Flow, and Dev Tools Verification Suite
 */

const assert = require('assert');
const { Character } = require('../engine/combat.js');
const { WorldMap } = require('../engine/world_generator.js');
const { CutsceneEngine } = require('../engine/cutscenes.js');
const { Inventory } = require('../engine/inventory.js');

console.log("==================================================");
console.log("    CONTROLS, SETUP FLOW & DEV TOOLS VERIFY       ");
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

// Mock App Context mimicking main.js
class MockGameApp {
    constructor() {
        this.currentSeed = 0x7F3A59DF;
        this.currentLayer = 'SURFACE';
        this.surfaceMap = new WorldMap(this.currentSeed, 64, 64, 'SURFACE');
        this.subCoreMap = new WorldMap(this.currentSeed, 48, 48, 'SUB_CORE');
        this.currentMap = this.surfaceMap;
        this.selectedClass = 'SUPER_SOLDIER';
        this.pioneerName = 'ALU-01';
        this.player = new Character(this.selectedClass, this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
        this.cutscenes = new CutsceneEngine();
        this.inventory = new Inventory();
        this.isFarmerUnlocked = false;
        this.godMode = false;
        this.lastActionTaken = null;
    }

    getNearestInteractable() {
        const px = this.player.pos.x;
        const py = this.player.pos.y;

        if (this.currentLayer === 'SUB_CORE' && this.currentMap.terminals) {
            for (const term of this.currentMap.terminals) {
                if (Math.hypot(px - term.x, py - term.y) < 32) {
                    return { type: 'TERMINAL', entity: term, label: 'READ LOG' };
                }
            }
        }

        if (this.currentLayer === 'SURFACE' && this.currentMap.caveEntrance) {
            const ce = this.currentMap.caveEntrance;
            if (Math.hypot(px - (ce.x * 16 + 8), py - (ce.y * 16 + 8)) < 28) {
                return { type: 'CAVE_ENTRANCE', label: 'ENTER CORE' };
            }
        }

        return null;
    }

    handleAction() {
        const target = this.getNearestInteractable();
        if (target) {
            this.lastActionTaken = `EXAMINE:${target.type}`;
        } else {
            this.player.primaryAttack(this.currentMap.enemies);
            this.lastActionTaken = 'ATTACK';
        }
    }

    handleDash() {
        this.player.performSkill(this.currentMap.enemies);
        this.lastActionTaken = 'DASH';
    }

    devSkip() {
        if (!this.cutscenes.isComplete) {
            this.cutscenes.activeStep = this.cutscenes.activeSequence.length;
            this.cutscenes.isComplete = true;
            return 'SKIPPED_CUTSCENE';
        }
        if (this.currentLayer === 'SURFACE') {
            this.currentLayer = 'SUB_CORE';
            this.currentMap = this.subCoreMap;
            return 'WARPED_TO_SUB_CORE';
        }
        return 'NORMAL';
    }

    restartPioneer() {
        this.player.hp = this.player.maxHp;
        this.player.energy = this.player.maxEnergy;
        this.player.pos.set(this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
        this.player.vel.set(0, 0);
    }

    toggleGodMode() {
        this.godMode = !this.godMode;
        if (this.godMode) {
            this.player.maxHp = 9999;
            this.player.hp = 9999;
            this.player.maxEnergy = 9999;
            this.player.energy = 9999;
            this.player.attackDamage = 999;
        } else {
            this.player.applyClassStats();
        }
    }

    grantCoins(n) {
        this.player.coinsCollected += n;
    }
}

// 1. Context-Sensitive Action Button A (Attack vs Examine)
test("Button A: Context-sensitive switching between Attack and Examine", () => {
    const app = new MockGameApp();
    
    // Standing in open field -> Primary Attack
    app.handleAction();
    assert.strictEqual(app.lastActionTaken, 'ATTACK', "Should attack when no interactable is near");

    // Move next to Cave Entrance -> Examine
    const ce = app.surfaceMap.caveEntrance;
    app.player.pos.set(ce.x * 16 + 8, ce.y * 16 + 8);
    app.handleAction();
    assert.strictEqual(app.lastActionTaken, 'EXAMINE:CAVE_ENTRANCE', "Should examine cave entrance when in range");
});

// 2. Dash Button C Execution
test("Button C: Dash / Skill triggers kinetic evasion", () => {
    const app = new MockGameApp();
    const prevEnergy = app.player.energy;
    app.handleDash();
    assert.strictEqual(app.lastActionTaken, 'DASH');
    assert(app.player.energy < prevEnergy, "Dash/Skill consumes character energy");
});

// 3. Dev Skip Functionality
test("Dev Tools: Fast-forward cutscene and instant layer warping", () => {
    const app = new MockGameApp();
    app.cutscenes.startIntroSequence();
    assert.strictEqual(app.cutscenes.isComplete, false);

    // Skip cutscene
    const res1 = app.devSkip();
    assert.strictEqual(res1, 'SKIPPED_CUTSCENE');
    assert.strictEqual(app.cutscenes.isComplete, true);

    // Skip layer from Surface to Sub-Core
    const res2 = app.devSkip();
    assert.strictEqual(res2, 'WARPED_TO_SUB_CORE');
    assert.strictEqual(app.currentLayer, 'SUB_CORE');
});

// 4. God Mode & Coin Granting
test("Dev Tools: Toggle God Mode and grant free ALU coins", () => {
    const app = new MockGameApp();
    assert.strictEqual(app.godMode, false);
    
    app.toggleGodMode();
    assert.strictEqual(app.godMode, true);
    assert.strictEqual(app.player.hp, 9999);
    assert.strictEqual(app.player.attackDamage, 999);

    app.grantCoins(100);
    assert.strictEqual(app.player.coinsCollected, 100);

    // Turn off god mode
    app.toggleGodMode();
    assert.strictEqual(app.godMode, false);
    assert.strictEqual(app.player.hp, 140);
});

// 5. Restart Pioneer
test("Pioneer Restart: Resets health, energy, position to spawn", () => {
    const app = new MockGameApp();
    app.player.hp = 10;
    app.player.energy = 5;
    app.player.pos.set(999, 999);

    app.restartPioneer();
    assert.strictEqual(app.player.hp, app.player.maxHp);
    assert.strictEqual(app.player.energy, app.player.maxEnergy);
    assert.strictEqual(app.player.pos.x, app.currentMap.spawnPoint.x);
    assert.strictEqual(app.player.pos.y, app.currentMap.spawnPoint.y);
});

console.log(`\nCONTROLS & DEV SUITE SUMMARY: ${passed}/${total} tests passed.\n`);
if (passed !== total) process.exit(1);
