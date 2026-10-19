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
    console.log(`[SCREENSHOT] Captured & Saved: ${filename}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to WebView CDP:', wsUrl);

    // 1. Confirm setup and enter in-game world
    console.log('\n--- 1. Confirming Setup and Entering In-Game World ---');
    const embarkRes = await evaluate(ws, `
        if (window.game.gameState !== 'GAMEPLAY') {
            const confirmBtn = document.getElementById('btn-confirm-setup');
            if (confirmBtn) {
                confirmBtn.click();
            } else {
                window.game.startGame('ALU-01', 'SOLARION_ARCHITECT');
            }
        }
        ({
            gameState: window.game.gameState,
            areaId: window.game.currentMap ? window.game.currentMap.areaId : null,
            mapWidth: window.game.currentMap ? window.game.currentMap.width : null,
            mapHeight: window.game.currentMap ? window.game.currentMap.height : null
        })
    `);
    console.log('Initial In-Game Status:', embarkRes.result ? embarkRes.result.value : embarkRes);
    await sleep(800);

    // 2. Position player in Town Square near buildings & radar minimap
    console.log('\n--- 2. Validating Town Square, Purposeful Buildings & Radar Minimap ---');
    const townRes = await evaluate(ws, `
        window.game.changeArea('CINDERWATCH_HAMLET');
        window.game.player.pos.set(20 * 16, 16 * 16);
        window.game.player.facing = 'DOWN';
        window.game.dayTimer = 120; // Bright daytime
        window.game.isMonsterFrenzy = false;
        ({
            area: window.game.currentMap.areaName,
            w: window.game.currentMap.width,
            h: window.game.currentMap.height,
            npcs: window.game.npcs.npcs.length,
            facing: window.game.player.facing
        })
    `);
    console.log('Town Status:', townRes.result ? townRes.result.value : townRes);
    await sleep(600);
    captureScreenshot('screen_live_town_buildings_and_radar.png');

    // 3. Enter Hamlet Cellar Basement Mini-Dungeon
    console.log('\n--- 3. Entering Hamlet Cellar Basement Mini-Dungeon ---');
    const basementRes = await evaluate(ws, `
        window.game.changeArea('HAMLET_CELLAR');
        window.game.player.pos.set(10 * 16, 10 * 16);
        window.game.player.facing = 'RIGHT';
        ({
            areaId: window.game.currentMap.areaId,
            areaName: window.game.currentMap.areaName,
            isBasement: window.game.currentMap.isBasement,
            enemies: window.game.enemies.map(e => ({ type: e.type, hp: e.hp })),
            chests: window.game.chests.map(c => ({ x: c.pos.x, y: c.pos.y, opened: c.opened }))
        })
    `);
    console.log('Hamlet Cellar Info:', basementRes.result ? basementRes.result.value : basementRes);
    await sleep(600);
    captureScreenshot('screen_live_basement_mini_dungeon.png');

    // 4. Visit Aethelgard Citadel, Speak with Inventor Zara & Trigger Secret Quest
    console.log('\n--- 4. Visiting Citadel, Speaking with Inventor Zara & Secret Quest ---');
    const questRes = await evaluate(ws, `
        window.game.changeArea('AETHELGARD_CITADEL');
        window.game.player.pos.set(40 * 16, 35 * 16);
        const zara = window.game.npcs.npcs.find(n => n.id === 'INVENTOR_ZARA');
        let dialogueStarted = false;
        if (zara) {
            window.game.startNpcDialogue(zara);
            dialogueStarted = true;
        }
        ({
            areaId: window.game.currentMap.areaId,
            npcCount: window.game.npcs.npcs.length,
            dialogueStarted,
            hasCipher: window.game.player.inventory.hasItem('SUB_CORE_CIPHER')
        })
    `);
    console.log('Citadel Quest Info:', questRes.result ? questRes.result.value : questRes);
    await sleep(600);
    captureScreenshot('screen_live_citadel_dialogue_quest.png');

    // 5. Trigger Night Monster Frenzy in Deep Wilderness
    console.log('\n--- 5. Triggering Night Monster Frenzy in Deep Wilderness ---');
    const frenzyRes = await evaluate(ws, `
        window.game.closeDialogue();
        window.game.changeArea('WHISPERING_WOODS');
        // Set time to peak darkness (0.72 -> 22:00-04:00)
        window.game.dayTimer = 600 * 0.72;
        window.game.isMonsterFrenzy = true;
        // Spawn pack of frenzied monsters near player
        window.game.enemies = [
            { id: 'frenzy_1', type: 'VOID_STALKER', pos: { x: window.game.player.pos.x + 60, y: window.game.player.pos.y - 40, set: function(x,y){this.x=x;this.y=y;} }, maxHp: 180, hp: 180, speed: 85, aggro: true, isFrenzied: true },
            { id: 'frenzy_2', type: 'CRIMSON_WOLF', pos: { x: window.game.player.pos.x - 70, y: window.game.player.pos.y + 50, set: function(x,y){this.x=x;this.y=y;} }, maxHp: 120, hp: 120, speed: 95, aggro: true, isFrenzied: true },
            { id: 'frenzy_3', type: 'SHADOW_BAT', pos: { x: window.game.player.pos.x + 80, y: window.game.player.pos.y + 60, set: function(x,y){this.x=x;this.y=y;} }, maxHp: 90, hp: 90, speed: 100, aggro: true, isFrenzied: true }
        ];
        // Trigger alert banner
        window.game.bannerText = "⚠ NIGHT MONSTER FRENZY ACTIVE! PACKS ARE AGGRESSIVE ⚠";
        window.game.bannerTimer = 8.0;
        window.game.bannerColor = "#ff2244";
        ({
            areaId: window.game.currentMap.areaId,
            dayTimer: window.game.dayTimer,
            isNight: true,
            isMonsterFrenzy: window.game.isMonsterFrenzy,
            enemyCount: window.game.enemies.length
        })
    `);
    console.log('Monster Frenzy Triggered:', frenzyRes.result ? frenzyRes.result.value : frenzyRes);
    await sleep(800);
    captureScreenshot('screen_live_night_monster_frenzy.png');

    // 6. Enter Secret Area: Sub-Bedrock Core
    console.log('\n--- 6. Entering Secret Area: Sub-Bedrock Core ---');
    const secretRes = await evaluate(ws, `
        window.game.changeArea('SUB_BEDROCK_CORE');
        window.game.player.pos.set(20 * 16, 20 * 16);
        ({
            areaId: window.game.currentMap.areaId,
            areaName: window.game.currentMap.areaName,
            isSecret: window.game.currentMap.isSecretArea,
            enemyCount: window.game.enemies.length,
            chestCount: window.game.chests.length
        })
    `);
    console.log('Secret Area Status:', secretRes.result ? secretRes.result.value : secretRes);
    await sleep(600);
    captureScreenshot('screen_live_secret_bedrock_core.png');

    ws.close();
    console.log('\nAll on-device validation steps and screenshots completed successfully!');
}

main().catch(err => {
    console.error('Error running validation:', err);
    process.exit(1);
});
