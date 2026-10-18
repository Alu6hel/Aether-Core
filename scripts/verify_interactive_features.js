const { execSync } = require('child_process');

async function main() {
    console.log("[TEST RUNNER] Fetching DevTools targets...");
    const res = await fetch('http://localhost:9222/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) {
        console.error("No DevTools page target found!");
        process.exit(1);
    }
    console.log("[TEST RUNNER] Connecting to:", page.webSocketDebuggerUrl);

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
    console.log("[TEST RUNNER] Connected to WebView via Chrome DevTools protocol.");

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

    // STEP 1: Open Remains Modal
    console.log("\n=== STEP 1: Open Remains Modal ===");
    await evalCode(`document.getElementById('start-tab-remains').click()`);
    await sleep(600);
    capScreen('screen_live_01_remains_modal.png');

    // Unbox Runic Coffer
    console.log("Unboxing Runic Coffer...");
    await evalCode(`document.querySelector('.relic-open-btn[data-chest="runic"]').click()`);
    await sleep(600);
    capScreen('screen_live_02_remains_reward.png');

    // Claim loot and close modal
    await evalCode(`document.getElementById('btn-claim-remains').click(); document.getElementById('remains-close').click();`);
    await sleep(400);

    // STEP 2: Open Shop Modal
    console.log("\n=== STEP 2: Open Shop Modal ===");
    await evalCode(`document.getElementById('start-tab-shop').click()`);
    await sleep(600);
    capScreen('screen_live_03_shop_modal.png');

    // Purchase Field Provisions
    console.log("Purchasing Field Provisions in Shop...");
    await evalCode(`document.querySelector('.shop-item-buy-btn[data-key="provisions"]').click()`);
    await sleep(400);
    await evalCode(`document.getElementById('shop-close').click()`);
    await sleep(400);

    // STEP 3: Open Attendance Modal
    console.log("\n=== STEP 3: Open Attendance Modal ===");
    await evalCode(`document.getElementById('btn-attendance').click()`);
    await sleep(600);
    capScreen('screen_live_04_attendance_modal.png');

    // Claim Day 1 Attendance
    console.log("Claiming Day 1 Attendance...");
    await evalCode(`document.getElementById('btn-claim-attendance').click()`);
    await sleep(400);
    capScreen('screen_live_05_attendance_claimed.png');
    await evalCode(`document.getElementById('attendance-close').click()`);
    await sleep(400);

    // STEP 4: Open Achievements Modal
    console.log("\n=== STEP 4: Open Achievements Modal ===");
    await evalCode(`document.getElementById('start-tab-achievements').click()`);
    await sleep(600);
    capScreen('screen_live_06_achievements_modal.png');
    await evalCode(`document.getElementById('achievements-close').click()`);
    await sleep(400);

    // STEP 5: Open Settings Modal
    console.log("\n=== STEP 5: Open Settings Modal ===");
    await evalCode(`document.getElementById('start-tab-settings').click()`);
    await sleep(600);
    capScreen('screen_live_07_settings_modal.png');
    await evalCode(`document.getElementById('sound-close').click()`);
    await sleep(400);

    // STEP 6: Deploy into Live GBA Village Gameplay
    console.log("\n=== STEP 6: Start Game & Enter Cinderwatch Hamlet ===");
    await evalCode(`
        (window.game || window.gameApp).screens.startGame('SUPER_SOLDIER', 'ALU-01');
        (window.game || window.gameApp).setGameState('GAMEPLAY');
        (window.game || window.gameApp).updateHUD();
    `);
    await sleep(1000);
    capScreen('screen_live_08_village_gameplay.png');

    // STEP 7: Move to Wooden Bridge over River Canal with Golden Hour
    console.log("\n=== STEP 7: Bridge Crossing & Golden Hour (Image 5) ===");
    await evalCode(`
        (window.game || window.gameApp).player.pos.set(48 * 16, 27 * 16);
        (window.game || window.gameApp).dayTimer = 0.68;
        (window.game || window.gameApp).updateHUD();
    `);
    await sleep(600);
    capScreen('screen_live_09_bridge_canal_golden_hour.png');

    // STEP 8: Elevation Jump on Ridge
    console.log("\n=== STEP 8: Elevation Jump Kinematics ===");
    await evalCode(`
        (window.game || window.gameApp).player.jump();
    `);
    await sleep(100);
    capScreen('screen_live_10_elevation_jump.png');

    console.log("\n[TEST RUNNER] ALL STEPS COMPLETED SUCCESSFULLY!");
    ws.close();
}

main().catch(err => {
    console.error("[ERROR]", err);
    process.exit(1);
});
