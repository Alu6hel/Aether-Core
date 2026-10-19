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
    console.log(`[SCREENSHOT CAPTURED] ${filename}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to WebView CDP:', wsUrl);

    // Feature 1: Cinderwatch Hamlet (Town Square, Purposeful Buildings, Radar with Orientation Arrow)
    console.log('\n--- Feature 1: Cinderwatch Hamlet (Buildings & Radar) ---');
    await evaluate(ws, `
        window.game.setGameState('GAMEPLAY');
        window.game.changeArea('CINDERWATCH_HAMLET');
        window.game.player.pos.set(20 * 16, 17 * 16);
        window.game.player.facing = 'DOWN';
        window.game.dayTimer = 120; // Clear daytime
        window.game.isMonsterFrenzy = false;
    `);
    await sleep(600);
    captureScreenshot('feature1_cinderwatch_town_buildings_radar.png');

    // Feature 2: Basement Mini-Dungeon (Apothecary Secret Cellar with Boss & Guarded Chest)
    console.log('\n--- Feature 2: Basement Mini-Dungeon (Cellar with Boss & Chest) ---');
    await evaluate(ws, `
        window.game.changeArea('HAMLET_CELLAR');
        window.game.player.pos.set(10 * 16, 10 * 16);
        window.game.player.facing = 'RIGHT';
    `);
    await sleep(600);
    captureScreenshot('feature2_basement_mini_dungeon_cellar.png');

    // Feature 3: Aethelgard Citadel (Town 2: 5 NPCs & Secret Quest from Zara)
    console.log('\n--- Feature 3: Citadel Town & Secret Quest Dialogue ---');
    await evaluate(ws, `
        window.game.changeArea('AETHELGARD_CITADEL');
        window.game.player.pos.set(48 * 16, 34 * 16);
        const zara = window.game.npcs.npcs.find(n => n.id === 'INVENTOR_ZARA');
        if (zara) {
            window.game.startNpcDialogue(zara);
        }
    `);
    await sleep(600);
    captureScreenshot('feature3_citadel_zara_secret_quest.png');

    // Feature 4: Night Monster Frenzy in Whispering Woods (Alert Banner, Blood Vignette, Pack Spawns)
    console.log('\n--- Feature 4: Night Monster Frenzy in Deep Wilderness ---');
    await evaluate(ws, `
        window.game.closeDialogue();
        window.game.changeArea('WHISPERING_WOODS');
        window.game.player.pos.set(30 * 16, 30 * 16);
        window.game.dayTimer = 600 * 0.72; // Peak darkness
        window.game.isMonsterFrenzy = true;
        window.game.currentMap.enemies = [
            { id: 'frenzy_1', x: 30 * 16 + 50, y: 30 * 16 - 30, hp: 60, maxHp: 60, speed: 65, type: 'WOLF', name: 'Frenzied Wolf', isFrenzied: true },
            { id: 'frenzy_2', x: 30 * 16 - 45, y: 30 * 16 + 35, hp: 55, maxHp: 55, speed: 60, type: 'GOBLIN', name: 'Frenzied Goblin', isFrenzied: true },
            { id: 'frenzy_3', x: 30 * 16 + 55, y: 30 * 16 + 45, hp: 45, maxHp: 45, speed: 70, type: 'SHADOW_BAT', name: 'Frenzied Shadow Bat', isFrenzied: true }
        ];
        window.game.bannerText = "⚠ NIGHT MONSTER FRENZY ACTIVE! PACKS ARE AGGRESSIVE ⚠";
        window.game.bannerTimer = 10.0;
        window.game.bannerColor = "#ff2244";
    `);
    await sleep(800);
    captureScreenshot('feature4_night_monster_frenzy.png');

    // Feature 5: Secret Sub-Bedrock Quantum Core Unlocked via Quest
    console.log('\n--- Feature 5: Secret Sub-Bedrock Quantum Core ---');
    await evaluate(ws, `
        window.game.isMonsterFrenzy = false;
        window.game.bannerTimer = 0;
        window.game.changeArea('SUB_BEDROCK_CORE');
        window.game.player.pos.set(22 * 16, 22 * 16);
    `);
    await sleep(600);
    captureScreenshot('feature5_secret_sub_bedrock_core.png');

    ws.close();
    console.log('\nAll 5 feature showcase screenshots captured successfully on device!');
}

run().catch(console.error);
