/**
 * Aether-Core: Inventory, Equipment & Loot Engine
 * 
 * Manages character gear, consumables, ancient keycards for locked vault doors,
 * and deterministic drop tables derived from the world seed.
 */

const ITEM_TYPE = {
    WEAPON: 'WEAPON',
    ARMOR: 'ARMOR',
    CONSUMABLE: 'CONSUMABLE',
    KEY_ITEM: 'KEY_ITEM'
};

const BASE_ITEMS = {
    // Weapons
    ULTRASONIC_SWORD: {
        id: 'ULTRASONIC_SWORD',
        name: 'Ultrasonic Broadsword',
        type: ITEM_TYPE.WEAPON,
        damageBonus: 15,
        speedBonus: 10,
        desc: 'High-frequency vibrating blade engineered for kinetic momentum strikes.'
    },
    PHOTON_EMITTER: {
        id: 'PHOTON_EMITTER',
        name: 'Arcane Photon Staff',
        type: ITEM_TYPE.WEAPON,
        damageBonus: 12,
        speedBonus: 0,
        desc: 'Particle emitter disguised as an arcane brass relic.'
    },
    COSMIC_HOE: {
        id: 'COSMIC_HOE',
        name: 'Hoe of Event Horizons',
        type: ITEM_TYPE.WEAPON,
        damageBonus: 99,
        speedBonus: 25,
        desc: 'Agricultural deity implement that tills the fabric of spacetime.'
    },

    // Consumables
    NANITE_REPAIR_KIT: {
        id: 'NANITE_REPAIR_KIT',
        name: 'Nanite Repair Gel',
        type: ITEM_TYPE.CONSUMABLE,
        healAmount: 45,
        desc: 'Rapidly restructures tissue and synthetic polymer plating.'
    },
    OVERCLOCK_CELL: {
        id: 'OVERCLOCK_CELL',
        name: 'Quantum Overclock Cell',
        type: ITEM_TYPE.CONSUMABLE,
        energyAmount: 60,
        desc: 'Floods the nervous system with high-density atmospheric flux.'
    },

    // Key Items
    SUB_CORE_KEYCARD: {
        id: 'SUB_CORE_KEYCARD',
        name: 'Sub-Bedrock Access Pass',
        type: ITEM_TYPE.KEY_ITEM,
        desc: 'Unlocks the titanium blast door guarding the Dyson core reactor.'
    },
    DYSON_SEED_RELIC: {
        id: 'DYSON_SEED_RELIC',
        name: 'Genesis Core Relic',
        type: ITEM_TYPE.KEY_ITEM,
        desc: 'Encrypted storage crystal containing the master seed of the planetary core.'
    }
};

class Inventory {
    constructor(maxSlots = 16) {
        this.maxSlots = maxSlots;
        this.slots = [];
        this.equippedWeapon = null;
        this.equippedArmor = null;

        // Initialize with default starter items
        this.addItem(BASE_ITEMS.NANITE_REPAIR_KIT, 2);
    }

    addItem(item, count = 1) {
        const existing = this.slots.find(s => s.item.id === item.id);
        if (existing) {
            existing.count += count;
            return true;
        }
        if (this.slots.length < this.maxSlots) {
            this.slots.push({ item, count });
            return true;
        }
        return false; // Inventory full
    }

    removeItem(itemId, count = 1) {
        const index = this.slots.findIndex(s => s.item.id === itemId);
        if (index === -1) return false;

        const slot = this.slots[index];
        if (slot.count > count) {
            slot.count -= count;
        } else {
            this.slots.splice(index, 1);
        }
        return true;
    }

    hasItem(itemId) {
        return this.slots.some(s => s.item.id === itemId);
    }

    useItem(itemId, player) {
        const index = this.slots.findIndex(s => s.item.id === itemId);
        if (index === -1) return false;

        const { item } = this.slots[index];
        if (item.type === ITEM_TYPE.CONSUMABLE) {
            if (item.healAmount) {
                player.hp = Math.min(player.maxHp, player.hp + item.healAmount);
            }
            if (item.energyAmount) {
                player.energy = Math.min(player.maxEnergy, player.energy + item.energyAmount);
            }
            this.removeItem(itemId, 1);
            return true;
        }
        return false;
    }

    static rollDrop(enemyType, prng) {
        // Deterministic loot drop
        const roll = prng.range(0, 100);
        if (enemyType === 'AEGIS_DREADNOUGHT') {
            return {
                coins: prng.range(40, 75),
                item: BASE_ITEMS.DYSON_SEED_RELIC
            };
        } else if (roll < 35) {
            return {
                coins: prng.range(4, 12),
                item: (roll < 18) ? BASE_ITEMS.NANITE_REPAIR_KIT : BASE_ITEMS.OVERCLOCK_CELL
            };
        }
        return { coins: prng.range(2, 6), item: null };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ITEM_TYPE, BASE_ITEMS, Inventory };
}
