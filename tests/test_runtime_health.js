const http = require('http');

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

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to CDP at', wsUrl);

    // Check window.game state
    const gameState = await cdpSend(ws, 'Runtime.evaluate', {
        expression: `({
            gameState: window.game ? window.game.gameState : 'NO_GAME',
            currentScreen: window.game && window.game.screens ? window.game.screens.currentScreen : 'NO_SCREENS',
            currentAreaId: window.game ? window.game.currentAreaId : null,
            playerExists: !!(window.game && window.game.player),
            playerPos: window.game && window.game.player ? { x: window.game.player.pos.x, y: window.game.player.pos.y } : null,
            charClass: window.game && window.game.player ? window.game.player.charClass : null,
            canvasSize: window.game && window.game.canvas ? { w: window.game.canvas.width, h: window.game.canvas.height } : null,
            rendererExists: !!(window.game && window.game.renderer),
            rendererCamera: window.game && window.game.renderer ? { x: window.game.renderer.camera.x, y: window.game.renderer.camera.y } : null
        })`,
        returnByValue: true
    });
    console.log('Runtime Game State:', JSON.stringify(gameState.value, null, 2));

    ws.close();
}

run().catch(e => console.error(e));
