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
                else resolve(parsed.result ? parsed.result.value : null);
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
    console.log(`[SCREENSHOT] Saved via ADB screencap: ${filename}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to CDP at', wsUrl);

    // 1. Title Screen: Starry night sky with disconnected stars & 💦 cores chip
    console.log('\n--- 1. Title Screen (Disconnected Stars & 💦 Cores) ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => window.game.closeModal(m));
        window.game.renderer.titleAnimTimer = 2.0; // Early night with stars
        window.game.setGameState('START_SCREEN');
        window.game.screens.currentScreen = 'START';
    `);
    await sleep(800);
    captureScreenshot('title_screen_disconnected_stars_and_sweat_cores.png');

    // 2. Settings Modal: Clean audio/touch settings with typography & text readability removed
    console.log('\n--- 2. Settings Modal (Typography Removed) ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => window.game.closeModal(m));
        window.game.toggleSoundModal();
    `);
    await sleep(800);
    captureScreenshot('settings_modal_no_typography.png');

    // 3. Remains Modal: 3 Live Rotating Celestial Cores matching Title Screen
    console.log('\n--- 3. Remains Modal (Title Screen Cores) ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => window.game.closeModal(m));
        window.game.openRemainsModal();
    `);
    await sleep(1000);
    captureScreenshot('remains_modal_live_celestial_cores.png');

    // 4. Enter Gameplay Expedition
    console.log('\n--- 4. Enter Gameplay Expedition ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => window.game.closeModal(m));
        window.game.startNewExpeditionInSlot(0);
        window.game.cutscenes.isComplete = true;
        window.game.currentDay = 1;
        window.game.dayTimer = 0.5; // High noon sunlight
    `);
    await sleep(800);

    // 5. Organic Yggdrasil Skill Tree of Life Modal in Game
    console.log('\n--- 5. Yggdrasil Tree of Life Skill Tree ---');
    await evaluate(ws, `
        window.game.player.unspentSP = 15;
        window.game.openSkillTreeModal();
    `);
    await sleep(1000);
    captureScreenshot('yggdrasil_tree_of_life_skill_tree.png');

    // Close the skill tree modal before capturing gameplay
    await evaluate(ws, `
        window.game.closeModal(document.getElementById('skill-tree-modal'));
        document.querySelectorAll('.game-modal').forEach(m => window.game.closeModal(m));
    `);
    await sleep(600);

    // 6. In-Game Gameplay with Visual Equipped Weapon and Armor (DOWN - Front view)
    console.log('\n--- 6. Gameplay with Visual Gear (DOWN) ---');
    await evaluate(ws, `
        window.game.player.equippedWeapon = window.BASE_ITEMS.SOLARION_BROADSWORD;
        window.game.player.equippedArmor = window.BASE_ITEMS.GENESIS_STARMANTLE;
        window.game.player.cardinalFacing = 'DOWN';
    `);
    await sleep(800);
    captureScreenshot('gameplay_visual_gear_front_solarion.png');

    // 7. Cardinal Directions Gear Showcase (RIGHT - Primordial Void Scythe & Vanguard Armor)
    console.log('\n--- 7. Cardinal Directions Gear Showcase (RIGHT) ---');
    await evaluate(ws, `
        window.game.player.equippedWeapon = window.BASE_ITEMS.PRIMORDIAL_VOID_SCYTHE;
        window.game.player.equippedArmor = window.BASE_ITEMS.VANGUARD_CHESTPLATE;
        window.game.player.cardinalFacing = 'RIGHT';
    `);
    await sleep(800);
    captureScreenshot('gameplay_visual_gear_right_void_scythe.png');

    // 8. Cardinal Directions Gear Showcase (UP - Back Armor rendering)
    console.log('\n--- 8. Cardinal Directions Gear Showcase (UP) ---');
    await evaluate(ws, `
        window.game.player.cardinalFacing = 'UP';
    `);
    await sleep(800);
    captureScreenshot('gameplay_visual_gear_up_back_armor.png');

    // 9. Cardinal Directions Gear Showcase (LEFT - Ultrasonic Sword & Aegis Shield)
    console.log('\n--- 9. Cardinal Directions Gear Showcase (LEFT) ---');
    await evaluate(ws, `
        window.game.player.equippedWeapon = window.BASE_ITEMS.ULTRASONIC_SWORD;
        window.game.player.equippedArmor = window.BASE_ITEMS.AEGIS_VANGUARD_SHIELD;
        window.game.player.cardinalFacing = 'LEFT';
    `);
    await sleep(800);
    captureScreenshot('gameplay_visual_gear_left_ultrasonic_shield.png');

    console.log('\n=== ALL TARGET ADB SCREENSHOTS CAPTURED SUCCESSFULLY! ===');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
