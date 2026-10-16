/**
 * Aether-Core: Retro GBA Canvas Renderer with Sprite Support
 * 
 * Renders the 8-color procedural tilemap, pixel sprites,
 * boss telegraph warnings, 96x96 dialogue portraits, and UI overlays.
 */

if (typeof require !== 'undefined') {
    var { SpriteSheet } = require('./sprites.js');
    var { ChiptuneSynth } = require('./audio.js');
}

class RetroRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.camera = { x: 0, y: 0 };
        this.waterAnimTimer = 0;
        this.audio = new ChiptuneSynth();
        this.sprites = new SpriteSheet();
    }

    clear(bgColor = '#0a0a0f') {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    updateCamera(playerPos, mapWidth, mapHeight, dt) {
        const targetX = playerPos.x - this.width / 2;
        const targetY = playerPos.y - this.height / 2;
        this.camera.x += (targetX - this.camera.x) * 8.0 * dt;
        this.camera.y += (targetY - this.camera.y) * 8.0 * dt;

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
                ctx.fillStyle = pal[1];
                if ((tx + ty) % 3 === 0) ctx.fillRect(sx + 4, sy + 4, 2, 2);
                if ((tx * 3 + ty) % 5 === 0) ctx.fillRect(sx + 10, sy + 11, 2, 2);
                break;

            case 4: // FOIL_GRASS
                ctx.fillStyle = pal[4];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[3];
                ctx.fillRect(sx + 3, sy + 5, 2, 6);
                ctx.fillRect(sx + 7, sy + 3, 2, 8);
                ctx.fillRect(sx + 11, sy + 6, 2, 5);
                break;

            case 5: // CLIFF_LOW (Rock face)
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[0];
                ctx.fillRect(sx, sy + 13, 16, 3);
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
                ctx.fillStyle = pal[0];
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 12, 6, Math.PI, 0, false);
                ctx.fill();
                ctx.fillRect(sx + 2, sy + 12, 12, 4);
                break;

            case 8: // SCIFI_CONDUIT (Hidden tech line)
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[7];
                ctx.fillRect(sx + 6, sy, 4, 16);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 7, sy + 4, 2, 8);
                break;

            case 9: // ANCIENT_TERMINAL
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = pal[7];
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

        if (char.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
            return;
        }

        // Draw Character based on Class
        if (char.charClass === 'TECHNO_MAGE') {
            ctx.fillStyle = pal[7]; // Arcane cyan
            ctx.fillRect(sx - 4, sy - 8, 8, 12);
            ctx.fillStyle = pal[0];
            ctx.fillRect(sx - 3, sy - 12, 6, 5);
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(sx - 2, sy - 10, 4, 3);
            ctx.fillStyle = '#ffb300';
            ctx.fillRect(sx + 4, sy - 12, 2, 16);
            ctx.fillStyle = pal[7];
            ctx.fillRect(sx + 3, sy - 14, 4, 3);
        } else if (char.charClass === 'SUPER_SOLDIER') {
            ctx.fillStyle = pal[3];
            ctx.fillRect(sx - 5, sy - 8, 10, 11);
            ctx.fillStyle = pal[0];
            ctx.fillRect(sx - 4, sy - 13, 8, 6);
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(sx - 3, sy - 10, 6, 2);
            ctx.fillStyle = '#ff3d00';
            ctx.fillRect(sx - 6, sy - 8, 2, 4);
            ctx.fillRect(sx + 4, sy - 8, 2, 4);
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(sx + 5, sy - 14, 2, 14);
        } else if (char.charClass === 'FARMER_GOD') {
            ctx.fillStyle = '#ffb74d';
            ctx.fillRect(sx - 7, sy - 13, 14, 3);
            ctx.fillRect(sx - 4, sy - 16, 8, 4);
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(sx - 3, sy - 11, 6, 5);
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(sx - 4, sy - 6, 8, 10);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(sx + 4, sy - 10, 2, 14);
            ctx.fillRect(sx + 4, sy - 12, 5, 2);
        }

        // Parry Hard-Light Shield Effect
        if (char.isParryActive) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy - 2, 15, 0, Math.PI * 2);
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
                ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ff1744' : '#d50000';
                ctx.fillRect(sx - 5, sy - 10, 10, 7);
                // Heavy armor vents
                ctx.fillStyle = pal[7];
                ctx.fillRect(sx - 12, sy - 6, 3, 10);
                ctx.fillRect(sx + 9, sy - 6, 3, 10);

                // Telegraph beam line if charging attack
                if (enemy.telegraphTimer > 0) {
                    ctx.strokeStyle = '#ff1744';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx, sy + 80);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Boss Health bar
                ctx.fillStyle = '#000000';
                ctx.fillRect(sx - 18, sy - 26, 36, 5);
                ctx.fillStyle = '#ff1744';
                ctx.fillRect(sx - 17, sy - 25, 34 * Math.max(0, enemy.hp / enemy.maxHp), 3);
            } else {
                // Small Nanite Prowler
                ctx.fillStyle = pal[1];
                ctx.fillRect(sx - 6, sy - 6, 12, 10);
                ctx.fillStyle = '#ff5252';
                ctx.fillRect(sx - 3, sy - 4, 3, 3);
                ctx.fillRect(sx + 1, sy - 4, 3, 3);
            }
        }
    }

    renderDialogue(cutscene, pal) {
        if (!cutscene || cutscene.isComplete) return;

        const ctx = this.ctx;
        const boxX = 12;
        const boxY = this.height - 90;
        const boxW = this.width - 24;
        const boxH = 78;

        // Frosted GBA Box
        ctx.fillStyle = 'rgba(235, 245, 255, 0.96)';
        ctx.strokeStyle = '#3949ab';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        let textOffsetX = 14;

        // Render 96x96 Character Portrait if present
        if (cutscene.portrait && typeof document !== 'undefined') {
            const portraitCanvas = this.sprites.getPortrait(cutscene.portrait, pal || ['#000', '#222', '#444', '#666', '#888', '#aaa', '#ccc', '#00e5ff']);
            ctx.drawImage(portraitCanvas, boxX + 8, boxY + 8, 62, 62);
            textOffsetX = 78;
        }

        // Speaker Name
        if (cutscene.speakerName) {
            ctx.fillStyle = '#1a237e';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(cutscene.speakerName.toUpperCase(), boxX + textOffsetX, boxY + 16);
        }

        // Typewriter Text
        ctx.fillStyle = '#1b1b1b';
        ctx.font = '10px monospace';
        this.wrapText(ctx, cutscene.displayedText, boxX + textOffsetX, boxY + 30, boxW - textOffsetX - 12, 13);

        // Blinking prompt arrow
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
    module.exports = { RetroRenderer };
}
