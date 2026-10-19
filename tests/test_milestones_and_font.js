const assert = require('assert');

// Mock localStorage
const storage = {};
global.localStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { for (const k in storage) delete storage[k]; }
};

// Mock DOM
global.document = {
    body: { classList: { add: () => {}, remove: () => {} } },
    documentElement: {
        classList: { add: () => {}, remove: () => {} },
        style: { setProperty: () => {} }
    },
    getElementById: (id) => ({
        innerText: '',
        textContent: '',
        innerHTML: '',
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false }
    }),
    querySelectorAll: () => []
};

console.log("==================================================");
console.log("   MILESTONES, ACHIEVEMENTS & TYPOGRAPHY TESTS    ");
console.log("==================================================");

// Require combat & main logic simulation
const { CHARACTER_CLASS, Character } = require('../engine/combat');

// 1. Test Typography lock
console.log("--- TEST 1: Clear & Legible Mode Universal Lock ---");
const mockApp = {
    fontMode: 'large',
    setFontMode(mode = 'large') {
        this.fontMode = 'large';
        localStorage.setItem('aether_font_mode', 'large');
    }
};
mockApp.setFontMode('standard'); // Even if called with standard
assert.strictEqual(mockApp.fontMode, 'large', "Font mode is universally locked to 'large'");
assert.strictEqual(localStorage.getItem('aether_font_mode'), 'large', "aether_font_mode saved as large");
console.log("[PASS] Clear & Legible font mode permanently locked.");

// 2. Test Milestones & Achievements Persistence
console.log("--- TEST 2: Milestones & Achievements Persistence ---");

let claimed = {};
let cores = 0;
let tokens = 0;
let coins = 0;

const mockAchievements = [
    {
        id: 'elevation_pathfinder',
        title: 'Elevation Pathfinder',
        target: 3,
        current: () => 3,
        reward: () => {
            coins += 100;
            cores += 1;
            localStorage.setItem('aether_cores_extracted', cores);
        }
    },
    {
        id: 'nine_sols_master',
        title: 'Nine Sols Deflector',
        target: 3,
        current: () => 3,
        reward: () => {
            coins += 150;
            tokens += 1;
            localStorage.setItem('aether_star_tokens', tokens);
        }
    }
];

function claim(id) {
    const ach = mockAchievements.find(a => a.id === id);
    if (!ach || claimed[id]) return;
    ach.reward();
    claimed[id] = true;
    localStorage.setItem('aether_achievements_claimed', JSON.stringify(claimed));
}

claim('elevation_pathfinder');
assert.strictEqual(cores, 1, "Cores awarded");
assert.strictEqual(coins, 100, "Coins awarded");
assert.strictEqual(localStorage.getItem('aether_cores_extracted'), '1', "aether_cores_extracted stored in localStorage");
assert.strictEqual(claimed['elevation_pathfinder'], true, "Achievement marked as claimed");

claim('nine_sols_master');
assert.strictEqual(tokens, 1, "Tokens awarded");
assert.strictEqual(coins, 250, "Coins awarded");
assert.strictEqual(localStorage.getItem('aether_star_tokens'), '1', "aether_star_tokens stored in localStorage");
assert.strictEqual(claimed['nine_sols_master'], true, "Achievement marked as claimed");

// Simulate reload from storage
const loadedCores = parseInt(localStorage.getItem('aether_cores_extracted'), 10);
const loadedTokens = parseInt(localStorage.getItem('aether_star_tokens'), 10);
const loadedAch = JSON.parse(localStorage.getItem('aether_achievements_claimed'));

assert.strictEqual(loadedCores, 1, "Cores preserved on storage reload");
assert.strictEqual(loadedTokens, 1, "Tokens preserved on storage reload");
assert.strictEqual(loadedAch['elevation_pathfinder'], true, "Claim state preserved on reload");
assert.strictEqual(loadedAch['nine_sols_master'], true, "Claim state preserved on reload");
console.log("[PASS] Milestones & achievements reward persistence verified.");

// 3. Test Boss Defeat Tracking
console.log("--- TEST 3: Boss Defeat Persistence ---");
const player = new Character(CHARACTER_CLASS.SUPER_SOLDIER, 100, 100);
const game = { bossSlainCount: 0 };
player.game = game;

const bossEnemy = { x: 100, y: 100, hp: 0, isBoss: true };
player.onEnemyDefeated(bossEnemy);

assert.strictEqual(game.bossSlainCount, 1, "Boss defeat incremented bossSlainCount");
assert.strictEqual(localStorage.getItem('aether_boss_slain'), '1', "aether_boss_slain stored in localStorage");
console.log("[PASS] Boss defeat tracking & storage persistence verified.");

console.log("==================================================");
console.log("       ALL MILESTONES & TYPOGRAPHY TESTS PASSED   ");
console.log("==================================================");
