/**
 * Aether-Core: Full Logic & Edge API Integration Verification
 * Tests Inventory, State Storage, Market Bonding Curve, and Cloudflare Worker Endpoints.
 */

const assert = require('assert');
const { Inventory, BASE_ITEMS } = require('../engine/inventory.js');
const { GameStorage } = require('../engine/storage.js');
const { AluCoinBondingCurve } = require('../engine/alu_core.js');
const { onRequestGet, onRequestPost } = require('../../ALUMUNGANDR/functions/api/world.js');

console.log("==================================================");
console.log("     AETHER-CORE EXTENDED LOGIC VERIFICATION     ");
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

// 1. Inventory & Consumable Healing Logic
test("Inventory: Add, stack, and consume Nanite Repair Gel", () => {
    const inv = new Inventory(10);
    assert(inv.hasItem('NANITE_REPAIR_KIT'), "Should have starter repair kits");
    
    // Add sword
    inv.addItem(BASE_ITEMS.ULTRASONIC_SWORD, 1);
    assert(inv.hasItem('ULTRASONIC_SWORD'), "Sword added to inventory");

    // Mock player with low health
    const mockPlayer = { hp: 50, maxHp: 100, energy: 30, maxEnergy: 100 };
    const used = inv.useItem('NANITE_REPAIR_KIT', mockPlayer);
    assert.strictEqual(used, true, "Item consumed successfully");
    assert.strictEqual(mockPlayer.hp, 95, "Player healed for 45 HP");
});

// 2. Boss Loot Drop Roll
test("Inventory: Deterministic Boss Drop rolls Genesis Relic and ALU Coins", () => {
    const mockPrng = {
        range: (min, max) => max // Roll max payout
    };
    const loot = Inventory.rollDrop('AEGIS_DREADNOUGHT', mockPrng);
    assert(loot.coins >= 40, "Boss must award massive coin bounty");
    assert.strictEqual(loot.item.id, 'DYSON_SEED_RELIC', "Boss drops Genesis Relic");
});

// 3. GameStorage Persistence
test("GameStorage: In-memory fallback and JSON schema preservation", () => {
    const storage = new GameStorage('TEST_STATE');
    const mockState = { seed: 0x99887766, isFarmerUnlocked: true, coins: 420 };
    storage.save(mockState);

    const loaded = storage.load();
    assert.deepStrictEqual(loaded, mockState, "Loaded state must match saved state exactly");
    storage.clear();
    assert.strictEqual(storage.load(), null, "State cleared successfully");
});

// 4. Bonding Curve Market Actions
test("Bonding Curve: Complete Buy, Sell, and Floor Burn transaction cycle", () => {
    const curve = new AluCoinBondingCurve(0xABCDEF01, 50.0);
    const startFloor = curve.getGuaranteedFloor();

    // 1. Buy
    const buyRes = curve.buy(30.0);
    assert(buyRes.tokensReceived > 0, "Minted tokens on buy");
    
    // 2. Sell
    const sellRes = curve.sell(5.0);
    assert(sellRes.aluReturned > 0, "ALU returned on sell");

    // 3. Floor Burn
    const floorRes = curve.burnForFloor(2.0);
    assert(floorRes.aluRedeemed > 0, "Emergency liquidation successful");
    assert(curve.genesisVault >= 0, "Genesis Vault remains solvent");
});

// 5. Cloudflare Edge Function: GET /api/world/:seed
test("Edge API: onRequestGet returns 8-color palette and bonding curve data", async () => {
    const req = { url: 'https://alumungandr.com/api/world/2134567890' };
    const res = await onRequestGet({ request: req, env: {} });
    assert.strictEqual(res.status, 200, "Must return HTTP 200");
    const json = JSON.parse(await res.text());
    assert.strictEqual(json.palette.length, 8, "Palette must have 8 colors");
    assert.strictEqual(json.bondingCurve.p0, 1.0, "Base price is 1.0 ALU");
});

// 6. Cloudflare Edge Function: POST /api/world/mint
test("Edge API: onRequestPost registers new world on-chain", async () => {
    const mockBody = { seed: 0x55443322, creator: 'Pioneer_007' };
    const req = {
        url: 'https://alumungandr.com/api/world/mint',
        json: async () => mockBody
    };
    const mockKV = {
        put: async (key, val) => true
    };
    const res = await onRequestPost({ request: req, env: { OBSERVATORY_KV: mockKV } });
    assert.strictEqual(res.status, 200, "Must return HTTP 200");
    const json = JSON.parse(await res.text());
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.creator, 'Pioneer_007');
});

// 7. Cloudflare Edge Function: GET /api/world/leaderboard
test("Edge API: onRequestGet returns crawler leaderboard", async () => {
    const req = { url: 'https://alumungandr.com/api/world/leaderboard' };
    const res = await onRequestGet({ request: req, env: {} });
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(await res.text());
    assert(json.leaderboard.length > 0, "Leaderboard must return crawlers");
});

console.log("==================================================");
setTimeout(() => {
    console.log(`RESULTS: ${passed} / ${total} Tests Passed.`);
    console.log("==================================================");
    if (passed !== total) process.exit(1);
}, 100);
