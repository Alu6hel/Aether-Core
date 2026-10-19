const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getWsUrl() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const list = JSON.parse(data);
                const page = list.find(p => p.type === 'page') || list[0];
                resolve(page.webSocketDebuggerUrl);
            });
        }).on('error', reject);
    });
}

function evaluate(ws, expr) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const msg = JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        });
        const handler = (event) => {
            const resp = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
            if (resp.id === id) {
                ws.removeEventListener('message', handler);
                if (resp.result && resp.result.exceptionDetails) {
                    reject(resp.result.exceptionDetails);
                } else if (resp.result && resp.result.result) {
                    resolve(resp.result.result.value);
                } else {
                    resolve(resp.result ? resp.result.value : null);
                }
            }
        };
        ws.addEventListener('message', handler);
        ws.send(msg);
    });
}

async function run() {
    const wsUrl = await getWsUrl();
    console.log('Connecting to WebView CDP:', wsUrl);
    const ws = new globalThis.WebSocket(wsUrl);

    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    console.log('Connected to WebView DevTools!');

    // 1. Check current game state
    const gameState = await evaluate(ws, `(() => window.game ? window.game.gameState : 'UNKNOWN')()`);
    console.log('Current gameState:', gameState);

    // If on START_SCREEN, start the expedition directly
    console.log('Starting expedition into GAMEPLAY with slot 0...');
    await evaluate(ws, `(() => {
        if (window.game) {
            window.game.startNewExpeditionInSlot(0);
        }
    })()`);

    // Wait for world generation, player spawn, and render
    await new Promise(r => setTimeout(r, 2000));

    // 2. Verify gameplay UI state
    const hudStatus = await evaluate(ws, `(() => {
        const rusticCard = document.getElementById('rustic-vitals-card');
        const gameFooter = document.getElementById('game-footer');
        const touchControls = document.getElementById('touch-controls');
        const btnTouchSettings = document.getElementById('btn-touch-settings');
        const btnStart = document.getElementById('btn-start');
        const actionButtons = document.getElementById('action-buttons');
        
        return {
            gameState: window.game ? window.game.gameState : null,
            hasRusticCard: !!rusticCard && !rusticCard.closest('.rustic-hud').classList.contains('hidden'),
            hasGameFooter: !!gameFooter,
            hasCenterSettings: !!btnTouchSettings,
            hasCenterStart: !!btnStart,
            touchControlsHidden: touchControls ? touchControls.classList.contains('controls-hidden') : true,
            actionButtonsCount: actionButtons ? actionButtons.querySelectorAll('.action-btn').length : 0,
            playerHp: window.game.player ? window.game.player.hp : null,
            playerMaxHp: window.game.player ? window.game.player.maxHp : null
        };
    })()`);

    console.log('Gameplay HUD Status:', JSON.stringify(hudStatus, null, 2));

    // Save gameplay screenshot via adb
    execSync('adb -s 100.115.92.2:5555 shell screencap -p /sdcard/gameplay_clean.png');
    execSync('adb -s 100.115.92.2:5555 pull /sdcard/gameplay_clean.png /home/davidalujones/.gemini/antigravity/brain/33a4f4b8-b19c-4ab5-a8c1-dc823f15bf14/gameplay_clean_hud.png');
    console.log('Captured clean gameplay screenshot!');

    // 3. Open Inventory Modal and select first item
    console.log('Opening Inventory Modal and selecting slot 0...');
    await evaluate(ws, `(() => {
        if (window.game) {
            window.game.toggleInventory();
            const firstSlot = document.querySelector('#inventory-grid .inv-slot:not(.empty)');
            if (firstSlot) {
                firstSlot.click();
            }
        }
    })()`);

    await new Promise(r => setTimeout(r, 600));

    // 4. Verify Inventory State & Touch Controls layering
    const invStatus = await evaluate(ws, `(() => {
        const invModal = document.getElementById('inventory-modal');
        const touchControls = document.getElementById('touch-controls');
        const grid = document.getElementById('inventory-grid');
        const slots = grid ? grid.querySelectorAll('.inv-slot') : [];
        const gearBar = document.getElementById('equipped-gear-bar');
        const detailsEl = document.getElementById('item-details');

        return {
            invModalVisible: !!invModal && !invModal.classList.contains('hidden'),
            touchControlsHidden: touchControls ? touchControls.classList.contains('controls-hidden') : false,
            touchControlsZIndex: window.getComputedStyle(touchControls).zIndex,
            modalZIndex: window.getComputedStyle(invModal).zIndex,
            slotCount: slots.length,
            hasGearBar: !!gearBar,
            detailsText: detailsEl ? detailsEl.innerText.slice(0, 60) : 'NONE'
        };
    })()`);

    console.log('Inventory Modal Status:', JSON.stringify(invStatus, null, 2));

    // Save inventory screenshot via adb
    execSync('adb -s 100.115.92.2:5555 shell screencap -p /sdcard/inventory_clean.png');
    execSync('adb -s 100.115.92.2:5555 pull /sdcard/inventory_clean.png /home/davidalujones/.gemini/antigravity/brain/33a4f4b8-b19c-4ab5-a8c1-dc823f15bf14/inventory_clean_grid.png');
    console.log('Captured clean inventory screenshot!');

    // 5. Test using/equipping item via Inventory UI
    console.log('Testing item use / equip from Inventory...');
    const useResult = await evaluate(ws, `(() => {
        // Damage player a bit to test heal
        window.game.player.hp = 80;
        // Use nanite repair gel
        const res = window.game.inventory.useItem('NANITE_REPAIR_KIT', window.game.player);
        window.game.renderInventoryModal();
        window.game.updateHUD();
        return {
            useResult: res,
            newHp: window.game.player.hp,
            maxHp: window.game.player.maxHp
        };
    })()`);
    console.log('Item Use Result:', JSON.stringify(useResult, null, 2));

    ws.close();
    console.log('All live checks completed successfully!');
}

run().catch(err => {
    console.error('Error during verification:', err);
    process.exit(1);
});
