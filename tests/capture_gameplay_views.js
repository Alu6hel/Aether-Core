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

    // 1. Open Character Setup Modal to show all 5 classes
    console.log('\n--- 1. Capturing Setup Modal with 5 Classes ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        const setupModal = document.getElementById('setup-modal');
        setupModal.classList.remove('hidden');
        window.game.renderUIPixelCanvases();
        const chronoCard = document.querySelector('.class-card[data-class="CHRONO_GLITCHER"]');
        if (chronoCard) chronoCard.click();
    `);
    await sleep(600);
    captureScreenshot('screen_live_85_setup_chrono_card.png');

    await evaluate(ws, `
        const archCard = document.querySelector('.class-card[data-class="SOLARION_ARCHITECT"]');
        if (archCard) archCard.click();
    `);
    await sleep(600);
    captureScreenshot('screen_live_86_setup_architect_card.png');

    // 2. Enter Gameplay directly
    console.log('\n--- 2. Entering Gameplay & Tree Occlusion ---');
    await evaluate(ws, `
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        window.game.setGameState('GAMEPLAY');
        window.game.cutscenes.isComplete = true; // Skip cutscenes

        // Find a pine tree in current map
        const tree = window.game.currentMap.resourceNodes.find(n => n.type === 'PINE_TREE');
        if (tree) {
            // Position player directly behind the tree (north of tree center: tree.y - 12)
            window.game.player.pos.x = tree.x;
            window.game.player.pos.y = tree.y - 12;
            window.game.player.cardinalFacing = 'DOWN';
            window.game.renderer.camera.x = tree.x;
            window.game.renderer.camera.y = tree.y - 12;
        }
    `);
    await sleep(800);
    captureScreenshot('screen_live_87_player_behind_tree_in_game.png');

    // 3. Harvest Tree to show stump on ground pass
    console.log('\n--- 3. Harvesting Tree into Ground Stump ---');
    await evaluate(ws, `
        const tree = window.game.currentMap.resourceNodes.find(n => n.type === 'PINE_TREE');
        if (tree) {
            tree.hp = 0; // Harvested
            window.game.player.pos.x = tree.x + 18;
            window.game.player.pos.y = tree.y;
            window.game.renderer.camera.x = tree.x + 18;
            window.game.renderer.camera.y = tree.y;
        }
    `);
    await sleep(800);
    captureScreenshot('screen_live_88_tree_stump_in_game.png');

    // 4. Open Expanded 8-Skill Tree Modal
    console.log('\n--- 4. Expanded 8-Skill Tree in Game ---');
    await evaluate(ws, `
        window.game.toggleSkillTree();
    `);
    await sleep(800);
    captureScreenshot('screen_live_89_expanded_skill_tree_in_game.png');

    // Close Skill Tree
    await evaluate(ws, `
        const stClose = document.getElementById('skill-tree-close');
        if (stClose) stClose.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    `);
    await sleep(500);

    // 5. Explore Solarium Dunes Biome
    console.log('\n--- 5. Solarium Dunes Biome ---');
    await evaluate(ws, `
        window.game.changeArea('SOLARIUM_DUNES');
    `);
    await sleep(1000);
    captureScreenshot('screen_live_90_solarium_dunes_gameplay.png');

    // 6. Explore Celestial Zenith Biome
    console.log('\n--- 6. Celestial Zenith Biome ---');
    await evaluate(ws, `
        window.game.changeArea('CELESTIAL_ZENITH');
    `);
    await sleep(1000);
    captureScreenshot('screen_live_91_celestial_zenith_gameplay.png');

    console.log('\n=== ALL GAMEPLAY SCREENSHOTS CAPTURED! ===');
    ws.close();
}

run().catch(err => {
    console.error('CDP Error:', err);
    process.exit(1);
});
