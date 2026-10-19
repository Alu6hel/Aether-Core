const http = require('http');
const fs = require('fs');

async function getWsUrl() {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:9222/json/list', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const list = JSON.parse(data);
                if (list.length > 0 && list[0].webSocketDebuggerUrl) {
                    resolve(list[0].webSocketDebuggerUrl);
                } else {
                    reject(new Error('No debuggable page found'));
                }
            });
        }).on('error', reject);
    });
}

function evaluate(ws, expr) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (event) => {
            const parsed = JSON.parse(event.data);
            if (parsed.id === id) {
                ws.removeEventListener('message', handler);
                if (parsed.error) reject(parsed.error);
                else {
                    const val = parsed.result && parsed.result.result ? parsed.result.result.value : (parsed.result ? parsed.result.value : null);
                    resolve(val);
                }
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true }
        }));
    });
}

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));

    const res = await evaluate(ws, `
        (() => {
            try {
                const offscreen = document.createElement('canvas');
                offscreen.width = 640;
                offscreen.height = 180;
                const ctx = offscreen.getContext('2d');
                ctx.imageSmoothingEnabled = false;

                // Background banner
                ctx.fillStyle = '#0a0d18';
                ctx.fillRect(0, 0, offscreen.width, offscreen.height);
                ctx.strokeStyle = '#1a263f';
                ctx.strokeRect(1, 1, offscreen.width - 2, offscreen.height - 2);

                // Sub-canvas to draw single character at native 1x, then scale 4x
                const charCanvas = document.createElement('canvas');
                charCanvas.width = 48;
                charCanvas.height = 48;
                const cCtx = charCanvas.getContext('2d');
                cCtx.imageSmoothingEnabled = false;

                const showcase = [
                    {
                        label: 'SOLARION (DOWN)',
                        sub: 'Broadsword + Mantle',
                        char: { type: 'SOLARION_ARCHITECT', cardinalFacing: 'DOWN', equippedWeapon: BASE_ITEMS.SOLARION_BROADSWORD, equippedArmor: BASE_ITEMS.GENESIS_STARMANTLE }
                    },
                    {
                        label: 'CHRONO (RIGHT)',
                        sub: 'Void Scythe + Vanguard',
                        char: { type: 'CHRONO_GLITCHER', cardinalFacing: 'RIGHT', equippedWeapon: BASE_ITEMS.PRIMORDIAL_VOID_SCYTHE, equippedArmor: BASE_ITEMS.VANGUARD_CHESTPLATE }
                    },
                    {
                        label: 'WARRIOR (UP)',
                        sub: 'Back-plate + Hammer',
                        char: { type: 'SUPER_SOLDIER', cardinalFacing: 'UP', equippedWeapon: BASE_ITEMS.RUNIC_WARHAMMER, equippedArmor: BASE_ITEMS.IRON_AEGIS_PLATE }
                    },
                    {
                        label: 'MAGE (LEFT)',
                        sub: 'Ultrasonic + Shield',
                        char: { type: 'TECHNO_MAGE', cardinalFacing: 'LEFT', equippedWeapon: BASE_ITEMS.ULTRASONIC_SWORD, equippedArmor: BASE_ITEMS.AEGIS_VANGUARD_SHIELD }
                    },
                    {
                        label: 'FARMER (DOWN)',
                        sub: 'Flint Dagger + Flux',
                        char: { type: 'FARMER_GOD', cardinalFacing: 'DOWN', equippedWeapon: BASE_ITEMS.FLINT_DAGGER, equippedArmor: BASE_ITEMS.WAYFARER_FLUX_BAND }
                    }
                ];

                const pal = window.game.currentMap ? window.game.currentMap.palette.colors : null;
                const map = window.game.currentMap;

                // Save renderer's canvas/ctx
                const origCtx = window.game.renderer.ctx;
                const origCam = { x: window.game.renderer.camera.x, y: window.game.renderer.camera.y };

                showcase.forEach((item, idx) => {
                    cCtx.clearRect(0, 0, 48, 48);
                    window.game.renderer.ctx = cCtx;
                    window.game.renderer.camera.x = 0;
                    window.game.renderer.camera.y = 0;

                    const mockChar = {
                        pos: { x: 24, y: 32 },
                        charClass: item.char.type, type: item.char.type,
                        cardinalFacing: item.char.cardinalFacing,
                        equippedWeapon: item.char.equippedWeapon,
                        equippedArmor: item.char.equippedArmor,
                        walkTimer: 0,
                        isMoving: false, projectiles: [], sparks: []
                    };

                    window.game.renderer.renderCharacter(mockChar, pal, map);

                    const slotX = 16 + idx * 124;
                    const slotY = 16;

                    // Frame
                    ctx.fillStyle = '#101726';
                    ctx.fillRect(slotX, slotY, 112, 148);
                    ctx.strokeStyle = '#273b5e';
                    ctx.strokeRect(slotX, slotY, 112, 148);

                    // Draw magnified 2x sprite
                    ctx.drawImage(charCanvas, slotX + 8, slotY + 8, 96, 96);

                    // Label
                    ctx.fillStyle = '#00f0ff';
                    ctx.font = 'bold 9px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.label, slotX + 56, slotY + 118);

                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '8px monospace';
                    ctx.fillText(item.sub, slotX + 56, slotY + 134);
                });

                window.game.renderer.ctx = origCtx;
                window.game.renderer.camera.x = origCam.x;
                window.game.renderer.camera.y = origCam.y;

                return offscreen.toDataURL();
            } catch(e) {
                return 'ERROR: ' + e.message + ' ' + e.stack;
            }
        })()
    `);

    if (res.startsWith('ERROR:')) {
        console.error(res);
        process.exit(1);
    }

    const base64Data = res.replace(/^data:image\/png;base64,/, '');
    const outPath = '/home/davidalujones/.gemini/antigravity/brain/33a4f4b8-b19c-4ab5-a8c1-dc823f15bf14/character_gear_visual_showcase.png';
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    console.log('[GEAR SHOWCASE] Saved high-detail visual gear showcase to', outPath);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
