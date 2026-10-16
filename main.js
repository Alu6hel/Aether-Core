/**
 * Aether-Core: Main Game Orchestrator & Input Pipeline
 * 
 * Binds the ALU Seed Matrix, 8-Color Palettes, Kinematics,
 * Nine-Sols Tactical Combat, Sub-Bedrock Dungeons, Inventory,
 * Bonding Curve Market, Character Setup, Menu Hub & Dev Tools.
 */

class GameApp {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new RetroRenderer(this.canvas);
        this.cutscenes = new CutsceneEngine();
        this.storage = new GameStorage();
        this.edgeClient = new EdgeWorldClient();
        this.inventory = new Inventory();
        this.screens = new ScreenManager(this);
        
        // Game State
        this.currentSeed = 0x7F3A59DF;
        this.currentLayer = 'SURFACE'; // 'SURFACE' or 'SUB_CORE'
        this.surfaceMap = null;
        this.subCoreMap = null;
        this.currentMap = null;
        this.player = null;
        this.selectedClass = 'SUPER_SOLDIER';
        this.pioneerName = 'ALU-01';
        this.isFarmerUnlocked = false;
        this.soundEnabled = true;
        this.bgmEnabled = true;
        this.sfxEnabled = true;
        this.godMode = false;
        this.hasInitializedProfile = false;

        // Input state
        this.keys = {};
        this.touchDirs = { up: false, down: false, left: false, right: false };

