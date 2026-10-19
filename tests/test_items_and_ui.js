const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Verify HTML and Assets
const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(!htmlContent.includes('id="game-footer"'), 'game-footer must be removed from index.html');
assert(!htmlContent.includes('id="center-buttons"'), 'center-buttons must be removed from touch controls');
assert(!htmlContent.includes('btn-touch-settings'), 'btn-touch-settings must be removed');
assert(htmlContent.includes('id="inventory-grid"'), 'inventory-grid must exist');
assert(htmlContent.includes('id="equipped-gear-bar"'), 'equipped-gear-bar must exist');
console.log('✓ index.html structure verified (no duplicate footer, no center buttons, clean inventory modal)');

const svgContent = fs.readFileSync(path.join(__dirname, '../assets/logo.svg'), 'utf8');
assert(svgContent.includes('clipPath id="circle-logo-clip"'), 'assets/logo.svg must have circular clipPath');
assert(svgContent.includes('<circle cx="180" cy="145" r="140"'), 'assets/logo.svg must have circular border and base');
assert(!svgContent.includes('M 0 290 L 360 290 L 360 0 L 0 0 Z'), 'assets/logo.svg must not have rectangular background');
console.log('✓ assets/logo.svg verified (strictly circular)');

// 2. Verify Inventory & Items
const { ITEM_TYPE, BASE_ITEMS, CRAFTING_RECIPES, Inventory } = require('../engine/inventory.js');
assert(BASE_ITEMS.ULTRASONIC_SWORD, 'ULTRASONIC_SWORD must exist');
assert(BASE_ITEMS.CHRONO_STASIS_ELIXIR, 'CHRONO_STASIS_ELIXIR must exist');
assert(BASE_ITEMS.BERSERKER_STIM, 'BERSERKER_STIM must exist');
assert(BASE_ITEMS.AEGIS_BARRIER_FLASK, 'AEGIS_BARRIER_FLASK must exist');
assert(BASE_ITEMS.GAIA_NECTAR, 'GAIA_NECTAR must exist');
assert(BASE_ITEMS.VANGUARD_CHESTPLATE, 'VANGUARD_CHESTPLATE must exist');
assert(BASE_ITEMS.CHRONO_AMULET, 'CHRONO_AMULET must exist');
console.log('✓ All item definitions confirmed in BASE_ITEMS');

// Mock Player
const mockPlayer = {
    hp: 50,
    maxHp: 100,
    energy: 20,
    maxEnergy: 100,
    attackDamageBonus: 0,
    defenseBonus: 0,
    stasisTimer: 0,
    berserkerTimer: 0,
    barrierShield: 0,
    regenTimer: 0,
    regenRate: 0,
    hasTorchActive: false
};

const inv = new Inventory(16);
assert.strictEqual(inv.maxSlots, 16);

// Test Healing & Energy Consumables
inv.addItem(BASE_ITEMS.NANITE_REPAIR_KIT, 1);
const useHealRes = inv.useItem('NANITE_REPAIR_KIT', mockPlayer);
assert(useHealRes.success, 'Nanite repair kit should be used');
assert.strictEqual(mockPlayer.hp, 95, 'HP should heal +45 (50 -> 95)');

// Test Chrono Stasis Elixir
inv.addItem(BASE_ITEMS.CHRONO_STASIS_ELIXIR, 1);
const useStasisRes = inv.useItem('CHRONO_STASIS_ELIXIR', mockPlayer);
assert(useStasisRes.success);
assert.strictEqual(mockPlayer.stasisTimer, 5.0, 'Stasis timer should be 5.0s');

// Test Berserker Stim
inv.addItem(BASE_ITEMS.BERSERKER_STIM, 1);
const useBerserkRes = inv.useItem('BERSERKER_STIM', mockPlayer);
assert(useBerserkRes.success);
assert.strictEqual(mockPlayer.berserkerTimer, 12.0, 'Berserker timer should be 12.0s');

// Test Aegis Barrier Flask
inv.addItem(BASE_ITEMS.AEGIS_BARRIER_FLASK, 1);
const useBarrierRes = inv.useItem('AEGIS_BARRIER_FLASK', mockPlayer);
assert(useBarrierRes.success);
assert.strictEqual(mockPlayer.barrierShield, 60, 'Barrier shield should absorb 60');

// Test Gaia Nectar
inv.addItem(BASE_ITEMS.GAIA_NECTAR, 1);
const useRegenRes = inv.useItem('GAIA_NECTAR', mockPlayer);
assert(useRegenRes.success);
assert.strictEqual(mockPlayer.regenTimer, 10.0);
assert.strictEqual(mockPlayer.regenRate, 8.0);

