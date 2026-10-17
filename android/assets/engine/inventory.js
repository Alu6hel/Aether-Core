/**
 * Aether-Core: Inventory, Equipment, Survival & Crafting Engine
 * 
 * Manages character gear, consumables, ancient keycards for locked vault doors,
 * survival resources (Branches, Flint, Wild Crops, Torches, Axes) inspired by
 * "The Wild Darkness", and deterministic drop tables derived from the world seed.
 */

const ITEM_TYPE = {
    WEAPON: 'WEAPON',
    ARMOR: 'ARMOR',
    TOOL: 'TOOL',
    CONSUMABLE: 'CONSUMABLE',
    MATERIAL: 'MATERIAL',
    FOOD: 'FOOD',
    KEY_ITEM: 'KEY_ITEM'
};

const BASE_ITEMS = {
    // Weapons & Tools
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
    STONE_AXE: {
        id: 'STONE_AXE',
        name: 'Primitive Stone Axe',
        type: ITEM_TYPE.WEAPON,
        damageBonus: 15,
        speedBonus: 5,
        desc: 'Lashed flint handaxe. Greatly increases woodcutting yield and melee attack damage.'
    },
    PRIMITIVE_TORCH: {
        id: 'PRIMITIVE_TORCH',
        name: 'Primitive Torch',
        type: ITEM_TYPE.TOOL,
        desc: 'Crackling pitch-coated torch. Disperses the pitch-black shadows of night and deep caverns.'
    },

    // Raw Survival Materials ("The Wild Darkness" inspired)
    BRANCH: {
        id: 'BRANCH',
        name: 'Pine Branch',
        type: ITEM_TYPE.MATERIAL,
        desc: 'Sturdy seasoned branch harvested from pine trees. Essential for crafting torches, tools, and fires.'
    },
    FLINT: {
        id: 'FLINT',
        name: 'Flint Stone',
        type: ITEM_TYPE.MATERIAL,
        desc: 'Sharp silicate mineral quarried from boulder outcrops. Used to strike fire and shape primitive blades.'
    },
    MEDICINAL_HERB: {
        id: 'MEDICINAL_HERB',
        name: 'Wild Ley-Herb',
        type: ITEM_TYPE.MATERIAL,
        healAmount: 15,
        desc: 'Aromatic medicinal herb. Can be eaten raw for minor healing or distilled into restorative salves.'
    },

    // Food & Crops
    WILD_CABBAGE: {
        id: 'WILD_CABBAGE',
        name: 'Wild Cabbage',
        type: ITEM_TYPE.FOOD,
        healAmount: 15,
        energyAmount: 25,
        desc: 'Crisp leafy vegetable rich in moisture and nutrients. Restores 15 HP and 25 Energy.'
    },
    WILD_BERRY: {
        id: 'WILD_BERRY',
        name: 'Wild Cluster Berry',
        type: ITEM_TYPE.FOOD,
        healAmount: 10,
        energyAmount: 15,
        desc: 'Sweet-tart purple berries gathered from bushes. Restores 10 HP and 15 Energy.'
    },
    ROASTED_CABBAGE: {
        id: 'ROASTED_CABBAGE',
        name: 'Fire-Roasted Cabbage',
        type: ITEM_TYPE.FOOD,
        healAmount: 30,
        energyAmount: 50,
        desc: 'Savory charred cabbage cooked over open flame. Restores 30 HP and 50 Energy.'
    },
    HERBAL_SALVE: {
        id: 'HERBAL_SALVE',
        name: 'Herbal Restorative Salve',
        type: ITEM_TYPE.CONSUMABLE,
        healAmount: 45,
        desc: 'Concentrated paste of wild herbs and crushed berries. Instantly seals wounds and restores 45 HP.'
    },
    CAMPFIRE_KIT: {
        id: 'CAMPFIRE_KIT',
        name: 'Campfire Assembly Kit',
        type: ITEM_TYPE.TOOL,
        desc: 'Bundle of dry branches and flint stones. Deploys a permanent warm crackling campfire in the field.'
    },

    // Tech Consumables
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

const CRAFTING_RECIPES = [
    {
        id: 'PRIMITIVE_TORCH',
        resultId: 'PRIMITIVE_TORCH',
        resultCount: 1,
        name: 'Primitive Torch',
        desc: 'Illuminates night darkness and subterranean caverns (extends light radius to 135px).',
        materials: [
            { itemId: 'BRANCH', count: 1 },
            { itemId: 'FLINT', count: 1 }
        ]
    },
    {
        id: 'STONE_AXE',
        resultId: 'STONE_AXE',
        resultCount: 1,
        name: 'Primitive Stone Axe',
        desc: 'Lashed flint handaxe. Equips as primary weapon (+15 Melee Damage).',
        materials: [
            { itemId: 'BRANCH', count: 2 },
            { itemId: 'FLINT', count: 2 }
        ]
    },
    {
        id: 'HERBAL_SALVE',
        resultId: 'HERBAL_SALVE',
        resultCount: 1,
        name: 'Herbal Restorative Salve',
        desc: 'Crushed ley-herbs and sweet berries. Instantly restores 45 HP.',
        materials: [
            { itemId: 'MEDICINAL_HERB', count: 2 },
            { itemId: 'WILD_BERRY', count: 1 }
        ]
    },
    {
        id: 'ROASTED_CABBAGE',
        resultId: 'ROASTED_CABBAGE',
        resultCount: 1,
        name: 'Fire-Roasted Cabbage',
        desc: 'Nutritious charred cabbage meal. Restores 30 HP and 50 EP.',
        materials: [
            { itemId: 'WILD_CABBAGE', count: 1 },
            { itemId: 'BRANCH', count: 1 }
        ]
    },
    {
        id: 'CAMPFIRE_KIT',
        resultId: 'CAMPFIRE_KIT',
        resultCount: 1,
        name: 'Campfire Assembly',
        desc: 'Deploys a permanent field campfire that radiates warmth and safety.',
        materials: [
            { itemId: 'FLINT', count: 3 },
            { itemId: 'BRANCH', count: 2 }
        ]
    }
];

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
        if (!item) return false;
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

    hasItem(itemId, minCount = 1) {
        const slot = this.slots.find(s => s.item.id === itemId);
        return slot ? (slot.count >= minCount) : false;
    }

    getItemCount(itemId) {
        const slot = this.slots.find(s => s.item.id === itemId);
        return slot ? slot.count : 0;
    }

    canCraft(recipe) {
        if (!recipe || !recipe.materials) return false;
        for (const mat of recipe.materials) {
            if (this.getItemCount(mat.itemId) < mat.count) {
                return false;
            }
        }
        return true;
    }

    craftItem(recipeId, player) {
        const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return { success: false, reason: 'Unknown recipe' };
        if (!this.canCraft(recipe)) return { success: false, reason: 'Missing materials' };

        // Consume ingredients
        for (const mat of recipe.materials) {
            this.removeItem(mat.itemId, mat.count);
        }

        // Add crafted product
        const resultItem = BASE_ITEMS[recipe.resultId];
        this.addItem(resultItem, recipe.resultCount || 1);

        // Auto-activate torch if crafting torch
        if (recipe.resultId === 'PRIMITIVE_TORCH' && player) {
            player.hasTorchActive = true;
        }

        return { success: true, item: resultItem };
    }

    useItem(itemId, player) {
        const index = this.slots.findIndex(s => s.item.id === itemId);
        if (index === -1) return false;

        const { item } = this.slots[index];
        let consumed = false;

        if (item.type === ITEM_TYPE.CONSUMABLE || item.type === ITEM_TYPE.FOOD || item.id === 'MEDICINAL_HERB') {
            if (item.healAmount && player) {
                player.hp = Math.min(player.maxHp, player.hp + item.healAmount);
                consumed = true;
            }
            if (item.energyAmount && player) {
                player.energy = Math.min(player.maxEnergy, player.energy + item.energyAmount);
                consumed = true;
            }
            if (consumed) {
                this.removeItem(itemId, 1);
                return true;
            }
        } else if (item.type === ITEM_TYPE.WEAPON) {
            this.equippedWeapon = item;
            if (player) {
                player.attackDamage = 25 + (item.damageBonus || 0);
            }
            return true;
        } else if (item.id === 'PRIMITIVE_TORCH') {
            if (player) {
                player.hasTorchActive = !player.hasTorchActive;
                return true;
            }
        } else if (item.id === 'CAMPFIRE_KIT') {
            if (player && player.deployCampfire) {
                player.deployCampfire();
                this.removeItem(itemId, 1);
                return true;
            }
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
    module.exports = { ITEM_TYPE, BASE_ITEMS, CRAFTING_RECIPES, Inventory };
}
