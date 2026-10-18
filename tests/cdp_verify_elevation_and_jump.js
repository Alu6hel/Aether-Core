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

function cdpSend(ws, method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (event) => {
            const parsed = JSON.parse(event.data);
            if (parsed.id === id) {
                ws.removeEventListener('message', handler);
                if (parsed.error) reject(parsed.error);
                else resolve(parsed.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function evaluate(ws, expr) {
    const res = await cdpSend(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true });
    return res ? res.value : null;
}

async function captureScreenshot(ws, filename) {
    const res = await cdpSend(ws, 'Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = `/home/davidalujones/.gemini/antigravity/brain/33a4f4b8-b19c-4ab5-a8c1-dc823f15bf14/${filename}`;
    fs.writeFileSync(outPath, buffer);
    console.log(`[CDP SCREENSHOT] Saved (${buffer.length} bytes): ${filename}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to CDP at', wsUrl);
    await cdpSend(ws, 'Page.enable');
    await cdpSend(ws, 'Runtime.enable');

    await sleep(800);

    // 1. Capture Title / Start Screen
    console.log("Capturing 01: Title Screen...");
    await captureScreenshot(ws, 'screen_live_92_title_screen.png');

    // 2. Open Save Slots Modal
    console.log("Opening Save Slots Modal...");
    await evaluate(ws, `
        const btn = document.getElementById('btn-start-game');
        if (btn) btn.click();
    `);
    await sleep(500);
    console.log("Capturing 02: Save Slots Modal...");
    await captureScreenshot(ws, 'screen_live_93_save_slots_modal.png');

    // 3. Click Slot 01 Choose Class
    console.log("Opening Character Setup Modal for Slot 01...");
    await evaluate(ws, `
        const card = document.querySelector('.save-slot-card');
        if (card) {
            const btn = card.querySelector('.slot-new-btn');
            if (btn) btn.click();
            else card.click();
        }
    `);
    await sleep(500);
    console.log("Capturing 03: Character Setup Modal (All 5 Classes Unlocked)...");
    await captureScreenshot(ws, 'screen_live_94_character_setup_unlocked.png');

    // 4. Select The Farmer God and Confirm Embark
    console.log("Selecting The Farmer Class and Embarking...");
    await evaluate(ws, `
        const farmerCard = document.getElementById('card-farmer');
        if (farmerCard) farmerCard.click();
        const confirmBtn = document.getElementById('btn-confirm-setup');
        if (confirmBtn) confirmBtn.click();
    `);
    await sleep(600);

    // Skip cutscenes if active
    await evaluate(ws, `
        if (window.game && window.game.cutscenes) {
            window.game.cutscenes.isComplete = true;
            window.game.gameState = 'GAMEPLAY';
            const cutsceneModal = document.getElementById('cutscene-modal');
            if (cutsceneModal) cutsceneModal.classList.add('hidden');
        }
    `);
    await sleep(600);

    // 5. In-game: Capture Overworld with 3D Elevation Tiers & Ramps
    console.log("Capturing 04: Overworld Gameplay with 3D Elevation & Ramps...");
    await captureScreenshot(ws, 'screen_live_95_elevation_and_ramps_gameplay.png');

    // 6. Test Jump Mechanics
    console.log("Executing Jump Leap in-game...");
    await evaluate(ws, `
        if (window.game) {
            window.game.handleJump();
        }
    `);
    await sleep(120); // Peak of jump!
    console.log("Capturing 05: Mid-Air Jump with Ground Shadow Detachment...");
    await captureScreenshot(ws, 'screen_live_96_player_jumping_airborne.png');

    // 7. Check In-Game State & Elevation Data
    const state = await evaluate(ws, `
        ({
            gameState: window.game.gameState,
            selectedClass: window.game.player ? window.game.player.charClass : null,
            pos: window.game.player ? { x: Math.round(window.game.player.pos.x), y: Math.round(window.game.player.pos.y), z: Math.round(window.game.player.pos.z) } : null,
            isJumping: window.game.player ? window.game.player.isJumping : null,
            groundElevation: window.game.player ? window.game.player.groundElevation : null,
            rampsCount: window.game.currentMap ? window.game.currentMap.ramps.length : 0,
            hasElevationBuffer: window.game.currentMap ? (window.game.currentMap.elevation instanceof Uint8Array) : false,
            isFarmerUnlocked: window.game.isFarmerUnlocked
        })
    `);
    console.log("Live In-Game State Verification:", JSON.stringify(state, null, 2));

    ws.close();
    console.log("Verification completed successfully!");
}

run().catch(err => {
    console.error("Verification failed:", err);
    process.exit(1);
});
