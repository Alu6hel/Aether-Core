/**
 * Aether-Core: Full Game UI Interfaces & Screen Manager
 * 
 * Manages Title Screen, Character Roster Select, In-Game Pause Menu,
 * Minimap Radar, and Game Over / Victory Displays.
 */

class ScreenManager {
    constructor(game) {
        this.game = game;
        this.currentScreen = 'TITLE'; // 'TITLE', 'ROSTER', 'GAMEPLAY', 'PAUSE', 'GAMEOVER'
        this.selectedMenuIndex = 0;
        this.menuOptions = [
            'NEW EXPEDITION',
            'CONTINUE',
            'CHOOSE WORLD SEED',
            'CHARACTER ROSTER',
            'SETTINGS'
        ];
        this.crtFilterActive = true;
    }

    render(ctx, width, height) {
        if (this.currentScreen === 'TITLE') {
            this.renderTitleScreen(ctx, width, height);
        } else if (this.currentScreen === 'ROSTER') {
            this.renderRosterScreen(ctx, width, height);
        } else if (this.currentScreen === 'PAUSE') {
            this.renderPauseMenu(ctx, width, height);
        } else if (this.currentScreen === 'GAMEOVER') {
            this.renderGameOver(ctx, width, height);
        }

        // Minimap radar in gameplay
        if (this.currentScreen === 'GAMEPLAY') {
            this.renderMinimap(ctx, width, height);
        }
    }

    renderTitleScreen(ctx, width, height) {
        // Deep cosmic void background
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, width, height);

