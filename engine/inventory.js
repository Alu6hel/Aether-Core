/**
 * Aether-Core: Comprehensive RPG 6-Tier Item Engine & Inventory System
 * 
 * Manages item classification across standard RPG tiers (Tiers I - VI),
 * item categories (Weapons, Armor & Relics, Consumables & Active Buffs,
 * Food & Survival Tools, Survival Materials & Key Items), separation of
 * found/collected resources from crafted gear, active buffs, and the
 * universal microscopic-cell blood drop currency.
 */

const ITEM_TIER = {
    COMMON: 1,      // Tier I - Abundant wild resources, primitive tools
    UNCOMMON: 2,    // Tier II - Forged copper gear, field remedies, hunter tools
    RARE: 3,        // Tier III - High alloy kinetic blades, tech plating, stims
    EPIC: 4,        // Tier IV - Graviton/plasma weaponry, temporal phase elixirs
    LEGENDARY: 5,   // Tier V - Dyson stellar saber, celestial relics, deific salves
    MYTHIC: 6       // Tier VI - Primordial Singularity & Remains exclusive relics
};

const TIER_CONFIG = {
    1: { name: 'Common', roman: 'TIER I', badge: 'T1', color: '#90a4ae', glow: 'rgba(144, 164, 174, 0.45)', trailColor: '#b0bec5' },
    2: { name: 'Uncommon', roman: 'TIER II', badge: 'T2', color: '#4caf50', glow: 'rgba(76, 175, 80, 0.55)', trailColor: '#66bb6a' },
    3: { name: 'Rare', roman: 'TIER III', badge: 'T3', color: '#00b0ff', glow: 'rgba(0, 176, 255, 0.65)', trailColor: '#00e5ff' },
    4: { name: 'Epic', roman: 'TIER IV', badge: 'T4', color: '#ba68c8', glow: 'rgba(186, 104, 200, 0.75)', trailColor: '#e040fb' },
    5: { name: 'Legendary', roman: 'TIER V', badge: 'T5', color: '#ffb300', glow: 'rgba(255, 179, 0, 0.85)', trailColor: '#ffd700' },
    6: { name: 'Mythic', roman: 'TIER VI', badge: 'T6', color: '#ff1744', glow: 'rgba(255, 23, 68, 0.95)', trailColor: '#ff1744' }
};

const ITEM_CATEGORY = {
    WEAPONS: 'Weapons',
    ARMOR_RELICS: 'Armor & Relics',
    CONSUMABLES: 'Consumables & Active Buffs',
    FOOD_TOOLS: 'Food & Survival Tools',
    MATERIALS_KEYS: 'Survival Materials & Key Items'
};

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

/**
 * Universal Blood Drop Currency SVG Generator
 * Replaces all currency icons and words with the exact stylized droplet
 * containing microscopic erythrocyte cells and meniscus crescent highlight.
 */
