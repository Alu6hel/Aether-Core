const http = require('http');

async function getWsUrl() {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:9222/json/list', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const list = JSON.parse(data);
                resolve(list[0].webSocketDebuggerUrl);
            });
        }).on('error', reject);
    });
}

async function run() {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    
    ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({
        id: 3,
        method: 'Runtime.evaluate',
        params: {
            expression: "JSON.stringify({ state: window.game ? window.game.gameState : 'none', screen: window.game && window.game.screens ? window.game.screens.currentScreen : 'none' })",
            returnByValue: true
        }
    }));

    ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 3) {
            console.log("Evaluate result:", msg.result.result.value);
            ws.close();
            process.exit(0);
        }
    });
}

run().catch(console.error);