// Test Weapon Equipping
inv.addItem(BASE_ITEMS.ULTRASONIC_SWORD, 1);
const equipWepRes = inv.useItem('ULTRASONIC_SWORD', mockPlayer);
assert(equipWepRes.success);
assert.strictEqual(inv.equippedWeapon.id, 'ULTRASONIC_SWORD');
assert.strictEqual(mockPlayer.attackDamageBonus, 15);

// Test Weapon Unequipping
const unequipWepRes = inv.useItem('ULTRASONIC_SWORD', mockPlayer);
assert(unequipWepRes.success);
assert.strictEqual(inv.equippedWeapon, null);
assert.strictEqual(mockPlayer.attackDamageBonus, 0);

// Test Armor Equipping
inv.addItem(BASE_ITEMS.VANGUARD_CHESTPLATE, 1);
const equipArmRes = inv.useItem('VANGUARD_CHESTPLATE', mockPlayer);
assert(equipArmRes.success);
assert.strictEqual(inv.equippedArmor.id, 'VANGUARD_CHESTPLATE');
assert.strictEqual(mockPlayer.defenseBonus, 20);

console.log('✓ Inventory and Item Mechanics test passed successfully!');

// 3. Test Combat integration
const { Character, CHARACTER_CLASS } = require('../engine/combat.js');
const hero = new Character(CHARACTER_CLASS.SUPER_SOLDIER, 100, 100);

// Test Stasis Invulnerability
hero.stasisTimer = 3.0;
const stasisHit = hero.takeDamage(50);
assert.strictEqual(stasisHit.damageTaken, 0, 'Stasis must grant total invulnerability');
assert(stasisHit.stasisImmune, 'stasisImmune should be true');

// Clear stasis, test Barrier Shield Absorption
hero.stasisTimer = 0;
hero.invulnerableTimer = 0;
hero.barrierShield = 40;
const barrierHit = hero.takeDamage(25);
assert.strictEqual(barrierHit.damageTaken, 0, 'Barrier must absorb entire 25 damage');
assert.strictEqual(hero.barrierShield, 15, 'Remaining barrier should be 15');

// Clear i-frames, test Damage Beyond Barrier
hero.invulnerableTimer = 0;
const breakBarrierHit = hero.takeDamage(30);
assert.strictEqual(hero.barrierShield, 0, 'Barrier should be depleted');
assert(hero.hp < 140, 'Player HP should take leftover damage');

// Test Armor Defense Mitigation
hero.invulnerableTimer = 0;
hero.defenseBonus = 20;
const armorHit = hero.takeDamage(30);
assert(armorHit.damageTaken < 30, 'Armor defense must reduce damage taken');
assert.strictEqual(armorHit.damageTaken, 20, 'Damage 30 - (20*0.5) = 20');

// Test Berserker Damage Multiplier
hero.berserkerTimer = 5.0;
const dummyEnemy = { x: 120, y: 100, hp: 200 };
hero.pos.x = 100;
hero.pos.y = 100;
hero.facing = { x: 1, y: 0, clone: () => ({ x: 1, y: 0, normalize: () => ({ x: 1, y: 0 }) }) };
hero.primaryAttack([dummyEnemy]);
assert(dummyEnemy.hp < 200, 'Enemy must take damage from primary attack');

// 4. Test 6-Tier RPG System and Item Classification
const { ITEM_TIER, TIER_CONFIG, ITEM_CATEGORY, getBloodDropSvg } = require('../engine/inventory.js');
assert.strictEqual(Object.keys(ITEM_TIER).length, 6, 'Must define all 6 RPG tiers (T1 to T6)');
assert.strictEqual(TIER_CONFIG[ITEM_TIER.MYTHIC].name, 'Mythic');

const allItems = Object.values(BASE_ITEMS);
assert(allItems.length >= 25, 'Item catalog must have extensive coverage');

const tiersFound = new Set();
const categoriesFound = new Set();
for (const item of allItems) {
    assert(item.tier >= 1 && item.tier <= 6, `Item ${item.id} has invalid tier: ${item.tier}`);
    assert(item.tierBadge && item.tierBadge.startsWith('T'), `Item ${item.id} must have tier badge`);
    assert(item.tierColor && item.tierColor.startsWith('#'), `Item ${item.id} must have tier color hex`);
    assert(item.category, `Item ${item.id} must have a designated category`);
    assert(typeof item.source === 'string' && item.source.length > 5, `Item ${item.id} must have descriptive source`);
    tiersFound.add(item.tier);
    categoriesFound.add(item.category);
}
assert.strictEqual(tiersFound.size, 6, 'All 6 tiers must be represented in BASE_ITEMS');
assert.strictEqual(categoriesFound.size, 5, 'All 5 categories must be represented in BASE_ITEMS');

