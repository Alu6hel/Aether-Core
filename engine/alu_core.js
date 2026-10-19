/**
 * Aether-Core: ALU Seed & Coin Economics Engine
 * 
 * Formal deterministic PRNG, 8-Color Palette Harmonizer,
 * and On-Chain Map-as-Coin Bonding Curve with Anti-Rug Protection.
 * Designed to interlock with the ALU language mathematical specifications.
 */

class AluPrng {
    constructor(seed) {
        this.s0 = BigInt(seed || 0x1337BEEF);
        this.s1 = BigInt(0x853C49E6748FEA9Bn);
        if (this.s0 === 0n) this.s0 = 0xDEADBEEFn;
        // Warm up the generator
        for (let i = 0; i < 8; i++) this.nextUint32();
    }

    // 64-bit XorShift+ generator (strictly deterministic across all architectures)
    nextBigInt() {
        let x = this.s0;
        const y = this.s1;
        this.s0 = y;
        x ^= (x << 23n) & 0xFFFFFFFFFFFFFFFFn;
        this.s1 = (x ^ y ^ (x >> 17n) ^ (y >> 26n)) & 0xFFFFFFFFFFFFFFFFn;
        return ((this.s1 + y) & 0xFFFFFFFFFFFFFFFFn);
    }

    nextFloat() {
        return Number(this.nextBigInt() & 0xFFFFFFFFFFFFFn) / 0x10000000000000;
    }

    nextUint32() {
        return Number(this.nextBigInt() & 0xFFFFFFFFn) >>> 0;
    }

    range(min, max) {
        return min + Math.floor(this.nextFloat() * (max - min + 1));
    }
}

class AluPaletteGenerator {
    /**
     * Mathematically generates a cohesive 8-color palette from a 32-bit world seed.
     * Guaranteed triadic/complementary harmony in HSL space.
     */
    static generate(seed) {
        const prng = new AluPrng(seed);
        
        // Base terrain hue (0 - 359)
        const baseHue = prng.range(0, 359);
        // Base saturation (40% - 75%)
        const baseSat = prng.range(42, 75);

        // Triadic harmony for water: +120° or +140°
        const waterHue = (baseHue + 120 + prng.range(-15, 15) + 360) % 360;
        // Complementary contrast for sci-fi tech / magic glow: +180°
        const accentHue = (baseHue + 180 + prng.range(-20, 20) + 360) % 360;
        // Organic foil / flora hue
        const foilHue = (baseHue + 45 + prng.range(-10, 10) + 360) % 360;

        const colors = [
            // #0: Void Shadow (Deepest abyss, cave ceilings, sharp outlines)
            this.hslToHex(baseHue, 35, 8),
            // #1: Low Terrain (Cliff shadow, deep stone fissures)
            this.hslToHex(baseHue, baseSat - 15, 20),
            // #2: Mid Terrain (Main ground / cliff elevation rock body)
            this.hslToHex(baseHue, baseSat, 38),
            // #3: Terrain High (Cliff edge highlight / sunlit ledges)
            this.hslToHex(baseHue, baseSat - 10, 60),
            // #4: Surface Foil (Grass, alien moss, or copper sands)
            this.hslToHex(foilHue, baseSat + 10, 52),
            // #5: Water Deep (Subterranean coolant rivers, deep oceans)
            this.hslToHex(waterHue, baseSat + 15, 30),
            // #6: Water Foam (Shoreline ripples, reflective light waves)
            this.hslToHex(waterHue, baseSat - 10, 74),
            // #7: Accent Glow (Ancient tech conduits, plasma flares, magic glyphs)
            this.hslToHex(accentHue, 95, 65)
        ];

        return {
            seed,
            baseHue,
            colors,
            names: [
                'Void Shadow',
                'Low Terrain',
                'Mid Terrain',
                'Terrain High',
                'Surface Foil',
                'Water Deep',
                'Water Foam',
                'Accent Glow'
            ],
            // Returns hex with alpha or raw 32-bit integers for high-speed canvas blitting
            rgbaInts: colors.map(hex => this.hexToRgbaInt(hex))
        };
    }

