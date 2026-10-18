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
        this.titleAnimTimer = 0;
        this.floatingTexts = [];
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

        // Render ground objects: chests, sparkles, portals, and depleted stumps / ground flora
        if (map.chests) this.renderChests(map.chests, camX, camY);
        if (map.sparkles) this.renderSparkles(map.sparkles, camX, camY);
        if (map.portals) this.renderPortals(map.portals, camX, camY);
        if (map.resourceNodes) this.renderGroundResourceNodes(map.resourceNodes, camX, camY, dt);
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

            case 11: { // PATH_COBBLE (Authentic GBA Interlocking Cobblestone Road)
                ctx.fillStyle = '#b0bec5';
                ctx.fillRect(sx, sy, 16, 16);

                // Darker mortar lines
                ctx.fillStyle = '#78909c';
                ctx.fillRect(sx, sy, 16, 1);
                ctx.fillRect(sx, sy + 8, 16, 1);
                const shift = (ty % 2 === 0) ? 0 : 8;
                ctx.fillRect(sx + (shift % 16), sy, 1, 8);
                ctx.fillRect(sx + ((shift + 8) % 16), sy + 8, 1, 8);

                // Paver highlights
                ctx.fillStyle = '#cfd8dc';
                ctx.fillRect(sx + 1 + (shift % 16), sy + 1, 6, 2);
                ctx.fillRect(sx + 1 + ((shift + 8) % 16), sy + 9, 6, 2);

                // Weathered stone flecks
                if ((tx * 3 + ty * 7) % 5 === 0) {
                    ctx.fillStyle = '#90a4ae';
                    ctx.fillRect(sx + 3, sy + 4, 2, 2);
                }
                break;
            }

            case 12: { // WOODEN_BRIDGE (Walkable Timber Bridge over Water)
                // Water background beneath bridge
                ctx.fillStyle = '#254ba8';
                ctx.fillRect(sx, sy, 16, 16);

                // Dark water shadow under bridge deck
                ctx.fillStyle = 'rgba(10, 20, 40, 0.45)';
                ctx.fillRect(sx, sy, 16, 16);

                // Horizontal timber planks
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(sx, sy + 1, 16, 14);

                // Plank separation lines
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx, sy + 1, 16, 1);
                ctx.fillRect(sx, sy + 5, 16, 1);
                ctx.fillRect(sx, sy + 9, 16, 1);
                ctx.fillRect(sx, sy + 14, 16, 1);

                // Wood grain highlights
                ctx.fillStyle = '#a1887f';
                ctx.fillRect(sx + 2, sy + 2, 12, 1);
                ctx.fillRect(sx + 4, sy + 6, 8, 1);
                ctx.fillRect(sx + 1, sy + 10, 14, 1);

                // Iron nail studs
                ctx.fillStyle = '#212121';
                ctx.fillRect(sx + 2, sy + 3, 1, 1);
                ctx.fillRect(sx + 13, sy + 3, 1, 1);
                ctx.fillRect(sx + 2, sy + 7, 1, 1);
                ctx.fillRect(sx + 13, sy + 7, 1, 1);
                ctx.fillRect(sx + 2, sy + 11, 1, 1);
                ctx.fillRect(sx + 13, sy + 11, 1, 1);

                // Upper and lower guide railings
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx, sy, 16, 2);
                ctx.fillRect(sx, sy + 14, 16, 2);
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(sx + 4, sy, 2, 2);
                ctx.fillRect(sx + 12, sy, 2, 2);
                ctx.fillRect(sx + 4, sy + 14, 2, 2);
                ctx.fillRect(sx + 12, sy + 14, 2, 2);
                break;
            }

            case 13: { // FENCE_WOOD (Split-Rail Rustic Wooden Fence)
                // Turf underneath
                ctx.fillStyle = '#43a047';
                ctx.fillRect(sx, sy, 16, 16);

                // Fence post shadow
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.fillRect(sx + 4, sy + 13, 8, 3);

                // Horizontal rails
                ctx.fillStyle = '#6d4c41';
                ctx.fillRect(sx, sy + 5, 16, 3);
                ctx.fillRect(sx, sy + 10, 16, 3);
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(sx, sy + 5, 16, 1);
                ctx.fillRect(sx, sy + 10, 16, 1);

                // Vertical fence posts
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx + 6, sy + 2, 4, 12);
                ctx.fillStyle = '#795548';
                ctx.fillRect(sx + 7, sy + 2, 2, 12);
                ctx.fillStyle = '#a1887f';
                ctx.fillRect(sx + 7, sy + 2, 2, 1);
                break;
            }

            case 14: { // BUILDING_WALL (Timber-Framed Stone/Wood Cottage Wall)
                ctx.fillStyle = '#d7ccc8';
                ctx.fillRect(sx, sy, 16, 16);

                // Stone texture flecks
                ctx.fillStyle = '#bcaaa4';
                ctx.fillRect(sx + 2, sy + 2, 4, 3);
                ctx.fillRect(sx + 9, sy + 5, 5, 4);
                ctx.fillRect(sx + 3, sy + 10, 6, 4);

                // Dark oak timber corner studs and sill
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx, sy, 2, 16);
                ctx.fillRect(sx + 14, sy, 2, 16);
                ctx.fillRect(sx, sy + 14, 16, 2);
                break;
            }

            case 15: { // BUILDING_ROOF (Terracotta Shingle Cottage Roof)
                ctx.fillStyle = '#b71c1c';
                ctx.fillRect(sx, sy, 16, 16);

                // Shingle rows
                ctx.fillStyle = '#c62828';
                ctx.fillRect(sx, sy + 1, 16, 4);
                ctx.fillRect(sx, sy + 6, 16, 4);
                ctx.fillRect(sx, sy + 11, 16, 4);

                // Shingle highlights
                ctx.fillStyle = '#e57373';
                ctx.fillRect(sx + 1, sy + 1, 14, 1);
                ctx.fillRect(sx + 1, sy + 6, 14, 1);
                ctx.fillRect(sx + 1, sy + 11, 14, 1);

                // Vertical tile seams
                ctx.fillStyle = '#7f0000';
                ctx.fillRect(sx + 4, sy + 1, 1, 4);
                ctx.fillRect(sx + 11, sy + 1, 1, 4);
                ctx.fillRect(sx + 8, sy + 6, 1, 4);
                ctx.fillRect(sx + 4, sy + 11, 1, 4);
                ctx.fillRect(sx + 11, sy + 11, 1, 4);
                break;
            }

            case 16: { // BUILDING_DOOR (Arched Timber Door)
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx, sy, 16, 16);

                // Wood planks
                ctx.fillStyle = '#6d4c41';
                ctx.fillRect(sx + 2, sy + 2, 12, 14);
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(sx + 6, sy + 2, 1, 14);
                ctx.fillRect(sx + 10, sy + 2, 1, 14);

                // Iron door latch
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 3, sy + 8, 2, 2);
                break;
            }

            case 17: { // BUILDING_WINDOW (Warm Amber Glowing Window)
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx, sy, 16, 16);

                // Window frame & glowing glass
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 2, sy + 3, 12, 10);
                ctx.fillStyle = '#fff8e1';
                ctx.fillRect(sx + 4, sy + 5, 8, 6);

                // Mullion cross
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx + 7, sy + 3, 2, 10);
                ctx.fillRect(sx + 2, sy + 7, 12, 2);
                break;
            }

            case 18: { // REEDS_WATER (Swaying Riverbank Reeds)
                // Shallow water base
                ctx.fillStyle = '#3884c7';
                ctx.fillRect(sx, sy, 16, 16);

                const reedSway = Math.floor(Math.sin(this.waterAnimTimer * 3.0 + tx) * 2);
                // Stalks
                ctx.fillStyle = '#2e7d32';
                ctx.fillRect(sx + 3, sy + 6, 2, 10);
                ctx.fillRect(sx + 7, sy + 4, 2, 12);
                ctx.fillRect(sx + 12, sy + 5, 2, 11);

                // Swaying tips
                ctx.fillStyle = '#43a047';
                ctx.fillRect(sx + 3 + reedSway, sy + 3, 2, 4);
                ctx.fillRect(sx + 7 + reedSway, sy + 1, 2, 4);
                ctx.fillRect(sx + 12 + reedSway, sy + 2, 2, 4);

                // Brown cattails
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx + 3 + reedSway, sy + 1, 2, 3);
                ctx.fillRect(sx + 7 + reedSway, sy - 1, 2, 3);
                ctx.fillRect(sx + 12 + reedSway, sy, 2, 3);
                break;
            }

            case 19: { // FLOWER_BED (Lush Colorful Flower Garden)
                ctx.fillStyle = '#388e3c';
                ctx.fillRect(sx, sy, 16, 16);

                // Leaf foliage
                ctx.fillStyle = '#2e7d32';
                ctx.fillRect(sx + 2, sy + 2, 12, 12);

                // Vibrant multi-color blossoms
                const colors = ['#e91e63', '#ffeb3b', '#9c27b0', '#00e5ff', '#ff5722'];
                for (let i = 0; i < 4; i++) {
                    const fx = sx + 3 + (i % 2) * 6;
                    const fy = sy + 3 + Math.floor(i / 2) * 6;
                    ctx.fillStyle = colors[(tx + ty + i) % colors.length];
                    ctx.fillRect(fx, fy, 4, 4);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(fx + 1, fy + 1, 2, 2);
                }
                break;
            }

            case 20: { // MUSHROOM_GLOW (Bioluminescent Cavern Mushroom)
                ctx.fillStyle = '#1c2430';
                ctx.fillRect(sx, sy, 16, 16);

                // Soft radial glow aura
                const pulse = (Math.sin(this.waterAnimTimer * 4.0 + tx + ty) + 1.0) * 0.5;
                const glowR = 6 + pulse * 4;
                const grad = ctx.createRadialGradient(sx + 8, sy + 8, 0, sx + 8, sy + 8, glowR);
                grad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
                grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 8, glowR, 0, Math.PI * 2);
                ctx.fill();

                // Mushroom stalk
                ctx.fillStyle = '#cfd8dc';
                ctx.fillRect(sx + 7, sy + 8, 2, 6);

                // Bioluminescent Cap
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx + 4, sy + 4, 8, 5);
                ctx.fillStyle = '#e0f7fa';
                ctx.fillRect(sx + 5, sy + 3, 6, 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 6, sy + 5, 2, 2);
                break;
            }

            case 21: { // PORTAL_EXIT (Stone Archway / Transition Portal)
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx, sy, 16, 16);

                // Carved stone pillars
                ctx.fillStyle = '#455a64';
                ctx.fillRect(sx + 1, sy, 4, 16);
                ctx.fillRect(sx + 11, sy, 4, 16);
                ctx.fillStyle = '#607d8b';
                ctx.fillRect(sx, sy, 16, 4);

                // Pulsating dimensional vortex center
                const pPulse = Math.floor((this.waterAnimTimer * 8.0) % 8);
                ctx.fillStyle = (pPulse % 2 === 0) ? '#00e5ff' : '#64ffda';
                ctx.fillRect(sx + 5, sy + 4, 6, 12);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 6, sy + 6, 4, 8);
                break;
            }

            case 22: { // SAND_DUNE (Solarium Dunes golden desert sands)
                ctx.fillStyle = '#d49b58';
                ctx.fillRect(sx, sy, 16, 16);

                // Wind-blown rippling dune shading
                ctx.fillStyle = '#c58b45';
                ctx.fillRect(sx, sy + 11, 16, 5);
                ctx.fillStyle = '#e8b874';
                ctx.fillRect(sx + 2, sy + 3, 12, 3);

                // Glistening silica specks
                if ((tx * 13 + ty * 19) % 5 === 0) {
                    ctx.fillStyle = '#fff8e1';
                    ctx.fillRect(sx + 4, sy + 7, 2, 2);
                }
                if ((tx * 7 + ty * 11) % 6 === 0) {
                    ctx.fillStyle = '#ffe082';
                    ctx.fillRect(sx + 11, sy + 4, 2, 1);
                }
                break;
            }

            case 23: { // SANDSTONE_RUIN (Ancient Sunken Megalith Walls)
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(sx, sy, 16, 16);

                // Carved stone blocks & beveled mortar
                ctx.fillStyle = '#6d4c41';
                ctx.fillRect(sx + 1, sy + 1, 14, 14);
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx + 1, sy + 15, 14, 1);
                ctx.fillRect(sx + 15, sy + 1, 1, 15);

                // Ancient sun-glyph engravings
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 7, sy + 6, 2, 4);
                ctx.fillRect(sx + 5, sy + 7, 6, 2);
                break;
            }

            case 24: { // QUICKSAND (Swirling Perilous Dune Sinkhole)
                ctx.fillStyle = '#a67332';
                ctx.fillRect(sx, sy, 16, 16);

                // Concentric swirling vortex
                const vortex = Math.floor(this.waterAnimTimer * 4 + tx + ty) % 4;
                ctx.fillStyle = '#7a4e1d';
                ctx.fillRect(sx + 2 + vortex, sy + 3, 12 - vortex * 2, 10);
                ctx.fillStyle = '#4e2f0d';
                ctx.fillRect(sx + 5, sy + 5, 6, 6);
                ctx.fillStyle = '#261405';
                ctx.fillRect(sx + 7, sy + 7, 2, 2);
                break;
            }

            case 25: { // CLOUD_TURF (Celestial Floating Cloud Archipelago)
                ctx.fillStyle = '#e1f5fe';
                ctx.fillRect(sx, sy, 16, 16);

                // Fluffy cloud puffs & cumulus shading
                ctx.fillStyle = '#b3e5fc';
                ctx.fillRect(sx, sy + 10, 16, 6);
                ctx.fillRect(sx + 2, sy + 8, 4, 3);
                ctx.fillRect(sx + 9, sy + 7, 5, 4);

                // Brilliant celestial rim highlights
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 1, sy + 2, 6, 3);
                ctx.fillRect(sx + 8, sy + 1, 7, 3);

                // Tiny glowing star-dust sparkles
                if ((tx * 11 + ty * 17) % 7 === 0) {
                    const sAlpha = Math.sin(this.waterAnimTimer * 3 + tx) > 0;
                    ctx.fillStyle = sAlpha ? '#fff59d' : '#80d8ff';
                    ctx.fillRect(sx + 7, sy + 5, 2, 2);
                }
                break;
            }

            case 26: { // CELESTIAL_GLASS (Shimmering Crystalline Sky Bridge)
                ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
                ctx.fillRect(sx, sy, 16, 16);

                // Translucent geometric glass frame
                ctx.fillStyle = '#00b0ff';
                ctx.fillRect(sx, sy, 16, 1);
                ctx.fillRect(sx, sy + 15, 16, 1);
                ctx.fillRect(sx, sy, 1, 16);
                ctx.fillRect(sx + 15, sy, 1, 16);

                // Diagonal crystalline light reflection
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                const refOffset = Math.floor(this.waterAnimTimer * 6 + tx * 2) % 16;
                ctx.fillRect(sx + refOffset, sy + 2, 3, 12);
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

        // 4. CHRONO-GLITCHER (Reality/Time Anomaly with Temporal Tuning Blade)
        } else if (char.charClass === 'CHRONO_GLITCHER') {
            const coatDark = '#240046';
            const coatLight = '#3c096c';
            const glitchMagenta = '#ff007f';
            const cyanAccent = '#00f0ff';
            const bladeColor = '#e0aaff';
            const skinColor = '#ffcc80';

            // Micro-jitter glitch displacement when moving or phasing
            const jitter = (char.phasingTimer > 0 || (char.vel && char.vel.length() > 5 && Math.random() < 0.2)) 
                ? (Math.random() > 0.5 ? 1 : -1) : 0;
            const csx = sx + jitter;

            if (facing === 'DOWN') {
                // Boots
                ctx.fillStyle = '#10002b';
                ctx.fillRect(csx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(csx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Cyber-Trench Coat
                ctx.fillStyle = coatLight;
                ctx.fillRect(csx - 4, sy - 7 + bob, 8, 11);
                ctx.fillStyle = glitchMagenta;
                ctx.fillRect(csx - 1, sy - 6 + bob, 2, 9); // Central glitch seam
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx - 3, sy - 5 + bob, 1, 3); // Reality static

                // Temporal Hood & Face
                ctx.fillStyle = coatDark;
                ctx.fillRect(csx - 4, sy - 13 + bob, 8, 7);
                ctx.fillStyle = skinColor;
                ctx.fillRect(csx - 2, sy - 11 + bob, 4, 3);
                // Glowing cyan chrono-visor
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx - 2, sy - 10 + bob, 4, 1);

                // Tuning Blade (Right Hand)
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx + 5, sy - 12 + bob, 2, 16);
                ctx.fillStyle = bladeColor;
                ctx.fillRect(csx + 4, sy - 15 + bob, 4, 4);

            } else if (facing === 'UP') {
                // Boots
                ctx.fillStyle = '#10002b';
                ctx.fillRect(csx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(csx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Coat Back with Tachyon Spine line
                ctx.fillStyle = coatLight;
                ctx.fillRect(csx - 4, sy - 7 + bob, 8, 11);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx - 1, sy - 6 + bob, 2, 8);
                ctx.fillStyle = glitchMagenta;
                ctx.fillRect(csx - 3, sy - 3 + bob, 1, 2);

                // Hood back
                ctx.fillStyle = coatDark;
                ctx.fillRect(csx - 4, sy - 13 + bob, 8, 7);
                ctx.fillRect(csx - 1, sy - 14 + bob, 2, 2);

                // Tuning blade raised
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx + 5, sy - 14 + bob, 2, 17);
                ctx.fillStyle = bladeColor;
                ctx.fillRect(csx + 4, sy - 16 + bob, 4, 3);

            } else if (facing === 'LEFT') {
                ctx.fillStyle = '#10002b';
                ctx.fillRect(csx - 3 - (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(csx + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);

                ctx.fillStyle = coatLight;
                ctx.fillRect(csx - 4, sy - 7 + bob, 7, 11);
                ctx.fillStyle = glitchMagenta;
                ctx.fillRect(csx - 2, sy - 4 + bob, 1, 5);

                ctx.fillStyle = coatDark;
                ctx.fillRect(csx - 4, sy - 13 + bob, 7, 7);
                ctx.fillStyle = skinColor;
                ctx.fillRect(csx - 4, sy - 11 + bob, 2, 3);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx - 4, sy - 10 + bob, 2, 1);

                // Blade pointed left
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx - 7, sy - 10 + bob, 2, 14);
                ctx.fillStyle = bladeColor;
                ctx.fillRect(csx - 9, sy - 13 + bob, 4, 3);

            } else if (facing === 'RIGHT') {
                ctx.fillStyle = '#10002b';
                ctx.fillRect(csx - (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(csx + 2 + (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);

                ctx.fillStyle = coatLight;
                ctx.fillRect(csx - 3, sy - 7 + bob, 7, 11);
                ctx.fillStyle = glitchMagenta;
                ctx.fillRect(csx + 1, sy - 4 + bob, 1, 5);

                ctx.fillStyle = coatDark;
                ctx.fillRect(csx - 3, sy - 13 + bob, 7, 7);
                ctx.fillStyle = skinColor;
                ctx.fillRect(csx + 2, sy - 11 + bob, 2, 3);
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx + 2, sy - 10 + bob, 2, 1);

                // Blade pointed right
                ctx.fillStyle = cyanAccent;
                ctx.fillRect(csx + 5, sy - 10 + bob, 2, 14);
                ctx.fillStyle = bladeColor;
                ctx.fillRect(csx + 5, sy - 13 + bob, 4, 3);
            }

        // 5. SOLARION-ARCHITECT (Hard-Light Photon Engineer)
        } else if (char.charClass === 'SOLARION_ARCHITECT') {
            const goldBronze = '#d97706';
            const solarAmber = '#f59e0b';
            const solarOrange = '#ff6f00';
            const photonCyan = '#38bdf8';
            const chassisWhite = '#ffffff';

            if (facing === 'DOWN') {
                // Boots
                ctx.fillStyle = '#78350f';
                ctx.fillRect(sx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Solar Armor Cuirass
                ctx.fillStyle = goldBronze;
                ctx.fillRect(sx - 4, sy - 7 + bob, 8, 11);
                // Hard-Light Photon Core in center
                ctx.fillStyle = photonCyan;
                ctx.fillRect(sx - 1, sy - 5 + bob, 2, 3);
                ctx.fillStyle = solarOrange;
                ctx.fillRect(sx - 5, sy - 6 + bob, 2, 5); // Pauldron L
                ctx.fillRect(sx + 3, sy - 6 + bob, 2, 5); // Pauldron R

                // Solar Helm & Optics
                ctx.fillStyle = solarAmber;
                ctx.fillRect(sx - 4, sy - 13 + bob, 8, 7);
                ctx.fillStyle = chassisWhite;
                ctx.fillRect(sx - 2, sy - 10 + bob, 4, 2); // Visor
                ctx.fillStyle = solarOrange;
                ctx.fillRect(sx - 1, sy - 15 + bob, 2, 3); // Solar Crest

                // Hard-light wand / prism emitter
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(sx + 5, sy - 12 + bob, 2, 16);
                ctx.fillStyle = photonCyan;
                ctx.fillRect(sx + 4, sy - 15 + bob, 4, 4);

            } else if (facing === 'UP') {
                ctx.fillStyle = '#78350f';
                ctx.fillRect(sx - 3 + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 1 + (walkCycle === 1 ? -1 : 0), sy + 4, 3, 2);

                // Cuirass back with solar radiators
                ctx.fillStyle = goldBronze;
                ctx.fillRect(sx - 4, sy - 7 + bob, 8, 11);
                ctx.fillStyle = solarOrange;
                ctx.fillRect(sx - 2, sy - 6 + bob, 4, 8); // Radiator vent
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 1, sy - 4 + bob, 2, 4);

                // Helm back
                ctx.fillStyle = solarAmber;
                ctx.fillRect(sx - 4, sy - 13 + bob, 8, 7);
                ctx.fillStyle = solarOrange;
                ctx.fillRect(sx - 1, sy - 15 + bob, 2, 3);

                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(sx + 5, sy - 13 + bob, 2, 16);
                ctx.fillStyle = photonCyan;
                ctx.fillRect(sx + 4, sy - 15 + bob, 4, 3);

            } else if (facing === 'LEFT') {
                ctx.fillStyle = '#78350f';
                ctx.fillRect(sx - 3 - (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);

                ctx.fillStyle = goldBronze;
                ctx.fillRect(sx - 4, sy - 7 + bob, 7, 11);
                ctx.fillStyle = solarOrange;
                ctx.fillRect(sx - 3, sy - 6 + bob, 3, 5);

                ctx.fillStyle = solarAmber;
                ctx.fillRect(sx - 4, sy - 13 + bob, 7, 7);
                ctx.fillStyle = chassisWhite;
                ctx.fillRect(sx - 4, sy - 10 + bob, 3, 2);

                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(sx - 7, sy - 10 + bob, 2, 14);
                ctx.fillStyle = photonCyan;
                ctx.fillRect(sx - 8, sy - 13 + bob, 4, 4);

            } else if (facing === 'RIGHT') {
                ctx.fillStyle = '#78350f';
                ctx.fillRect(sx - (walkCycle === 0 ? 1 : 0), sy + 4, 3, 2);
                ctx.fillRect(sx + 2 + (walkCycle === 1 ? 1 : 0), sy + 4, 3, 2);

                ctx.fillStyle = goldBronze;
                ctx.fillRect(sx - 3, sy - 7 + bob, 7, 11);
                ctx.fillStyle = solarOrange;
                ctx.fillRect(sx, sy - 6 + bob, 3, 5);

                ctx.fillStyle = solarAmber;
                ctx.fillRect(sx - 3, sy - 13 + bob, 7, 7);
                ctx.fillStyle = chassisWhite;
                ctx.fillRect(sx + 1, sy - 10 + bob, 3, 2);

                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(sx + 5, sy - 10 + bob, 2, 14);
                ctx.fillStyle = photonCyan;
                ctx.fillRect(sx + 4, sy - 13 + bob, 4, 4);
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
                ctx.fillStyle = (tr.charClass === 'SUPER_SOLDIER' ? '#ff6d00' : (tr.charClass === 'TECHNO_MAGE' ? '#00e5ff' : (tr.charClass === 'FARMER_GOD' ? '#76ff03' : (tr.charClass === 'CHRONO_GLITCHER' ? '#e040fb' : '#ffd700'))));
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
            } else if (sw.type === 'WARRIOR_WHIRLWIND') {
                ctx.save();
                ctx.translate(sx, sy);
                const rot = progress * Math.PI * 4;
                ctx.rotate(rot);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, sw.range, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = '#ff3d00';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(0, 0, sw.range - 4, 0, Math.PI * 1.6);
                ctx.stroke();

                ctx.strokeStyle = '#ffd54f';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, sw.range * 0.65, Math.PI * 0.5, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (sw.type === 'GAIA_CATACLYSM') {
                ctx.save();
                ctx.translate(sx, sy);
                ctx.strokeStyle = '#76ff03';
                ctx.lineWidth = 4;
                for (let r = 0; r < 6; r++) {
                    const ang = (r * Math.PI) / 3;
                    const rLen = sw.range * (0.6 + 0.4 * progress);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(ang) * rLen, Math.sin(ang) * rLen);
                    ctx.stroke();
                }
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(0, 0, 16 * progress, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Active Singularity Vortices
        if (char.activeVortices && char.activeVortices.length > 0) {
            for (const v of char.activeVortices) {
                const vx = Math.round(v.x) - camX;
                const vy = Math.round(v.y) - camY;
                const vPulse = 1.0 + 0.25 * Math.sin(Date.now() * 0.01);
                // Outer gravity swirl
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(vx, vy, 24 * vPulse, 0, Math.PI * 2);
                ctx.stroke();
                // Inner dark hole
                ctx.fillStyle = '#0a001a';
                ctx.beginPath();
                ctx.arc(vx, vy, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#e040fb';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(vx, vy, 8, 0, Math.PI * 2);
                ctx.stroke();
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

    renderPortals(portals, camX, camY) {
        if (!portals) return;
        const ctx = this.ctx;
        for (const p of portals) {
            const sx = Math.round(p.x) - camX;
            const sy = Math.round(p.y) - camY;
            if (sx < -40 || sx > this.width + 40 || sy < -40 || sy > this.height + 40) continue;

            // Portal aura ring
            const pulse = (Math.sin(this.waterAnimTimer * 4.0) + 1.0) * 0.5;
            ctx.fillStyle = `rgba(0, 229, 255, ${0.15 + pulse * 0.25})`;
            ctx.beginPath();
            ctx.ellipse(sx, sy + 4, 12 + pulse * 4, 6 + pulse * 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Label signpost banner
            ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
            ctx.fillRect(sx - 34, sy - 20, 68, 10);
            ctx.fillStyle = '#ffd54f';
            ctx.font = 'bold 6px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, sx, sy - 13);
        }
    }

    renderNpcs(npcs, camX, camY, playerPos) {
        if (!npcs) return;
        const ctx = this.ctx;
        for (const npc of npcs) {
            const sx = Math.round(npc.x) - camX;
            const sy = Math.round(npc.y) - camY;
            if (sx < -30 || sx > this.width + 30 || sy < -30 || sy > this.height + 30) continue;

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 6, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            const facing = npc.facing || 'down';

            // Distinct GBA Pixel Art Sprites for each NPC
            if (npc.id === 'ARCHIVIST_UNIT_7') {
                // Floating Automaton Drone Cube with glowing eye
                const floatBob = Math.sin(this.waterAnimTimer * 3.5) * 2;
                ctx.fillStyle = '#1e272e';
                ctx.fillRect(sx - 6, sy - 10 + floatBob, 12, 12);
                ctx.fillStyle = '#00cec9';
                ctx.fillRect(sx - 5, sy - 9 + floatBob, 10, 10);
                // Glowing cyan eye
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 2, sy - 6 + floatBob, 4, 4);
                ctx.fillStyle = '#0984e3';
                ctx.fillRect(sx - 1, sy - 5 + floatBob, 2, 2);
                // Orbiting nanite ring
                ctx.strokeStyle = 'rgba(0, 206, 201, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(sx, sy - 4 + floatBob, 9, 3, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // Humanoid NPC (Elder, Smith, Herbalist, Scavenger, Ranger, Hermit)
                // Boots
                ctx.fillStyle = '#2d3436';
                ctx.fillRect(sx - 3, sy + 3, 3, 3);
                ctx.fillRect(sx + 1, sy + 3, 3, 3);

                // Torso / Robe / Clothing
                ctx.fillStyle = npc.spriteColor || '#6c5ce7';
                ctx.fillRect(sx - 4, sy - 4, 9, 8);

                // Accessories
                if (npc.id === 'BLACKSMITH_THORNE') {
                    // Leather Apron
                    ctx.fillStyle = '#636e72';
                    ctx.fillRect(sx - 3, sy - 2, 7, 6);
                    // Hammer in hand
                    ctx.fillStyle = '#b2bec3';
                    ctx.fillRect(sx + 5, sy - 4, 3, 3);
                    ctx.fillStyle = '#6d4c41';
                    ctx.fillRect(sx + 6, sy - 1, 1, 6);
                } else if (npc.id === 'ELDER_OAKHAVEN') {
                    // Robe Trim
                    ctx.fillStyle = '#ffd700';
                    ctx.fillRect(sx - 1, sy - 4, 3, 8);
                    // Staff
                    ctx.fillStyle = '#795548';
                    ctx.fillRect(sx + 5, sy - 10, 2, 16);
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillRect(sx + 4, sy - 12, 4, 3);
                } else if (npc.id === 'HERBALIST_MAEVE') {
                    // Flower basket
                    ctx.fillStyle = '#e17055';
                    ctx.fillRect(sx + 5, sy, 4, 4);
                    ctx.fillStyle = '#55efc4';
                    ctx.fillRect(sx + 5, sy - 1, 4, 2);
                }

                // Head
                ctx.fillStyle = '#ffeaa7'; // Skin tone
                ctx.fillRect(sx - 3, sy - 9, 7, 6);

                // Hair / Beard / Hat
                ctx.fillStyle = npc.hairColor || '#dfe6e9';
                if (npc.id === 'ELDER_OAKHAVEN') {
                    ctx.fillRect(sx - 4, sy - 11, 9, 3);
                    ctx.fillRect(sx - 4, sy - 9, 2, 8);
                    ctx.fillRect(sx + 3, sy - 9, 2, 8);
                    ctx.fillRect(sx - 2, sy - 4, 5, 5); // Beard
                } else if (npc.id === 'WANDERER_LYRA') {
                    ctx.fillRect(sx - 4, sy - 11, 9, 4);
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(sx - 3, sy - 13, 2, 3);
                } else {
                    ctx.fillRect(sx - 4, sy - 11, 9, 3);
                }

                // Eyes based on facing
                ctx.fillStyle = '#2d3436';
                if (facing === 'down') {
                    ctx.fillRect(sx - 2, sy - 7, 2, 2);
                    ctx.fillRect(sx + 1, sy - 7, 2, 2);
                } else if (facing === 'left') {
                    ctx.fillRect(sx - 3, sy - 7, 2, 2);
                } else if (facing === 'right') {
                    ctx.fillRect(sx + 2, sy - 7, 2, 2);
                }
            }

            // Proximity Talk Prompt & Nameplate
            if (playerPos) {
                const dist = Math.hypot(playerPos.x - npc.x, playerPos.y - npc.y);
                if (dist <= 38) {
                    const bob = Math.sin(this.waterAnimTimer * 5.0) * 2;
                    ctx.fillStyle = '#f5cd79';
                    ctx.fillRect(sx - 12, sy - 24 + bob, 24, 9);
                    ctx.fillStyle = '#080c12';
                    ctx.font = 'bold 7px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('💬 TALK', sx, sy - 17 + bob);

                    // Nameplate banner
                    ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
                    ctx.fillRect(sx - 30, sy - 35 + bob, 60, 10);
                    ctx.fillStyle = '#00e5ff';
                    ctx.font = 'bold 6px monospace';
                    ctx.fillText(npc.name, sx, sy - 27 + bob);
                }
            }
        }
    }

    addFloatingText(text, x, y, color = '#ffd54f') {
        this.floatingTexts.push({
            text,
            x,
            y,
            color,
            vy: -24,
            life: 1.2,
            maxLife: 1.2
        });
    }

    renderFloatingTexts(camX, camY, dt) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.y += ft.vy * dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }

            const alpha = Math.min(1.0, ft.life / (ft.maxLife * 0.4));
            const sx = Math.round(ft.x - camX);
            const sy = Math.round(ft.y - camY);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#000000';
            ctx.fillText(ft.text, sx + 1, sy + 1);
            ctx.fillText(ft.text, sx - 1, sy + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, sx, sy);
        }

        ctx.restore();
    }

    renderGroundResourceNodes(nodes, camX, camY, dt) {
        const ctx = this.ctx;
        for (const node of nodes) {
            let sx = Math.round(node.x) - camX;
            let sy = Math.round(node.y) - camY;

            if (sx < -40 || sx > this.width + 40 || sy < -40 || sy > this.height + 40) continue;

            if (node.shakeTimer > 0) {
                node.shakeTimer -= dt;
                sx += Math.floor(Math.sin(node.shakeTimer * 50) * 3);
            }

            // If harvested/depleted: draw ground stump or broken rubble
            if (node.hp <= 0) {
                if (node.type === 'PINE_TREE') {
                    // Clean ground-level stump (5px high, walkable behind)
                    ctx.fillStyle = '#3e2723';
                    ctx.fillRect(sx - 4, sy + 2, 8, 5);
                    ctx.fillStyle = '#8d6e63';
                    ctx.fillRect(sx - 3, sy + 2, 6, 2);
                    ctx.fillStyle = '#4e342e';
                    ctx.fillRect(sx - 1, sy + 2, 2, 1);
                } else if (node.type === 'FLINT_BOULDER' || node.type === 'COPPER_VEIN' || node.type === 'SUNSTONE_NODE') {
                    ctx.fillStyle = '#455a64';
                    ctx.fillRect(sx - 5, sy + 4, 10, 3);
                    ctx.fillStyle = '#80deea';
                    ctx.fillRect(sx - 2, sy + 3, 2, 2);
                } else if (node.type === 'AETHER_CRYSTAL' || node.type === 'STAR_CRYSTAL') {
                    ctx.fillStyle = '#311b92';
                    ctx.fillRect(sx - 4, sy + 4, 8, 3);
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillRect(sx - 2, sy + 3, 2, 2);
                }
                continue;
            }

            // Ground flora (non-occluding)
            switch (node.type) {
                case 'WILD_CABBAGE': {
                    ctx.fillStyle = '#2e7d32';
                    ctx.fillRect(sx - 6, sy - 2, 12, 6);
                    ctx.fillRect(sx - 4, sy - 4, 8, 2);
                    ctx.fillStyle = '#66bb6a';
                    ctx.fillRect(sx - 3, sy - 3, 6, 5);
                    ctx.fillStyle = '#c8e6c9';
                    ctx.fillRect(sx - 1, sy - 2, 3, 3);
                    break;
                }

                case 'BERRY_BUSH': {
                    ctx.fillStyle = '#1b5e20';
                    ctx.fillRect(sx - 6, sy - 5, 12, 10);
                    ctx.fillStyle = '#2e7d32';
                    ctx.fillRect(sx - 5, sy - 4, 10, 8);
                    ctx.fillStyle = '#d50000';
                    ctx.fillRect(sx - 4, sy - 3, 2, 2);
                    ctx.fillRect(sx + 2, sy - 2, 2, 2);
                    ctx.fillRect(sx - 1, sy + 1, 2, 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx - 4, sy - 3, 1, 1);
                    break;
                }

                case 'MEDICINAL_HERB': {
                    ctx.fillStyle = '#388e3c';
                    ctx.fillRect(sx - 1, sy - 3, 2, 7);
                    ctx.fillRect(sx - 3, sy - 1, 3, 2);
                    ctx.fillRect(sx + 1, sy, 3, 2);
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillRect(sx - 2, sy - 6, 4, 3);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx - 1, sy - 5, 2, 1);
                    break;
                }

                case 'CAMPFIRE_SITE': {
                    ctx.fillStyle = '#37474f';
                    ctx.beginPath();
                    ctx.ellipse(sx, sy + 3, 10, 5, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#212121';
                    ctx.fillRect(sx - 5, sy, 10, 3);
                    ctx.fillStyle = '#4e342e';
                    ctx.fillRect(sx - 4, sy - 1, 8, 2);

                    const fTick = Math.floor(Date.now() / 100) % 3;
                    const fHeight = (fTick === 0 ? 8 : (fTick === 1 ? 11 : 9));
                    ctx.fillStyle = '#d50000';
                    ctx.fillRect(sx - 3, sy - fHeight, 6, fHeight);
                    ctx.fillStyle = '#ff9800';
                    ctx.fillRect(sx - 2, sy - fHeight + 2, 4, fHeight - 2);
                    ctx.fillStyle = '#ffd54f';
                    ctx.fillRect(sx - 1, sy - fHeight + 4, 2, fHeight - 4);
                    break;
                }
            }
        }
    }

    renderSingleStandingNode(node, camX, camY, dt, player) {
        const ctx = this.ctx;
        let sx = Math.round(node.x) - camX;
        let sy = Math.round(node.y) - camY;

        if (sx < -40 || sx > this.width + 40 || sy < -40 || sy > this.height + 40) return;

        if (node.shakeTimer > 0) {
            sx += Math.floor(Math.sin(node.shakeTimer * 50) * 3);
        }

        switch (node.type) {
            case 'PINE_TREE': {
                // Ground shadow at trunk base
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + 7, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Trunk
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx - 3, sy - 2, 6, 9);
                ctx.fillStyle = '#2e1c14';
                ctx.fillRect(sx - 3, sy - 2, 2, 9);

                // Check if player is standing behind this tree canopy
                const isBehindCanopy = player && (Math.abs(player.pos.x - node.x) < 16 && player.pos.y < node.y && player.pos.y > node.y - 36);
                if (isBehindCanopy) {
                    ctx.save();
                    ctx.globalAlpha = 0.65; // Translucent so player is fully visible behind tree!
                }

                // Multi-tiered layered conifer canopy
                ctx.fillStyle = '#1b4332';
                ctx.beginPath();
                ctx.moveTo(sx, sy - 18);
                ctx.lineTo(sx + 13, sy - 3);
                ctx.lineTo(sx - 13, sy - 3);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#2d6a4f';
                ctx.beginPath();
                ctx.moveTo(sx, sy - 25);
                ctx.lineTo(sx + 10, sy - 11);
                ctx.lineTo(sx - 10, sy - 11);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#40916c';
                ctx.beginPath();
                ctx.moveTo(sx, sy - 32);
                ctx.lineTo(sx + 7, sy - 19);
                ctx.lineTo(sx - 7, sy - 19);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#74c69d';
                ctx.fillRect(sx - 1, sy - 32, 2, 3);
                ctx.fillRect(sx + 2, sy - 22, 3, 2);
                ctx.fillRect(sx - 4, sy - 14, 3, 2);

                if (isBehindCanopy) {
                    ctx.restore();
                }
                break;
            }

            case 'FLINT_BOULDER': {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + 5, 9, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#263238';
                ctx.fillRect(sx - 7, sy - 6, 14, 11);
                ctx.fillStyle = '#455a64';
                ctx.fillRect(sx - 6, sy - 5, 12, 9);
                ctx.fillStyle = '#607d8b';
                ctx.fillRect(sx - 4, sy - 5, 7, 5);

                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 2, sy - 3, 3, 3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 1, sy - 2, 2, 2);
                break;
            }

            case 'COPPER_VEIN': {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + 5, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx - 6, sy - 5, 12, 10);
                ctx.fillStyle = '#b87333';
                ctx.fillRect(sx - 5, sy - 4, 10, 8);
                ctx.fillStyle = '#d7894a';
                ctx.fillRect(sx - 3, sy - 3, 6, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 1, sy - 2, 2, 2);
                break;
            }

            case 'AETHER_CRYSTAL': {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + 6, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#006064';
                ctx.fillRect(sx - 5, sy - 9, 10, 13);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 4, sy - 8, 8, 10);
                ctx.fillStyle = '#84ffff';
                ctx.fillRect(sx - 2, sy - 6, 4, 6);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 1, sy - 4, 2, 2);
                break;
            }

            case 'SUNSTONE_NODE': {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + 6, 9, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#e65100';
                ctx.fillRect(sx - 6, sy - 8, 12, 12);
                ctx.fillStyle = '#ff9800';
                ctx.fillRect(sx - 5, sy - 7, 10, 10);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 3, sy - 5, 6, 6);
                ctx.fillStyle = '#fff9c4';
                ctx.fillRect(sx - 1, sy - 3, 2, 2);
                break;
            }

            case 'STAR_CRYSTAL': {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + 6, 9, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#311b92';
                ctx.fillRect(sx - 6, sy - 10, 12, 14);
                ctx.fillStyle = '#7c4dff';
                ctx.fillRect(sx - 5, sy - 9, 10, 11);
                ctx.fillStyle = '#b388ff';
                ctx.fillRect(sx - 3, sy - 7, 6, 7);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 1, sy - 5, 2, 3);
                break;
            }

            case 'RUNIC_TOTEM': {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                ctx.ellipse(sx, sy + 10, 12, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#1a222e';
                ctx.fillRect(sx - 8, sy - 34, 16, 42);
                ctx.fillStyle = '#2c3a4e';
                ctx.fillRect(sx - 7, sy - 33, 14, 40);

                ctx.fillStyle = '#131b26';
                ctx.fillRect(sx - 7, sy - 20, 14, 2);
                ctx.fillRect(sx - 7, sy - 7, 14, 2);

                const runeAlpha = 0.5 + 0.45 * Math.sin(Date.now() / 250);
                ctx.fillStyle = `rgba(0, 229, 255, ${runeAlpha})`;
                ctx.fillRect(sx - 3, sy - 28, 6, 2);
                ctx.fillRect(sx - 1, sy - 26, 2, 4);
                ctx.fillRect(sx - 3, sy - 15, 6, 2);
                ctx.fillRect(sx, sy - 13, 2, 3);
                ctx.fillRect(sx - 2, sy - 2, 4, 3);
                break;
            }

            case 'POWER_CONDUIT': {
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx - 6, sy - 4, 12, 8);
                ctx.fillStyle = '#ff9800';
                ctx.fillRect(sx - 5, sy - 2, 10, 4);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 5, sy - 1, 10, 2);
                break;
            }

            case 'GLOWING_CRYSTAL': {
                ctx.fillStyle = '#4a148c';
                ctx.fillRect(sx - 5, sy - 8, 10, 12);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx - 3, sy - 7, 6, 8);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 1, sy - 6, 2, 4);
                break;
            }
        }
    }

    renderResourceNodes(nodes, camX, camY, dt) {
        this.renderGroundResourceNodes(nodes, camX, camY, dt);
        for (const node of nodes) {
            if (node.hp > 0 && node.type !== 'WILD_CABBAGE' && node.type !== 'BERRY_BUSH' && node.type !== 'MEDICINAL_HERB' && node.type !== 'CAMPFIRE_SITE') {
                this.renderSingleStandingNode(node, camX, camY, dt, null);
            }
        }
    }

    renderSingleEnemy(enemy, pal, camX, camY) {
        if (!enemy || enemy.hp <= 0) return;
        const ctx = this.ctx;
        const sx = Math.round(enemy.x) - camX;
        const sy = Math.round(enemy.y) - camY;

        if (sx < -40 || sx > this.width + 40 || sy < -40 || sy > this.height + 40) return;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 5, enemy.isBoss ? 14 : 6, enemy.isBoss ? 6 : 3, 0, 0, Math.PI * 2);
        ctx.fill();

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
            // Small Nanite Prowler / Scorpions / Wyverns
            ctx.fillStyle = pal[1];
            ctx.fillRect(sx - 6, sy - 6, 12, 10);
            ctx.fillStyle = '#ff5252';
            ctx.fillRect(sx - 3, sy - 4, 3, 3);
            ctx.fillRect(sx + 1, sy - 4, 3, 3);
        }
    }

    renderSinglePrism(prism, camX, camY, dt) {
        const ctx = this.ctx;
        const sx = Math.round(prism.x) - camX;
        const sy = Math.round(prism.y) - camY;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 4, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Floating geometric prism core
        const floatBob = Math.sin(Date.now() / 150) * 2;
        ctx.save();
        ctx.translate(sx, sy - 6 + floatBob);
        ctx.rotate(Date.now() / 400);

        // Diamond prism
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 4);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();

        // Laser beam if firing
        if (prism.beamTarget) {
            const tx = Math.round(prism.beamTarget.x) - camX;
            const ty = Math.round(prism.beamTarget.y) - camY;
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy - 6 + floatBob);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy - 6 + floatBob);
            ctx.lineTo(tx, ty);
            ctx.stroke();
        }
    }

    renderSingleDecoy(decoy, camX, camY, dt) {
        const ctx = this.ctx;
        const sx = Math.round(decoy.x) - camX;
        const sy = Math.round(decoy.y) - camY;

        ctx.save();
        ctx.globalAlpha = 0.55 + 0.3 * Math.sin(Date.now() / 80);
        const jx = Math.random() > 0.5 ? 1 : -1;
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(sx - 4 + jx, sy - 13, 8, 18);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(sx - 4 - jx, sy - 13, 8, 18);
        ctx.restore();
    }

    renderEntitiesYSorted(map, player, enemies, npcs, critters, dt, isNight) {
        const camX = Math.round(this.camera.x);
        const camY = Math.round(this.camera.y);
        const renderList = [];

        // 1. Standing Resource Nodes (living trees, boulders, totems, crystals)
        if (map && map.resourceNodes) {
            for (const node of map.resourceNodes) {
                if (node.hp <= 0) continue; // Harvested stumps are drawn during ground pass!
                if (node.type === 'WILD_CABBAGE' || node.type === 'BERRY_BUSH' || node.type === 'MEDICINAL_HERB' || node.type === 'CAMPFIRE_SITE') continue;
                renderList.push({
                    type: 'NODE',
                    y: node.y + 4,
                    ref: node
                });
            }
        }

        // 2. Player
        if (player) {
            renderList.push({
                type: 'PLAYER',
                y: player.pos.y + 6,
                ref: player
            });

            // Active Class Summons
            if (player.activePrisms && player.activePrisms.length > 0) {
                for (const prism of player.activePrisms) {
                    renderList.push({
                        type: 'PRISM',
                        y: prism.y + 4,
                        ref: prism
                    });
                }
            }
            if (player.activeDecoy) {
                renderList.push({
                    type: 'DECOY',
                    y: player.activeDecoy.y + 6,
                    ref: player.activeDecoy
                });
            }
        }

        // 3. Enemies
        if (enemies && enemies.length > 0) {
            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                renderList.push({
                    type: 'ENEMY',
                    y: enemy.y + (enemy.isBoss ? 8 : 5),
                    ref: enemy
                });
            }
        }

        // 4. NPCs
        if (npcs && npcs.length > 0) {
            for (const npc of npcs) {
                renderList.push({
                    type: 'NPC',
                    y: npc.y + 6,
                    ref: npc
                });
            }
        }

        // 5. Critters
        if (critters && critters.critters && critters.critters.length > 0) {
            for (const c of critters.critters) {
                renderList.push({
                    type: 'CRITTER',
                    y: c.y + 2,
                    ref: c
                });
            }
        }

        // Unified Y-sorting: entities with smaller Y (higher on screen) draw FIRST
        renderList.sort((a, b) => a.y - b.y);

        // Render sorted entities in precise depth order
        for (const item of renderList) {
            if (item.type === 'PLAYER') {
                this.renderCharacter(player, map.palette.colors);
            } else if (item.type === 'NODE') {
                this.renderSingleStandingNode(item.ref, camX, camY, dt, player);
            } else if (item.type === 'ENEMY') {
                this.renderSingleEnemy(item.ref, map.palette.colors, camX, camY);
            } else if (item.type === 'NPC') {
                this.renderNpcs([item.ref], camX, camY, player.pos);
            } else if (item.type === 'CRITTER') {
                if (critters.renderSingle) {
                    critters.renderSingle(this.ctx, item.ref, camX, camY, isNight);
                }
            } else if (item.type === 'PRISM') {
                this.renderSinglePrism(item.ref, camX, camY, dt);
            } else if (item.type === 'DECOY') {
                this.renderSingleDecoy(item.ref, camX, camY, dt);
            }
        }
    }

    computeLightingDarkness(dayProgress, map = null) {
        const isSubCore = map && map.layer === 'SUB_CORE';
        if (isSubCore) return 0.80;
        if (map && map.areaId === 'SUNKEN_GROTTO') return 0.78;
        if (dayProgress >= 0.32 && dayProgress <= 0.68) return 0.0;
        if (dayProgress > 0.68 && dayProgress < 0.80) {
            const factor = (dayProgress - 0.68) / 0.12;
            return factor * 0.88;
        }
        if (dayProgress >= 0.80 || dayProgress < 0.20) return 0.88;
        if (dayProgress >= 0.20 && dayProgress < 0.32) {
            const factor = 1.0 - (dayProgress - 0.20) / 0.12;
            return factor * 0.88;
        }
        return 0.0;
    }

    renderLighting(dayProgress, player, camX, camY, map) {
        const ctx = this.ctx;
        const isSubCore = map && map.layer === 'SUB_CORE';

        let darkness = this.computeLightingDarkness(dayProgress, map);
        let ambientColor = 'rgba(4, 7, 18, 0.88)';

        if (isSubCore) {
            ambientColor = 'rgba(7, 5, 16, 0.82)';
        } else if (map && map.areaId === 'SUNKEN_GROTTO') {
            ambientColor = 'rgba(5, 10, 22, 0.78)';
        } else {
            if (dayProgress >= 0.32 && dayProgress <= 0.68) {
                ambientColor = 'rgba(0, 0, 0, 0)';
            } else if (dayProgress > 0.68 && dayProgress < 0.80) {
                ambientColor = `rgba(22, 14, 26, ${darkness})`;
            } else if (dayProgress >= 0.80 || dayProgress < 0.20) {
                ambientColor = 'rgba(4, 7, 18, 0.88)';
            } else if (dayProgress >= 0.20 && dayProgress < 0.32) {
                ambientColor = `rgba(18, 14, 30, ${darkness})`;
            }
        }

        if (darkness <= 0.05) return;

        // Use offscreen light canvas so destination-out doesn't clear the game world canvas
        if (!this.lightCanvas && typeof document !== 'undefined') {
            this.lightCanvas = document.createElement('canvas');
            this.lightCtx = this.lightCanvas.getContext('2d');
        }
        if (!this.lightCanvas) return;

        if (this.lightCanvas.width !== this.width || this.lightCanvas.height !== this.height) {
            this.lightCanvas.width = this.width;
            this.lightCanvas.height = this.height;
        }

        const lCtx = this.lightCtx;
        lCtx.clearRect(0, 0, this.width, this.height);
        lCtx.globalCompositeOperation = 'source-over';
        lCtx.fillStyle = ambientColor;
        lCtx.fillRect(0, 0, this.width, this.height);

        lCtx.globalCompositeOperation = 'destination-out';

        const px = Math.round(player.pos.x) - camX;
        const py = Math.round(player.pos.y) - camY;

        const hasTorch = player.hasTorchActive;
        const baseRadius = hasTorch ? 135 : 55;
        const flicker = Math.sin(Date.now() / 80) * 3;
        const pRadius = baseRadius + flicker;

        const grad = lCtx.createRadialGradient(px, py, 10, px, py, pRadius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.75)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        lCtx.fillStyle = grad;
        lCtx.beginPath();
        lCtx.arc(px, py, pRadius, 0, Math.PI * 2);
        lCtx.fill();

        if (map && map.resourceNodes) {
            for (const node of map.resourceNodes) {
                if (node.type === 'CAMPFIRE' || node.type === 'CAMPFIRE_SITE' || node.type === 'RUNIC_TOTEM' || node.type === 'GLOWING_CRYSTAL') {
                    const nx = Math.round(node.x) - camX;
                    const ny = Math.round(node.y) - camY;
                    if (nx < -80 || nx > this.width + 80 || ny < -80 || ny > this.height + 80) continue;

                    const rad = (node.type === 'CAMPFIRE' || node.type === 'CAMPFIRE_SITE' ? 75 : 50) + Math.sin(Date.now() / 110 + nx) * 3;
                    const cGrad = lCtx.createRadialGradient(nx, ny, 8, nx, ny, rad);
                    cGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
                    cGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.7)');
                    cGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
                    lCtx.fillStyle = cGrad;
                    lCtx.beginPath();
                    lCtx.arc(nx, ny, rad, 0, Math.PI * 2);
                    lCtx.fill();
                }
            }
        }

        lCtx.globalCompositeOperation = 'source-over';

        // Stamp darkness mask onto main game canvas
        ctx.drawImage(this.lightCanvas, 0, 0);

        if (hasTorch && darkness > 0.4) {
            ctx.save();
            const glowGrad = ctx.createRadialGradient(px, py, 5, px, py, pRadius * 0.85);
            glowGrad.addColorStop(0, 'rgba(255, 160, 40, 0.18)');
            glowGrad.addColorStop(0.7, 'rgba(255, 120, 20, 0.08)');
            glowGrad.addColorStop(1, 'rgba(255, 100, 0, 0.0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(px, py, pRadius * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderTitleBackdrop(dt) {
        this.titleAnimTimer = (this.titleAnimTimer || 0) + (dt || 0.016);
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // 1. Unified Dyson Luminary Celestial Engine (Sun & Moon as One)
        // ~80-second continuous celestial revolution through Dyson sphere aperture states (~20s per phase)
        const cycle = ((this.titleAnimTimer || 0) * 0.0125) % 1.0;
        
        let lumX = w - 55;
        let lumY = 48;
        let lumRadius = 20;

        // 4 Celestial Keyframes for continuous smooth cosine interpolation:
        // Stage 1: ECLIPSE // SHUTTERS ENGAGED and WAXING CRESCENT // LUNAR APERTURE
        // Stage 2: SOLAR DAWN // APERTURE VENTING
        // Stage 3: SOLAR ZENITH // THERMAL MAXIMUM
        // Stage 4: RED GIANT // CORONAL SHIELDING
        const KEYFRAMES = [
            // 0: Eclipse / Waxing Crescent (Lunar Mode)
            { top: [2, 5, 14], mid: [9, 17, 34], bot: [20, 32, 54], mtn: [10, 16, 29], star: 0.95, rim: [0, 229, 255, 0.25], ring: [0, 229, 255, 0.22] },
            // 1: Solar Dawn & Corona Awakening (Transition Mode)
            { top: [18, 13, 32], mid: [38, 22, 42], bot: [60, 32, 42], mtn: [20, 20, 36], star: 0.55, rim: [255, 170, 0, 0.35], ring: [255, 183, 77, 0.24] },
            // 2: Radiant Solar Zenith (Sun Mode)
            { top: [15, 35, 58], mid: [28, 54, 82], bot: [45, 75, 104], mtn: [26, 34, 48], star: 0.12, rim: [255, 213, 79, 0.50], ring: [255, 213, 79, 0.28] },
            // 3: Red Giant / Magnetic Prominence Flare (Cooling Mode)
            { top: [34, 11, 24], mid: [28, 10, 34], bot: [14, 11, 28], mtn: [23, 15, 26], star: 0.40, rim: [255, 82, 82, 0.40], ring: [255, 82, 82, 0.28] }
        ];

        const phaseProgress = cycle * 4;
        const currentPhase = Math.floor(phaseProgress);
        const nextPhase = (currentPhase + 1) % 4;
        const localT = phaseProgress - currentPhase;
        // Smooth cosine curve: zero abrupt pop-in
        const smoothT = 0.5 - 0.5 * Math.cos(localT * Math.PI);

        const kfA = KEYFRAMES[currentPhase];
        const kfB = KEYFRAMES[nextPhase];
        const lerp = (a, b, t) => a + (b - a) * t;
        const lerpColor = (cA, cB, t) => `rgb(${Math.round(lerp(cA[0], cB[0], t))}, ${Math.round(lerp(cA[1], cB[1], t))}, ${Math.round(lerp(cA[2], cB[2], t))})`;
        const lerpRgba = (cA, cB, t) => `rgba(${Math.round(lerp(cA[0], cB[0], t))}, ${Math.round(lerp(cA[1], cB[1], t))}, ${Math.round(lerp(cA[2], cB[2], t))}, ${lerp(cA[3], cB[3], t).toFixed(3)})`;

        const skyTop = lerpColor(kfA.top, kfB.top, smoothT);
        const skyMid = lerpColor(kfA.mid, kfB.mid, smoothT);
        const skyBottom = lerpColor(kfA.bot, kfB.bot, smoothT);
        const mountainTint = lerpColor(kfA.mtn, kfB.mtn, smoothT);
        const starAlpha = lerp(kfA.star, kfB.star, smoothT);
        const rimColor = lerpRgba(kfA.rim, kfB.rim, smoothT);
        const ringColor = lerpRgba(kfA.ring, kfB.ring, smoothT);

        // Render dynamic sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, skyTop);
        skyGrad.addColorStop(0.55, skyMid);
        skyGrad.addColorStop(1, skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Render Starfield with dynamic phase-dependent alpha
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 45; i++) {
            const sx = (i * 59 + 17) % w;
            const sy = (i * 37 + 11) % Math.floor(h * 0.65);
            const twinkle = Math.sin(this.titleAnimTimer * 3 + i) > 0.3;
            ctx.globalAlpha = (twinkle ? 0.9 : 0.35) * starAlpha;
            ctx.fillRect(sx, sy, 1, 1);
            if (i % 7 === 0) ctx.fillRect(sx - 1, sy, 3, 1);
        }
        ctx.globalAlpha = 1.0;

        // 2. Render Dyson Sphere Megastructure Orbital Lattice Rings
        ctx.save();
        ctx.translate(lumX, lumY);
        const rotAngle = this.titleAnimTimer * 0.10;

        // Concentric outer containment ring
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, lumRadius + 14, lumRadius + 5, rotAngle * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = ringColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, lumRadius + 9, lumRadius + 15, -rotAngle * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Render Solar Rays / Corona Flares during Sun Stages with smooth fade
        const sunWeight = Math.sin(cycle * Math.PI); // Peaks around 0.50 (Zenith), 0 at 0 and 1.0
        if (sunWeight > 0.05) {
            const isRedGiant = (cycle >= 0.70);
            const rayCount = 8;
            const rayLength = 22 + 14 * sunWeight;
            const rayPulse = 1.0 + 0.15 * Math.sin(this.titleAnimTimer * 4);

            for (let r = 0; r < rayCount; r++) {
                const angle = rotAngle + (r * Math.PI * 2) / rayCount;
                const innerX = Math.cos(angle) * (lumRadius + 2);
                const innerY = Math.sin(angle) * (lumRadius + 2);
                const outerX = Math.cos(angle) * (lumRadius + rayLength * rayPulse);
                const outerY = Math.sin(angle) * (lumRadius + rayLength * rayPulse);

                ctx.strokeStyle = isRedGiant 
                    ? `rgba(255, 87, 34, ${(0.35 + 0.2 * Math.sin(angle * 2 + this.titleAnimTimer)) * sunWeight})` 
                    : `rgba(255, 215, 64, ${(0.45 + 0.25 * Math.sin(angle * 2 + this.titleAnimTimer)) * sunWeight})`;
                ctx.lineWidth = (r % 2 === 0) ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(innerX, innerY);
                ctx.lineTo(outerX, outerY);
                ctx.stroke();
            }

            // Broad outer atmospheric corona glow
            const coronaGlow = ctx.createRadialGradient(0, 0, lumRadius * 0.8, 0, 0, lumRadius * 2.8);
            if (isRedGiant) {
                coronaGlow.addColorStop(0, `rgba(255, 61, 0, ${(0.45 * sunWeight).toFixed(2)})`);
                coronaGlow.addColorStop(0.6, `rgba(213, 0, 0, ${(0.18 * sunWeight).toFixed(2)})`);
                coronaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                coronaGlow.addColorStop(0, `rgba(255, 235, 59, ${(0.55 * sunWeight).toFixed(2)})`);
                coronaGlow.addColorStop(0.5, `rgba(255, 152, 0, ${(0.22 * sunWeight).toFixed(2)})`);
                coronaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
            ctx.fillStyle = coronaGlow;
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius * 2.8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Lunar cool glow
            const moonGlow = ctx.createRadialGradient(0, 0, lumRadius * 0.5, 0, 0, lumRadius * 2.2);
            moonGlow.addColorStop(0, 'rgba(128, 222, 234, 0.35)');
            moonGlow.addColorStop(0.7, 'rgba(2, 136, 209, 0.10)');
            moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius * 2.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Render the Core Dyson Luminary Orb Body with smooth transitions
        if (cycle >= 0.50 && cycle < 0.75) {
            // High Solar Zenith: Radiant White/Gold Stellar Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();

            // Inner intense plasma core
            ctx.fillStyle = '#fff9c4';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius - 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (cycle >= 0.75) {
            // Red Giant Phase: Amber-Crimson Stellar Flare Core
            ctx.fillStyle = '#ff3d00';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff9100';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius - 4, 0, Math.PI * 2);
            ctx.fill();

            // Advancing dark shutter shadow (waning back to lunar/eclipse)
            const t = (cycle - 0.75) / 0.25;
            ctx.fillStyle = skyTop;
            ctx.beginPath();
            ctx.arc(-lumRadius * (1.6 - t * 1.8), 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();
        } else if (cycle >= 0.25 && cycle < 0.50) {
            // Solar Dawn Phase: Warm Amber Core waking up
            ctx.fillStyle = '#ffa726';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffe082';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius - 3, 0, Math.PI * 2);
            ctx.fill();

            // Retracting dark shutter shadow
            const t = (cycle - 0.25) / 0.25;
            ctx.fillStyle = skyTop;
            ctx.beginPath();
            ctx.arc(lumRadius * (0.2 + t * 1.6), 0, lumRadius + 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Lunar Phase: Obsidian sphere with silver-cyan waxing crescent
            ctx.fillStyle = '#0a101a';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();

            // Internal reactor grid lines visible in the dark core
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-lumRadius * 0.6, 0);
            ctx.lineTo(lumRadius * 0.6, 0);
            ctx.moveTo(0, -lumRadius * 0.6);
            ctx.lineTo(0, lumRadius * 0.6);
            ctx.stroke();

            // Radiant silver crescent rim
            ctx.fillStyle = '#e1f5fe';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();

            // Occluding sphere shadow defining moon phase
            const t = cycle / 0.25;
            const shadowShift = lumRadius * (0.2 + t * 1.2);
            ctx.fillStyle = '#050a12';
            ctx.beginPath();
            ctx.arc(shadowShift, -2, lumRadius * 0.95, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 3. Mountain Ridge with Dynamic Illumination
        ctx.fillStyle = mountainTint;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.65);
        ctx.lineTo(w * 0.25, h * 0.52);
        ctx.lineTo(w * 0.55, h * 0.60);
        ctx.lineTo(w * 0.8, h * 0.48);
        ctx.lineTo(w, h * 0.58);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Mountain edge dynamic rim light (smoothly interpolated)
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.65);
        ctx.lineTo(w * 0.25, h * 0.52);
        ctx.lineTo(w * 0.55, h * 0.60);
        ctx.lineTo(w * 0.8, h * 0.48);
        ctx.lineTo(w, h * 0.58);
        ctx.stroke();

        // Silhouette Conifer Pines
        ctx.fillStyle = '#070b14';
        const treeSpacing = 28;
        for (let x = 0; x <= w + treeSpacing; x += treeSpacing) {
            const th = 38 + ((x * 13) % 24);
            const ty = Math.floor(h * 0.72);
            ctx.beginPath();
            ctx.moveTo(x, ty - th);
            ctx.lineTo(x + 14, ty);
            ctx.lineTo(x - 14, ty);
            ctx.closePath();
            ctx.fill();
        }

        // 4. Grassy Clearing
        ctx.fillStyle = '#101926';
        ctx.fillRect(0, Math.floor(h * 0.70), w, Math.floor(h * 0.30));
        ctx.fillStyle = '#1c293d';
        ctx.fillRect(0, Math.floor(h * 0.70), w, 4);

        // 5. Central Ancient Runic Monolith / Totem
        const mx = Math.floor(w / 2);
        const my = Math.floor(h * 0.68);

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(mx, my + 6, 26, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#151e2b';
        ctx.fillRect(mx - 14, my - 85, 28, 90);
        ctx.fillStyle = '#223044';
        ctx.fillRect(mx - 12, my - 83, 24, 86);

        ctx.fillStyle = '#111722';
        ctx.fillRect(mx - 12, my - 60, 24, 3);
        ctx.fillRect(mx - 12, my - 32, 24, 3);

        const glowPulse = 0.5 + 0.45 * Math.sin(this.titleAnimTimer * 2.5);
        ctx.fillStyle = `rgba(0, 229, 255, ${glowPulse})`;
        ctx.fillRect(mx - 6, my - 75, 12, 3);
        ctx.fillRect(mx - 6, my - 72, 3, 6);
        ctx.fillRect(mx - 6, my - 66, 12, 3);
        ctx.fillRect(mx + 3, my - 63, 3, 5);
        ctx.fillRect(mx - 5, my - 48, 10, 3);
        ctx.fillRect(mx - 1, my - 45, 3, 10);
        ctx.fillRect(mx - 7, my - 40, 14, 2);
        ctx.fillRect(mx - 4, my - 22, 8, 3);
        ctx.fillRect(mx - 2, my - 19, 4, 8);

        // 6. Braziers with Fire
        const braziers = [mx - 52, mx + 52];
        for (const bx of braziers) {
            ctx.fillStyle = '#1c2636';
            ctx.fillRect(bx - 6, my - 12, 12, 14);
            ctx.fillStyle = '#2e3d54';
            ctx.fillRect(bx - 5, my - 11, 10, 4);

            const fTick = Math.floor(this.titleAnimTimer * 12 + bx) % 3;
            const fH = (fTick === 0 ? 10 : (fTick === 1 ? 14 : 12));
            ctx.fillStyle = '#d50000';
            ctx.fillRect(bx - 4, my - 12 - fH, 8, fH);
            ctx.fillStyle = '#ff9800';
            ctx.fillRect(bx - 3, my - 10 - fH, 6, fH - 2);
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(bx - 1, my - 8 - fH, 2, fH - 4);
        }

        // 7. Rising Fireflies
        for (let i = 0; i < 16; i++) {
            const seed = (i * 73) % 997;
            const fx = (mx - 90 + ((seed + Math.floor(this.titleAnimTimer * 15)) % 180));
            const fy = my + 10 - ((seed * 11 + Math.floor(this.titleAnimTimer * 28)) % 140);
            const fAlpha = 0.4 + 0.5 * Math.sin(this.titleAnimTimer * 4 + i);
            ctx.fillStyle = (i % 2 === 0) ? `rgba(0, 229, 255, ${fAlpha})` : `rgba(255, 213, 79, ${fAlpha})`;
            ctx.fillRect(fx, fy, 2, 2);
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
    module.exports = { RetroRenderer, Renderer: RetroRenderer };
}
