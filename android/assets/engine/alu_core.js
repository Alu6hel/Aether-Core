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

// Export for Node and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AluPrng, AluPaletteGenerator, AluCoinBondingCurve };
}
