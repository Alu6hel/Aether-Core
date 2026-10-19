const http = require('http');

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

    let id = 1;
    function evalExpr(expr) {
        return new Promise((resolve) => {
            const reqId = id++;
            const handler = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id === reqId) {
                    ws.removeEventListener('message', handler);
                    resolve(msg.result && msg.result.result ? msg.result.result.value : null);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({
                id: reqId,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true }
            }));
        });
    }

    console.log("=== AUDIT 1: Check Current Screen & State ===");
    const state = await evalExpr("JSON.stringify({ state: window.game.gameState, screen: window.game.screens.currentScreen })");
    console.log("State:", state);

    console.log("\n=== AUDIT 2: Test Settings Modal Open & Close without Tap-Through ===");
    await sleep(400);
    await evalExpr("document.getElementById('start-tab-settings').click()");
    await sleep(100);
    let soundModalHidden = await evalExpr("document.getElementById('sound-modal').classList.contains('hidden')");
    console.log("Settings Modal opened (hidden===false)?", !soundModalHidden);

    // Verify Typography Switching
    console.log("\n=== AUDIT 3: Toggle Typography Mode ===");
    await sleep(400);
    await evalExpr("document.querySelector('.font-choice-btn[data-font=\"large\"]').click()");
    await sleep(100);
    let hasFontModeLarge = await evalExpr("document.body.classList.contains('font-mode-large')");
    let fontScale = await evalExpr("getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale')");
    console.log("Switched to Large Font: class added?", hasFontModeLarge, "scale:", (fontScale||'').trim());

    await sleep(400);
    await evalExpr("document.querySelector('.font-choice-btn[data-font=\"standard\"]').click()");
    await sleep(100);
    hasFontModeLarge = await evalExpr("document.body.classList.contains('font-mode-large')");
    fontScale = await evalExpr("getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale')");
    console.log("Switched to Standard Font: class removed?", !hasFontModeLarge, "scale:", (fontScale||'').trim());

    // Close Settings Modal
    console.log("\n=== AUDIT 4: Close Settings & Test Ghost Click Suppression ===");
    await sleep(400);
    await evalExpr("document.getElementById('sound-close').click()");
    await sleep(100);
    soundModalHidden = await evalExpr("document.getElementById('sound-modal').classList.contains('hidden')");
    console.log("Settings Modal closed (hidden===true)?", soundModalHidden);

    // Check if Currency Info Modal was accidentally triggered
    let currencyModalHidden = await evalExpr("document.getElementById('currency-info-modal').classList.contains('hidden')");
    console.log("Currency Info Modal is still hidden (no ghost click)?", currencyModalHidden);

    console.log("\n=== AUDIT 5: Test All Modals Open & Close Safely ===");
    const modals = [
        { name: 'Remains Modal', openBtn: 'start-tab-remains', closeBtn: 'remains-close', modalId: 'remains-modal' },
        { name: 'Shop Modal', openBtn: 'start-tab-shop', closeBtn: 'shop-close', modalId: 'shop-modal' },
        { name: 'Achievements Modal', openBtn: 'start-tab-achievements', closeBtn: 'achievements-close', modalId: 'achievements-modal' },
        { name: 'Records Modal', openBtn: 'start-tab-records', closeBtn: 'records-close', modalId: 'records-modal' },
        { name: 'Attendance Modal', openBtn: 'btn-attendance', closeBtn: 'attendance-close', modalId: 'attendance-modal' },
        { name: 'Currency Info Modal', openBtn: 'start-cores-chip', closeBtn: 'currency-info-close', modalId: 'currency-info-modal' },
    ];

    for (const m of modals) {
        await sleep(400);
        await evalExpr(`document.getElementById('${m.openBtn}').click()`);
        await sleep(100);
        const isOpen = !(await evalExpr(`document.getElementById('${m.modalId}').classList.contains('hidden')`));
        await sleep(200);
        await evalExpr(`document.getElementById('${m.closeBtn}').click()`);
        await sleep(100);
        const isClosed = await evalExpr(`document.getElementById('${m.modalId}').classList.contains('hidden')`);
        console.log(`- ${m.name}: open=${isOpen}, closed=${isClosed}`);
    }

    console.log("\nALL MODAL & TYPOGRAPHY TESTS COMPLETE!");
    ws.close();
    process.exit(0);
}

run().catch(err => {
    console.error("Audit error:", err);
    process.exit(1);
});
