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

    // 1. Title Screen: Solar Zenith Phase (Zero words beneath sun, smooth cosine glow)
    console.log('\n--- 1. Title Screen Verification ---');
    await evaluate(ws, `
        window.game.renderer.titleAnimTimer = 40.0; // cycle = 0.50 (Solar Zenith)
        window.game.setGameState('START_SCREEN');
    `);
    await sleep(600);
    captureScreenshot('screen_live_75_title_smooth_zenith.png');

    // 2. Open Pioneer Awakening / Setup Modal showing Chrono-Glitcher and Solarion Architect
    console.log('\n--- 2. Roster Setup Verification ---');
    await evaluate(ws, `
        const btnStart = document.getElementById('btn-game-start');
        btnStart.click();
        const slotCard = document.querySelector('.save-slot-card');
        if (slotCard) slotCard.click();
    `);
    await sleep(600);
    await evaluate(ws, `
        // Select Chrono-Glitcher card
        const chronoCard = document.querySelector('.class-card[data-class="CHRONO_GLITCHER"]');
        if (chronoCard) chronoCard.click();
    `);
    await sleep(500);
    captureScreenshot('screen_live_76_setup_chrono_glitcher.png');

    // Select Solarion Architect
    await evaluate(ws, `
        const archCard = document.querySelector('.class-card[data-class="SOLARION_ARCHITECT"]');
        if (archCard) archCard.click();
    `);
    await sleep(500);
    captureScreenshot('screen_live_77_setup_solarion_architect.png');

    // 3. Confirm embark into gameplay
    console.log('\n--- 3. Embarking into Gameplay ---');
    await evaluate(ws, `
        const confirmBtn = document.getElementById('btn-confirm-setup');
        if (confirmBtn) confirmBtn.click();
    `);
    await sleep(800);

    // 4. Open Settings Modal (Touch scale & typography options)
    console.log('\n--- 4. Settings Modal Verification ---');
    await evaluate(ws, `
        window.game.toggleSoundModal();
    `);
    await sleep(600);
    captureScreenshot('screen_live_78_settings_modal_scaling.png');

    // Switch touch scale to Large (120%) and font to Large Clear
    await evaluate(ws, `
        const largeScaleBtn = document.querySelector('.scale-choice-btn[data-scale="1.2"]');
        if (largeScaleBtn) largeScaleBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        const largeFontBtn = document.querySelector('.font-choice-btn[data-font="large"]');
        if (largeFontBtn) largeFontBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    `);
    await sleep(500);
    captureScreenshot('screen_live_79_settings_applied_large.png');

    // Close settings modal
    await evaluate(ws, `
        const soundClose = document.getElementById('sound-close');
        if (soundClose) soundClose.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    `);
    await sleep(500);

    // 5. Player Depth Sorting (Player behind Pine Tree canopy)
    console.log('\n--- 5. Depth Sorting: Player Behind Pine Tree ---');
    await evaluate(ws, `
        const tree = window.game.currentMap.resourceNodes.find(n => n.type === 'PINE_TREE');
        if (tree) {
            // Position player directly behind the tree (tree.y - 10)
            window.game.player.pos.x = tree.x;
            window.game.player.pos.y = tree.y - 10;
            window.game.player.cardinalFacing = 'DOWN';
            window.game.renderer.camera.x = tree.x;
            window.game.renderer.camera.y = tree.y - 10;
        }
    `);
    await sleep(600);
    captureScreenshot('screen_live_80_player_behind_tree_occlusion.png');

    // Harvest tree into stump
    await evaluate(ws, `
        const tree = window.game.currentMap.resourceNodes.find(n => n.type === 'PINE_TREE');
        if (tree) {
            tree.hp = 0; // Harvested
            window.game.player.pos.x = tree.x + 14;
            window.game.player.pos.y = tree.y;
            window.game.renderer.camera.x = tree.x + 14;
            window.game.renderer.camera.y = tree.y;
        }
    `);
    await sleep(600);
    captureScreenshot('screen_live_81_tree_stump_ground_pass.png');

    // 6. Open Expanded 8-Skill Tree
    console.log('\n--- 6. Expanded 8-Skill Tree ---');
    await evaluate(ws, `
        window.game.toggleSkillTree();
    `);
    await sleep(600);
    captureScreenshot('screen_live_82_expanded_8_skill_tree.png');

    await evaluate(ws, `
        const skillClose = document.getElementById('skill-tree-close');
        if (skillClose) skillClose.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    `);
    await sleep(500);

    // 7. Solarium Dunes Biome
    console.log('\n--- 7. Solarium Dunes Biome Exploration ---');
    await evaluate(ws, `
        window.game.changeArea('SOLARIUM_DUNES');
    `);
    await sleep(800);
    captureScreenshot('screen_live_83_solarium_dunes_biome.png');

    // 8. Celestial Zenith Biome
    console.log('\n--- 8. Celestial Zenith Biome Exploration ---');
    await evaluate(ws, `
        window.game.changeArea('CELESTIAL_ZENITH');
    `);
    await sleep(800);
    captureScreenshot('screen_live_84_celestial_zenith_biome.png');

    console.log('\n=== ALL CDP VERIFICATIONS AND LIVE SCREENSHOTS COMPLETED! ===');
    ws.close();
}

run().catch(err => {
    console.error('CDP Error:', err);
    process.exit(1);
});
