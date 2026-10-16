/**
 * Aether-Core: Procedural Dual-Layer World & Dungeon Generator
 * 
 * Generates both Surface Overworld (Cliffs, Coastline, Cave Mouths)
 * and Sub-Bedrock Hidden Sci-Fi Vaults (Conduits, Cryo-Chambers, Ancient Terminals).
 * Uses Marching Bitmask Autotiling for seamless GBA-style aesthetics.
 */

if (typeof require !== 'undefined') {
    var { AluPrng, AluPaletteGenerator, AluCoinBondingCurve } = require('./alu_core.js');
}

// Tile Type Indices
const TILE = {
    VOID: 0,        // Void shadow / unpassable black
    DEEP_WATER: 1,  // Deep water / ocean / coolant canal (solid)
    WATER_FOAM: 2,  // Shallow water / shoreline (walkable or slow)
    GROUND: 3,      // Walkable dirt, stone, moss
    FOIL_GRASS: 4,  // Interactive tall grass / alien flora
    CLIFF_LOW: 5,   // Cliff base / rock wall (solid)
    CLIFF_HIGH: 6,  // Cliff plateau / elevated rock (solid)
    CAVE_ENTRANCE: 7,// Portal / cave entrance to subterranean depths
    SCIFI_CONDUIT: 8,// Hidden copper / neon conduit line in bedrock
    ANCIENT_TERMINAL: 9,// Sci-Fi console disguised as an arcane altar
    SECRET_SOIL: 10 // The 3x3 hidden arable plot to unlock the Farmer
};

class WorldMap {
    constructor(seed, width = 64, height = 64, layer = 'SURFACE') {
        this.seed = seed;
        this.width = width;
        this.height = height;
        this.tileSize = 16;
        this.layer = layer; // 'SURFACE' or 'SUB_CORE'
        this.tiles = new Uint8Array(width * height);
        this.decor = new Uint8Array(width * height);
        this.palette = AluPaletteGenerator.generate(seed);
        this.bondingCurve = new AluCoinBondingCurve(seed);
        this.spawnPoint = { x: 32 * 16, y: 32 * 16 };
        this.caveEntrance = null;
        this.secretSoilArea = null;
        this.enemies = [];
        this.terminals = [];
        this.interactiveGrass = [];

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

    isSolid(tx, ty) {
        const t = this.get(tx, ty);
        return (
            t === TILE.CLIFF_LOW ||
            t === TILE.CLIFF_HIGH ||
            t === TILE.DEEP_WATER ||
            t === TILE.VOID ||
            t === TILE.ANCIENT_TERMINAL
        );
    }

    generate() {
        const prng = new AluPrng(this.seed + (this.layer === 'SUB_CORE' ? 0x9999 : 0));

        if (this.layer === 'SURFACE') {
            this.generateSurface(prng);
        } else {
            this.generateSubCore(prng);
        }
    }

    generateSurface(prng) {
        // 1. Simplex/Perlin-style Cellular heightmap for Land vs Water & Cliffs
        const elevation = new Float32Array(this.width * this.height);
        
        // Multi-octave value noise
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const nx = x / this.width - 0.5;
                const ny = y / this.height - 0.5;
                // Circular island falloff + noise
                const distFromCenter = Math.sqrt(nx * nx + ny * ny) * 2.0;
                const noise1 = Math.sin(x * 0.12 + prng.nextFloat()) * Math.cos(y * 0.12 + prng.nextFloat());
                const noise2 = Math.sin(x * 0.25) * Math.sin(y * 0.25) * 0.5;
                elevation[y * this.width + x] = (1.0 - distFromCenter * 0.7) + noise1 * 0.35 + noise2 * 0.2;
            }
        }