        // Subtle stars / nanite flux
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 30; i++) {
            const sx = (i * 47) % width;
            const sy = (i * 83 + Math.floor(Date.now() / 80)) % height;
            ctx.fillRect(sx, sy, 1, 1);
        }

        // Title Header
        ctx.fillStyle = '#ff9800';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("AETHER-CORE", width / 2, 60);

        ctx.fillStyle = '#4dd0e1';
        ctx.font = '9px monospace';
        ctx.fillText("THE LIVING WORLD-COIN MATRIX", width / 2, 76);

        // Menu items
        const startY = 125;
        this.menuOptions.forEach((opt, idx) => {
            const isSelected = (idx === this.selectedMenuIndex);
            ctx.fillStyle = isSelected ? '#ffd54f' : '#90a4ae';
            ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace';
            const prefix = isSelected ? '▶ ' : '  ';
            ctx.fillText(`${prefix}${opt}`, width / 2, startY + idx * 22);
        });

        // Instructions Footer
        ctx.fillStyle = '#607d8b';
        ctx.font = '8px monospace';
        ctx.fillText("USE W/S OR ARROWS TO NAVIGATE • ENTER/A TO SELECT", width / 2, height - 20);
        ctx.textAlign = 'left';
    }

    renderRosterScreen(ctx, width, height) {
        ctx.fillStyle = '#0f141d';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffd54f';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("CHOOSE YOUR PIONEER", width / 2, 34);

        const classes = [
            {
                id: 'SUPER_SOLDIER',
                name: 'WARRIOR',
                title: 'The Dreadnought',
                stats: 'HP: 140 | SPD: 135 | NRG: 90',
                ability: 'Momentum Slash & Shield Parry',
                color: '#ff7043'
            },
            {
                id: 'TECHNO_MAGE',
                name: 'TECHNO-MAGE',
                title: 'Arcane Machinist',
                stats: 'HP: 80 | SPD: 115 | NRG: 150',
                ability: 'Homing Photon Darts & Singularity',
                color: '#00e5ff'
            },
            {
                id: 'FARMER_GOD',
                name: this.game.isFarmerUnlocked ? 'THE FARMER' : '??? (LOCKED)',
                title: this.game.isFarmerUnlocked ? 'Deific Harvester' : 'Hidden Entity',
                stats: this.game.isFarmerUnlocked ? 'HP: 999 | SPD: 150 | NRG: 999' : 'HP: ???',
                ability: this.game.isFarmerUnlocked ? 'Spacetime Tillage & Cosmic Harvest' : 'Unlock in Sub-Core 3x3 Plot',
                color: this.game.isFarmerUnlocked ? '#76ff03' : '#546e7a'
            }
        ];

        const cardWidth = 135;
        const startX = 25;
        classes.forEach((c, i) => {
            const cx = startX + i * (cardWidth + 16);
            const isSelected = (c.id === this.game.selectedClass);

            // Card border
            ctx.fillStyle = '#1b2230';
            ctx.fillRect(cx, 55, cardWidth, 210);
            ctx.strokeStyle = isSelected ? '#ffd54f' : '#37474f';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(cx, 55, cardWidth, 210);

            // Class Portrait placeholder
            ctx.fillStyle = c.color;
            ctx.fillRect(cx + 42, 70, 50, 50);

            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(c.name, cx + cardWidth / 2, 140);

            ctx.fillStyle = c.color;
            ctx.font = '8px monospace';
            ctx.fillText(c.title, cx + cardWidth / 2, 154);

            ctx.fillStyle = '#cfd8dc';
            ctx.font = '7px monospace';
            ctx.fillText(c.stats, cx + cardWidth / 2, 180);

            ctx.fillStyle = '#90a4ae';
            ctx.fillText(c.ability, cx + cardWidth / 2, 205);

            if (isSelected) {
                ctx.fillStyle = '#ffd54f';
                ctx.fillText("★ SELECTED ★", cx + cardWidth / 2, 245);
            }
        });

        ctx.fillStyle = '#78909c';
        ctx.font = '8px monospace';
        ctx.fillText("PRESS ENTER OR B TO DEPLOY INTO MAP", width / 2, height - 15);
        ctx.textAlign = 'left';
    }

    renderMinimap(ctx, width, height) {
        const map = this.game.currentMap;
        if (!map) return;

        const size = 56;
        const mx = width - size - 8;
        const my = 8;

        // Minimap border
        ctx.fillStyle = 'rgba(15, 20, 28, 0.85)';
        ctx.fillRect(mx, my, size, size);
        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, size, size);

        // Scale factor
        const sx = size / map.width;
        const sy = size / map.height;

        // Draw player dot
        const px = mx + (this.game.player.pos.x / 16) * sx;
        const py = my + (this.game.player.pos.y / 16) * sy;
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(px - 1, py - 1, 3, 3);

        // Draw cave entrance
        if (map.caveEntrance) {
            const cx = mx + map.caveEntrance.x * sx;
            const cy = my + map.caveEntrance.y * sy;
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(cx, cy, 2, 2);
        }

        // Draw boss
        for (const e of map.enemies) {
            if (e.isBoss && e.hp > 0) {
                const bx = mx + (e.x / 16) * sx;
                const by = my + (e.y / 16) * sy;
                ctx.fillStyle = '#ff1744';
                ctx.fillRect(bx - 1, by - 1, 3, 3);
            }
        }
    }

    renderPauseMenu(ctx, width, height) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSED", width / 2, height / 2 - 40);

        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffd54f';
        ctx.fillText("PRESS ESC OR START TO RESUME", width / 2, height / 2);
        ctx.fillStyle = '#cfd8dc';
        ctx.fillText(`CURRENT MAP COIN: ${this.game.currentMap.bondingCurve.ticker}`, width / 2, height / 2 + 25);
        ctx.fillText("PRESS 'M' FOR TOKEN BONDING CURVE", width / 2, height / 2 + 45);
        ctx.textAlign = 'left';
    }

    renderGameOver(ctx, width, height) {
        ctx.fillStyle = 'rgba(20, 0, 5, 0.9)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ff1744';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("CRITICAL SYSTEM FAILURE", width / 2, height / 2 - 30);
        ctx.fillStyle = '#ff8a80';
        ctx.font = '10px monospace';
        ctx.fillText("PIONEER DISCONNECTED FROM DYSON MATRIX", width / 2, height / 2 - 10);

        ctx.fillStyle = '#ffd54f';
        ctx.fillText(`ALU Coins Extracted: ${this.game.player.coinsCollected}`, width / 2, height / 2 + 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText("PRESS ENTER OR TOUCH 'A' TO REBOOT PIONEER", width / 2, height / 2 + 50);
        ctx.textAlign = 'left';
    }

    handleInput(key) {
        if (this.currentScreen === 'TITLE') {
            if (key === 'arrowup' || key === 'w') {
                this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.menuOptions.length) % this.menuOptions.length;
            } else if (key === 'arrowdown' || key === 's') {
                this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuOptions.length;
            } else if (key === 'enter' || key === ' ') {
                this.selectMenuItem();
            }
        } else if (this.currentScreen === 'ROSTER') {
            if (key === 'arrowleft' || key === 'a') {
                this.cycleRoster(-1);
            } else if (key === 'arrowright' || key === 'd') {
                this.cycleRoster(1);
            } else if (key === 'enter' || key === ' ') {
                this.currentScreen = 'GAMEPLAY';
            }
        } else if (this.currentScreen === 'PAUSE') {
            if (key === 'escape' || key === 'enter') {
                this.currentScreen = 'GAMEPLAY';
            }
        } else if (this.currentScreen === 'GAMEOVER') {
            if (key === 'enter' || key === ' ') {
                if (this.game.restartPioneer) {
                    this.game.restartPioneer();
                } else {
                    this.game.loadNewWorld(this.game.currentSeed);
                    this.currentScreen = 'GAMEPLAY';
                }
            }
        }
    }

    selectMenuItem() {
        const opt = this.menuOptions[this.selectedMenuIndex];
        if (opt === 'NEW EXPEDITION') {
            const nextSeed = (Math.random() * 0xFFFFFFFF) >>> 0;
            this.game.loadNewWorld(nextSeed);
            this.currentScreen = 'GAMEPLAY';
        } else if (opt === 'CONTINUE') {
            this.currentScreen = 'GAMEPLAY';
        } else if (opt === 'CHOOSE WORLD SEED') {
            const inputSeed = prompt("Enter 32-bit World Seed (hex or integer):", "0x7F3A59DF");
            if (inputSeed) {
                const parsed = parseInt(inputSeed, inputSeed.startsWith('0x') ? 16 : 10);
                if (!isNaN(parsed)) {
                    this.game.loadNewWorld(parsed);
                    this.currentScreen = 'GAMEPLAY';
                }
            }
        } else if (opt === 'CHARACTER ROSTER') {
            this.currentScreen = 'ROSTER';
        } else if (opt === 'SETTINGS') {
            alert("SETTINGS: Audio is Enabled. Full 8-direction analog momentum with corner sliding active. CRT Filter: ON.");
        }
    }

    cycleRoster(dir) {
        const classes = ['SUPER_SOLDIER', 'TECHNO_MAGE', 'FARMER_GOD'];
        let idx = classes.indexOf(this.game.selectedClass);
        idx = (idx + dir + classes.length) % classes.length;
        if (classes[idx] === 'FARMER_GOD' && !this.game.isFarmerUnlocked) {
            // Skip locked class
            idx = (idx + dir + classes.length) % classes.length;
        }
        this.game.selectedClass = classes[idx];
        this.game.player.charClass = classes[idx];
        this.game.player.applyClassStats();
        this.game.updateHUD();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScreenManager };
}