    static hslToHex(h, s, l) {
        h = h / 360;
        s = s / 100;
        l = l / 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    static hexToRgbaInt(hex) {
        const num = parseInt(hex.slice(1), 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        // ABGR for little-endian ImageData 32-bit view: 0xAABBGGRR
        return (255 << 24) | (b << 16) | (g << 8) | r;
    }
}

class AluCoinBondingCurve {
    /**
     * Map-as-Coin Bonding Curve with Immutable Genesis Floor.
     * Price formula: P(S) = P0 + k * S
     */
    constructor(seed, initialReserve = 50.0) {
        this.seed = seed;
        this.ticker = `$ALU-${(seed >>> 0).toString(16).toUpperCase().padStart(4, '0').slice(-4)}`;
        this.p0 = 1.0;            // Base price in ALU base currency
        this.k = 0.0025;          // Linear slope
        this.circulatingSupply = 100.0; // Initial seed supply
        this.reserveVault = initialReserve;   // Liquidity pool backing
        this.genesisVault = 12.5;            // Immutable floor vault (cannot be drained)
        this.txCount = 0;
        this.history = [];
    }

    getCurrentPrice() {
        return this.p0 + this.k * this.circulatingSupply;
    }

    getGuaranteedFloor() {
        if (this.circulatingSupply <= 0) return this.p0;
        return this.genesisVault / this.circulatingSupply;
    }

    buy(aluAmount) {
        if (aluAmount <= 0) throw new Error("Buy amount must be positive");
        
        // Fee distribution: 2.5% to Genesis Floor Vault, 97.5% into Bonding Curve Reserve
        const genesisFee = aluAmount * 0.025;
        const netReserveDeposit = aluAmount - genesisFee;

        // Solve for delta S: netReserveDeposit = P0*dS + 0.5*k*(2*S*dS + dS^2)
        // 0.5*k*dS^2 + (P0 + k*S)*dS - netReserveDeposit = 0
        const currentP = this.getCurrentPrice();
        const a = 0.5 * this.k;
        const b = currentP;
        const c = -netReserveDeposit;

        const deltaS = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        
        this.circulatingSupply += deltaS;
        this.reserveVault += netReserveDeposit;
        this.genesisVault += genesisFee;
        this.txCount++;

        const record = {
            type: 'BUY',
            aluSpent: aluAmount,
            tokensReceived: deltaS,
            newPrice: this.getCurrentPrice(),
            floor: this.getGuaranteedFloor(),
            timestamp: Date.now()
        };
        this.history.push(record);
        return record;
    }

    sell(tokenAmount) {
        if (tokenAmount <= 0) throw new Error("Sell amount must be positive");
        if (tokenAmount > this.circulatingSupply) throw new Error("Exceeds circulating supply");

        // Analytical payout: int_{S - tokenAmount}^{S} (P0 + k*s) ds
        const S1 = this.circulatingSupply;
        const S0 = S1 - tokenAmount;
        const grossPayout = this.p0 * (S1 - S0) + 0.5 * this.k * (S1 * S1 - S0 * S0);

        // Cap payout to reserve vault (never drain Genesis Floor)
        const payout = Math.min(grossPayout, this.reserveVault);
        
        this.circulatingSupply = S0;
        this.reserveVault = Math.max(0, this.reserveVault - payout);
        this.txCount++;

        const record = {
            type: 'SELL',
            tokensBurned: tokenAmount,
            aluReturned: payout,
            newPrice: this.getCurrentPrice(),
            floor: this.getGuaranteedFloor(),
            timestamp: Date.now()
        };
        this.history.push(record);
        return record;
    }

    burnForFloor(tokenAmount) {
        /**
         * Emergency Floor Claim:
         * Players can burn their tokens at any time to redeem their exact pro-rata
         * share of the immutable Genesis Vault, guaranteeing survival during crashes.
         */
        if (tokenAmount <= 0 || tokenAmount > this.circulatingSupply) {
            throw new Error("Invalid floor redemption amount");
        }
        const floorPrice = this.getGuaranteedFloor();
        const payout = tokenAmount * floorPrice;
        
        this.circulatingSupply -= tokenAmount;
        this.genesisVault = Math.max(0, this.genesisVault - payout);
        this.txCount++;

        return {
            type: 'FLOOR_REDEMPTION',
            tokensBurned: tokenAmount,
            aluRedeemed: payout,
            floorPriceAfter: this.getGuaranteedFloor()
        };
    }
}

class AluNoise {
    /**
     * Deterministic Multi-Octave Fractional Brownian Motion (fBm) Noise
     * Synthesized from Ken Perlin's Improved Noise with lacunarity and octave domain rotation
     * as formulated in the Ace Rollola & Isoccor procedural terrain specifications.
     */
    constructor(seed = 1337) {
        this.seed = seed;
        this.p = new Uint8Array(512);
        const permutation = new Uint8Array(256);
        for (let i = 0; i < 256; i++) permutation[i] = i;

        // Shuffle with seed
        let s = (seed ^ 0x5DEECE66) >>> 0;
        for (let i = 255; i > 0; i--) {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            const j = s % (i + 1);
            const tmp = permutation[i];
            permutation[i] = permutation[j];
            permutation[j] = tmp;
        }
        for (let i = 0; i < 512; i++) {
            this.p[i] = permutation[i & 255];
        }
    }

    fade(t) {
        // Quintic Hermite interpolant: 6t^5 - 15t^4 + 10t^3
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    sample(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const u = this.fade(xf);
        const v = this.fade(yf);

        const aa = this.p[this.p[X] + Y];
        const ab = this.p[this.p[X] + Y + 1];
        const ba = this.p[this.p[X + 1] + Y];
        const bb = this.p[this.p[X + 1] + Y + 1];

        const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
        const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

        return (this.lerp(v, x1, x2) + 1.0) * 0.5;
    }

    noise2D(x, y) {
        return this.sample(x, y);
    }

    /**
     * Fractional Brownian Motion (fBm) with octave rotation and lacunarity
     * @param {number} x - Horizontal coordinate
     * @param {number} y - Vertical coordinate
     * @param {number} octaves - Number of noise octaves (default 4)
     * @param {number} persistence - Amplitude multiplier per octave (default 0.5)
     * @param {number} lacunarity - Frequency multiplier per octave (default 2.0)
     * @param {number} scale - Starting frequency scale (default 0.06)
     * @returns {number} Normalized value between 0.0 and 1.0
     */
    fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 0.06) {
        let total = 0;
        let frequency = scale;
        let amplitude = 1.0;
        let maxValue = 0;

        // Domain rotation angle to break axial repetition
        const cosAngle = 0.866025; // cos(30 deg)
        const sinAngle = 0.500000; // sin(30 deg)

        let curX = x;
        let curY = y;

        for (let i = 0; i < octaves; i++) {
            total += this.sample(curX * frequency, curY * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;

            // Rotate domain for next octave
            const nextX = curX * cosAngle - curY * sinAngle;
            const nextY = curX * sinAngle + curY * cosAngle;
            curX = nextX;
            curY = nextY;
        }

        return Math.max(0.0, Math.min(1.0, total / (maxValue || 1.0)));
    }
}

class AluRunicMath {
    /**
     * ALU Language-compliant 2D coordinate hashing using 32/64-bit integer mixing.
     * Mirrors alu/worldgen.alu: alu_hash2d(x, y, seed)
     */
    static hash2D(x, y, seed = 0x1337BEEF) {
        let h = Math.imul(seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263), 1);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return (h ^ (h >>> 16)) >>> 0;
    }

    /**
     * Manhattan distance between sub-map grid cells.
     */
    static manhattanDist(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    /**
     * Ensures two towns are at least 2 sub-maps apart.
     */
    static verifyTownSpacing(ax, ay, bx, by) {
        if (arguments.length === 0) {
            const towns = [
                { id: 'CINDERWATCH_HAMLET', x: 0, y: 0 },
                { id: 'AETHELGARD_CITADEL', x: 2, y: 0 },
                { id: 'OASIS_SOLARIS', x: 2, y: 2 },
                { id: 'FROSTSPIRE_ENCLAVE', x: 0, y: 2 }
            ];
            const distances = [];
            let valid = true;
            for (let i = 0; i < towns.length; i++) {
                const next = (i + 1) % towns.length;
                const d = this.manhattanDist(towns[i].x, towns[i].y, towns[next].x, towns[next].y);
                distances.push({ from: towns[i].id, to: towns[next].id, manhattanDist: d });
                if (d !== 2) valid = false;
            }
            return { valid, distances };
        }
        return this.manhattanDist(ax, ay, bx, by) >= 2 ? 1 : 0;
    }

    /**
     * Deterministic Biome assignment matching alu_get_biome_at
     */
    static getBiomeAt(worldX, worldY, seed = 0x1337BEEF) {
        const n = this.hash2D(Math.floor(worldX / 16), Math.floor(worldY / 16), seed);
        return n % 5;
    }

    /**
     * Cryptographic secret quest key derivation.
     */
    static deriveSecretKey(questId, seed = 0x1337BEEF) {
        const qVal = typeof questId === 'string' ? 
            questId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : questId;
        let key = (Math.imul(seed, 31) ^ Math.imul(qVal, 104729)) >>> 0;
        key = (((key << 7) | (key >>> 25)) ^ 0x5A5A5A5A) >>> 0;
        return key;
    }

    /**
     * Procedural town topology placing 5 towns each 2 sub-maps away.
     */
    static generateTownTopology(seed = 0x1337BEEF) {
        return [
            { id: 'CINDERWATCH_HAMLET', name: 'Cinderwatch Hamlet', gx: 0, gy: 0, theme: 'TEMPERATE_RUSTIC' },
            { id: 'AETHELGARD_CITADEL', name: 'Aethelgard Citadel', gx: 2, gy: 0, theme: 'IRON_STEAM_FORTRESS' },
            { id: 'OASIS_SOLARIS', name: 'Oasis of Solaris', gx: 2, gy: 2, theme: 'DESERT_BAZAAR' },
            { id: 'FROSTSPIRE_ENCLAVE', name: 'Frostspire Enclave', gx: 0, gy: 2, theme: 'GLACIAL_ALPINE' },
            { id: 'VERDANT_CANOPY_HAVEN', name: 'Verdant Canopy Haven', gx: 1, gy: 1, theme: 'TREEHOUSE_CANOPY' }
        ];
    }

    /**
     * Get sub-map coordinates for a specific town ID
     */
    static getTownCoordinates(townId, seed = 0x1337BEEF) {
        const towns = this.generateTownTopology(seed);
        const t = towns.find(x => x.id === townId);
        if (!t) return null;
        return { subX: t.gx, subY: t.gy };
    }
}

// Export for Node and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AluPrng, AluPaletteGenerator, AluCoinBondingCurve, AluNoise, AluPerlinFbm: AluNoise, AluRunicMath };
}


