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

    // 1. Title Screen: Lunar Crescent / Eclipse Mode (Stage 1, 8s into 80s cycle)
    console.log('\n--- 1. Capturing Title Screen: Lunar Crescent / Eclipse Phase (Stage 1) ---');
    await evaluate(ws, `
        window.game.setGameState('START_SCREEN');
        window.game.renderer.titleAnimTimer = 8.0; // cycle = (8 * 0.0125) = 0.10
    `);
    await sleep(600);
    captureScreenshot('screen_live_66_title_lunar_crescent.png');

    // 2. Title Screen: Radiant Solar Zenith (Stage 3, 44s into 80s cycle)
    console.log('\n--- 2. Capturing Title Screen: Radiant Solar Zenith Phase (Stage 3) ---');
    await evaluate(ws, `
        window.game.renderer.titleAnimTimer = 44.0; // cycle = (44 * 0.0125) = 0.55
    `);
    await sleep(600);
    captureScreenshot('screen_live_67_title_solar_zenith.png');

    // 3. Open Skill Tree & Pioneer Mastery Matrix
    console.log('\n--- 3. Testing Skill Tree & Pioneer Mastery Matrix ---');
    await evaluate(ws, `
        window.game.openSkillTreeModal();
    `);
    await sleep(600);
    captureScreenshot('screen_live_68_skill_tree_modal.png');

    // 4. Unlock a Skill Node
    console.log('\n--- 4. Unlocking Skill Node ---');
    await evaluate(ws, `
        const firstUnlockBtn = document.querySelector('#skill-tree-container .skill-unlock-btn:not([disabled])');
        if (firstUnlockBtn) {
            firstUnlockBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        }
    `);
    await sleep(500);
    captureScreenshot('screen_live_69_skill_unlocked_mastered.png');

    // 5. Close Skill Tree & Embark into Game at High Noon (12:00)
    console.log('\n--- 5. Testing High Noon (12:00) Daylight & Clock Gauge ---');
    await evaluate(ws, `
        document.getElementById('skill-tree-modal').classList.add('hidden');
        window.game.loadSlot(0);
        window.game.devSkip(); // Complete cutscene
        window.game.dayTimer = 0.50; // Exactly 12:00 High Noon
        window.game.updateHUD();
        window.game.updateClockGauge();
    `);
    await sleep(800);
    captureScreenshot('screen_live_70_high_noon_sunlight.png');

    // 6. Test Midnight (00:00) Deep Nocturnal Darkness & Torch Lighting
    console.log('\n--- 6. Testing Midnight (00:00) Deep Night & Torch ---');
    await evaluate(ws, `
        window.game.dayTimer = 0.00; // Exactly 00:00 Midnight
        window.game.updateHUD();
        window.game.updateClockGauge();
    `);
    await sleep(800);
    captureScreenshot('screen_live_71_midnight_torchlight.png');

    // 7. Test Active Class Ability / Ultimate (Whirlwind Strike)
    console.log('\n--- 7. Testing Active Class Ability (Whirlwind Strike) ---');
    await evaluate(ws, `
        window.game.dayTimer = 0.40; // Morning light
        window.game.player.energy = 90;
        window.game.player.abilityCooldowns[0] = 0;
        window.game.handleSpecialAbility();
        window.game.updateHUD();
    `);
    await sleep(500);
    captureScreenshot('screen_live_72_active_whirlwind_ability.png');

    console.log('\n[ALL CDP LIVE INTERACTION VERIFICATIONS COMPLETE]');
    ws.close();
}

run().catch(err => {
    console.error('CDP Error:', err);
    process.exit(1);
});