function getBloodDropSvg(size = 18, color = '#ff1744') {
    const h = Math.round(size * 1.33);
    return `<svg class="blood-currency-icon" viewBox="0 0 24 32" width="${size}" height="${h}" style="vertical-align: middle; display: inline-block; filter: drop-shadow(0 0 4px rgba(255,23,68,0.65));">
        <defs>
            <linearGradient id="bloodGrad_${size}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff5252"/>
                <stop offset="65%" stop-color="#d50000"/>
                <stop offset="100%" stop-color="#880e4f"/>
            </linearGradient>
        </defs>
        <!-- Teardrop Contour -->
        <path d="M12 2 C12 2, 2.5 13.5, 2.5 20.5 C2.5 26.3 6.7 30.5 12 30.5 C17.3 30.5 21.5 26.3 21.5 20.5 C21.5 13.5 16.5 7 12 2 Z" fill="url(#bloodGrad_${size})" stroke="#ff8a80" stroke-width="1.6" stroke-linejoin="round"/>
        <!-- Microscopic Red Blood Cells (Disc / Oval organelles) -->
        <ellipse cx="12" cy="11.5" rx="2.5" ry="1.5" fill="#880e4f" stroke="#ffebee" stroke-width="1.1" transform="rotate(-15 12 11.5)"/>
        <ellipse cx="7.5" cy="17" rx="1.6" ry="1.6" fill="#880e4f" stroke="#ffebee" stroke-width="1.0"/>
        <ellipse cx="13.8" cy="17.8" rx="3.0" ry="1.7" fill="#880e4f" stroke="#ffebee" stroke-width="1.1" transform="rotate(22 13.8 17.8)"/>
        <ellipse cx="13.8" cy="17.8" rx="1.1" ry="0.6" fill="#ffebee" transform="rotate(22 13.8 17.8)"/>
        <ellipse cx="8.8" cy="23.8" rx="2.7" ry="1.6" fill="#880e4f" stroke="#ffebee" stroke-width="1.1" transform="rotate(-12 8.8 23.8)"/>
        <ellipse cx="8.8" cy="23.8" rx="1.0" ry="0.6" fill="#ffebee" transform="rotate(-12 8.8 23.8)"/>
        <!-- Crescent Meniscus Highlight -->
        <path d="M15.8 22.8 C16.6 25 15.2 27.5 13 28.5" fill="none" stroke="#ffebee" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;
}

const BLOOD_DROP_SVG = getBloodDropSvg(18);
const BLOOD_DROP_SVG_SM = getBloodDropSvg(14);
const BLOOD_DROP_SVG_LG = getBloodDropSvg(22);

const BASE_ITEMS = {
    // ==========================================
    // 1. WEAPONS (TIERS I - VI)
    // ==========================================
    STONE_AXE: {
        id: 'STONE_AXE',
        name: 'Primitive Stone Axe',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🪓',
        isCraftable: true,
        source: 'Forged at Campfire / Anvil with Branches and Flint',
        damageBonus: 10,
        speedBonus: 5,
        desc: 'Crude stone axe lashed with fibrous twine. +10 Damage, +5 Speed. Speeds up wood gathering.'
    },
    CRUDE_DAGGER: {
        id: 'CRUDE_DAGGER',
        name: 'Flint Shank Dagger',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🗡️',
        isCraftable: true,
        source: 'Chipped from sharp flint and pine wood',
        damageBonus: 8,
        speedBonus: 15,
        desc: 'Lightweight chipped flint blade. +8 Damage, +15 Speed.'
    },
    PINE_CLUB: {
        id: 'PINE_CLUB',
        name: 'Hardened Pine Cudgel',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🏏',
        isCraftable: true,
        source: 'Carved from dense seasoned pine branches',
        damageBonus: 12,
        speedBonus: 0,
        desc: 'Fire-hardened heavy wooden club. +12 Damage, high stagger force.'
    },

    // Tier II Weapons
    COPPER_SHORTSWORD: {
        id: 'COPPER_SHORTSWORD',
        name: 'Forged Copper Gladius',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '⚔️',
        isCraftable: true,
        source: 'Forged from Smelted Copper Ingots',
        damageBonus: 20,
        speedBonus: 10,
        desc: 'Tempered copper blade with polished balance. +20 Damage, +10 Speed.'
    },
    HUNTER_SPEAR: {
        id: 'HUNTER_SPEAR',
        name: 'Barbed Hunting Spear',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🔱',
        isCraftable: true,
        source: 'Assembled with Copper Ingot, Flint, and Long Branches',
        damageBonus: 22,
        speedBonus: 5,
        rangeBonus: 12,
        desc: 'Extended reach spear with copper barb tips. +22 Damage, +12 Attack Range.'
    },

    // Tier III Weapons
    ULTRASONIC_SWORD: {
        id: 'ULTRASONIC_SWORD',
        name: 'Ultrasonic Broadsword',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🗡️',
        isCraftable: true,
        source: 'Constructed from Titanium Ingots and Matrix Conduits',
        damageBonus: 15,
        speedBonus: 10,
        desc: 'High-frequency vibrating blade engineered for kinetic momentum strikes. +15 Damage, +10 Speed.'
    },
    PHOTON_EMITTER: {
        id: 'PHOTON_EMITTER',
        name: 'Arcane Photon Staff',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🪄',
        isCraftable: true,
        source: 'Assembled from Ancient Conduits and Aether Quartz',
        damageBonus: 12,
        maxEnergyBonus: 20,
        desc: 'Particle emitter disguised as an arcane brass relic. +12 Damage, +20 Max Energy.'
    },
    KINETIC_RAPIER: {
        id: 'KINETIC_RAPIER',
        name: 'Kinetic Needle Rapier',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🤺',
        isCraftable: true,
        source: 'Engineered from Titanium Alloy and Copper Core',
        damageBonus: 24,
        speedBonus: 22,
        desc: 'Razor-thin superconductor rapier. +24 Damage, +22 Speed, rapid multi-thrusts.'
    },

    // Tier IV Weapons
    RUNIC_WARHAMMER: {
        id: 'RUNIC_WARHAMMER',
        name: 'Runic Warhammer',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🔨',
        isCraftable: true,
        source: 'Heavy forge with Titanium Ingots and Aether Crystal Core',
        damageBonus: 35,
        speedBonus: -5,
        desc: 'Dense titanium maul infused with gravitational runes. +35 Damage, heavy kinetic knockdown.'
    },
    PLASMA_DAGGER: {
        id: 'PLASMA_DAGGER',
        name: 'Plasma Vibro-Dagger',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🗡️',
        isCraftable: true,
        source: 'Engineered with Titanium Ingots, Matrix Conduit, and Aether Crystal',
        damageBonus: 18,
        speedBonus: 20,
        desc: 'Superheated energy edge with unmatched handling. +18 Damage, +20 Speed.'
    },
    VOID_SCYTHE: {
        id: 'VOID_SCYTHE',
        name: 'Void Reaping Scythe',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🌾',
        isCraftable: false,
        source: 'Exclusive drop from Void Grotto Guardians and Resonant Nebula Orbs',
        damageBonus: 40,
        lifeSteal: 0.15,
        desc: 'Dark energy curved scythe. +40 Damage, siphons 15% damage dealt as restored health.'
    },

    // Tier V Weapons
    DYSON_STELLAR_SABER: {
        id: 'DYSON_STELLAR_SABER',
        name: 'Dyson Solarion Saber',
        tier: ITEM_TIER.LEGENDARY,
        tierName: 'Legendary',
        tierBadge: 'T5',
        tierColor: '#ffb300',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🌟',
        isCraftable: false,
        source: 'Forged from Dyson Core Relic and Solarion Prisms',
        damageBonus: 65,
        speedBonus: 30,
        desc: 'Radiant blade powered by captured stellar plasma. +65 Damage, +30 Speed, releases solar flares on swing.'
    },
    COSMIC_HOE: {
        id: 'COSMIC_HOE',
        name: 'Hoe of Event Horizons',
        tier: ITEM_TIER.LEGENDARY,
        tierName: 'Legendary',
        tierBadge: 'T5',
        tierColor: '#ffb300',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '🌾',
        isCraftable: false,
        source: 'Divine relic granted to master cultivators of the astral fields',
        damageBonus: 99,
        speedBonus: 25,
        desc: 'Agricultural deity implement that tills the fabric of spacetime. +99 Damage, +25 Speed.'
    },

    // Tier VI Mythic Weapons (Remains & Pinnacle Endgame Exclusive)
    PRIMORDIAL_VOID_SCYTHE: {
        id: 'PRIMORDIAL_VOID_SCYTHE',
        name: 'Singularity Harbinger Scythe',
        tier: ITEM_TIER.MYTHIC,
        tierName: 'Mythic',
        tierBadge: 'T6',
        tierColor: '#ff1744',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '☄️',
        isCraftable: false,
        source: 'Supreme drop from Primordial Singularity Remains and Dreadnought Boss',
        damageBonus: 140,
        speedBonus: 45,
        lifeSteal: 0.35,
        desc: 'Cosmic reality-cleaving crescent scythe forged from singularity horizon. +140 Damage, +45 Speed, siphons 35% life steal, distorts space on impact.'
    },
    SINGULARITY_SCEPTER: {
        id: 'SINGULARITY_SCEPTER',
        name: 'Crown of the Black Sun',
        tier: ITEM_TIER.MYTHIC,
        tierName: 'Mythic',
        tierBadge: 'T6',
        tierColor: '#ff1744',
        category: ITEM_CATEGORY.WEAPONS,
        type: ITEM_TYPE.WEAPON,
        icon: '👑',
        isCraftable: false,
        source: 'Pinnacle reward from Primordial Singularity Remains',
        damageBonus: 135,
        maxEnergyBonus: 80,
        skillDamageBonus: 0.50,
        desc: 'Channeling rod radiating supermassive celestial gravity. +135 Damage, +80 Max Energy, +50% Skill/Ultimate damage.'
    },

    // ==========================================
    // 2. ARMOR & RELICS (TIERS I - VI)
    // ==========================================
    PIONEER_TUNIC: {
        id: 'PIONEER_TUNIC',
        name: 'Scavenger Twill Tunic',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.ARMOR,
        icon: '🥋',
        isCraftable: true,
        source: 'Woven from wild plant fibers and cured hides',
        defenseBonus: 6,
        maxHpBonus: 15,
        desc: 'Light woven exploration tunic. +6 Defense, +15 Max HP.'
    },
    WOODEN_BUCKLER: {
        id: 'WOODEN_BUCKLER',
        name: 'Pine Reinforcement Buckler',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.ARMOR,
        icon: '🛡️',
        isCraftable: true,
        source: 'Assembled from seasoned pine branches and fiber cords',
        defenseBonus: 8,
        desc: 'Sturdy wooden shield that deflects minor monster strikes. +8 Defense.'
    },

    // Tier II Armor
    COPPER_CARAPACE: {
        id: 'COPPER_CARAPACE',
        name: 'Copper Plated Cuirass',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.ARMOR,
        icon: '🛡️',
        isCraftable: true,
        source: 'Forged from Copper Ingots and Plant Fibers',
        defenseBonus: 14,
        maxHpBonus: 25,
        desc: 'Interlocking beaten copper plates. Grants +14 Defense and +25 Max HP.'
    },
    PIONEER_BAND: {
        id: 'PIONEER_BAND',
        name: 'Wayfarer Flux Band',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.RELIC,
        icon: '💍',
        isCraftable: true,
        source: 'Crafted with Copper Wire and Flint',
        speedBonus: 5,
        maxEnergyBonus: 20,
        desc: 'Copper focus ring that stabilizes kinetic movement. +5 Speed, +20 Max Energy.'
    },

    // Tier III Armor & Relics
    VANGUARD_CHESTPLATE: {
        id: 'VANGUARD_CHESTPLATE',
        name: 'Vanguard Nano-Plating',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.ARMOR,
        icon: '🛡️',
        isCraftable: true,
        source: 'Forged with Titanium Ingots and Matrix Conduits',
        defenseBonus: 20,
        maxHpBonus: 40,
        desc: 'Reinforced ballistic graphene suit. Grants +20 Defense and +40 Max HP.'
    },
    PIONEER_IMPLANT: {
        id: 'PIONEER_IMPLANT',
        name: 'Neural Reflex Chip',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.RELIC,
        icon: '🧬',
        isCraftable: false,
        source: 'Salvaged from ancient automated exploratory drones',
        speedBonus: 10,
        critChanceBonus: 0.15,
        desc: 'Cybernetic neural overclock implant. +10 Movement Speed, +15% Critical Strike chance.'
    },
    RUNIC_COMPASS: {
        id: 'RUNIC_COMPASS',
        name: 'Wayfinder Runic Compass',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.RELIC,
        icon: '🧭',
        isCraftable: false,
        source: 'Discovered in subterranean navigation vaults',
        speedBonus: 10,
        desc: 'Mystic gyro-compass that tunes into resonance portals and relic vaults. +10 Speed.'
    },

    // Tier IV Armor & Relics
    AEGIS_KINETIC_SHIELD: {
        id: 'AEGIS_KINETIC_SHIELD',
        name: 'Aegis Kinetic Buckler',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.ARMOR,
        icon: '🛡️',
        isCraftable: true,
        source: 'Forged from Titanium Ingots, Aether Crystal, and Copper Carapace',
        defenseBonus: 25,
        parryBonus: 0.10,
        desc: 'Deflective energy field buckler. +25 Defense, widens Nine-Sols parry window by 100ms.'
    },
    CHRONO_AMULET: {
        id: 'CHRONO_AMULET',
        name: 'Chrono Warp Pendant',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.RELIC,
        icon: '⏳',
        isCraftable: false,
        source: 'Found inside Resonant Nebula Remains or temporal rift chests',
        speedBonus: 15,
        cooldownReduction: 0.20,
        desc: 'Ancient tachyon timepiece. +15 Speed, reduces ability and dash cooldowns by 20%.'
    },

    // Tier V Armor & Relics
    DREADNOUGHT_WARPLATE: {
        id: 'DREADNOUGHT_WARPLATE',
        name: 'Aegis Dreadnought Exosuit',
        tier: ITEM_TIER.LEGENDARY,
        tierName: 'Legendary',
        tierBadge: 'T5',
        tierColor: '#ffb300',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.ARMOR,
        icon: '🦾',
        isCraftable: false,
        source: 'Salvaged from defeated Aegis Dreadnought Boss',
        defenseBonus: 50,
        maxHpBonus: 120,
        reflectDamage: 0.15,
        desc: 'Titanium-ceramic armored chassis. +50 Defense, +120 Max HP, reflects 15% incoming damage back to attackers.'
    },
    SOLARION_PRISM: {
        id: 'SOLARION_PRISM',
        name: 'Solarion Prism Core',
        tier: ITEM_TIER.LEGENDARY,
        tierName: 'Legendary',
        tierBadge: 'T5',
        tierColor: '#ffb300',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.RELIC,
        icon: '💎',
        isCraftable: false,
        source: 'Harvested from Dyson Core Reactor chamber',
        maxEnergyBonus: 30,
        skillDamageBonus: 0.25,
        desc: 'Concentrated Dyson star prism. +30 Max Energy, boosts class skills and ultimates by +25%.'
    },

    // Tier VI Mythic Armor & Relics (Remains Exclusive)
    GENESIS_STARMANTLE: {
        id: 'GENESIS_STARMANTLE',
        name: 'Godhead Genesis Mantle',
        tier: ITEM_TIER.MYTHIC,
        tierName: 'Mythic',
        tierBadge: 'T6',
        tierColor: '#ff1744',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.ARMOR,
        icon: '✨',
        isCraftable: false,
        source: 'Grand relic from Primordial Singularity Remains',
        defenseBonus: 85,
        maxHpBonus: 260,
        regenRate: 15.0,
        reflectDamage: 0.25,
        desc: 'Woven from primordial starlight filaments. +85 Defense, +260 Max HP, +25% Damage Reflection, continuously regenerates +15 HP/sec, prevents lethal strikes once every 90s.'
    },
    PRIMORDIAL_SINGULARITY_CORE: {
        id: 'PRIMORDIAL_SINGULARITY_CORE',
        name: 'Singularity Heart',
        tier: ITEM_TIER.MYTHIC,
        tierName: 'Mythic',
        tierBadge: 'T6',
        tierColor: '#ff1744',
        category: ITEM_CATEGORY.ARMOR_RELICS,
        type: ITEM_TYPE.RELIC,
        icon: '⚛️',
        isCraftable: false,
        source: 'Pinnacle drop from Primordial Singularity Remains',
        speedBonus: 30,
        cooldownReduction: 0.50,
        maxEnergyBonus: 100,
        desc: 'The uncontainable core of a newborn universe. +30 Speed, -50% cooldowns, +100 Max Energy, virtually eliminates dash delay.'
    },

    // ==========================================
    // 3. CONSUMABLES & ACTIVE BUFFS (TIERS I - VI)
    // ==========================================
    HERBAL_SALVE: {
        id: 'HERBAL_SALVE',
        name: 'Herbal Restorative Salve',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🌿',
        isCraftable: true,
        source: 'Crafted from Wild Ley-Herbs and Wild Berries',
        healAmount: 45,
        desc: 'Concentrated paste of wild herbs and crushed berries. Instantly seals wounds and restores 45 HP.'
    },
    ENERGY_SALVE: {
        id: 'ENERGY_SALVE',
        name: 'Energy Salve',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '⚡',
        isCraftable: true,
        source: 'Crafted from Ley-Herbs and Copper Shards',
        healAmount: 20,
        energyAmount: 50,
        desc: 'Restores 50 Energy and 20 HP with soothing biocircuit salts.'
    },

    // Tier II Consumables
    NANITE_REPAIR_KIT: {
        id: 'NANITE_REPAIR_KIT',
        name: 'Nanite Repair Gel',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🧪',
        isCraftable: true,
        source: 'Refined from Herbal Salve and Copper Ingot',
        healAmount: 45,
        desc: 'Rapidly restructures organic tissue and polymer armor. Instantly restores 45 HP.'
    },
    OVERCLOCK_CELL: {
        id: 'OVERCLOCK_CELL',
        name: 'Quantum Overclock Cell',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🔋',
        isCraftable: true,
        source: 'Assembled from Copper Ingot and Matrix Conduit',
        energyAmount: 60,
        desc: 'Floods the nervous system with high-density atmospheric flux. Instantly restores 60 Energy.'
    },

    // Tier III Consumables & Active Buffs
    BERSERKER_STIM: {
        id: 'BERSERKER_STIM',
        name: 'Adrenaline Berserker Stim',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '💉',
        isCraftable: true,
        source: 'Synthesized from Nanite Gel and Matrix Conduit',
        berserkDuration: 12.0,
        desc: 'Supercharges neural adrenaline. Increases all attack damage by +50% for 12.0 seconds.'
    },
    GAIA_NECTAR: {
        id: 'GAIA_NECTAR',
        name: 'Gaia Nectar',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🍯',
        isCraftable: true,
        source: 'Distilled from Solar Starfruit and Ley-Herbs',
        regenDuration: 10.0,
        regenRate: 8.0,
        desc: 'Distilled living sap from primordial flora. Regenerates 8 HP per second for 10.0 seconds (80 total).'
    },
    FORTIFIED_ELIXIR: {
        id: 'FORTIFIED_ELIXIR',
        name: 'Ironhide Nanite Tonic',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🍶',
        isCraftable: true,
        source: 'Blended from Titanium Slag and Herbal Salve',
        fortifyDuration: 20.0,
        defenseBonus: 30,
        desc: 'Hardens skin with graphene crystals. Increases Defense by +30 for 20.0 seconds.'
    },

    // Tier IV Consumables & Active Buffs
    CHRONO_STASIS_ELIXIR: {
        id: 'CHRONO_STASIS_ELIXIR',
        name: 'Chrono Stasis Elixir',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '⏱️',
        isCraftable: true,
        source: 'Synthesized from Aether Crystal and Void Shard',
        stasisDuration: 5.0,
        desc: 'Locks Pioneer in a temporal phase pocket. Complete invulnerability to all damage for 5.0 seconds.'
    },
    AEGIS_BARRIER_FLASK: {
        id: 'AEGIS_BARRIER_FLASK',
        name: 'Aegis Barrier Flask',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🛡️',
        isCraftable: true,
        source: 'Blended from Aether Crystal and Titanium Ingot',
        barrierHp: 60,
        desc: 'Deploys an overshield nano-bubble that absorbs the next 60 points of incoming damage.'
    },

    // Tier V Consumables
    SUPER_SALVE: {
        id: 'SUPER_SALVE',
        name: 'Master Restorative Salve',
        tier: ITEM_TIER.LEGENDARY,
        tierName: 'Legendary',
        tierBadge: 'T5',
        tierColor: '#ffb300',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '✨',
        isCraftable: false,
        source: 'Found in 6-Day Holding Points and Dyson Relic Chests',
        healAmount: 100,
        energyAmount: 100,
        desc: 'Concentrated deific restorative salve. Instantly recovers 100 HP and 100 Energy.'
    },

    // Tier VI Mythic Consumables (Remains Exclusive)
    PRIMORDIAL_AMBROSIA: {
        id: 'PRIMORDIAL_AMBROSIA',
        name: 'Primordial Ambrosia',
        tier: ITEM_TIER.MYTHIC,
        tierName: 'Mythic',
        tierBadge: 'T6',
        tierColor: '#ff1744',
        category: ITEM_CATEGORY.CONSUMABLES,
        type: ITEM_TYPE.CONSUMABLE,
        icon: '🍷',
        isCraftable: false,
        source: 'Sacred drops from Primordial Singularity Remains',
        healAmount: 999,
        energyAmount: 999,
        permMaxHpBonus: 50,
        permMaxEnergyBonus: 50,
        stasisDuration: 15.0,
        berserkDuration: 25.0,
        desc: 'Divine draught of the cosmos. Permanently increases Max HP +50 and Max Energy +50! Grants 15s absolute invulnerability and 25s double damage.'
    },

    // ==========================================
    // 4. FOOD & SURVIVAL TOOLS (TIERS I - IV)
    // ==========================================
    WILD_CABBAGE: {
        id: 'WILD_CABBAGE',
        name: 'Wild Cabbage',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.FOOD,
        icon: '🥬',
        isCraftable: false,
        source: 'Harvested from farm crops or wild vegetable patches',
        healAmount: 15,
        energyAmount: 25,
        desc: 'Crisp leafy vegetable rich in moisture and nutrients. Restores 15 HP and 25 Energy.'
    },
    WILD_BERRY: {
        id: 'WILD_BERRY',
        name: 'Wild Cluster Berry',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.FOOD,
        icon: '🫐',
        isCraftable: false,
        source: 'Foraged from wild berry bushes in forest and hills',
        healAmount: 10,
        energyAmount: 15,
        desc: 'Sweet-tart purple berries gathered from bushes. Restores 10 HP and 15 Energy.'
    },
    ROASTED_CABBAGE: {
        id: 'ROASTED_CABBAGE',
        name: 'Fire-Roasted Cabbage',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.FOOD,
        icon: '🥗',
        isCraftable: true,
        source: 'Cooked over Campfire with Wild Cabbage and Branch',
        healAmount: 30,
        energyAmount: 50,
        desc: 'Savory charred cabbage cooked over open flame. Restores 30 HP and 50 Energy.'
    },
    BREAD: {
        id: 'BREAD',
        name: 'Field Bread',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.FOOD,
        icon: '🍞',
        isCraftable: true,
        source: 'Baked over fire from ground wild grains and herbs',
        healAmount: 25,
        energyAmount: 35,
        desc: 'Fresh baked hamlet bread. Restores 25 HP and 35 Energy.'
    },
    PRIMITIVE_TORCH: {
        id: 'PRIMITIVE_TORCH',
        name: 'Primitive Torch',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.TOOL,
        icon: '🔥',
        isCraftable: true,
        source: 'Crafted from Pine Branch and Flint',
        desc: 'Pitch-coated pine torch. Disperses night shadows and subterranean cavern darkness (135px radius).'
    },
    CAMPFIRE_KIT: {
        id: 'CAMPFIRE_KIT',
        name: 'Campfire Assembly Kit',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.TOOL,
        icon: '⛺',
        isCraftable: true,
        source: 'Crafted from Branches and Flint',
        desc: 'Bundle of seasoned branches and struck flint. Deploys a warm crackling campfire in the field.'
    },

    // Tier II Food & Tools
    ROASTED_SKEWER: {
        id: 'ROASTED_SKEWER',
        name: 'Charred Hunter Skewer',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.FOOD,
        icon: '🍢',
        isCraftable: true,
        source: 'Grilled with Wild Berries, Cabbage, and Branches',
        healAmount: 50,
        energyAmount: 55,
        desc: 'Caramelized wild berry and vegetable skewer. Restores 50 HP and 55 Energy.'
    },
    PIONEER_PICKAXE: {
        id: 'PIONEER_PICKAXE',
        name: 'Flint Prospecting Pick',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.TOOL,
        icon: '⛏️',
        isCraftable: true,
        source: 'Forged from Branches, Copper Ingots, and Flint',
        desc: 'Reinforced prospecting pickaxe. Quadruples ore yield when breaking boulders.'
    },

    // Tier III Food & Tools
    STAR_FRUIT: {
        id: 'STAR_FRUIT',
        name: 'Solar Starfruit',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.FOOD,
        icon: '⭐',
        isCraftable: false,
        source: 'Harvested from rare cosmic orchard groves at high noon',
        healAmount: 50,
        energyAmount: 60,
        desc: 'Luminescent cosmic fruit ripening only under high noon. Restores 50 HP and 60 Energy.'
    },
    TORCH: {
        id: 'TORCH',
        name: 'Phosphor Torch',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.TOOL,
        icon: '🔦',
        isCraftable: true,
        source: 'Crafted from Primitive Torch, Ancient Conduit, and Copper Ingot',
        desc: 'High-output phosphor illumination torch. Disperses deepest darkness (180px radius).'
    },

    // Tier IV Food
    NEBULA_STEW: {
        id: 'NEBULA_STEW',
        name: 'Astral Nebula Feast',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.FOOD_TOOLS,
        type: ITEM_TYPE.FOOD,
        icon: '🍲',
        isCraftable: true,
        source: 'Cooked in pot with Starfruit, Wild Cabbage, and Gaia Nectar',
        healAmount: 999,
        energyAmount: 999,
        stasisDuration: 4.0,
        desc: 'Gourmet cosmic stew. Instantly restores all HP & Energy and grants 4.0s invulnerability.'
    },

    // ==========================================
    // 5. SURVIVAL MATERIALS & KEY ITEMS (TIERS I - VI)
    // ==========================================
    // Raw resources (NOT CRAFTABLE - must be found / collected in wild)
    BRANCH: {
        id: 'BRANCH',
        name: 'Pine Branch',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🪵',
        isCraftable: false,
        source: 'Foraged from forest pine trees and fallen timber',
        desc: 'Sturdy seasoned branch harvested from trees. Essential for crafting torches, tools, and fires.'
    },
    FLINT: {
        id: 'FLINT',
        name: 'Flint Stone',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🪨',
        isCraftable: false,
        source: 'Quarried from boulder outcrops and rocky riverbeds',
        desc: 'Sharp silicate mineral quarried from boulder outcrops. Used to strike fire and shape blades.'
    },
    MEDICINAL_HERB: {
        id: 'MEDICINAL_HERB',
        name: 'Wild Ley-Herb',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🌱',
        isCraftable: false,
        source: 'Foraged from wild grasslands and sunny clearings',
        healAmount: 15,
        desc: 'Aromatic medicinal herb. Can be eaten raw for minor healing (15 HP) or distilled into restorative salves.'
    },
    FIBER: {
        id: 'FIBER',
        name: 'Twisted Vine Fiber',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🧶',
        isCraftable: false,
        source: 'Gathered from thick wild vines and tall meadow grass',
        desc: 'Strong tensile plant fibers. Essential for stitching tunics, armor backing, and lashing tools.'
    },
    COPPER_ORE: {
        id: 'COPPER_ORE',
        name: 'Copper Shards',
        tier: ITEM_TIER.COMMON,
        tierName: 'Common',
        tierBadge: 'T1',
        tierColor: '#90a4ae',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🥉',
        isCraftable: false,
        source: 'Mined from subterranean copper mineral seams',
        desc: 'Raw copper mineral shards used for smelting ingots, forging gear, and building circuit relays.'
    },

    // Tier II Materials (Smelted / Refined)
    COPPER_INGOT: {
        id: 'COPPER_INGOT',
        name: 'Smelted Copper Bar',
        tier: ITEM_TIER.UNCOMMON,
        tierName: 'Uncommon',
        tierBadge: 'T2',
        tierColor: '#4caf50',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🧱',
        isCraftable: true,
        source: 'Smelted from Copper Shards at Campfire / Furnace',
        desc: 'Refined conductive copper ingot. Required for smithing uncommon weapons and armor.'
    },

    // Tier III Materials & Key Items
    TITANIUM_INGOT: {
        id: 'TITANIUM_INGOT',
        name: 'Titanium Ingot',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '◽',
        isCraftable: false,
        source: 'Quarried from deep cavern bedrock veins or smelted from slag',
        desc: 'Aerospace grade titanium forged from deep smelter slag. Used for heavy dreadnought plating.'
    },
    ANCIENT_CONDUIT: {
        id: 'ANCIENT_CONDUIT',
        name: 'Matrix Conduit',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🔌',
        isCraftable: false,
        source: 'Scavenged from ancient Dyson vault ruins and rogue automata',
        desc: 'High-density quantum wire line extracted from Dyson vault plates.'
    },
    SUB_CORE_KEYCARD: {
        id: 'SUB_CORE_KEYCARD',
        name: 'Sub-Bedrock Access Pass',
        tier: ITEM_TIER.RARE,
        tierName: 'Rare',
        tierBadge: 'T3',
        tierColor: '#00b0ff',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.KEY_ITEM,
        icon: '💳',
        isCraftable: false,
        source: 'Guarded by Sentinels in the Sub-Core Grotto',
        desc: 'Unlocks the titanium blast door guarding the Dyson core reactor deep within the grotto.'
    },

    // Tier IV Materials & Key Items
    AETHER_CRYSTAL: {
        id: 'AETHER_CRYSTAL',
        name: 'Aether Crystal Core',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '💠',
        isCraftable: false,
        source: 'Harvested from deep geode fissures in subterranean depths',
        desc: 'Concentrated living aether crystal pulsating with harmonic sub-bedrock frequency.'
    },
    VOID_SHARD: {
        id: 'VOID_SHARD',
        name: 'Void Resonance Shard',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.MATERIAL,
        icon: '🌌',
        isCraftable: false,
        source: 'Dropped by Void Aberrations and Resonant Nebula Orbs',
        desc: 'Oscillating fragment of broken spacetime. Used to concoct stasis potions.'
    },
    CELESTIAL_KEY: {
        id: 'CELESTIAL_KEY',
        name: 'Resonance Relic Key',
        tier: ITEM_TIER.EPIC,
        tierName: 'Epic',
        tierBadge: 'T4',
        tierColor: '#ba68c8',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.KEY_ITEM,
        icon: '🗝️',
        isCraftable: false,
        source: 'Earned from Daily Holding Points and Milestone Quests',
        desc: 'Mystic key that unlocks Astral Vapor, Resonant Nebula, and Singularity Remains.'
    },

    // Tier V Key Items
    DYSON_SEED_RELIC: {
        id: 'DYSON_SEED_RELIC',
        name: 'Genesis Core Relic',
        tier: ITEM_TIER.LEGENDARY,
        tierName: 'Legendary',
        tierBadge: 'T5',
        tierColor: '#ffb300',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.KEY_ITEM,
        icon: '🔮',
        isCraftable: false,
        source: 'Defeat the Aegis Dreadnought Boss',
        desc: 'Encrypted storage crystal containing the master seed of the planetary core.'
    },
    STAR_MATRIX_TOKEN: {
        id: 'STAR_MATRIX_TOKEN',
        name: 'Star Matrix Token',
        tier: ITEM_TIER.LEGENDARY,
        tierName: 'Legendary',
        tierBadge: 'T5',
        tierColor: '#ffb300',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.KEY_ITEM,
        icon: '✡',
        isCraftable: false,
        source: 'Earned from Title Screen Daily Holding Points and Remains Pity Meter',
        desc: 'Cosmic currency recognized across dimensional astral bazaars for legendary blessings.'
    },

    // Tier VI Mythic Key Items
    PRIMORDIAL_CORE: {
        id: 'PRIMORDIAL_CORE',
        name: 'Heart of the Void Singularity',
        tier: ITEM_TIER.MYTHIC,
        tierName: 'Mythic',
        tierBadge: 'T6',
        tierColor: '#ff1744',
        category: ITEM_CATEGORY.MATERIALS_KEYS,
        type: ITEM_TYPE.KEY_ITEM,
        icon: '🌀',
        isCraftable: false,
        source: 'Exclusive to Primordial Singularity Remains (Day 6 / 100 Pity Points)',
        desc: 'The primordial origin shard from which all planetary matter condensed.'
    }
};

/**
 * Balanced Crafting Recipes
 * STRICT RULE: Only items with isCraftable = true can be crafted!
 * Raw resources (Branches, Flint, Herbs, Ores, Fibers, Crystals, Relics) must be found in the world.
 */
const CRAFTING_RECIPES = [
    // --- Tier 1 Common Recipes ---
    {
        id: 'PRIMITIVE_TORCH',
        resultId: 'PRIMITIVE_TORCH',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Primitive Torch',
        desc: 'Illuminates darkness and subterranean caverns (135px radius).',
        materials: [
            { itemId: 'BRANCH', count: 1 },
            { itemId: 'FLINT', count: 1 }
        ]
    },
    {
        id: 'STONE_AXE',
        resultId: 'STONE_AXE',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Primitive Stone Axe',
        desc: 'Lashed flint handaxe. Equips as primary weapon (+10 Melee Damage).',
        materials: [
            { itemId: 'BRANCH', count: 2 },
            { itemId: 'FLINT', count: 2 }
        ]
    },
    {
        id: 'CRUDE_DAGGER',
        resultId: 'CRUDE_DAGGER',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Flint Shank Dagger',
        desc: 'Light flint blade. +8 Damage, +15 Speed.',
        materials: [
            { itemId: 'FLINT', count: 1 },
            { itemId: 'BRANCH', count: 1 }
        ]
    },
    {
        id: 'PINE_CLUB',
        resultId: 'PINE_CLUB',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Hardened Pine Cudgel',
        desc: 'Dense wooden club. +12 Damage, high stagger force.',
        materials: [
            { itemId: 'BRANCH', count: 3 }
        ]
    },
    {
        id: 'PIONEER_TUNIC',
        resultId: 'PIONEER_TUNIC',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Scavenger Twill Tunic',
        desc: 'Light woven exploration tunic. +6 Defense, +15 Max HP.',
        materials: [
            { itemId: 'FIBER', count: 3 }
        ]
    },
    {
        id: 'WOODEN_BUCKLER',
        resultId: 'WOODEN_BUCKLER',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Pine Reinforcement Buckler',
        desc: 'Sturdy wooden shield. +8 Defense.',
        materials: [
            { itemId: 'BRANCH', count: 3 },
            { itemId: 'FIBER', count: 2 }
        ]
    },
    {
        id: 'HERBAL_SALVE',
        resultId: 'HERBAL_SALVE',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Herbal Restorative Salve',
        desc: 'Crushed ley-herbs and sweet berries. Instantly restores 45 HP.',
        materials: [
            { itemId: 'MEDICINAL_HERB', count: 2 },
            { itemId: 'WILD_BERRY', count: 1 }
        ]
    },
    {
        id: 'ENERGY_SALVE',
        resultId: 'ENERGY_SALVE',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Energy Salve',
        desc: 'Restores 50 Energy and 20 HP.',
        materials: [
            { itemId: 'MEDICINAL_HERB', count: 2 },
            { itemId: 'COPPER_ORE', count: 1 }
        ]
    },
    {
        id: 'ROASTED_CABBAGE',
        resultId: 'ROASTED_CABBAGE',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Fire-Roasted Cabbage',
        desc: 'Nutritious charred cabbage meal. Restores 30 HP and 50 Energy.',
        materials: [
            { itemId: 'WILD_CABBAGE', count: 1 },
            { itemId: 'BRANCH', count: 1 }
        ]
    },
    {
        id: 'BREAD',
        resultId: 'BREAD',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Field Bread',
        desc: 'Fresh baked hamlet bread. Restores 25 HP and 35 Energy.',
        materials: [
            { itemId: 'MEDICINAL_HERB', count: 2 },
            { itemId: 'BRANCH', count: 1 }
        ]
    },
    {
        id: 'CAMPFIRE_KIT',
        resultId: 'CAMPFIRE_KIT',
        resultCount: 1,
        tier: ITEM_TIER.COMMON,
        name: 'Campfire Assembly Kit',
        desc: 'Deploys a permanent field campfire that radiates warmth and safety.',
        materials: [
            { itemId: 'FLINT', count: 2 },
            { itemId: 'BRANCH', count: 3 }
        ]
    },

    // --- Tier 2 Uncommon Recipes ---
    {
        id: 'COPPER_INGOT',
        resultId: 'COPPER_INGOT',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Smelted Copper Bar',
        desc: 'Refines raw copper ore shards with fire into a smithable bar.',
        materials: [
            { itemId: 'COPPER_ORE', count: 2 },
            { itemId: 'BRANCH', count: 1 }
        ]
    },
    {
        id: 'COPPER_SHORTSWORD',
        resultId: 'COPPER_SHORTSWORD',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Forged Copper Gladius',
        desc: 'Tempered copper blade. +20 Damage, +10 Speed.',
        materials: [
            { itemId: 'COPPER_INGOT', count: 2 },
            { itemId: 'BRANCH', count: 1 }
        ]
    },
    {
        id: 'HUNTER_SPEAR',
        resultId: 'HUNTER_SPEAR',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Barbed Hunting Spear',
        desc: 'Extended reach spear. +22 Damage, +12 Range.',
        materials: [
            { itemId: 'BRANCH', count: 2 },
            { itemId: 'COPPER_INGOT', count: 1 },
            { itemId: 'FLINT', count: 1 }
        ]
    },
    {
        id: 'COPPER_CARAPACE',
        resultId: 'COPPER_CARAPACE',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Copper Plated Cuirass',
        desc: 'Interlocking beaten copper plates. +14 Defense, +25 Max HP.',
        materials: [
            { itemId: 'COPPER_INGOT', count: 3 },
            { itemId: 'FIBER', count: 2 }
        ]
    },
    {
        id: 'PIONEER_BAND',
        resultId: 'PIONEER_BAND',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Wayfarer Flux Band',
        desc: 'Copper focus ring. +5 Speed, +20 Max Energy.',
        materials: [
            { itemId: 'COPPER_INGOT', count: 1 },
            { itemId: 'FLINT', count: 1 }
        ]
    },
    {
        id: 'ROASTED_SKEWER',
        resultId: 'ROASTED_SKEWER',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Charred Hunter Skewer',
        desc: 'Caramelized berry & vegetable skewer. Restores 50 HP and 55 Energy.',
        materials: [
            { itemId: 'WILD_BERRY', count: 2 },
            { itemId: 'WILD_CABBAGE', count: 1 },
            { itemId: 'BRANCH', count: 1 }
        ]
    },
    {
        id: 'PIONEER_PICKAXE',
        resultId: 'PIONEER_PICKAXE',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Flint Prospecting Pick',
        desc: 'Reinforced pickaxe that quadruples mining yield.',
        materials: [
            { itemId: 'BRANCH', count: 2 },
            { itemId: 'COPPER_INGOT', count: 2 },
            { itemId: 'FLINT', count: 1 }
        ]
    },
    {
        id: 'NANITE_REPAIR_KIT',
        resultId: 'NANITE_REPAIR_KIT',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Nanite Repair Gel',
        desc: 'Micro-repair nanites that heal 45 HP.',
        materials: [
            { itemId: 'HERBAL_SALVE', count: 1 },
            { itemId: 'COPPER_INGOT', count: 1 }
        ]
    },
    {
        id: 'OVERCLOCK_CELL',
        resultId: 'OVERCLOCK_CELL',
        resultCount: 1,
        tier: ITEM_TIER.UNCOMMON,
        name: 'Quantum Overclock Cell',
        desc: 'Restores 60 Energy instantaneously.',
        materials: [
            { itemId: 'COPPER_INGOT', count: 1 },
            { itemId: 'ANCIENT_CONDUIT', count: 1 }
        ]
    },

    // --- Tier 3 Rare Recipes ---
    {
        id: 'ULTRASONIC_SWORD',
        resultId: 'ULTRASONIC_SWORD',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Ultrasonic Broadsword',
        desc: 'Vibrating kinetic blade. +15 Damage, +10 Speed.',
        materials: [
            { itemId: 'COPPER_SHORTSWORD', count: 1 },
            { itemId: 'TITANIUM_INGOT', count: 2 },
            { itemId: 'ANCIENT_CONDUIT', count: 1 }
        ]
    },
    {
        id: 'KINETIC_RAPIER',
        resultId: 'KINETIC_RAPIER',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Kinetic Needle Rapier',
        desc: 'Superconductor rapier. +24 Damage, +22 Speed.',
        materials: [
            { itemId: 'TITANIUM_INGOT', count: 2 },
            { itemId: 'ANCIENT_CONDUIT', count: 1 },
            { itemId: 'COPPER_INGOT', count: 1 }
        ]
    },
    {
        id: 'PHOTON_EMITTER',
        resultId: 'PHOTON_EMITTER',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Arcane Photon Staff',
        desc: 'Particle emitter relic. +12 Damage, +20 Max Energy.',
        materials: [
            { itemId: 'ANCIENT_CONDUIT', count: 2 },
            { itemId: 'COPPER_INGOT', count: 2 }
        ]
    },
    {
        id: 'VANGUARD_CHESTPLATE',
        resultId: 'VANGUARD_CHESTPLATE',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Vanguard Nano-Plating',
        desc: 'Graphene nanotech suit. +20 Defense, +40 Max HP.',
        materials: [
            { itemId: 'TITANIUM_INGOT', count: 3 },
            { itemId: 'ANCIENT_CONDUIT', count: 1 },
            { itemId: 'FIBER', count: 3 }
        ]
    },
    {
        id: 'TORCH',
        resultId: 'TORCH',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Phosphor Torch',
        desc: 'High-intensity phosphor light (180px radius).',
        materials: [
            { itemId: 'PRIMITIVE_TORCH', count: 1 },
            { itemId: 'ANCIENT_CONDUIT', count: 1 },
            { itemId: 'COPPER_INGOT', count: 1 }
        ]
    },
    {
        id: 'BERSERKER_STIM',
        resultId: 'BERSERKER_STIM',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Adrenaline Berserker Stim',
        desc: '+50% Attack Damage for 12.0 seconds.',
        materials: [
            { itemId: 'NANITE_REPAIR_KIT', count: 1 },
            { itemId: 'ANCIENT_CONDUIT', count: 1 }
        ]
    },
    {
        id: 'GAIA_NECTAR',
        resultId: 'GAIA_NECTAR',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Gaia Nectar',
        desc: 'Regenerates 8 HP/s for 10.0 seconds (80 HP total).',
        materials: [
            { itemId: 'STAR_FRUIT', count: 1 },
            { itemId: 'MEDICINAL_HERB', count: 2 }
        ]
    },
    {
        id: 'FORTIFIED_ELIXIR',
        resultId: 'FORTIFIED_ELIXIR',
        resultCount: 1,
        tier: ITEM_TIER.RARE,
        name: 'Ironhide Nanite Tonic',
        desc: 'Increases Defense by +30 for 20.0 seconds.',
        materials: [
            { itemId: 'HERBAL_SALVE', count: 1 },
            { itemId: 'COPPER_INGOT', count: 1 },
            { itemId: 'TITANIUM_INGOT', count: 1 }
        ]
    },

    // --- Tier 4 Epic Recipes ---
    {
        id: 'RUNIC_WARHAMMER',
        resultId: 'RUNIC_WARHAMMER',
        resultCount: 1,
        tier: ITEM_TIER.EPIC,
        name: 'Runic Warhammer',
        desc: 'Titanium gravitational maul. +35 Damage, heavy shockwaves.',
        materials: [
            { itemId: 'TITANIUM_INGOT', count: 3 },
            { itemId: 'AETHER_CRYSTAL', count: 1 }
        ]
    },
    {
        id: 'PLASMA_DAGGER',
        resultId: 'PLASMA_DAGGER',
        resultCount: 1,
        tier: ITEM_TIER.EPIC,
        name: 'Plasma Vibro-Dagger',
        desc: 'Superheated energy edge. +18 Damage, +20 Speed.',
        materials: [
            { itemId: 'TITANIUM_INGOT', count: 2 },
            { itemId: 'AETHER_CRYSTAL', count: 1 },
            { itemId: 'ANCIENT_CONDUIT', count: 1 }
        ]
    },
    {
        id: 'AEGIS_KINETIC_SHIELD',
        resultId: 'AEGIS_KINETIC_SHIELD',
        resultCount: 1,
        tier: ITEM_TIER.EPIC,
        name: 'Aegis Kinetic Buckler',
        desc: 'Deflective energy field buckler. +25 Defense, +100ms parry window.',
        materials: [
            { itemId: 'COPPER_CARAPACE', count: 1 },
            { itemId: 'TITANIUM_INGOT', count: 2 },
            { itemId: 'AETHER_CRYSTAL', count: 1 }
        ]
    },
    {
        id: 'CHRONO_STASIS_ELIXIR',
        resultId: 'CHRONO_STASIS_ELIXIR',
        resultCount: 1,
        tier: ITEM_TIER.EPIC,
        name: 'Chrono Stasis Elixir',
        desc: 'Complete invulnerability to all damage for 5.0 seconds.',
        materials: [
            { itemId: 'AETHER_CRYSTAL', count: 1 },
            { itemId: 'VOID_SHARD', count: 1 }
        ]
    },
    {
        id: 'AEGIS_BARRIER_FLASK',
        resultId: 'AEGIS_BARRIER_FLASK',
        resultCount: 1,
        tier: ITEM_TIER.EPIC,
        name: 'Aegis Barrier Flask',
        desc: 'Deploys an overshield that absorbs 60 points of damage.',
        materials: [
            { itemId: 'AETHER_CRYSTAL', count: 1 },
            { itemId: 'TITANIUM_INGOT', count: 1 }
        ]
    },
    {
        id: 'NEBULA_STEW',
        resultId: 'NEBULA_STEW',
        resultCount: 1,
        tier: ITEM_TIER.EPIC,
        name: 'Astral Nebula Feast',
        desc: 'Gourmet celestial feast. Full HP & Energy restore + 4s invulnerability.',
        materials: [
            { itemId: 'STAR_FRUIT', count: 2 },
            { itemId: 'WILD_CABBAGE', count: 2 },
            { itemId: 'GAIA_NECTAR', count: 1 }
        ]
    }
];

class Inventory {
    constructor(maxSlots = 16) {
        this.maxSlots = maxSlots;
        this.slots = [];
        this.equippedWeapon = null;
        this.equippedArmor = null;

        // Initialize with pioneer survival consumables (Raw materials like wood and flint must be found/collected)
        this.addItem(BASE_ITEMS.NANITE_REPAIR_KIT, 3);
        this.addItem(BASE_ITEMS.OVERCLOCK_CELL, 2);
    }

    addItem(item, count = 1) {
        if (!item) return false;
        let itemObj = item;
        if (typeof item === 'string') {
            itemObj = BASE_ITEMS[item] || {
                id: item,
                name: item,
                tier: ITEM_TIER.COMMON,
                tierName: 'Common',
                tierBadge: 'T1',
                tierColor: '#90a4ae',
                category: ITEM_CATEGORY.CONSUMABLES,
                type: ITEM_TYPE.CONSUMABLE,
                icon: '📦',
                isCraftable: false
            };
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
        if ((recipe.resultId === 'PRIMITIVE_TORCH' || recipe.resultId === 'TORCH') && player) {
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
                player.weaponTier = 1;
                player.weaponLifeSteal = 0;
            }
            return { success: true, action: 'UNEQUIP_WEAPON', message: `Unequipped ${item.name}.` };
        }
        this.equippedWeapon = item;
        if (player) {
            player.attackDamageBonus = item.damageBonus || 0;
            player.weaponSpeedBonus = item.speedBonus || 0;
            player.weaponTier = item.tier || 1;
            player.weaponLifeSteal = item.lifeSteal || 0;
        }
        return { success: true, action: 'EQUIP_WEAPON', message: `Equipped ${item.name} (+${item.damageBonus || 0} Dmg, ${item.tierBadge})!` };
    }

    equipArmor(item, player) {
        if (this.equippedArmor && this.equippedArmor.id === item.id) {
            // Unequip
            this.equippedArmor = null;
            if (player) {
                player.defenseBonus = 0;
                player.parryBonus = 0;
                player.armorReflect = 0;
            }
            return { success: true, action: 'UNEQUIP_ARMOR', message: `Unequipped ${item.name}.` };
        }
        this.equippedArmor = item;
        if (player) {
            player.defenseBonus = item.defenseBonus || 0;
            player.parryBonus = item.parryBonus || 0;
            player.armorReflect = item.reflectDamage || 0;
            if (item.maxHpBonus) {
                player.maxHp = (player.baseMaxHp || player.maxHp) + item.maxHpBonus;
                player.hp = Math.min(player.maxHp, player.hp + item.maxHpBonus);
            }
        }
        return { success: true, action: 'EQUIP_ARMOR', message: `Equipped ${item.name} (+${item.defenseBonus || 0} Def, ${item.tierBadge})!` };
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
            if (item.fortifyDuration && player) {
                player.fortifyTimer = (player.fortifyTimer || 0) + item.fortifyDuration;
                player.fortifyDefense = item.defenseBonus || 30;
                effectsApplied.push(`IRONHIDE +${player.fortifyDefense} DEF (${item.fortifyDuration}s)`);
            }
            if (item.permMaxHpBonus && player) {
                player.baseMaxHp = (player.baseMaxHp || player.maxHp) + item.permMaxHpBonus;
                player.maxHp += item.permMaxHpBonus;
                player.hp = player.maxHp;
                effectsApplied.push(`PERM +${item.permMaxHpBonus} MAX HP`);
            }
            if (item.permMaxEnergyBonus && player) {
                player.baseMaxEnergy = (player.baseMaxEnergy || player.maxEnergy) + item.permMaxEnergyBonus;
                player.maxEnergy += item.permMaxEnergyBonus;
                player.energy = player.maxEnergy;
                effectsApplied.push(`PERM +${item.permMaxEnergyBonus} MAX NRG`);
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
                message: `${item.name} (${item.tierBadge}) ready for ancient matrix sockets.`
            };
        }

        return { success: false, reason: 'This item cannot be used directly.' };
    }

    static rollDrop(enemyType, prng) {
        // Deterministic loot drop with Blood Currency and Tier-scaled relics
        const roll = prng ? prng.range(0, 100) : Math.floor(Math.random() * 100);
        if (enemyType === 'AEGIS_DREADNOUGHT') {
            // Boss drops Tier V Legendary / Tier VI Mythic gear
            const isMythic = (prng ? prng.range(0, 100) : Math.floor(Math.random() * 100)) < 35;
            return {
                coins: prng ? prng.range(60, 120) : 85,
                item: isMythic ? BASE_ITEMS.PRIMORDIAL_VOID_SCYTHE : BASE_ITEMS.DYSON_SEED_RELIC
            };
        } else if (roll < 50) {
            let droppedItem = BASE_ITEMS.NANITE_REPAIR_KIT; // T2
            if (roll < 8) droppedItem = BASE_ITEMS.CHRONO_STASIS_ELIXIR; // T4
            else if (roll < 18) droppedItem = BASE_ITEMS.AEGIS_BARRIER_FLASK; // T4
            else if (roll < 28) droppedItem = BASE_ITEMS.BERSERKER_STIM; // T3
            else if (roll < 38) droppedItem = BASE_ITEMS.OVERCLOCK_CELL; // T2
            else droppedItem = BASE_ITEMS.HERBAL_SALVE; // T1

            return {
                coins: prng ? prng.range(5, 18) : 9,
                item: droppedItem
            };
        }
        return { coins: prng ? prng.range(2, 8) : 4, item: null };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ITEM_TIER,
        TIER_CONFIG,
        ITEM_CATEGORY,
        ITEM_TYPE,
        BASE_ITEMS,
        CRAFTING_RECIPES,
        Inventory,
        getBloodDropSvg,
        BLOOD_DROP_SVG,
        BLOOD_DROP_SVG_SM,
        BLOOD_DROP_SVG_LG
    };
}

if (typeof window !== 'undefined') {
    window.ITEM_TIER = ITEM_TIER;
    window.TIER_CONFIG = TIER_CONFIG;
    window.ITEM_CATEGORY = ITEM_CATEGORY;
    window.ITEM_TYPE = ITEM_TYPE;
    window.BASE_ITEMS = BASE_ITEMS;
    window.CRAFTING_RECIPES = CRAFTING_RECIPES;
    window.Inventory = Inventory;
    window.getBloodDropSvg = getBloodDropSvg;
    window.BLOOD_DROP_SVG = BLOOD_DROP_SVG;
    window.BLOOD_DROP_SVG_SM = BLOOD_DROP_SVG_SM;
    window.BLOOD_DROP_SVG_LG = BLOOD_DROP_SVG_LG;
}
