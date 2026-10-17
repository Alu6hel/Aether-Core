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

                this.drawTile(tile, screenX, screenY, pal, x, y);
            }
        }
    }

    drawTile(tile, sx, sy, pal, tx, ty) {
        const ctx = this.ctx;

        switch (tile) {
            case 0: // VOID
                ctx.fillStyle = '#05070a';
                ctx.fillRect(sx, sy, 16, 16);
                break;

            case 1: { // DEEP_WATER (Authentic GBA Diagonal Wavy Ocean - Matching Image 2)
                ctx.fillStyle = '#325bbf';
                ctx.fillRect(sx, sy, 16, 16);

                // Animated diagonal wave bands
                const waveOffset = (sx + sy * 0.8 - this.waterAnimTimer * 20) % 18;
                const normWave = (waveOffset + 18) % 18;

                ctx.fillStyle = '#4a75dc';
                if (normWave < 6) {
                    ctx.fillRect(sx, sy + 2, 16, 4);
                } else if (normWave < 12) {
                    ctx.fillRect(sx, sy + 8, 16, 4);
                }

                // Sparkling wave crests
                ctx.fillStyle = '#9bc0ff';
                const sparkle = Math.floor((this.waterAnimTimer * 3 + tx * 2 + ty * 3) % 4);
                if (sparkle === 0) {
                    ctx.fillRect(sx + 3, sy + 4, 3, 1);
                    ctx.fillRect(sx + 10, sy + 11, 4, 1);
                } else if (sparkle === 2) {
                    ctx.fillRect(sx + 7, sy + 5, 4, 1);
                    ctx.fillRect(sx + 2, sy + 12, 3, 1);
                }
                break;
            }

            case 2: { // WATER_FOAM (Shoreline with white surf crests - Matching Image 2)
                ctx.fillStyle = '#325bbf';
                ctx.fillRect(sx, sy, 16, 16);

                // Shallow coastal turquoise band
                ctx.fillStyle = '#4ea5d9';
                ctx.fillRect(sx, sy, 16, 8);

                // Foamy white surf fringe with wave crests
                ctx.fillStyle = '#ffffff';
                const foamShift = Math.floor(Math.sin(this.waterAnimTimer * 3 + tx) * 2);
                ctx.fillRect(sx, sy + 6 + foamShift, 16, 3);
                ctx.fillRect(sx + 2, sy + 4 + foamShift, 4, 2);
                ctx.fillRect(sx + 10, sy + 5 + foamShift, 5, 2);

                // Foam bubbles
                ctx.fillStyle = '#e0f2fe';
                ctx.fillRect(sx + 1, sy + 10, 2, 2);
                ctx.fillRect(sx + 8, sy + 11, 2, 2);
                break;
            }

            case 3: { // GROUND (Lush terrain with soil & moss - Matching Image 2)
                ctx.fillStyle = pal[2] || '#43a047';
                ctx.fillRect(sx, sy, 16, 16);

                // Subtle ground texture & moss tufts
                ctx.fillStyle = pal[1] || '#2e7d32';
                if ((tx * 7 + ty * 13) % 5 === 0) {
                    ctx.fillRect(sx + 3, sy + 4, 2, 2);
                    ctx.fillRect(sx + 4, sy + 3, 1, 1);
                }
                if ((tx * 11 + ty * 3) % 7 === 0) {
                    ctx.fillRect(sx + 9, sy + 10, 2, 2);
                    ctx.fillRect(sx + 11, sy + 11, 1, 1);
                }

                // Tiny decorative wildflowers
                if ((tx * 17 + ty * 19) % 23 === 0) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx + 7, sy + 6, 2, 2);
                    ctx.fillStyle = '#ffd54f';
                    ctx.fillRect(sx + 7, sy + 7, 1, 1);
                }
                break;
            }

            case 4: { // FOIL_GRASS (Tall swaying alien/lush grass)
                ctx.fillStyle = pal[4] || '#66bb6a';
                ctx.fillRect(sx, sy, 16, 16);

                // Dark grass blades
                ctx.fillStyle = pal[3] || '#2e7d32';
                ctx.fillRect(sx + 2, sy + 4, 2, 7);
                ctx.fillRect(sx + 6, sy + 2, 2, 10);
                ctx.fillRect(sx + 10, sy + 5, 2, 7);
                ctx.fillRect(sx + 13, sy + 3, 2, 9);

                // Highlight tips
                ctx.fillStyle = '#a5d6a7';
                ctx.fillRect(sx + 2, sy + 4, 2, 2);
                ctx.fillRect(sx + 6, sy + 2, 2, 2);
                ctx.fillRect(sx + 10, sy + 5, 2, 2);
                ctx.fillRect(sx + 13, sy + 3, 2, 2);
                break;
            }

            case 5: { // CLIFF_LOW (Layered Rocky Cliff with Shaded Ledges - Matching Image 2)
                // Cliff base rock
                ctx.fillStyle = '#5d473a';
                ctx.fillRect(sx, sy, 16, 16);

                // Top highlighted ledge rim
                ctx.fillStyle = '#8d705d';
                ctx.fillRect(sx, sy, 16, 4);
                ctx.fillStyle = '#a88a75';
                ctx.fillRect(sx + 1, sy + 1, 14, 1);

                // Vertical rock stratification cracks
                ctx.fillStyle = '#3e2e25';
                ctx.fillRect(sx + 4, sy + 4, 2, 8);
                ctx.fillRect(sx + 11, sy + 6, 2, 7);
                ctx.fillRect(sx, sy + 13, 16, 3); // Base ground shadow
                break;
            }

            case 6: { // CLIFF_HIGH (Upper Plateau & Elevated Rock Shelf - Matching Image 2)
                ctx.fillStyle = '#795d4d';
                ctx.fillRect(sx, sy, 16, 16);

                // Upper plateau rim highlight
                ctx.fillStyle = '#a18370';
                ctx.fillRect(sx, sy, 16, 3);
                ctx.fillStyle = '#bfa593';
                ctx.fillRect(sx, sy, 16, 1);

                // Rock face crevices & shadow
                ctx.fillStyle = '#4a372d';
                ctx.fillRect(sx + 2, sy + 5, 3, 7);
                ctx.fillRect(sx + 9, sy + 4, 3, 9);
                ctx.fillRect(sx, sy + 14, 16, 2);
                break;
            }

            case 7: { // CAVE_ENTRANCE (Rounded dark cavern mouth - Matching Image 2)
                // Surrounding rock face
                ctx.fillStyle = '#5d473a';
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = '#795d4d';
                ctx.fillRect(sx, sy, 16, 3);

                // Dark arched cavern tunnel opening
                ctx.fillStyle = '#080810';
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 12, 6, Math.PI, 0, false);
                ctx.fill();
                ctx.fillRect(sx + 2, sy + 11, 12, 5);

                // Inner gradient darkness
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 12, 4, Math.PI, 0, false);
                ctx.fill();
                ctx.fillRect(sx + 4, sy + 12, 8, 4);

                // Stone threshold stones
                ctx.fillStyle = '#8d705d';
                ctx.fillRect(sx + 2, sy + 15, 12, 1);
                break;
            }

            case 8: { // SCIFI_CONDUIT (Hidden energy pipeline in bedrock)
                ctx.fillStyle = '#263238';
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx + 6, sy, 4, 16);
                ctx.fillStyle = '#ffffff';
                const pulse = Math.floor((this.waterAnimTimer * 8 + ty) % 16);
                ctx.fillRect(sx + 7, sy + pulse, 2, 4);
                break;
            }

            case 9: { // ANCIENT_TERMINAL / STEPPED ALTAR (Matching Image 3)
                // Dungeon pavement floor
                ctx.fillStyle = '#37474f';
                ctx.fillRect(sx, sy, 16, 16);

                // Stepped stone tier 1 (Base altar)
                ctx.fillStyle = '#546e7a';
                ctx.fillRect(sx + 1, sy + 2, 14, 12);
                ctx.fillStyle = '#78909c';
                ctx.fillRect(sx + 2, sy + 3, 12, 2);

                // Stepped stone tier 2 (Top altar pedestal)
                ctx.fillStyle = '#90a4ae';
                ctx.fillRect(sx + 3, sy + 5, 10, 7);
                ctx.fillStyle = '#cfd8dc';
                ctx.fillRect(sx + 4, sy + 6, 8, 2);

                // Cyan quantum core / rune glow
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(sx + 6, sy + 8, 4, 3);
                break;
            }

            case 10: { // SECRET_SOIL (Arable 3x3 plot for Farmer)
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(sx, sy, 16, 16);
                ctx.fillStyle = '#6d4c41';
                ctx.fillRect(sx + 2, sy + 3, 12, 3);
                ctx.fillRect(sx + 2, sy + 9, 12, 3);
                ctx.fillStyle = '#76ff03';
                ctx.fillRect(sx + 7, sy + 4, 2, 2);
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
