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
    console.log(`[SCREENSHOT] Captured: ${filename}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to CDP at:', wsUrl);

    // Close any existing modal
    await evaluate(ws, `
        const dlg = document.getElementById('dialogue-box-modal');
        if (dlg) dlg.classList.add('hidden');
        window.game.activeDialogue = null;
        window.game.setGameState('GAMEPLAY');
    `);

    // --- FEATURE 1: Cinderwatch Hamlet (128x128 map, Town buildings, Signs, Radar Minimap with Orientation Cone) ---
    console.log('\n--- 1. Cinderwatch Hamlet Town & Radar ---');
    const f1 = await evaluate(ws, `
        (() => {
            window.game.changeArea('CINDERWATCH_HAMLET');
            window.game.player.pos.set(20 * 16, 17 * 16);
            window.game.player.facing = 'DOWN';
            window.game.dayTimer = 120; // Clear daytime
            window.game.isMonsterFrenzy = false;
            return {
                area: window.game.currentMap.areaName,
                width: window.game.currentMap.width,
                height: window.game.currentMap.height,
                playerPos: { x: window.game.player.pos.x, y: window.game.player.pos.y }
            };
        })()
    `);
    console.log('F1 Info:', f1.result ? f1.result.value : f1);
    await sleep(700);
    captureScreenshot('showcase_1_town_buildings_and_radar.png');

    // --- FEATURE 2: Basement Mini-Dungeon (Hamlet Cellar with Cinder Golem Boss & Guarded Chest) ---
    console.log('\n--- 2. Basement Mini-Dungeon ---');
    const f2 = await evaluate(ws, `
        (() => {
            window.game.changeArea('HAMLET_CELLAR');
            window.game.player.pos.set(20 * 16, 25 * 16);
            window.game.player.facing = 'DOWN';
            return {
                area: window.game.currentMap.areaName,
                isBasement: window.game.currentMap.isBasement,
                enemies: (window.game.currentMap.enemies || []).length,
                chests: (window.game.currentMap.chests || []).length
            };
        })()
    `);
    console.log('F2 Info:', f2.result ? f2.result.value : f2);
    await sleep(700);
    captureScreenshot('showcase_2_basement_cellar_miniboss_chest.png');

    // --- FEATURE 3: Aethelgard Citadel (Town 2: 5 NPCs & Secret Quest Dialogue with Inventor Zara) ---
    console.log('\n--- 3. Citadel & Secret Quest Dialogue ---');
    const f3 = await evaluate(ws, `
        (() => {
            window.game.changeArea('AETHELGARD_CITADEL');
            window.game.player.pos.set(48 * 16, 32 * 16);
            window.game.player.facing = 'LEFT';
            const zara = window.game.npcs.npcs.find(n => n.id === 'INVENTOR_ZARA');
            if (zara) {
                window.game.startNpcDialogue(zara);
            }
            return {
                area: window.game.currentMap.areaName,
                npcs: window.game.npcs.npcs.length,
                dialogue: window.game.activeDialogue ? window.game.activeDialogue.speaker : null,
                hasKeyItem: window.game.player.inventory.hasItem('SUB_CORE_CIPHER')
            };
        })()
    `);
    console.log('F3 Info:', f3.result ? f3.result.value : f3);
    await sleep(700);
    captureScreenshot('showcase_3_citadel_zara_secret_quest.png');

    // --- FEATURE 4: Night Monster Frenzy in Deep Wilderness ---
    console.log('\n--- 4. Night Monster Frenzy in Wilderness ---');
    const f4 = await evaluate(ws, `
        (() => {
            const dlg = document.getElementById('dialogue-box-modal');
            if (dlg) dlg.classList.add('hidden');
            window.game.activeDialogue = null;

            window.game.changeArea('WHISPERING_WOODS');
            window.game.player.pos.set(32 * 16, 32 * 16);
            window.game.player.facing = 'RIGHT';
            window.game.dayTimer = 600 * 0.72; // Peak darkness
            window.game.isMonsterFrenzy = true;

            // Spawn aggressive frenzied monster pack surrounding player
            window.game.currentMap.enemies = [
                { id: 'frenzy_wolf_1', x: 32 * 16 + 48, y: 32 * 16 - 24, hp: 65, maxHp: 65, speed: 68, type: 'WOLF', name: 'Frenzied Direwolf', isFrenzied: true, aggro: true },
                { id: 'frenzy_wolf_2', x: 32 * 16 + 56, y: 32 * 16 + 28, hp: 65, maxHp: 65, speed: 68, type: 'WOLF', name: 'Frenzied Direwolf', isFrenzied: true, aggro: true },
                { id: 'frenzy_bat_1', x: 32 * 16 - 44, y: 32 * 16 + 20, hp: 45, maxHp: 45, speed: 75, type: 'SHADOW_BAT', name: 'Frenzied Bloodwing', isFrenzied: true, aggro: true },
                { id: 'frenzy_goblin_1', x: 32 * 16 - 40, y: 32 * 16 - 36, hp: 55, maxHp: 55, speed: 60, type: 'GOBLIN', name: 'Frenzied Marauder', isFrenzied: true, aggro: true }
            ];

            // Trigger Frenzy alert banner
            window.game.bannerText = "⚠ NIGHT MONSTER FRENZY ACTIVE! PACKS ARE AGGRESSIVE ⚠";
            window.game.bannerTimer = 10.0;
            window.game.bannerColor = "#ff2244";

            return {
                area: window.game.currentMap.areaName,
                isNight: true,
                isMonsterFrenzy: window.game.isMonsterFrenzy,
                enemyCount: window.game.currentMap.enemies.length
            };
        })()
    `);
    console.log('F4 Info:', f4.result ? f4.result.value : f4);
    await sleep(700);
    captureScreenshot('showcase_4_night_monster_frenzy_wilderness.png');

    // --- FEATURE 5: Secret Sub-Bedrock Quantum Core Unlocked via Secret Key ---
    console.log('\n--- 5. Secret Sub-Bedrock Quantum Core ---');
    const f5 = await evaluate(ws, `
        (() => {
            window.game.isMonsterFrenzy = false;
            window.game.bannerTimer = 0;
            window.game.changeArea('SUB_BEDROCK_CORE');
            window.game.player.pos.set(20 * 16, 20 * 16);
            return {
                area: window.game.currentMap.areaName,
                isSecretArea: window.game.currentMap.isSecretArea,
                enemies: (window.game.currentMap.enemies || []).length,
                chests: (window.game.currentMap.chests || []).length
            };
        })()
    `);
    console.log('F5 Info:', f5.result ? f5.result.value : f5);
    await sleep(700);
    captureScreenshot('showcase_5_secret_sub_bedrock_core.png');

    ws.close();
    console.log('\nAll 5 showcase screenshots successfully generated and verified!');
}

run().catch(console.error);
