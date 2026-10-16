/**
 * Aether-Core: Retro GBA Canvas Renderer & Chiptune Audio Synthesizer
 * 
 * Renders the 8-color procedural tilemap, animated pixel sprites,
 * dynamic parry flash indicators, and GBA dialogue boxes.
 */

class RetroAudio {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx && typeof AudioContext !== 'undefined') {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(freq, type = 'square', duration = 0.1, gainVal = 0.1) {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playTypewriter() {
        this.playTone(480, 'square', 0.03, 0.04);
    }

    playSlash() {
        this.playTone(220, 'sawtooth', 0.12, 0.08);
    }

    playShoot() {
        this.playTone(720, 'triangle', 0.15, 0.08);
    }

    playParry() {
        // High crisp dual-tone metallic "CLANG!"
        this.playTone(1200, 'square', 0.25, 0.15);
        setTimeout(() => this.playTone(1800, 'sine', 0.2, 0.1), 30);
    }

    playCoin() {
        this.playTone(987.77, 'sine', 0.08, 0.1);
        setTimeout(() => this.playTone(1318.51, 'sine', 0.18, 0.1), 80);
    }
}

class RetroRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.camera = { x: 0, y: 0 };
        this.waterAnimTimer = 0;
        this.audio = new RetroAudio();
    }

    clear(bgColor = '#0a0a0f') {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    updateCamera(playerPos, mapWidth, mapHeight, dt) {
        // Smooth camera lerp with integer pixel snapping
        const targetX = playerPos.x - this.width / 2;
        const targetY = playerPos.y - this.height / 2;
        this.camera.x += (targetX - this.camera.x) * 8.0 * dt;
        this.camera.y += (targetY - this.camera.y) * 8.0 * dt;

        // Clamp inside map boundaries
        this.camera.x = Math.max(0, Math.min(this.camera.x, mapWidth * 16 - this.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, mapHeight * 16 - this.height));
    }

    renderMap(map, dt) {
        this.waterAnimTimer += dt;
        const pal = map.palette.colors;
        const camX = Math.round(this.camera.x);
        const camY = Math.round(this.camera.y);

        const startCol = Math.floor(camX / 16);
        const endCol = Math.min(map.width - 1, Math.ceil((camX + this.width) / 16));
        const startRow = Math.floor(camY / 16);
        const endRow = Math.min(map.height - 1, Math.ceil((camY + this.height) / 16));

        // Render visible tiles
        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                const tile = map.get(x, y);
                const screenX = x * 16 - camX;
                const screenY = y * 16 - camY;

                this.drawTile(tile, screenX, screenY, pal, x, y);
            }
        }
    }

    drawTile(tile, sx, sy, pal, tx, ty) {
        const ctx = this.ctx;

        switch (tile) {
            case 0: // VOID
                ctx.fillStyle = pal[0];
                ctx.fillRect(sx, sy, 16, 16);
                break;

            case 1: // DEEP_WATER
                ctx.fillStyle = pal[5];
                ctx.fillRect(sx, sy, 16, 16);
                // GBA wave ripple diagonal pattern (animated)
                ctx.fillStyle = pal[6];
                const waveOffset = Math.floor((this.waterAnimTimer * 4 + tx + ty) % 4);
                ctx.fillRect(sx + waveOffset * 4, sy + 4, 6, 2);
                ctx.fillRect(sx + ((waveOffset * 4 + 8) % 16), sy + 11, 5, 2);
                break;

            case 2: // WATER_FOAM (Shoreline)
                ctx.fillStyle = pal[6];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[5];
                ctx.fillRect(sx + 2, sy + 2, 12, 12);
                break;

            case 3: // GROUND (Walkable terrain)
                ctx.fillStyle = pal[2];
                ctx.fillRect(sx, sy, 16, 16);
                // Subtle stippling texture
                ctx.fillStyle = pal[1];
                if ((tx + ty) % 3 === 0) ctx.fillRect(sx + 4, sy + 4, 2, 2);
                if ((tx * 3 + ty) % 5 === 0) ctx.fillRect(sx + 10, sy + 11, 2, 2);
                break;

            case 4: // FOIL_GRASS
                ctx.fillStyle = pal[4];
                ctx.fillRect(sx, sy, 16, 16);
                // GBA grass tuft
                ctx.fillStyle = pal[3];
                ctx.fillRect(sx + 3, sy + 5, 2, 6);
                ctx.fillRect(sx + 7, sy + 3, 2, 8);
                ctx.fillRect(sx + 11, sy + 6, 2, 5);
                break;

            case 5: // CLIFF_LOW (Rock face)
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[0];
                ctx.fillRect(sx, sy + 13, 16, 3); // Shadow ledge
                ctx.fillStyle = pal[2];
                ctx.fillRect(sx + 2, sy + 2, 12, 4);
                break;

            case 6: // CLIFF_HIGH (Plateau ledge)
                ctx.fillStyle = pal[3];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx + 2, sy + 4, 12, 8);
                break;

            case 7: // CAVE_ENTRANCE
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[0]; // Deep black cavern void
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 12, 6, Math.PI, 0, false);
                ctx.fill();
                ctx.fillRect(sx + 2, sy + 12, 12, 4);
                break;

            case 8: // SCIFI_CONDUIT (Hidden tech line)
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[7]; // Neon glowing circuit line
                ctx.fillRect(sx + 6, sy, 4, 16);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 7, sy + 4, 2, 8);
                break;

            case 9: // ANCIENT_TERMINAL
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[7]; // Screen monitor glow
                ctx.fillRect(sx + 3, sy + 3, 10, 8);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 5, sy + 5, 6, 3);
                break;

            case 10: // SECRET_SOIL (Arable plot for Farmer)
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(sx + 2, sy + 3, 12, 3);
                ctx.fillRect(sx + 2, sy + 9, 12, 3);
                break;
        }
    }

    renderCharacter(char, pal) {
        const ctx = this.ctx;
        const camX = Math.round(this.camera.x);
        const camY = Math.round(this.camera.y);
        const sx = Math.round(char.pos.x) - camX;
        const sy = Math.round(char.pos.y) - camY;

        // Shadow under character
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 6, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Invulnerability flicker
        if (char.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
            return;
        }

        // Draw Character based on Class
        if (char.charClass === 'TECHNO_MAGE') {
            // Robe body
            ctx.fillStyle = pal[7]; // Arcane cyan
            ctx.fillRect(sx - 4, sy - 8, 8, 12);
            // Hood & face
            ctx.fillStyle = pal[0];
            ctx.fillRect(sx - 3, sy - 12, 6, 5);
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(sx - 2, sy - 10, 4, 3);
            // Staff
            ctx.fillStyle = '#ffb300';
            ctx.fillRect(sx + 4, sy - 12, 2, 16);
            ctx.fillStyle = pal[7];
            ctx.fillRect(sx + 3, sy - 14, 4, 3);
        } else if (char.charClass === 'SUPER_SOLDIER') {
            // Modular Power Armor
            ctx.fillStyle = pal[3]; // Metal plate
            ctx.fillRect(sx - 5, sy - 8, 10, 11);
            // Helmet visor
            ctx.fillStyle = pal[0];
            ctx.fillRect(sx - 4, sy - 13, 8, 6);
            ctx.fillStyle = '#00e5ff'; // Visor light
            ctx.fillRect(sx - 3, sy - 10, 6, 2);
            // Shoulder exhaust
            ctx.fillStyle = '#ff3d00';
            ctx.fillRect(sx - 6, sy - 8, 2, 4);
            ctx.fillRect(sx + 4, sy - 8, 2, 4);
            // Broadsword on back
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(sx + 5, sy - 14, 2, 14);
        } else if (char.charClass === 'FARMER_GOD') {
            // Straw Hat & Overalls
            ctx.fillStyle = '#ffb74d'; // Straw hat brim
            ctx.fillRect(sx - 7, sy - 13, 14, 3);
            ctx.fillRect(sx - 4, sy - 16, 8, 4);
            // Head
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(sx - 3, sy - 11, 6, 5);
            // Overalls (denim blue)
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(sx - 4, sy - 6, 8, 10);
            // Cosmic Golden Hoe in hand
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(sx + 4, sy - 10, 2, 14);
            ctx.fillRect(sx + 4, sy - 12, 5, 2);
        }

        // Parry Hard-Light Shield Effect
        if (char.isParryActive) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy - 2, 14, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Projectiles
        for (const p of char.projectiles) {
            ctx.fillStyle = p.color || '#ffff00';
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sparks
        for (const s of char.sparks) {
            ctx.fillStyle = s.color || '#ffffff';
            ctx.fillRect(s.x - camX, s.y - camY, 2, 2);
        }
    }

    renderEnemies(enemies, pal) {
        const ctx = this.ctx;
        const camX = Math.round(this.camera.x);
        const camY = Math.round(this.camera.y);

        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            const sx = Math.round(enemy.x) - camX;
            const sy = Math.round(enemy.y) - camY;

            if (enemy.isBoss) {
                // Aegis Dreadnought Boss (Large 32x32)
                ctx.fillStyle = pal[0];
                ctx.fillRect(sx - 14, sy - 18, 28, 26);
                ctx.fillStyle = '#ff1744'; // Glowing reactor eye
                ctx.fillRect(sx - 4, sy - 10, 8, 6);
                // Health bar
                ctx.fillStyle = '#000000';
                ctx.fillRect(sx - 16, sy - 24, 32, 4);
                ctx.fillStyle = '#ff1744';
                ctx.fillRect(sx - 15, sy - 23, 30 * (enemy.hp / enemy.maxHp), 2);
            } else {
                // Small Nanite Prowler (16x16)
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx - 6, sy - 6, 12, 10);
                ctx.fillStyle = '#ff5252';
                ctx.fillRect(sx - 3, sy - 4, 3, 3);
                ctx.fillRect(sx + 1, sy - 4, 3, 3);
            }
        }
    }

    renderDialogue(cutscene) {
        if (!cutscene || cutscene.isComplete) return;

        const ctx = this.ctx;
        const boxX = 12;
        const boxY = this.height - 84;
        const boxW = this.width - 24;
        const boxH = 72;

        // GBA Frosted Dialog Box (matching reference image 3)
        ctx.fillStyle = 'rgba(235, 245, 255, 0.95)';
        ctx.strokeStyle = '#5c6bc0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        // Speaker Name Badge
        if (cutscene.speakerName) {
            ctx.fillStyle = '#1a237e';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(cutscene.speakerName.toUpperCase(), boxX + 12, boxY + 16);
        }

        // Typewriter Text
        ctx.fillStyle = '#212121';
        ctx.font = '11px monospace';
        this.wrapText(ctx, cutscene.displayedText, boxX + 12, boxY + 32, boxW - 24, 14);

        // Advance prompt arrow (blinking red triangle)
        if (Math.floor(Date.now() / 300) % 2 === 0) {
            ctx.fillStyle = '#d32f2f';
            ctx.beginPath();
            ctx.moveTo(boxX + boxW - 16, boxY + boxH - 12);
            ctx.lineTo(boxX + boxW - 8, boxY + boxH - 12);
            ctx.lineTo(boxX + boxW - 12, boxY + boxH - 6);
            ctx.fill();
        }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RetroAudio, RetroRenderer };
}
