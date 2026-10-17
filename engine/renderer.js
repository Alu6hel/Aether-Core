/**
 * Aether-Core: Retro GBA Canvas Renderer with Sprite Support
 * 
 * Renders the 8-color procedural tilemap, pixel sprites,
 * boss telegraph warnings, 96x96 dialogue portraits, and UI overlays.
 */

if (typeof require !== 'undefined' && typeof window === 'undefined') {
    const _sprites = require('./sprites.js');
    const _audio = require('./audio.js');
    global.SpriteSheet = _sprites.SpriteSheet;
    global.ChiptuneSynth = _audio.ChiptuneSynth;
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

                this.drawTile(tile, screenX, screenY, pal, x, y, map);
            }
        }

        // Render interactive chests and foragable sparkles
        if (map.chests) this.renderChests(map.chests, camX, camY);
        if (map.sparkles) this.renderSparkles(map.sparkles, camX, camY);
    }

    drawTile(tile, sx, sy, pal, tx, ty, map) {
        const ctx = this.ctx;
        const isSubCore = map && map.layer === 'SUB_CORE';

        switch (tile) {
            case 0: // VOID
                ctx.fillStyle = '#05070a';
                ctx.fillRect(sx, sy, 16, 16);
                break;

            case 1: { // DEEP_WATER (Authentic GBA Wavy Ocean)
                ctx.fillStyle = '#254ba8';
                ctx.fillRect(sx, sy, 16, 16);

                // Deep water gradient tone
                ctx.fillStyle = '#1c3b88';
                ctx.fillRect(sx, sy + 10, 16, 6);

                // Animated wavy water highlights (sinusoidal curves)
                ctx.fillStyle = '#3f72e5';
                const waveShift1 = Math.floor(Math.sin(this.waterAnimTimer * 2.5 + tx * 0.7 + ty * 0.5) * 2.5);
                ctx.fillRect(sx, sy + 3 + waveShift1, 16, 2);
                ctx.fillRect(sx + 3, sy + 2 + waveShift1, 10, 1);

                ctx.fillStyle = '#5c8df5';
                const waveShift2 = Math.floor(Math.cos(this.waterAnimTimer * 2.0 + tx * 0.5 + ty * 0.8) * 2.0);
                ctx.fillRect(sx + 2, sy + 8 + waveShift2, 12, 2);

                // Glistening ocean wave crests
                ctx.fillStyle = '#d4e4ff';
                const crestTick = Math.floor((this.waterAnimTimer * 3.5 + tx * 3 + ty * 5) % 6);
                if (crestTick === 0) {
                    ctx.fillRect(sx + 4, sy + 4 + waveShift1, 3, 1);
                    ctx.fillRect(sx + 11, sy + 9 + waveShift2, 2, 1);
                } else if (crestTick === 3) {
                    ctx.fillRect(sx + 8, sy + 3 + waveShift1, 4, 1);
                }
                break;
            }

            case 2: { // WATER_FOAM (Shoreline with organic curved froth & sand pebbles)
                ctx.fillStyle = '#254ba8';
                ctx.fillRect(sx, sy, 16, 16);

                // Coastal turquoise shelf
                ctx.fillStyle = '#3884c7';
                ctx.fillRect(sx, sy, 16, 10);
                ctx.fillStyle = '#4fa9e2';
                ctx.fillRect(sx, sy, 16, 5);

                // Organic animated foam crests (pulsing surge)
                const surge = Math.floor(Math.sin(this.waterAnimTimer * 3.0 + tx * 1.2) * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx, sy + 4 + surge, 16, 3);
                // Foam bubbles with natural rounded tips
                ctx.fillRect(sx + 1, sy + 2 + surge, 4, 3);
                ctx.fillRect(sx + 7, sy + 3 + surge, 5, 2);
                ctx.fillRect(sx + 12, sy + 2 + surge, 3, 3);

                // Translucent froth bubbles
                ctx.fillStyle = '#e1f5fe';
                ctx.fillRect(sx + 2, sy + 8 + surge, 3, 2);
                ctx.fillRect(sx + 9, sy + 9 + surge, 4, 2);

                // Sandy shoreline fringe pebbles at bottom
                ctx.fillStyle = '#d7ccc8';
                if ((tx * 7 + ty * 11) % 3 === 0) ctx.fillRect(sx + 2, sy + 14, 2, 2);
                if ((tx * 13 + ty * 5) % 3 === 0) ctx.fillRect(sx + 10, sy + 13, 2, 2);
                break;
            }

            case 3: { // GROUND (Lush Overworld Grass or High-Tech Basalt Sub-Core)
                if (isSubCore) {
                    // High-tech subterranean metallic floor plate
                    ctx.fillStyle = '#1c2430';
                    ctx.fillRect(sx, sy, 16, 16);

                    // Diamond-tread / beveled tile seams
                    ctx.fillStyle = '#283445';
                    ctx.fillRect(sx + 1, sy + 1, 14, 14);
                    ctx.fillStyle = '#161d26';
                    ctx.fillRect(sx + 1, sy + 15, 14, 1);
                    ctx.fillRect(sx + 15, sy + 1, 1, 15);

                    // Corner hex bolts
                    ctx.fillStyle = '#455a64';
                    ctx.fillRect(sx + 2, sy + 2, 2, 2);
                    ctx.fillRect(sx + 12, sy + 2, 2, 2);
                    ctx.fillRect(sx + 2, sy + 12, 2, 2);
                    ctx.fillRect(sx + 12, sy + 12, 2, 2);

                    // Circuitry traces
                    if ((tx + ty) % 3 === 0) {
                        ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
                        ctx.fillRect(sx + 7, sy + 3, 2, 10);
                        ctx.fillRect(sx + 3, sy + 7, 10, 2);
                    }
                } else {
                    // Lush GBA multi-tone green turf
                    ctx.fillStyle = '#43a047';
                    ctx.fillRect(sx, sy, 16, 16);

                    // Micro-dithered shading texture
                    ctx.fillStyle = '#388e3c';
                    for (let py = 0; py < 16; py += 4) {
                        for (let px = 0; px < 16; px += 4) {
                            if ((px + py + tx * 4 + ty * 4) % 8 === 0) {
                                ctx.fillRect(sx + px, sy + py, 2, 2);
                            }
                        }
                    }

                    // 3-Blade clover clusters
                    if ((tx * 7 + ty * 13) % 4 === 0) {
                        ctx.fillStyle = '#2e7d32';
                        ctx.fillRect(sx + 4, sy + 6, 2, 3);
                        ctx.fillRect(sx + 3, sy + 5, 2, 2);
                        ctx.fillRect(sx + 6, sy + 5, 2, 2);
                        ctx.fillStyle = '#66bb6a';
                        ctx.fillRect(sx + 4, sy + 4, 2, 2);
                    }
                    if ((tx * 11 + ty * 5) % 5 === 0) {
                        ctx.fillStyle = '#2e7d32';
                        ctx.fillRect(sx + 10, sy + 11, 2, 3);
                        ctx.fillRect(sx + 9, sy + 10, 2, 2);
                        ctx.fillRect(sx + 12, sy + 10, 2, 2);
                        ctx.fillStyle = '#81c784';
                        ctx.fillRect(sx + 10, sy + 9, 2, 2);
                    }

                    // Earth speckles & tiny wildflowers
                    if ((tx * 17 + ty * 23) % 7 === 0) {
                        // Wildflower
                        const flowerColors = ['#ffffff', '#ffd54f', '#ff80ab', '#80d8ff'];
                        const fCol = flowerColors[(tx + ty) % flowerColors.length];
                        ctx.fillStyle = fCol;
                        ctx.fillRect(sx + 6, sy + 9, 3, 3);
                        ctx.fillStyle = '#ffd600';
                        ctx.fillRect(sx + 7, sy + 10, 1, 1);
                    }
                }
                break;
            }

            case 4: { // FOIL_GRASS (Authentic Pokémon Emerald Style Tall Grass)
                // Base turf under grass
                ctx.fillStyle = '#388e3c';
                ctx.fillRect(sx, sy, 16, 16);

                // Deep root shadows
                ctx.fillStyle = '#1b5e20';
                ctx.fillRect(sx + 1, sy + 9, 14, 7);

                // Animated gentle wind sway for blade tips
                const wind = Math.floor(Math.sin(this.waterAnimTimer * 2.5 + tx * 1.5) * 1.5);

                // Blade cluster 1 (Left)
                ctx.fillStyle = '#2e7d32';
                ctx.fillRect(sx + 2, sy + 6, 3, 8);
                ctx.fillStyle = '#43a047';
                ctx.fillRect(sx + 2 + wind, sy + 3, 2, 5);
                ctx.fillStyle = '#a5d6a7';
                ctx.fillRect(sx + 2 + wind, sy + 2, 2, 2);

                // Blade cluster 2 (Center)
                ctx.fillStyle = '#2e7d32';
                ctx.fillRect(sx + 6, sy + 4, 4, 10);
                ctx.fillStyle = '#4caf50';
                ctx.fillRect(sx + 7 + wind, sy + 1, 3, 6);
                ctx.fillStyle = '#c8e6c9';
                ctx.fillRect(sx + 7 + wind, sy, 2, 2);

                // Blade cluster 3 (Right)
                ctx.fillStyle = '#2e7d32';
                ctx.fillRect(sx + 11, sy + 5, 3, 9);
                ctx.fillStyle = '#43a047';
                ctx.fillRect(sx + 12 + wind, sy + 2, 2, 5);
                ctx.fillStyle = '#a5d6a7';
                ctx.fillRect(sx + 12 + wind, sy + 1, 2, 2);
                break;
            }

            case 5: { // CLIFF_LOW (Stratified Rock Wall or Sub-Core Blast Plate)
                if (isSubCore) {
                    // Industrial blast plate wall
                    ctx.fillStyle = '#18202a';
                    ctx.fillRect(sx, sy, 16, 16);
                    ctx.fillStyle = '#2c394b';
                    ctx.fillRect(sx, sy, 16, 3); // Top bevel
                    ctx.fillStyle = '#0f141b';
                    ctx.fillRect(sx, sy + 14, 16, 2); // Base shadow
                    ctx.fillStyle = '#37474f';
                    ctx.fillRect(sx + 4, sy + 4, 8, 8);
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillRect(sx + 7, sy + 7, 2, 2); // Indicator diode
                } else {
                    // Natural stratified rock crag with highlight rim
                    ctx.fillStyle = '#544036';
                    ctx.fillRect(sx, sy, 16, 16);

                    // Top highlighted ledge shelf
                    ctx.fillStyle = '#8d705d';
                    ctx.fillRect(sx, sy, 16, 4);
                    ctx.fillStyle = '#bcaaa4';
                    ctx.fillRect(sx + 1, sy + 1, 14, 1);

                    // Natural vertical fissures & stone stratification
                    ctx.fillStyle = '#372820';
                    ctx.fillRect(sx + 4, sy + 4, 2, 9);
                    ctx.fillRect(sx + 11, sy + 5, 2, 8);
                    ctx.fillRect(sx + 5, sy + 8, 4, 2); // Horizontal crack

                    // Base shadow cast onto ground
                    ctx.fillStyle = '#241a15';
                    ctx.fillRect(sx, sy + 14, 16, 2);
                }
                break;
            }

            case 6: { // CLIFF_HIGH (Upper Plateau Rim or Reinforced Vault Wall)
                if (isSubCore) {
                    ctx.fillStyle = '#222b38';
                    ctx.fillRect(sx, sy, 16, 16);
                    ctx.fillStyle = '#3a4a5e';
                    ctx.fillRect(sx, sy, 16, 3);
                    ctx.fillStyle = '#111720';
                    ctx.fillRect(sx, sy + 13, 16, 3);
                    ctx.fillStyle = '#ff7043';
                    ctx.fillRect(sx + 6, sy + 6, 4, 4); // Orange hazard core
                } else {
                    ctx.fillStyle = '#6d5446';
                    ctx.fillRect(sx, sy, 16, 16);

                    // Sun-drenched rocky plateau rim
                    ctx.fillStyle = '#a18370';
                    ctx.fillRect(sx, sy, 16, 4);
                    ctx.fillStyle = '#d7ccc8';
                    ctx.fillRect(sx, sy + 1, 16, 1);

                    // Deep fissures & stone grain
                    ctx.fillStyle = '#423128';
                    ctx.fillRect(sx + 2, sy + 5, 3, 8);
                    ctx.fillRect(sx + 9, sy + 4, 3, 9);
                    ctx.fillRect(sx, sy + 14, 16, 2);
                }
                break;
            }

            case 7: { // CAVE_ENTRANCE (Deep arched cavern mouth)
                // Surrounding rock face
                ctx.fillStyle = '#544036';
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = '#8d705d';
                ctx.fillRect(sx, sy, 16, 3);

                // Dark arched cavern tunnel opening with smooth stones
                ctx.fillStyle = '#080810';
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 12, 6, Math.PI, 0, false);
                ctx.fill();
                ctx.fillRect(sx + 2, sy + 11, 12, 5);

                // Deepest abyss inside
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 12, 4, Math.PI, 0, false);
                ctx.fill();
                ctx.fillRect(sx + 4, sy + 12, 8, 4);

                // Carved stone threshold
                ctx.fillStyle = '#a88a75';
                ctx.fillRect(sx + 1, sy + 15, 14, 1);
                ctx.fillStyle = '#d7ccc8';
                ctx.fillRect(sx + 3, sy + 15, 2, 1);
                ctx.fillRect(sx + 11, sy + 15, 2, 1);
                break;
            }

            case 8: { // SCIFI_CONDUIT (Glowing neon energy pipeline in bedrock)
                ctx.fillStyle = '#1c2430';
                ctx.fillRect(sx, sy, 16, 16);

                // Heavy conduit trench
                ctx.fillStyle = '#0d131a';
                ctx.fillRect(sx + 4, sy, 8, 16);

                // Vibrant cyan neon plasma tube
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx + 6, sy, 4, 16);

                // Pulsing electric charge
                const pulse = Math.floor((this.waterAnimTimer * 12 + ty * 2) % 16);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 7, sy + pulse, 2, 4);
                break;
            }

            case 9: { // ANCIENT_TERMINAL / STEPPED ALTAR (With levitating quantum core)
                // Base pavement
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx, sy, 16, 16);

                // Stepped altar tier 1 (Outer stone step)
                ctx.fillStyle = '#455a64';
                ctx.fillRect(sx + 1, sy + 2, 14, 12);
                ctx.fillStyle = '#607d8b';
                ctx.fillRect(sx + 2, sy + 3, 12, 2);

                // Stepped altar tier 2 (Pedestal)
                ctx.fillStyle = '#78909c';
                ctx.fillRect(sx + 3, sy + 5, 10, 8);
                ctx.fillStyle = '#b0bec5';
                ctx.fillRect(sx + 4, sy + 6, 8, 2);

                // Levitating glowing quantum core artifact with bob
                const coreBob = Math.floor(Math.sin(this.waterAnimTimer * 4.0) * 2);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx + 6, sy + 7 + coreBob, 4, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 7, sy + 8 + coreBob, 2, 2);
                break;
            }

            case 10: { // SECRET_SOIL (Arable 3x3 plot for Farmer with cosmic saplings)
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(sx, sy, 16, 16);

                // Rich dark fertile soil furrows
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx + 1, sy + 2, 14, 3);
                ctx.fillRect(sx + 1, sy + 7, 14, 3);
                ctx.fillRect(sx + 1, sy + 12, 14, 3);

                // Glowing reality sapling with gentle pulse
                ctx.fillStyle = '#76ff03';
                ctx.fillRect(sx + 7, sy + 3, 2, 2);
                ctx.fillRect(sx + 6, sy + 8, 3, 2);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(sx + 7, sy + 7, 1, 1);
                break;
            }
        }
    }

    renderCharacter(char, pal) {
        const ctx = this.ctx;
        const camX = Math.round(this.camera.x);
        const camY = Math.round(this.camera.y);
        const sx = Math.round(char.pos.x) - camX;
        const sy = Math.round(char.pos.y) - camY;

        // Shadow under character
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 6, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        if (char.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
            return;
        }

        // Direction & Walk Animation state
        const facing = char.cardinalFacing || 'DOWN';
        const isMoving = char.vel && char.vel.length() > 5.0;
        const walkCycle = isMoving ? (Math.floor(char.walkTimer || 0) % 2) : 0;
        const bob = (isMoving && walkCycle === 1) ? -1 : 0;

        // 1. TECHNO-MAGE (Arcane Arcanist with Nanite Orb & Staff)
        if (char.charClass === 'TECHNO_MAGE') {
            const robeColor = '#311b92';
            const hoodColor = '#4a148c';
            const cyanAccent = '#00e5ff';
            const skinColor = '#ffcc80';

            if (facing === 'DOWN') {
                // Boots
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Robe
                ctx.fillStyle = robeColor;
                ctx.fillRect(sx - 4, sy - 7 + bob, 8, 11);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(sx - 1, sy - 6 + bob, 2, 9); // Central cyan circuit trim

                // Hood & Face
                ctx.fillStyle = hoodColor;
                ctx.fillRect(sx - 4, sy - 13 + bob, 8, 7);
                ctx.fillStyle = skinColor;
                ctx.fillRect(sx - 2, sy - 11 + bob, 4, 3);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(sx - 2, sy - 10 + bob, 1, 1);
                ctx.fillRect(sx + 1, sy - 10 + bob, 1, 1);

                // Floating Nanite Orb (Left Hand)
                ctx.fillStyle = cyanAccent;
                ctx.beginPath();
                ctx.arc(sx - 7, sy - 4 + bob, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Gold Staff (Right Hand)
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 5, sy - 13 + bob, 2, 17);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx + 4, sy - 16 + bob, 4, 3);

            } else if (facing === 'UP') {
                // Boots
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Robe Back
                ctx.fillStyle = robeColor;
                ctx.fillRect(sx - 4, sy - 7 + bob, 8, 11);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(sx - 1, sy - 6 + bob, 2, 7); // Spine line

                // Back of Hood
                ctx.fillStyle = hoodColor;
                ctx.fillRect(sx - 4, sy - 13 + bob, 8, 7);
                ctx.fillRect(sx - 1, sy - 14 + bob, 2, 2); // Hood peak

                // Staff over shoulder
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 5, sy - 14 + bob, 2, 17);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx + 4, sy - 16 + bob, 4, 3);

            } else if (facing === 'LEFT') {
                // Boots side step
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - 3 - (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);

                // Robe Side
                ctx.fillStyle = robeColor;
                ctx.fillRect(sx - 4, sy - 7 + bob, 7, 11);

                // Hood Profile
                ctx.fillStyle = hoodColor;
                ctx.fillRect(sx - 4, sy - 13 + bob, 7, 7);
                ctx.fillStyle = skinColor;
                ctx.fillRect(sx - 4, sy - 11 + bob, 2, 3);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(sx - 4, sy - 10 + bob, 1, 1);

                // Floating Orb Forward
                ctx.fillStyle = cyanAccent;
                ctx.beginPath();
                ctx.arc(sx - 8, sy - 4 + bob, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Staff Trailing
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 2, sy - 12 + bob, 2, 16);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx + 1, sy - 15 + bob, 4, 3);

            } else if (facing === 'RIGHT') {
                // Boots side step
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 2 + (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);

                // Robe Side
                ctx.fillStyle = robeColor;
                ctx.fillRect(sx - 3, sy - 7 + bob, 7, 11);

                // Hood Profile
                ctx.fillStyle = hoodColor;
                ctx.fillRect(sx - 3, sy - 13 + bob, 7, 7);
                ctx.fillStyle = skinColor;
                ctx.fillRect(sx + 2, sy - 11 + bob, 2, 3);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(sx + 3, sy - 10 + bob, 1, 1);

                // Floating Orb Forward
                ctx.fillStyle = cyanAccent;
                ctx.beginPath();
                ctx.arc(sx + 8, sy - 4 + bob, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Staff
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx - 4, sy - 12 + bob, 2, 16);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx - 5, sy - 15 + bob, 4, 3);
            }

        // 2. SUPER-SOLDIER (Heavy Armor Warrior with Broadsword)
        } else if (char.charClass === 'SUPER_SOLDIER') {
            const steelArmor = '#37474f';
            const steelHighlight = '#607d8b';
            const visorCyan = '#00e5ff';
            const pauldronOrange = '#ff5722';
            const swordSteel = '#cfd8dc';

            if (facing === 'DOWN') {
                // Greaves
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - 4 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Cuirass & Pauldrons
                ctx.fillStyle = steelArmor;
                ctx.fillRect(sx - 5, sy - 7 + bob, 10, 11);
                ctx.fillStyle = pauldronOrange;
                ctx.fillRect(sx - 7, sy - 7 + bob, 2, 5);
                ctx.fillRect(sx + 5, sy - 7 + bob, 2, 5);

                // Helmet with horizontal slit visor
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx - 4, sy - 13 + bob, 8, 6);
                ctx.fillStyle = visorCyan;
                ctx.fillRect(sx - 3, sy - 10 + bob, 6, 2);

                // Broadsword at side
                ctx.fillStyle = swordSteel;
                ctx.fillRect(sx + 6, sy - 12 + bob, 2, 14);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 5, sy - 7 + bob, 4, 2);

            } else if (facing === 'UP') {
                // Greaves
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - 4 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Backplate
                ctx.fillStyle = steelArmor;
                ctx.fillRect(sx - 5, sy - 7 + bob, 10, 11);
                ctx.fillStyle = steelHighlight;
                ctx.fillRect(sx - 2, sy - 5 + bob, 4, 6);
                ctx.fillStyle = pauldronOrange;
                ctx.fillRect(sx - 7, sy - 7 + bob, 2, 5);
                ctx.fillRect(sx + 5, sy - 7 + bob, 2, 5);

                // Helmet Back
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx - 4, sy - 13 + bob, 8, 6);

                // Diagonal Broadsword across back
                ctx.fillStyle = swordSteel;
                ctx.fillRect(sx - 4, sy - 14 + bob, 8, 2);
                ctx.fillRect(sx - 1, sy - 10 + bob, 2, 10);

            } else if (facing === 'LEFT') {
                // Greaves
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - 3 - (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);

                // Side Armor
                ctx.fillStyle = steelArmor;
                ctx.fillRect(sx - 4, sy - 7 + bob, 8, 11);
                ctx.fillStyle = pauldronOrange;
                ctx.fillRect(sx - 5, sy - 7 + bob, 3, 5);

                // Helmet Profile
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx - 4, sy - 13 + bob, 7, 6);
                ctx.fillStyle = visorCyan;
                ctx.fillRect(sx - 4, sy - 10 + bob, 3, 2);

                // Sword Forward
                ctx.fillStyle = swordSteel;
                ctx.fillRect(sx - 7, sy - 8 + bob, 3, 11);

            } else if (facing === 'RIGHT') {
                // Greaves
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx - (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 2 + (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);

                // Side Armor
                ctx.fillStyle = steelArmor;
                ctx.fillRect(sx - 4, sy - 7 + bob, 8, 11);
                ctx.fillStyle = pauldronOrange;
                ctx.fillRect(sx + 2, sy - 7 + bob, 3, 5);

                // Helmet Profile
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx - 3, sy - 13 + bob, 7, 6);
                ctx.fillStyle = visorCyan;
                ctx.fillRect(sx + 1, sy - 10 + bob, 3, 2);

                // Sword Forward
                ctx.fillStyle = swordSteel;
                ctx.fillRect(sx + 4, sy - 8 + bob, 3, 11);
            }

        // 3. THE FARMER (Deific Harvester with Straw Hat & Cosmic Hoe - Matching Image 3)
        } else if (char.charClass === 'FARMER_GOD') {
            const strawHat = '#ffd54f';
            const strawDark = '#ffb300';
            const overalls = '#1565c0';
            const plaidRed = '#d32f2f';
            const skinColor = '#ffcc80';
            const cosmicHoe = '#ffd700';

            if (facing === 'DOWN') {
                // Boots
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Denim Overalls & Plaid Shirt
                ctx.fillStyle = overalls;
                ctx.fillRect(sx - 4, sy - 6 + bob, 8, 10);
                ctx.fillStyle = plaidRed;
                ctx.fillRect(sx - 6, sy - 6 + bob, 2, 6);
                ctx.fillRect(sx + 4, sy - 6 + bob, 2, 6);

                // Straw Hat & Face
                ctx.fillStyle = strawHat;
                ctx.fillRect(sx - 7, sy - 13 + bob, 14, 3);
                ctx.fillStyle = strawDark;
                ctx.fillRect(sx - 4, sy - 16 + bob, 8, 4);
                ctx.fillStyle = skinColor;
                ctx.fillRect(sx - 3, sy - 10 + bob, 6, 4);
                ctx.fillStyle = '#eeeeee'; // Beard
                ctx.fillRect(sx - 3, sy - 7 + bob, 6, 2);

                // Cosmic Golden Hoe
                ctx.fillStyle = cosmicHoe;
                ctx.fillRect(sx + 5, sy - 10 + bob, 2, 14);
                ctx.fillRect(sx + 5, sy - 12 + bob, 5, 2);
                ctx.fillStyle = '#76ff03'; // Reality sprout
                ctx.fillRect(sx + 8, sy - 14 + bob, 2, 2);

            } else if (facing === 'UP') { // Back view matching Image 3!
                // Boots
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Overalls Back
                ctx.fillStyle = overalls;
                ctx.fillRect(sx - 4, sy - 6 + bob, 8, 10);
                ctx.fillStyle = plaidRed;
                ctx.fillRect(sx - 6, sy - 6 + bob, 2, 6);
                ctx.fillRect(sx + 4, sy - 6 + bob, 2, 6);
                ctx.fillStyle = strawDark;
                ctx.fillRect(sx - 2, sy - 5 + bob, 4, 2); // Suspenders cross

                // Straw Hat seen from behind/above
                ctx.fillStyle = strawHat;
                ctx.fillRect(sx - 6, sy - 16 + bob, 12, 7);
                ctx.fillStyle = strawDark;
                ctx.fillRect(sx - 4, sy - 14 + bob, 8, 2);

                // Hoe carried over shoulder
                ctx.fillStyle = cosmicHoe;
                ctx.fillRect(sx + 4, sy - 14 + bob, 2, 16);
                ctx.fillRect(sx + 4, sy - 16 + bob, 4, 2);

            } else if (facing === 'LEFT') {
                // Boots
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 3 - (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);

                // Overalls Side
                ctx.fillStyle = overalls;
                ctx.fillRect(sx - 4, sy - 6 + bob, 7, 10);
                ctx.fillStyle = plaidRed;
                ctx.fillRect(sx - 4, sy - 6 + bob, 2, 5);

                // Straw Hat Profile
                ctx.fillStyle = strawHat;
                ctx.fillRect(sx - 6, sy - 14 + bob, 11, 4);
                ctx.fillStyle = strawDark;
                ctx.fillRect(sx - 4, sy - 16 + bob, 6, 3);
                ctx.fillStyle = skinColor;
                ctx.fillRect(sx - 4, sy - 10 + bob, 4, 4);
                ctx.fillStyle = '#eeeeee';
                ctx.fillRect(sx - 4, sy - 7 + bob, 3, 2);

                // Hoe Forward
                ctx.fillStyle = cosmicHoe;
                ctx.fillRect(sx - 7, sy - 10 + bob, 2, 13);
                ctx.fillRect(sx - 9, sy - 12 + bob, 4, 2);

            } else if (facing === 'RIGHT') {
                // Boots
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 2 + (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);

                // Overalls Side
                ctx.fillStyle = overalls;
                ctx.fillRect(sx - 3, sy - 6 + bob, 7, 10);
                ctx.fillStyle = plaidRed;
                ctx.fillRect(sx + 2, sy - 6 + bob, 2, 5);

                // Straw Hat Profile
                ctx.fillStyle = strawHat;
                ctx.fillRect(sx - 5, sy - 14 + bob, 11, 4);
                ctx.fillStyle = strawDark;
                ctx.fillRect(sx - 2, sy - 16 + bob, 6, 3);
                ctx.fillStyle = skinColor;
                ctx.fillRect(sx, sy - 10 + bob, 4, 4);
                ctx.fillStyle = '#eeeeee';
                ctx.fillRect(sx + 1, sy - 7 + bob, 3, 2);

                // Hoe Forward
                ctx.fillStyle = cosmicHoe;
                ctx.fillRect(sx + 5, sy - 10 + bob, 2, 13);
                ctx.fillRect(sx + 5, sy - 12 + bob, 4, 2);
            }
        }

        // Draw Dash Afterimages (Ghost trail)
        if (char.dashTrail && char.dashTrail.length > 0) {
            for (const tr of char.dashTrail) {
                if (tr.alpha <= 0.05) continue;
                ctx.save();
                ctx.globalAlpha = tr.alpha * 0.55;
                const tx = Math.round(tr.x) - camX;
                const ty = Math.round(tr.y) - camY;
                ctx.fillStyle = (tr.charClass === 'SUPER_SOLDIER' ? '#ff6d00' : (tr.charClass === 'TECHNO_MAGE' ? '#00e5ff' : '#76ff03'));
                ctx.fillRect(tx - 6, ty - 8, 12, 16);
                ctx.restore();
            }
        }

        // Parry Hard-Light Shield Effect
        if (char.isParryActive) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy - 2, 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Attack Swings & Kinetic Weapon FX
        if (char.attackSwing) {
            const sw = char.attackSwing;
            const progress = 1.0 - (sw.timer / sw.maxTimer);
            if (sw.type === 'WARRIOR_SLASH') {
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(sw.angle);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                const startAngle = -sw.arc / 2 + progress * 0.2;
                const endAngle = sw.arc / 2;
                ctx.arc(0, 0, sw.range, startAngle, endAngle);
                ctx.stroke();

                ctx.strokeStyle = '#ff9100';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(0, 0, sw.range - 2, startAngle + 0.2, endAngle);
                ctx.stroke();
                ctx.restore();
            } else if (sw.type === 'MAGE_PULSE') {
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(sw.angle);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(12, -3, 6, 6);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(14, -5, 4, 10);
                ctx.fillStyle = '#e040fb';
                ctx.fillRect(18, -2, 4, 4);
                ctx.restore();
            } else if (sw.type === 'FARMER_REAP') {
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(sw.angle);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, sw.range, -sw.arc / 2, sw.arc / 2);
                ctx.stroke();

                ctx.strokeStyle = '#76ff03';
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.arc(0, 0, sw.range - 3, -sw.arc / 2 + 0.2, sw.arc / 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Projectiles
        for (const p of char.projectiles) {
            ctx.fillStyle = p.color || '#ffff00';
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, (p.radius ? p.radius / 3 : 3), 0, Math.PI * 2);
            ctx.fill();
            // Glow halo
            ctx.fillStyle = p.color || '#ffff00';
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, (p.radius ? p.radius / 1.5 : 6), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Sparks
        for (const s of char.sparks) {
            ctx.fillStyle = s.color || '#ffffff';
            ctx.fillRect(s.x - camX, s.y - camY, 2, 2);
        }
    }

    renderChests(chests, camX, camY) {
        const ctx = this.ctx;
        for (const chest of chests) {
            const sx = Math.round(chest.x) - camX;
            const sy = Math.round(chest.y) - camY;
            if (sx < -20 || sx > this.width + 20 || sy < -20 || sy > this.height + 20) continue;

            if (chest.opened) {
                // Opened chest: tilted lid with glowing golden interior
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(sx - 7, sy - 2, 14, 8);
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 6, sy - 1, 12, 6);
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(sx - 7, sy - 7, 14, 4);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(sx - 3, sy, 6, 3);
            } else {
                // Closed cyber-chest: brass & metallic body with cyan latch
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx - 8, sy - 7, 16, 14);
                ctx.fillStyle = '#b08953';
                ctx.fillRect(sx - 7, sy - 6, 14, 12);
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 7, sy - 2, 14, 2);

                // Reinforced corner brackets
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx - 8, sy - 7, 3, 3);
                ctx.fillRect(sx + 5, sy - 7, 3, 3);
                ctx.fillRect(sx - 8, sy + 4, 3, 3);
                ctx.fillRect(sx + 5, sy + 4, 3, 3);

                // Glowing cyan quantum lock
                const lockBob = (Math.floor(Date.now() / 250) % 2 === 0);
                ctx.fillStyle = lockBob ? '#00e5ff' : '#00b0ff';
                ctx.fillRect(sx - 2, sy - 2, 4, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 1, sy - 1, 2, 2);
            }
        }
    }

    renderSparkles(sparkles, camX, camY) {
        const ctx = this.ctx;
        const tick = Math.floor(Date.now() / 140);
        for (const sp of sparkles) {
            if (sp.collected) continue;
            const sx = Math.round(sp.x) - camX;
            const sy = Math.round(sp.y) - camY;
            if (sx < -20 || sx > this.width + 20 || sy < -20 || sy > this.height + 20) continue;

            const anim = (tick + (Math.floor(sp.x) * 3 + Math.floor(sp.y) * 7)) % 8;
            if (anim < 4) {
                ctx.fillStyle = (anim % 2 === 0) ? '#ffd700' : '#ffffff';
                ctx.fillRect(sx - 1, sy - 3, 2, 6);
                ctx.fillRect(sx - 3, sy - 1, 6, 2);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 1, sy - 1, 2, 2);
            }
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
