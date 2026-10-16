/**
 * Aether-Core: ScreenManager & Menu State Machine Test Suite
 */

const assert = require('assert');
const { ScreenManager } = require('../engine/ui_screens.js');
const { Character } = require('../engine/combat.js');
const { WorldMap } = require('../engine/world_generator.js');

console.log("==================================================");
console.log("    AETHER-CORE SCREEN & MENU STATE VERIFICATION   ");
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

// Mock game context
function createMockGame() {
    const seed = 0x7F3A59DF;
    const map = new WorldMap(seed, 32, 32, 'SURFACE');
    const player = new Character('SUPER_SOLDIER', 100, 100);
    return {
        currentSeed: seed,
        currentMap: map,
        player: player,
        selectedClass: 'SUPER_SOLDIER',
        isFarmerUnlocked: false,
        updateHUD: () => {},
        loadNewWorld: function(s) {
            this.currentSeed = s;
            this.currentMap = new WorldMap(s, 32, 32, 'SURFACE');
            this.player = new Character(this.selectedClass, 100, 100);
        }
    };
}

// 1. Initial State & Navigation
test("ScreenManager: Initial state is TITLE screen and menu navigation works", () => {
    const game = createMockGame();
    const screens = new ScreenManager(game);
    assert.strictEqual(screens.currentScreen, 'TITLE', "Starts on TITLE screen");
    assert.strictEqual(screens.selectedMenuIndex, 0, "Initial index is 0 (NEW EXPEDITION)");

    screens.handleInput('s'); // Move down
    assert.strictEqual(screens.selectedMenuIndex, 1, "Index moves to 1 (CONTINUE)");

    screens.handleInput('w'); // Move up
    assert.strictEqual(screens.selectedMenuIndex, 0, "Index wraps/returns to 0");
});

// 2. Select Menu Item & Game Launch
test("ScreenManager: Selecting NEW EXPEDITION transitions to GAMEPLAY", () => {
    const game = createMockGame();
    const screens = new ScreenManager(game);
    screens.selectedMenuIndex = 0;
    screens.handleInput('enter');
    assert.strictEqual(screens.currentScreen, 'GAMEPLAY', "Transitions to GAMEPLAY");
});

// 3. Pause & Resume Flow
test("ScreenManager: Escape / Pause toggle flow", () => {
    const game = createMockGame();
    const screens = new ScreenManager(game);
    screens.currentScreen = 'GAMEPLAY';

    screens.currentScreen = 'PAUSE';
    assert.strictEqual(screens.currentScreen, 'PAUSE');

    screens.handleInput('escape');
    assert.strictEqual(screens.currentScreen, 'GAMEPLAY', "Esc resumes GAMEPLAY");
});

// 4. Character Roster Cycling with Locked/Unlocked Farmer
test("ScreenManager: Roster cycles through classes and skips locked Farmer", () => {
    const game = createMockGame();
    const screens = new ScreenManager(game);
    screens.currentScreen = 'ROSTER';

    assert.strictEqual(game.selectedClass, 'SUPER_SOLDIER');
    screens.cycleRoster(1);
    assert.strictEqual(game.selectedClass, 'TECHNO_MAGE', "Cycled to TECHNO_MAGE");

    screens.cycleRoster(1);
    // Farmer is locked, so it skips to SUPER_SOLDIER
    assert.strictEqual(game.selectedClass, 'SUPER_SOLDIER', "Skipped locked Farmer");

    // Unlock farmer
    game.isFarmerUnlocked = true;
    screens.cycleRoster(1); // To TECHNO_MAGE
    screens.cycleRoster(1); // To FARMER_GOD
    assert.strictEqual(game.selectedClass, 'FARMER_GOD', "Now selects unlocked Farmer");
});

// 5. Game Over and Reboot
test("ScreenManager: GAMEOVER screen transitions back to GAMEPLAY on Enter", () => {
    const game = createMockGame();
    const screens = new ScreenManager(game);
    screens.currentScreen = 'GAMEOVER';

    screens.handleInput('enter');
    assert.strictEqual(screens.currentScreen, 'GAMEPLAY', "Reboots into GAMEPLAY");
});

// 6. Mock Canvas Rendering
test("ScreenManager: Render methods execute without throws on mock 2D context", () => {
    const game = createMockGame();
    const screens = new ScreenManager(game);

    const mockCtx = {
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        set fillStyle(v) {},
        set strokeStyle(v) {},
        set font(v) {},
        set textAlign(v) {},
        set lineWidth(v) {}
    };

    screens.currentScreen = 'TITLE';
    screens.render(mockCtx, 320, 240);

    screens.currentScreen = 'ROSTER';
    screens.render(mockCtx, 320, 240);

    screens.currentScreen = 'PAUSE';
    screens.render(mockCtx, 320, 240);

    screens.currentScreen = 'GAMEOVER';
    screens.render(mockCtx, 320, 240);

    screens.renderMinimap(mockCtx, 320, 240);
    assert(true, "All screen renderers completed cleanly");
});

console.log(`\nSCREEN SUITE SUMMARY: ${passed}/${total} tests passed.\n`);
if (passed !== total) process.exit(1);
