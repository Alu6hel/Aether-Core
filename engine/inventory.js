/**
 * Aether-Core: Inventory, Equipment, Survival & Crafting Engine
 * 
 * Manages character gear, weapons, armor, relics, consumables, food,
 * survival resources, and active buffs (Stasis, Berserk, Shield, Regen).
 */

const ITEM_TYPE = {
    WEAPON: 'WEAPON',
    ARMOR: 'ARMOR',
    RELIC: 'RELIC',
    TOOL: 'TOOL',
    CONSUMABLE: 'CONSUMABLE',
    MATERIAL: 'MATERIAL',
    FOOD: 'FOOD',
    KEY_ITEM: 'KEY_ITEM'
};

const BASE_ITEMS = {
    // === WEAPONS ===
    ULTRASONIC_SWORD: {
        id: 'ULTRASONIC_SWORD',
        name: 'Ultrasonic Broadsword',
        type: ITEM_TYPE.WEAPON,
        icon: '🗡️',
        rarity: 'rare',
        damageBonus: 15,
        speedBonus: 10,
        desc: 'High-frequency vibrating blade engineered for kinetic momentum strikes. +15 Damage, +10 Speed.'
    },
    PHOTON_EMITTER: {
        id: 'PHOTON_EMITTER',
        name: 'Arcane Photon Staff',
        type: ITEM_TYPE.WEAPON,
        icon: '🪄',
        rarity: 'rare',
        damageBonus: 12,
        maxEnergyBonus: 20,
        desc: 'Particle emitter disguised as an arcane brass relic. +12 Damage, +20 Max Energy.'
    },
    COSMIC_HOE: {
        id: 'COSMIC_HOE',
        name: 'Hoe of Event Horizons',
        type: ITEM_TYPE.WEAPON,
        icon: '🌟',
        rarity: 'legendary',
        damageBonus: 99,
        speedBonus: 25,
        desc: 'Agricultural deity implement that tills the fabric of spacetime. +99 Damage, +25 Speed.'
    },
    STONE_AXE: {
        id: 'STONE_AXE',
        name: 'Primitive Stone Axe',
        type: ITEM_TYPE.WEAPON,
        icon: '🪓',
        rarity: 'common',
        damageBonus: 10,
        speedBonus: 5,
        desc: 'Lashed flint handaxe. Greatly increases woodcutting yield and attack damage (+10 Melee Damage).'
    },
    RUNIC_WARHAMMER: {
        id: 'RUNIC_WARHAMMER',
        name: 'Runic Warhammer',
        type: ITEM_TYPE.WEAPON,
        icon: '🔨',
        rarity: 'epic',
        damageBonus: 35,
        speedBonus: -5,
        desc: 'Dense titanium maul infused with gravitational runes. +35 Damage, heavy kinetic knockdown.'
    },
    PLASMA_DAGGER: {
        id: 'PLASMA_DAGGER',
        name: 'Plasma Vibro-Dagger',
        type: ITEM_TYPE.WEAPON,
        icon: '🗡️',
        rarity: 'rare',
        damageBonus: 18,
        speedBonus: 20,
        desc: 'Superheated energy edge with unmatched handling. +18 Damage, +20 Speed.'
    },
    VOID_SCYTHE: {
        id: 'VOID_SCYTHE',
        name: 'Void Reaping Scythe',
        type: ITEM_TYPE.WEAPON,
        icon: '🌾',
        rarity: 'epic',
        damageBonus: 40,
        lifeSteal: 0.15,
        desc: 'Dark energy curved scythe. +40 Damage, siphons 15% damage dealt as restored health.'
    },

    // === ARMOR & RELICS ===
    VANGUARD_CHESTPLATE: {
        id: 'VANGUARD_CHESTPLATE',
        name: 'Vanguard Nano-Plating',
        type: ITEM_TYPE.ARMOR,
        icon: '🛡️',
        rarity: 'rare',
        defenseBonus: 20,
        maxHpBonus: 40,
        desc: 'Reinforced ballistic graphene suit. Grants +20 Defense and +40 Max HP.'
    },
    AEGIS_KINETIC_SHIELD: {
        id: 'AEGIS_KINETIC_SHIELD',
        name: 'Aegis Kinetic Buckler',
        type: ITEM_TYPE.ARMOR,
        icon: '🛡️',
        rarity: 'epic',
        defenseBonus: 25,
        parryBonus: 0.10,
        desc: 'Deflective energy field buckler. +25 Defense, widens Nine-Sols parry window by 100ms.'
    },
    CHRONO_AMULET: {
        id: 'CHRONO_AMULET',
        name: 'Chrono Warp Pendant',
        type: ITEM_TYPE.RELIC,
        icon: '⏳',
        rarity: 'epic',
        speedBonus: 15,
        cooldownReduction: 0.20,
        desc: 'Ancient tachyon timepiece. +15 Speed, reduces ability and dash cooldowns by 20%.'
    },
    SOLARION_PRISM: {
        id: 'SOLARION_PRISM',
        name: 'Solarion Prism Core',
        type: ITEM_TYPE.RELIC,
        icon: '💎',
        rarity: 'legendary',
        maxEnergyBonus: 30,
        skillDamageBonus: 0.25,
        desc: 'Concentrated Dyson star prism. +30 Max Energy, boosts class skills and ultimates by +25%.'
    },
    PIONEER_IMPLANT: {
        id: 'PIONEER_IMPLANT',
        name: 'Neural Reflex Chip',
        type: ITEM_TYPE.RELIC,
        icon: '🧬',
        rarity: 'rare',
        speedBonus: 10,
        critChanceBonus: 0.15,
        desc: 'Cybernetic neural overclock implant. +10 Movement Speed, +15% Critical Strike chance.'
    },

    // === SURVIVAL TOOLS ===
    PRIMITIVE_TORCH: {
        id: 'PRIMITIVE_TORCH',
        name: 'Primitive Torch',
        type: ITEM_TYPE.TOOL,
        icon: '🔥',
        rarity: 'common',
        desc: 'Pitch-coated pine torch. Disperses night shadows and subterranean cavern darkness (135px radius).'
    },
    TORCH: {
        id: 'TORCH',
        name: 'Phosphor Torch',
        type: ITEM_TYPE.TOOL,
        icon: '🔦',
        rarity: 'rare',
        desc: 'High-output phosphor illumination torch. Disperses deepest darkness (180px radius).'
    },
    CAMPFIRE_KIT: {
        id: 'CAMPFIRE_KIT',
        name: 'Campfire Assembly Kit',
        type: ITEM_TYPE.TOOL,
        icon: '⛺',
        rarity: 'common',
        desc: 'Bundle of seasoned branches and struck flint. Deploys a warm crackling campfire in the field.'
    },

    // === CONSUMABLES & STIMS ===
    NANITE_REPAIR_KIT: {
        id: 'NANITE_REPAIR_KIT',
        name: 'Nanite Repair Gel',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🧪',
        rarity: 'common',
        healAmount: 45,
        desc: 'Rapidly restructures organic tissue and polymer armor. Instantly restores 45 HP.'
    },
    OVERCLOCK_CELL: {
        id: 'OVERCLOCK_CELL',
        name: 'Quantum Overclock Cell',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🔋',
        rarity: 'rare',
        energyAmount: 60,
        desc: 'Floods the nervous system with high-density atmospheric flux. Instantly restores 60 Energy.'
    },
    CHRONO_STASIS_ELIXIR: {
        id: 'CHRONO_STASIS_ELIXIR',
        name: 'Chrono Stasis Elixir',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '⏱️',
        rarity: 'epic',
        stasisDuration: 5.0,
        desc: 'Locks Pioneer in a temporal phase pocket. Complete invulnerability to all damage for 5.0 seconds.'
    },
    BERSERKER_STIM: {
        id: 'BERSERKER_STIM',
        name: 'Adrenaline Berserker Stim',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '💉',
        rarity: 'rare',
        berserkDuration: 12.0,
        desc: 'Supercharges neural adrenaline. Increases all attack damage by +50% for 12.0 seconds.'
    },
    AEGIS_BARRIER_FLASK: {
        id: 'AEGIS_BARRIER_FLASK',
        name: 'Aegis Barrier Flask',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🛡️',
        rarity: 'epic',
        barrierHp: 60,
        desc: 'Deploys an overshield nano-bubble that absorbs the next 60 points of incoming damage.'
    },
    GAIA_NECTAR: {
        id: 'GAIA_NECTAR',
        name: 'Gaia Nectar',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🍯',
        rarity: 'rare',
        regenDuration: 10.0,
        regenRate: 8.0,
        desc: 'Distilled living sap from primordial flora. Regenerates 8 HP per second for 10.0 seconds (80 total).'
    },
    HERBAL_SALVE: {
        id: 'HERBAL_SALVE',
        name: 'Herbal Restorative Salve',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🌿',
        rarity: 'common',
        healAmount: 45,
        desc: 'Concentrated paste of wild herbs and crushed berries. Instantly seals wounds and restores 45 HP.'
    },
    ENERGY_SALVE: {
        id: 'ENERGY_SALVE',
        name: 'Energy Salve',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '⚡',
        rarity: 'common',
        healAmount: 20,
        energyAmount: 50,
        desc: 'Restores 50 Energy and 20 HP with soothing biocircuit salts.'
    },
    SUPER_SALVE: {
        id: 'SUPER_SALVE',
        name: 'Master Restorative Salve',
        type: ITEM_TYPE.CONSUMABLE,
        icon: '✨',
        rarity: 'legendary',
        healAmount: 100,
        energyAmount: 100,
        desc: 'Concentrated deific restorative salve. Instantly recovers 100 HP and 100 Energy.'
    },

    // === FOOD & CROPS ===
    WILD_CABBAGE: {
        id: 'WILD_CABBAGE',
        name: 'Wild Cabbage',
        type: ITEM_TYPE.FOOD,
        icon: '🥬',
        rarity: 'common',
        healAmount: 15,
        energyAmount: 25,
        desc: 'Crisp leafy vegetable rich in moisture and nutrients. Restores 15 HP and 25 Energy.'
    },
    WILD_BERRY: {
        id: 'WILD_BERRY',
        name: 'Wild Cluster Berry',
        type: ITEM_TYPE.FOOD,
        icon: '🫐',
        rarity: 'common',
        healAmount: 10,
        energyAmount: 15,
        desc: 'Sweet-tart purple berries gathered from bushes. Restores 10 HP and 15 Energy.'
    },
    ROASTED_CABBAGE: {
        id: 'ROASTED_CABBAGE',
        name: 'Fire-Roasted Cabbage',
        type: ITEM_TYPE.FOOD,
        icon: '🥗',
        rarity: 'common',
        healAmount: 30,
        energyAmount: 50,
        desc: 'Savory charred cabbage cooked over open flame. Restores 30 HP and 50 Energy.'
    },
    BREAD: {
        id: 'BREAD',
        name: 'Field Bread',
        type: ITEM_TYPE.FOOD,
        icon: '🍞',
        rarity: 'common',
        healAmount: 25,
        energyAmount: 35,
        desc: 'Fresh baked hamlet bread. Restores 25 HP and 35 Energy.'
    },
    STAR_FRUIT: {
        id: 'STAR_FRUIT',
        name: 'Solar Starfruit',
        type: ITEM_TYPE.FOOD,
        icon: '⭐',
        rarity: 'rare',
        healAmount: 50,
        energyAmount: 60,
        desc: 'Luminescent cosmic fruit ripening only under high noon. Restores 50 HP and 60 Energy.'
    },

    // === SURVIVAL MATERIALS ===
    BRANCH: {
        id: 'BRANCH',
        name: 'Pine Branch',
        type: ITEM_TYPE.MATERIAL,
        icon: '🪵',
        rarity: 'common',
        desc: 'Sturdy seasoned branch harvested from pine trees. Essential for crafting torches, tools, and fires.'
    },
    FLINT: {
        id: 'FLINT',
        name: 'Flint Stone',
        type: ITEM_TYPE.MATERIAL,
        icon: '🪨',
        rarity: 'common',
        desc: 'Sharp silicate mineral quarried from boulder outcrops. Used to strike fire and shape primitive blades.'
    },
    MEDICINAL_HERB: {
        id: 'MEDICINAL_HERB',
        name: 'Wild Ley-Herb',
        type: ITEM_TYPE.MATERIAL,
        icon: '🌱',
        rarity: 'common',
        healAmount: 15,
        desc: 'Aromatic medicinal herb. Can be eaten raw for minor healing (15 HP) or distilled into restorative salves.'
    },
    COPPER_ORE: {
        id: 'COPPER_ORE',
        name: 'Copper Shards',
        type: ITEM_TYPE.MATERIAL,
        icon: '🥉',
        rarity: 'common',
        desc: 'Raw copper mineral shards used for advanced gear forging and circuit relays.'
    },
    ANCIENT_CONDUIT: {
        id: 'ANCIENT_CONDUIT',
        name: 'Matrix Conduit',
        type: ITEM_TYPE.MATERIAL,
        icon: '🔌',
        rarity: 'rare',
        desc: 'High-density quantum wire line extracted from Dyson vault plates.'
    },
    TITANIUM_INGOT: {
        id: 'TITANIUM_INGOT',
        name: 'Titanium Ingot',
        type: ITEM_TYPE.MATERIAL,
        icon: '🧱',
        rarity: 'rare',
        desc: 'Aerospace grade titanium forged from smelter slag. Used for heavy dreadnought plating.'
    },
    AETHER_CRYSTAL: {
        id: 'AETHER_CRYSTAL',
        name: 'Aether Crystal Core',
        type: ITEM_TYPE.MATERIAL,
        icon: '💠',
        rarity: 'epic',
        desc: 'Concentrated living aether crystal pulsating with harmonic sub-bedrock frequency.'
    },

    // === KEY ITEMS ===
    SUB_CORE_KEYCARD: {
        id: 'SUB_CORE_KEYCARD',
        name: 'Sub-Bedrock Access Pass',
        type: ITEM_TYPE.KEY_ITEM,
        icon: '💳',
        rarity: 'rare',
        desc: 'Unlocks the titanium blast door guarding the Dyson core reactor deep within the grotto.'
    },
    DYSON_SEED_RELIC: {
        id: 'DYSON_SEED_RELIC',
        name: 'Genesis Core Relic',
        type: ITEM_TYPE.KEY_ITEM,
        icon: '🔮',
        rarity: 'legendary',
        desc: 'Encrypted storage crystal containing the master seed of the planetary core.'
    },
    RUNIC_COMPASS: {
        id: 'RUNIC_COMPASS',
        name: 'Wayfinder Runic Compass',
        type: ITEM_TYPE.KEY_ITEM,
        icon: '🧭',
        rarity: 'rare',
        desc: 'Mystic gyro-compass that tunes into resonance portals and dungeon relic vaults.'
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
        desc: 'Lashed flint handaxe. Equips as primary weapon (+10 Melee Damage).',
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

        // Initialize with standard pioneer survival gear
        this.addItem(BASE_ITEMS.NANITE_REPAIR_KIT, 3);
        this.addItem(BASE_ITEMS.OVERCLOCK_CELL, 2);
        this.addItem(BASE_ITEMS.WILD_CABBAGE, 2);
        this.addItem(BASE_ITEMS.BRANCH, 3);
        this.addItem(BASE_ITEMS.FLINT, 2);
    }

    addItem(item, count = 1) {
        if (!item) return false;
        let itemObj = item;
        if (typeof item === 'string') {
            itemObj = BASE_ITEMS[item] || { id: item, name: item, type: ITEM_TYPE.CONSUMABLE, icon: '📦', rarity: 'common' };
        }
        const existing = this.slots.find(s => s.item.id === itemObj.id);
        if (existing) {
            existing.count += count;
            return true;
        }
        if (this.slots.length < this.maxSlots) {
            this.slots.push({ item: itemObj, count });
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

    equipWeapon(item, player) {
        if (this.equippedWeapon && this.equippedWeapon.id === item.id) {
            // Unequip
            this.equippedWeapon = null;
            if (player) {
                player.attackDamageBonus = 0;
                player.weaponSpeedBonus = 0;
            }
            return { success: true, action: 'UNEQUIP_WEAPON', message: `Unequipped ${item.name}.` };
        }
        this.equippedWeapon = item;
        if (player) {
            player.attackDamageBonus = item.damageBonus || 0;
            player.weaponSpeedBonus = item.speedBonus || 0;
        }
        return { success: true, action: 'EQUIP_WEAPON', message: `Equipped ${item.name} (+${item.damageBonus || 0} Dmg)!` };
    }

    equipArmor(item, player) {
        if (this.equippedArmor && this.equippedArmor.id === item.id) {
            // Unequip
            this.equippedArmor = null;
            if (player) {
                player.defenseBonus = 0;
            }
            return { success: true, action: 'UNEQUIP_ARMOR', message: `Unequipped ${item.name}.` };
        }
        this.equippedArmor = item;
        if (player) {
            player.defenseBonus = item.defenseBonus || 0;
            if (item.maxHpBonus) {
                player.maxHp = (player.baseMaxHp || player.maxHp) + item.maxHpBonus;
                player.hp = Math.min(player.maxHp, player.hp + item.maxHpBonus);
            }
        }
        return { success: true, action: 'EQUIP_ARMOR', message: `Equipped ${item.name} (+${item.defenseBonus || 0} Def)!` };
    }

    useItem(itemId, player) {
        const index = this.slots.findIndex(s => s.item.id === itemId);
        if (index === -1) return { success: false, reason: 'Item not in inventory' };

        const { item } = this.slots[index];

        // 1. Equipment: Weapons
        if (item.type === ITEM_TYPE.WEAPON) {
            return this.equipWeapon(item, player);
        }

        // 2. Equipment: Armor & Relics
        if (item.type === ITEM_TYPE.ARMOR || item.type === ITEM_TYPE.RELIC) {
            return this.equipArmor(item, player);
        }

        // 3. Consumables & Foods & Medicinal Herbs
        if (item.type === ITEM_TYPE.CONSUMABLE || item.type === ITEM_TYPE.FOOD || item.id === 'MEDICINAL_HERB') {
            let effectsApplied = [];

            if (item.healAmount && player) {
                const prev = player.hp;
                player.hp = Math.min(player.maxHp, player.hp + item.healAmount);
                effectsApplied.push(`+${Math.round(player.hp - prev)} HP`);
            }
            if (item.energyAmount && player) {
                const prev = player.energy;
                player.energy = Math.min(player.maxEnergy, player.energy + item.energyAmount);
                effectsApplied.push(`+${Math.round(player.energy - prev)} NRG`);
            }
            if (item.stasisDuration && player) {
                player.stasisTimer = (player.stasisTimer || 0) + item.stasisDuration;
                effectsApplied.push(`STASIS ${item.stasisDuration}s`);
            }
            if (item.berserkDuration && player) {
                player.berserkerTimer = (player.berserkerTimer || 0) + item.berserkDuration;
                effectsApplied.push(`BERSERK +50% ATK (${item.berserkDuration}s)`);
            }
            if (item.barrierHp && player) {
                player.barrierShield = (player.barrierShield || 0) + item.barrierHp;
                effectsApplied.push(`+${item.barrierHp} SHIELD`);
            }
            if (item.regenDuration && player) {
                player.regenTimer = (player.regenTimer || 0) + item.regenDuration;
                player.regenRate = item.regenRate || 8.0;
                effectsApplied.push(`REGEN +${player.regenRate} HP/s (${item.regenDuration}s)`);
            }

            this.removeItem(itemId, 1);
            return {
                success: true,
                action: 'CONSUMED',
                message: `Used ${item.name}: ${effectsApplied.join(', ')}`
            };
        }

        // 4. Tools (Torches, Campfires)
        if (item.id === 'PRIMITIVE_TORCH' || item.id === 'TORCH') {
            if (player) {
                player.hasTorchActive = !player.hasTorchActive;
                return {
                    success: true,
                    action: 'TOOL_ACTIVATED',
                    message: player.hasTorchActive ? 'Torch lit! Dark shadows pushed back.' : 'Torch doused.'
                };
            }
        } else if (item.id === 'CAMPFIRE_KIT') {
            if (player && player.deployCampfire) {
                player.deployCampfire();
                this.removeItem(itemId, 1);
                return {
                    success: true,
                    action: 'TOOL_ACTIVATED',
                    message: 'Campfire deployed! Warmth radiates.'
                };
            }
        }

        // 5. Materials and Key Items (informational)
        if (item.type === ITEM_TYPE.KEY_ITEM) {
            return {
                success: true,
                action: 'INSPECT_KEY',
                message: `${item.name} ready for ancient Dyson matrix sockets.`
            };
        }

        return { success: false, reason: 'This item cannot be used directly.' };
    }

    static rollDrop(enemyType, prng) {
        // Deterministic loot drop
        const roll = prng ? prng.range(0, 100) : Math.floor(Math.random() * 100);
        if (enemyType === 'AEGIS_DREADNOUGHT') {
            return {
                coins: prng ? prng.range(40, 75) : 55,
                item: BASE_ITEMS.DYSON_SEED_RELIC
            };
        } else if (roll < 45) {
            let droppedItem = BASE_ITEMS.NANITE_REPAIR_KIT;
            if (roll < 10) droppedItem = BASE_ITEMS.CHRONO_STASIS_ELIXIR;
            else if (roll < 20) droppedItem = BASE_ITEMS.BERSERKER_STIM;
            else if (roll < 30) droppedItem = BASE_ITEMS.OVERCLOCK_CELL;
            else if (roll < 38) droppedItem = BASE_ITEMS.AEGIS_BARRIER_FLASK;
            return {
                coins: prng ? prng.range(4, 15) : 8,
                item: droppedItem
            };
        }
        return { coins: prng ? prng.range(2, 6) : 3, item: null };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ITEM_TYPE, BASE_ITEMS, CRAFTING_RECIPES, Inventory };
}
