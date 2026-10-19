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
        this.ambientParticles = [];
        this.ambientParticleArea = null;
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
        const heightStep = map.heightStep || 10;

        const startCol = Math.max(0, Math.floor(camX / 16) - 1);
        const endCol = Math.min(map.width - 1, Math.ceil((camX + this.width) / 16) + 1);
        const startRow = Math.max(0, Math.floor(camY / 16) - 3);
        const endRow = Math.min(map.height - 1, Math.ceil((camY + this.height) / 16) + 3);

        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                const tile = map.get(x, y);
                const elev = map.getElevation ? map.getElevation(x, y) : 1;
                const screenX = x * 16 - camX;
                const screenY = y * 16 - camY - elev * heightStep;

                this.drawTile(tile, screenX, screenY, pal, x, y, map);

                // South-facing cliff drop facade (Isoccor 2.5D cliff wall model)
                if (map.getElevation) {
                    const southElev = (y + 1 < map.height) ? map.getElevation(x, y + 1) : elev;
                    if (elev > southElev) {
                        const cliffDrop = (elev - southElev) * heightStep;
                        const facadeTop = screenY + 16;
                        this.drawCliffFacade(screenX, facadeTop, cliffDrop, pal, x, y, map);
                        this.drawCliffDropShadow(screenX, facadeTop + cliffDrop, pal, x, y, map);
                    }
                }
            }
        }

        // Render ground objects: chests, sparkles, portals, and depleted stumps / ground flora
        if (map.chests) this.renderChests(map.chests, camX, camY, map);
        if (map.sparkles) this.renderSparkles(map.sparkles, camX, camY, map);
        if (map.portals) this.renderPortals(map.portals, camX, camY, map);
        if (map.resourceNodes) this.renderGroundResourceNodes(map.resourceNodes, camX, camY, dt, map);
    }

    drawCliffFacade(sx, sy, heightPx, pal, tx, ty, map) {
        const ctx = this.ctx;
        const h = Math.max(4, heightPx || 10);

        // Base cliff body: rich rocky tone
        const baseColor = (pal && pal[1]) ? pal[1] : '#2b303c';
        const shadowColor = (pal && pal[0]) ? pal[0] : '#181b22';
        const highlightColor = (pal && pal[3]) ? pal[3] : '#607d8b';

        ctx.fillStyle = baseColor;
        ctx.fillRect(sx, sy, 16, h);

        // Top cliff rim highlight (sunlit rocky ledge edge)
        ctx.fillStyle = highlightColor;
        ctx.fillRect(sx, sy, 16, 2);

        // Geological strata: dark horizontal banding
        ctx.fillStyle = shadowColor;
        if (h >= 6) ctx.fillRect(sx, sy + Math.floor(h * 0.4), 16, 2);
        if (h >= 12) ctx.fillRect(sx, sy + Math.floor(h * 0.75), 16, 2);

        // Vertical rock fractures & fissures
        const seedShift = (tx * 7 + ty * 13) % 11;
        ctx.fillStyle = shadowColor;
        ctx.fillRect(sx + 3 + (seedShift % 3), sy + 2, 1, Math.min(h - 3, 8));
        ctx.fillRect(sx + 9 + (seedShift % 4), sy + 3, 1, Math.min(h - 4, 10));

        // Cliff bottom ambient shadow meeting ground
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(sx, sy + h - 2, 16, 2);
    }

    drawCliffDropShadow(sx, sy, pal, tx, ty, map) {
        const ctx = this.ctx;
        // Translucent ground drop shadow cast southwards
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(sx, sy, 16, 6);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.fillRect(sx, sy + 6, 16, 3);
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

            case 27: { // STONE_RAMP (Carved stone incline connecting elevation levels)
                ctx.fillStyle = '#455a64';
                ctx.fillRect(sx, sy, 16, 16);

                // Ramp incline shading (lighter at top, darker at bottom)
                ctx.fillStyle = '#607d8b';
                ctx.fillRect(sx + 1, sy, 14, 5);
                ctx.fillStyle = '#546e7a';
                ctx.fillRect(sx + 1, sy + 5, 14, 5);
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx + 1, sy + 10, 14, 6);

                // Side retaining stone curbs
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx, sy, 2, 16);
                ctx.fillRect(sx + 14, sy, 2, 16);
                ctx.fillStyle = '#78909c';
                ctx.fillRect(sx, sy, 1, 16);

                // Stepping grip ridges
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx + 2, sy + 4, 12, 1);
                ctx.fillRect(sx + 2, sy + 9, 12, 1);
                ctx.fillRect(sx + 2, sy + 14, 12, 1);
                break;
            }

            case 28: { // WOODEN_STAIRS (Timber stairway with wooden planks and nail studs)
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(sx, sy, 16, 16);

                // 3 wooden stair risers
                for (let r = 0; r < 3; r++) {
                    const ry = sy + r * 5;
                    ctx.fillStyle = '#8d6e63';
                    ctx.fillRect(sx + 1, ry, 14, 3); // Tread
                    ctx.fillStyle = '#4e342e';
                    ctx.fillRect(sx + 1, ry + 3, 14, 2); // Riser shadow

                    // Golden brass nail studs
                    ctx.fillStyle = '#ffd54f';
                    ctx.fillRect(sx + 2, ry + 1, 1, 1);
                    ctx.fillRect(sx + 13, ry + 1, 1, 1);
                }
                // Side timber balusters
                ctx.fillStyle = '#271c19';
                ctx.fillRect(sx, sy, 1, 16);
                ctx.fillRect(sx + 15, sy, 1, 16);
                break;
            }

            case 29: { // CLIFF_FACE (Vertical cliff rock facade)
                this.drawCliffFacade(sx, sy, 16, pal, tx, ty, map);
                break;
            }

            case 30: { // ENCHANTED_MIST (Whispering Woods & Canopy boundary mist)
                const t = Date.now() / 1000;
                // Layer 1: soft deep twilight mist backdrop
                ctx.fillStyle = '#0f2b26';
                ctx.fillRect(sx, sy, 16, 16);
                // Swirling pale jade translucent fog ribbons
                const swirl1 = Math.sin(t * 1.8 + tx * 0.7 + ty * 0.5) * 3;
                const swirl2 = Math.cos(t * 1.4 + tx * 0.4 - ty * 0.8) * 3;
                ctx.fillStyle = 'rgba(78, 205, 196, 0.45)';
                ctx.fillRect(sx, sy + 3 + swirl1, 16, 5);
                ctx.fillStyle = 'rgba(129, 230, 217, 0.35)';
                ctx.fillRect(sx + 2 + swirl2, sy + 8, 12, 6);
                // Drifting ethereal spores
                ctx.fillStyle = '#a7f3d0';
                const px1 = (Math.floor(t * 6 + tx * 5) % 14) + 1;
                const py1 = (Math.floor(t * 4 + ty * 7) % 14) + 1;
                ctx.fillRect(sx + px1, sy + py1, 1.5, 1.5);
                break;
            }

            case 31: { // HEAT_MIRAGE (Solarium Dunes golden desert heat shimmer)
                const t = Date.now() / 1000;
                // Warm desert sand base
                ctx.fillStyle = '#b45309';
                ctx.fillRect(sx, sy, 16, 16);
                // Shimmering wavy amber heat distortion lines
                const shimmer1 = Math.sin(t * 3.5 + ty * 1.2) * 2;
                const shimmer2 = Math.cos(t * 2.8 + tx * 1.1) * 2;
                ctx.fillStyle = 'rgba(251, 191, 36, 0.40)';
                ctx.fillRect(sx, sy + 2 + shimmer1, 16, 3);
                ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
                ctx.fillRect(sx, sy + 9 + shimmer2, 16, 4);
                // Sunlit dust fleck
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(sx + 7 + Math.floor(shimmer1), sy + 6, 2, 1);
                break;
            }

            case 32: { // BLIZZARD_HAZE (Frostspire frozen blizzard boundary)
                const t = Date.now() / 1000;
                // Dark frosty indigo backdrop
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(sx, sy, 16, 16);
                // Howling cyan/white snow gusts
                const gust = Math.sin(t * 4.2 + tx * 0.9 + ty * 1.3) * 3;
                ctx.fillStyle = 'rgba(186, 230, 253, 0.50)';
                ctx.fillRect(sx, sy + 4 + gust, 16, 4);
                ctx.fillStyle = 'rgba(224, 242, 254, 0.40)';
                ctx.fillRect(sx, sy + 10 - gust, 16, 3);
                // Crystalline falling snowflake
                ctx.fillStyle = '#ffffff';
                const sfx = (Math.floor(t * 12 + tx * 4) % 15);
                const sfy = (Math.floor(t * 9 + ty * 3) % 15);
                ctx.fillRect(sx + sfx, sy + sfy, 1.5, 1.5);
                break;
            }

            case 33: { // CHASM_DROP (Bottomless abyss chasm boundary)
                // Pitch-black abyssal void
                ctx.fillStyle = '#05070a';
                ctx.fillRect(sx, sy, 16, 16);
                // Jagged basalt rock rim along top
                ctx.fillStyle = '#1c1917';
                ctx.fillRect(sx, sy, 16, 3);
                ctx.fillStyle = '#292524';
                ctx.fillRect(sx + 2, sy, 4, 2);
                ctx.fillRect(sx + 9, sy, 5, 2);
                // Faint purple abyssal depth glow
                ctx.fillStyle = 'rgba(88, 28, 135, 0.18)';
                ctx.fillRect(sx, sy + 10, 16, 6);
                break;
            }

            case 34: { // COSMIC_VOID (Celestial Zenith & Eclipse deep starfield)
                const t = Date.now() / 1000;
                // Deep midnight void
                ctx.fillStyle = '#030712';
                ctx.fillRect(sx, sy, 16, 16);
                // Faint nebula gas wisps
                ctx.fillStyle = 'rgba(147, 51, 234, 0.15)';
                ctx.fillRect(sx, sy, 16, 16);
                // Multi-colored twinkling starlight
                const starHash = Math.imul(tx * 31 + ty * 73, 1) >>> 0;
                if (starHash % 3 === 0) {
                    const twinkle = (Math.sin(t * 2.5 + starHash) + 1) * 0.5;
                    ctx.fillStyle = (starHash % 2 === 0) ? `rgba(56, 189, 248, ${0.4 + twinkle * 0.6})` : `rgba(250, 204, 21, ${0.4 + twinkle * 0.6})`;
                    ctx.fillRect(sx + (starHash % 12) + 2, sy + ((starHash >> 4) % 12) + 2, 1.5, 1.5);
                }
                break;
            }

            case 35: { // BUILDING_SIGN (Purposeful building shop sign)
                // Ground under sign
                ctx.fillStyle = (pal && pal[2]) ? pal[2] : '#2e7d32';
                ctx.fillRect(sx, sy, 16, 16);
                // Wooden signpost pole
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx + 7, sy + 6, 2, 10);
                // Hanging wooden plaque board
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(sx + 3, sy + 1, 10, 8);
                ctx.fillStyle = '#3e2723';
                ctx.strokeRect(sx + 3.5, sy + 1.5, 9, 7);
                // Golden insignia emblem on board
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 6, sy + 3, 4, 3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 7, sy + 4, 2, 1);
                break;
            }

            case 36: { // BASEMENT_STAIRS (Enterable cellar / secret basement stairs)
                // Dark stone masonry surround
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx, sy, 16, 16);
                // Descending stone stairs in perspective
                ctx.fillStyle = '#102027';
                ctx.fillRect(sx + 2, sy + 2, 12, 12);
                for (let step = 0; step < 4; step++) {
                    const stepY = sy + 3 + step * 3;
                    const shade = Math.floor(90 - step * 20);
                    ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 12})`;
                    ctx.fillRect(sx + 3, stepY, 10, 2);
                    ctx.fillStyle = '#050a0d';
                    ctx.fillRect(sx + 3, stepY + 2, 10, 1);
                }
                // Wooden handrail on right
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 13, sy + 2, 1, 12);
                // Lantern glow at top
                ctx.fillStyle = 'rgba(255, 179, 0, 0.45)';
                ctx.fillRect(sx + 1, sy + 1, 3, 3);
                break;
            }
        }
    }

    drawEquippedArmorBack(ctx, char, armId, sx, sy, bob, facing, walkCycle) {
        if (!armId) return;
        ctx.save();
        const t = Date.now() / 1000;

        if (armId === 'GENESIS_STARMANTLE') {
            // Flowing celestial starlight cape behind character
            if (facing === 'DOWN' || facing === 'LEFT' || facing === 'RIGHT') {
                const flutter = Math.sin(t * 3.5) * 1.5;
                ctx.fillStyle = '#0a1026';
                ctx.fillRect(sx - 6, sy - 5 + bob, 12, 13);
                // Glowing cosmic stardust flecks on cape
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 4 + flutter, sy + 1 + bob, 1.5, 1.5);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 3 - flutter, sy + 3 + bob, 1.5, 1.5);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 1, sy + 5 + bob, 1.5, 1.5);
            }
        }
        ctx.restore();
    }

    drawEquippedArmorFront(ctx, char, armId, sx, sy, bob, facing, walkCycle) {
        if (!armId) return;
        ctx.save();

        if (armId === 'GENESIS_STARMANTLE') {
            if (facing === 'UP') {
                ctx.fillStyle = '#0a1026';
                ctx.fillRect(sx - 6, sy - 8 + bob, 12, 16);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 6, sy - 8 + bob, 12, 2);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 3, sy - 3 + bob, 1.5, 1.5);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 2, sy - 1 + bob, 1.5, 1.5);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 1, sy + 3 + bob, 1.5, 1.5);
            } else {
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 6, sy - 7 + bob, 3, 3);
                ctx.fillRect(sx + 3, sy - 7 + bob, 3, 3);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 1, sy - 6 + bob, 2, 2);
            }
        } else if (armId === 'VANGUARD_CHESTPLATE') {
            ctx.fillStyle = '#455a64';
            if (facing === 'DOWN') {
                ctx.fillRect(sx - 4, sy - 6 + bob, 8, 8);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx - 1, sy - 4 + bob, 2, 3);
                ctx.fillStyle = '#90a4ae';
                ctx.fillRect(sx - 6, sy - 7 + bob, 2, 4);
                ctx.fillRect(sx + 4, sy - 7 + bob, 2, 4);
            } else if (facing === 'UP') {
                ctx.fillRect(sx - 4, sy - 6 + bob, 8, 8);
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx - 2, sy - 4 + bob, 4, 5);
            } else if (facing === 'LEFT') {
                ctx.fillRect(sx - 4, sy - 6 + bob, 6, 8);
                ctx.fillStyle = '#90a4ae';
                ctx.fillRect(sx - 5, sy - 7 + bob, 3, 4);
            } else if (facing === 'RIGHT') {
                ctx.fillRect(sx - 2, sy - 6 + bob, 6, 8);
                ctx.fillStyle = '#90a4ae';
                ctx.fillRect(sx + 2, sy - 7 + bob, 3, 4);
            }
        } else if (armId === 'DREADNOUGHT_WARPLATE' || armId === 'IRON_AEGIS_PLATE') {
            ctx.fillStyle = '#263238';
            if (facing === 'DOWN') {
                ctx.fillRect(sx - 5, sy - 6 + bob, 10, 9);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 4, sy - 3 + bob, 8, 2);
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx - 7, sy - 7 + bob, 3, 5);
                ctx.fillRect(sx + 4, sy - 7 + bob, 3, 5);
            } else if (facing === 'UP') {
                ctx.fillRect(sx - 5, sy - 6 + bob, 10, 9);
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx - 7, sy - 7 + bob, 3, 5);
                ctx.fillRect(sx + 4, sy - 7 + bob, 3, 5);
            } else if (facing === 'LEFT') {
                ctx.fillRect(sx - 5, sy - 6 + bob, 8, 9);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 4, sy - 3 + bob, 3, 2);
            } else if (facing === 'RIGHT') {
                ctx.fillRect(sx - 3, sy - 6 + bob, 8, 9);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 1, sy - 3 + bob, 3, 2);
            }
        } else if (armId === 'AEGIS_KINETIC_SHIELD' || armId === 'WOODEN_BUCKLER') {
            const isEnergy = armId === 'AEGIS_KINETIC_SHIELD';
            const shieldColor = isEnergy ? '#00e5ff' : '#795548';
            const rimColor = isEnergy ? '#ffffff' : '#37474f';

            if (facing === 'DOWN') {
                ctx.fillStyle = shieldColor;
                ctx.fillRect(sx - 9, sy - 7 + bob, 4, 8);
                ctx.fillStyle = rimColor;
                ctx.fillRect(sx - 10, sy - 6 + bob, 1, 6);
            } else if (facing === 'UP') {
                ctx.fillStyle = shieldColor;
                ctx.fillRect(sx - 9, sy - 8 + bob, 4, 8);
            } else if (facing === 'LEFT') {
                ctx.fillStyle = shieldColor;
                ctx.fillRect(sx + 3, sy - 6 + bob, 3, 7);
            } else if (facing === 'RIGHT') {
                ctx.fillStyle = shieldColor;
                ctx.fillRect(sx - 6, sy - 6 + bob, 3, 7);
            }
        } else if (armId === 'PIONEER_BAND') {
            ctx.fillStyle = '#00e5ff';
            if (facing === 'DOWN') {
                ctx.fillRect(sx - 6, sy - 2 + bob, 2, 2);
                ctx.fillRect(sx + 4, sy - 2 + bob, 2, 2);
            } else if (facing === 'LEFT') {
                ctx.fillRect(sx - 4, sy - 2 + bob, 2, 2);
            } else if (facing === 'RIGHT') {
                ctx.fillRect(sx + 2, sy - 2 + bob, 2, 2);
            }
        }
        ctx.restore();
    }

    drawEquippedWeapon(ctx, char, wepId, sx, sy, bob, facing, walkCycle) {
        ctx.save();
        switch (wepId) {
            case 'PRIMORDIAL_VOID_SCYTHE':
            case 'VOID_SCYTHE': {
                const isMythic = wepId === 'PRIMORDIAL_VOID_SCYTHE';
                const eyeColor = isMythic ? '#ff1744' : '#e040fb';
                const bladeGrad = isMythic ? '#d50000' : '#7b1fa2';

                if (facing === 'DOWN') {
                    ctx.fillStyle = '#212121';
                    ctx.fillRect(sx + 6, sy - 14 + bob, 2, 20);
                    ctx.fillStyle = bladeGrad;
                    ctx.fillRect(sx + 3, sy - 16 + bob, 7, 3);
                    ctx.fillRect(sx + 1, sy - 14 + bob, 3, 4);
                    ctx.fillStyle = eyeColor;
                    ctx.fillRect(sx + 6, sy - 15 + bob, 2, 2);
                } else if (facing === 'UP') {
                    ctx.fillStyle = '#212121';
                    ctx.fillRect(sx + 5, sy - 16 + bob, 2, 20);
                    ctx.fillStyle = bladeGrad;
                    ctx.fillRect(sx + 2, sy - 18 + bob, 7, 3);
                    ctx.fillRect(sx, sy - 16 + bob, 3, 4);
                    ctx.fillStyle = eyeColor;
                    ctx.fillRect(sx + 5, sy - 17 + bob, 2, 2);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = '#212121';
                    ctx.fillRect(sx - 7, sy - 12 + bob, 2, 18);
                    ctx.fillStyle = bladeGrad;
                    ctx.fillRect(sx - 12, sy - 14 + bob, 7, 3);
                    ctx.fillRect(sx - 14, sy - 12 + bob, 3, 5);
                    ctx.fillStyle = eyeColor;
                    ctx.fillRect(sx - 7, sy - 13 + bob, 2, 2);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = '#212121';
                    ctx.fillRect(sx + 6, sy - 12 + bob, 2, 18);
                    ctx.fillStyle = bladeGrad;
                    ctx.fillRect(sx + 7, sy - 14 + bob, 7, 3);
                    ctx.fillRect(sx + 12, sy - 12 + bob, 3, 5);
                    ctx.fillStyle = eyeColor;
                    ctx.fillRect(sx + 6, sy - 13 + bob, 2, 2);
                }
                break;
            }

            case 'DYSON_STELLAR_SABER':
            case 'SOLARION_BROADSWORD': {
                const bladeGold = '#ffd54f';
                const coreWhite = '#ffffff';
                const guardAmber = '#ff6f00';

                if (facing === 'DOWN') {
                    ctx.fillStyle = guardAmber;
                    ctx.fillRect(sx + 4, sy - 7 + bob, 6, 2);
                    ctx.fillStyle = bladeGold;
                    ctx.fillRect(sx + 5, sy - 14 + bob, 4, 8);
                    ctx.fillStyle = coreWhite;
                    ctx.fillRect(sx + 6, sy - 13 + bob, 2, 6);
                } else if (facing === 'UP') {
                    ctx.fillStyle = guardAmber;
                    ctx.fillRect(sx + 4, sy - 8 + bob, 6, 2);
                    ctx.fillStyle = bladeGold;
                    ctx.fillRect(sx + 5, sy - 16 + bob, 4, 9);
                    ctx.fillStyle = coreWhite;
                    ctx.fillRect(sx + 6, sy - 15 + bob, 2, 7);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = guardAmber;
                    ctx.fillRect(sx - 6, sy - 6 + bob, 2, 5);
                    ctx.fillStyle = bladeGold;
                    ctx.fillRect(sx - 12, sy - 8 + bob, 7, 3);
                    ctx.fillStyle = coreWhite;
                    ctx.fillRect(sx - 11, sy - 7 + bob, 5, 1);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = guardAmber;
                    ctx.fillRect(sx + 4, sy - 6 + bob, 2, 5);
                    ctx.fillStyle = bladeGold;
                    ctx.fillRect(sx + 5, sy - 8 + bob, 7, 3);
                    ctx.fillStyle = coreWhite;
                    ctx.fillRect(sx + 6, sy - 7 + bob, 5, 1);
                }
                break;
            }

            case 'RUNIC_WARHAMMER': {
                const stoneGrey = '#455a64';
                const runeViolet = '#ba68c8';
                const haftWood = '#795548';

                if (facing === 'DOWN') {
                    ctx.fillStyle = haftWood;
                    ctx.fillRect(sx + 6, sy - 11 + bob, 2, 16);
                    ctx.fillStyle = stoneGrey;
                    ctx.fillRect(sx + 4, sy - 16 + bob, 6, 6);
                    ctx.fillStyle = runeViolet;
                    ctx.fillRect(sx + 6, sy - 15 + bob, 2, 4);
                } else if (facing === 'UP') {
                    ctx.fillStyle = haftWood;
                    ctx.fillRect(sx + 5, sy - 13 + bob, 2, 16);
                    ctx.fillStyle = stoneGrey;
                    ctx.fillRect(sx + 3, sy - 18 + bob, 6, 6);
                    ctx.fillStyle = runeViolet;
                    ctx.fillRect(sx + 5, sy - 17 + bob, 2, 4);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = haftWood;
                    ctx.fillRect(sx - 8, sy - 8 + bob, 2, 14);
                    ctx.fillStyle = stoneGrey;
                    ctx.fillRect(sx - 12, sy - 12 + bob, 6, 6);
                    ctx.fillStyle = runeViolet;
                    ctx.fillRect(sx - 10, sy - 11 + bob, 2, 4);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = haftWood;
                    ctx.fillRect(sx + 6, sy - 8 + bob, 2, 14);
                    ctx.fillStyle = stoneGrey;
                    ctx.fillRect(sx + 6, sy - 12 + bob, 6, 6);
                    ctx.fillStyle = runeViolet;
                    ctx.fillRect(sx + 8, sy - 11 + bob, 2, 4);
                }
                break;
            }

            case 'ULTRASONIC_SWORD': {
                const vibroCyan = '#00e5ff';
                const hiltBlack = '#1a237e';

                if (facing === 'DOWN') {
                    ctx.fillStyle = hiltBlack;
                    ctx.fillRect(sx + 6, sy - 6 + bob, 2, 4);
                    ctx.fillStyle = vibroCyan;
                    ctx.fillRect(sx + 6, sy - 15 + bob, 2, 10);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx + 7, sy - 14 + bob, 1, 8);
                } else if (facing === 'UP') {
                    ctx.fillStyle = hiltBlack;
                    ctx.fillRect(sx + 5, sy - 6 + bob, 2, 4);
                    ctx.fillStyle = vibroCyan;
                    ctx.fillRect(sx + 5, sy - 16 + bob, 2, 11);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx + 6, sy - 15 + bob, 1, 9);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = hiltBlack;
                    ctx.fillRect(sx - 6, sy - 7 + bob, 3, 2);
                    ctx.fillStyle = vibroCyan;
                    ctx.fillRect(sx - 14, sy - 8 + bob, 9, 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx - 13, sy - 8 + bob, 7, 1);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = hiltBlack;
                    ctx.fillRect(sx + 3, sy - 7 + bob, 3, 2);
                    ctx.fillStyle = vibroCyan;
                    ctx.fillRect(sx + 5, sy - 8 + bob, 9, 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx + 6, sy - 8 + bob, 7, 1);
                }
                break;
            }

            case 'HUNTER_SPEAR': {
                const spearWood = '#8d6e63';
                const copperTip = '#ff7043';

                if (facing === 'DOWN') {
                    ctx.fillStyle = spearWood;
                    ctx.fillRect(sx + 6, sy - 14 + bob, 2, 22);
                    ctx.fillStyle = '#d32f2f';
                    ctx.fillRect(sx + 5, sy - 14 + bob, 4, 2);
                    ctx.fillStyle = copperTip;
                    ctx.fillRect(sx + 6, sy - 18 + bob, 2, 5);
                } else if (facing === 'UP') {
                    ctx.fillStyle = spearWood;
                    ctx.fillRect(sx + 5, sy - 16 + bob, 2, 22);
                    ctx.fillStyle = '#d32f2f';
                    ctx.fillRect(sx + 4, sy - 16 + bob, 4, 2);
                    ctx.fillStyle = copperTip;
                    ctx.fillRect(sx + 5, sy - 20 + bob, 2, 5);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = spearWood;
                    ctx.fillRect(sx - 14, sy - 6 + bob, 16, 2);
                    ctx.fillStyle = '#d32f2f';
                    ctx.fillRect(sx - 14, sy - 5 + bob, 2, 3);
                    ctx.fillStyle = copperTip;
                    ctx.fillRect(sx - 18, sy - 7 + bob, 5, 3);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = spearWood;
                    ctx.fillRect(sx - 2, sy - 6 + bob, 16, 2);
                    ctx.fillStyle = '#d32f2f';
                    ctx.fillRect(sx + 12, sy - 5 + bob, 2, 3);
                    ctx.fillStyle = copperTip;
                    ctx.fillRect(sx + 13, sy - 7 + bob, 5, 3);
                }
                break;
            }

            case 'COPPER_SHORTSWORD': {
                const bladeCop = '#ff7043';
                const guardGold = '#ffd54f';
                if (facing === 'DOWN') {
                    ctx.fillStyle = guardGold;
                    ctx.fillRect(sx + 4, sy - 6 + bob, 6, 2);
                    ctx.fillStyle = bladeCop;
                    ctx.fillRect(sx + 5, sy - 13 + bob, 4, 8);
                } else if (facing === 'UP') {
                    ctx.fillStyle = guardGold;
                    ctx.fillRect(sx + 4, sy - 7 + bob, 6, 2);
                    ctx.fillStyle = bladeCop;
                    ctx.fillRect(sx + 5, sy - 14 + bob, 4, 8);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = guardGold;
                    ctx.fillRect(sx - 6, sy - 6 + bob, 2, 5);
                    ctx.fillStyle = bladeCop;
                    ctx.fillRect(sx - 11, sy - 7 + bob, 6, 3);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = guardGold;
                    ctx.fillRect(sx + 4, sy - 6 + bob, 2, 5);
                    ctx.fillStyle = bladeCop;
                    ctx.fillRect(sx + 5, sy - 7 + bob, 6, 3);
                }
                break;
            }

            case 'CRUDE_DAGGER':
            case 'PLASMA_DAGGER': {
                const bladeCol = wepId === 'PLASMA_DAGGER' ? '#ff007f' : '#b0bec5';
                if (facing === 'DOWN') {
                    ctx.fillStyle = '#37474f';
                    ctx.fillRect(sx + 6, sy - 6 + bob, 2, 3);
                    ctx.fillStyle = bladeCol;
                    ctx.fillRect(sx + 6, sy - 11 + bob, 2, 6);
                } else if (facing === 'UP') {
                    ctx.fillStyle = '#37474f';
                    ctx.fillRect(sx + 5, sy - 7 + bob, 2, 3);
                    ctx.fillStyle = bladeCol;
                    ctx.fillRect(sx + 5, sy - 12 + bob, 2, 6);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = '#37474f';
                    ctx.fillRect(sx - 6, sy - 7 + bob, 3, 2);
                    ctx.fillStyle = bladeCol;
                    ctx.fillRect(sx - 10, sy - 7 + bob, 5, 2);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = '#37474f';
                    ctx.fillRect(sx + 3, sy - 7 + bob, 3, 2);
                    ctx.fillStyle = bladeCol;
                    ctx.fillRect(sx + 5, sy - 7 + bob, 5, 2);
                }
                break;
            }

            case 'PINE_CLUB':
            default: {
                const woodTone = '#8d6e63';
                const ironBand = '#37474f';
                if (facing === 'DOWN') {
                    ctx.fillStyle = woodTone;
                    ctx.fillRect(sx + 5, sy - 12 + bob, 4, 14);
                    ctx.fillStyle = ironBand;
                    ctx.fillRect(sx + 4, sy - 10 + bob, 6, 2);
                } else if (facing === 'UP') {
                    ctx.fillStyle = woodTone;
                    ctx.fillRect(sx + 4, sy - 14 + bob, 4, 15);
                    ctx.fillStyle = ironBand;
                    ctx.fillRect(sx + 3, sy - 12 + bob, 6, 2);
                } else if (facing === 'LEFT') {
                    ctx.fillStyle = woodTone;
                    ctx.fillRect(sx - 9, sy - 9 + bob, 11, 4);
                    ctx.fillStyle = ironBand;
                    ctx.fillRect(sx - 7, sy - 10 + bob, 2, 6);
                } else if (facing === 'RIGHT') {
                    ctx.fillStyle = woodTone;
                    ctx.fillRect(sx - 1, sy - 9 + bob, 11, 4);
                    ctx.fillStyle = ironBand;
                    ctx.fillRect(sx + 5, sy - 10 + bob, 2, 6);
                }
                break;
            }
        }
        ctx.restore();
    }

    renderCharacter(char, pal, map = null) {
        const ctx = this.ctx;
        const camX = Math.round(this.camera.x);
        const camY = Math.round(this.camera.y);

        const groundElev = (map && map.getElevationAt ? map.getElevationAt(char.pos.x, char.pos.y) : (char.groundElevation || 1));
        const heightStep = (map ? map.heightStep : 10) || 10;
        const elevY = groundElev * heightStep;

        const sx = Math.round(char.pos.x) - camX;
        const groundY = Math.round(char.pos.y) - camY - elevY;
        const jumpZ = (char.pos && char.pos.z) ? char.pos.z : 0;
        const sy = groundY - jumpZ;

        // Ground shadow under character stays on terrain surface at groundY
        const shadowScale = Math.max(0.35, 1.0 - jumpZ / 45.0);
        ctx.fillStyle = `rgba(0,0,0,${0.4 * shadowScale})`;
        ctx.beginPath();
        ctx.ellipse(sx, groundY + 6, 6 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (char.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
            return;
        }

        // Direction & Walk Animation state
        const facing = char.cardinalFacing || 'DOWN';
        const isMoving = char.vel && char.vel.length() > 5.0;
        const walkCycle = isMoving ? (Math.floor(char.walkTimer || 0) % 2) : 0;
        const bob = (isMoving && walkCycle === 1) ? -1 : 0;
        const effBob = bob + (isMoving ? 0 : (Math.sin(Date.now() / 240) > 0.4 ? -1 : 0));

        const equippedWep = (char.inventory && char.inventory.equippedWeapon) ? char.inventory.equippedWeapon.id : null;
        const equippedArm = (char.inventory && char.inventory.equippedArmor) ? char.inventory.equippedArmor.id : null;

        // Draw back armor layer (Genesis Starmantle flowing cape behind body)
        this.drawEquippedArmorBack(ctx, char, equippedArm, sx, sy, effBob, facing, walkCycle);

        // Draw High-Fidelity GBA / Terraria Detailed Character Body
        this.drawDetailedCharacterBody(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep);

        // Draw equipped front armor (Vanguard Chestplate, Iron Aegis, Shield, Flux Band)
        this.drawEquippedArmorFront(ctx, char, equippedArm, sx, sy, effBob, facing, walkCycle);

        // Draw equipped weapon (Cudgel, Flint Dagger, Ultrasonic Sword, Warhammer, Solarion Broadsword, Scythe)
        this.drawEquippedWeapon(ctx, char, equippedWep, sx, sy, effBob, facing, walkCycle);

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


    // =========================================================================
    // HIGH-FIDELITY GBA / TERRARIA DETAILED CHARACTER SPRITE RENDERERS
    // =========================================================================

    drawPixelEyes(ctx, x, y, facing, irisColor = '#00e5ff', isBlinking = false) {
        if (facing === 'UP') return;

        if (isBlinking) {
            ctx.fillStyle = '#1e293b';
            if (facing === 'DOWN') {
                ctx.fillRect(x - 3, y + 1, 3, 1);
                ctx.fillRect(x + 1, y + 1, 3, 1);
            } else if (facing === 'LEFT') {
                ctx.fillRect(x - 3, y + 1, 3, 1);
            } else if (facing === 'RIGHT') {
                ctx.fillRect(x + 1, y + 1, 3, 1);
            }
            return;
        }

        if (facing === 'DOWN') {
            // Left Eye: Sclera, Iris, Pupil, Catchlight, Brow
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 3, y, 3, 2);
            ctx.fillStyle = irisColor;
            ctx.fillRect(x - 2, y, 1, 2);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x - 2, y + 1, 1, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 3, y, 1, 1);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x - 3, y - 1, 3, 1);

            // Right Eye: Sclera, Iris, Pupil, Catchlight, Brow
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 1, y, 3, 2);
            ctx.fillStyle = irisColor;
            ctx.fillRect(x + 1, y, 1, 2);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 1, y + 1, 1, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 2, y, 1, 1);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 1, y - 1, 3, 1);

        } else if (facing === 'LEFT') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 3, y, 3, 2);
            ctx.fillStyle = irisColor;
            ctx.fillRect(x - 3, y, 1, 2);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x - 3, y + 1, 1, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 2, y, 1, 1);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x - 3, y - 1, 3, 1);

        } else if (facing === 'RIGHT') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 1, y, 3, 2);
            ctx.fillStyle = irisColor;
            ctx.fillRect(x + 2, y, 1, 2);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 2, y + 1, 1, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 1, y, 1, 1);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 1, y - 1, 3, 1);
        }
    }

    drawDetailedCharacterBody(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep) {
        const cls = char.charClass || 'TECHNO_MAGE';
        if (cls === 'TECHNO_MAGE') {
            this.drawDetailedTechnoMage(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep);
        } else if (cls === 'SUPER_SOLDIER') {
            this.drawDetailedSuperSoldier(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep);
        } else if (cls === 'FARMER_GOD') {
            this.drawDetailedFarmerGod(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep);
        } else if (cls === 'CHRONO_GLITCHER') {
            this.drawDetailedChronoGlitcher(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep);
        } else if (cls === 'SOLARION_ARCHITECT') {
            this.drawDetailedSolarionArchitect(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep);
        } else {
            this.drawDetailedTechnoMage(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep);
        }
    }

    drawDetailedTechnoMage(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep) {
        const isBlinking = (Math.floor(Date.now() / 150) % 24 === 0);
        const robeBase = '#311b92';
        const robeDark = '#1f104d';
        const robeLight = '#4a148c';
        const cyan = '#00e5ff';
        const cyanGlow = '#84ffff';
        const skin = '#ffe0bd';
        const skinShadow = '#f5cba7';

        if (facing === 'DOWN') {
            // 1. Shaded Boots with soles
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = '#212121';
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f'; // Soles
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            // 2. Layered Arcane Robe (Folds & Shading)
            ctx.fillStyle = robeDark;
            ctx.fillRect(sx - 5, sy - 6 + effBob, 10, 10);
            ctx.fillStyle = robeBase;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 8, 9);
            ctx.fillStyle = robeLight;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 2, 9);
            ctx.fillRect(sx + 2, sy - 6 + effBob, 2, 9);

            // 3. Central Nanite Circuit Trim
            ctx.fillStyle = cyan;
            ctx.fillRect(sx - 1, sy - 5 + effBob, 2, 8);
            ctx.fillStyle = cyanGlow;
            ctx.fillRect(sx - 2, sy + 1 + effBob, 1, 2);
            ctx.fillRect(sx + 1, sy + 1 + effBob, 1, 2);

            // 4. Belt & Mana Battery Phial
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(sx - 4, sy - 1 + effBob, 8, 2);
            ctx.fillStyle = '#ffd700'; // Gold buckle
            ctx.fillRect(sx - 1, sy - 1 + effBob, 2, 2);
            ctx.fillStyle = cyan; // Cyan phial on hip
            ctx.fillRect(sx - 5, sy - 1 + effBob, 1, 2);

            // 5. Hood & Head & Shaded Face
            ctx.fillStyle = robeDark; // Outer cowl shadow
            ctx.fillRect(sx - 5, sy - 14 + effBob, 10, 8);
            ctx.fillStyle = robeLight; // Cowl hood
            ctx.fillRect(sx - 4, sy - 14 + effBob, 8, 7);
            ctx.fillStyle = skinShadow; // Chin shadow
            ctx.fillRect(sx - 3, sy - 11 + effBob, 6, 4);
            ctx.fillStyle = skin; // Face
            ctx.fillRect(sx - 3, sy - 11 + effBob, 6, 3);

            // 6. Bangs beneath hood
            ctx.fillStyle = '#1a237e';
            ctx.fillRect(sx - 3, sy - 12 + effBob, 6, 2);
            ctx.fillRect(sx - 1, sy - 11 + effBob, 2, 1);

            // 7. Expressive Multi-tone Eyes
            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, cyan, isBlinking);

            // 8. Class Weapons (if unarmed)
            if (!equippedWep) {
                // Floating Nanite Orb (Left Hand)
                const orbBob = Math.sin(Date.now() / 200) * 2;
                ctx.fillStyle = cyan;
                ctx.beginPath();
                ctx.arc(sx - 8, sy - 4 + effBob + orbBob, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 9, sy - 5 + effBob + orbBob, 2, 2);
                // Nanite orbit ring
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(sx - 8, sy - 4 + effBob + orbBob, 5, 2, 0.4, 0, Math.PI * 2);
                ctx.stroke();

                // Golden Arcanist Staff (Right Hand)
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 5, sy - 14 + effBob, 2, 18);
                ctx.fillStyle = '#ffa000';
                ctx.fillRect(sx + 4, sy - 17 + effBob, 4, 3);
                // Glowing Amethyst focus gem
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx + 5, sy - 16 + effBob, 2, 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 5, sy - 16 + effBob, 1, 1);
            }

        } else if (facing === 'UP') {
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = '#212121';
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            // Robe Back with sacred geometry circuit
            ctx.fillStyle = robeDark;
            ctx.fillRect(sx - 5, sy - 6 + effBob, 10, 10);
            ctx.fillStyle = robeBase;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 8, 9);
            ctx.fillStyle = cyan;
            ctx.fillRect(sx - 1, sy - 5 + effBob, 2, 4);
            ctx.fillRect(sx - 3, sy - 2 + effBob, 6, 1);
            ctx.fillRect(sx - 2, sy + 1 + effBob, 4, 1);

            // Back of Cowl Hood with fold
            ctx.fillStyle = robeDark;
            ctx.fillRect(sx - 5, sy - 14 + effBob, 10, 8);
            ctx.fillStyle = robeLight;
            ctx.fillRect(sx - 4, sy - 14 + effBob, 8, 7);
            ctx.fillStyle = '#120024'; // Fold shadow tip
            ctx.fillRect(sx - 1, sy - 9 + effBob, 2, 3);

            if (!equippedWep) {
                // Staff on right
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 5, sy - 15 + effBob, 2, 19);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx + 5, sy - 17 + effBob, 2, 2);
            }

        } else if (facing === 'LEFT') {
            // Profile Boots
            ctx.fillStyle = '#212121';
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 6, 3, 1);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 6, 3, 1);

            // Profile Robe
            ctx.fillStyle = robeDark;
            ctx.fillRect(sx - 3, sy - 6 + effBob, 7, 10);
            ctx.fillStyle = robeBase;
            ctx.fillRect(sx - 2, sy - 6 + effBob, 5, 9);
            ctx.fillStyle = cyan;
            ctx.fillRect(sx - 2, sy - 4 + effBob, 1, 6);

            // Profile Hood & Face
            ctx.fillStyle = robeLight;
            ctx.fillRect(sx - 4, sy - 14 + effBob, 7, 7);
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 3, sy - 11 + effBob, 4, 3);
            ctx.fillStyle = '#1a237e'; // Bangs
            ctx.fillRect(sx - 3, sy - 12 + effBob, 4, 1);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, cyan, isBlinking);

            if (!equippedWep) {
                // Staff held in front
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx - 6, sy - 14 + effBob, 2, 18);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx - 7, sy - 17 + effBob, 3, 3);
            }

        } else if (facing === 'RIGHT') {
            // Profile Boots
            ctx.fillStyle = '#212121';
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 6, 3, 1);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 6, 3, 1);

            // Profile Robe
            ctx.fillStyle = robeDark;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 7, 10);
            ctx.fillStyle = robeBase;
            ctx.fillRect(sx - 3, sy - 6 + effBob, 5, 9);
            ctx.fillStyle = cyan;
            ctx.fillRect(sx + 1, sy - 4 + effBob, 1, 6);

            // Profile Hood & Face
            ctx.fillStyle = robeLight;
            ctx.fillRect(sx - 3, sy - 14 + effBob, 7, 7);
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 1, sy - 11 + effBob, 4, 3);
            ctx.fillStyle = '#1a237e'; // Bangs
            ctx.fillRect(sx - 1, sy - 12 + effBob, 4, 1);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, cyan, isBlinking);

            if (!equippedWep) {
                // Staff held in front
                ctx.fillStyle = '#ffb300';
                ctx.fillRect(sx + 5, sy - 14 + effBob, 2, 18);
                ctx.fillStyle = '#ea80fc';
                ctx.fillRect(sx + 4, sy - 17 + effBob, 3, 3);
            }
        }
    }

    drawDetailedSuperSoldier(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep) {
        const isBlinking = (Math.floor(Date.now() / 150) % 24 === 0);
        const armorBase = '#263238';
        const armorLight = '#455a64';
        const armorDark = '#102027';
        const orange = '#ff6d00';
        const orangeGlow = '#ffa000';
        const skin = '#ffcc80';
        const skinShadow = '#e0a96d';
        const hair = '#3e2723';
        const headband = '#d50000';

        if (facing === 'DOWN') {
            // Combat Sabatons
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f'; // Soles
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            // Ballistic Trousers & Kneepads
            ctx.fillStyle = armorBase;
            ctx.fillRect(sx - 4, sy - 1 + effBob, 8, 5);
            ctx.fillStyle = armorLight;
            ctx.fillRect(sx - 3 + bOffL, sy + 1 + effBob, 2, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 1 + effBob, 2, 2);

            // Heavy Ballistic Cuirass (Chestplate & Pauldrons)
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 5, sy - 7 + effBob, 10, 6);
            ctx.fillStyle = armorBase;
            ctx.fillRect(sx - 4, sy - 7 + effBob, 8, 5);
            ctx.fillStyle = armorLight;
            ctx.fillRect(sx - 5, sy - 7 + effBob, 2, 3); // Left pauldron
            ctx.fillRect(sx + 3, sy - 7 + effBob, 2, 3); // Right pauldron

            // Hazard Orange Power Core & Warning Trim
            ctx.fillStyle = orange;
            ctx.fillRect(sx - 1, sy - 6 + effBob, 2, 3);
            ctx.fillStyle = orangeGlow;
            ctx.fillRect(sx - 1, sy - 5 + effBob, 2, 1);

            // Tactical Harness Belt
            ctx.fillStyle = '#212121';
            ctx.fillRect(sx - 4, sy - 2 + effBob, 8, 1);
            ctx.fillStyle = '#b0bec5'; // Titanium buckle
            ctx.fillRect(sx - 1, sy - 2 + effBob, 2, 1);

            // Rugged Jaw & Head
            ctx.fillStyle = skinShadow;
            ctx.fillRect(sx - 3, sy - 12 + effBob, 6, 5);
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 3, sy - 12 + effBob, 6, 4);

            // Crimson Headband
            ctx.fillStyle = headband;
            ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 2);
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(sx - 3, sy - 13 + effBob, 6, 1);

            // Spiky Dark Chestnut Hair
            ctx.fillStyle = hair;
            ctx.fillRect(sx - 4, sy - 15 + effBob, 8, 2);
            ctx.fillRect(sx - 3, sy - 16 + effBob, 2, 1); // Spikes
            ctx.fillRect(sx + 1, sy - 16 + effBob, 2, 1);

            // Expressive Tactical Amber Eyes
            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, orange, isBlinking);

            // Assault Carbine (if unarmed)
            if (!equippedWep) {
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx + 4, sy - 8 + effBob, 3, 10);
                ctx.fillStyle = orange;
                ctx.fillRect(sx + 5, sy - 9 + effBob, 1, 2);
            }

        } else if (facing === 'UP') {
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            // Heavy Exo Backplate with Heat Exhaust Vents
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 5, sy - 7 + effBob, 10, 11);
            ctx.fillStyle = armorBase;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 8, 8);
            ctx.fillStyle = orange;
            ctx.fillRect(sx - 3, sy - 4 + effBob, 2, 3); // Vent Left
            ctx.fillRect(sx + 1, sy - 4 + effBob, 2, 3); // Vent Right

            // Back of Spiky Hair & Fluttering Headband knot
            ctx.fillStyle = hair;
            ctx.fillRect(sx - 4, sy - 15 + effBob, 8, 6);
            ctx.fillStyle = headband;
            ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 2);
            ctx.fillRect(sx + 4, sy - 12 + effBob, 2, 4);

        } else if (facing === 'LEFT') {
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 6, 3, 1);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 6, 3, 1);

            // Profile Torso
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 3, sy - 7 + effBob, 7, 11);
            ctx.fillStyle = armorBase;
            ctx.fillRect(sx - 2, sy - 6 + effBob, 5, 9);
            ctx.fillStyle = orange;
            ctx.fillRect(sx - 2, sy - 4 + effBob, 1, 3);

            // Profile Head & Visor
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 3, sy - 12 + effBob, 5, 4);
            ctx.fillStyle = headband;
            ctx.fillRect(sx - 4, sy - 13 + effBob, 6, 2);
            ctx.fillStyle = hair;
            ctx.fillRect(sx - 3, sy - 15 + effBob, 6, 3);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, orange, isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx - 6, sy - 6 + effBob, 6, 3);
                ctx.fillStyle = orange;
                ctx.fillRect(sx - 8, sy - 5 + effBob, 2, 1);
            }

        } else if (facing === 'RIGHT') {
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 6, 3, 1);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 6, 3, 1);

            // Profile Torso
            ctx.fillStyle = armorDark;
            ctx.fillRect(sx - 4, sy - 7 + effBob, 7, 11);
            ctx.fillStyle = armorBase;
            ctx.fillRect(sx - 3, sy - 6 + effBob, 5, 9);
            ctx.fillStyle = orange;
            ctx.fillRect(sx + 1, sy - 4 + effBob, 1, 3);

            // Profile Head & Visor
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 2, sy - 12 + effBob, 5, 4);
            ctx.fillStyle = headband;
            ctx.fillRect(sx - 2, sy - 13 + effBob, 6, 2);
            ctx.fillStyle = hair;
            ctx.fillRect(sx - 3, sy - 15 + effBob, 6, 3);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, orange, isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx, sy - 6 + effBob, 6, 3);
                ctx.fillStyle = orange;
                ctx.fillRect(sx + 6, sy - 5 + effBob, 2, 1);
            }
        }
    }

    drawDetailedFarmerGod(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep) {
        const isBlinking = (Math.floor(Date.now() / 150) % 24 === 0);
        const strawHat = '#fbc02d';
        const strawShadow = '#f57f17';
        const ribbon = '#2e7d32';
        const hair = '#795548';
        const tunic = '#558b2f';
        const overalls = '#4e342e';
        const boots = '#3e2723';
        const skin = '#ffe082';
        const emeraldIris = '#00e676';

        if (facing === 'DOWN') {
            // Sturdy Mud-Tread Boots
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = boots;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = '#21120b';
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            // Verdant Tunic & Overalls
            ctx.fillStyle = tunic;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 8, 10);
            ctx.fillStyle = overalls;
            ctx.fillRect(sx - 3, sy - 2 + effBob, 6, 6); // Overalls bib
            ctx.fillStyle = '#ffd54f'; // Brass buttons
            ctx.fillRect(sx - 3, sy - 1 + effBob, 1, 1);
            ctx.fillRect(sx + 2, sy - 1 + effBob, 1, 1);

            // Living Vine Mantle on Shoulders
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(sx - 5, sy - 5 + effBob, 2, 2);
            ctx.fillRect(sx + 3, sy - 5 + effBob, 2, 2);

            // Sun-kissed Face & Cheerful Cheeks
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 3, sy - 11 + effBob, 6, 4);
            ctx.fillStyle = '#ffab91'; // Rosy cheeks
            ctx.fillRect(sx - 3, sy - 9 + effBob, 1, 1);
            ctx.fillRect(sx + 2, sy - 9 + effBob, 1, 1);

            // Tousled Chestnut Curls
            ctx.fillStyle = hair;
            ctx.fillRect(sx - 4, sy - 12 + effBob, 8, 2);
            ctx.fillRect(sx - 4, sy - 10 + effBob, 1, 2);
            ctx.fillRect(sx + 3, sy - 10 + effBob, 1, 2);

            // Wide Woven Straw Hat
            ctx.fillStyle = strawShadow;
            ctx.fillRect(sx - 7, sy - 13 + effBob, 14, 2);
            ctx.fillStyle = strawHat;
            ctx.fillRect(sx - 7, sy - 14 + effBob, 14, 1);
            ctx.fillRect(sx - 4, sy - 17 + effBob, 8, 3);
            ctx.fillStyle = ribbon;
            ctx.fillRect(sx - 4, sy - 14 + effBob, 8, 1);

            // Vibrant Emerald Eyes
            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, emeraldIris, isBlinking);

            // Celestial Harvesting Sickle (if unarmed)
            if (!equippedWep) {
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx + 5, sy - 8 + effBob, 2, 12);
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 4, sy - 12 + effBob, 5, 2);
                ctx.fillRect(sx + 7, sy - 10 + effBob, 2, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 6, sy - 6 + effBob, 2, 2);
                ctx.fillStyle = '#ffeb3b';
                ctx.fillRect(sx + 6, sy - 6 + effBob, 1, 1);
            }

        } else if (facing === 'UP') {
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = boots;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = '#21120b';
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            ctx.fillStyle = tunic;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 8, 10);
            ctx.fillStyle = overalls;
            ctx.fillRect(sx - 3, sy - 4 + effBob, 2, 7);
            ctx.fillRect(sx + 1, sy - 4 + effBob, 2, 7);
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(sx - 1, sy - 2 + effBob, 2, 2);

            ctx.fillStyle = '#fbc02d';
            ctx.fillRect(sx - 1, sy + 1 + effBob, 2, 2);

            // Straw Hat Back
            ctx.fillStyle = strawShadow;
            ctx.fillRect(sx - 7, sy - 13 + effBob, 14, 2);
            ctx.fillStyle = strawHat;
            ctx.fillRect(sx - 4, sy - 17 + effBob, 8, 4);
            ctx.fillStyle = ribbon;
            ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 1);
            ctx.fillRect(sx + 2, sy - 12 + effBob, 2, 3);

        } else if (facing === 'LEFT') {
            ctx.fillStyle = boots;
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillStyle = '#21120b';
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 6, 3, 1);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 6, 3, 1);

            ctx.fillStyle = tunic;
            ctx.fillRect(sx - 3, sy - 6 + effBob, 6, 10);
            ctx.fillStyle = overalls;
            ctx.fillRect(sx - 2, sy - 1 + effBob, 4, 5);
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(sx + 1, sy + effBob, 2, 3);

            ctx.fillStyle = hair;
            ctx.fillRect(sx - 2, sy - 12 + effBob, 3, 2);
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 3, sy - 11 + effBob, 4, 3);
            ctx.fillStyle = strawShadow;
            ctx.fillRect(sx - 6, sy - 14 + effBob, 11, 2);
            ctx.fillStyle = strawHat;
            ctx.fillRect(sx - 3, sy - 17 + effBob, 6, 3);
            ctx.fillStyle = ribbon;
            ctx.fillRect(sx - 3, sy - 14 + effBob, 6, 1);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, emeraldIris, isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx - 6, sy - 10 + effBob, 4, 2);
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 5, sy - 8 + effBob, 2, 8);
            }

        } else if (facing === 'RIGHT') {
            ctx.fillStyle = boots;
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillStyle = '#21120b';
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 6, 3, 1);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 6, 3, 1);

            ctx.fillStyle = tunic;
            ctx.fillRect(sx - 3, sy - 6 + effBob, 6, 10);
            ctx.fillStyle = overalls;
            ctx.fillRect(sx - 2, sy - 1 + effBob, 4, 5);
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(sx - 3, sy + effBob, 2, 3);

            ctx.fillStyle = hair;
            ctx.fillRect(sx - 1, sy - 12 + effBob, 3, 2);
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 1, sy - 11 + effBob, 4, 3);
            ctx.fillStyle = strawShadow;
            ctx.fillRect(sx - 5, sy - 14 + effBob, 11, 2);
            ctx.fillStyle = strawHat;
            ctx.fillRect(sx - 3, sy - 17 + effBob, 6, 3);
            ctx.fillStyle = ribbon;
            ctx.fillRect(sx - 3, sy - 14 + effBob, 6, 1);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, emeraldIris, isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(sx + 2, sy - 10 + effBob, 4, 2);
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx + 3, sy - 8 + effBob, 2, 8);
            }
        }
    }

    drawDetailedChronoGlitcher(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep) {
        const isBlinking = (Math.floor(Date.now() / 150) % 24 === 0);
        const coatDark = '#12121e';
        const coatMid = '#1e1e2f';
        const violet = '#d500f9';
        const violetGlow = '#e040fb';
        const cyanMonocle = '#00e5ff';
        const silverHair = '#ede7f6';
        const skin = '#fff9c4';

        const isGlitching = (Math.random() < 0.15);
        const gx = isGlitching ? (Math.random() > 0.5 ? 1 : -1) : 0;

        if (facing === 'DOWN') {
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = violet;
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 5 + gx, sy - 6 + effBob, 10, 10);
            ctx.fillStyle = coatMid;
            ctx.fillRect(sx - 4, sy - 6 + effBob, 8, 9);
            ctx.fillStyle = violetGlow;
            ctx.fillRect(sx - 2, sy - 5 + effBob, 1, 8);
            ctx.fillRect(sx + 1, sy - 5 + effBob, 1, 8);

            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(sx - 4, sy - 1 + effBob, 8, 2);
            ctx.fillStyle = cyanMonocle;
            ctx.fillRect(sx - 1, sy - 1 + effBob, 2, 2);

            ctx.fillStyle = skin;
            ctx.fillRect(sx - 3, sy - 11 + effBob, 6, 4);

            ctx.fillStyle = silverHair;
            ctx.fillRect(sx - 4, sy - 14 + effBob, 8, 4);
            ctx.fillStyle = '#b39ddb';
            ctx.fillRect(sx + 1, sy - 11 + effBob, 2, 2);

            if (isBlinking) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(sx - 3, sy - 9 + effBob, 3, 1);
                ctx.fillRect(sx + 1, sy - 9 + effBob, 3, 1);
            } else {
                ctx.fillStyle = cyanMonocle;
                ctx.fillRect(sx - 3, sy - 10 + effBob, 3, 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 2, sy - 10 + effBob, 1, 1);
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx - 4, sy - 11 + effBob, 4, 4);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 1, sy - 10 + effBob, 3, 2);
                ctx.fillStyle = violet;
                ctx.fillRect(sx + 1, sy - 10 + effBob, 1, 2);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(sx + 1, sy - 9 + effBob, 1, 1);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 2, sy - 10 + effBob, 1, 1);
            }

            if (!equippedWep) {
                ctx.fillStyle = '#1e1e2f';
                ctx.fillRect(sx - 7, sy - 5 + effBob, 2, 8);
                ctx.fillRect(sx + 5, sy - 5 + effBob, 2, 8);
                ctx.fillStyle = violetGlow;
                ctx.fillRect(sx - 7, sy - 7 + effBob, 2, 3);
                ctx.fillRect(sx + 5, sy - 7 + effBob, 2, 3);
            }

        } else if (facing === 'UP') {
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = violet;
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 5, sy - 6 + effBob, 10, 11);
            ctx.fillStyle = violet;
            ctx.fillRect(sx - 4, sy + 4 + effBob, 8, 1);
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(sx, sy + 1 + effBob, 1, 4);

            // Temporal Reactor Core on Spine
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(sx - 2, sy - 3 + effBob, 4, 4);
            ctx.fillStyle = cyanMonocle;
            ctx.fillRect(sx - 1, sy - 2 + effBob, 2, 2);
            ctx.fillStyle = violetGlow;
            ctx.fillRect(sx - 4, sy - 2 + effBob, 1, 3);
            ctx.fillRect(sx + 3, sy - 2 + effBob, 1, 3);

            ctx.fillStyle = silverHair;
            ctx.fillRect(sx - 4, sy - 14 + effBob, 8, 6);
            ctx.fillStyle = '#b39ddb';
            ctx.fillRect(sx - 3, sy - 10 + effBob, 6, 2);

        } else if (facing === 'LEFT') {
            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillStyle = violet;
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 6, 3, 1);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 6, 3, 1);

            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 3, sy - 6 + effBob, 6, 10);
            ctx.fillStyle = violetGlow;
            ctx.fillRect(sx - 2, sy - 4 + effBob, 1, 6);
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(sx - 2, sy - 1 + effBob, 2, 2);

            ctx.fillStyle = silverHair;
            ctx.fillRect(sx - 3, sy - 14 + effBob, 6, 5);
            ctx.fillStyle = '#b39ddb';
            ctx.fillRect(sx - 2, sy - 11 + effBob, 4, 2);
            ctx.fillStyle = skin;
            ctx.fillRect(sx - 3, sy - 11 + effBob, 3, 3);

            ctx.fillStyle = cyanMonocle;
            ctx.fillRect(sx - 4, sy - 10 + effBob, 3, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 3, sy - 10 + effBob, 1, 1);

            if (!equippedWep) {
                ctx.fillStyle = violetGlow;
                ctx.fillRect(sx - 7, sy - 5 + effBob, 4, 2);
            }

        } else if (facing === 'RIGHT') {
            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillStyle = violet;
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 6, 3, 1);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 6, 3, 1);

            ctx.fillStyle = coatDark;
            ctx.fillRect(sx - 3, sy - 6 + effBob, 6, 10);
            ctx.fillStyle = violetGlow;
            ctx.fillRect(sx + 1, sy - 4 + effBob, 1, 6);
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(sx, sy - 1 + effBob, 2, 2);

            ctx.fillStyle = silverHair;
            ctx.fillRect(sx - 3, sy - 14 + effBob, 6, 5);
            ctx.fillStyle = '#b39ddb';
            ctx.fillRect(sx - 2, sy - 11 + effBob, 4, 2);
            ctx.fillStyle = skin;
            ctx.fillRect(sx, sy - 11 + effBob, 3, 3);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, violet, isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = violetGlow;
                ctx.fillRect(sx + 3, sy - 5 + effBob, 4, 2);
            }
        }
    }

    drawDetailedSolarionArchitect(ctx, char, sx, sy, effBob, facing, walkCycle, equippedWep) {
        const isBlinking = (Math.floor(Date.now() / 150) % 24 === 0);
        const ceramic = '#f8fafc';
        const ceramicShadow = '#cbd5e1';
        const gold = '#f59e0b';
        const cyanCore = '#00e5ff';
        const solarAmber = '#fbbf24';

        if (facing === 'DOWN') {
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            ctx.fillStyle = ceramicShadow;
            ctx.fillRect(sx - 5, sy - 7 + effBob, 10, 11);
            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 4, sy - 7 + effBob, 8, 10);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 5, sy - 7 + effBob, 2, 4);
            ctx.fillRect(sx + 3, sy - 7 + effBob, 2, 4);

            const corePulse = Math.sin(Date.now() / 180) > 0 ? '#ffea00' : '#ff9100';
            ctx.fillStyle = corePulse;
            ctx.fillRect(sx - 2, sy - 5 + effBob, 4, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 1, sy - 4 + effBob, 2, 2);

            const haloSpin = (Date.now() / 600) % (Math.PI * 2);
            ctx.fillStyle = solarAmber;
            ctx.fillRect(sx - 6, sy - 18 + effBob, 12, 1);
            ctx.fillRect(sx - 7, sy - 16 + effBob, 1, 5);
            ctx.fillRect(sx + 6, sy - 16 + effBob, 1, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 5 + Math.cos(haloSpin) * 4, sy - 18 + effBob, 2, 2);
            ctx.fillRect(sx + 3 - Math.cos(haloSpin) * 4, sy - 18 + effBob, 2, 2);

            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 3, sy - 13 + effBob, 6, 6);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 2, sy - 8 + effBob, 1, 2);
            ctx.fillRect(sx + 1, sy - 8 + effBob, 1, 2);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, '#ffd700', isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = gold;
                ctx.fillRect(sx + 5, sy - 12 + effBob, 2, 16);
                ctx.fillStyle = cyanCore;
                ctx.fillRect(sx + 4, sy - 15 + effBob, 4, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 5, sy - 14 + effBob, 2, 2);
            }

        } else if (facing === 'UP') {
            const bOffL = (walkCycle === 0 ? 1 : 0);
            const bOffR = (walkCycle === 1 ? -1 : 0);
            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 4 + bOffL, sy + 4, 3, 2);
            ctx.fillRect(sx + 1 + bOffR, sy + 4, 3, 2);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 4 + bOffL, sy + 6, 3, 1);
            ctx.fillRect(sx + 1 + bOffR, sy + 6, 3, 1);

            ctx.fillStyle = ceramicShadow;
            ctx.fillRect(sx - 5, sy - 7 + effBob, 10, 11);
            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 4, sy - 7 + effBob, 8, 10);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 3, sy - 5 + effBob, 2, 6);
            ctx.fillRect(sx + 1, sy - 5 + effBob, 2, 6);
            ctx.fillStyle = cyanCore;
            ctx.fillRect(sx - 1, sy - 6 + effBob, 2, 7);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 1, sy - 3 + effBob, 2, 2);

            // Halo seen from behind
            ctx.fillStyle = solarAmber;
            ctx.fillRect(sx - 6, sy - 18 + effBob, 12, 1);
            ctx.fillRect(sx - 7, sy - 16 + effBob, 1, 5);
            ctx.fillRect(sx + 6, sy - 16 + effBob, 1, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 4, sy - 19 + effBob, 2, 2);
            ctx.fillRect(sx + 2, sy - 19 + effBob, 2, 2);

        } else if (facing === 'LEFT') {
            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 3 + (walkCycle === 0 ? 2 : -1), sy + 6, 3, 1);
            ctx.fillRect(sx + (walkCycle === 1 ? -2 : 1), sy + 6, 3, 1);

            ctx.fillStyle = ceramicShadow;
            ctx.fillRect(sx - 3, sy - 7 + effBob, 6, 11);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 2, sy - 5 + effBob, 2, 4);
            ctx.fillStyle = cyanCore;
            ctx.fillRect(sx - 1, sy - 3 + effBob, 1, 3);

            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 3, sy - 13 + effBob, 5, 5);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 2, sy - 8 + effBob, 1, 2);

            ctx.fillStyle = solarAmber;
            ctx.fillRect(sx - 1, sy - 17 + effBob, 2, 4);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, '#ffd700', isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = gold;
                ctx.fillRect(sx - 6, sy - 12 + effBob, 2, 14);
                ctx.fillStyle = cyanCore;
                ctx.fillRect(sx - 7, sy - 14 + effBob, 4, 3);
            }

        } else if (facing === 'RIGHT') {
            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 4, 3, 2);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 4, 3, 2);
            ctx.fillStyle = gold;
            ctx.fillRect(sx - 1 + (walkCycle === 0 ? -2 : 1), sy + 6, 3, 1);
            ctx.fillRect(sx + 2 + (walkCycle === 1 ? 2 : -1), sy + 6, 3, 1);

            ctx.fillStyle = ceramicShadow;
            ctx.fillRect(sx - 3, sy - 7 + effBob, 6, 11);
            ctx.fillStyle = gold;
            ctx.fillRect(sx, sy - 5 + effBob, 2, 4);
            ctx.fillStyle = cyanCore;
            ctx.fillRect(sx, sy - 3 + effBob, 1, 3);

            ctx.fillStyle = ceramic;
            ctx.fillRect(sx - 2, sy - 13 + effBob, 5, 5);
            ctx.fillStyle = gold;
            ctx.fillRect(sx + 1, sy - 8 + effBob, 1, 2);

            ctx.fillStyle = solarAmber;
            ctx.fillRect(sx - 1, sy - 17 + effBob, 2, 4);

            this.drawPixelEyes(ctx, sx, sy - 10 + effBob, facing, '#ffd700', isBlinking);

            if (!equippedWep) {
                ctx.fillStyle = gold;
                ctx.fillRect(sx + 4, sy - 12 + effBob, 2, 14);
                ctx.fillStyle = cyanCore;
                ctx.fillRect(sx + 3, sy - 14 + effBob, 4, 3);
            }
        }
    }


    renderChests(chests, camX, camY, map = null) {
        const ctx = this.ctx;
        const heightStep = map ? (map.heightStep || 10) : 10;
        for (const chest of chests) {
            const elev = (map && map.getElevationAt) ? map.getElevationAt(chest.x, chest.y) : 1;
            const sx = Math.round(chest.x) - camX;
            const sy = Math.round(chest.y) - camY - elev * heightStep;
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

    renderSparkles(sparkles, camX, camY, map = null) {
        const ctx = this.ctx;
        const heightStep = map ? (map.heightStep || 10) : 10;
        const tick = Math.floor(Date.now() / 140);
        for (const sp of sparkles) {
            if (sp.collected) continue;
            const elev = (map && map.getElevationAt) ? map.getElevationAt(sp.x, sp.y) : 1;
            const sx = Math.round(sp.x) - camX;
            const sy = Math.round(sp.y) - camY - elev * heightStep;
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

    renderPortals(portals, camX, camY, map = null) {
        if (!portals) return;
        const ctx = this.ctx;
        const heightStep = map ? (map.heightStep || 10) : 10;
        for (const p of portals) {
            const elev = (map && map.getElevationAt) ? map.getElevationAt(p.x, p.y) : 1;
            const sx = Math.round(p.x) - camX;
            const sy = Math.round(p.y) - camY - elev * heightStep;
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

    renderNpcs(npcs, camX, camY, playerPos, map = null) {
        if (!npcs) return;
        const ctx = this.ctx;
        const heightStep = map ? (map.heightStep || 10) : 10;
        const isBlinking = (Math.floor(Date.now() / 150) % 24 === 0);
        const effBob = (Math.sin(Date.now() / 240) > 0.4 ? -1 : 0);

        for (const npc of npcs) {
            const elev = (map && map.getElevationAt) ? map.getElevationAt(npc.x, npc.y) : 1;
            const sx = Math.round(npc.x) - camX;
            const sy = Math.round(npc.y) - camY - elev * heightStep;
            if (sx < -30 || sx > this.width + 30 || sy < -30 || sy > this.height + 30) continue;

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 6, 7, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            const facing = (npc.facing || 'down').toUpperCase();

            // 1. ARCHIVIST_UNIT_7 (High-Tech Gyro Automaton)
            if (npc.id === 'ARCHIVIST_UNIT_7') {
                const floatBob = Math.sin(this.waterAnimTimer * 3.5) * 2;
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(sx, sy - 5 + floatBob, 10, 4, Date.now() / 400, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#0f172a';
                ctx.fillRect(sx - 6, sy - 11 + floatBob, 12, 12);
                ctx.fillStyle = '#00cec9';
                ctx.fillRect(sx - 5, sy - 10 + floatBob, 10, 10);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - 2, sy - 7 + floatBob, 4, 4);
                ctx.fillStyle = '#0984e3';
                ctx.fillRect(sx - 1, sy - 6 + floatBob, 2, 2);

                ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
                ctx.fillRect(sx - 4 + Math.sin(Date.now() / 150) * 3, sy - 14 + floatBob, 2, 2);

            } else {
                // High-Fidelity Humanoid NPC
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(sx - 4, sy + 3, 3, 3);
                ctx.fillRect(sx + 1, sy + 3, 3, 3);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(sx - 4, sy + 5, 3, 1);
                ctx.fillRect(sx + 1, sy + 5, 3, 1);

                ctx.fillStyle = npc.spriteColor || '#6c5ce7';
                ctx.fillRect(sx - 5, sy - 5 + effBob, 10, 9);
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(sx - 5, sy - 1 + effBob, 10, 5);

                ctx.fillStyle = '#f5cba7';
                ctx.fillRect(sx - 3, sy - 11 + effBob, 6, 6);
                ctx.fillStyle = '#ffeaa7';
                ctx.fillRect(sx - 3, sy - 11 + effBob, 6, 5);

                if (npc.id === 'BLACKSMITH_THORNE') {
                    ctx.fillStyle = '#795548';
                    ctx.fillRect(sx - 4, sy - 3 + effBob, 8, 7);
                    ctx.fillStyle = '#bcaaa4';
                    ctx.fillRect(sx - 3, sy - 2 + effBob, 1, 1);
                    ctx.fillRect(sx + 2, sy - 2 + effBob, 1, 1);
                    ctx.fillStyle = '#b0bec5';
                    ctx.fillRect(sx + 5, sy - 7 + effBob, 4, 3);
                    ctx.fillStyle = '#4e342e';
                    ctx.fillRect(sx + 6, sy - 4 + effBob, 2, 9);
                    ctx.fillStyle = '#212121';
                    ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 3);
                    ctx.fillRect(sx - 3, sy - 7 + effBob, 6, 5);

                } else if (npc.id === 'ELDER_OAKHAVEN') {
                    ctx.fillStyle = '#ffd700';
                    ctx.fillRect(sx - 1, sy - 5 + effBob, 2, 9);
                    ctx.fillStyle = '#6d4c41';
                    ctx.fillRect(sx + 5, sy - 15 + effBob, 2, 20);
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillRect(sx + 4, sy - 18 + effBob, 4, 4);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx + 5, sy - 17 + effBob, 2, 2);
                    ctx.fillStyle = '#eceff1';
                    ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 3);
                    ctx.fillRect(sx - 3, sy - 7 + effBob, 6, 6);
                    ctx.fillStyle = '#b0bec5';
                    ctx.fillRect(sx - 1, sy - 4 + effBob, 2, 4);

                } else if (npc.id === 'HERBALIST_MAEVE') {
                    ctx.fillStyle = '#81c784';
                    ctx.fillRect(sx - 4, sy - 3 + effBob, 8, 7);
                    ctx.fillStyle = '#a1887f';
                    ctx.fillRect(sx + 5, sy - 2 + effBob, 5, 5);
                    ctx.fillStyle = '#e91e63';
                    ctx.fillRect(sx + 6, sy - 4 + effBob, 3, 3);
                    ctx.fillStyle = '#76ff03';
                    ctx.fillRect(sx + 5, sy - 3 + effBob, 2, 2);
                    ctx.fillStyle = '#a04000';
                    ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 4);
                    ctx.fillRect(sx + 3, sy - 10 + effBob, 2, 5);

                } else if (npc.id === 'INVENTOR_ZARA') {
                    ctx.fillStyle = '#d97706';
                    ctx.fillRect(sx - 4, sy - 12 + effBob, 8, 3);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(sx - 3, sy - 11 + effBob, 2, 2);
                    ctx.fillRect(sx + 1, sy - 11 + effBob, 2, 2);
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(sx + 5, sy - 7 + effBob, 2, 9);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(sx + 5 + (Math.random() > 0.5 ? 1 : -1), sy - 8 + effBob, 2, 2);
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(sx - 4, sy - 14 + effBob, 8, 3);

                } else if (npc.id === 'COMMANDER_KRELL') {
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(sx - 4, sy - 5 + effBob, 8, 7);
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(sx - 6, sy - 4 + effBob, 2, 8);
                    ctx.fillStyle = '#475569';
                    ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 3);
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(sx - 6, sy - 2 + effBob, 2, 2);
                    ctx.fillStyle = '#64748b';
                    ctx.fillRect(sx - 6, sy + effBob, 2, 7);

                } else if (npc.id === 'ASTRONOMER_NABILAH') {
                    ctx.fillStyle = '#1e1b4b';
                    ctx.fillRect(sx - 5, sy - 5 + effBob, 10, 9);
                    ctx.fillStyle = '#fde047';
                    ctx.fillRect(sx - 3, sy - 2 + effBob, 1, 1);
                    ctx.fillRect(sx + 2, sy + 1 + effBob, 1, 1);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 2);
                    ctx.fillRect(sx - 1, sy - 15 + effBob, 2, 2);
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(sx + 5, sy - 4 + effBob, 4, 4);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(sx + 6, sy - 3 + effBob, 2, 2);

                } else if (npc.id === 'MYSTIC_ROWAN') {
                    ctx.fillStyle = '#581c87';
                    ctx.fillRect(sx - 5, sy - 5 + effBob, 10, 9);
                    const scrollBob = Math.sin(Date.now() / 220) * 3;
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(sx - 8, sy - 6 + effBob + scrollBob, 3, 4);
                    ctx.fillStyle = '#a855f7';
                    ctx.fillRect(sx - 7, sy - 5 + effBob + scrollBob, 1, 2);

                } else {
                    ctx.fillStyle = npc.hairColor || '#475569';
                    ctx.fillRect(sx - 4, sy - 13 + effBob, 8, 3);
                }

                this.drawPixelEyes(ctx, sx, sy - 9 + effBob, facing, '#0284c7', isBlinking);
            }

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

                    ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
                    ctx.fillRect(sx - 32, sy - 35 + bob, 64, 10);
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

    renderGroundResourceNodes(nodes, camX, camY, dt, map = null) {
        const ctx = this.ctx;
        const heightStep = map ? (map.heightStep || 10) : 10;
        for (const node of nodes) {
            const elev = (map && map.getElevationAt) ? map.getElevationAt(node.x, node.y) : 1;
            let sx = Math.round(node.x) - camX;
            let sy = Math.round(node.y) - camY - elev * heightStep;

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

    renderSingleStandingNode(node, camX, camY, dt, player, map = null) {
        const ctx = this.ctx;
        const heightStep = map ? (map.heightStep || 10) : 10;
        const elev = (map && map.getElevationAt) ? map.getElevationAt(node.x, node.y) : 1;
        let sx = Math.round(node.x) - camX;
        let sy = Math.round(node.y) - camY - elev * heightStep;

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

    renderSingleEnemy(enemy, pal, camX, camY, map = null) {
        if (!enemy || enemy.hp <= 0) return;
        const ctx = this.ctx;
        const heightStep = map ? (map.heightStep || 10) : 10;
        const elev = (map && map.getElevationAt) ? map.getElevationAt(enemy.x, enemy.y) : 1;
        const sx = Math.round(enemy.x) - camX;
        const sy = Math.round(enemy.y) - camY - elev * heightStep;

        if (sx < -40 || sx > this.width + 40 || sy < -40 || sy > this.height + 40) return;

        const isBoss = Boolean(enemy.isBoss);
        const isFrenzied = Boolean(enemy.isFrenzied || enemy.frenzyActive);

        // Ground Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + (isBoss ? 8 : 4), isBoss ? 16 : 7, isBoss ? 7 : 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Monster Frenzy Blood-Red Rage Aura
        if (isFrenzied) {
            const ragePulse = 1.0 + 0.2 * Math.sin(Date.now() / 90);
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 23, 68, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, (isBoss ? 24 : 12) * ragePulse, 0, Math.PI * 2);
            ctx.stroke();

            // Streaming Crimson Eye Flare Trails
            const trailAngle = (enemy.facingAngle !== undefined) ? enemy.facingAngle + Math.PI : Date.now() / 120;
            ctx.fillStyle = '#ff1744';
            for (let i = 1; i <= 3; i++) {
                const tx = sx + Math.cos(trailAngle) * (i * 4) + (Math.random() - 0.5) * 3;
                const ty = sy + Math.sin(trailAngle) * (i * 4) - 2;
                ctx.globalAlpha = 0.8 - i * 0.22;
                ctx.fillRect(tx - 1, ty - 1, 3 - i * 0.5, 3 - i * 0.5);
            }
            ctx.restore();
        }

        const type = (enemy.type || '').toUpperCase();

        if (isBoss) {
            this.drawBossMonster(ctx, enemy, pal, sx, sy, isFrenzied);
        } else {
            this.drawRegularMonster(ctx, enemy, pal, sx, sy, type, isFrenzied);
        }

        // Enemy / Boss Health Bar
        if (enemy.hp < enemy.maxHp || isBoss) {
            const barW = isBoss ? 40 : 16;
            const barH = isBoss ? 5 : 3;
            const barY = sy - (isBoss ? 28 : 14);
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(sx - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = isFrenzied ? '#ff1744' : (isBoss ? '#f59e0b' : '#ef4444');
            const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
            ctx.fillRect(sx - barW / 2, barY, Math.round(barW * hpRatio), barH);
        }
    }

    drawRegularMonster(ctx, enemy, pal, sx, sy, type, isFrenzied) {
        const runCycle = Math.sin(Date.now() / 90);

        if (type === 'WOLF' || type === 'CRIMSON_WOLF' || type === 'DIREWOLF') {
            const furBase = isFrenzied ? '#b71c1c' : '#455a64';
            const furDark = isFrenzied ? '#7f0000' : '#263238';
            const furLight = isFrenzied ? '#ef5350' : '#78909c';
            const eyeCol = isFrenzied ? '#ffff00' : '#ff1744';

            ctx.fillStyle = furDark;
            ctx.fillRect(sx - 6 + runCycle * 2, sy + 3, 2, 3);
            ctx.fillRect(sx - 3 - runCycle * 2, sy + 3, 2, 3);
            ctx.fillRect(sx + 2 + runCycle * 2, sy + 3, 2, 3);
            ctx.fillRect(sx + 5 - runCycle * 2, sy + 3, 2, 3);

            ctx.fillStyle = furBase;
            ctx.fillRect(sx - 6, sy - 3, 12, 6);
            ctx.fillStyle = furLight;
            ctx.fillRect(sx - 5, sy - 5, 8, 2);

            ctx.fillStyle = furDark;
            ctx.fillRect(sx - 9, sy - 5 + runCycle, 4, 3);

            ctx.fillStyle = furBase;
            ctx.fillRect(sx + 3, sy - 6, 6, 6);
            ctx.fillStyle = furDark;
            ctx.fillRect(sx + 4, sy - 8, 2, 3);
            ctx.fillRect(sx + 7, sy - 8, 2, 3);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx + 7, sy - 2, 3, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(sx + 9, sy - 3, 2, 1);

            ctx.fillStyle = eyeCol;
            ctx.fillRect(sx + 5, sy - 4, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx + 6, sy - 4, 1, 1);

        } else if (type === 'GOBLIN' || type === 'MARAUDER') {
            const skinCol = '#2e7d32';
            const skinDark = '#1b5e20';
            const eyeCol = isFrenzied ? '#ff0000' : '#ffeb3b';

            ctx.fillStyle = '#3e2723';
            ctx.fillRect(sx - 4 + (runCycle > 0 ? 1 : 0), sy + 3, 3, 2);
            ctx.fillRect(sx + 1 + (runCycle <= 0 ? 1 : 0), sy + 3, 3, 2);

            ctx.fillStyle = '#5d4037';
            ctx.fillRect(sx - 4, sy - 4, 8, 7);

            ctx.fillStyle = skinCol;
            ctx.fillRect(sx - 3, sy - 10, 6, 6);
            ctx.fillStyle = skinDark;
            ctx.fillRect(sx - 6, sy - 8, 3, 2);
            ctx.fillRect(sx + 3, sy - 8, 3, 2);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 2, sy - 5, 1, 2);
            ctx.fillRect(sx + 1, sy - 5, 1, 2);

            ctx.fillStyle = eyeCol;
            ctx.fillRect(sx - 2, sy - 8, 2, 2);
            ctx.fillRect(sx + 1, sy - 8, 2, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(sx - 1, sy - 8, 1, 1);
            ctx.fillRect(sx + 1, sy - 8, 1, 1);

            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(sx + 5, sy - 8, 2, 11);
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(sx + 4, sy - 9, 4, 2);

        } else if (type === 'SHADOW_BAT' || type === 'BAT' || type === 'BLOODWING') {
            const wingFlap = Math.sin(Date.now() / 80) * 4;
            const batCol = isFrenzied ? '#4a0e17' : '#1e1b4b';

            ctx.fillStyle = batCol;
            ctx.fillRect(sx - 10, sy - 4 + wingFlap, 6, 5);
            ctx.fillRect(sx + 4, sy - 4 + wingFlap, 6, 5);
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(sx - 9, sy - 5 + wingFlap, 5, 1);
            ctx.fillRect(sx + 4, sy - 5 + wingFlap, 5, 1);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(sx - 3, sy - 5, 6, 7);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 1, sy - 1, 2, 2);

            ctx.fillStyle = '#ff0055';
            ctx.fillRect(sx - 2, sy - 4, 2, 2);
            ctx.fillRect(sx + 1, sy - 4, 2, 2);

        } else if (type === 'SCORPION' || type === 'DUNE_STALKER') {
            const pincerSnap = Math.sin(Date.now() / 110) * 2;
            const shellCol = isFrenzied ? '#c62828' : '#e65100';
            const shellDark = isFrenzied ? '#8e0000' : '#bf360c';

            ctx.fillStyle = shellDark;
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(sx - 7, sy - 1 + i * 2, 2, 1);
                ctx.fillRect(sx + 5, sy - 1 + i * 2, 2, 1);
            }

            ctx.fillStyle = shellCol;
            ctx.fillRect(sx - 4, sy - 2, 8, 6);
            ctx.fillStyle = shellDark;
            ctx.fillRect(sx - 3, sy, 6, 2);

            ctx.fillStyle = shellCol;
            ctx.fillRect(sx - 7, sy - 5 + pincerSnap, 3, 4);
            ctx.fillRect(sx + 4, sy - 5 - pincerSnap, 3, 4);

            ctx.fillStyle = shellDark;
            ctx.fillRect(sx - 2, sy - 5, 3, 3);
            ctx.fillRect(sx - 3, sy - 8, 3, 3);
            ctx.fillRect(sx - 1, sy - 10, 4, 2);
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(sx + 3, sy - 9, 2, 2);

            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(sx - 2, sy - 2, 1, 1);
            ctx.fillRect(sx + 1, sy - 2, 1, 1);

        } else if (type === 'VOID_STALKER' || type === 'CHASM_BEAST') {
            const tentacleWave = Math.sin(Date.now() / 120);
            ctx.fillStyle = '#18002e';
            ctx.fillRect(sx - 6, sy - 6, 12, 10);
            ctx.fillStyle = '#4a0072';
            ctx.fillRect(sx - 7 + tentacleWave * 2, sy + 3, 3, 4);
            ctx.fillRect(sx + 4 - tentacleWave * 2, sy + 3, 3, 4);
            ctx.fillRect(sx - 8, sy - 2 + tentacleWave, 3, 3);
            ctx.fillRect(sx + 5, sy - 2 - tentacleWave, 3, 3);

            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(sx - 3, sy - 3, 6, 5);
            ctx.fillStyle = '#e040fb';
            ctx.fillRect(sx - 2, sy - 2, 4, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 1, sy - 1, 2, 1);

        } else if (type === 'CYBER_DRONE') {
            const floatBob = Math.sin(Date.now() / 140) * 2;
            ctx.fillStyle = '#37474f';
            ctx.fillRect(sx - 5, sy - 6 + floatBob, 10, 8);
            ctx.fillStyle = '#90a4ae';
            ctx.fillRect(sx - 8, sy - 8 + floatBob, 16, 2);
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(sx - 2, sy - 3 + floatBob, 4, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 1, sy - 2 + floatBob, 2, 1);

        } else if (type === 'IMP') {
            ctx.fillStyle = '#e65100';
            ctx.fillRect(sx - 4, sy - 5, 8, 8);
            ctx.fillStyle = '#bf360c';
            ctx.fillRect(sx - 4, sy - 8, 2, 3);
            ctx.fillRect(sx + 2, sy - 8, 2, 3);
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(sx + 5, sy - 8, 2, 11);
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(sx - 2, sy - 3, 2, 2);
            ctx.fillRect(sx + 1, sy - 3, 2, 2);

        } else if (type === 'WYVERN') {
            const wingFlap = Math.sin(Date.now() / 90) * 3;
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(sx - 9, sy - 5 + wingFlap, 5, 6);
            ctx.fillRect(sx + 4, sy - 5 + wingFlap, 5, 6);
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(sx - 4, sy - 6, 8, 8);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(sx - 1, sy - 8, 2, 2);
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(sx + 1, sy - 4, 2, 2);

        } else {
            ctx.fillStyle = pal[1] || '#455a64';
            ctx.fillRect(sx - 6, sy - 6, 12, 10);
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(sx - 3, sy - 4, 3, 3);
            ctx.fillRect(sx + 1, sy - 4, 3, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 2, sy - 3, 1, 1);
            ctx.fillRect(sx + 2, sy - 3, 1, 1);
        }
    }

    drawBossMonster(ctx, enemy, pal, sx, sy, isFrenzied) {
        const type = (enemy.type || '').toUpperCase();
        const bossId = (enemy.id || '').toUpperCase();

        if (type === 'CINDER_GOLEM' || bossId.includes('CINDER') || bossId.includes('GOLEM')) {
            const magmaPulse = Math.sin(Date.now() / 150) > 0 ? '#ff5722' : '#ff9800';
            ctx.fillStyle = '#100c08';
            ctx.fillRect(sx - 16, sy - 20, 32, 28);
            ctx.fillStyle = magmaPulse;
            ctx.fillRect(sx - 12, sy - 14, 24, 3);
            ctx.fillRect(sx - 6, sy - 8, 12, 4);
            ctx.fillRect(sx - 2, sy - 18, 4, 24);
            ctx.fillStyle = '#ff3d00';
            ctx.fillRect(sx - 18, sy - 24, 4, 8);
            ctx.fillRect(sx + 14, sy - 24, 4, 8);
            ctx.fillStyle = '#ffea00';
            ctx.fillRect(sx - 4, sy - 12, 8, 6);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 2, sy - 11, 4, 3);

        } else if (type === 'DUNE_TYRANT' || bossId.includes('DUNE') || bossId.includes('REAVER')) {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(sx - 16, sy - 20, 32, 28);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(sx - 14, sy - 18, 28, 4);
            ctx.fillRect(sx - 12, sy - 8, 24, 3);
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(sx - 8, sy - 12, 4, 4);
            ctx.fillRect(sx + 4, sy - 12, 4, 4);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(sx - 20, sy - 24, 4, 22);
            ctx.fillRect(sx + 16, sy - 24, 4, 22);

        } else if (type === 'FROST_WRAITH' || bossId.includes('ZENITH') || bossId.includes('ARCHON') || type === 'BOSS') {
            const wingSway = Math.sin(Date.now() / 160) * 3;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.fillRect(sx - 24, sy - 18 + wingSway, 10, 18);
            ctx.fillRect(sx + 14, sy - 18 - wingSway, 10, 18);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(sx - 14, sy - 20, 28, 26);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(sx - 10, sy - 16, 20, 18);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(sx - 12, sy - 24, 24, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 6, sy - 12, 4, 3);
            ctx.fillRect(sx + 2, sy - 12, 4, 3);

        } else {
            ctx.fillStyle = pal[0] || '#263238';
            ctx.fillRect(sx - 16, sy - 20, 32, 28);
            ctx.fillStyle = '#455a64';
            ctx.fillRect(sx - 16, sy - 20, 32, 3);
            ctx.fillRect(sx - 16, sy + 5, 32, 3);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(sx - 12, sy - 8, 6, 6);
            ctx.fillRect(sx + 6, sy - 8, 6, 6);
            ctx.fillStyle = '#78909c';
            ctx.fillRect(sx - 14, sy - 24, 4, 5);
            ctx.fillRect(sx + 10, sy - 24, 4, 5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillRect(sx - 15, sy - 27 + (Date.now() / 60 % 4), 5, 3);
            ctx.fillRect(sx + 9, sy - 27 + (Date.now() / 60 % 4), 5, 3);

            const coreColor = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ff1744' : '#d50000';
            ctx.fillStyle = coreColor;
            ctx.fillRect(sx - 6, sy - 11, 12, 9);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 2, sy - 8, 4, 3);
        }

        if (enemy.telegraphTimer > 0) {
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx, sy + 80);
            ctx.stroke();
            ctx.setLineDash([]);
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


    // =========================================================================
    // PROCEDURAL AMBIENT ENVIRONMENTAL PARTICLES
    // =========================================================================

    initAmbientParticles(areaId) {
        this.ambientParticleArea = areaId || 'DEFAULT';
        this.ambientParticles = [];
        const count = 45;

        for (let i = 0; i < count; i++) {
            this.ambientParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 12,
                size: 1 + Math.floor(Math.random() * 2),
                alpha: 0.3 + Math.random() * 0.7,
                pulseSpeed: 1.5 + Math.random() * 3.0,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    renderAmbientParticles(camX, camY, dt, map = null) {
        const areaId = (map && map.areaId) ? map.areaId : 'DEFAULT';
        if (this.ambientParticles.length === 0 || this.ambientParticleArea !== areaId) {
            this.initAmbientParticles(areaId);
        }

        const ctx = this.ctx;
        const isDunes = areaId.includes('DUNE') || areaId.includes('SOLARIS');
        const isGlacier = areaId.includes('GLACIAL') || areaId.includes('FROST');
        const isVolcano = areaId.includes('ASHEN') || areaId.includes('CHASM');
        const isSubCore = areaId.includes('SUB_CORE') || areaId.includes('GROTTO') || areaId.includes('BEDROCK');

        ctx.save();

        for (const p of this.ambientParticles) {
            p.phase += dt * p.pulseSpeed;
            const currentAlpha = Math.max(0.1, Math.min(1.0, p.alpha * (0.6 + 0.4 * Math.sin(p.phase))));

            if (isGlacier) {
                p.vx = -18 + Math.sin(p.phase) * 6;
                p.vy = 22 + Math.cos(p.phase) * 4;
            } else if (isVolcano) {
                p.vx = (Math.random() - 0.5) * 14;
                p.vy = -26 - Math.random() * 8;
            } else if (isDunes) {
                p.vx = 28 + Math.sin(p.phase) * 8;
                p.vy = (Math.random() - 0.5) * 6;
            } else if (isSubCore) {
                p.vx = Math.cos(p.phase) * 12;
                p.vy = Math.sin(p.phase) * 12;
            } else {
                p.vx = Math.cos(p.phase) * 10;
                p.vy = Math.sin(p.phase) * 8;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.x < 0) p.x += this.width;
            if (p.x > this.width) p.x -= this.width;
            if (p.y < 0) p.y += this.height;
            if (p.y > this.height) p.y -= this.height;

            if (isGlacier) {
                ctx.fillStyle = `rgba(224, 242, 254, ${currentAlpha})`;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
            } else if (isVolcano) {
                ctx.fillStyle = `rgba(255, 87, 34, ${currentAlpha})`;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
            } else if (isDunes) {
                ctx.fillStyle = `rgba(251, 191, 36, ${currentAlpha * 0.7})`;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
            } else if (isSubCore) {
                ctx.fillStyle = `rgba(0, 229, 255, ${currentAlpha})`;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
            } else {
                ctx.fillStyle = `rgba(118, 255, 3, ${currentAlpha})`;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size + 1, p.size + 1);
            }
        }

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
                const elev = map.getElevationAt ? map.getElevationAt(node.x, node.y) : 1;
                renderList.push({
                    type: 'NODE',
                    y: node.y + 4 + elev * 16,
                    elevation: elev,
                    ref: node
                });
            }
        }

        // 2. Player
        if (player) {
            const elev = map && map.getElevationAt ? map.getElevationAt(player.pos.x, player.pos.y) : (player.groundElevation || 1);
            renderList.push({
                type: 'PLAYER',
                y: player.pos.y + 6 + elev * 16,
                elevation: elev,
                ref: player
            });

            // Active Class Summons
            if (player.activePrisms && player.activePrisms.length > 0) {
                for (const prism of player.activePrisms) {
                    const pelev = map && map.getElevationAt ? map.getElevationAt(prism.x, prism.y) : elev;
                    renderList.push({
                        type: 'PRISM',
                        y: prism.y + 4 + pelev * 16,
                        elevation: pelev,
                        ref: prism
                    });
                }
            }
            if (player.activeDecoy) {
                const delev = map && map.getElevationAt ? map.getElevationAt(player.activeDecoy.x, player.activeDecoy.y) : elev;
                renderList.push({
                    type: 'DECOY',
                    y: player.activeDecoy.y + 6 + delev * 16,
                    elevation: delev,
                    ref: player.activeDecoy
                });
            }
        }

        // 3. Enemies
        if (enemies && enemies.length > 0) {
            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const elev = map && map.getElevationAt ? map.getElevationAt(enemy.x, enemy.y) : 1;
                renderList.push({
                    type: 'ENEMY',
                    y: enemy.y + (enemy.isBoss ? 8 : 5) + elev * 16,
                    elevation: elev,
                    ref: enemy
                });
            }
        }

        // 4. NPCs
        if (npcs && npcs.length > 0) {
            for (const npc of npcs) {
                const elev = map && map.getElevationAt ? map.getElevationAt(npc.x, npc.y) : 1;
                renderList.push({
                    type: 'NPC',
                    y: npc.y + 6 + elev * 16,
                    elevation: elev,
                    ref: npc
                });
            }
        }

        // 5. Critters
        if (critters && critters.critters && critters.critters.length > 0) {
            for (const c of critters.critters) {
                const elev = map && map.getElevationAt ? map.getElevationAt(c.x, c.y) : 1;
                renderList.push({
                    type: 'CRITTER',
                    y: c.y + 2 + elev * 16,
                    elevation: elev,
                    ref: c
                });
            }
        }

        // Unified 3D Y-sorting: entities with smaller sorting order draw FIRST
        renderList.sort((a, b) => a.y - b.y);

        // Render sorted entities in precise depth order
        for (const item of renderList) {
            if (item.type === 'PLAYER') {
                this.renderCharacter(player, map.palette.colors, map);
            } else if (item.type === 'NODE') {
                this.renderSingleStandingNode(item.ref, camX, camY, dt, player, map);
            } else if (item.type === 'ENEMY') {
                this.renderSingleEnemy(item.ref, map.palette.colors, camX, camY, map);
            } else if (item.type === 'NPC') {
                this.renderNpcs([item.ref], camX, camY, player.pos, map);
            } else if (item.type === 'CRITTER') {
                if (critters.renderSingle) {
                    critters.renderSingle(this.ctx, item.ref, camX, camY, isNight, map);
                }
            } else if (item.type === 'PRISM') {
                this.renderSinglePrism(item.ref, camX, camY, dt, map);
            } else if (item.type === 'DECOY') {
                this.renderSingleDecoy(item.ref, camX, camY, dt, map);
            }
        }

        // Ambient Environmental Particles (Fireflies, Leaves, Sand, Snowflakes, Embers, Nanite Dust)
        this.renderAmbientParticles(camX, camY, dt, map);
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

    renderFrenzyVignette(dt, intensity = 1.0) {
        const ctx = this.ctx;
        if (!ctx) return;
        const w = this.width || 480;
        const h = this.height || 320;
        const t = Date.now() / 1000;
        const pulse = 0.55 + Math.sin(t * 5.0) * 0.25;

        ctx.save();
        // Pulsing blood-crimson radial vignette
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
        grad.addColorStop(0, 'rgba(180, 0, 0, 0)');
        grad.addColorStop(0.65, `rgba(180, 0, 20, ${0.28 * pulse * intensity})`);
        grad.addColorStop(1, `rgba(230, 0, 0, ${0.68 * pulse * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Frenzy Alert Banner at top of viewport
        ctx.fillStyle = 'rgba(15, 0, 4, 0.85)';
        ctx.fillRect(w / 2 - 120, 6, 240, 16);
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 1;
        ctx.strokeRect(w / 2 - 120, 6, 240, 16);

        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = (Math.floor(t * 4) % 2 === 0) ? '#ff5252' : '#ffffff';
        ctx.fillText('⚠️ NIGHT MONSTER FRENZY ⚠️', w / 2, 17);
        ctx.restore();
    }

    renderTitleBackdrop(dt) {
        this.titleAnimTimer = Math.max(0, (this.titleAnimTimer || 0) + Math.max(0, (dt || 0.016)));
        const ctx = this.ctx;
        if (!ctx) return;
        const w = this.width || (this.canvas ? this.canvas.width : 480);
        const h = this.height || (this.canvas ? this.canvas.height : 320);
        const t = this.titleAnimTimer;

        // 1. Unified Dyson Luminary Celestial Engine (Sun & Moon as One)
        // Dynamic Celestial Sky & Horizon (Dyson Luminary & Mountain Backdrop)
        // Phases:
        // ECLIPSE // SHUTTERS ENGAGED
        // WAXING CRESCENT // LUNAR APERTURE
        // SOLAR DAWN // APERTURE VENTING
        // SOLAR ZENITH // THERMAL MAXIMUM
        // RED GIANT // CORONAL SHIELDING
        // Render Dyson Sphere Megastructure Orbital Lattice Rings
        // Render Solar Rays / Corona Flares
        const cycleDuration = 32.0; // 32 seconds full celestial cycle
        let cycle = ((t * 0.1) % cycleDuration) / cycleDuration;
        if (isNaN(cycle) || cycle < 0) cycle = 0;
        if (cycle >= 1.0) cycle = cycle % 1.0;

        const KEYFRAMES = [
            // 0: Eclipse / Waxing Crescent (Lunar Mode)
            { top: [2, 5, 14], mid: [9, 17, 34], bot: [20, 32, 54], mtn: [10, 16, 29], star: 0.95, rim: [0, 229, 255, 0.35], ring: [0, 229, 255, 0.25] },
            // 1: Solar Dawn (Transition Mode)
            { top: [18, 13, 32], mid: [38, 22, 42], bot: [60, 32, 42], mtn: [20, 20, 36], star: 0.55, rim: [255, 170, 0, 0.45], ring: [255, 183, 77, 0.30] },
            // 2: Radiant Solar Zenith (Sun Mode)
            { top: [15, 35, 58], mid: [28, 54, 82], bot: [45, 75, 104], mtn: [26, 34, 48], star: 0.15, rim: [255, 213, 79, 0.60], ring: [255, 213, 79, 0.35] },
            // 3: Red Giant (Cooling Flare Mode)
            { top: [34, 11, 24], mid: [28, 10, 34], bot: [14, 11, 28], mtn: [23, 15, 26], star: 0.45, rim: [255, 82, 82, 0.50], ring: [255, 82, 82, 0.35] }
        ];

        const phaseProgress = Math.abs(cycle * 4);
        const currentPhase = (Math.floor(phaseProgress) % 4 + 4) % 4;
        const nextPhase = (currentPhase + 1) % 4;
        const localT = Math.max(0, Math.min(1, phaseProgress - Math.floor(phaseProgress)));
        const smoothT = 0.5 - 0.5 * Math.cos(localT * Math.PI);

        const kfA = KEYFRAMES[currentPhase] || KEYFRAMES[0];
        const kfB = KEYFRAMES[nextPhase] || KEYFRAMES[1];
        const lerp = (a, b, factor) => a + (b - a) * factor;
        const safeColor = (c, def) => (Array.isArray(c) && c.length >= 3 ? c : def);
        const colorA_top = safeColor(kfA.top, [2, 5, 14]);
        const colorB_top = safeColor(kfB.top, [18, 13, 32]);
        const colorA_mid = safeColor(kfA.mid, [9, 17, 34]);
        const colorB_mid = safeColor(kfB.mid, [38, 22, 42]);
        const colorA_bot = safeColor(kfA.bot, [20, 32, 54]);
        const colorB_bot = safeColor(kfB.bot, [60, 32, 42]);
        const colorA_mtn = safeColor(kfA.mtn, [10, 16, 29]);
        const colorB_mtn = safeColor(kfB.mtn, [20, 20, 36]);
        const colorA_rim = (Array.isArray(kfA.rim) && kfA.rim.length >= 4) ? kfA.rim : [0, 229, 255, 0.35];
        const colorB_rim = (Array.isArray(kfB.rim) && kfB.rim.length >= 4) ? kfB.rim : [255, 170, 0, 0.45];
        const colorA_ring = (Array.isArray(kfA.ring) && kfA.ring.length >= 4) ? kfA.ring : [0, 229, 255, 0.25];
        const colorB_ring = (Array.isArray(kfB.ring) && kfB.ring.length >= 4) ? kfB.ring : [255, 183, 77, 0.30];

        const lerpColor = (cA, cB, factor) => `rgb(${Math.round(lerp(cA[0], cB[0], factor))}, ${Math.round(lerp(cA[1], cB[1], factor))}, ${Math.round(lerp(cA[2], cB[2], factor))})`;
        const lerpRgba = (cA, cB, factor) => `rgba(${Math.round(lerp(cA[0], cB[0], factor))}, ${Math.round(lerp(cA[1], cB[1], factor))}, ${Math.round(lerp(cA[2], cB[2], factor))}, ${lerp(cA[3], cB[3], factor).toFixed(3)})`;

        const skyTop = lerpColor(colorA_top, colorB_top, smoothT);
        const skyMid = lerpColor(colorA_mid, colorB_mid, smoothT);
        const skyBottom = lerpColor(colorA_bot, colorB_bot, smoothT);
        const mountainTint = lerpColor(colorA_mtn, colorB_mtn, smoothT);
        const starAlpha = lerp(typeof kfA.star === 'number' ? kfA.star : 0.5, typeof kfB.star === 'number' ? kfB.star : 0.5, smoothT);
        const rimColor = lerpRgba(colorA_rim, colorB_rim, smoothT);
        const ringColor = lerpRgba(colorA_ring, colorB_ring, smoothT);

        // Render dynamic celestial sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
        skyGrad.addColorStop(0, skyTop);
        skyGrad.addColorStop(0.5, skyMid);
        skyGrad.addColorStop(1, skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Twinkling background stars in the upper sky
        if (starAlpha > 0.05) {
            for (let i = 0; i < 45; i++) {
                const seed = (i * 137) % 1000;
                const sx = (seed * 9.7) % w;
                const sy = (seed * 3.3) % (h * 0.48);
                const twinkle = Math.sin(t * 3.0 + i) * 0.5 + 0.5;
                const alpha = starAlpha * (0.3 + 0.7 * twinkle);
                ctx.fillStyle = (i % 5 === 0) ? `rgba(128, 222, 234, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
                const size = (i % 7 === 0) ? 2 : 1;
                ctx.fillRect(Math.floor(sx), Math.floor(sy), size, size);
            }
        }

        // 1B. Persistent Radiant Beacon Stars for Player Saves (User Requirement)
        // Shines 24/7 across all day/night phases on the Title Screen
        let saveSlots = (this.game && this.game.saveSlots) ? this.game.saveSlots : null;
        if (!saveSlots) {
            try {
                const raw = localStorage.getItem('aether_save_slots');
                if (raw) saveSlots = JSON.parse(raw);
            } catch (e) {}
        }
        
        const activeSaves = [];
        if (Array.isArray(saveSlots)) {
            for (let sIdx = 0; sIdx < saveSlots.length; sIdx++) {
                if (saveSlots[sIdx]) {
                    activeSaves.push({ slot: saveSlots[sIdx], index: sIdx });
                }
            }
        }

        // Fixed constellation coordinates across upper sky (xRatio, yRatio)
        const CONSTELLATION_POINTS = [
            { rx: 0.12, ry: 0.10 }, // Slot 1
            { rx: 0.22, ry: 0.07 }, // Slot 2
            { rx: 0.32, ry: 0.13 }, // Slot 3
            { rx: 0.42, ry: 0.08 }, // Slot 4
            { rx: 0.52, ry: 0.12 }, // Slot 5
            { rx: 0.62, ry: 0.07 }, // Slot 6
            { rx: 0.72, ry: 0.14 }, // Slot 7
            { rx: 0.18, ry: 0.20 }, // Slot 8
            { rx: 0.38, ry: 0.22 }, // Slot 9
            { rx: 0.58, ry: 0.20 }  // Slot 10
        ];

        this.saveStarPositions = [];

        // Save stars float independently in the upper sky (disconnected for pristine look)

        // Draw each persistent bright save star
        for (let a = 0; a < activeSaves.length; a++) {
            const saveObj = activeSaves[a];
            const pt = CONSTELLATION_POINTS[saveObj.index % CONSTELLATION_POINTS.length];
            const sx = Math.round(w * pt.rx);
            const sy = Math.round(h * pt.ry);
            this.saveStarPositions.push({ x: sx, y: sy, slot: saveObj.slot, index: saveObj.index });

            const pulse = 1.0 + 0.22 * Math.sin(t * 3.2 + saveObj.index * 1.7);
            const flareLen = (12 + 4 * Math.sin(t * 4.0 + saveObj.index)) * pulse;

            ctx.save();
            // Outer radiant aura bloom (cyan & gold)
            const starGlow = ctx.createRadialGradient(sx, sy, 1, sx, sy, 16 * pulse);
            starGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            starGlow.addColorStop(0.3, 'rgba(0, 229, 255, 0.75)');
            starGlow.addColorStop(0.65, 'rgba(255, 213, 79, 0.35)');
            starGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = starGlow;
            ctx.beginPath();
            ctx.arc(sx, sy, 16 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // 4-Point Diamond Cross Flare
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx - flareLen, sy);
            ctx.lineTo(sx + flareLen, sy);
            ctx.moveTo(sx, sy - flareLen);
            ctx.lineTo(sx, sy + flareLen);
            ctx.stroke();

            // Diagonal mini spikes
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
            ctx.lineWidth = 1;
            const diagLen = flareLen * 0.55;
            ctx.beginPath();
            ctx.moveTo(sx - diagLen, sy - diagLen);
            ctx.lineTo(sx + diagLen, sy + diagLen);
            ctx.moveTo(sx - diagLen, sy + diagLen);
            ctx.lineTo(sx + diagLen, sy - diagLen);
            ctx.stroke();

            // Core incandescent spark
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Pioneer Slot Badge tag above star
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 213, 79, 0.9)';
            ctx.fillText(`★S0${saveObj.index + 1}`, sx, sy - flareLen - 3);

            ctx.restore();
        }

        // Render Dyson Luminary Orb (Image 3/4)
        const lumX = Math.round(w * 0.80);
        const lumY = Math.round(h * 0.18);
        const lumRadius = 24;

        ctx.save();
        ctx.translate(lumX, lumY);
        const rotAngle = t * 0.15;

        // Concentric outer containment rings
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, lumRadius + 14, lumRadius + 6, rotAngle * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(0, 0, lumRadius + 9, lumRadius + 16, -rotAngle * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Solar rays and corona flares
        const sunWeight = Math.sin(cycle * Math.PI);
        if (sunWeight > 0.05) {
            const isRedGiant = (cycle >= 0.70);
            const rayCount = 8;
            const rayLength = 18 + 14 * sunWeight;
            const rayPulse = 1.0 + 0.15 * Math.sin(t * 4);

            for (let r = 0; r < rayCount; r++) {
                const angle = (r * Math.PI * 2) / rayCount + rotAngle * 0.3;
                const innerX = Math.cos(angle) * (lumRadius + 2);
                const innerY = Math.sin(angle) * (lumRadius + 2);
                const outerX = Math.cos(angle) * (lumRadius + rayLength * rayPulse);
                const outerY = Math.sin(angle) * (lumRadius + rayLength * rayPulse);

                ctx.strokeStyle = isRedGiant 
                    ? `rgba(255, 87, 34, ${(0.35 + 0.2 * Math.sin(angle * 2 + t)) * sunWeight})` 
                    : `rgba(255, 215, 64, ${(0.45 + 0.25 * Math.sin(angle * 2 + t)) * sunWeight})`;
                ctx.lineWidth = (r % 2 === 0) ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(innerX, innerY);
                ctx.lineTo(outerX, outerY);
                ctx.stroke();
            }

            // Corona glow
            const coronaGlow = ctx.createRadialGradient(0, 0, lumRadius * 0.8, 0, 0, lumRadius * 2.6);
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
            ctx.arc(0, 0, lumRadius * 2.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Core Dyson Luminary Orb Body
        if (cycle >= 0.50 && cycle < 0.75) {
            // High Solar Zenith
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();
            const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, lumRadius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, '#fff59d');
            grad.addColorStop(0.8, '#ffb300');
            grad.addColorStop(1, '#ff6f00');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();
        } else if (cycle >= 0.75) {
            // Red Giant
            ctx.fillStyle = '#ff3d00';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();
            const grad = ctx.createRadialGradient(-4, -4, 3, 0, 0, lumRadius);
            grad.addColorStop(0, '#ff6e40');
            grad.addColorStop(0.6, '#dd2c00');
            grad.addColorStop(1, '#880e4f');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Eclipse / Silver Moon
            ctx.fillStyle = '#101624';
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, 0, Math.PI * 2);
            ctx.fill();
            const crescentGrad = ctx.createLinearGradient(-lumRadius, -lumRadius, lumRadius, lumRadius);
            crescentGrad.addColorStop(0, '#e0f7fa');
            crescentGrad.addColorStop(0.3, '#80deea');
            crescentGrad.addColorStop(0.6, '#00acc1');
            crescentGrad.addColorStop(1, '#006064');
            ctx.fillStyle = crescentGrad;
            ctx.beginPath();
            ctx.arc(0, 0, lumRadius, -Math.PI * 0.45, Math.PI * 0.55);
            ctx.arc(lumRadius * 0.38, 0, lumRadius * 0.88, Math.PI * 0.55, -Math.PI * 0.45, true);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Mountain Ridge Silhouette across horizon
        const mtnBaseY = Math.round(h * 0.38);
        ctx.fillStyle = mountainTint;
        ctx.beginPath();
        ctx.moveTo(0, mtnBaseY + 8);
        ctx.lineTo(w * 0.16, mtnBaseY - 22);
        ctx.lineTo(w * 0.32, mtnBaseY - 4);
        ctx.lineTo(w * 0.50, mtnBaseY - 26);
        ctx.lineTo(w * 0.68, mtnBaseY - 8);
        ctx.lineTo(w * 0.82, mtnBaseY - 28);
        ctx.lineTo(w, mtnBaseY - 6);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Mountain edge rim light
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, mtnBaseY + 8);
        ctx.lineTo(w * 0.16, mtnBaseY - 22);
        ctx.lineTo(w * 0.32, mtnBaseY - 4);
        ctx.lineTo(w * 0.50, mtnBaseY - 26);
        ctx.lineTo(w * 0.68, mtnBaseY - 8);
        ctx.lineTo(w * 0.82, mtnBaseY - 28);
        ctx.lineTo(w, mtnBaseY - 6);
        ctx.stroke();

        // 2. Isometric Forest Floor & Real-World Time of Day Grass Engine (User Requirement)
        // Diamond rhombic grid projection
        const tileW = 56;
        const tileH = 28;
        const originX = Math.floor(w / 2);
        const originY = Math.floor(h * 0.46);

        // Real-world local clock sampling
        const realDate = new Date();
        const realHour = realDate.getHours() + realDate.getMinutes() / 60.0; // 0.0 to 24.0

        // Real-world natural lighting phase configurations:
        // Dawn:  05:00 - 08:30 (5.0 to 8.5)
        // Day:   08:30 - 17:30 (8.5 to 17.5)
        // Dusk:  17:30 - 20:30 (17.5 to 20.5)
        // Night: 20:30 - 05:00 (20.5 to 5.0)
        let grassBaseDark, grassBaseLight, grassBladeColor, grassTipColor, pathDark, pathLight;
        let isNight = false, isDawn = false, isDusk = false;

        if (realHour >= 5.0 && realHour < 8.5) {
            // Dawn: Soft cool morning mist, fresh emeralds, glistening dew
            isDawn = true;
            grassBaseDark = '#1d3f25';
            grassBaseLight = '#275231';
            grassBladeColor = '#388e3c';
            grassTipColor = '#a5d6a7';
            pathDark = '#2c4a36';
            pathLight = '#3b5c46';
        } else if (realHour >= 8.5 && realHour < 17.5) {
            // Day: High vivid sunlit emeralds and colorful wildflowers
            grassBaseDark = '#1c3620';
            grassBaseLight = '#234428';
            grassBladeColor = '#2e7d32';
            grassTipColor = '#81c784';
            pathDark = '#2c4233';
            pathLight = '#37523f';
        } else if (realHour >= 17.5 && realHour < 20.5) {
            // Dusk: Amber/bronze twilight tones, warm sunset glints
            isDusk = true;
            grassBaseDark = '#2c351b';
            grassBaseLight = '#3a4422';
            grassBladeColor = '#556832';
            grassTipColor = '#ffb74d';
            pathDark = '#383b2a';
            pathLight = '#494c36';
        } else {
            // Night: Deep nocturnal forest floor with BIOLUMINESCENT PHOSPHOR TIPS
            isNight = true;
            grassBaseDark = '#0a170f';
            grassBaseLight = '#102216';
            grassBladeColor = '#143820';
            grassTipColor = 'rgba(0, 229, 255, 0.85)'; // Bioluminescent cyan glow
            pathDark = '#111a14';
            pathLight = '#18261e';
        }

        const cols = 15;
        const rows = 15;
        for (let r = -rows; r <= rows; r++) {
            for (let c = -cols; c <= cols; c++) {
                const ix = originX + (c - r) * (tileW / 2);
                const iy = originY + (c + r) * (tileH / 2);

                if (ix < -tileW || ix > w + tileW || iy < mtnBaseY - 2 || iy > h + tileH) continue;

                // Diagonal stone/clearing path and alternating grass checkerboard
                const isDiagPath = Math.abs(c - r) <= 1 || (c + r >= -1 && c + r <= 1);
                const isCheck = (Math.abs(c + r)) % 2 === 0;

                let tileColor;
                if (isDiagPath) {
                    tileColor = isCheck ? pathDark : pathLight;
                } else {
                    tileColor = isCheck ? grassBaseDark : grassBaseLight;
                }

                ctx.fillStyle = tileColor;
                ctx.beginPath();
                ctx.moveTo(ix, iy - tileH / 2);
                ctx.lineTo(ix + tileW / 2, iy);
                ctx.lineTo(ix, iy + tileH / 2);
                ctx.lineTo(ix - tileW / 2, iy);
                ctx.closePath();
                ctx.fill();

                // Isometric tile border line
                ctx.strokeStyle = isNight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.22)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Detailed Multi-Blade Grass Tufts & Wildflowers
                const seed = Math.abs(c * 23 + r * 37) % 100;
                if (seed < 45 && !isDiagPath) {
                    // Wind wave ripple across the meadow
                    const windWave = Math.sin(t * 2.3 + ix * 0.035 + iy * 0.05);
                    const sway = windWave * 2.2;

                    // Blade 1: Left curving blade
                    ctx.strokeStyle = grassBladeColor;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(ix - 3, iy);
                    ctx.quadraticCurveTo(ix - 5 + sway * 0.7, iy - 4, ix - 6 + sway, iy - 6);
                    ctx.stroke();

                    // Blade 2: Center taller blade
                    ctx.beginPath();
                    ctx.moveTo(ix, iy + 1);
                    ctx.quadraticCurveTo(ix + sway * 0.5, iy - 5, ix + 1 + sway, iy - 8);
                    ctx.stroke();

                    // Blade 3: Right curving blade
                    ctx.beginPath();
                    ctx.moveTo(ix + 3, iy);
                    ctx.quadraticCurveTo(ix + 4 + sway * 0.6, iy - 3, ix + 5 + sway, iy - 5);
                    ctx.stroke();

                    // Blade Tip Highlights / Dew / Bioluminescence
                    ctx.fillStyle = grassTipColor;
                    if (isNight) {
                        // Bioluminescent glowing tips
                        ctx.fillRect(ix + 1 + Math.round(sway), iy - 8, 1.5, 1.5);
                        if (seed % 3 === 0) {
                            ctx.fillStyle = 'rgba(105, 240, 174, 0.9)';
                            ctx.fillRect(ix - 6 + Math.round(sway), iy - 6, 1.5, 1.5);
                        }
                    } else if (isDawn) {
                        // Glistening morning dew drops
                        ctx.fillStyle = 'rgba(224, 247, 250, 0.95)';
                        ctx.fillRect(ix + 1 + Math.round(sway), iy - 8, 1, 1);
                    } else {
                        // Sunlit blade tips
                        ctx.fillRect(ix + 1 + Math.round(sway), iy - 8, 1, 1);
                    }
                } else if (seed > 92 && !isDiagPath && !isNight) {
                    // Daytime & Dawn Wildflowers
                    const flowerType = seed % 3;
                    const sway = Math.sin(t * 2.3 + ix * 0.035 + iy * 0.05) * 1.5;
                    const fx = ix + sway;
                    const fy = iy - 3;
                    // Stem
                    ctx.strokeStyle = '#2e7d32';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(ix, iy);
                    ctx.lineTo(fx, fy);
                    ctx.stroke();
                    // Petals
                    if (flowerType === 0) {
                        ctx.fillStyle = '#ffffff'; // Chamomile
                        ctx.fillRect(fx - 1, fy - 2, 3, 3);
                        ctx.fillStyle = '#ffd54f';
                        ctx.fillRect(fx, fy - 1, 1, 1);
                    } else if (flowerType === 1) {
                        ctx.fillStyle = '#ffb300'; // Buttercup
                        ctx.fillRect(fx - 1, fy - 2, 3, 2);
                        ctx.fillStyle = '#fff9c4';
                        ctx.fillRect(fx, fy - 1, 1, 1);
                    } else {
                        ctx.fillStyle = '#ff5252'; // Starlight Poppy
                        ctx.fillRect(fx - 1, fy - 2, 2, 2);
                        ctx.fillStyle = '#212121';
                        ctx.fillRect(fx, fy - 1, 1, 1);
                    }
                }
            }
        }

        // Night Fireflies Floating Across Grass Blades
        if (isNight) {
            for (let f = 0; f < 10; f++) {
                const fSeed = (f * 139) % 997;
                const fx = (originX - 180 + ((fSeed * 7 + Math.floor(t * 18)) % 360));
                const fy = (originY - 30 + ((fSeed * 11 + Math.floor(t * 12)) % 140));
                const fAlpha = 0.35 + 0.55 * Math.sin(t * 3.8 + f * 1.9);
                ctx.fillStyle = (f % 2 === 0) ? `rgba(0, 229, 255, ${fAlpha})` : `rgba(105, 240, 174, ${fAlpha})`;
                ctx.fillRect(fx, fy, 2, 2);
            }
        }

        // 3. Six Title Screen Holding Points & Glowing Celestial Orbs (User Requirement: No Text, None Behind Button)
        // Balanced 3-pedestal arcs flanking the centerpiece hub, completely unblocked by [GAME START]
        const holdingPoints = [
            { id: 1, x: originX - 148, y: originY - 36, day: 1, type: 'wisp' },       // Day 1: Upper West flank
            { id: 2, x: originX + 148, y: originY - 36, day: 2, type: 'sol' },        // Day 2: Upper East flank
            { id: 3, x: originX - 188, y: originY + 16, day: 3, type: 'nebula' },     // Day 3: Outer West wing
            { id: 4, x: originX + 188, y: originY + 16, day: 4, type: 'chronos' },    // Day 4: Outer East wing
            { id: 5, x: originX - 156, y: originY + 68, day: 5, type: 'eclipse' },    // Day 5: Lower West flank (pulled clear of button)
            { id: 6, x: originX + 156, y: originY + 68, day: 6, type: 'singularity' } // Day 6: Lower East flank (pulled clear of button)
        ];

        // Retrieve daily holding state from game or storage
        const dailyState = (this.game && this.game.getDailyHoldingState) ? this.game.getDailyHoldingState() : { currentDay: 1, claimedDays: [] };
        this.holdingPointPositions = [];

        // Render each of the 6 holding points
        for (const cl of holdingPoints) {
            // Draw Carved Stone Runic Pedestal Stand
            ctx.fillStyle = '#1c2430';
            ctx.fillRect(cl.x - 14, cl.y - 2, 28, 12);
            ctx.fillStyle = '#263238';
            ctx.fillRect(cl.x - 16, cl.y - 6, 32, 6);

            // 3D stone block top face with hollow runic font basin
            ctx.fillStyle = '#37474f';
            ctx.beginPath();
            ctx.moveTo(cl.x, cl.y - 10);
            ctx.lineTo(cl.x + 16, cl.y - 5);
            ctx.lineTo(cl.x, cl.y);
            ctx.lineTo(cl.x - 16, cl.y - 5);
            ctx.closePath();
            ctx.fill();

            // Basin inset
            ctx.fillStyle = '#101518';
            ctx.beginPath();
            ctx.ellipse(cl.x, cl.y - 5, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pedestal border
            ctx.strokeStyle = '#455a64';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Check if this holding point has an active orb or is claimed
            const isUnlocked = cl.day <= dailyState.currentDay;
            const isClaimed = dailyState.claimedDays.includes(cl.day);

            this.holdingPointPositions.push({
                id: cl.id,
                day: cl.day,
                x: cl.x,
                y: cl.y,
                isUnlocked,
                isClaimed,
                type: cl.type
            });

            if (isUnlocked && !isClaimed) {
                // Active Glowing Celestial Orb ready to collect!
                this.drawCelestialOrb(ctx, cl.x, cl.y, cl.type, t, 1.0, cl.day, true);
            } else if (isClaimed) {
                // Claimed serene starlight font in basin (pure starlight pool, no text)
                ctx.save();
                const fontPulse = 0.45 + 0.35 * Math.sin(t * 3.0 + cl.day);
                ctx.fillStyle = `rgba(0, 229, 255, ${fontPulse})`;
                ctx.beginPath();
                ctx.ellipse(cl.x, cl.y - 5, 7, 3.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Gentle starlight glint
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cl.x - 1, cl.y - 6, 2, 2);
                ctx.restore();
            } else {
                // Locked future day pedestal: dormant runic indentation in stone (no text)
                ctx.save();
                ctx.fillStyle = '#212933';
                ctx.beginPath();
                ctx.ellipse(cl.x, cl.y - 5, 5, 2.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // 4. Surrounding Dense Isometric Conifer Pine Trees (Framing edges, Image 4)
        const drawPineTree = (px, py, scale = 1.0) => {
            const th = Math.round(52 * scale);
            const tw = Math.round(36 * scale);

            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(px, py + 4, tw * 0.5, 8 * scale, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trunk
            ctx.fillStyle = '#271c14';
            ctx.fillRect(px - Math.round(3 * scale), py - Math.round(8 * scale), Math.round(6 * scale), Math.round(10 * scale));

            // Layered pine canopy (3 tiers of dark evergreen needles)
            const tiers = [
                { yOff: 8, w: tw * 0.95, h: th * 0.45 },
                { yOff: 22, w: tw * 0.75, h: th * 0.42 },
                { yOff: 36, w: tw * 0.52, h: th * 0.38 }
            ];

            for (const tier of tiers) {
                const baseTierY = py - Math.round(tier.yOff * scale);
                const halfW = Math.round(tier.w / 2);
                const tierH = Math.round(tier.h * scale);

                // Dark shaded needle side
                ctx.fillStyle = '#0f2214';
                ctx.beginPath();
                ctx.moveTo(px, baseTierY - tierH);
                ctx.lineTo(px, baseTierY);
                ctx.lineTo(px - halfW, baseTierY);
                ctx.closePath();
                ctx.fill();

                // Sunlit needle side
                ctx.fillStyle = '#193320';
                ctx.beginPath();
                ctx.moveTo(px, baseTierY - tierH);
                ctx.lineTo(px + halfW, baseTierY);
                ctx.lineTo(px, baseTierY);
                ctx.closePath();
                ctx.fill();

                // Needle ridge highlights
                ctx.strokeStyle = '#2d5334';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px, baseTierY - tierH);
                ctx.lineTo(px + halfW * 0.6, baseTierY);
                ctx.stroke();
            }
        };

        // Perimeter Trees
        const perimeterTrees = [
            // Left flank
            { x: originX - 220, y: originY - 10, s: 1.15 },
            { x: originX - 195, y: originY + 40, s: 1.25 },
            { x: originX - 235, y: originY + 95, s: 1.35 },
            { x: originX - 180, y: originY + 125, s: 1.30 },
            { x: originX - 245, y: originY - 30, s: 1.05 },
            // Right flank (framed away from Dyson Luminary Orb at x: 384, y: 58)
            { x: originX + 225, y: originY + 15, s: 1.15 },
            { x: originX + 195, y: originY + 55, s: 1.25 },
            { x: originX + 235, y: originY + 95, s: 1.35 },
            { x: originX + 180, y: originY + 125, s: 1.30 },
            // Mountain foothills tree line
            { x: originX - 145, y: mtnBaseY + 16, s: 0.85 },
            { x: originX - 85, y: mtnBaseY + 12, s: 0.80 },
            { x: originX + 75, y: mtnBaseY + 12, s: 0.80 }
        ];

        for (const pt of perimeterTrees) {
            drawPineTree(pt.x, pt.y, pt.s);
        }

        // 5. Central Ancient Stone Runic Totem / Monolith (Image 4 Exact Archetype)
        const mx = originX;
        const my = originY + 22;

        // Base ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.ellipse(mx, my + 14, 42, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Surrounding white stone teeth / staves at totem base (Image 4)
        const toothCount = 14;
        for (let i = 0; i < toothCount; i++) {
            const angle = (i * Math.PI * 2) / toothCount;
            const tx = mx + Math.cos(angle) * 34;
            const ty = my + 12 + Math.sin(angle) * 11;
            const toothH = 14 + (i % 3) * 4;

            ctx.fillStyle = '#b0bec5';
            ctx.beginPath();
            ctx.moveTo(tx - 3, ty);
            ctx.lineTo(tx, ty - toothH);
            ctx.lineTo(tx + 3, ty);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#455a64';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Pedestal base block
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(mx - 22, my - 2, 44, 16);
        ctx.fillStyle = '#263238';
        ctx.fillRect(mx - 20, my - 4, 40, 6);

        // Stacked megalithic stone blocks (4 tiers high, ~110px tall)
        // Block 1: Bottom megalith
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.moveTo(mx - 18, my - 2);
        ctx.lineTo(mx - 15, my - 30);
        ctx.lineTo(mx + 15, my - 30);
        ctx.lineTo(mx + 18, my - 2);
        ctx.closePath();
        ctx.fill();

        // Shaded side
        ctx.fillStyle = '#151c20';
        ctx.beginPath();
        ctx.moveTo(mx - 18, my - 2);
        ctx.lineTo(mx - 15, my - 30);
        ctx.lineTo(mx, my - 30);
        ctx.lineTo(mx, my - 2);
        ctx.closePath();
        ctx.fill();

        // Block 2: Middle megalith
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.moveTo(mx - 16, my - 32);
        ctx.lineTo(mx - 19, my - 62);
        ctx.lineTo(mx + 13, my - 62);
        ctx.lineTo(mx + 16, my - 32);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e272c';
        ctx.beginPath();
        ctx.moveTo(mx - 16, my - 32);
        ctx.lineTo(mx - 19, my - 62);
        ctx.lineTo(mx - 2, my - 62);
        ctx.lineTo(mx - 2, my - 32);
        ctx.closePath();
        ctx.fill();

        // Block 3: Upper megalith
        ctx.fillStyle = '#455a64';
        ctx.beginPath();
        ctx.moveTo(mx - 17, my - 64);
        ctx.lineTo(mx - 13, my - 92);
        ctx.lineTo(mx + 15, my - 92);
        ctx.lineTo(mx + 14, my - 64);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.moveTo(mx - 17, my - 64);
        ctx.lineTo(mx - 13, my - 92);
        ctx.lineTo(mx - 1, my - 92);
        ctx.lineTo(mx - 1, my - 64);
        ctx.closePath();
        ctx.fill();

        // Block 4: Summit stone with curved peak
        ctx.fillStyle = '#546e7a';
        ctx.beginPath();
        ctx.moveTo(mx - 12, my - 94);
        ctx.lineTo(mx - 4, my - 116);
        ctx.lineTo(mx + 10, my - 116);
        ctx.lineTo(mx + 14, my - 94);
        ctx.closePath();
        ctx.fill();

        // Stone fracture cracks
        ctx.strokeStyle = '#101518';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx - 14, my - 46);
        ctx.lineTo(mx + 2, my - 48);
        ctx.lineTo(mx + 8, my - 42);
        ctx.moveTo(mx - 6, my - 78);
        ctx.lineTo(mx + 10, my - 74);
        ctx.stroke();

        // Glowing Engraved Runes (Image 4):
        // Pulsing ancient wind spiral, waves, eye, and chevrons
        const runeGlow = 0.55 + 0.40 * Math.sin(t * 2.8);
        ctx.save();
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = `rgba(0, 229, 255, ${runeGlow})`;
        ctx.lineWidth = 2;

        // Spiral Wind Rune on Top Block
        ctx.beginPath();
        ctx.arc(mx + 2, my - 104, 5, 0, Math.PI * 1.6);
        ctx.stroke();

        // Triple Wave Runes on Block 3
        ctx.beginPath();
        ctx.moveTo(mx - 8, my - 82);
        ctx.quadraticCurveTo(mx - 2, my - 86, mx + 6, my - 82);
        ctx.moveTo(mx - 7, my - 76);
        ctx.quadraticCurveTo(mx - 1, my - 80, mx + 7, my - 76);
        ctx.stroke();

        // Ancient Eye / Diamond Rune on Block 2
        ctx.beginPath();
        ctx.moveTo(mx - 8, my - 48);
        ctx.lineTo(mx, my - 54);
        ctx.lineTo(mx + 8, my - 48);
        ctx.lineTo(mx, my - 42);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = `rgba(0, 229, 255, ${runeGlow * 0.9})`;
        ctx.beginPath();
        ctx.arc(mx, my - 48, 2, 0, Math.PI * 2);
        ctx.fill();

        // Double Chevron Rune on Bottom Block
        ctx.beginPath();
        ctx.moveTo(mx - 7, my - 20);
        ctx.lineTo(mx, my - 14);
        ctx.lineTo(mx + 7, my - 20);
        ctx.moveTo(mx - 7, my - 12);
        ctx.lineTo(mx, my - 6);
        ctx.lineTo(mx + 7, my - 12);
        ctx.stroke();

        ctx.restore();

        // 6. Stone Brazier Torches Flanking the Totem (Image 3/4)
        const torches = [
            { x: mx - 80, y: my + 14 },
            { x: mx + 80, y: my + 14 }
        ];

        for (const torch of torches) {
            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(torch.x, torch.y + 6, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Stone Pedestal Stand
            ctx.fillStyle = '#1c2430';
            ctx.fillRect(torch.x - 5, torch.y - 14, 10, 18);
            ctx.fillStyle = '#263238';
            ctx.fillRect(torch.x - 7, torch.y - 18, 14, 6);
            ctx.fillStyle = '#37474f';
            ctx.fillRect(torch.x - 8, torch.y - 20, 16, 4);

            // Ambient warm fire glow on ground
            const fireGlow = ctx.createRadialGradient(torch.x, torch.y - 20, 4, torch.x, torch.y - 20, 38);
            fireGlow.addColorStop(0, 'rgba(255, 179, 0, 0.28)');
            fireGlow.addColorStop(0.6, 'rgba(255, 87, 34, 0.12)');
            fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = fireGlow;
            ctx.beginPath();
            ctx.arc(torch.x, torch.y - 20, 38, 0, Math.PI * 2);
            ctx.fill();

            // Animated pixel flame tongues
            const f1 = Math.sin(t * 12 + torch.x) * 2;
            const f2 = Math.cos(t * 15 + torch.y) * 1.5;

            // Outer flame (Red/Orange)
            ctx.fillStyle = '#ff5722';
            ctx.beginPath();
            ctx.moveTo(torch.x - 5, torch.y - 20);
            ctx.lineTo(torch.x, torch.y - 32 + f1);
            ctx.lineTo(torch.x + 5, torch.y - 20);
            ctx.closePath();
            ctx.fill();

            // Mid flame (Bright Amber)
            ctx.fillStyle = '#ffb300';
            ctx.beginPath();
            ctx.moveTo(torch.x - 3, torch.y - 20);
            ctx.lineTo(torch.x + f2, torch.y - 29);
            ctx.lineTo(torch.x + 3, torch.y - 20);
            ctx.closePath();
            ctx.fill();

            // Core flame (White hot)
            ctx.fillStyle = '#fff9c4';
            ctx.beginPath();
            ctx.moveTo(torch.x - 2, torch.y - 20);
            ctx.lineTo(torch.x, torch.y - 25);
            ctx.lineTo(torch.x + 2, torch.y - 20);
            ctx.closePath();
            ctx.fill();

            // Drifting smoke & sparks
            for (let s = 0; s < 3; s++) {
                const sparkSeed = (s * 31 + Math.floor(t * 18)) % 25;
                const spX = torch.x + Math.sin(t * 4 + s) * 4;
                const spY = torch.y - 24 - sparkSeed;
                const spAlpha = 1.0 - (sparkSeed / 25);
                ctx.fillStyle = `rgba(255, 213, 79, ${spAlpha})`;
                ctx.fillRect(spX, spY, 1.5, 1.5);
            }
        }

        // 7. Atmospheric Drifting Mystical Sparks / Spores (Rising from Totem)
        for (let i = 0; i < 22; i++) {
            const seed = (i * 97) % 1009;
            const px = (mx - 130 + ((seed * 7 + Math.floor(t * 20)) % 260));
            const py = (my + 30 - ((seed * 13 + Math.floor(t * 35)) % 200));
            const alpha = 0.35 + 0.55 * Math.sin(t * 3.5 + i);

            ctx.fillStyle = (i % 3 === 0) ? `rgba(0, 229, 255, ${alpha})` : ((i % 3 === 1) ? `rgba(128, 222, 234, ${alpha})` : `rgba(255, 215, 64, ${alpha})`);
            ctx.fillRect(px, py, 2, 2);
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

    drawCelestialOrb(ctx, ox, oy, orbType, t, scale = 1.0, dayNum = 1, isPedestalOffset = true) {
        ctx.save();
        const hoverY = isPedestalOffset
            ? (oy - 20 * scale + Math.sin(t * 2.8 + dayNum) * 4 * scale)
            : (oy + Math.sin(t * 2.8 + dayNum) * 3 * scale);
        const rot = t * 1.2 + dayNum * 0.8;
        const pulse = (1.0 + 0.18 * Math.sin(t * 3.5 + dayNum)) * scale;

        if (isPedestalOffset) {
            // Ambient lighting cast onto the pedestal below
            const baseGlow = ctx.createRadialGradient(ox, oy + 4 * scale, 2 * scale, ox, oy + 4 * scale, 30 * scale);
            baseGlow.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
            baseGlow.addColorStop(0.7, 'rgba(0, 229, 255, 0.12)');
            baseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = baseGlow;
            ctx.beginPath();
            ctx.ellipse(ox, oy + 4 * scale, 28 * scale, 12 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // General ambient backlight glow for standalone UI cards / remains
            const baseGlow = ctx.createRadialGradient(ox, hoverY, 4 * scale, ox, hoverY, 36 * scale);
            baseGlow.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
            baseGlow.addColorStop(0.6, 'rgba(0, 229, 255, 0.10)');
            baseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = baseGlow;
            ctx.beginPath();
            ctx.arc(ox, hoverY, 36 * scale, 0, Math.PI * 2);
            ctx.fill();
        }

        // Swirling Celestial Clouds & Wisps
        const smokeColors = {
            wisp: ['rgba(224, 247, 250, 0.65)', 'rgba(0, 229, 255, 0.45)', 'rgba(0, 145, 234, 0.25)'],
            sol: ['rgba(255, 249, 196, 0.70)', 'rgba(255, 213, 79, 0.50)', 'rgba(255, 152, 0, 0.25)'],
            nebula: ['rgba(243, 229, 245, 0.70)', 'rgba(224, 64, 251, 0.50)', 'rgba(123, 31, 162, 0.25)'],
            chronos: ['rgba(232, 245, 233, 0.70)', 'rgba(105, 240, 174, 0.50)', 'rgba(0, 200, 83, 0.25)'],
            eclipse: ['rgba(238, 238, 238, 0.65)', 'rgba(176, 190, 197, 0.50)', 'rgba(55, 71, 79, 0.3)'],
            singularity: ['rgba(255, 255, 255, 0.85)', 'rgba(255, 213, 79, 0.65)', 'rgba(0, 229, 255, 0.45)']
        };
        const pal = smokeColors[orbType] || smokeColors.wisp;

        // Outer rotating ethereal celestial plumes
        for (let w = 0; w < 6; w++) {
            const angle = rot + (w * Math.PI * 2) / 6;
            const dist = (12 + 4 * Math.sin(t * 3.0 + w * 2)) * pulse;
            const wx = ox + Math.cos(angle) * dist;
            const wy = hoverY + Math.sin(angle) * (dist * 0.75);
            const wRadius = (6 + 3 * Math.cos(t * 2.5 + w)) * pulse;

            const smokeGrad = ctx.createRadialGradient(wx, wy, 1, wx, wy, wRadius);
            smokeGrad.addColorStop(0, pal[0]);
            smokeGrad.addColorStop(0.5, pal[1]);
            smokeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = smokeGrad;
            ctx.beginPath();
            ctx.arc(wx, wy, wRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Inner dense swirling nebula core
        for (let s = 0; s < 4; s++) {
            const sAngle = -rot * 1.5 + (s * Math.PI) / 2;
            const sDist = (6 + 2 * Math.sin(t * 4.0 + s)) * pulse;
            const sx = ox + Math.cos(sAngle) * sDist;
            const sy = hoverY + Math.sin(sAngle) * (sDist * 0.7);
            const sRad = 8 * pulse;

            const inGrad = ctx.createRadialGradient(sx, sy, 1, sx, sy, sRad);
            inGrad.addColorStop(0, pal[0]);
            inGrad.addColorStop(0.6, pal[2]);
            inGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = inGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
            ctx.fill();
        }

        // Orbiting Stardust Gyroscope Rings (Singularity & Nebula)
        if (orbType === 'singularity' || orbType === 'nebula') {
            ctx.strokeStyle = pal[1];
            ctx.lineWidth = Math.max(1, 1.2 * scale);
            ctx.beginPath();
            ctx.ellipse(ox, hoverY, 16 * pulse, 6 * pulse, rot * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            if (orbType === 'singularity') {
                ctx.strokeStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(ox, hoverY, 18 * pulse, 5 * pulse, -rot * 0.6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Core Incandescent Luminous Plasma Sphere
        const coreRad = 7 * pulse;
        const coreGrad = ctx.createRadialGradient(ox, hoverY - 1, 1, ox, hoverY, coreRad);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.4, pal[0]);
        coreGrad.addColorStop(0.85, pal[1]);
        coreGrad.addColorStop(1, pal[2]);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(ox, hoverY, coreRad, 0, Math.PI * 2);
        ctx.fill();

        // Ascending Sparks & Embers
        for (let sp = 0; sp < 4; sp++) {
            const sparkProg = (t * 20 + sp * 25 + dayNum * 17) % 36;
            const spX = ox + Math.sin(t * 3.5 + sp * 2) * (6 + sparkProg * 0.2) * scale;
            const spY = hoverY - (6 + sparkProg) * scale;
            const spAlpha = Math.max(0, 1.0 - (sparkProg / 36));
            ctx.fillStyle = (sp % 2 === 0) ? `rgba(255, 255, 255, ${spAlpha})` : `rgba(0, 229, 255, ${spAlpha})`;
            ctx.fillRect(spX, spY, 1.5 * scale, 1.5 * scale);
        }

        ctx.restore();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RetroRenderer, Renderer: RetroRenderer };
}
