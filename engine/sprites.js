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
    getPortrait(type, palette) {
        const key = `portrait_${type}_${palette.join('')}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        // Circular background glow
        ctx.fillStyle = palette[1];
        ctx.beginPath();
        ctx.arc(48, 48, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = palette[7];
        ctx.lineWidth = 3;
        ctx.stroke();

        if (type === 'OVERSEER') {
            // Chief Overseer Vance (Scientist / Military Commander in high collar lab coat)
            // Hair
            ctx.fillStyle = '#eceff1';
            ctx.fillRect(36, 16, 24, 12);
            ctx.fillRect(32, 22, 32, 10);
            // Face
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(36, 28, 24, 26);
            // Eyes
            ctx.fillStyle = '#263238';
            ctx.fillRect(40, 36, 4, 3);
            ctx.fillRect(52, 36, 4, 3);
            // Eyebrows
            ctx.fillStyle = '#90a4ae';
            ctx.fillRect(39, 33, 6, 2);
            ctx.fillRect(51, 33, 6, 2);
            // Lab Coat / Uniform
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(26, 54, 44, 36);
            // High Tech Cybernetic Collar & Ties
            ctx.fillStyle = palette[7]; // Glowing cyan tie / comms
            ctx.fillRect(46, 54, 4, 30);
            ctx.fillStyle = palette[0];
            ctx.fillRect(42, 54, 4, 8);
            ctx.fillRect(50, 54, 4, 8);
        } else if (type === 'FARMER') {
            // Old Man Gable (Rustic straw hat, friendly grin, grain stalk)
            // Straw hat brim
            ctx.fillStyle = '#ffd54f';
            ctx.beginPath();
            ctx.ellipse(48, 26, 38, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffb300';
            ctx.fillRect(36, 12, 24, 14);
            // Face
            ctx.fillStyle = '#ffb74d';
            ctx.fillRect(34, 32, 28, 26);
            // Eyes with smile wrinkles
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(39, 42, 4, 2);
            ctx.fillRect(53, 42, 4, 2);
            // Beard & friendly smile
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(40, 50, 16, 8);
            ctx.fillRect(44, 58, 8, 4);
            // Grain stalk in mouth
            ctx.fillStyle = '#c6ff00';
            ctx.fillRect(56, 48, 14, 2);
            ctx.fillRect(70, 46, 6, 4);
            // Overalls
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(26, 62, 44, 30);
            ctx.fillStyle = '#ff9800'; // Plaid shirt
            ctx.fillRect(42, 62, 12, 30);
        } else {
            // Quantum AI Core holographic avatar
            ctx.fillStyle = palette[7];
            ctx.beginPath();
            ctx.arc(48, 48, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px monospace';
            ctx.fillText("AI", 36, 56);
        }

        this.cache.set(key, canvas);
        return canvas;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteSheet };
}
