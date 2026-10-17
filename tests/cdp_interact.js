const http = require('http');
const { execSync } = require('child_process');

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
                else resolve(parsed.result);
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

function captureScreenshot(filename) {
    execSync(`adb -s 100.115.92.2:5555 exec-out screencap -p > /home/davidalujones/.gemini/antigravity/brain/33a4f4b8-b19c-4ab5-a8c1-dc823f15bf14/${filename}`);
    console.log(`[SCREENSHOT] Saved: ${filename}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to CDP at', wsUrl);

    // 1. Capture Solar Zenith Phase on Title Screen
    console.log('\n--- 1. Testing Title Screen: Solar Zenith Phase ---');
    await evaluate(ws, `
        window.game.renderer.titleAnimTimer = 14.0; // cycle = (14 * 0.04) % 1.0 = 0.56 (Solar Zenith)
    `);
    await sleep(400);
    captureScreenshot('screen_live_56_title_solar_zenith.png');

    // 2. Capture Red Giant Phase on Title Screen
    console.log('\n--- 2. Testing Title Screen: Red Giant Phase ---');
    await evaluate(ws, `
        window.game.renderer.titleAnimTimer = 20.0; // cycle = (20 * 0.04) % 1.0 = 0.80 (Red Giant)
    `);
    await sleep(400);
    captureScreenshot('screen_live_57_title_red_giant.png');

    // 3. Open Save Slots Modal & Populate test occupied slots
    console.log('\n--- 3. Testing Save Slots Modal & Wipe Buttons ---');
    await evaluate(ws, `
        // Ensure slots 0, 1, 2 are populated with distinct expedition runs
        window.game.saveSlots[0] = { pioneerName: 'ALU-01', selectedClass: 'SUPER_SOLDIER', currentDay: 5, coins: 210 };
        window.game.saveSlots[1] = { pioneerName: 'CIPHER-9', selectedClass: 'TECHNO_MAGE', currentDay: 8, coins: 450 };
        window.game.saveSlots[2] = { pioneerName: 'SOL-7', selectedClass: 'FARMER_GOD', currentDay: 12, coins: 999 };
        window.game.writeSaveSlots();
        window.game.openSaveSlotsModal();
    `);
    await sleep(500);
    captureScreenshot('screen_live_58_save_slots_with_wipe.png');

    // 4. Test Deleting Slot 1 (CIPHER-9) via deleteSlot
    console.log('\n--- 4. Testing Slot Deletion (Wiping Slot 2) ---');
    await evaluate(ws, `
        window.game.deleteSlot(1);
    `);
    await sleep(500);
    captureScreenshot('screen_live_59_slot_wiped_to_new_run.png');

    // 5. Click "+ NEW RUN" on Slot 2 (index 1) -> opens Character Setup Modal
    console.log('\n--- 5. Testing Character Selection Routing After Slot Choice ---');
    await evaluate(ws, `
        window.game.openCharacterSelectionForSlot(1);
    `);
    await sleep(500);
    captureScreenshot('screen_live_60_character_selection_for_slot.png');

    // 6. Select TECHNO-MAGE, set Callsign to "CHRONO-MAGE", and Confirm Embark
    console.log('\n--- 6. Embarking into Slot 02 with Techno-Mage ---');
    await evaluate(ws, `
        document.getElementById('callsign-input').value = 'CHRONO-MAGE';
        // Select Techno-Mage class card
        const mageCard = document.getElementById('card-mage');
        if (mageCard) mageCard.click();
        // Click confirm & embark button
        const confirmBtn = document.getElementById('btn-confirm-setup');
        if (confirmBtn) confirmBtn.click();
    `);
    await sleep(800);
    captureScreenshot('screen_live_61_ingame_techno_mage.png');

    // Check active slot and character class
    const checkRes = await evaluate(ws, `
        ({
            gameState: window.game.gameState,
            activeSlot: window.game.activeSlotIndex,
            pioneerName: window.game.pioneerName,
            selectedClass: window.game.selectedClass,
            areaName: window.game.currentMap.areaName,
            dayTimer: window.game.dayTimer,
            dayTimerPacing: '600s/day'
        })
    `);
    console.log('In-Game State:', checkRes.result ? checkRes.result.value : checkRes);

    ws.close();
    console.log('\nAll live CDP test interactions completed successfully!');
}

run().catch(console.error);
