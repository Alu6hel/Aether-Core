const { execSync } = require('child_process');

async function main() {
    const res = await fetch('http://localhost:9222/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id && pending.has(data.id)) {
            pending.get(data.id)(data.result);
            pending.delete(data.id);
        }
    };

    function send(method, params = {}) {
        return new Promise((resolve) => {
            const id = msgId++;
            pending.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await new Promise((resolve) => ws.onopen = resolve);

    async function evalCode(expression) {
        const res = await send('Runtime.evaluate', { expression, returnByValue: true });
        return res?.result?.value;
    }

    function capScreen(filename) {
        const outPath = `/home/davidalujones/.gemini/antigravity/brain/33a4f4b8-b19c-4ab5-a8c1-dc823f15bf14/${filename}`;
        execSync(`adb -s 100.115.92.2:5555 exec-out screencap -p > ${outPath}`);
        console.log(`[CAP] Captured: ${filename}`);
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    console.log("Closing all modals and starting live gameplay...");
    const resEval = await evalCode(`
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        window.game.selectedClass = 'SUPER_SOLDIER';
        window.game.pioneerName = 'ALU-01';
        window.game.startNewExpeditionInSlot(0);
        window.game.dayTimer = 0.68; // Golden hour
        window.game.updateHUD();
        ({ gameState: window.game.gameState, pPos: [window.game.player.pos.x, window.game.player.pos.y] });
    `);
    console.log("Eval result:", resEval);
    await sleep(1000);
    capScreen('screen_live_08_village_gameplay.png');

    console.log("Positioning player on the wooden bridge across river canal...");
    await evalCode(`
        window.game.player.pos.set(48 * 16 + 8, 27 * 16 + 8);
        window.game.dayTimer = 0.68;
        window.game.updateHUD();
    `);
    await sleep(800);
    capScreen('screen_live_09_bridge_canal_golden_hour.png');

    console.log("Performing elevation leap on wooden stairs / terrace...");
    await evalCode(`
        window.game.player.pos.set(28 * 16 + 8, 8 * 16 + 8);
        window.game.player.jump();
    `);
    await sleep(200);
    capScreen('screen_live_10_elevation_jump.png');

    console.log("Done!");
    ws.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
