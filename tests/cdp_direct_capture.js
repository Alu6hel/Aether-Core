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

    // 1. Title Screen: Smooth Cosmic Solar Zenith (No text beneath sun)
    console.log('\n--- 1. Title Screen ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        window.game.renderer.titleAnimTimer = 40.0; // cycle = 0.50 (Solar Zenith)
        window.game.setGameState('START_SCREEN');
    `);
    await sleep(600);
    await captureScreenshot(ws, 'screen_live_92_title_smooth_zenith.png');

    // 2. Setup Modal with 5 classes (Warrior, Mage, Chrono-Glitcher, Solarion Architect, Farmer)
    console.log('\n--- 2. Setup Modal with 5 Classes ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        const setupModal = document.getElementById('setup-modal');
        setupModal.classList.remove('hidden');
        window.game.screens.currentScreen = 'SETUP';
        window.game.renderUIPixelCanvases();
        const chronoCard = document.querySelector('.class-card[data-class="CHRONO_GLITCHER"]');
        if (chronoCard) chronoCard.click();
    `);
    await sleep(600);
    await captureScreenshot(ws, 'screen_live_93_setup_chrono_glitcher.png');

    await evaluate(ws, `
        const archCard = document.querySelector('.class-card[data-class="SOLARION_ARCHITECT"]');
        if (archCard) archCard.click();
    `);
    await sleep(600);
    await captureScreenshot(ws, 'screen_live_94_setup_solarion_architect.png');

    // 3. Settings Modal (Touch scale buttons & typography)
    console.log('\n--- 3. Settings Modal ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        window.game.toggleSoundModal();
    `);
    await sleep(600);
    await captureScreenshot(ws, 'screen_live_95_settings_modal_controls.png');

    // 4. In-Game Gameplay & Tree Occlusion (Player behind Pine Tree canopy)
    console.log('\n--- 4. Gameplay & Tree Occlusion ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        window.game.setGameState('GAMEPLAY');
        window.game.cutscenes.isComplete = true;

        const tree = window.game.currentMap.resourceNodes.find(n => n.type === 'PINE_TREE');
        if (tree) {
            window.game.player.pos.x = tree.x;
            window.game.player.pos.y = tree.y - 12; // North of tree
            window.game.player.cardinalFacing = 'DOWN';
            window.game.renderer.camera.x = tree.x;
            window.game.renderer.camera.y = tree.y - 12;
        }
    `);
    await sleep(800);
    await captureScreenshot(ws, 'screen_live_96_player_behind_pine_tree.png');

    // 5. Tree Stump ground pass
    console.log('\n--- 5. Tree Stump Ground Pass ---');
    await evaluate(ws, `
        const tree = window.game.currentMap.resourceNodes.find(n => n.type === 'PINE_TREE');
        if (tree) {
            tree.hp = 0; // Harvested
            window.game.player.pos.x = tree.x + 16;
            window.game.player.pos.y = tree.y;
            window.game.renderer.camera.x = tree.x + 16;
            window.game.renderer.camera.y = tree.y;
        }
    `);
    await sleep(800);
    await captureScreenshot(ws, 'screen_live_97_tree_stump_ground_pass.png');

    // 6. Expanded 8-Skill Tree in Game
    console.log('\n--- 6. Expanded 8-Skill Tree ---');
    await evaluate(ws, `
        window.game.toggleSkillTree();
    `);
    await sleep(800);
    await captureScreenshot(ws, 'screen_live_98_expanded_8_skill_tree.png');

    // Close Skill Tree
    await evaluate(ws, `
        const stClose = document.getElementById('skill-tree-close');
        if (stClose) stClose.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    `);
    await sleep(500);

    // 7. Solarium Dunes Biome
    console.log('\n--- 7. Solarium Dunes Biome ---');
    await evaluate(ws, `
        window.game.changeArea('SOLARIUM_DUNES');
    `);
    await sleep(1000);
    await captureScreenshot(ws, 'screen_live_99_solarium_dunes_gameplay.png');

    // 8. Celestial Zenith Biome
    console.log('\n--- 8. Celestial Zenith Biome ---');
    await evaluate(ws, `
        window.game.changeArea('CELESTIAL_ZENITH');
    `);
    await sleep(1000);
    await captureScreenshot(ws, 'screen_live_100_celestial_zenith_gameplay.png');

    console.log('\n=== ALL CDP DIRECT SCREENSHOTS CAPTURED! ===');
    ws.close();
}

run().catch(err => {
    console.error('CDP Direct Error:', err);
    process.exit(1);
});
