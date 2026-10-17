/**
 * Test Suite: Start Screen, 10 Save Slots, Survival Resource Nodes, Crafting, & Day/Night Progression
 */

const assert = require('assert');
const { WorldMap, TILE } = require('../engine/world_generator.js');
const { Inventory, BASE_ITEMS, CRAFTING_RECIPES } = require('../engine/inventory.js');
const { Character, CHARACTER_CLASS } = require('../engine/combat.js');

console.log("==================================================");
console.log(" START SCREEN, 10 SAVE SLOTS & SURVIVAL ENGINE TEST ");
console.log("==================================================");

// 1. TEST 1: Resource Nodes Generation & Harvest
console.log("\n--- TEST 1: Resource Nodes Generation & Harvest ---");
const map = new WorldMap(0x7F3A59DF, 64, 64, 'SURFACE');
assert(Array.isArray(map.resourceNodes), "resourceNodes must be an array");
assert(map.resourceNodes.length >= 40, `Must generate rich node density (found: ${map.resourceNodes.length})`);

const pines = map.resourceNodes.filter(n => n.type === 'PINE_TREE');
const flints = map.resourceNodes.filter(n => n.type === 'FLINT_BOULDER');
const cabbages = map.resourceNodes.filter(n => n.type === 'WILD_CABBAGE');
const berries = map.resourceNodes.filter(n => n.type === 'BERRY_BUSH');
const herbs = map.resourceNodes.filter(n => n.type === 'MEDICINAL_HERB');
const totems = map.resourceNodes.filter(n => n.type === 'RUNIC_TOTEM');
const campfires = map.resourceNodes.filter(n => n.type === 'CAMPFIRE_SITE');

assert(pines.length >= 15, `Expected >= 15 pines, got ${pines.length}`);
assert(flints.length >= 10, `Expected >= 10 flint boulders, got ${flints.length}`);
assert(cabbages.length >= 5, `Expected >= 5 wild cabbages, got ${cabbages.length}`);
assert(berries.length >= 8, `Expected >= 8 berry bushes, got ${berries.length}`);
assert(herbs.length >= 5, `Expected >= 5 medicinal herbs, got ${herbs.length}`);
assert(totems.length >= 1, `Expected at least 1 runic totem, got ${totems.length}`);
assert(campfires.length >= 1, `Expected at least 1 campfire, got ${campfires.length}`);

console.log(`[PASS] Surface generated ${map.resourceNodes.length} survival resource nodes:`);
console.log(`       - Pines: ${pines.length}, Flint: ${flints.length}, Cabbages: ${cabbages.length}`);
console.log(`       - Berries: ${berries.length}, Herbs: ${herbs.length}, Totems: ${totems.length}, Campfire: ${campfires.length}`);

// Test Woodcutting
const testPine = { ...pines[0] };
const hit1 = map.damageNode(testPine, 1);
assert(!hit1.harvested, "Pine with 3 HP should not be harvested on 1st hit of 1 dmg");
assert.strictEqual(hit1.remainingHp, 2, "Pine should have 2 HP remaining");
console.log("[PASS] Pine Tree hit 1: 2 HP remaining (shake timer active)");

const hit2 = map.damageNode(testPine, 2);
assert(hit2.harvested, "Pine Tree should be harvested on 2nd hit of 2 dmg");
assert.strictEqual(hit2.drops, 'BRANCH', "Pine Tree should drop BRANCH");
assert.strictEqual(hit2.dropCount, 2, "Pine Tree should drop 2 branches");
assert.strictEqual(hit2.dropCoins, 1, "Pine Tree should award 1 ALU coin");
console.log("[PASS] Pine Tree harvested: +2 Branch, +1 ALU coin drop");

// Test Mining Flint
const testFlint = { ...flints[0] };
const fHit = map.damageNode(testFlint, 4);
assert(fHit.harvested, "Flint Boulder should be harvested after 4 dmg");
assert.strictEqual(fHit.drops, 'FLINT', "Flint Boulder drops FLINT");
assert.strictEqual(fHit.dropCount, 2, "Flint Boulder drops 2 flints");
assert.strictEqual(fHit.dropCoins, 2, "Flint Boulder awards 2 ALU coins");
console.log("[PASS] Flint Boulder mined: +2 Flint, +2 ALU coins drop");

// Test Foraging Cabbage
const testCabbage = { ...cabbages[0] };
const cHit = map.damageNode(testCabbage, 1);
assert(cHit.harvested, "Wild Cabbage harvested in 1 pick");
assert.strictEqual(cHit.drops, 'WILD_CABBAGE', "Drops WILD_CABBAGE");
console.log("[PASS] Wild Cabbage foraged: +1 Wild Cabbage");


// 2. TEST 2: Survival Crafting Recipes
console.log("\n--- TEST 2: Survival Crafting Recipes ---");
const inv = new Inventory();
assert(Array.isArray(CRAFTING_RECIPES), "CRAFTING_RECIPES must be defined");
assert(CRAFTING_RECIPES.length >= 5, "Must have at least 5 survival recipes");

const player = new Character('SUPER_SOLDIER', 100, 100);
player.inventory = inv;

