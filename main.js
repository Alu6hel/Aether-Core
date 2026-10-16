/**
 * Aether-Core: Main Game Orchestrator & Input Pipeline
 * 
 * Binds the ALU Seed Matrix, 8-Color Palettes, Kinematics,
 * Nine-Sols Tactical Combat, Sub-Bedrock Dungeons, Inventory,
 * Bonding Curve Market, and GBA Cutscenes.
 */

class GameApp {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new RetroRenderer(this.canvas);
        this.cutscenes = new CutsceneEngine();
        this.storage = new GameStorage();
        this.edgeClient = new EdgeWorldClient();
        this.inventory = new Inventory();
        
        // Game State
        this.currentSeed = 0x7F3A59DF;
        this.currentLayer = 'SURFACE'; // 'SURFACE' or 'SUB_CORE'
        this.surfaceMap = null;
        this.subCoreMap = null;
        this.currentMap = null;
        this.player = null;
        this.selectedClass = 'SUPER_SOLDIER';
        this.isFarmerUnlocked = false;
        this.soundEnabled = true;

        // Input state
        this.keys = {};
        this.touchDirs = { up: false, down: false, left: false, right: false };

        this.init();
    }

    init() {
        // Load persistent state if exists
        const saved = this.storage.load();
        if (saved) {
            if (saved.seed) this.currentSeed = saved.seed;
            if (saved.isFarmerUnlocked) {
                this.isFarmerUnlocked = true;
                this.updateFarmerButton();
            }
        }

        // 1. Generate Maps from Master Seed
        this.loadNewWorld(this.currentSeed);

        // 2. Setup Input Handlers & Modals
        this.setupKeyboard();
        this.setupTouchControls();
        this.setupUI();
        this.setupModals();

        // 3. Play GBA Intro Cutscene
        this.cutscenes.startIntroSequence(() => {
            console.log("Intro cutscene complete. Pioneer deployed.");
        });

        // 4. Start 60 FPS Game Loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));

        // Sync with edge gateway in background
        this.edgeClient.mintWorldCoin(this.currentSeed).then(res => {
            console.log("[EDGE SYNC]", res);
        });
    }

    loadNewWorld(seed) {
        this.currentSeed = seed;
        this.surfaceMap = new WorldMap(seed, 64, 64, 'SURFACE');
        this.subCoreMap = new WorldMap(seed, 48, 48, 'SUB_CORE');
        
        this.currentLayer = 'SURFACE';
        this.currentMap = this.surfaceMap;

        // Create player at map spawn
        this.player = new Character(this.selectedClass, this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
        
        this.updateHUD();
        this.saveState();
    }

    switchLayer(newLayer) {
        this.currentLayer = newLayer;
        if (newLayer === 'SUB_CORE') {
            this.currentMap = this.subCoreMap;
            this.player.pos.set(this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
            this.player.vel.set(0, 0);
            document.getElementById('layer-badge').innerText = "SUB-BEDROCK CORE";
            document.getElementById('layer-badge').style.background = "#4a148c";
            document.getElementById('layer-badge').style.color = "#ea80fc";
        } else {
            this.currentMap = this.surfaceMap;
            const caveExit = this.surfaceMap.caveEntrance;
            this.player.pos.set(caveExit.x * 16 + 8, (caveExit.y + 2) * 16 + 8);
            this.player.vel.set(0, 0);
            document.getElementById('layer-badge').innerText = "SURFACE OVERWORLD";
            document.getElementById('layer-badge').style.background = "#2a3b4c";
            document.getElementById('layer-badge').style.color = "#64b5f6";
        }
        if (this.soundEnabled) this.renderer.audio.playTone(330, 'sine', 0.2, 0.1);
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.renderer.audio.init();

            // Advance / skip cutscenes on Enter or Space
            if ((e.key === 'Enter' || e.key === ' ') && !this.cutscenes.isComplete) {
                this.cutscenes.skipStep();
                if (this.soundEnabled) this.renderer.audio.playTypewriter();
                return;
            }

            // Combat keys
            if (e.key.toLowerCase() === 'j') { // Attack
                this.handleAttack();
            } else if (e.key.toLowerCase() === 'k') { // Parry / Deflect
                this.handleParry();
            } else if (e.key.toLowerCase() === 'l') { // Dash / Skill
                this.handleSkill();
            } else if (e.key.toLowerCase() === 'e') { // Interact
                this.handleInteract();
            } else if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'i') {
                this.toggleInventory();
            } else if (e.key.toLowerCase() === 'm') {
                this.toggleMarket();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    setupTouchControls() {
        const dpadButtons = document.querySelectorAll('.dpad-btn');
        dpadButtons.forEach(btn => {
            const dir = btn.getAttribute('data-dir');
            const press = (e) => {
                e.preventDefault();
                this.touchDirs[dir] = true;
                btn.classList.add('pressed');
                this.renderer.audio.init();
            };
            const release = (e) => {
                e.preventDefault();
                this.touchDirs[dir] = false;
                btn.classList.remove('pressed');
            };
            btn.addEventListener('touchstart', press, { passive: false });
            btn.addEventListener('touchend', release, { passive: false });
            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
        });

        // Action Buttons
        const btnA = document.getElementById('btn-a');
        const btnB = document.getElementById('btn-b');
        const btnL = document.getElementById('btn-l');
        const btnR = document.getElementById('btn-r');

        const bindAction = (elem, cb) => {
            if (!elem) return;
            const act = (e) => {
                e.preventDefault();
                this.renderer.audio.init();
                cb();
            };
            elem.addEventListener('touchstart', act, { passive: false });
            elem.addEventListener('click', act);
        };

        bindAction(btnA, () => {
            if (!this.cutscenes.isComplete) this.cutscenes.skipStep();
            else this.handleAttack();
        });

        bindAction(btnB, () => {
            if (!this.cutscenes.isComplete) this.cutscenes.skipStep();
            else this.handleParry();
        });

        bindAction(btnL, () => this.handleSkill());
        bindAction(btnR, () => this.handleInteract());

        const btnSelect = document.getElementById('btn-select');
        bindAction(btnSelect, () => this.toggleMarket());

        const btnStart = document.getElementById('btn-start');
        bindAction(btnStart, () => {
            if (!this.cutscenes.isComplete) this.cutscenes.skipStep();
            else this.toggleInventory();
        });
    }

    setupUI() {
        // Class Buttons
        const classBtns = document.querySelectorAll('.class-btn');
        classBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetClass = btn.getAttribute('data-class');
                if (targetClass === 'FARMER_GOD' && !this.isFarmerUnlocked) {
                    alert("The Farmer is locked! Discover the hidden 3x3 arable plot beneath the sub-bedrock reactor to awaken the Deific Harvester.");
                    return;
                }
                this.selectedClass = targetClass;
                classBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Re-apply class to player
                this.player.charClass = targetClass;
                this.player.applyClassStats();
                this.updateHUD();
                if (this.soundEnabled) this.renderer.audio.playTone(550, 'triangle', 0.15, 0.1);
            });
        });

        // New Seed button
        document.getElementById('btn-seed').addEventListener('click', () => {
            const nextSeed = (Math.random() * 0xFFFFFFFF) >>> 0;
            this.loadNewWorld(nextSeed);
            if (this.soundEnabled) this.renderer.audio.playCoin();
        });

        // Sound toggle
        const sndBtn = document.getElementById('btn-sound');
        sndBtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            sndBtn.innerText = `SOUND: ${this.soundEnabled ? 'ON' : 'OFF'}`;
        });

        // Market button & ticker click
        document.getElementById('btn-market').addEventListener('click', () => this.toggleMarket());
        document.getElementById('coin-ticker').addEventListener('click', () => this.toggleMarket());
        document.getElementById('hud-wallet').addEventListener('click', () => this.toggleMarket());

        // Inventory button
        document.getElementById('btn-inventory').addEventListener('click', () => this.toggleInventory());
    }

    setupModals() {
        // Market Modal Controls
        const marketModal = document.getElementById('market-modal');
        document.getElementById('market-close').addEventListener('click', () => marketModal.classList.add('hidden'));

        document.getElementById('btn-buy-coin').addEventListener('click', () => {
            const curve = this.currentMap.bondingCurve;
            const res = curve.buy(10.0);
            this.player.coinsCollected += Math.round(res.tokensReceived);
            document.getElementById('market-log').innerText = `Bought ${res.tokensReceived.toFixed(2)} tokens for 10 ALU. Floor backed: ${res.floor.toFixed(3)} ALU`;
            this.updateHUD();
            this.renderMarketModal();
            if (this.soundEnabled) this.renderer.audio.playCoin();
        });

        document.getElementById('btn-sell-coin').addEventListener('click', () => {
            const curve = this.currentMap.bondingCurve;
            if (this.player.coinsCollected < 5) {
                document.getElementById('market-log').innerText = "Insufficient ALU tokens to sell!";
                return;
            }
            const res = curve.sell(5.0);
            this.player.coinsCollected -= 5;
            document.getElementById('market-log').innerText = `Sold 5 tokens for ${res.aluReturned.toFixed(2)} ALU. Current Price: ${res.newPrice.toFixed(3)} ALU`;
            this.updateHUD();
            this.renderMarketModal();
            if (this.soundEnabled) this.renderer.audio.playTone(400, 'triangle', 0.1, 0.1);
        });

        document.getElementById('btn-burn-floor').addEventListener('click', () => {
            const curve = this.currentMap.bondingCurve;
            if (this.player.coinsCollected <= 0) {
                document.getElementById('market-log').innerText = "No tokens to burn for floor payout!";
                return;
            }
            const tokens = Math.min(10, this.player.coinsCollected);
            const res = curve.burnForFloor(tokens);
            this.player.coinsCollected -= tokens;
            document.getElementById('market-log').innerText = `Emergency Floor Burn: Redeemed ${tokens} tokens for ${res.aluRedeemed.toFixed(3)} ALU reserve.`;
            this.updateHUD();
            this.renderMarketModal();
            if (this.soundEnabled) this.renderer.audio.playParry();
        });

        // Inventory Modal Controls
        const invModal = document.getElementById('inventory-modal');
        document.getElementById('inv-close').addEventListener('click', () => invModal.classList.add('hidden'));
    }

    toggleMarket() {
        const modal = document.getElementById('market-modal');
        if (modal.classList.contains('hidden')) {
            this.renderMarketModal();
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }

    renderMarketModal() {
        const curve = this.currentMap.bondingCurve;
        document.getElementById('m-ticker').innerText = curve.ticker;
        document.getElementById('m-price').innerText = `${curve.getCurrentPrice().toFixed(3)} ALU`;
        document.getElementById('m-floor').innerText = `${curve.getGuaranteedFloor().toFixed(3)} ALU`;
        document.getElementById('m-supply').innerText = curve.circulatingSupply.toFixed(1);
    }

    toggleInventory() {
        const modal = document.getElementById('inventory-modal');
        if (modal.classList.contains('hidden')) {
            this.renderInventoryModal();
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }

    renderInventoryModal() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        this.inventory.slots.forEach(slot => {
            const el = document.createElement('div');
            el.className = 'inv-slot';
            el.innerHTML = `<strong>${slot.item.name}</strong><span>x${slot.count}</span>`;
            el.addEventListener('click', () => {
                document.getElementById('item-details').innerHTML = `
                    <strong>${slot.item.name}</strong> (${slot.item.type})<br>
                    ${slot.item.desc}<br>
                    ${slot.item.type === 'CONSUMABLE' ? '<button id="btn-use-item" class="gba-btn-sm" style="margin-top:6px;">USE ITEM</button>' : ''}
                `;
                const useBtn = document.getElementById('btn-use-item');
                if (useBtn) {
                    useBtn.addEventListener('click', () => {
                        if (this.inventory.useItem(slot.item.id, this.player)) {
                            this.renderInventoryModal();
                            this.updateHUD();
                            if (this.soundEnabled) this.renderer.audio.playTone(660, 'sine', 0.2, 0.1);
                        }
                    });
                }
            });
            grid.appendChild(el);
        });
    }

    handleAttack() {
        this.player.primaryAttack(this.currentMap.enemies);
        if (this.soundEnabled) {
            if (this.player.charClass === 'TECHNO_MAGE') this.renderer.audio.playShoot();
            else this.renderer.audio.playSlash();
        }

        // Secret Farmer check: Did player strike the hidden 3x3 arable soil?
        if (this.currentLayer === 'SUB_CORE' && !this.isFarmerUnlocked && this.currentMap.secretSoilArea) {
            const pTx = Math.floor(this.player.pos.x / 16);
            const pTy = Math.floor(this.player.pos.y / 16);
            const sa = this.currentMap.secretSoilArea;
            if (pTx >= sa.x && pTx <= sa.x + 2 && pTy >= sa.y && pTy <= sa.y + 2) {
                this.unlockFarmer();
            }
        }
    }

    handleParry() {
        this.player.performParry();
        if (this.soundEnabled) this.renderer.audio.playTone(880, 'sine', 0.1, 0.05);
    }

    handleSkill() {
        this.player.specialSkill();
        if (this.soundEnabled) this.renderer.audio.playTone(600, 'sawtooth', 0.18, 0.08);
    }

    handleInteract() {
        const px = this.player.pos.x;
        const py = this.player.pos.y;

        // Check if near an Ancient Terminal
        for (const term of this.currentMap.terminals) {
            if (Math.hypot(px - term.x, py - term.y) < 28) {
                if (this.soundEnabled) this.renderer.audio.playTypewriter();
                this.cutscenes.activeSequence = [
                    {
                        type: 'DIALOGUE',
                        speaker: term.name,
                        text: term.log,
                        duration: 6.0
                    }
                ];
                this.cutscenes.isComplete = false;
                this.cutscenes.loadStep(0);
                return;
            }
        }

        // Check if near Cave Entrance on Surface
        if (this.currentLayer === 'SURFACE' && this.currentMap.caveEntrance) {
            const ce = this.currentMap.caveEntrance;
            if (Math.hypot(px - (ce.x * 16 + 8), py - (ce.y * 16 + 8)) < 24) {
                this.switchLayer('SUB_CORE');
                return;
            }
        }

        // Check if at Sub-Core entrance to return
        if (this.currentLayer === 'SUB_CORE') {
            const sp = this.currentMap.spawnPoint;
            if (Math.hypot(px - sp.x, py - sp.y) < 24) {
                this.switchLayer('SURFACE');
                return;
            }
        }
    }

    unlockFarmer() {
        this.isFarmerUnlocked = true;
        this.updateFarmerButton();
        this.saveState();

        if (this.soundEnabled) this.renderer.audio.playCoin();

        this.cutscenes.startFarmerUnlockSequence(() => {
            console.log("The Farmer has joined your roster!");
        });
    }

    updateFarmerButton() {
        const btn = document.getElementById('btn-farmer');
        if (btn) {
            btn.classList.remove('locked');
            btn.innerText = "THE FARMER (UNLOCKED!)";
            btn.style.color = "#76ff03";
            btn.style.borderColor = "#76ff03";
        }
    }

    saveState() {
        this.storage.save({
            seed: this.currentSeed,
            isFarmerUnlocked: this.isFarmerUnlocked,
            coins: this.player ? this.player.coinsCollected : 0
        });
    }

    updateHUD() {
        // Update Coin & Bonding curve info
        const curve = this.currentMap.bondingCurve;
        document.getElementById('coin-ticker').innerText = curve.ticker;
        document.getElementById('coin-price').innerText = `${curve.getCurrentPrice().toFixed(3)} ALU`;
        document.getElementById('coin-floor').innerText = `Floor: ${curve.getGuaranteedFloor().toFixed(3)} ALU`;
        document.getElementById('wallet-coins').innerText = this.player.coinsCollected;

        // Player Bars
        const hpPercent = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
        const energyPercent = Math.max(0, (this.player.energy / this.player.maxEnergy) * 100);
        document.getElementById('hp-bar').style.width = `${hpPercent}%`;
        document.getElementById('hp-text').innerText = `${Math.round(this.player.hp)}/${this.player.maxHp}`;
        document.getElementById('energy-bar').style.width = `${energyPercent}%`;
        document.getElementById('energy-text').innerText = `${Math.round(this.player.energy)}/${this.player.maxEnergy}`;
    }

    updateInput() {
        let ix = 0;
        let iy = 0;

        if (this.keys['w'] || this.keys['arrowup'] || this.touchDirs.up) iy -= 1;
        if (this.keys['s'] || this.keys['arrowdown'] || this.touchDirs.down) iy += 1;
        if (this.keys['a'] || this.keys['arrowleft'] || this.touchDirs.left) ix -= 1;
        if (this.keys['d'] || this.keys['arrowright'] || this.touchDirs.right) ix += 1;

        this.player.setInput(ix, iy);
    }

    updateEnemies(dt) {
        const enemies = this.currentMap.enemies;
        const player = this.player;

        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;

            const dist = Math.hypot(player.pos.x - enemy.x, player.pos.y - enemy.y);

            // Simple aggro AI: Move toward player if in range
            if (dist < 140 && dist > 14) {
                const spd = enemy.isBoss ? 45 : 35;
                enemy.x += ((player.pos.x - enemy.x) / dist) * spd * dt;
                enemy.y += ((player.pos.y - enemy.y) / dist) * spd * dt;
            }

            // Attack player if in melee contact
            if (dist < 16 && (!enemy.attackCd || enemy.attackCd <= 0)) {
                enemy.attackCd = 1.0; // 1s attack cooldown
                const res = player.takeDamage(enemy.attackDamage, true);
                if (res.parried && this.soundEnabled) {
                    this.renderer.audio.playParry();
                    // Knock enemy back on successful parry
                    enemy.x -= (player.facing.x) * 32;
                    enemy.y -= (player.facing.y) * 32;
                    enemy.hp -= 20; // Parry counter damage
                } else if (!res.parried && res.damageTaken > 0 && this.soundEnabled) {
                    this.renderer.audio.playTone(160, 'sawtooth', 0.15, 0.1);
                }
            }

            if (enemy.attackCd > 0) enemy.attackCd -= dt;
        }
    }

    loop(currentTime) {
        const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000.0);
        this.lastTime = currentTime;

        // 1. Update Cutscenes or Gameplay
        if (!this.cutscenes.isComplete) {
            this.cutscenes.update(dt);
        } else {
            this.updateInput();
            this.player.update(dt, this.currentMap);
            this.player.updateCombat(dt, this.currentMap.enemies);
            this.updateEnemies(dt);
        }

        // 2. Camera Update
        this.renderer.updateCamera(this.player.pos, this.currentMap.width, this.currentMap.height, dt);

        // 3. Render Pass
        this.renderer.clear();
        this.renderer.renderMap(this.currentMap, dt);
        this.renderer.renderEnemies(this.currentMap.enemies, this.currentMap.palette.colors);
        this.renderer.renderCharacter(this.player, this.currentMap.palette.colors);

        // 4. Render Cutscenes & Overlays
        this.renderer.renderDialogue(this.cutscenes);

        // 5. Update HUD metrics
        this.updateHUD();

        requestAnimationFrame(this.loop.bind(this));
    }
}

// Launch on page load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameApp();
    console.log("Aether-Core Game App running successfully with full logic.");
});