// Verify Strict Found/Collected vs. Craftable Mechanics
const rawMaterials = ['BRANCH', 'FLINT', 'MEDICINAL_HERB', 'COPPER_ORE', 'FIBER', 'STAR_FRUIT', 'AETHER_CRYSTAL', 'VOID_SHARD', 'CELESTIAL_KEY', 'STAR_MATRIX_TOKEN', 'PRIMORDIAL_CORE'];
for (const matId of rawMaterials) {
    assert(BASE_ITEMS[matId], `Raw material ${matId} must exist`);
    assert.strictEqual(BASE_ITEMS[matId].isCraftable, false, `Raw material ${matId} cannot be crafted - must be found/collected`);
}

for (const recipe of CRAFTING_RECIPES) {
    const resId = recipe.resultId || recipe.resultItemId;
    const output = BASE_ITEMS[resId];
    assert(output, `Crafting recipe ${recipe.id} output ${resId} must exist in BASE_ITEMS`);
    assert.strictEqual(output.isCraftable, true, `Recipe output ${resId} must have isCraftable: true`);
}
console.log('✓ 6-Tier RPG classification and Found vs. Craftable mechanics verified!');

// 5. Verify Universal Blood Drop Currency Symbol
const bloodSvg = getBloodDropSvg(24, '#ff1744');
assert(bloodSvg.includes('<svg'), 'getBloodDropSvg must return valid SVG markup');
assert(bloodSvg.includes('viewBox="0 0 24 32"'), 'getBloodDropSvg must have 24x32 viewBox');
assert(bloodSvg.includes('<ellipse'), 'getBloodDropSvg must render microscopic cell discs');
assert(!bloodSvg.toLowerCase().includes('gold') && !bloodSvg.toLowerCase().includes('coin'), 'Currency symbol must not contain words gold or coin');
console.log('✓ Blood Drop Currency Symbol SVG verified!');

// 6. Test Tier VI Combat Mechanics (Life Steal & Armor Reflection)
const scythe = BASE_ITEMS.PRIMORDIAL_VOID_SCYTHE;
assert.strictEqual(scythe.tier, 6, 'Void Scythe must be Tier VI Mythic');
assert.strictEqual(scythe.lifeSteal, 0.35, 'Void Scythe must provide 35% life steal');

hero.hp = 80;
hero.maxHp = 150;
hero.attackCooldown = 0;
hero.state = 'IDLE';
hero.weaponLifeSteal = scythe.lifeSteal;
hero.attackDamageBonus = scythe.damageBonus;
hero.pos.x = 100;
hero.pos.y = 100;
const scytheTarget = { x: 120, y: 100, hp: 300 };
hero.primaryAttack([scytheTarget]);
assert(hero.hp > 80, `Life steal must heal hero when attacking with Tier VI weapon (hp: ${hero.hp})`);

// Test Armor Damage Reflection (Genesis Starmantle)
const mantle = BASE_ITEMS.GENESIS_STARMANTLE;
assert.strictEqual(mantle.tier, 6, 'Genesis Starmantle must be Tier VI Mythic');
assert.strictEqual(mantle.reflectDamage, 0.25, 'Genesis Starmantle must reflect 25% damage');
hero.armorReflect = mantle.reflectDamage;
hero.defenseBonus = mantle.defenseBonus;
hero.invulnerableTimer = 0;
const reflectResult = hero.takeDamage(40);
assert.strictEqual(reflectResult.damageReflected, 10, '25% of 40 incoming damage must be reflected');

// Test Fortify Tonic Duration and Defense
inv.addItem(BASE_ITEMS.FORTIFIED_ELIXIR, 1);
const fortifyRes = inv.useItem('FORTIFIED_ELIXIR', hero);
assert(fortifyRes.success, 'Fortified elixir must be consumable');
assert.strictEqual(hero.fortifyTimer, 20.0, 'Fortify timer should be 20s');
assert.strictEqual(hero.fortifyDefense, 30, 'Fortify defense should be 30');

console.log('✓ Tier VI Mythic Combat Integration (Life Steal, Reflection, Fortify) verified!');
console.log('ALL TESTS PASSED!');