        this.init();
    }

    init() {
        // 1. Load persistent state if exists
        const saved = this.storage.load();
        if (saved) {
            if (saved.seed) this.currentSeed = saved.seed;
            if (saved.pioneerName) this.pioneerName = saved.pioneerName;
            if (saved.selectedClass) this.selectedClass = saved.selectedClass;
            if (saved.isFarmerUnlocked) {
                this.isFarmerUnlocked = true;
            }
            if (saved.hasInitializedProfile) {
                this.hasInitializedProfile = true;
            }
        }

        // 2. Generate Maps from Master Seed
        this.loadNewWorld(this.currentSeed);

        // 3. Setup Input Handlers & Modals
        this.setupKeyboard();
        this.setupTouchControls();
        this.setupUI();
        this.setupModals();

        // 4. Initial Screen Flow: Setup or Menu Hub
        const setupModal = document.getElementById('setup-modal');
        const menuHubModal = document.getElementById('menu-hub-modal');

        if (!this.hasInitializedProfile) {
            this.screens.currentScreen = 'SETUP';
            if (setupModal) setupModal.classList.remove('hidden');
            if (menuHubModal) menuHubModal.classList.add('hidden');
        } else {
            this.screens.currentScreen = 'MENU';
            if (setupModal) setupModal.classList.add('hidden');
            if (menuHubModal) menuHubModal.classList.remove('hidden');
        }

        // 5. Start 60 FPS Game Loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));

        // 6. Sync with edge gateway in background
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
        
        // Update header ticker info
        const hubTickerInfo = document.getElementById('hub-ticker-info');
        if (hubTickerInfo) {
            hubTickerInfo.innerText = `${this.currentMap.bondingCurve.ticker} • SEED: 0x${seed.toString(16).toUpperCase()}`;
        }

        this.updateHUD();
        this.saveState();
    }

    switchLayer(newLayer) {
        this.currentLayer = newLayer;
        const layerBadge = document.getElementById('layer-badge');
        if (newLayer === 'SUB_CORE') {
            this.currentMap = this.subCoreMap;
            this.player.pos.set(this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
            this.player.vel.set(0, 0);
            if (layerBadge) {
                layerBadge.innerText = "SUB-BEDROCK CORE";
                layerBadge.style.background = "#4a148c";
                layerBadge.style.color = "#ea80fc";
            }
        } else {
            this.currentMap = this.surfaceMap;
            const caveExit = this.surfaceMap.caveEntrance;
            this.player.pos.set(caveExit.x * 16 + 8, (caveExit.y + 2) * 16 + 8);
            this.player.vel.set(0, 0);
            if (layerBadge) {
                layerBadge.innerText = "SURFACE OVERWORLD";
                layerBadge.style.background = "#2a3b4c";
                layerBadge.style.color = "#64b5f6";
            }
        }
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(330, 'sine', 0.2, 0.1);
        this.updateHUD();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            this.renderer.audio.init();

            // Menu Hub / Pause toggle
            if (e.key === 'Escape') {
                this.toggleMenuHub();
                return;
            }

            // Dev Modal toggle
            if (e.key === 'Tab' || e.key === '`') {
                e.preventDefault();
                this.toggleDevModal();
                return;
            }

            // Advance / skip cutscenes on Enter or Space
            if ((e.key === 'Enter' || e.key === ' ') && !this.cutscenes.isComplete) {
                this.cutscenes.skipStep();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTypewriter();
                return;
            }

            // Gameplay Action keys
            if (key === 'j' || key === ' ') { // A = Action (Attack or Examine)
                this.handleAction();
            } else if (key === 'k') { // B = Parry / Deflect
                this.handleParry();
            } else if (key === 'l' || e.shiftKey) { // C = Dash
                this.handleDash();
            } else if (key === 'e') { // Examine
                this.handleInteract();
            } else if (key === 'r') { // Restart
                this.restartPioneer();
            } else if (key === 'b' || key === 'i') {
                this.toggleInventory();
            } else if (key === 'm') {
                this.toggleMarket();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    setupTouchControls() {
        // D-Pad
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

        // Action Buttons: C (Dash), B (Parry), A (Attack / Examine)
        const btnA = document.getElementById('btn-a');
        const btnB = document.getElementById('btn-b');
        const btnC = document.getElementById('btn-c');

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

        // A Button: Context-sensitive (Attack or Examine)
        bindAction(btnA, () => this.handleAction());

        // B Button: Nine Sols Parry
        bindAction(btnB, () => this.handleParry());

        // C Button: Dash Evasion
        bindAction(btnC, () => this.handleDash());

        // Center Buttons: Restart, Dev Skip, Menu
        const btnRestart = document.getElementById('btn-restart');
        bindAction(btnRestart, () => this.restartPioneer());

        const btnSkip = document.getElementById('btn-skip');
        bindAction(btnSkip, () => this.devSkip());

        const btnStart = document.getElementById('btn-start');
        bindAction(btnStart, () => this.toggleMenuHub());

        // Top Header Buttons
        const btnMenuTop = document.getElementById('btn-menu-top');
        bindAction(btnMenuTop, () => this.toggleMenuHub());

        const btnDevTop = document.getElementById('btn-dev-top');
        bindAction(btnDevTop, () => this.toggleDevModal());

        const btnInventory = document.getElementById('btn-inventory');
        bindAction(btnInventory, () => this.toggleInventory());
    }

    setupUI() {
        // Setup Callsign Input & Randomizer
        const callsignInput = document.getElementById('callsign-input');
        if (callsignInput) callsignInput.value = this.pioneerName;

        const btnRandomName = document.getElementById('btn-random-name');
        if (btnRandomName) {
            btnRandomName.addEventListener('click', () => {
                const names = ['ALU-01', 'CIPHER-9', 'CHRONO-X', 'NEO-PIONEER', 'DYSON-VALKYRIE', 'VOID-WALKER', 'SOL-7', 'NEXUS-PRIME', 'HARVESTER-OMEGA'];
                const picked = names[Math.floor(Math.random() * names.length)];
                callsignInput.value = picked;
                this.pioneerName = picked;
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(480, 'sine', 0.1, 0.08);
            });
        }

        // Setup Class Selection Cards
        const cards = document.querySelectorAll('.class-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const targetClass = card.getAttribute('data-class');
                if (targetClass === 'FARMER_GOD' && !this.isFarmerUnlocked) {
                    alert("🌾 The Farmer is locked! Discover the ancient 3x3 arable plot beneath the sub-bedrock reactor, or use Dev Tools to awaken the Deific Harvester.");
                    return;
                }
                this.selectedClass = targetClass;
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                if (this.player) {
                    this.player.charClass = targetClass;
                    this.player.applyClassStats();
                    this.updateHUD();
                }
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(550, 'triangle', 0.15, 0.1);
            });
        });

        // Setup Confirm Button -> Moves to Menu Hub
        const btnConfirmSetup = document.getElementById('btn-confirm-setup');
        if (btnConfirmSetup) {
            btnConfirmSetup.addEventListener('click', () => {
                if (callsignInput && callsignInput.value.trim()) {
                    this.pioneerName = callsignInput.value.trim().toUpperCase();
                }
                this.hasInitializedProfile = true;
                this.saveState();
                this.updateHUD();

                // Transition from Setup to Menu Hub
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('menu-hub-modal').classList.remove('hidden');
                this.screens.currentScreen = 'MENU';
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
            });
        }

        // Ticker click in header
        const coinTicker = document.getElementById('coin-ticker');
        if (coinTicker) coinTicker.addEventListener('click', () => this.toggleMarket());

        const hudWallet = document.getElementById('hud-wallet');
        if (hudWallet) hudWallet.addEventListener('click', () => this.toggleMarket());
    }

    setupModals() {
        // 1. Menu Hub Modal Controls
        const menuHubModal = document.getElementById('menu-hub-modal');
        const menuClose = document.getElementById('menu-close');
        if (menuClose) menuClose.addEventListener('click', () => this.toggleMenuHub());

        // Hub: Start Game
        const hubStartGame = document.getElementById('hub-start-game');
        if (hubStartGame) {
            hubStartGame.addEventListener('click', () => {
                menuHubModal.classList.add('hidden');
                this.screens.currentScreen = 'GAMEPLAY';
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(600, 'triangle', 0.2, 0.1);
                
                // Play intro cutscene if not yet completed
                if (!this.cutscenes.isComplete && this.cutscenes.activeSequence.length === 0) {
                    this.cutscenes.startIntroSequence(() => {
                        console.log("Intro cutscene complete. Pioneer deployed.");
                    });
                }
            });
        }

        // Hub: Market
        const hubOpenMarket = document.getElementById('hub-open-market');
        if (hubOpenMarket) {
            hubOpenMarket.addEventListener('click', () => {
                menuHubModal.classList.add('hidden');
                this.toggleMarket();
            });
        }

        // Hub: New Seed
        const hubNewSeed = document.getElementById('hub-new-seed');
        if (hubNewSeed) {
            hubNewSeed.addEventListener('click', () => {
                const inputSeed = prompt("Enter 32-bit World Seed (hex or integer):", "0x" + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase());
                if (inputSeed) {
                    const parsed = parseInt(inputSeed, inputSeed.startsWith('0x') ? 16 : 10);
                    if (!isNaN(parsed)) {
                        this.loadNewWorld(parsed);
                        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
                        alert(`Generated new world with Seed 0x${parsed.toString(16).toUpperCase()}!\nCoin Ticker: ${this.currentMap.bondingCurve.ticker}`);
                    }
                }
            });
        }

        // Hub: Sound Settings
        const hubSoundSettings = document.getElementById('hub-sound-settings');
        if (hubSoundSettings) {
            hubSoundSettings.addEventListener('click', () => {
                menuHubModal.classList.add('hidden');
                this.toggleSoundModal();
            });
        }

        // Hub: Reconfigure Pioneer (Back to Setup)
        const hubChangePioneer = document.getElementById('hub-change-pioneer');
        if (hubChangePioneer) {
            hubChangePioneer.addEventListener('click', () => {
                menuHubModal.classList.add('hidden');
                document.getElementById('setup-modal').classList.remove('hidden');
                this.screens.currentScreen = 'SETUP';
            });
        }

        // Hub: Dev Tools
        const hubDevTools = document.getElementById('hub-dev-tools');
        if (hubDevTools) {
            hubDevTools.addEventListener('click', () => {
                menuHubModal.classList.add('hidden');
                this.toggleDevModal();
            });
        }

        // 2. Market Modal Controls
        const marketModal = document.getElementById('market-modal');
        const marketClose = document.getElementById('market-close');
        if (marketClose) marketClose.addEventListener('click', () => marketModal.classList.add('hidden'));

        document.getElementById('btn-buy-coin').addEventListener('click', () => {
            const curve = this.currentMap.bondingCurve;
            const res = curve.buy(10.0);
            this.player.coinsCollected += Math.round(res.tokensReceived);
            document.getElementById('market-log').innerText = `Bought ${res.tokensReceived.toFixed(2)} tokens for 10 ALU. Floor backed: ${res.floor.toFixed(3)} ALU`;
            this.updateHUD();
            this.renderMarketModal();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
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
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(400, 'triangle', 0.1, 0.1);
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
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playParry();
        });

        // 3. Sound Modal Controls
        const soundModal = document.getElementById('sound-modal');
        const soundClose = document.getElementById('sound-close');
        if (soundClose) soundClose.addEventListener('click', () => soundModal.classList.add('hidden'));

        const toggleMaster = document.getElementById('toggle-audio-master');
        if (toggleMaster) {
            toggleMaster.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                toggleMaster.className = `gba-btn-sm ${this.soundEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleMaster.innerText = this.soundEnabled ? "ENABLED (ON)" : "MUTED (OFF)";
            });
        }

        const toggleBgm = document.getElementById('toggle-audio-bgm');
        if (toggleBgm) {
            toggleBgm.addEventListener('click', () => {
                this.bgmEnabled = !this.bgmEnabled;
                toggleBgm.className = `gba-btn-sm ${this.bgmEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleBgm.innerText = this.bgmEnabled ? "ENABLED (ON)" : "DISABLED (OFF)";
            });
        }

        const toggleSfx = document.getElementById('toggle-audio-sfx');
        if (toggleSfx) {
            toggleSfx.addEventListener('click', () => {
                this.sfxEnabled = !this.sfxEnabled;
                toggleSfx.className = `gba-btn-sm ${this.sfxEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleSfx.innerText = this.sfxEnabled ? "ENABLED (ON)" : "DISABLED (OFF)";
            });
        }

        const btnTestParry = document.getElementById('btn-test-parry');
        if (btnTestParry) btnTestParry.addEventListener('click', () => this.renderer.audio.playParry());

        const btnTestCoin = document.getElementById('btn-test-coin');
        if (btnTestCoin) btnTestCoin.addEventListener('click', () => this.renderer.audio.playCoin());

        const btnTestHit = document.getElementById('btn-test-hit');
        if (btnTestHit) btnTestHit.addEventListener('click', () => this.renderer.audio.playSlash());

        // 4. Dev / Debug Modal Controls
        const devModal = document.getElementById('dev-modal');
        const devClose = document.getElementById('dev-close');
        if (devClose) devClose.addEventListener('click', () => devModal.classList.add('hidden'));

        const devSkipScene = document.getElementById('dev-skip-scene');
        if (devSkipScene) devSkipScene.addEventListener('click', () => this.devSkip());

        const devToggleLayer = document.getElementById('dev-toggle-layer');
        if (devToggleLayer) {
            devToggleLayer.addEventListener('click', () => {
                this.switchLayer(this.currentLayer === 'SURFACE' ? 'SUB_CORE' : 'SURFACE');
                devToggleLayer.innerText = this.currentLayer === 'SURFACE' ? "🌀 TELEPORT TO SUB-BEDROCK CORE" : "☀️ TELEPORT TO SURFACE OVERWORLD";
            });
        }

        const devTeleportBoss = document.getElementById('dev-teleport-boss');
        if (devTeleportBoss) {
            devTeleportBoss.addEventListener('click', () => {
                if (this.currentLayer !== 'SUB_CORE') this.switchLayer('SUB_CORE');
                const boss = this.currentMap.enemies.find(e => e.isBoss && e.hp > 0);
                if (boss) {
                    this.player.pos.set(boss.x - 48, boss.y);
                    this.player.vel.set(0, 0);
                    devModal.classList.add('hidden');
                    this.screens.currentScreen = 'GAMEPLAY';
                }
            });
        }

        const devTeleportPlot = document.getElementById('dev-teleport-plot');
        if (devTeleportPlot) {
            devTeleportPlot.addEventListener('click', () => {
                if (this.currentLayer !== 'SUB_CORE') this.switchLayer('SUB_CORE');
                this.player.pos.set(36 * 16 + 8, 25 * 16 + 8);
                this.player.vel.set(0, 0);
                devModal.classList.add('hidden');
                this.screens.currentScreen = 'GAMEPLAY';
            });
        }

        const devToggleGod = document.getElementById('dev-toggle-god');
        if (devToggleGod) devToggleGod.addEventListener('click', () => this.toggleGodMode());

        const devUnlockFarmer = document.getElementById('dev-unlock-farmer');
        if (devUnlockFarmer) devUnlockFarmer.addEventListener('click', () => this.unlockFarmerDev());

        const devGrantCoins = document.getElementById('dev-grant-coins');
        if (devGrantCoins) devGrantCoins.addEventListener('click', () => this.grantCoinsDev(100));

        const devInstantRestart = document.getElementById('dev-instant-restart');
        if (devInstantRestart) {
            devInstantRestart.addEventListener('click', () => {
                this.restartPioneer();
                devModal.classList.add('hidden');
            });
        }

        // 5. Inventory Modal Controls
        const invModal = document.getElementById('inventory-modal');
        const invClose = document.getElementById('inv-close');
        if (invClose) invClose.addEventListener('click', () => invModal.classList.add('hidden'));
    }

    toggleMenuHub() {
        const modal = document.getElementById('menu-hub-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            this.screens.currentScreen = 'MENU';
        } else {
            modal.classList.add('hidden');
            this.screens.currentScreen = 'GAMEPLAY';
        }
    }

    toggleSoundModal() {
        const modal = document.getElementById('sound-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    }

    toggleDevModal() {
        const modal = document.getElementById('dev-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    }

    toggleMarket() {
        const modal = document.getElementById('market-modal');
        if (!modal) return;
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
        if (!modal) return;
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
                            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(660, 'sine', 0.2, 0.1);
                        }
                    });
                }
            });
            grid.appendChild(el);
        });
    }

    getNearestInteractable() {
        if (!this.player || !this.currentMap) return null;
        const px = this.player.pos.x;
        const py = this.player.pos.y;

        // 1. Terminals in Sub-Core
        if (this.currentLayer === 'SUB_CORE' && this.currentMap.terminals) {
            for (const term of this.currentMap.terminals) {
                if (Math.hypot(px - term.x, py - term.y) < 32) {
                    return { type: 'TERMINAL', entity: term, label: 'READ LOG' };
                }
            }
        }

        // 2. Cave Entrance on Surface
        if (this.currentLayer === 'SURFACE' && this.currentMap.caveEntrance) {
            const ce = this.currentMap.caveEntrance;
            if (Math.hypot(px - (ce.x * 16 + 8), py - (ce.y * 16 + 8)) < 28) {
                return { type: 'CAVE_ENTRANCE', label: 'ENTER CORE' };
            }
        }

        // 3. Return Ladder in Sub-Core
        if (this.currentLayer === 'SUB_CORE') {
            const sp = this.currentMap.spawnPoint;
            if (Math.hypot(px - sp.x, py - sp.y) < 28) {
                return { type: 'CORE_EXIT', label: 'ASCEND' };
            }
        }

        // 4. Secret 3x3 Arable Plot in Sub-Core
        if (this.currentLayer === 'SUB_CORE' && !this.isFarmerUnlocked) {
            const plotX = 36 * 16 + 24;
            const plotY = 25 * 16 + 24;
            if (Math.hypot(px - plotX, py - plotY) < 36) {
                return { type: 'ARABLE_PLOT', label: 'TILL SOIL' };
            }
        }

        return null;
    }

    handleAction() {
        const interactable = this.getNearestInteractable();
        if (interactable) {
            this.handleInteract();
        } else {
            this.handleAttack();
        }
    }

    handleAttack() {
        this.player.primaryAttack(this.currentMap.enemies);
        if (this.soundEnabled && this.sfxEnabled) {
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
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(880, 'sine', 0.1, 0.05);
    }

    handleDash() {
        if (!this.player) return;
        this.player.performSkill(this.currentMap.enemies);
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(420, 'sine', 0.1, 0.08);
    }

    handleInteract() {
        const px = this.player.pos.x;
        const py = this.player.pos.y;

        // 1. Check if near an Ancient Terminal
        for (const term of this.currentMap.terminals) {
            if (Math.hypot(px - term.x, py - term.y) < 32) {
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTypewriter();
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

        // 2. Check if near Cave Entrance on Surface
        if (this.currentLayer === 'SURFACE' && this.currentMap.caveEntrance) {
            const ce = this.currentMap.caveEntrance;
            if (Math.hypot(px - (ce.x * 16 + 8), py - (ce.y * 16 + 8)) < 28) {
                this.switchLayer('SUB_CORE');
                return;
            }
        }

        // 3. Check if at Sub-Core entrance to return
        if (this.currentLayer === 'SUB_CORE') {
            const sp = this.currentMap.spawnPoint;
            if (Math.hypot(px - sp.x, py - sp.y) < 28) {
                this.switchLayer('SURFACE');
                return;
            }
        }

        // 4. Check if near 3x3 Arable Plot
        if (this.currentLayer === 'SUB_CORE' && !this.isFarmerUnlocked) {
            const plotX = 36 * 16 + 24;
            const plotY = 25 * 16 + 24;
            if (Math.hypot(px - plotX, py - plotY) < 36) {
                this.unlockFarmer();
                return;
            }
        }
    }

    restartPioneer() {
        if (!this.player || !this.currentMap) return;
        this.player.hp = this.player.maxHp;
        this.player.energy = this.player.maxEnergy;
        this.player.pos.set(this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
        this.player.vel.set(0, 0);
        this.screens.currentScreen = 'GAMEPLAY';
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(520, 'triangle', 0.25, 0.1);
        this.updateHUD();
    }

    devSkip() {
        // Fast-forward / Dev Skip
        if (!this.cutscenes.isComplete) {
            this.cutscenes.activeStep = this.cutscenes.activeSequence.length;
            this.cutscenes.isComplete = true;
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
            return;
        }

        if (this.currentLayer === 'SURFACE') {
            this.switchLayer('SUB_CORE');
            return;
        }

        if (this.currentLayer === 'SUB_CORE') {
            const boss = this.currentMap.enemies.find(e => e.isBoss && e.hp > 0);
            if (boss) {
                this.player.pos.set(boss.x - 48, boss.y);
                this.player.vel.set(0, 0);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(880, 'sawtooth', 0.2, 0.15);
            } else {
                this.switchLayer('SURFACE');
            }
        }
    }

    toggleGodMode() {
        this.godMode = !this.godMode;
        if (this.godMode) {
            this.player.maxHp = 9999;
            this.player.hp = 9999;
            this.player.maxEnergy = 9999;
            this.player.energy = 9999;
            this.player.attackDamage = 999;
        } else {
            this.player.applyClassStats();
        }
        const btn = document.getElementById('dev-toggle-god');
        if (btn) btn.innerText = `🛡️ TOGGLE GOD MODE (${this.godMode ? 'ON' : 'OFF'})`;
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playParry();
        this.updateHUD();
    }

    grantCoinsDev(amount = 100) {
        if (!this.player) return;
        this.player.coinsCollected += amount;
        this.updateHUD();
        this.saveState();
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
    }

    unlockFarmer() {
        this.isFarmerUnlocked = true;
        this.saveState();

        const cardTitle = document.getElementById('farmer-card-title');
        const cardDesc = document.getElementById('farmer-card-desc');
        const card = document.getElementById('card-farmer');
        if (cardTitle) cardTitle.innerText = "THE FARMER (UNLOCKED!)";
        if (cardDesc) cardDesc.innerText = "Deific Harvester of Space-Time. Awakened!";
        if (card) {
            card.classList.remove('locked');
            card.style.borderColor = "#76ff03";
        }

        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();

        this.cutscenes.startFarmerUnlockSequence(() => {
            console.log("The Farmer has joined your roster!");
        });
    }

    unlockFarmerDev() {
        this.unlockFarmer();
        alert("🌾 The Secret Farmer class is now fully unlocked in your roster!");
    }

    saveState() {
        this.storage.save({
            seed: this.currentSeed,
            pioneerName: this.pioneerName,
            selectedClass: this.selectedClass,
            isFarmerUnlocked: this.isFarmerUnlocked,
            hasInitializedProfile: this.hasInitializedProfile,
            coins: this.player ? this.player.coinsCollected : 0
        });
    }

    updateHUD() {
        // 1. Dynamic A Button label (ATTACK vs EXAMINE)
        const interactable = this.getNearestInteractable();
        const btnASub = document.getElementById('btn-a-sub');
        const btnA = document.getElementById('btn-a');
        if (btnASub && btnA) {
            if (interactable) {
                btnASub.innerText = "EXAMINE";
                btnA.style.borderColor = "#00e5ff";
                btnA.style.boxShadow = "0 0 10px rgba(0, 229, 255, 0.6)";
            } else {
                btnASub.innerText = "ATTACK";
                btnA.style.borderColor = "#4db6ac";
                btnA.style.boxShadow = "0 4px 10px rgba(0,0,0,0.5)";
            }
        }

        // 2. Pioneer Status in Footer
        const pioneerCallsignElem = document.getElementById('pioneer-callsign');
        const pioneerClassElem = document.getElementById('pioneer-class-tag');
        const pioneerIconElem = document.getElementById('pioneer-icon');
        if (pioneerCallsignElem) pioneerCallsignElem.innerText = this.pioneerName || "ALU-01";
        if (pioneerClassElem && this.player) pioneerClassElem.innerText = this.player.charClass.replace('_', ' ');
        if (pioneerIconElem && this.player) {
            if (this.player.charClass === 'SUPER_SOLDIER') pioneerIconElem.innerText = "⚔️";
            else if (this.player.charClass === 'TECHNO_MAGE') pioneerIconElem.innerText = "⚡";
            else pioneerIconElem.innerText = "🌱";
        }

        // 3. Player Bars
        if (this.player) {
            const hpPercent = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
            const energyPercent = Math.max(0, (this.player.energy / this.player.maxEnergy) * 100);
            document.getElementById('hp-bar').style.width = `${hpPercent}%`;
            document.getElementById('hp-text').innerText = `${Math.round(this.player.hp)}/${this.player.maxHp}`;
            document.getElementById('energy-bar').style.width = `${energyPercent}%`;
            document.getElementById('energy-text').innerText = `${Math.round(this.player.energy)}/${this.player.maxEnergy}`;
            document.getElementById('wallet-coins').innerText = this.player.coinsCollected;
        }

        // 4. Coin & Bonding curve info
        if (this.currentMap && this.currentMap.bondingCurve) {
            const curve = this.currentMap.bondingCurve;
            document.getElementById('coin-ticker').innerText = curve.ticker;
            document.getElementById('coin-price').innerText = `${curve.getCurrentPrice().toFixed(3)} ALU`;
            document.getElementById('coin-floor').innerText = `Floor: ${curve.getGuaranteedFloor().toFixed(3)} ALU`;
        }
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
                if (this.godMode) continue;

                const res = player.takeDamage(enemy.attackDamage, true);
                if (res.parried && this.soundEnabled && this.sfxEnabled) {
                    this.renderer.audio.playParry();
                    // Knock enemy back on successful parry
                    enemy.x -= (player.facing.x) * 32;
                    enemy.y -= (player.facing.y) * 32;
                    enemy.hp -= 20; // Parry counter damage
                } else if (!res.parried && res.damageTaken > 0 && this.soundEnabled && this.sfxEnabled) {
                    this.renderer.audio.playTone(160, 'sawtooth', 0.15, 0.1);
                }
            }

            if (enemy.attackCd > 0) enemy.attackCd -= dt;
        }
    }

    loop(currentTime) {
        const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000.0);
        this.lastTime = currentTime;

        // Check if player died
        if (this.player && this.player.hp <= 0 && this.screens.currentScreen === 'GAMEPLAY') {
            this.screens.currentScreen = 'GAMEOVER';
        }

        // If on Game Over Screen
        if (this.screens && this.screens.currentScreen === 'GAMEOVER') {
            this.screens.render(this.renderer.ctx, this.canvas.width, this.canvas.height);
            requestAnimationFrame(this.loop.bind(this));
            return;
        }

        // 1. Update Cutscenes or Gameplay
        if (!this.cutscenes.isComplete) {
            this.cutscenes.update(dt);
        } else if (this.screens.currentScreen === 'GAMEPLAY') {
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

        // 5. Render Minimap Radar during Gameplay
        if (this.screens && this.screens.currentScreen === 'GAMEPLAY') {
            this.screens.renderMinimap(this.renderer.ctx, this.canvas.width, this.canvas.height);
        }

        // 6. Update HUD metrics
        this.updateHUD();

        requestAnimationFrame(this.loop.bind(this));
    }
}

// Launch on page load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameApp();
    console.log("Aether-Core Game App running successfully with full logic.");
});
