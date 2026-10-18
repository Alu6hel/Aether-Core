/**
 * Aether-Core: Procedural Multi-Area World & Dungeon Generator
 * 
 * Generates an interconnected world with distinct areas:
 * 1. CINDERWATCH_HAMLET (Starting settlement, cobblestone roads, cottages, bridges, NPCs)
 * 2. WHISPERING_WOODS (Expansive 80x80 wilderness, winding rivers, bridges, wildlife, ruins)
 * 3. SUNKEN_GROTTO (Subterranean cavern, waterfalls, bioluminescent mushrooms, crystals)
 * 4. SUB_BEDROCK_CORE (Ancient high-tech Dyson vault with conduits, terminals, boss chamber)
 * 
 * Uses Marching Bitmask Autotiling for authentic GBA aesthetics.
 */

if (typeof require !== 'undefined' && typeof window === 'undefined') {
    const _core = require('./alu_core.js');
    global.AluPrng = _core.AluPrng;
    global.AluPaletteGenerator = _core.AluPaletteGenerator;
    global.AluCoinBondingCurve = _core.AluCoinBondingCurve;
    global.AluNoise = _core.AluNoise;
    global.AluPerlinFbm = _core.AluPerlinFbm;
}

// Tile Type Indices
const TILE = {
    VOID: 0,            // Void shadow / unpassable black
    DEEP_WATER: 1,      // Deep water / river / coolant canal (solid)
    WATER_FOAM: 2,      // Shallow water / shoreline (walkable)
    GROUND: 3,          // Walkable dirt, stone, grass
    FOIL_GRASS: 4,      // Interactive tall grass / alien flora
    CLIFF_LOW: 5,       // Cliff base / rock wall (solid)
    CLIFF_HIGH: 6,      // Cliff plateau / elevated rock (solid)
    CAVE_ENTRANCE: 7,   // Portal / cave mouth to subterranean depths
    SCIFI_CONDUIT: 8,   // Copper / neon conduit line in bedrock
    ANCIENT_TERMINAL: 9,// Sci-Fi console / village town well
    SECRET_SOIL: 10,    // 3x3 hidden arable plot to unlock the Farmer
    PATH_COBBLE: 11,    // Interlocking brick/cobblestone road (walkable)
    WOODEN_BRIDGE: 12,  // Sturdy wooden bridge over water (walkable)
    FENCE_WOOD: 13,     // Split-rail wooden fence (solid)
    BUILDING_WALL: 14,  // Timber/stone building wall (solid)
    BUILDING_ROOF: 15,  // Shingled/thatched cottage roof (solid)
    BUILDING_DOOR: 16,  // Cottage doorway (walkable)
    BUILDING_WINDOW: 17,// Glowing cottage window (solid)
    REEDS_WATER: 18,    // Swaying riverbank reeds (walkable)
    FLOWER_BED: 19,     // Vibrant flower garden (walkable)
    MUSHROOM_GLOW: 20,  // Bioluminescent grotto mushroom (walkable)
    PORTAL_EXIT: 21,    // Stone archway / transition gate
    SAND_DUNE: 22,      // Desert sand dunes (walkable)
    SANDSTONE_RUIN: 23, // Ancient weathered sandstone monolith / wall (solid)
    QUICKSAND: 24,      // Shifting desert sand pit (solid/hazard)
    CLOUD_TURF: 25,     // Solidified cumulus cloud turf in zenith (walkable)
    CELESTIAL_GLASS: 26,// Translucent luminescent glass walkway (walkable)
    STONE_RAMP: 27,     // Walkable carved stone ramp connecting elevation levels
    WOODEN_STAIRS: 28,  // Walkable wooden stairs connecting cliffs
    CLIFF_FACE: 29      // Vertical cliff rock facade
};

const AREA_CONFIG = {
    CINDERWATCH_HAMLET: {
        id: 'CINDERWATCH_HAMLET',
        name: 'CINDERWATCH HAMLET',
        width: 64,
        height: 64,
        bgMusic: 'TOWN_THEME',
        ambientLight: 1.0
    },
    WHISPERING_WOODS: {
        id: 'WHISPERING_WOODS',
        name: 'WHISPERING WOODS',
        width: 80,
        height: 80,
        bgMusic: 'FOREST_THEME',
        ambientLight: 0.95
    },
    SUNKEN_GROTTO: {
        id: 'SUNKEN_GROTTO',
        name: 'SUNKEN GROTTO',
        width: 64,
        height: 64,
        bgMusic: 'CAVERN_THEME',
        ambientLight: 0.45
    },
    SUB_BEDROCK_CORE: {
        id: 'SUB_BEDROCK_CORE',
        name: 'SUB-BEDROCK QUANTUM CORE',
        width: 64,
        height: 64,
        bgMusic: 'CORE_THEME',
        ambientLight: 0.70
    },
    SOLARIUM_DUNES: {
        id: 'SOLARIUM_DUNES',
        name: 'SOLARIUM WASTES & DUNES',
        width: 64,
        height: 64,
        bgMusic: 'DUNES_THEME',
        ambientLight: 1.0
    },
    CELESTIAL_ZENITH: {
        id: 'CELESTIAL_ZENITH',
        name: 'CELESTIAL ZENITH PEAK',
        width: 70,
        height: 70,
        bgMusic: 'ZENITH_THEME',
        ambientLight: 1.0
    }
};

class WorldMap {
    constructor(seed, width = 64, height = 64, layer = 'CINDERWATCH_HAMLET') {
        this.seed = seed;
        
        // Resolve legacy layer names
        let resolvedArea = layer;
        if (layer === 'SURFACE') resolvedArea = 'CINDERWATCH_HAMLET';
        if (layer === 'SUB_CORE') resolvedArea = 'SUB_BEDROCK_CORE';

        this.areaId = resolvedArea;
        const cfg = AREA_CONFIG[resolvedArea] || AREA_CONFIG.CINDERWATCH_HAMLET;
        this.areaName = cfg.name;
        this.layer = (resolvedArea === 'SUB_BEDROCK_CORE' || resolvedArea === 'SUNKEN_GROTTO') ? 'SUB_CORE' : 'SURFACE';
        this.width = cfg.width;
        this.height = cfg.height;
        this.tileSize = 16;
        
        this.tiles = new Uint8Array(this.width * this.height);
        this.elevation = new Uint8Array(this.width * this.height);
        this.elevation.fill(1); // Default tier 1
        this.heightStep = 10;   // Pixels per elevation tier
        this.ramps = [];        // Carved ramp markers
        this.decor = new Uint8Array(this.width * this.height);
        this.palette = AluPaletteGenerator.generate(seed);
        this.bondingCurve = new AluCoinBondingCurve(seed);
        this.spawnPoint = { x: 28 * 16 + 8, y: 26 * 16 + 8 };
        this.caveEntrance = null;
        this.secretSoilArea = null;
        this.enemies = [];
        this.terminals = [];
        this.interactiveGrass = [];
        this.chests = [];
        this.sparkles = [];
        this.resourceNodes = [];
        this.portals = [];
        this.chimneys = [];

        this.generate();
    }

    get(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILE.CLIFF_LOW;
        return this.tiles[y * this.width + x];
    }

