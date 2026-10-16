/**
 * Aether-Core: Programmatic Pixel Art & Sprite Rendering Engine
 * Generates crisp 16-bit GBA-style character sheets, animated tiles,
 * boss mechs, and 96x96 portrait dialogue art.
 */

class SpriteSheet {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Creates an off-screen canvas for a 2D pixel pattern.
     * Pattern is an array of strings where each character represents a palette index (0-7, or '.' for transparent).
     */
    createPixelSprite(width, height, pattern, palette) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        for (let y = 0; y < height; y++) {
            const row = pattern[y];
            if (!row) continue;
            for (let x = 0; x < width; x++) {
                const char = row[x];
                if (char === '.' || char === ' ') continue;
                const colorIndex = parseInt(char, 10);
                if (!isNaN(colorIndex) && palette[colorIndex]) {
                    ctx.fillStyle = palette[colorIndex];
                    ctx.fillRect(x, y, 1, 1);
                } else if (char === 'W') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, y, 1, 1);
                } else if (char === 'R') {
                    ctx.fillStyle = '#ff1744';
                    ctx.fillRect(x, y, 1, 1);
                } else if (char === 'G') {
                    ctx.fillStyle = '#00e676';
                    ctx.fillRect(x, y, 1, 1);
                } else if (char === 'B') {
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillRect(x, y, 1, 1);
                } else if (char === 'Y') {
                    ctx.fillStyle = '#ffd600';
                    ctx.fillRect(x, y, 1, 1);
                } else if (char === 'S') { // Skin
                    ctx.fillStyle = '#ffcc80';
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        return canvas;
    }

    // 96x96 Large Dialogue Portraits (Matching GBA intro reference screenshot)
    getPortrait(type, palette = ['#0a0a0f', '#1e2430', '#37474f', '#607d8b', '#00e5ff', '#ff9800', '#ffd54f', '#ffffff']) {
        const key = `portrait_${type}_${palette.join('')}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        // Circular background glow with GBA border
        ctx.fillStyle = palette[1];
        ctx.beginPath();
        ctx.arc(48, 48, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = palette[4] || '#00e5ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (type === 'OVERSEER') {
            // Chief Overseer Vance (Cyber-Scientist in high collar lab coat)
            // Hair
            ctx.fillStyle = '#eceff1';
            ctx.fillRect(36, 16, 24, 12);
            ctx.fillRect(32, 22, 32, 10);
            // Face
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(36, 28, 24, 26);
            // Cyber-Visor / Comms Spectacles
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(38, 35, 9, 4);
            ctx.fillRect(49, 35, 9, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(40, 36, 3, 2);
            ctx.fillRect(51, 36, 3, 2);
            // Eyebrows
            ctx.fillStyle = '#78909c';
            ctx.fillRect(37, 32, 10, 2);
            ctx.fillRect(49, 32, 10, 2);
            // Mouth
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(44, 48, 8, 2);
            // Lab Coat / Uniform
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(24, 56, 48, 36);
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(22, 60, 6, 28);
            ctx.fillRect(68, 60, 6, 28);
            // High Tech Cybernetic Collar & Emblem
            ctx.fillStyle = palette[5] || '#ff9800'; // Amber insignia
            ctx.fillRect(46, 56, 4, 30);
            ctx.fillStyle = '#263238';
            ctx.fillRect(42, 56, 4, 8);
            ctx.fillRect(50, 56, 4, 8);
        } else if (type === 'FARMER') {
            // Old Man Gable (Rustic straw hat, friendly grin, grain stalk)
            ctx.fillStyle = '#ffd54f';
            ctx.beginPath();
            ctx.ellipse(48, 26, 38, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffb300';
            ctx.fillRect(36, 12, 24, 14);
            // Face
            ctx.fillStyle = '#ffb74d';
            ctx.fillRect(34, 32, 28, 26);
            // Eyes
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(39, 42, 4, 2);
            ctx.fillRect(53, 42, 4, 2);
            // Beard
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(40, 50, 16, 8);
            ctx.fillRect(44, 58, 8, 4);
            // Grain stalk
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(56, 48, 14, 2);
            ctx.fillRect(70, 46, 6, 4);
            // Overalls
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(26, 62, 44, 30);
            ctx.fillStyle = '#ff9800';
            ctx.fillRect(42, 62, 12, 30);
        } else {
            // Quantum AI Core holographic avatar
            ctx.fillStyle = palette[4] || '#00e5ff';
            ctx.beginPath();
            ctx.arc(48, 48, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("AI", 48, 54);
            ctx.textAlign = 'left';
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    // Render character preview sprites (32x32)
    getClassPreview(charClass) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Center is (16, 16)
        if (charClass === 'SUPER_SOLDIER') {
            // Warrior Dreadnought
            // Heavy armor body
            ctx.fillStyle = '#37474f';
            ctx.fillRect(11, 14, 10, 11);
            // Steel helmet
            ctx.fillStyle = '#263238';
            ctx.fillRect(12, 8, 8, 6);
            // Cyan glowing visor
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(13, 11, 6, 2);
            // Shoulder pauldrons
            ctx.fillStyle = '#ff7043';
            ctx.fillRect(9, 14, 2, 5);
            ctx.fillRect(21, 14, 2, 5);
            // Broadsword
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(23, 6, 2, 18);
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(21, 18, 6, 2);
            // Boots
            ctx.fillStyle = '#212121';
            ctx.fillRect(11, 25, 4, 4);
            ctx.fillRect(17, 25, 4, 4);
        } else if (charClass === 'TECHNO_MAGE') {
            // Techno-Mage Cyber-Arcanist
            // Robes
            ctx.fillStyle = '#4a148c';
            ctx.fillRect(11, 13, 10, 13);
            // Hood & face
            ctx.fillStyle = '#311b92';
            ctx.fillRect(12, 7, 8, 7);
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(14, 10, 4, 3);
            // Floating Nanite Orb in hand
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(7, 16, 3, 0, Math.PI * 2);
            ctx.fill();
            // Staff
            ctx.fillStyle = '#ffb300';
            ctx.fillRect(24, 7, 2, 19);
            ctx.fillStyle = '#ea80fc';
            ctx.fillRect(23, 5, 4, 3);
        } else if (charClass === 'FARMER_GOD') {
            // Deific Harvester
            // Straw hat
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(7, 8, 18, 3);
            ctx.fillRect(11, 5, 10, 4);
            // Face
            ctx.fillStyle = '#ffb74d';
            ctx.fillRect(12, 11, 8, 5);
            // Denim Overalls
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(11, 16, 10, 10);
            // Red plaid shirt
            ctx.fillStyle = '#d32f2f';
            ctx.fillRect(9, 16, 2, 6);
            ctx.fillRect(21, 16, 2, 6);
            // Cosmic Golden Hoe
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(23, 10, 2, 16);
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(23, 8, 6, 3);
        }

        return canvas;
    }

    // Render ALU Coin Medallion (16x16)
    getCoinSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        // Outer gold ring
        ctx.fillStyle = '#ffb300';
        ctx.fillRect(4, 1, 8, 14);
        ctx.fillRect(1, 4, 14, 8);
        ctx.fillRect(2, 2, 12, 12);

        // Core gold
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(3, 3, 10, 10);

        // Shine & "A" insignia
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(4, 4, 2, 2);
        ctx.fillStyle = '#e65100';
        ctx.fillRect(7, 5, 2, 6);
        ctx.fillRect(6, 7, 4, 2);
        ctx.fillRect(6, 10, 1, 2);
        ctx.fillRect(9, 10, 1, 2);

        return canvas;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteSheet };
}