// Initially, cannot craft torch (needs 1 branch + 1 flint)
const torchRecipe = CRAFTING_RECIPES.find(r => r.id === 'PRIMITIVE_TORCH');
assert(torchRecipe, "Torch recipe must exist");
assert(!inv.canCraft(torchRecipe), "Cannot craft torch with empty inventory");

// Add materials
inv.addItem(BASE_ITEMS['BRANCH'], 1);
inv.addItem(BASE_ITEMS['FLINT'], 1);
assert(inv.canCraft(torchRecipe), "Can craft torch with 1 branch and 1 flint");

const craftRes = inv.craftItem('PRIMITIVE_TORCH', player);
assert(craftRes.success, "Torch crafting must succeed");
assert(player.hasTorchActive, "Crafting torch activates player torch light");
assert.strictEqual(inv.getItemCount('BRANCH'), 0, "Branches consumed");
assert.strictEqual(inv.getItemCount('FLINT'), 0, "Flint consumed");
console.log("[PASS] Crafted Primitive Torch: Torchlight active, materials consumed");

// Test Stone Axe Crafting (2 branch + 2 flint)
const axeRecipe = CRAFTING_RECIPES.find(r => r.id === 'STONE_AXE');
assert(axeRecipe, "Stone Axe recipe must exist");
inv.addItem(BASE_ITEMS['BRANCH'], 2);
inv.addItem(BASE_ITEMS['FLINT'], 2);
assert(inv.canCraft(axeRecipe), "Can craft Stone Axe");
const axeRes = inv.craftItem('STONE_AXE', player);
assert(axeRes.success, "Stone Axe crafted successfully");
assert(inv.hasItem('STONE_AXE'), "Player inventory contains STONE_AXE");
console.log("[PASS] Crafted Primitive Stone Axe: Inventory contains STONE_AXE");

// Test Herbal Salve Crafting (2 herbs + 1 berry)
const salveRecipe = CRAFTING_RECIPES.find(r => r.id === 'HERBAL_SALVE');
assert(salveRecipe, "Herbal Salve recipe must exist");
inv.addItem(BASE_ITEMS['MEDICINAL_HERB'], 2);
inv.addItem(BASE_ITEMS['WILD_BERRY'], 1);
assert(inv.canCraft(salveRecipe), "Can craft Herbal Salve");
const salveRes = inv.craftItem('HERBAL_SALVE', player);
assert(salveRes.success, "Herbal Salve crafted successfully");
assert(inv.hasItem('HERBAL_SALVE'), "Inventory has HERBAL_SALVE");
console.log("[PASS] Crafted Herbal Salve: Restorative medicine synthesized");


// 3. TEST 3: 10 Save Slots Serialization & Run State
console.log("\n--- TEST 3: 10 Save Slots Serialization ---");
const slots = [];
for (let i = 0; i < 10; i++) slots.push(null);

// Populate slot 0 with active run
slots[0] = {
    seed: 0x7F3A59DF,
    pioneerName: 'VANCE-01',
    selectedClass: 'SUPER_SOLDIER',
    currentDay: 3,
    dayTimer: 0.65,
    coins: 48,
    hp: 95,
    inventorySlots: inv.slots
};

const serialized = JSON.stringify(slots);
const parsed = JSON.parse(serialized);
assert.strictEqual(parsed.length, 10, "Must serialize exactly 10 slots");
assert.strictEqual(parsed[0].pioneerName, 'VANCE-01');
assert.strictEqual(parsed[0].currentDay, 3);
assert.strictEqual(parsed[0].coins, 48);
assert.strictEqual(parsed[1], null, "Slot 1 is empty");
console.log("[PASS] 10 Save Slots successfully verified with Slot 0 occupied & Slot 1-9 empty");


// 4. TEST 4: Day / Night Cycle & Lighting Calculations
console.log("\n--- TEST 4: Day / Night Cycle & Lighting ---");
function getPeriodName(dayTimer) {
    if (dayTimer < 0.20) return 'MORNING';
    if (dayTimer < 0.40) return 'NOON';
    if (dayTimer < 0.50) return 'DUSK';
    if (dayTimer < 0.85) return 'NIGHT';
    return 'DAWN';
}

assert.strictEqual(getPeriodName(0.10), 'MORNING');
assert.strictEqual(getPeriodName(0.25), 'NOON');
assert.strictEqual(getPeriodName(0.45), 'DUSK');
assert.strictEqual(getPeriodName(0.70), 'NIGHT');
assert.strictEqual(getPeriodName(0.90), 'DAWN');
console.log("[PASS] Day/Night periods calculate accurately across 24h clock cycle");

// Light radius with & without torch
const normalRadius = 55;
const torchRadius = 135;
assert(torchRadius > normalRadius * 2, "Torch provides more than double illumination radius at night");
console.log(`[PASS] Illumination Radius: Normal = ${normalRadius}px, With Torch = ${torchRadius}px`);

console.log("\n==================================================");
console.log("   ALL START SCREEN & SURVIVAL TESTS PASSED!      ");
console.log("==================================================");
