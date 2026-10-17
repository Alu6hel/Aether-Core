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

        // 2. Setup Fullscreen Viewport & Canvas Scaling (Edge-to-Edge)
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => this.resizeCanvas());

        // 3. Generate Maps from Master Seed
        this.loadNewWorld(this.currentSeed);

        // 4. Setup Input Handlers, GBA Menu & Modals
        this.setupKeyboard();
        this.setupTouchControls();
        this.setupGbaMenu();
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

        // 5. Render Pixel Art Canvases & Update UI Visibility
        this.renderUIPixelCanvases();
        this.updateTouchControlsVisibility();

        // 6. Start 60 FPS Game Loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));

        // 7. Sync with edge gateway in background
        this.edgeClient.mintWorldCoin(this.currentSeed).then(res => {
            console.log("[EDGE SYNC]", res);
        });
    }

    resizeCanvas() {
        const wrapper = document.getElementById('viewport-wrapper');
        if (!wrapper || !this.canvas) return;
        const rect = wrapper.getBoundingClientRect();
        const w = rect.width || window.innerWidth;
        const h = rect.height || (window.innerHeight - 80);
        
        // Target vertical resolution around 240-320px for crisp retro GBA scaling
        const scale = Math.max(1, Math.floor(h / 240)) || 2;
        this.canvas.width = Math.round(w / scale);
        this.canvas.height = Math.round(h / scale);
        if (this.renderer) {
            this.renderer.width = this.canvas.width;
            this.renderer.height = this.canvas.height;
        }
    }

    bindTap(elem, cb) {
        if (!elem) return;
        let lastTrigger = 0;
        const trigger = (e) => {
            const now = Date.now();
            if (now - lastTrigger < 250) return;
            lastTrigger = now;
            if (e && e.cancelable && e.type === 'pointerdown') e.preventDefault();
            if (this.renderer && this.renderer.audio) this.renderer.audio.init();
            cb(e);
        };
        elem.addEventListener('pointerdown', trigger);
        elem.addEventListener('click', trigger);
    }

    renderUIPixelCanvases() {
        const pal = this.currentMap ? this.currentMap.palette.colors : ['#0a0a0f', '#1e2430', '#37474f', '#607d8b', '#00e5ff', '#ff9800', '#ffd54f', '#ffffff'];
        console.log("[UI CANVASES] Rendering pixel canvases with palette:", pal[0], pal[4]);
        
        // 1. Guide Portrait (Chief Overseer Vance from Image 4 reference)
        const guideCanvas = document.getElementById('guide-portrait-canvas');
        if (guideCanvas) {
            const ctx = guideCanvas.getContext('2d');
            const portrait = this.renderer.sprites.getPortrait('OVERSEER', pal);
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 48, 48);
            ctx.drawImage(portrait, 0, 0, 48, 48);
            console.log("[UI CANVASES] Drew guide portrait. Size:", portrait.width, portrait.height);
        } else {
            console.warn("[UI CANVASES] guide-portrait-canvas NOT found!");
        }

        // 2. Class Card Canvases
        const cWarrior = document.getElementById('canvas-warrior');
        if (cWarrior) {
            const ctx = cWarrior.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(this.renderer.sprites.getClassPreview('SUPER_SOLDIER'), 0, 0);
            console.log("[UI CANVASES] Drew warrior preview.");
        }

        const cMage = document.getElementById('canvas-mage');
        if (cMage) {
            const ctx = cMage.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(this.renderer.sprites.getClassPreview('TECHNO_MAGE'), 0, 0);
            console.log("[UI CANVASES] Drew mage preview.");
        }

        const cFarmer = document.getElementById('canvas-farmer');
        if (cFarmer) {
            const ctx = cFarmer.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(this.renderer.sprites.getClassPreview('FARMER_GOD'), 0, 0);
            console.log("[UI CANVASES] Drew farmer preview.");
        }

        // 3. Gold Coin Medallion
        const cCoin = document.getElementById('canvas-coin');
        if (cCoin) {
            const ctx = cCoin.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 16, 16);
            ctx.drawImage(this.renderer.sprites.getCoinSprite(), 0, 0);
        }

        // 4. Pioneer Mini Icon
        const cPioneer = document.getElementById('canvas-pioneer-icon');
        if (cPioneer && this.player) {
            const ctx = cPioneer.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 20, 20);
            ctx.drawImage(this.renderer.sprites.getClassPreview(this.player.charClass), 0, 0, 20, 20);
        }
    }

    updateTouchControlsVisibility() {
        const touchControls = document.getElementById('touch-controls');
        if (!touchControls) return;

        // ONLY hide touch controls if the initial character setup modal is actively open
        const setupModal = document.getElementById('setup-modal');
        const isSetupOpen = setupModal && !setupModal.classList.contains('hidden');

        if (isSetupOpen) {
            touchControls.classList.add('controls-hidden');
        } else {
            touchControls.classList.remove('controls-hidden');
        }
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

        this.renderUIPixelCanvases();
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
            if (this.soundEnabled && this.bgmEnabled) this.renderer.audio.startBgm('SUB_CORE');
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
            if (this.soundEnabled && this.bgmEnabled) this.renderer.audio.startBgm('OVERWORLD');
        }
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(330, 'sine', 0.2, 0.1);
        this.updateHUD();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            if (this.renderer && this.renderer.audio) this.renderer.audio.init();

            // 1. If GBA dialogue capsule is visible, Enter/Space/J/Escape dismisses it (if not entering seed text)
            const gbaCapsule = document.getElementById('gba-dialogue-capsule');
            if (gbaCapsule && !gbaCapsule.classList.contains('hidden')) {
                const inputRow = document.getElementById('gba-capsule-input-container');
                if (!inputRow || inputRow.classList.contains('hidden')) {
                    if (key === 'enter' || key === ' ' || key === 'j' || key === 'escape') {
                        e.preventDefault();
                        this.hideGbaDialogue();
                        return;
                    }
                }
            }

            // 2. GBA Side Menu Navigation (Image 5)
            const gbaMenu = document.getElementById('gba-start-menu');
            if (gbaMenu && !gbaMenu.classList.contains('hidden')) {
                if (key === 'arrowup' || key === 'w') {
                    e.preventDefault();
                    this.navigateGbaMenu('up');
                    return;
                } else if (key === 'arrowdown' || key === 's') {
                    e.preventDefault();
                    this.navigateGbaMenu('down');
                    return;
                } else if (key === 'enter' || key === ' ' || key === 'j') {
                    e.preventDefault();
                    this.selectGbaMenuItem();
                    return;
                } else if (key === 'escape' || key === 'k') {
                    e.preventDefault();
                    this.toggleGbaMenu();
                    return;
                }
            }

            // 3. Menu / Modal Escape Handler
            if (e.key === 'Escape') {
                e.preventDefault();
                this.handleBackOrEscape();
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
        // D-Pad with multi-directional touch slide support
        const dpadButtons = document.querySelectorAll('.dpad-btn');
        dpadButtons.forEach(btn => {
            const dir = btn.getAttribute('data-dir');
            const press = (e) => {
                if (e.cancelable) e.preventDefault();
                // Check if GBA side menu is open
                const gbaMenu = document.getElementById('gba-start-menu');
                if (gbaMenu && !gbaMenu.classList.contains('hidden')) {
                    if (dir === 'up') this.navigateGbaMenu('up');
                    else if (dir === 'down') this.navigateGbaMenu('down');
                    return;
                }
                this.touchDirs[dir] = true;
                btn.classList.add('pressed');
                if (this.renderer && this.renderer.audio) this.renderer.audio.init();
            };
            const release = (e) => {
                if (e.cancelable) e.preventDefault();
                this.touchDirs[dir] = false;
                btn.classList.remove('pressed');
            };
            btn.addEventListener('touchstart', press, { passive: false });
            btn.addEventListener('touchend', release, { passive: false });
            btn.addEventListener('pointerdown', press);
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointerleave', release);
        });

        // Action Buttons: C (Dash), B (Parry), A (Attack / Examine)
        const btnA = document.getElementById('btn-a');
        const btnB = document.getElementById('btn-b');
        const btnC = document.getElementById('btn-c');

        const bindAction = (elem, cb) => this.bindTap(elem, cb);

        // A Button: Context-sensitive (Attack or Examine) or Menu Select
        bindAction(btnA, () => {
            const gbaMenu = document.getElementById('gba-start-menu');
            if (gbaMenu && !gbaMenu.classList.contains('hidden')) {
                this.selectGbaMenuItem();
                return;
            }
            const gbaCapsule = document.getElementById('gba-dialogue-capsule');
            if (gbaCapsule && !gbaCapsule.classList.contains('hidden')) {
                const inputRow = document.getElementById('gba-capsule-input-container');
                if (!inputRow || inputRow.classList.contains('hidden')) {
                    this.hideGbaDialogue();
                    return;
                }
            }
            this.handleAction();
        });

        // B Button: Nine Sols Parry or Menu Close
        bindAction(btnB, () => {
            const gbaMenu = document.getElementById('gba-start-menu');
            if (gbaMenu && !gbaMenu.classList.contains('hidden')) {
                this.toggleGbaMenu();
                return;
            }
            this.handleParry();
        });

        // C Button: Dash Evasion
        bindAction(btnC, () => this.handleDash());

        // Center Buttons: Restart, Dev Skip, Menu
        const btnRestart = document.getElementById('btn-restart');
        bindAction(btnRestart, () => this.restartPioneer());

        const btnSkip = document.getElementById('btn-skip');
        bindAction(btnSkip, () => this.devSkip());

        const btnStart = document.getElementById('btn-start');
        bindAction(btnStart, () => this.toggleGbaMenu());

        // Top Header Buttons
        const btnMenuTop = document.getElementById('btn-menu-top');
        bindAction(btnMenuTop, () => this.toggleGbaMenu());

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
            this.bindTap(btnRandomName, () => {
                const names = ['ALU-01', 'CIPHER-9', 'CHRONO-X', 'NEO-PIONEER', 'DYSON-VALKYRIE', 'VOID-WALKER', 'SOL-7', 'NEXUS-PRIME', 'HARVESTER-OMEGA'];
                const picked = names[Math.floor(Math.random() * names.length)];
                callsignInput.value = picked;
                this.pioneerName = picked;
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playRoll();
            });
        }

        // Setup Class Selection Cards
        const cards = document.querySelectorAll('.class-card');
        cards.forEach(card => {
            this.bindTap(card, () => {
                const targetClass = card.getAttribute('data-class');
                if (targetClass === 'FARMER_GOD' && !this.isFarmerUnlocked) {
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
                    this.showGbaDialogue("SYSTEM OVERSEER", "🌾 The Farmer is locked! Discover the ancient 3x3 arable plot beneath the sub-bedrock reactor, or use Dev Tools to awaken the Deific Harvester.");
                    return;
                }
                this.selectedClass = targetClass;
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                if (this.player) {
                    this.player.charClass = targetClass;
                    this.player.applyClassStats();
                    this.renderUIPixelCanvases();
                    this.updateHUD();
                }
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
            });
        });

        // Setup Confirm Button -> Moves to Menu Hub
        const btnConfirmSetup = document.getElementById('btn-confirm-setup');
        if (btnConfirmSetup) {
            this.bindTap(btnConfirmSetup, () => {
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
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
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
        if (menuClose) {
            menuClose.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.toggleMenuHub();
            });
        }

        // Hub: Start Game
        const hubStartGame = document.getElementById('hub-start-game');
        if (hubStartGame) {
            hubStartGame.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                menuHubModal.classList.add('hidden');
                this.screens.currentScreen = 'GAMEPLAY';
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
                if (this.soundEnabled && this.bgmEnabled) this.renderer.audio.startBgm(this.currentLayer);
                
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
            hubOpenMarket.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                menuHubModal.classList.add('hidden');
                this.toggleMarket();
            });
        }

        // Hub: New Seed
        const hubNewSeed = document.getElementById('hub-new-seed');
        if (hubNewSeed) {
            hubNewSeed.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                menuHubModal.classList.add('hidden');
                this.showGbaSeedDialog();
            });
        }

        // Hub: Sound Settings
        const hubSoundSettings = document.getElementById('hub-sound-settings');
        if (hubSoundSettings) {
            hubSoundSettings.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                menuHubModal.classList.add('hidden');
                this.toggleSoundModal();
            });
        }

        // Hub: Reconfigure Pioneer (Back to Setup)
        const hubChangePioneer = document.getElementById('hub-change-pioneer');
        if (hubChangePioneer) {
            hubChangePioneer.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                menuHubModal.classList.add('hidden');
                document.getElementById('setup-modal').classList.remove('hidden');
                this.screens.currentScreen = 'SETUP';
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
            });
        }

        // Hub: Dev Tools
        const hubDevTools = document.getElementById('hub-dev-tools');
        if (hubDevTools) {
            hubDevTools.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                menuHubModal.classList.add('hidden');
                this.toggleDevModal();
            });
        }

        // 2. Market Modal Controls
        const marketModal = document.getElementById('market-modal');
        const marketClose = document.getElementById('market-close');
        if (marketClose) {
            marketClose.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                marketModal.classList.add('hidden');
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        document.getElementById('btn-buy-coin').addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const curve = this.currentMap.bondingCurve;
            const res = curve.buy(10.0);
            this.player.coinsCollected += Math.round(res.tokensReceived);
            document.getElementById('market-log').innerText = `Bought ${res.tokensReceived.toFixed(2)} tokens for 10 ALU. Floor: ${res.floor.toFixed(3)} ALU`;
            this.updateHUD();
            this.renderMarketModal();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
        });

        document.getElementById('btn-sell-coin').addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const curve = this.currentMap.bondingCurve;
            if (this.player.coinsCollected < 5) {
                document.getElementById('market-log').innerText = "Insufficient ALU tokens to sell!";
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
                return;
            }
            const res = curve.sell(5.0);
            this.player.coinsCollected -= 5;
            document.getElementById('market-log').innerText = `Sold 5 tokens for ${res.aluReturned.toFixed(2)} ALU. Price: ${res.newPrice.toFixed(3)} ALU`;
            this.updateHUD();
            this.renderMarketModal();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(400, 'triangle', 0.1, 0.1);
        });

        document.getElementById('btn-burn-floor').addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const curve = this.currentMap.bondingCurve;
            if (this.player.coinsCollected <= 0) {
                document.getElementById('market-log').innerText = "No tokens to burn for floor payout!";
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
                return;
            }
            const tokens = Math.min(10, this.player.coinsCollected);
            const res = curve.burnForFloor(tokens);
            this.player.coinsCollected -= tokens;
            document.getElementById('market-log').innerText = `Emergency Burn: Redeemed ${tokens} tokens for ${res.aluRedeemed.toFixed(3)} ALU floor.`;
            this.updateHUD();
            this.renderMarketModal();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playParry();
        });

        // 3. Sound Modal Controls
        const soundModal = document.getElementById('sound-modal');
        const soundClose = document.getElementById('sound-close');
        if (soundClose) {
            soundClose.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                soundModal.classList.add('hidden');
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const toggleMaster = document.getElementById('toggle-audio-master');
        if (toggleMaster) {
            toggleMaster.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.soundEnabled = !this.soundEnabled;
                toggleMaster.className = `gba-btn-sm ${this.soundEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleMaster.innerText = this.soundEnabled ? "ENABLED (ON)" : "MUTED (OFF)";
                if (this.soundEnabled) this.renderer.audio.init();
            });
        }

        const toggleBgm = document.getElementById('toggle-audio-bgm');
        if (toggleBgm) {
            toggleBgm.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.bgmEnabled = !this.bgmEnabled;
                toggleBgm.className = `gba-btn-sm ${this.bgmEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleBgm.innerText = this.bgmEnabled ? "ENABLED (ON)" : "DISABLED (OFF)";
                if (this.bgmEnabled && this.screens.currentScreen === 'GAMEPLAY') {
                    this.renderer.audio.startBgm(this.currentLayer);
                } else {
                    this.renderer.audio.stopBgm();
                }
            });
        }

        const toggleSfx = document.getElementById('toggle-audio-sfx');
        if (toggleSfx) {
            toggleSfx.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.sfxEnabled = !this.sfxEnabled;
                toggleSfx.className = `gba-btn-sm ${this.sfxEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleSfx.innerText = this.sfxEnabled ? "ENABLED (ON)" : "DISABLED (OFF)";
            });
        }

        const btnTestParry = document.getElementById('btn-test-parry');
        if (btnTestParry) btnTestParry.addEventListener('pointerdown', (e) => { e.preventDefault(); this.renderer.audio.playParry(); });

        const btnTestCoin = document.getElementById('btn-test-coin');
        if (btnTestCoin) btnTestCoin.addEventListener('pointerdown', (e) => { e.preventDefault(); this.renderer.audio.playCoin(); });

        const btnTestHit = document.getElementById('btn-test-hit');
        if (btnTestHit) btnTestHit.addEventListener('pointerdown', (e) => { e.preventDefault(); this.renderer.audio.playSlash(); });

        // 4. Dev / Debug Modal Controls
        const devModal = document.getElementById('dev-modal');
        const devClose = document.getElementById('dev-close');
        if (devClose) {
            devClose.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                devModal.classList.add('hidden');
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const devSkipScene = document.getElementById('dev-skip-scene');
        if (devSkipScene) devSkipScene.addEventListener('pointerdown', (e) => { e.preventDefault(); this.devSkip(); });

        const devToggleLayer = document.getElementById('dev-toggle-layer');
        if (devToggleLayer) {
            devToggleLayer.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.switchLayer(this.currentLayer === 'SURFACE' ? 'SUB_CORE' : 'SURFACE');
                devToggleLayer.innerText = this.currentLayer === 'SURFACE' ? "🌀 TELEPORT TO SUB-BEDROCK CORE" : "☀️ TELEPORT TO SURFACE OVERWORLD";
            });
        }

        const devTeleportBoss = document.getElementById('dev-teleport-boss');
        if (devTeleportBoss) {
            devTeleportBoss.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (this.currentLayer !== 'SUB_CORE') this.switchLayer('SUB_CORE');
                const boss = this.currentMap.enemies.find(e => e.isBoss && e.hp > 0);
                if (boss) {
                    this.player.pos.set(boss.x - 48, boss.y);
                    this.player.vel.set(0, 0);
                    devModal.classList.add('hidden');
                    this.screens.currentScreen = 'GAMEPLAY';
                    this.updateTouchControlsVisibility();
                }
            });
        }

        const devTeleportPlot = document.getElementById('dev-teleport-plot');
        if (devTeleportPlot) {
            devTeleportPlot.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (this.currentLayer !== 'SUB_CORE') this.switchLayer('SUB_CORE');
                this.player.pos.set(36 * 16 + 8, 25 * 16 + 8);
                this.player.vel.set(0, 0);
                devModal.classList.add('hidden');
                this.screens.currentScreen = 'GAMEPLAY';
                this.updateTouchControlsVisibility();
            });
        }

        const devToggleGod = document.getElementById('dev-toggle-god');
        if (devToggleGod) devToggleGod.addEventListener('pointerdown', (e) => { e.preventDefault(); this.toggleGodMode(); });

        const devUnlockFarmer = document.getElementById('dev-unlock-farmer');
        if (devUnlockFarmer) devUnlockFarmer.addEventListener('pointerdown', (e) => { e.preventDefault(); this.unlockFarmerDev(); });

        const devGrantCoins = document.getElementById('dev-grant-coins');
        if (devGrantCoins) devGrantCoins.addEventListener('pointerdown', (e) => { e.preventDefault(); this.grantCoinsDev(100); });

        const devInstantRestart = document.getElementById('dev-instant-restart');
        if (devInstantRestart) {
            devInstantRestart.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.restartPioneer();
                devModal.classList.add('hidden');
                this.updateTouchControlsVisibility();
            });
        }

        // 5. Inventory Modal Controls
        const invModal = document.getElementById('inventory-modal');
        const invClose = document.getElementById('inv-close');
        if (invClose) {
            invClose.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                invModal.classList.add('hidden');
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }
    }

    setupGbaMenu() {
        const menu = document.getElementById('gba-start-menu');
        if (!menu) return;

        const items = Array.from(menu.querySelectorAll('.gba-menu-item'));
        this.gbaMenuIndex = 0;

        const updateCursor = () => {
            items.forEach((item, idx) => {
                const cursor = item.querySelector('.gba-cursor');
                if (idx === this.gbaMenuIndex) {
                    item.classList.add('active');
                    if (cursor) cursor.textContent = '▶';
                } else {
                    item.classList.remove('active');
                    if (cursor) cursor.textContent = ' ';
                }
            });
        };

        this.updateGbaMenuCursor = updateCursor;

        // Click / touch handler on each item
        items.forEach((item, idx) => {
            this.bindTap(item, () => {
                this.gbaMenuIndex = idx;
                updateCursor();
                const action = item.getAttribute('data-action');
                this.executeGbaMenuAction(action);
            });
        });

        // Setup Dialogue Capsule OK button
        const capsuleOk = document.getElementById('gba-capsule-ok');
        if (capsuleOk) {
            this.bindTap(capsuleOk, () => {
                this.hideGbaDialogue();
            });
        }

        // Setup Seed apply / random / cancel
        const btnSeedApply = document.getElementById('gba-btn-seed-apply');
        const btnSeedRandom = document.getElementById('gba-btn-seed-random');
        const btnSeedCancel = document.getElementById('gba-btn-seed-cancel');
        const seedInput = document.getElementById('gba-seed-input');

        if (btnSeedRandom && seedInput) {
            this.bindTap(btnSeedRandom, () => {
                const rnd = '0x' + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase();
                seedInput.value = rnd;
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playRoll();
            });
        }

        if (btnSeedApply && seedInput) {
            this.bindTap(btnSeedApply, () => {
                const val = seedInput.value.trim();
                const parsed = parseInt(val, val.startsWith('0x') ? 16 : 10);
                if (!isNaN(parsed)) {
                    this.loadNewWorld(parsed);
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
                    this.showGbaDialogue("ALU COIN MATRIX", `World synthesized with Seed 0x${(parsed >>> 0).toString(16).toUpperCase()}!\nCoin Ticker: ${this.currentMap.bondingCurve.ticker}`);
                }
            });
        }

        if (btnSeedCancel) {
            this.bindTap(btnSeedCancel, () => {
                this.hideGbaDialogue();
            });
        }
    }

    handleBackOrEscape() {
        // 1. Close dialogue capsule if open
        const dialogue = document.getElementById('gba-dialogue-capsule');
        if (dialogue && !dialogue.classList.contains('hidden')) {
            dialogue.classList.add('hidden');
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            return;
        }

        // 2. Close any open modals
        const openModals = Array.from(document.querySelectorAll('.game-modal:not(.hidden)'));
        if (openModals.length > 0) {
            openModals.forEach(m => m.classList.add('hidden'));
            this.screens.currentScreen = 'GAMEPLAY';
            this.updateTouchControlsVisibility();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            return;
        }

        // 3. Toggle GBA Start Menu
        this.toggleGbaMenu();
    }

    toggleGbaMenu() {
        const menu = document.getElementById('gba-start-menu');
        if (!menu) return;
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            // Close any open modals
            document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
            menu.classList.remove('hidden');
            this.screens.currentScreen = 'MENU';
            this.gbaMenuIndex = 0;
            if (this.updateGbaMenuCursor) this.updateGbaMenuCursor();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
        } else {
            menu.classList.add('hidden');
            this.screens.currentScreen = 'GAMEPLAY';
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
        this.updateTouchControlsVisibility();
    }

    navigateGbaMenu(dir) {
        const menu = document.getElementById('gba-start-menu');
        if (!menu || menu.classList.contains('hidden')) return false;

        const items = menu.querySelectorAll('.gba-menu-item');
        if (!items || items.length === 0) return false;

        if (dir === 'up') {
            this.gbaMenuIndex = (this.gbaMenuIndex - 1 + items.length) % items.length;
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        } else if (dir === 'down') {
            this.gbaMenuIndex = (this.gbaMenuIndex + 1) % items.length;
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        }
        if (this.updateGbaMenuCursor) this.updateGbaMenuCursor();
        return true;
    }

    selectGbaMenuItem() {
        const menu = document.getElementById('gba-start-menu');
        if (!menu || menu.classList.contains('hidden')) return false;

        const items = menu.querySelectorAll('.gba-menu-item');
        if (items[this.gbaMenuIndex]) {
            const action = items[this.gbaMenuIndex].getAttribute('data-action');
            this.executeGbaMenuAction(action);
            return true;
        }
        return false;
    }

    executeGbaMenuAction(action) {
        const menu = document.getElementById('gba-start-menu');
        if (menu) menu.classList.add('hidden');

        switch (action) {
            case 'expedition':
                this.showGbaDialogue("EXPEDITION DISPATCH", `Current Layer: ${this.currentLayer}\nWorld Seed: 0x${(this.currentSeed >>> 0).toString(16).toUpperCase()}\nPioneer: ${this.pioneerName} (${this.selectedClass})\nHarvested: ${this.player ? this.player.coinsCollected : 0} $ALU`);
                break;
            case 'inventory':
                this.toggleInventory();
                break;
            case 'market':
                this.toggleMarket();
                break;
            case 'new-seed':
                this.showGbaSeedDialog();
                break;
            case 'sound':
                this.toggleSoundModal();
                break;
            case 'pioneer':
                document.getElementById('setup-modal').classList.remove('hidden');
                this.screens.currentScreen = 'SETUP';
                this.updateTouchControlsVisibility();
                break;
            case 'dev':
                this.toggleDevModal();
                break;
            case 'reboot':
                this.restartPioneer();
                break;
            case 'exit':
                this.screens.currentScreen = 'GAMEPLAY';
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
                break;
        }
    }

    showGbaDialogue(speaker, message) {
        const capsule = document.getElementById('gba-dialogue-capsule');
        if (!capsule) return;
        document.getElementById('gba-capsule-speaker').textContent = speaker || "COMMUNICATOR";
        document.getElementById('gba-capsule-text').innerText = message || "";
        document.getElementById('gba-capsule-input-container').classList.add('hidden');
        document.getElementById('gba-capsule-actions').classList.remove('hidden');
        capsule.classList.remove('hidden');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playBlip();
    }

    showGbaSeedDialog() {
        const capsule = document.getElementById('gba-dialogue-capsule');
        if (!capsule) return;
        document.getElementById('gba-capsule-speaker').textContent = "PROCEDURAL MATRIX SEED";
        document.getElementById('gba-capsule-text').innerText = "Enter or randomize 32-bit world generation seed to rebuild the ALU Coin map:";
        const inputContainer = document.getElementById('gba-capsule-input-container');
        inputContainer.classList.remove('hidden');
        const seedInput = document.getElementById('gba-seed-input');
        if (seedInput) seedInput.value = '0x' + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase();
        document.getElementById('gba-capsule-actions').classList.add('hidden');
        capsule.classList.remove('hidden');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playBlip();
    }

    hideGbaDialogue() {
        const capsule = document.getElementById('gba-dialogue-capsule');
        if (capsule) capsule.classList.add('hidden');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
    }

    toggleMenuHub() {
        const modal = document.getElementById('menu-hub-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            this.screens.currentScreen = 'MENU';
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        } else {
            modal.classList.add('hidden');
            this.screens.currentScreen = 'GAMEPLAY';
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
        this.updateTouchControlsVisibility();
    }

    toggleSoundModal() {
        const modal = document.getElementById('sound-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
        this.updateTouchControlsVisibility();
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
    }

    toggleDevModal() {
        const modal = document.getElementById('dev-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
        this.updateTouchControlsVisibility();
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
    }

    toggleMarket() {
        const modal = document.getElementById('market-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            this.renderMarketModal();
            modal.classList.remove('hidden');
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
        } else {
            modal.classList.add('hidden');
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
        this.updateTouchControlsVisibility();
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
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        } else {
            modal.classList.add('hidden');
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
        this.updateTouchControlsVisibility();
    }

    renderInventoryModal() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        this.inventory.slots.forEach(slot => {
            const el = document.createElement('div');
            el.className = 'inv-slot';
            el.innerHTML = `<strong>${slot.item.name}</strong><span style="color:#81c784;margin-top:2px;">x${slot.count}</span>`;
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                document.getElementById('item-details').innerHTML = `
                    <strong style="color:#ffd54f;">${slot.item.name}</strong> (${slot.item.type})<br>
                    ${slot.item.desc}<br>
                    ${slot.item.type === 'CONSUMABLE' ? '<button id="btn-use-item" class="gba-btn-sm" style="margin-top:6px;">USE ITEM</button>' : ''}
                `;
                const useBtn = document.getElementById('btn-use-item');
                if (useBtn) {
                    useBtn.addEventListener('pointerdown', (ev) => {
                        ev.preventDefault();
                        if (this.inventory.useItem(slot.item.id, this.player)) {
                            this.renderInventoryModal();
                            this.updateHUD();
                            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(660, 'sine', 0.2, 0.1);
                        }
                    });
                }
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
            });
            grid.appendChild(el);
        });
    }

    getNearestInteractable() {
        if (!this.player || !this.currentMap) return null;
        const px = this.player.pos.x;
        const py = this.player.pos.y;

        // 1. Quantum Supply Pods / Chests
        if (this.currentMap.chests) {
            for (const chest of this.currentMap.chests) {
                if (!chest.opened && Math.hypot(px - chest.x, py - chest.y) < 26) {
                    return { type: 'CHEST', entity: chest, label: 'OPEN POD' };
                }
            }
        }

        // 2. Glittering Foraging Sparkles
        if (this.currentMap.sparkles) {
            for (const sp of this.currentMap.sparkles) {
                if (!sp.collected && Math.hypot(px - sp.x, py - sp.y) < 22) {
                    return { type: 'SPARKLE', entity: sp, label: 'GATHER' };
                }
            }
        }

        // 3. Terminals in Sub-Core
        if (this.currentLayer === 'SUB_CORE' && this.currentMap.terminals) {
            for (const term of this.currentMap.terminals) {
                if (Math.hypot(px - term.x, py - term.y) < 32) {
                    return { type: 'TERMINAL', entity: term, label: 'READ LOG' };
                }
            }
        }

        // 4. Cave Entrance on Surface
        if (this.currentLayer === 'SURFACE' && this.currentMap.caveEntrance) {
            const ce = this.currentMap.caveEntrance;
            if (Math.hypot(px - (ce.x * 16 + 8), py - (ce.y * 16 + 8)) < 28) {
                return { type: 'CAVE_ENTRANCE', label: 'ENTER CORE' };
            }
        }

        // 5. Return Ladder in Sub-Core
        if (this.currentLayer === 'SUB_CORE') {
            const sp = this.currentMap.spawnPoint;
            if (Math.hypot(px - sp.x, py - sp.y) < 28) {
                return { type: 'CORE_EXIT', label: 'ASCEND' };
            }
        }

        // 6. Secret 3x3 Arable Plot in Sub-Core
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
            if (this.player.charClass === 'SUPER_SOLDIER') {
                this.renderer.audio.playSlash(1);
            } else if (this.player.charClass === 'TECHNO_MAGE') {
                this.renderer.audio.playShoot();
            } else if (this.player.charClass === 'FARMER_GOD') {
                this.renderer.audio.playHarvest();
            }
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
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playParry();
    }

    handleDash() {
        if (!this.player) return;
        const didDash = this.player.performDash();
        if (didDash && this.soundEnabled && this.sfxEnabled) {
            this.renderer.audio.playDash();
        }
    }

    handleInteract() {
        const px = this.player.pos.x;
        const py = this.player.pos.y;
        const interactable = this.getNearestInteractable();
        if (!interactable) return;

        // Open Chest
        if (interactable.type === 'CHEST') {
            const chest = interactable.entity;
            chest.opened = true;
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
            const itemDef = (typeof BASE_ITEMS !== 'undefined' && BASE_ITEMS[chest.itemId]) 
                ? BASE_ITEMS[chest.itemId] 
                : { id: chest.itemId, name: chest.itemId, desc: 'Valuable equipment' };
            if (this.player.inventory) this.player.inventory.addItem(itemDef, chest.count || 1);
            if (chest.coins) this.player.coinsCollected += chest.coins;
            this.showGbaDialogue(`SUPPLY POD UNLOCKED!\n\nObtained: ${chest.count || 1}x ${itemDef.name}\n+${chest.coins || 0} ALU Coins!`, 'ITEM DISCOVERED');
            this.updateHUD();
            return;
        }

        // Gather Sparkle
        if (interactable.type === 'SPARKLE') {
            const sp = interactable.entity;
            sp.collected = true;
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
            this.player.coinsCollected += (sp.coins || 5);
            let extraMsg = '';
            if (sp.itemId && typeof BASE_ITEMS !== 'undefined' && BASE_ITEMS[sp.itemId]) {
                const itemDef = BASE_ITEMS[sp.itemId];
                if (this.player.inventory) this.player.inventory.addItem(itemDef, 1);
                extraMsg = ` & ${itemDef.name}`;
            }
            this.showGbaDialogue(`FORAGED CACHE!\n\nGathered: +${sp.coins} ALU Coins${extraMsg}`, 'CACHE DISCOVERED');
            this.updateHUD();
            return;
        }

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
        this.updateTouchControlsVisibility();
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
        this.showGbaDialogue("FARMER DEIFIC AWAKENING", "🌾 The Secret Farmer class is now fully unlocked in your roster!");
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
                btnA.style.boxShadow = "inset 2px 2px 0px rgba(255,255,255,0.4), 0 0 14px rgba(0, 229, 255, 0.7)";
            } else {
                btnASub.innerText = "ATTACK";
                btnA.style.borderColor = "#26a69a";
                btnA.style.boxShadow = "inset 2px 2px 0px rgba(255,255,255,0.35), inset -2px -2px 0px rgba(0,0,0,0.7), 0 5px 10px rgba(0,0,0,0.6)";
            }
        }

        // 2. Pioneer Status in Footer
        const pioneerCallsignElem = document.getElementById('pioneer-callsign');
        const pioneerClassElem = document.getElementById('pioneer-class-tag');
        if (pioneerCallsignElem) pioneerCallsignElem.innerText = this.pioneerName || "ALU-01";
        if (pioneerClassElem && this.player) pioneerClassElem.innerText = this.player.charClass.replace('_', ' ');

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

        this.updateTouchControlsVisibility();
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

            // Proximity sparkle collection when walking over glints
            if (this.currentMap && this.currentMap.sparkles) {
                for (const sp of this.currentMap.sparkles) {
                    if (!sp.collected && Math.hypot(this.player.pos.x - sp.x, this.player.pos.y - sp.y) < 14) {
                        sp.collected = true;
                        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
                        this.player.coinsCollected += (sp.coins || 5);
                        if (sp.itemId && typeof BASE_ITEMS !== 'undefined' && BASE_ITEMS[sp.itemId]) {
                            const itemDef = BASE_ITEMS[sp.itemId];
                            if (this.player.inventory) this.player.inventory.addItem(itemDef, 1);
                        }
                    }
                }
            }
        }

        // 2. Camera Update (Follow player smoothly)
        this.renderer.updateCamera(this.player.pos, this.currentMap.width, this.currentMap.height, dt);

        // 3. Render Pass (Canvas is ALWAYS rendering the living world map behind modals!)
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

// Native Android back button dispatcher
window.handleAndroidBack = function() {
    if (window.game) {
        window.game.handleBackOrEscape();
    }
};