    set(x, y, tile) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y * this.width + x] = tile;
        }
    }

    getElevation(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 1;
        return this.elevation[y * this.width + x];
    }

    setElevation(x, y, elev) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.elevation[y * this.width + x] = Math.max(0, Math.min(3, Math.round(elev)));
        }
    }

    getElevationAt(worldX, worldY) {
        const tx = Math.floor(worldX / this.tileSize);
        const ty = Math.floor(worldY / this.tileSize);
        return this.getElevation(tx, ty);
    }

    isRamp(tx, ty) {
        const t = this.get(tx, ty);
        return t === TILE.STONE_RAMP || t === TILE.WOODEN_STAIRS;
    }

    isCliffEdge(tx, ty) {
        const cur = this.getElevation(tx, ty);
        const south = this.getElevation(tx, ty + 1);
        return cur > south;
    }

    isSolid(tx, ty) {
        const t = this.get(tx, ty);
        // Ramps and stairs are explicitly walkable transitions
        if (t === TILE.STONE_RAMP || t === TILE.WOODEN_STAIRS) {
            return false;
        }
        if (
            t === TILE.CLIFF_LOW ||
            t === TILE.CLIFF_HIGH ||
            t === TILE.DEEP_WATER ||
            t === TILE.VOID ||
            t === TILE.ANCIENT_TERMINAL ||
            t === TILE.FENCE_WOOD ||
            t === TILE.BUILDING_WALL ||
            t === TILE.BUILDING_ROOF ||
            t === TILE.BUILDING_WINDOW ||
            t === TILE.SANDSTONE_RUIN ||
            t === TILE.QUICKSAND
        ) {
            return true;
        }

        // Check if unharvested solid resource node blocks this tile
        // Note: For pine trees, only the base trunk/stump tile is solid; the canopy space above is fully walkable so the player can walk behind it!
        if (this.resourceNodes && this.resourceNodes.length > 0) {
            for (const node of this.resourceNodes) {
                if (node.hp > 0 && (node.type === 'PINE_TREE' || node.type === 'FLINT_BOULDER' || node.type === 'RUNIC_TOTEM' || node.type === 'SUNSTONE_NODE' || node.type === 'STAR_CRYSTAL')) {
                    const ntx = Math.floor(node.x / 16);
                    const nty = Math.floor(node.y / 16);
                    if (ntx === tx && nty === ty) return true;
                }
            }
        }

        return false;
    }

    carveElevationRamps() {
        for (let y = 4; y < this.height - 5; y++) {
            for (let x = 4; x < this.width - 5; x++) {
                const z = this.getElevation(x, y);
                const zSouth = this.getElevation(x, y + 1);
                // When there is a south-facing 1-tier drop from tier 2 to tier 1
                if (z === 2 && zSouth === 1) {
                    const tNorth = this.get(x, y);
                    const tSouth = this.get(x, y + 1);
                    if ((tNorth === TILE.GROUND || tNorth === TILE.FOIL_GRASS) &&
                        (tSouth === TILE.GROUND || tSouth === TILE.FOIL_GRASS || tSouth === TILE.PATH_COBBLE)) {
                        this.set(x, y, TILE.STONE_RAMP);
                        this.set(x, y + 1, TILE.STONE_RAMP);
                        this.ramps.push({ x, y, tierLow: 1, tierHigh: 2, dir: 'SOUTH' });
                        x += 8; // Spread ramps naturally along ridge lines
                    }
                }
            }
        }
    }

    generate() {
        const prng = new AluPrng(this.seed + (this.areaId === 'WHISPERING_WOODS' ? 0x1111 : 
                                               this.areaId === 'SUNKEN_GROTTO' ? 0x5555 : 
                                               this.areaId === 'SUB_BEDROCK_CORE' ? 0x9999 : 
                                               this.areaId === 'SOLARIUM_DUNES' ? 0x3333 :
                                               this.areaId === 'CELESTIAL_ZENITH' ? 0x7777 : 0x0000));

        switch (this.areaId) {
            case 'CINDERWATCH_HAMLET':
                this.generateHamlet(prng);
                break;
            case 'WHISPERING_WOODS':
            case 'SURFACE':
                this.generateWoods(prng);
                break;
            case 'SUNKEN_GROTTO':
                this.generateGrotto(prng);
                break;
            case 'SUB_BEDROCK_CORE':
            case 'SUB_CORE':
                this.generateSubCore(prng);
                break;
            case 'SOLARIUM_DUNES':
                this.generateSolariumDunes(prng);
                break;
            case 'CELESTIAL_ZENITH':
                this.generateCelestialZenith(prng);
                break;
            default:
                this.generateHamlet(prng);
                break;
        }
    }

    /**
     * Area 1: CINDERWATCH HAMLET (Starting village with cobblestone, houses, river, bridge, NPCs)
     */
    generateHamlet(prng = null) {
        if (!prng) prng = new AluPrng(this.seed);
        // Base terrain: grassy plains (Tier 1) with northern elevated terrace (Tier 2)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.set(x, y, TILE.CLIFF_LOW);
                    this.setElevation(x, y, 2);
                } else if (y <= 7) {
                    // Northern elevated foothill terrace
                    const isFoil = (prng.range(0, 100) < 16);
                    this.set(x, y, isFoil ? TILE.FOIL_GRASS : TILE.GROUND);
                    this.setElevation(x, y, 2);
                } else {
                    const isFoil = (prng.range(0, 100) < 16);
                    this.set(x, y, isFoil ? TILE.FOIL_GRASS : TILE.GROUND);
                    this.setElevation(x, y, 1);
                }
            }
        }

        // River flowing vertically through eastern district with seed-based curvature (Tier 0)
        const riverBaseX = 48 + (prng.range(0, 5) - 2); // 46 to 50
        const riverFreq = 0.13 + prng.range(0, 3) * 0.02;
        const riverAmp = 1.2 + prng.range(0, 3) * 0.4;
        const riverPhase = (prng.range(0, 20) / 10);
        for (let y = 0; y < this.height; y++) {
            const rx = Math.floor(riverBaseX + Math.sin(y * riverFreq + riverPhase) * riverAmp);
            this.set(rx - 1, y, TILE.WATER_FOAM);
            this.set(rx, y, TILE.DEEP_WATER);
            this.set(rx + 1, y, TILE.DEEP_WATER);
            this.set(rx + 2, y, TILE.DEEP_WATER);
            this.set(rx + 3, y, TILE.WATER_FOAM);

            for (let bx = rx - 1; bx <= rx + 3; bx++) {
                this.setElevation(bx, y, 0); // Deep river channel
            }

            // Reeds along the riverbanks
            if (y % 4 === 0) {
                this.set(rx - 2, y, TILE.REEDS_WATER);
                this.set(rx + 4, y, TILE.REEDS_WATER);
                this.setElevation(rx - 2, y, 0);
                this.setElevation(rx + 4, y, 0);
            }
        }

        // Wooden Bridge spanning the river at y = 26 to 28 (Tier 1 bridge walkway)
        for (let by = 26; by <= 28; by++) {
            const rx = Math.floor(riverBaseX + Math.sin(by * riverFreq + riverPhase) * riverAmp);
            for (let bx = rx - 2; bx <= rx + 4; bx++) {
                this.set(bx, by, TILE.WOODEN_BRIDGE);
                this.setElevation(bx, by, 1);
            }
        }

        // Wooden Stairs connecting northern terrace to hamlet square
        for (let sx = 27; sx <= 29; sx++) {
            this.set(sx, 8, TILE.WOODEN_STAIRS);
            this.ramps.push({ x: sx, y: 8, tierLow: 1, tierHigh: 2, dir: 'SOUTH' });
        }

        // Cobblestone Main Road (North-South & East-West crossing at Town Square)
        // Town Square: x = 24 to 32, y = 20 to 28
        for (let y = 20; y <= 28; y++) {
            for (let x = 24; x <= 32; x++) {
                this.set(x, y, TILE.PATH_COBBLE);
            }
        }

        // North Road leading to Whispering Woods
        for (let y = 1; y < 20; y++) {
            this.set(27, y, TILE.PATH_COBBLE);
            this.set(28, y, TILE.PATH_COBBLE);
            this.set(29, y, TILE.PATH_COBBLE);
        }

        // East Road leading across bridge
        for (let by = 26; by <= 28; by++) {
            const rx = Math.floor(riverBaseX + Math.sin(by * riverFreq + riverPhase) * riverAmp);
            for (let x = 32; x < rx - 2; x++) {
                this.set(x, by, TILE.PATH_COBBLE);
            }
            for (let x = rx + 5; x < 62; x++) {
                this.set(x, by, TILE.PATH_COBBLE);
            }
        }

        // South Road leading to Southern Gates
        for (let y = 29; y < this.height - 1; y++) {
            this.set(27, y, TILE.PATH_COBBLE);
            this.set(28, y, TILE.PATH_COBBLE);
            this.set(29, y, TILE.PATH_COBBLE);
        }

        // West Road leading to Herbalist's Apothecary
        for (let x = 12; x < 24; x++) {
            this.set(x, 26, TILE.PATH_COBBLE);
            this.set(x, 27, TILE.PATH_COBBLE);
        }

        // Town Square Ancient Well / Altar
        this.set(28, 24, TILE.ANCIENT_TERMINAL);

        // Build Cottages with roofs, walls, doors, windows, and chimneys
        // 1. Elder's Hall (North-West: x = 18 to 23, y = 12 to 17)
        this.buildCottage(18, 12, 6, 6, 21, 17, 20, 16);
        // 2. Blacksmith Thorne's Forge (East: x = 38 to 44, y = 12 to 17)
        this.buildCottage(38, 12, 7, 6, 41, 17, 43, 16);
        // 3. Herbalist Maeve's Apothecary (South-West: x = 12 to 18, y = 30 to 35)
        this.buildCottage(12, 30, 7, 6, 15, 35, 17, 34);
        // 4. Scavenger's Workshop (South-East: x = 36 to 41, y = 36 to 41)
        this.buildCottage(36, 36, 6, 6, 39, 41, 38, 40);

        // Fences around flower beds and pastures
        for (let fx = 12; fx <= 22; fx++) {
            this.set(fx, 38, TILE.FENCE_WOOD);
            this.set(fx, 45, TILE.FENCE_WOOD);
        }
        for (let fy = 38; fy <= 45; fy++) {
            this.set(12, fy, TILE.FENCE_WOOD);
            this.set(22, fy, TILE.FENCE_WOOD);
        }
        // Gate in fence
        this.set(17, 38, TILE.GROUND);

        // Fill herbalist garden with flower beds
        for (let gy = 39; gy <= 44; gy++) {
            for (let gx = 13; gx <= 21; gx++) {
                if (gx % 2 === 0 && gy % 2 === 0) {
                    this.set(gx, gy, TILE.FLOWER_BED);
                }
            }
        }

        // Portals / Gateways
        // North Gate leads to WHISPERING_WOODS (also serves as cave entrance)
        this.set(28, 1, TILE.PORTAL_EXIT);
        this.caveEntrance = { x: 28, y: 1 };
        this.portals.push({
            id: 'portal_to_woods',
            x: 28 * 16 + 8,
            y: 2 * 16 + 8,
            targetArea: 'WHISPERING_WOODS',
            targetSpawn: { x: 36 * 16 + 8, y: 74 * 16 + 8 },
            label: 'NORTH TO WHISPERING WOODS'
        });

        // South Gate leads to SOLARIUM_DUNES
        this.set(28, 62, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_dunes',
            x: 28 * 16 + 8,
            y: 62 * 16 + 8,
            targetArea: 'SOLARIUM_DUNES',
            targetSpawn: { x: 32 * 16 + 8, y: 5 * 16 + 8 },
            label: 'SOUTH TO SOLARIUM WASTES'
        });

        // Ancient cracked sci-fi terminal near boundary
        this.set(10, 8, TILE.ANCIENT_TERMINAL);
        this.terminals.push({
            x: 10 * 16 + 8,
            y: 8 * 16 + 8,
            name: "Terminal 07-A: Dyson Climate Array",
            log: "STATUS: Atmospheric Nanites at 99.4% stability. Magic dispersion nominal. Core temperature rising."
        });

        // Player Spawn Point in front of Town Square
        this.spawnPoint = { x: 28 * 16 + 8, y: 26 * 16 + 8 };

        // Generate Village Resource Nodes
        this.resourceNodes = [];
        this.generateVillageResourceNodes(prng);
    }

    buildCottage(x, y, w, h, doorX, doorY, winX, winY) {
        // Roof top
        for (let cx = x; cx < x + w; cx++) {
            for (let cy = y; cy < y + Math.floor(h / 2); cy++) {
                this.set(cx, cy, TILE.BUILDING_ROOF);
            }
        }
        // Walls
        for (let cx = x; cx < x + w; cx++) {
            for (let cy = y + Math.floor(h / 2); cy < y + h; cy++) {
                this.set(cx, cy, TILE.BUILDING_WALL);
            }
        }
        // Door
        this.set(doorX, doorY, TILE.BUILDING_DOOR);
        // Window
        if (winX && winY) this.set(winX, winY, TILE.BUILDING_WINDOW);

        // Register chimney at top-right of roof
        this.chimneys.push({ x: (x + w - 1) * 16 + 8, y: y * 16 + 4 });
    }

    generateVillageResourceNodes(prng) {
        // Campfire in village square
        this.resourceNodes.push({
            id: 'hamlet_campfire',
            type: 'CAMPFIRE_SITE',
            x: 32 * 16 + 8,
            y: 24 * 16 + 8,
            hp: 999,
            maxHp: 999,
            drops: 'ROASTED_CABBAGE',
            dropCount: 1,
            dropCoins: 0,
            lit: true,
            name: 'Village Cooking Campfire'
        });

        // Ancient Runic Totem Monolith near old boundary
        this.resourceNodes.push({
            id: 'hamlet_totem',
            type: 'RUNIC_TOTEM',
            x: 10 * 16 + 8,
            y: 12 * 16 + 8,
            hp: 999,
            maxHp: 999,
            drops: 'DYSON_SEED_RELIC',
            dropCount: 1,
            dropCoins: 5,
            name: 'Hamlet Boundary Totem'
        });

        // Cabbages in garden (8 count)
        for (let i = 0; i < 8; i++) {
            this.resourceNodes.push({
                id: `hamlet_cabbage_${i}`,
                type: 'WILD_CABBAGE',
                x: (14 + (i % 4) * 2) * 16 + 8,
                y: (40 + Math.floor(i / 4) * 2) * 16 + 8,
                hp: 1,
                maxHp: 1,
                drops: 'WILD_CABBAGE',
                dropCount: 1,
                dropCoins: 1,
                name: 'Tilled Village Cabbage'
            });
        }

        // Wild Berry Bushes along riverbank / hedges (10 count)
        for (let i = 0; i < 10; i++) {
            this.resourceNodes.push({
                id: `hamlet_berry_${i}`,
                type: 'BERRY_BUSH',
                x: (44 + (i % 2) * 8) * 16 + 8,
                y: (8 + i * 5) * 16 + 8,
                hp: 1,
                maxHp: 1,
                drops: 'WILD_BERRY',
                dropCount: 2,
                dropCoins: 1,
                name: 'Wild Berry Bush'
            });
        }

        // Medicinal Herbs near herbalist garden (8 count)
        for (let i = 0; i < 8; i++) {
            this.resourceNodes.push({
                id: `hamlet_herb_${i}`,
                type: 'MEDICINAL_HERB',
                x: (15 + (i % 4) * 2) * 16 + 8,
                y: (36 + Math.floor(i / 4) * 2) * 16 + 8,
                hp: 1,
                maxHp: 1,
                drops: 'MEDICINAL_HERB',
                dropCount: 1,
                dropCoins: 1,
                name: 'Medicinal Herb'
            });
        }

        // Pine trees in outskirts (18 count) - placed strictly on clear grassy ground
        let pineCount = 0;
        let attempts = 0;
        while (pineCount < 18 && attempts < 300) {
            attempts++;
            let px, py;
            const region = pineCount % 3;
            if (region === 0) {
                px = 3 + ((attempts * 3) % 13);
                py = 3 + (Math.floor(attempts / 13) % 20);
            } else if (region === 1) {
                px = 3 + ((attempts * 2) % 8);
                py = 36 + (Math.floor(attempts / 8) % 20);
            } else {
                px = 48 + ((attempts * 2) % 12);
                py = 3 + (Math.floor(attempts / 12) % 20);
            }
            if (px >= 2 && px < this.width - 2 && py >= 2 && py < this.height - 2) {
                if (this.get(px, py) === TILE.GROUND && !this.isSolid(px, py)) {
                    const existing = this.resourceNodes.find(n => Math.floor(n.x / 16) === px && Math.floor(n.y / 16) === py);
                    if (!existing) {
                        this.resourceNodes.push({
                            id: `hamlet_pine_${pineCount}`,
                            type: 'PINE_TREE',
                            x: px * 16 + 8,
                            y: py * 16 + 8,
                            hp: 3,
                            maxHp: 3,
                            drops: 'BRANCH',
                            dropCount: 2,
                            dropCoins: 1,
                            name: 'Village Boundary Pine'
                        });
                        pineCount++;
                    }
                }
            }
        }

        // Flint Rock Boulders near stone quarry & boundary cliffs (12 count)
        for (let i = 0; i < 12; i++) {
            const fx = 56 + (i % 2) * 4;
            const fy = 10 + i * 4;
            this.resourceNodes.push({
                id: `hamlet_flint_${i}`,
                type: 'FLINT_BOULDER',
                x: fx * 16 + 8,
                y: fy * 16 + 8,
                hp: 4,
                maxHp: 4,
                drops: 'FLINT',
                dropCount: 2,
                dropCoins: 2,
                name: 'Quarry Flint Boulder'
            });
        }

        // Supply Pod in square
        this.chests.push({
            id: 'hamlet_chest',
            x: 25 * 16 + 8,
            y: 22 * 16 + 8,
            opened: false,
            itemId: 'PRIMITIVE_TORCH',
            count: 1,
            coins: 25
        });

        // Foraging sparkles
        this.sparkles.push({
            id: 'hamlet_sparkle_1',
            x: 26 * 16 + 8,
            y: 25 * 16 + 8,
            collected: false,
            coins: 10,
            itemId: null
        });
    }

    /**
     * Area 2: WHISPERING WOODS (Large 80x80 wilderness with winding rivers, bridges, wildlife, and cave mouth)
     */
    generateWoods(prng = null) {
        if (!prng) prng = new AluPrng(this.seed);
        // Multi-octave Fractional Brownian Motion (fBm) noise elevation (Ace Rollola & Isoccor model)
        const noise = (typeof AluNoise !== 'undefined') ? new AluNoise(this.seed + 0x1111) : null;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.set(x, y, TILE.CLIFF_LOW);
                    this.setElevation(x, y, 2);
                    continue;
                }

                const nx = x / this.width - 0.5;
                const ny = y / this.height - 0.5;
                const distFromCenter = Math.sqrt(nx * nx + ny * ny) * 2.0;

                const fbmVal = noise ? noise.fbm(x, y, 4, 0.5, 2.0, 0.055) : 0.5;
                const val = (1.0 - distFromCenter * 0.4) * 0.3 + fbmVal * 0.7;

                if (val < 0.22) {
                    this.set(x, y, TILE.DEEP_WATER);
                    this.setElevation(x, y, 0); // Lowland water basin
                } else if (val < 0.30) {
                    this.set(x, y, TILE.WATER_FOAM);
                    this.setElevation(x, y, 0);
                } else if (val < 0.62) {
                    const isFoil = (prng.range(0, 100) < 24);
                    this.set(x, y, isFoil ? TILE.FOIL_GRASS : TILE.GROUND);
                    this.setElevation(x, y, 1); // Base forest plain
                } else if (val < 0.82) {
                    const isFoil = (prng.range(0, 100) < 15);
                    this.set(x, y, isFoil ? TILE.FOIL_GRASS : TILE.GROUND);
                    this.setElevation(x, y, 2); // Highland plateau
                } else {
                    this.set(x, y, TILE.CLIFF_HIGH);
                    this.setElevation(x, y, 3); // High mountain ridge
                }
            }
        }

        // Winding River through the woods (x = ~38 to 44)
        for (let y = 0; y < this.height; y++) {
            const rx = Math.floor(38 + Math.sin(y * 0.12) * 5.0);
            this.set(rx - 1, y, TILE.WATER_FOAM);
            this.set(rx, y, TILE.DEEP_WATER);
            this.set(rx + 1, y, TILE.DEEP_WATER);
            this.set(rx + 2, y, TILE.DEEP_WATER);
            this.set(rx + 3, y, TILE.WATER_FOAM);
            for (let bx = rx - 1; bx <= rx + 3; bx++) {
                this.setElevation(bx, y, 0);
            }

            if (y % 5 === 0) {
                this.set(rx - 2, y, TILE.REEDS_WATER);
                this.set(rx + 4, y, TILE.REEDS_WATER);
                this.setElevation(rx - 2, y, 0);
                this.setElevation(rx + 4, y, 0);
            }
        }

        // Two Wooden Bridges across the forest river
        for (const by of [28, 54]) {
            const rx = Math.floor(38 + Math.sin(by * 0.12) * 5.0);
            for (let bdy = -1; bdy <= 1; bdy++) {
                for (let bx = rx - 2; bx <= rx + 5; bx++) {
                    this.set(bx, by + bdy, TILE.WOODEN_BRIDGE);
                    this.setElevation(bx, by + bdy, 1);
                }
            }
        }

        // Carve walkable stone ramps connecting elevation tiers
        this.carveElevationRamps();

        // South Gate returning to Cinderwatch Hamlet
        const southY = Math.min(this.height - 2, 78);
        const southX = Math.min(this.width - 2, 36);
        this.set(southX, southY, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_hamlet',
            x: southX * 16 + 8,
            y: (southY - 1) * 16 + 8,
            targetArea: 'CINDERWATCH_HAMLET',
            targetSpawn: { x: 28 * 16 + 8, y: 4 * 16 + 8 },
            label: 'SOUTH TO CINDERWATCH HAMLET'
        });

        // North-East Cave Mouth leading to Sunken Grotto
        let caveX = Math.min(this.width - 16, 64);
        let caveY = Math.min(this.height - 20, 18);
        this.set(caveX, caveY, TILE.CAVE_ENTRANCE);
        this.caveEntrance = { x: caveX, y: caveY };
        this.portals.push({
            id: 'portal_to_grotto',
            x: caveX * 16 + 8,
            y: (caveY + 1) * 16 + 8,
            targetArea: 'SUNKEN_GROTTO',
            targetSpawn: { x: 30 * 16 + 8, y: 10 * 16 + 8 },
            label: 'DESCEND TO SUNKEN GROTTO'
        });

        // West Sky-Ascension Gate leading to Celestial Zenith Peak
        const westX = 3;
        const westY = 40;
        this.set(westX, westY, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_zenith',
            x: westX * 16 + 8,
            y: westY * 16 + 8,
            targetArea: 'CELESTIAL_ZENITH',
            targetSpawn: { x: 58 * 16 + 8, y: 52 * 16 + 8 },
            label: 'ASCEND TO CELESTIAL ZENITH'
        });

        // Spawn point when entering from Hamlet
        this.spawnPoint = { x: southX * 16 + 8, y: (southY - 4) * 16 + 8 };

        // Ancient Runic Shrine / Moonlit Stone Circle (Sacred Grove Landmark)
        const shrineX = 18 + (prng.range(0, 4) - 2);
        const shrineY = 24 + (prng.range(0, 4) - 2);
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                if (dx * dx + dy * dy <= 9) {
                    this.set(shrineX + dx, shrineY + dy, TILE.PATH_COBBLE);
                }
            }
        }
        // 4 Runic Pillars at ordinal corners
        this.set(shrineX - 2, shrineY - 2, TILE.ANCIENT_TERMINAL);
        this.set(shrineX + 2, shrineY - 2, TILE.ANCIENT_TERMINAL);
        this.set(shrineX - 2, shrineY + 2, TILE.ANCIENT_TERMINAL);
        this.set(shrineX + 2, shrineY + 2, TILE.ANCIENT_TERMINAL);
        this.set(shrineX, shrineY, TILE.RUNIC_TOTEM);

        // Ancient cracked sci-fi terminal in Whispering Woods
        const termX = caveX + 4;
        const termY = caveY + 2;
        this.set(termX, termY, TILE.ANCIENT_TERMINAL);
        this.terminals.push({
            x: termX * 16 + 8,
            y: termY * 16 + 8,
            name: "Terminal 08-B: Deep Forest Relay",
            log: "STATUS: Leyline resonance critical. Subterranean conduits leaking tachyon flux."
        });

        // 60 Rich Survival Resource Nodes across Whispering Woods
        this.generateWoodsResourceNodes(prng);
    }

    generateWoodsResourceNodes(prng) {
        this.resourceNodes = [];
        const nodeTypes = [
            { type: 'PINE_TREE', hp: 3, drops: 'BRANCH', count: 2, coins: 1, name: 'Conifer Pine Tree', num: 24 },
            { type: 'FLINT_BOULDER', hp: 4, drops: 'FLINT', count: 2, coins: 2, name: 'Sharp Flint Boulder', num: 16 },
            { type: 'WILD_CABBAGE', hp: 1, drops: 'WILD_CABBAGE', count: 1, coins: 1, name: 'Wild Forest Cabbage', num: 10 },
            { type: 'BERRY_BUSH', hp: 1, drops: 'WILD_BERRY', count: 2, coins: 1, name: 'Wild Berry Bush', num: 12 },
            { type: 'MEDICINAL_HERB', hp: 1, drops: 'MEDICINAL_HERB', count: 1, coins: 1, name: 'Medicinal Herb', num: 8 },
            { type: 'RUNIC_TOTEM', hp: 999, drops: 'DYSON_SEED_RELIC', count: 1, coins: 5, name: 'Ancient Leyline Totem', num: 2 },
            { type: 'CAMPFIRE_SITE', hp: 999, drops: 'ROASTED_CABBAGE', count: 1, coins: 0, name: 'Forest Rest Campfire', num: 2 }
        ];

        let nodeId = 0;
        for (const spec of nodeTypes) {
            let placed = 0;
            let attempts = 0;
            while (placed < spec.num && attempts < 400) {
                attempts++;
                const rx = prng.range(4, this.width - 5);
                const ry = prng.range(4, this.height - 5);
                const tile = this.get(rx, ry);
                if (tile === TILE.GROUND || tile === TILE.FOIL_GRASS) {
                    this.resourceNodes.push({
                        id: `woods_node_${nodeId++}`,
                        type: spec.type,
                        x: rx * 16 + 8,
                        y: ry * 16 + 8,
                        hp: spec.hp,
                        maxHp: spec.hp,
                        drops: spec.drops,
                        dropCount: spec.count,
                        dropCoins: spec.coins,
                        name: spec.name
                    });
                    placed++;
                }
            }
        }

        // Supply Pods & Sparkles in the Woods
        let chestPlaced = 0;
        for (let i = 0; i < 6; i++) {
            for (let attempt = 0; attempt < 40; attempt++) {
                const cx = prng.range(8, this.width - 8);
                const cy = prng.range(8, this.height - 8);
                const tile = this.get(cx, cy);
                if (tile === TILE.GROUND || tile === TILE.FOIL_GRASS || tile === TILE.DIRT) {
                    this.chests.push({
                        id: `woods_pod_${chestPlaced}`,
                        x: cx * 16 + 8,
                        y: cy * 16 + 8,
                        opened: false,
                        itemId: (chestPlaced === 0 ? 'SUB_CORE_KEYCARD' : 'NANITE_REPAIR_KIT'),
                        count: 1,
                        coins: 20 + prng.range(5, 25)
                    });
                    chestPlaced++;
                    break;
                }
            }
        }

        for (let i = 0; i < 14; i++) {
            for (let attempt = 0; attempt < 30; attempt++) {
                const sx = prng.range(6, this.width - 6);
                const sy = prng.range(6, this.height - 6);
                const tile = this.get(sx, sy);
                if (tile === TILE.FOIL_GRASS || tile === TILE.GROUND) {
                    this.sparkles.push({
                        id: `woods_sparkle_${i}`,
                        x: sx * 16 + 8,
                        y: sy * 16 + 8,
                        collected: false,
                        coins: 6 + prng.range(2, 8),
                        itemId: (i === 2 ? 'NANITE_REPAIR_KIT' : null)
                    });
                    break;
                }
            }
        }
    }

    /**
     * Area 3: SUNKEN GROTTO (Subterranean cavern with waterfalls, glowing mushrooms, crystals, and descent to core)
     */
    generateGrotto(prng = null) {
        if (!prng) prng = new AluPrng(this.seed);
        // Enclosed cavern
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x < 3 || x >= this.width - 3 || y < 3 || y >= this.height - 3) {
                    this.set(x, y, TILE.CLIFF_LOW);
                    this.setElevation(x, y, 2);
                } else {
                    this.set(x, y, TILE.GROUND);
                    this.setElevation(x, y, 1);
                }
            }
        }

        // Cavern Pillar Formations & Natural Walls
        for (let i = 0; i < 18; i++) {
            const px = prng.range(8, this.width - 8);
            const py = prng.range(8, this.height - 8);
            const r = prng.range(2, 4);
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy <= r * r) {
                        this.set(px + dx, py + dy, TILE.CLIFF_LOW);
                        this.setElevation(px + dx, py + dy, 2);
                    }
                }
            }
        }

        // Underground stream flowing across cavern floor (Tier 0)
        for (let x = 6; x < this.width - 6; x++) {
            const sy = Math.floor(34 + Math.sin(x * 0.15) * 3.0);
            this.set(x, sy - 1, TILE.WATER_FOAM);
            this.set(x, sy, TILE.DEEP_WATER);
            this.set(x, sy + 1, TILE.DEEP_WATER);
            this.set(x, sy + 2, TILE.WATER_FOAM);
            for (let dy = -1; dy <= 2; dy++) {
                this.setElevation(x, sy + dy, 0);
            }
        }

        // Wooden Bridge over underground stream (Tier 1)
        for (let bx = 28; bx <= 32; bx++) {
            for (let by = 32; by <= 37; by++) {
                this.set(bx, by, TILE.WOODEN_BRIDGE);
                this.setElevation(bx, by, 1);
            }
        }

        // Luminescent Crystal Chasm (Gleaming Cavern Sanctuary at Tier 2)
        const chasmX = 48 + (prng.range(0, 4) - 2);
        const chasmY = 46 + (prng.range(0, 4) - 2);
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                if (dx * dx + dy * dy <= 8) {
                    this.set(chasmX + dx, chasmY + dy, TILE.MUSHROOM_GLOW);
                    this.setElevation(chasmX + dx, chasmY + dy, 2);
                }
            }
        }
        // Carved stone ramp into the sanctuary
        this.set(chasmX, chasmY + 3, TILE.STONE_RAMP);
        this.ramps.push({ x: chasmX, y: chasmY + 3, tierLow: 1, tierHigh: 2, dir: 'SOUTH' });

        this.set(chasmX, chasmY, TILE.ANCIENT_TERMINAL);
        this.terminals.push({
            x: chasmX * 16 + 8,
            y: chasmY * 16 + 8,
            name: "Terminal 09-C: Subterranean Geode Relay",
            log: "STATUS: Resonant crystal lattice operating at 104% harmonic capacity. Deep seismic tremors detected below."
        });

        // North Ladder leading back to Whispering Woods
        this.set(30, 6, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_woods',
            x: 30 * 16 + 8,
            y: 7 * 16 + 8,
            targetArea: 'WHISPERING_WOODS',
            targetSpawn: { x: 64 * 16 + 8, y: 20 * 16 + 8 },
            label: 'ASCEND TO WHISPERING WOODS'
        });

        // South Heavy Blast Door leading to Sub-Bedrock Quantum Core
        this.set(30, 56, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_core',
            x: 30 * 16 + 8,
            y: 55 * 16 + 8,
            targetArea: 'SUB_BEDROCK_CORE',
            targetSpawn: { x: 32 * 16 + 8, y: 8 * 16 + 8 },
            label: 'BREACH SUB-BEDROCK CORE'
        });

        this.spawnPoint = { x: 30 * 16 + 8, y: 10 * 16 + 8 };

        // Grotto Resonant Crystals & Mineral Deposits
        this.resourceNodes = [];
        for (let i = 0; i < 14; i++) {
            const cx = prng.range(6, this.width - 6);
            const cy = prng.range(6, this.height - 6);
            if (this.get(cx, cy) === TILE.GROUND) {
                this.resourceNodes.push({
                    id: `grotto_crystal_${i}`,
                    type: 'GLOWING_CRYSTAL',
                    x: cx * 16 + 8,
                    y: cy * 16 + 8,
                    hp: 2,
                    maxHp: 2,
                    drops: 'NANITE_REPAIR_KIT',
                    dropCount: 1,
                    dropCoins: 8,
                    name: 'Phosphor Grotto Crystal'
                });
            }
        }
    }

    generateSurface(prng = null) {
        if (!prng) prng = new AluPrng(this.seed);
        this.generateWoods(prng);
    }

    /**
     * Area 4: SUB-BEDROCK QUANTUM CORE (Dyson facility with basalt tread-plates, terminals, secret soil, and boss)
     */
    generateSubCore(prng = null) {
        if (!prng) prng = new AluPrng(this.seed + 0x9999);
        // Enclosed industrial vault (Tier 0 abyss void)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.set(x, y, TILE.VOID);
                this.setElevation(x, y, 0);
            }
        }

        // Multi-Room BSP Dungeon Generation
        const rooms = [
            { x: 26, y: 4, w: 12, h: 10 },    // Entrance Chamber
            { x: 10, y: 20, w: 14, h: 14 },   // West Power Conduit Lab
            { x: 40, y: 20, w: 14, h: 14 },   // East Nanite Incubator
            { x: 24, y: 38, w: 16, h: 18 }    // Aegis Dreadnought Boss Sanctum
        ];

        // Carve Rooms
        for (const rm of rooms) {
            for (let ry = rm.y; ry < rm.y + rm.h; ry++) {
                for (let rx = rm.x; rx < rm.x + rm.w; rx++) {
                    if (rx === rm.x || rx === rm.x + rm.w - 1 || ry === rm.y || ry === rm.y + rm.h - 1) {
                        this.set(rx, ry, TILE.CLIFF_LOW);
                        this.setElevation(rx, ry, 2);
                    } else {
                        this.set(rx, ry, TILE.GROUND);
                        this.setElevation(rx, ry, 1);
                    }
                }
            }
        }

        // Corridors connecting chambers (Tier 1 floor)
        for (let cy = 13; cy <= 24; cy++) {
            this.set(31, cy, TILE.GROUND);
            this.set(32, cy, TILE.GROUND);
            this.setElevation(31, cy, 1);
            this.setElevation(32, cy, 1);
        }
        for (let cx = 23; cx <= 41; cx++) {
            this.set(cx, 24, TILE.GROUND);
            this.set(cx, 25, TILE.GROUND);
            this.setElevation(cx, 24, 1);
            this.setElevation(cx, 25, 1);
        }
        for (let cy = 25; cy <= 39; cy++) {
            this.set(31, cy, TILE.GROUND);
            this.set(32, cy, TILE.GROUND);
            this.setElevation(31, cy, 1);
            this.setElevation(32, cy, 1);
        }

        // Boss Sanctum elevated quantum reactor throne (Tier 2)
        for (let ry = 46; ry <= 52; ry++) {
            for (let rx = 28; rx <= 36; rx++) {
                this.setElevation(rx, ry, 2);
            }
        }
        // Metallic stairs leading to reactor throne
        this.set(31, 46, TILE.WOODEN_STAIRS);
        this.set(32, 46, TILE.WOODEN_STAIRS);
        this.ramps.push({ x: 31, y: 46, tierLow: 1, tierHigh: 2, dir: 'SOUTH' });
        this.ramps.push({ x: 32, y: 46, tierLow: 1, tierHigh: 2, dir: 'SOUTH' });

        // 3x3 Secret Arable Plot to unlock Farmer God in West Lab
        this.secretSoilArea = { x: 14, y: 24, w: 3, h: 3 };
        for (let sy = 24; sy <= 26; sy++) {
            for (let sx = 14; sx <= 16; sx++) {
                this.set(sx, sy, TILE.SECRET_SOIL);
            }
        }

        // North Elevator leading back to Sunken Grotto
        this.set(31, 4, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_grotto',
            x: 31 * 16 + 8,
            y: 5 * 16 + 8,
            targetArea: 'SUNKEN_GROTTO',
            targetSpawn: { x: 30 * 16 + 8, y: 53 * 16 + 8 },
            label: 'ASCEND TO SUNKEN GROTTO'
        });

        this.spawnPoint = { x: 31 * 16 + 8, y: 8 * 16 + 8 };

        // Spawn Aegis Dreadnought Boss in Sanctum
        this.enemies.push({
            id: 'boss_aegis_dreadnought',
            type: 'AEGIS_DREADNOUGHT',
            x: 32 * 16 + 8,
            y: 47 * 16 + 8,
            hp: 220,
            maxHp: 220,
            attackDamage: 25,
            isBoss: true,
            state: 'PATROL'
        });

        // High-Tech Vault Crates (Chests) and Data Glints (Sparkles)
        const subItems = ['DYSON_SEED_RELIC', 'OVERCLOCK_CELL', 'NANITE_REPAIR_KIT'];
        for (let i = 0; i < rooms.length; i++) {
            const rm = rooms[i];
            this.chests.push({
                id: `sub_crate_${i}`,
                x: (rm.x + 1) * 16 + 8,
                y: (rm.y + 1) * 16 + 8,
                opened: false,
                itemId: subItems[i % subItems.length],
                count: 1,
                coins: 20 + prng.range(10, 20)
            });

            this.sparkles.push({
                id: `sub_sparkle_${i}`,
                x: (rm.x + rm.w - 2) * 16 + 8,
                y: (rm.y + rm.h - 2) * 16 + 8,
                collected: false,
                coins: 15 + prng.range(5, 15),
                itemId: (i === 1 ? 'OVERCLOCK_CELL' : null)
            });

            this.sparkles.push({
                id: `sub_sparkle_b_${i}`,
                x: (rm.x + 2) * 16 + 8,
                y: (rm.y + 2) * 16 + 8,
                collected: false,
                coins: 10 + prng.range(5, 10),
                itemId: null
            });
        }

        // Vault crates & resource nodes in Sub-Core
        this.resourceNodes = [];
        for (let i = 0; i < rooms.length; i++) {
            const rm = rooms[i];
            this.resourceNodes.push({
                id: `sub_conduit_${i}`,
                type: 'POWER_CONDUIT',
                x: (rm.x + 2) * 16 + 8,
                y: (rm.y + rm.h - 2) * 16 + 8,
                hp: 3,
                maxHp: 3,
                drops: 'FLINT',
                dropCount: 2,
                dropCoins: 4,
                name: 'Titanium High-Energy Conduit'
            });
        }
    }

    /**
     * Area 5: SOLARIUM WASTES & DUNES (Sun-scorched desert, sandstone ruins, ancient solar obelisks, and oasis)
     */
    generateSolariumDunes(prng = null) {
        if (!prng) prng = new AluPrng(this.seed + 0x3333);

        // Fill base map with SAND_DUNE (Tier 1 flats)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.set(x, y, TILE.CLIFF_HIGH);
                    this.setElevation(x, y, 3);
                } else {
                    this.set(x, y, TILE.SAND_DUNE);
                    this.setElevation(x, y, 1);
                }
            }
        }

        // Generate Sandstone Ruins & Ancient Columns on Elevated Ridges (Tier 2)
        for (let i = 0; i < 14; i++) {
            const rx = prng.range(6, this.width - 12);
            const ry = prng.range(8, this.height - 12);
            const rw = prng.range(3, 6);
            const rh = prng.range(3, 6);
            for (let dy = 0; dy < rh; dy++) {
                for (let dx = 0; dx < rw; dx++) {
                    const isBorder = (dx === 0 || dx === rw - 1 || dy === 0 || dy === rh - 1);
                    this.set(rx + dx, ry + dy, isBorder ? TILE.SANDSTONE_RUIN : TILE.SAND_DUNE);
                    this.setElevation(rx + dx, ry + dy, 2);
                }
            }
            // Sandstone ramp leading onto ruin platform
            this.set(rx + Math.floor(rw / 2), ry + rh - 1, TILE.STONE_RAMP);
            this.ramps.push({ x: rx + Math.floor(rw / 2), y: ry + rh - 1, tierLow: 1, tierHigh: 2, dir: 'SOUTH' });
        }

        // Quicksand hazards (Tier 0 sinkholes)
        for (let i = 0; i < 8; i++) {
            const qx = prng.range(8, this.width - 8);
            const qy = prng.range(8, this.height - 8);
            this.set(qx, qy, TILE.QUICKSAND);
            this.set(qx + 1, qy, TILE.QUICKSAND);
            this.set(qx, qy + 1, TILE.QUICKSAND);
            this.setElevation(qx, qy, 0);
            this.setElevation(qx + 1, qy, 0);
            this.setElevation(qx, qy + 1, 0);
        }

        // Central Oasis
        const ox = Math.floor(this.width / 2);
        const oy = Math.floor(this.height / 2);
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const dist = Math.hypot(dx, dy);
                if (dist < 3.2) {
                    this.set(ox + dx, oy + dy, TILE.DEEP_WATER);
                } else if (dist < 4.5) {
                    this.set(ox + dx, oy + dy, TILE.WATER_FOAM);
                }
            }
        }
        // Oasis Reeds
        for (let r = 0; r < 8; r++) {
            const angle = (r * Math.PI * 2) / 8;
            const rx = Math.round(ox + Math.cos(angle) * 4.2);
            const ry = Math.round(oy + Math.sin(angle) * 3.8);
            this.set(rx, ry, TILE.REEDS_WATER);
        }

        // North Gate leading back to Cinderwatch Hamlet
        this.set(32, 2, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_hamlet_south',
            x: 32 * 16 + 8,
            y: 3 * 16 + 8,
            targetArea: 'CINDERWATCH_HAMLET',
            targetSpawn: { x: 28 * 16 + 8, y: 59 * 16 + 8 },
            label: 'NORTH TO CINDERWATCH HAMLET'
        });

        // Spawn point when entering from Hamlet
        this.spawnPoint = { x: 32 * 16 + 8, y: 6 * 16 + 8 };

        // Ancient Solar Obelisk in the eastern ruins
        this.set(48, 22, TILE.ANCIENT_TERMINAL);
        this.terminals.push({
            x: 48 * 16 + 8,
            y: 22 * 16 + 8,
            name: "Solarium Monolith 03: Solar Harvester",
            log: "LOG: Thermal collection array online. Solar radiation at maximum yield. Beware sand scorpions near the northern perimeter."
        });

        // Enemies in the dunes
        this.enemies = [];
        for (let i = 0; i < 4; i++) {
            this.enemies.push({
                id: `dune_scorpion_${i}`,
                x: prng.range(10, this.width - 10) * 16 + 8,
                y: prng.range(12, this.height - 12) * 16 + 8,
                hp: 60,
                maxHp: 60,
                speed: 70,
                attack: 14,
                type: 'SCORPION',
                name: 'Solar Sand-Scorpion'
            });
        }
        this.enemies.push({
            id: 'dune_sentinel_1',
            x: 46 * 16 + 8,
            y: 28 * 16 + 8,
            hp: 120,
            maxHp: 120,
            speed: 45,
            attack: 22,
            type: 'SENTINEL',
            name: 'Solar Mirage Sentinel'
        });
        this.enemies.push({
            id: 'dune_reaver_boss',
            x: 20 * 16 + 8,
            y: 44 * 16 + 8,
            hp: 210,
            maxHp: 210,
            speed: 55,
            attack: 26,
            isBoss: true,
            type: 'BOSS',
            name: 'Ancient Dune Reaver'
        });

        // Resource Nodes: Sunstones and Desert Agave
        this.resourceNodes = [];
        for (let i = 0; i < 8; i++) {
            this.resourceNodes.push({
                id: `sunstone_${i}`,
                type: 'SUNSTONE_NODE',
                x: prng.range(8, this.width - 8) * 16 + 8,
                y: prng.range(8, this.height - 8) * 16 + 8,
                hp: 3,
                maxHp: 3,
                drops: 'SUNSTONE_CORE',
                dropCount: 2,
                dropCoins: 4,
                name: 'Sunstone Core Node'
            });
        }
        for (let i = 0; i < 6; i++) {
            this.resourceNodes.push({
                id: `agave_${i}`,
                type: 'DESERT_AGAVE',
                x: (ox - 8 + (i % 3) * 8) * 16 + 8,
                y: (oy - 8 + Math.floor(i / 3) * 16) * 16 + 8,
                hp: 1,
                maxHp: 1,
                drops: 'AGAVE_NECTAR',
                dropCount: 2,
                dropCoins: 2,
                name: 'Desert Agave'
            });
        }

        // Golden Relic Chest
        this.chests = [{
            id: 'dunes_relic_chest',
            x: 48 * 16 + 8,
            y: 20 * 16 + 8,
            opened: false,
            itemId: 'PRIMITIVE_TORCH',
            count: 2,
            coins: 50
        }];
    }

    /**
     * Area 6: CELESTIAL ZENITH PEAK (Skyward cloud archipelago, celestial glass bridges, and star shrines)
     */
    generateCelestialZenith(prng = null) {
        if (!prng) prng = new AluPrng(this.seed + 0x7777);

        // Fill base map with open azure VOID (sky drop at Tier 0)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.set(x, y, TILE.VOID);
                this.setElevation(x, y, 0);
            }
        }

        // 5 Floating Cloud Islands (Tier 1 cloud turf)
        const islands = [
            { cx: 35, cy: 35, r: 12 }, // Central Grand Altar Island
            { cx: 16, cy: 18, r: 8 },  // North-West Wind Spire
            { cx: 54, cy: 18, r: 8 },  // North-East Storm Sanctuary
            { cx: 18, cy: 52, r: 8 },  // South-West Aurora Haven
            { cx: 52, cy: 52, r: 9 }   // South-East Arrival Haven (connects to Woods)
        ];

        for (const isl of islands) {
            for (let dy = -isl.r; dy <= isl.r; dy++) {
                for (let dx = -isl.r; dx <= isl.r; dx++) {
                    const d = Math.hypot(dx, dy);
                    if (d <= isl.r) {
                        const tx = isl.cx + dx;
                        const ty = isl.cy + dy;
                        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
                            this.set(tx, ty, TILE.CLOUD_TURF);
                            this.setElevation(tx, ty, 1);
                        }
                    }
                }
            }
        }

        // Celestial Glass Bridges connecting islands to Center (Tier 2 elevated bridges)
        for (let i = 1; i < islands.length; i++) {
            const isl = islands[i];
            const steps = 30;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const bx = Math.round(isl.cx + (35 - isl.cx) * t);
                const by = Math.round(isl.cy + (35 - isl.cy) * t);
                this.set(bx, by, TILE.CELESTIAL_GLASS);
                this.set(bx + 1, by, TILE.CELESTIAL_GLASS);
                this.setElevation(bx, by, 2);
                this.setElevation(bx + 1, by, 2);
            }
        }

        // Central Grand Altar High Summit (Tier 3)
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                if (dx * dx + dy * dy <= 24) {
                    this.setElevation(35 + dx, 35 + dy, 3);
                }
            }
        }
        // Wooden/Celestial stairs to altar summit
        this.set(35, 40, TILE.WOODEN_STAIRS);
        this.ramps.push({ x: 35, y: 40, tierLow: 1, tierHigh: 3, dir: 'SOUTH' });

        // East Portal on South-East island (52, 52) returning to Whispering Woods
        this.set(62, 52, TILE.PORTAL_EXIT);
        this.portals.push({
            id: 'portal_to_woods_east',
            x: 62 * 16 + 8,
            y: 52 * 16 + 8,
            targetArea: 'WHISPERING_WOODS',
            targetSpawn: { x: 5 * 16 + 8, y: 40 * 16 + 8 },
            label: 'DESCEND TO WHISPERING WOODS'
        });

        // Spawn point when arriving
        this.spawnPoint = { x: 56 * 16 + 8, y: 52 * 16 + 8 };

        // Central Star Altar
        this.set(35, 35, TILE.ANCIENT_TERMINAL);
        this.terminals.push({
            x: 35 * 16 + 8,
            y: 35 * 16 + 8,
            name: "Zenith Star Altar: Aether Conduit",
            log: "LOG: High atmospheric stellar focus operational. You stand at the pinnacle of the Dyson sphere atmosphere."
        });

        // Enemies: Sky Wyverns and Storm Sentinels
        this.enemies = [];
        for (let i = 0; i < 4; i++) {
            this.enemies.push({
                id: `wyvern_${i}`,
                x: (20 + (i % 2) * 30) * 16 + 8,
                y: (22 + Math.floor(i / 2) * 26) * 16 + 8,
                hp: 75,
                maxHp: 75,
                speed: 85,
                attack: 18,
                type: 'WYVERN',
                name: 'Celestial Sky-Wyvern'
            });
        }
        this.enemies.push({
            id: 'zenith_archon_boss',
            x: 35 * 16 + 8,
            y: 30 * 16 + 8,
            hp: 230,
            maxHp: 230,
            speed: 55,
            attack: 28,
            isBoss: true,
            type: 'BOSS',
            name: 'Archon of the Star Zenith'
        });

        // Resource Nodes: Star Crystals and Sky Lilies
        this.resourceNodes = [];
        for (let i = 0; i < 8; i++) {
            const isl = islands[i % islands.length];
            this.resourceNodes.push({
                id: `star_crystal_${i}`,
                type: 'STAR_CRYSTAL',
                x: (isl.cx - 3 + (i % 3) * 3) * 16 + 8,
                y: (isl.cy - 3 + Math.floor(i / 3) * 3) * 16 + 8,
                hp: 4,
                maxHp: 4,
                drops: 'AETHER_SHARD',
                dropCount: 2,
                dropCoins: 5,
                name: 'Luminescent Star Crystal'
            });
        }
        for (let i = 0; i < 6; i++) {
            this.resourceNodes.push({
                id: `sky_lily_${i}`,
                type: 'SKY_LILY',
                x: (32 + (i % 3) * 3) * 16 + 8,
                y: (38 + Math.floor(i / 3) * 2) * 16 + 8,
                hp: 1,
                maxHp: 1,
                drops: 'CELESTIAL_ESSENCE',
                dropCount: 2,
                dropCoins: 3,
                name: 'Sky Lily'
            });
        }

        // Skyward Relic Chest
        this.chests = [{
            id: 'zenith_relic_chest',
            x: 16 * 16 + 8,
            y: 16 * 16 + 8,
            opened: false,
            itemId: 'NANITE_REPAIR_KIT',
            count: 2,
            coins: 60
        }];
    }

    findNearbyNode(x, y, radius = 26) {
        if (!this.resourceNodes) return null;
        let closest = null;
        let minDist = radius;
        for (const node of this.resourceNodes) {
            if (node.hp <= 0) continue;
            const dist = Math.hypot(x - node.x, y - node.y);
            if (dist < minDist) {
                minDist = dist;
                closest = node;
            }
        }
        return closest;
    }

    findNearbyPortal(x, y, radius = 32) {
        if (!this.portals) return null;
        for (const p of this.portals) {
            const dist = Math.hypot(x - p.x, y - p.y);
            if (dist <= radius) return p;
        }
        return null;
    }

    damageNode(node, amount = 1) {
        if (!node || node.hp <= 0) return null;
        node.hp -= amount;
        node.shakeTimer = 0.25;
        if (node.hp <= 0) {
            node.harvested = true;
            return {
                harvested: true,
                drops: node.drops,
                dropCount: node.dropCount || 1,
                dropCoins: node.dropCoins || 0
            };
        }
        return {
            harvested: false,
            remainingHp: node.hp
        };
    }

    getTileBitmask(tx, ty, targetTile) {
        let mask = 0;
        if (this.get(tx, ty - 1) === targetTile) mask |= 1; // N
        if (this.get(tx + 1, ty) === targetTile) mask |= 2; // E
        if (this.get(tx, ty + 1) === targetTile) mask |= 4; // S
        if (this.get(tx - 1, ty) === targetTile) mask |= 8; // W
        return mask;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TILE, AREA_CONFIG, WorldMap };
}
