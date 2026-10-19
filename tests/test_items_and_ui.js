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

console.log('✓ Combat buff and equipment mechanics test passed successfully!');
console.log('ALL TESTS PASSED!');