        // 2. Classify tiles based on elevation thresholds
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const val = elevation[y * this.width + x];
                if (val < 0.15) {
                    this.set(x, y, TILE.DEEP_WATER);
                } else if (val < 0.28) {
                    this.set(x, y, TILE.WATER_FOAM);
                } else if (val < 0.65) {
                    // Standard ground or tall foliage grass
                    const isFoil = (prng.range(0, 100) < 22);
                    this.set(x, y, isFoil ? TILE.FOIL_GRASS : TILE.GROUND);
                } else if (val < 0.85) {
                    this.set(x, y, TILE.CLIFF_LOW);
                } else {
                    this.set(x, y, TILE.CLIFF_HIGH);
                }
            }
        }

        // 3. Carve Natural Cave Entrance into high cliff wall (matching reference screenshot 1)
        let caveX = 32, caveY = 16;
        for (let y = 10; y < this.height - 10; y++) {
            for (let x = 15; x < this.width - 15; x++) {
                if (this.get(x, y) === TILE.CLIFF_LOW && this.get(x, y + 1) === TILE.GROUND) {
                    caveX = x;
                    caveY = y;
                    break;
                }
            }
        }
        this.set(caveX, caveY, TILE.CAVE_ENTRANCE);
        this.caveEntrance = { x: caveX, y: caveY };

        // 4. Set player spawn point on clear ground south of the cave
        this.spawnPoint = {
            x: caveX * 16 + 8,
            y: (caveY + 3) * 16 + 8
        };

        // 5. Place ancient cracked sci-fi terminal near cliff edge
        const termX = caveX + 6;
        const termY = caveY + 2;
        this.set(termX, termY, TILE.ANCIENT_TERMINAL);
        this.terminals.push({
            x: termX * 16 + 8,
            y: termY * 16 + 8,
            name: "Terminal 07-A: Dyson Climate Array",
            log: "STATUS: Atmospheric Nanites at 99.4% stability. Magic dispersion nominal. Core temperature rising."
        });

        // 6. Spawn wandering biome creatures
        for (let i = 0; i < 6; i++) {
            const rx = prng.range(10, this.width - 10);
            const ry = prng.range(10, this.height - 10);
            if (!this.isSolid(rx, ry)) {
                this.enemies.push({
                    id: `beast_${i}`,
                    x: rx * 16 + 8,
                    y: ry * 16 + 8,
                    type: (i % 2 === 0) ? 'NANITE_PROWLER' : 'CRYSTAL_GOLEM',
                    hp: 50,
                    maxHp: 50,
                    attackDamage: 12,
                    state: 'IDLE'
                });
            }
        }
    }

    generateSubCore(prng) {
        // Deep Sub-Bedrock Dungeon (Binary Space Partitioning & Vaults)
        // Initialize all as solid rock
        for (let i = 0; i < this.width * this.height; i++) {
            this.tiles[i] = TILE.CLIFF_LOW;
        }

        const rooms = [];
        // Generate 5-8 metallic chambers
        const roomCount = prng.range(5, 7);
        for (let i = 0; i < roomCount; i++) {
            const rw = prng.range(7, 12);
            const rh = prng.range(6, 10);
            const rx = prng.range(4, this.width - rw - 4);
            const ry = prng.range(4, this.height - rh - 4);
            
            // Carve room
            for (let y = ry; y < ry + rh; y++) {
                for (let x = rx; x < rx + rw; x++) {
                    this.set(x, y, TILE.GROUND);
                }
            }
            rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw/2), cy: Math.floor(ry + rh/2) });
        }

        // Connect rooms with sci-fi conduit corridors
        for (let i = 0; i < rooms.length - 1; i++) {
            const rA = rooms[i];
            const rB = rooms[i + 1];
            // Horizontal corridor
            const x0 = Math.min(rA.cx, rB.cx);
            const x1 = Math.max(rA.cx, rB.cx);
            for (let x = x0; x <= x1; x++) {
                this.set(x, rA.cy, TILE.GROUND);
                this.set(x, rA.cy + 1, TILE.SCIFI_CONDUIT);
            }
            // Vertical corridor
            const y0 = Math.min(rA.cy, rB.cy);
            const y1 = Math.max(rA.cy, rB.cy);
            for (let y = y0; y <= y1; y++) {
                this.set(rB.cx, y, TILE.GROUND);
                this.set(rB.cx + 1, y, TILE.SCIFI_CONDUIT);
            }
        }

        // Spawn point in first room
        this.spawnPoint = {
            x: rooms[0].cx * 16 + 8,
            y: rooms[0].cy * 16 + 8
        };

        // Place Main Quantum AI Reactor terminal in deepest room
        const bossRoom = rooms[rooms.length - 1];
        this.set(bossRoom.cx, bossRoom.cy - 2, TILE.ANCIENT_TERMINAL);
        this.terminals.push({
            x: bossRoom.cx * 16 + 8,
            y: (bossRoom.cy - 2) * 16 + 8,
            name: "Aetheria Sub-Bedrock Core AI",
            log: "CRITICAL: All arcane leylines originate from Particle Sub-Reactor 09. Humanoid subjects perceive radiation as sorcery."
        });

        // HIDDEN SECRET: 3x3 Arable Soil beneath cracked conduit (Farmer Unlock!)
        const secretRoom = rooms[Math.floor(rooms.length / 2)];
        this.secretSoilArea = { x: secretRoom.cx - 1, y: secretRoom.cy - 1 };
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                this.set(secretRoom.cx - 1 + dx, secretRoom.cy - 1 + dy, TILE.SECRET_SOIL);
            }
        }

        // Spawn Dungeon Guardian (Automated Defense Mech)
        this.enemies.push({
            id: 'guardian_prime',
            x: bossRoom.cx * 16 + 8,
            y: bossRoom.cy * 16 + 8,
            type: 'AEGIS_DREADNOUGHT',
            hp: 220,
            maxHp: 220,
            attackDamage: 25,
            isBoss: true,
            state: 'PATROL'
        });
    }

    /**
     * Bitmask Autotiling evaluator:
     * Returns 4-bit neighbor adjacency mask (North=1, East=2, South=4, West=8)
     * to render the exact GBA tile border / corner.
     */
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
    module.exports = { TILE, WorldMap };
}
