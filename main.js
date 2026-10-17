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
        this.gameState = 'START_SCREEN'; // 'START_SCREEN' or 'GAMEPLAY'
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
        this.activeSlotIndex = 0;
        this.saveSlots = [];
        this.dayTimer = 0.25; // 0.0 to 1.0 (0.25 = noon)
        this.currentDay = 1;
        this.harvestCount = 0;
        this.runsCount = 1;
        this.bossSlainCount = 0;
        this.coresExtractedCount = 0;

        // Living world & NPCs
        this.critters = new CritterManager();
        this.npcs = new NpcManager();
        this.currentAreaId = 'CINDERWATCH_HAMLET';
        this.areaMaps = {};
        this.activeDialogue = null;
        this.dialogueStep = 0;

        // Input state
        this.keys = {};
        this.touchDirs = { up: false, down: false, left: false, right: false };

        this.init();
    }

    init() {
        // 1. Load persistent state and 10 save slots
        this.loadSaveSlots();
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

        // 4. Setup Input Handlers, Start Screen, GBA Menu & Modals
        this.setupKeyboard();
        this.setupTouchControls();
        this.setupStartScreen();
        this.setupGbaMenu();
        this.setupUI();
        this.setupModals();

        // 5. Initial State: Always Boot Directly to Atmospheric Start Screen (No Gameplay Blur)
        this.setGameState('START_SCREEN');

        // 6. Render Pixel Art Canvases & Update UI Visibility
        this.renderUIPixelCanvases();
        this.updateTouchControlsVisibility();

        // 7. Start 60 FPS Game Loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));

        // 8. Sync with edge gateway in background
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
            if (now - lastTrigger < 300) return;
            lastTrigger = now;
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            if (this.renderer && this.renderer.audio) this.renderer.audio.init();
            cb(e);
        };
        elem.addEventListener('pointerup', trigger);
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

        // Hide touch controls if on START_SCREEN or if character setup modal is actively open
        const setupModal = document.getElementById('setup-modal');
        const isSetupOpen = setupModal && !setupModal.classList.contains('hidden');

        if (this.gameState === 'START_SCREEN' || isSetupOpen) {
            touchControls.classList.add('controls-hidden');
        } else {
            touchControls.classList.remove('controls-hidden');
        }
    }

    setGameState(state) {
        this.gameState = state;
        const startScreen = document.getElementById('start-screen-container');
        const header = document.getElementById('game-header');
        const footer = document.getElementById('game-footer');
        const touchControls = document.getElementById('touch-controls');

        if (state === 'START_SCREEN') {
            if (startScreen) startScreen.classList.remove('hidden');
            if (header) header.classList.add('hidden');
            if (footer) footer.classList.add('hidden');
            if (touchControls) touchControls.classList.add('controls-hidden');
            document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
            const gbaMenu = document.getElementById('gba-start-menu');
            if (gbaMenu) gbaMenu.classList.add('hidden');
            const rusticHud = document.getElementById('rustic-hud-overlay');
            if (rusticHud) rusticHud.classList.add('hidden');
            const dlgModal = document.getElementById('dialogue-box-modal');
            if (dlgModal) dlgModal.classList.add('hidden');

            const keysVal = document.getElementById('start-keys-val');
            const coresVal = document.getElementById('start-cores-val');
            const tokensVal = document.getElementById('start-tokens-val');
            if (keysVal) keysVal.innerText = '15/15';
            if (coresVal) coresVal.innerText = `${this.coresExtractedCount || 0}`;
            if (tokensVal) tokensVal.innerText = `${this.player ? this.player.coinsCollected : 0}`;

            if (this.renderer && this.renderer.audio && this.bgmEnabled) {
                this.renderer.audio.stopBgm();
            }
        } else if (state === 'GAMEPLAY') {
            if (startScreen) startScreen.classList.add('hidden');
            if (header) header.classList.remove('hidden');
            if (footer) footer.classList.remove('hidden');
            if (touchControls) touchControls.classList.remove('controls-hidden');
            const rusticHud = document.getElementById('rustic-hud-overlay');
            if (rusticHud) rusticHud.classList.remove('hidden');
            document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
            if (this.soundEnabled && this.bgmEnabled) {
                this.renderer.audio.startBgm(this.currentLayer === 'SUB_CORE' ? 'SUB_CORE' : 'OVERWORLD');
            }
        }
    }

    setupStartScreen() {
        const btnStart = document.getElementById('btn-game-start');
        if (btnStart) {
            this.bindTap(btnStart, () => {
                this.openSaveSlotsModal();
            });
        }

        const tabRoster = document.getElementById('start-tab-roster');
        if (tabRoster) {
            this.bindTap(tabRoster, () => {
                document.getElementById('setup-modal').classList.remove('hidden');
                this.screens.currentScreen = 'SETUP';
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const tabWorldGen = document.getElementById('start-tab-worldgen');
        if (tabWorldGen) {
            this.bindTap(tabWorldGen, () => {
                const seedInput = document.getElementById('worldgen-seed-input');
                if (seedInput) {
                    seedInput.value = '0x' + (this.currentSeed >>> 0).toString(16).toUpperCase();
                }
                const modal = document.getElementById('worldgen-modal');
                if (modal) modal.classList.remove('hidden');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const tabMarket = document.getElementById('start-tab-market');
        if (tabMarket) {
            this.bindTap(tabMarket, () => {
                this.renderMarketModal();
                const modal = document.getElementById('market-modal');
                if (modal) modal.classList.remove('hidden');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const tabRecords = document.getElementById('start-tab-records');
        if (tabRecords) {
            this.bindTap(tabRecords, () => {
                this.openRecordsModal();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const tabSettings = document.getElementById('start-tab-settings');
        if (tabSettings) {
            this.bindTap(tabSettings, () => {
                this.toggleSoundModal();
            });
        }
    }

    loadSaveSlots() {
        try {
            const raw = localStorage.getItem('aether_save_slots');
            if (raw) this.saveSlots = JSON.parse(raw);
        } catch (e) {
            console.warn("Could not load save slots", e);
        }
        if (!Array.isArray(this.saveSlots) || this.saveSlots.length < 10) {
            this.saveSlots = [];
            for (let i = 0; i < 10; i++) this.saveSlots.push(null);
        }
    }

    writeSaveSlots() {
        try {
            localStorage.setItem('aether_save_slots', JSON.stringify(this.saveSlots));
        } catch (e) {
            console.warn("Could not save slots", e);
        }
    }

    openSaveSlotsModal() {
        const modal = document.getElementById('save-slots-modal');
        if (!modal) return;
        this.renderSaveSlots();
        modal.classList.remove('hidden');
    }

    renderSaveSlots() {
        const grid = document.getElementById('save-slots-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < 10; i++) {
            const slot = this.saveSlots[i];
            const card = document.createElement('div');
            card.className = `save-slot-card ${slot ? 'occupied' : 'empty'}`;

            if (slot) {
                card.innerHTML = `
                    <div class="slot-num">SLOT 0${i + 1}</div>
                    <div class="slot-title">${slot.pioneerName || 'PIONEER'}</div>
                    <div class="slot-desc">${(slot.selectedClass || 'WARRIOR').replace('_', ' ')} • Day ${slot.currentDay || 1}</div>
                    <div class="slot-desc" style="color: #ffd54f;">🪙 ${slot.coins || 0} $ALU</div>
                `;
                setTimeout(() => {
                    this.bindTap(card, () => this.loadSlot(i));
                }, 150);
            } else {
                card.innerHTML = `
                    <div class="slot-num">SLOT 0${i + 1}</div>
                    <div class="slot-title" style="color: #00e5ff;">+ NEW RUN</div>
                    <div class="slot-desc">START EXPEDITION</div>
                `;
                setTimeout(() => {
                    this.bindTap(card, () => this.startNewExpeditionInSlot(i));
                }, 150);
            }

            grid.appendChild(card);
        }
    }

    startNewExpeditionInSlot(slotIndex) {
        this.activeSlotIndex = slotIndex;
        document.getElementById('save-slots-modal').classList.add('hidden');

        this.currentDay = 1;
        this.dayTimer = 0.25;
        this.loadNewWorld(this.currentSeed);
        this.saveCurrentSlot();

        this.setGameState('GAMEPLAY');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
    }

    loadSlot(slotIndex) {
        this.activeSlotIndex = slotIndex;
        const slot = this.saveSlots[slotIndex];
        document.getElementById('save-slots-modal').classList.add('hidden');

        if (slot) {
            if (slot.seed) this.currentSeed = slot.seed;
            if (slot.pioneerName) this.pioneerName = slot.pioneerName;
            if (slot.selectedClass) this.selectedClass = slot.selectedClass;
            if (slot.currentDay) this.currentDay = slot.currentDay;
            if (slot.dayTimer !== undefined) this.dayTimer = slot.dayTimer;
            this.loadNewWorld(this.currentSeed);

            if (slot.coins && this.player) this.player.coinsCollected = slot.coins;
            if (slot.hp && this.player) this.player.hp = slot.hp;
            if (slot.inventorySlots && this.player && this.player.inventory) {
                this.player.inventory.slots = slot.inventorySlots;
            }
        }

        this.setGameState('GAMEPLAY');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
    }

    saveCurrentSlot() {
        if (!this.player) return;
        this.saveSlots[this.activeSlotIndex] = {
            seed: this.currentSeed,
            pioneerName: this.pioneerName,
            selectedClass: this.selectedClass,
            currentDay: this.currentDay,
            dayTimer: this.dayTimer,
            currentLayer: this.currentLayer,
            coins: this.player.coinsCollected,
            hp: this.player.hp,
            inventorySlots: this.player.inventory ? this.player.inventory.slots : []
        };
        this.writeSaveSlots();
    }

    openCraftingModal() {
        const modal = document.getElementById('crafting-modal');
        if (!modal) return;
        this.renderCraftingRecipes();
        modal.classList.remove('hidden');
    }

    renderCraftingRecipes() {
        const list = document.getElementById('crafting-recipes-list');
        const infoPanel = document.getElementById('crafting-info-panel');
        if (!list || !this.player || !this.player.inventory) return;
        list.innerHTML = '';

        if (typeof CRAFTING_RECIPES === 'undefined') return;

        for (const recipe of CRAFTING_RECIPES) {
            const canCraft = this.player.inventory.canCraft(recipe);
            const card = document.createElement('div');
            card.className = 'craft-recipe-card';

            const matsHtml = recipe.materials.map(mat => {
                const have = this.player.inventory.getItemCount(mat.itemId);
                const itemDef = (typeof BASE_ITEMS !== 'undefined' && BASE_ITEMS[mat.itemId]) ? BASE_ITEMS[mat.itemId] : { name: mat.itemId };
                const isOk = have >= mat.count;
                return `<span class="${isOk ? 'mat-ok' : 'mat-missing'}">${itemDef.name}: ${have}/${mat.count}</span>`;
            }).join(' • ');

            card.innerHTML = `
                <div class="craft-recipe-info">
                    <div class="craft-recipe-title">${recipe.name}</div>
                    <div class="craft-recipe-mats">${matsHtml}</div>
                </div>
                <button class="craft-action-btn" ${canCraft ? '' : 'disabled'}>CRAFT</button>
            `;

            const btn = card.querySelector('.craft-action-btn');
            this.bindTap(btn, () => {
                const res = this.player.inventory.craftItem(recipe.id, this.player);
                if (res.success) {
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
                    this.renderer.addFloatingText(`+${recipe.resultCount || 1} ${recipe.name}`, this.player.pos.x, this.player.pos.y - 14, '#81c784');
                    if (infoPanel) infoPanel.innerText = `Crafted ${recipe.name}! ${recipe.desc}`;
                    this.renderCraftingRecipes();
                    this.updateHUD();
                }
            });

            this.bindTap(card, (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    if (infoPanel) infoPanel.innerText = `${recipe.name}: ${recipe.desc}`;
                }
            });

            list.appendChild(card);
        }
    }

    openRecordsModal() {
        const modal = document.getElementById('records-modal');
        if (!modal) return;
        const dVal = document.getElementById('rec-days-val');
        const rVal = document.getElementById('rec-runs-val');
        const hVal = document.getElementById('rec-harvest-val');
        const bVal = document.getElementById('rec-boss-val');
        const cVal = document.getElementById('rec-cores-val');

        if (dVal) dVal.innerText = `Day ${this.currentDay}`;
        if (rVal) rVal.innerText = `${this.runsCount || 1}`;
        if (hVal) hVal.innerText = `${this.harvestCount || 0} nodes`;
        if (bVal) bVal.innerText = `${this.bossSlainCount || 0}`;
        if (cVal) cVal.innerText = `${this.coresExtractedCount || 0}`;

        modal.classList.remove('hidden');
    }

    updateClockGauge() {
        const canvas = document.getElementById('clock-gauge-canvas');
        const badge = document.getElementById('day-counter-badge');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const r = 9;

        let periodName = 'NOON';
        if (this.dayTimer < 0.20) periodName = 'MORNING';
        else if (this.dayTimer < 0.40) periodName = 'NOON';
        else if (this.dayTimer < 0.50) periodName = 'DUSK';
        else if (this.dayTimer < 0.85) periodName = 'NIGHT';
        else periodName = 'DAWN';

        if (badge) {
            badge.innerText = `DAY ${this.currentDay} (${periodName})`;
            if (periodName === 'NIGHT') {
                badge.style.background = '#1a237e';
                badge.style.color = '#82b1ff';
            } else if (periodName === 'DUSK') {
                badge.style.background = '#bf360c';
                badge.style.color = '#ffab91';
            } else {
                badge.style.background = '#1c2734';
                badge.style.color = '#64b5f6';
            }
        }

        ctx.save();
        ctx.translate(cx, cy);
        const angle = this.dayTimer * Math.PI * 2;
        ctx.rotate(angle);

        ctx.fillStyle = '#29b6f6';
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.fill();

        ctx.fillStyle = '#0a101f';
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
        ctx.fill();

        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(5, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cfd8dc';
        ctx.beginPath();
        ctx.arc(-5, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.strokeStyle = '#455a64';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    loadNewWorld(seed) {
        this.currentSeed = seed;
        this.areaMaps = {
            CINDERWATCH_HAMLET: new WorldMap(seed, 64, 64, 'CINDERWATCH_HAMLET'),
            WHISPERING_WOODS: new WorldMap(seed, 80, 80, 'WHISPERING_WOODS'),
            SUNKEN_GROTTO: new WorldMap(seed, 64, 64, 'SUNKEN_GROTTO'),
            SUB_BEDROCK_CORE: new WorldMap(seed, 64, 64, 'SUB_BEDROCK_CORE')
        };
        this.surfaceMap = this.areaMaps.CINDERWATCH_HAMLET;
        this.subCoreMap = this.areaMaps.SUB_BEDROCK_CORE;
        
        this.currentAreaId = 'CINDERWATCH_HAMLET';
        this.currentLayer = 'SURFACE';
        this.currentMap = this.areaMaps.CINDERWATCH_HAMLET;

        // Init critters & NPCs for starting area
        this.critters.initForArea(this.currentAreaId, this.currentMap.width, this.currentMap.height);
        this.critters.clearChimneys();
        if (this.currentMap.chimneys) {
            for (const ch of this.currentMap.chimneys) this.critters.addChimneyEmitter(ch.x, ch.y);
        }
        this.npcs.initForArea(this.currentAreaId);

        // Create player at map spawn
        this.player = new Character(this.selectedClass, this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
        this.player.callsign = this.pioneerName || 'ALU-01';
        
        // Update header ticker info
        const hubTickerInfo = document.getElementById('hub-ticker-info');
        if (hubTickerInfo) {
            hubTickerInfo.innerText = `${this.currentMap.bondingCurve.ticker} • SEED: 0x${seed.toString(16).toUpperCase()}`;
        }

        this.renderUIPixelCanvases();
        this.updateHUD();
        this.saveState();
    }

    changeArea(newAreaId, targetSpawn = null) {
        if (!this.areaMaps[newAreaId]) {
            this.areaMaps[newAreaId] = new WorldMap(this.currentSeed, 64, 64, newAreaId);
        }
        this.currentAreaId = newAreaId;
        this.currentMap = this.areaMaps[newAreaId];
        this.currentLayer = (newAreaId === 'SUB_BEDROCK_CORE' || newAreaId === 'SUNKEN_GROTTO') ? 'SUB_CORE' : 'SURFACE';

        // Spawn critters and NPCs
        this.critters.initForArea(newAreaId, this.currentMap.width, this.currentMap.height);
        this.critters.clearChimneys();
        if (this.currentMap.chimneys) {
            for (const ch of this.currentMap.chimneys) this.critters.addChimneyEmitter(ch.x, ch.y);
        }
        this.npcs.initForArea(newAreaId);

        // Position player
        if (targetSpawn) {
            this.player.pos.set(targetSpawn.x, targetSpawn.y);
        } else {
            this.player.pos.set(this.currentMap.spawnPoint.x, this.currentMap.spawnPoint.y);
        }
        this.player.vel.set(0, 0);

        // Play ambient chime & update BGM
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(440, 'triangle', 0.25, 0.12);
        if (this.soundEnabled && this.bgmEnabled) {
            const track = (newAreaId === 'SUB_BEDROCK_CORE') ? 'SUB_CORE' : 'OVERWORLD';
            this.renderer.audio.startBgm(track);
        }

        this.renderer.addFloatingText(`ENTERED ${this.currentMap.areaName}!`, this.player.pos.x, this.player.pos.y - 20, '#00e5ff');
        this.updateHUD();
    }

    switchLayer(newLayer) {
        if (newLayer === 'SUB_CORE') {
            this.changeArea('SUB_BEDROCK_CORE');
        } else {
            this.changeArea('CINDERWATCH_HAMLET');
        }
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
        // Dialogue Box tap to advance
        const dialogueBox = document.getElementById('dialogue-box-modal');
        if (dialogueBox) {
            this.bindTap(dialogueBox, () => {
                this.advanceDialogue();
            });
        }

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

        // 6. Slots, Crafting, Worldgen & Records Modals Controls
        const slotsClose = document.getElementById('slots-close');
        if (slotsClose) {
            this.bindTap(slotsClose, () => {
                document.getElementById('save-slots-modal').classList.add('hidden');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const craftingClose = document.getElementById('crafting-close');
        if (craftingClose) {
            this.bindTap(craftingClose, () => {
                document.getElementById('crafting-modal').classList.add('hidden');
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const worldgenClose = document.getElementById('worldgen-close');
        if (worldgenClose) {
            this.bindTap(worldgenClose, () => {
                document.getElementById('worldgen-modal').classList.add('hidden');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const recordsClose = document.getElementById('records-close');
        if (recordsClose) {
            this.bindTap(recordsClose, () => {
                document.getElementById('records-modal').classList.add('hidden');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        // Worldgen modal button controls
        const btnWorldgenRandom = document.getElementById('btn-worldgen-random');
        const worldgenSeedInput = document.getElementById('worldgen-seed-input');
        if (btnWorldgenRandom && worldgenSeedInput) {
            this.bindTap(btnWorldgenRandom, () => {
                const rnd = '0x' + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase();
                worldgenSeedInput.value = rnd;
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playRoll();
            });
        }

        const btnApplyWorldgen = document.getElementById('btn-apply-worldgen');
        if (btnApplyWorldgen && worldgenSeedInput) {
            this.bindTap(btnApplyWorldgen, () => {
                const val = worldgenSeedInput.value.trim();
                const parsed = parseInt(val, val.startsWith('0x') ? 16 : 10);
                if (!isNaN(parsed)) {
                    this.loadNewWorld(parsed);
                    const log = document.getElementById('worldgen-log');
                    if (log) log.innerText = `Matrix regenerated! Ticker: ${this.currentMap.bondingCurve.ticker} (Seed: 0x${(parsed >>> 0).toString(16).toUpperCase()})`;
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
                }
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
            case 'status':
                this.showGbaDialogue(
                    "PIONEER TELEMETRY",
                    `Pioneer: ${this.pioneerName || 'ALU-01'} (${(this.selectedClass || 'SUPER_SOLDIER').replace('_', ' ')})\n` +
                    `Day: ${this.currentDay} | Layer: ${this.currentLayer}\n` +
                    `HP: ${Math.round(this.player.hp)}/${this.player.maxHp} | Energy: ${Math.round(this.player.energy)}/${this.player.maxEnergy}\n` +
                    `Coins: ${this.player.coinsCollected} $ALU | Harvests: ${this.harvestCount || 0}`
                );
                break;
            case 'inventory':
                this.toggleInventory();
                break;
            case 'crafting':
                this.openCraftingModal();
                break;
            case 'map':
                const enemiesCount = this.currentMap.enemies.filter(e => e.hp > 0).length;
                const nodesCount = this.currentMap.resourceNodes ? this.currentMap.resourceNodes.filter(n => n.hp > 0).length : 0;
                this.showGbaDialogue(
                    "RADAR MAP TELEMETRY",
                    `Layer: ${this.currentLayer}\n` +
                    `Coords: X:${Math.floor(this.player.pos.x / 16)}, Y:${Math.floor(this.player.pos.y / 16)}\n` +
                    `Radar Scan: ${enemiesCount} Hostiles Detected\n` +
                    `Resources: ${nodesCount} Harvestable Nodes\n` +
                    `World Seed: 0x${(this.currentSeed >>> 0).toString(16).toUpperCase()}`
                );
                break;
            case 'save':
                this.saveCurrentSlot();
                this.renderer.addFloatingText(`RUN SAVED TO SLOT 0${this.activeSlotIndex + 1}!`, this.player.pos.x, this.player.pos.y - 18, '#ffd54f');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
                this.showGbaDialogue("MISSION PROGRESS SAVED", `Expedition telemetry saved to Slot 0${this.activeSlotIndex + 1}.\nDay: ${this.currentDay} | Coins: ${this.player.coinsCollected} $ALU`);
                break;
            case 'dev':
                this.toggleDevModal();
                break;
            case 'exit':
                this.saveCurrentSlot();
                this.setGameState('START_SCREEN');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
                break;
            case 'market':
                this.toggleMarket();
                break;
            case 'sound':
                this.toggleSoundModal();
                break;
            case 'new-seed':
                this.showGbaSeedDialog();
                break;
            case 'pioneer':
                document.getElementById('setup-modal').classList.remove('hidden');
                this.screens.currentScreen = 'SETUP';
                this.updateTouchControlsVisibility();
                break;
            case 'reboot':
                this.restartPioneer();
                break;
            default:
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

        // 0. Friendly NPCs (Dialogue & Story)
        if (this.npcs) {
            const npc = this.npcs.getNearbyNpc(px, py, 34);
            if (npc) {
                return { type: 'NPC', entity: npc, label: 'TALK' };
            }
        }

        // 0.5. Area Portals
        if (this.currentMap && this.currentMap.findNearbyPortal) {
            const portal = this.currentMap.findNearbyPortal(px, py, 32);
            if (portal) {
                return { 
                    type: 'PORTAL', 
                    entity: portal, 
                    label: portal.label.includes('WOODS') ? 'TO WOODS' : 
                           portal.label.includes('HAMLET') ? 'TO HAMLET' : 
                           portal.label.includes('GROTTO') ? 'TO GROTTO' : 'ENTER' 
                };
            }
        }

        // 1. Survival Resource Nodes (The Wild Darkness survival interaction)
        if (this.currentMap.findNearbyNode) {
            const node = this.currentMap.findNearbyNode(px, py, 26);
            if (node) {
                let label = 'EXAMINE';
                if (node.type === 'PINE_TREE') label = 'CHOP';
                else if (node.type === 'FLINT_BOULDER') label = 'MINE';
                else if (node.type === 'WILD_CABBAGE') label = 'GATHER';
                else if (node.type === 'BERRY_BUSH' || node.type === 'WILD_BERRY_BUSH') label = 'FORAGE';
                else if (node.type === 'MEDICINAL_HERB') label = 'HARVEST';
                else if (node.type === 'CAMPFIRE' || node.type === 'CAMPFIRE_SITE') label = 'REST';
                else if (node.type === 'RUNIC_TOTEM') label = 'COMMUNE';
                else if (node.type === 'TITANIUM_CONDUIT' || node.type === 'POWER_CONDUIT') label = 'EXTRACT';
                else if (node.type === 'RESONANT_CRYSTAL' || node.type === 'GLOWING_CRYSTAL') label = 'MINE';
                return { type: 'RESOURCE_NODE', entity: node, label: label };
            }
        }

        // 2. Quantum Supply Pods / Chests
        if (this.currentMap.chests) {
            for (const chest of this.currentMap.chests) {
                if (!chest.opened && Math.hypot(px - chest.x, py - chest.y) < 26) {
                    return { type: 'CHEST', entity: chest, label: 'OPEN POD' };
                }
            }
        }

        // 3. Glittering Foraging Sparkles
        if (this.currentMap.sparkles) {
            for (const sp of this.currentMap.sparkles) {
                if (!sp.collected && Math.hypot(px - sp.x, py - sp.y) < 22) {
                    return { type: 'SPARKLE', entity: sp, label: 'GATHER' };
                }
            }
        }

        // 4. Terminals in Sub-Core
        if (this.currentLayer === 'SUB_CORE' && this.currentMap.terminals) {
            for (const term of this.currentMap.terminals) {
                if (Math.hypot(px - term.x, py - term.y) < 32) {
                    return { type: 'TERMINAL', entity: term, label: 'READ LOG' };
                }
            }
        }

        // 5. Cave Entrance on Surface
        if (this.currentLayer === 'SURFACE' && this.currentMap.caveEntrance) {
            const ce = this.currentMap.caveEntrance;
            if (Math.hypot(px - (ce.x * 16 + 8), py - (ce.y * 16 + 8)) < 28) {
                return { type: 'CAVE_ENTRANCE', label: 'ENTER CORE' };
            }
        }

        // 6. Return Ladder in Sub-Core
        if (this.currentLayer === 'SUB_CORE') {
            const sp = this.currentMap.spawnPoint;
            if (Math.hypot(px - sp.x, py - sp.y) < 28) {
                return { type: 'CORE_EXIT', label: 'ASCEND' };
            }
        }

        // 7. Secret 3x3 Arable Plot in Sub-Core
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
        if (this.activeDialogue) {
            this.advanceDialogue();
            return;
        }
        const interactable = this.getNearestInteractable();
        if (interactable) {
            this.handleInteract();
        } else {
            this.handleAttack();
        }
    }

    startNpcDialogue(npc) {
        if (!this.npcs) return;
        this.activeDialogue = this.npcs.getDialogueFor(npc, this.player.charClass, this.player.callsign);
        this.activeDialogue.npcId = npc.id;
        this.dialogueStep = 0;

        const modal = document.getElementById('dialogue-box-modal');
        if (!modal) return;
        modal.classList.remove('hidden');

        // Update speaker details
        const nameElem = document.getElementById('dialogue-speaker-name');
        const titleElem = document.getElementById('dialogue-speaker-title');
        if (nameElem) nameElem.textContent = this.activeDialogue.speaker;
        if (titleElem) titleElem.textContent = this.activeDialogue.title || "";

        // Render portrait
        this.renderDialoguePortrait(npc.portrait);

        // Show first line
        this.showCurrentDialogueLine();

        // Check quest updates
        if (this.activeDialogue.questUpdate) {
            this.npcs.questStage = this.activeDialogue.questUpdate.stage;
            this.npcs.activeQuestTitle = this.activeDialogue.questUpdate.title;
            this.npcs.activeQuestObjective = this.activeDialogue.questUpdate.objective;
            const qTitle = document.getElementById('quest-title-text');
            const qObj = document.getElementById('quest-obj-text');
            if (qTitle) qTitle.textContent = this.activeDialogue.questUpdate.title;
            if (qObj) qObj.textContent = this.activeDialogue.questUpdate.objective;
        }

        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playBlip();
    }

    renderDialoguePortrait(portraitType) {
        const pCanvas = document.getElementById('dialogue-portrait-canvas');
        if (!pCanvas) return;
        const ctx = pCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 48, 48);

        ctx.fillStyle = '#080c12';
        ctx.fillRect(0, 0, 48, 48);

        if (portraitType === 'ELDER') {
            ctx.fillStyle = '#6c5ce7';
            ctx.fillRect(8, 6, 32, 34);
            ctx.fillStyle = '#ffeaa7';
            ctx.fillRect(14, 14, 20, 18);
            ctx.fillStyle = '#dfe6e9';
            ctx.fillRect(10, 8, 28, 8);
            ctx.fillRect(12, 24, 24, 16);
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(16, 18, 4, 3);
            ctx.fillRect(26, 18, 4, 3);
        } else if (portraitType === 'SMITH') {
            ctx.fillStyle = '#d63031';
            ctx.fillRect(8, 8, 32, 10);
            ctx.fillStyle = '#ffeaa7';
            ctx.fillRect(12, 16, 24, 20);
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(10, 6, 28, 6);
            ctx.fillRect(14, 26, 20, 8);
            ctx.fillRect(16, 20, 4, 3);
            ctx.fillRect(26, 20, 4, 3);
        } else if (portraitType === 'HERBALIST') {
            ctx.fillStyle = '#00b894';
            ctx.fillRect(8, 6, 32, 34);
            ctx.fillStyle = '#ffeaa7';
            ctx.fillRect(14, 14, 20, 20);
            ctx.fillStyle = '#e17055';
            ctx.fillRect(10, 8, 28, 10);
            ctx.fillStyle = '#ff7675';
            ctx.fillRect(32, 8, 6, 6);
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(16, 20, 4, 3);
            ctx.fillRect(26, 20, 4, 3);
        } else if (portraitType === 'RANGER') {
            ctx.fillStyle = '#0984e3';
            ctx.fillRect(8, 6, 32, 34);
            ctx.fillStyle = '#ffeaa7';
            ctx.fillRect(14, 14, 20, 20);
            ctx.fillStyle = '#ffeaa7';
            ctx.fillRect(10, 8, 28, 8);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(30, 4, 4, 8);
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(16, 20, 4, 3);
            ctx.fillRect(26, 20, 4, 3);
        } else if (portraitType === 'AUTOMATON') {
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(8, 8, 32, 32);
            ctx.fillStyle = '#00cec9';
            ctx.fillRect(12, 12, 24, 24);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(18, 18, 12, 12);
            ctx.fillStyle = '#0984e3';
            ctx.fillRect(22, 22, 4, 4);
        } else {
            ctx.fillStyle = '#636e72';
            ctx.fillRect(12, 12, 24, 24);
        }
    }

    showCurrentDialogueLine() {
        if (!this.activeDialogue) return;
        const line = this.activeDialogue.lines[this.dialogueStep];
        const textElem = document.getElementById('dialogue-text-content');
        if (textElem) {
            textElem.textContent = line || "";
        }
    }

    advanceDialogue() {
        if (!this.activeDialogue) return;
        this.dialogueStep++;
        if (this.dialogueStep >= this.activeDialogue.lines.length) {
            const modal = document.getElementById('dialogue-box-modal');
            if (modal) modal.classList.add('hidden');
            this.activeDialogue = null;
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        } else {
            this.showCurrentDialogueLine();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playBlip();
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

        // 1. NPC Interaction (Dialogue & Story)
        if (interactable.type === 'NPC') {
            this.startNpcDialogue(interactable.entity);
            return;
        }

        // 2. Area Portal Interaction (Multi-area traversal)
        if (interactable.type === 'PORTAL') {
            this.changeArea(interactable.entity.targetArea, interactable.entity.targetSpawn);
            return;
        }

        // 3. Survival Resource Node Interaction
        if (interactable.type === 'RESOURCE_NODE') {
            const node = interactable.entity;
            if (node.type === 'CAMPFIRE' || node.type === 'CAMPFIRE_SITE') {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
                this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 25);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
                this.renderer.addFloatingText('+25 HP Rested', this.player.pos.x, this.player.pos.y - 14, '#ffd54f');
                this.updateHUD();
                return;
            }

            if (node.type === 'RUNIC_TOTEM') {
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
                this.showGbaDialogue("ANCIENT RUNIC MONOLITH", `The World Seed 0x${(this.currentSeed >>> 0).toString(16).toUpperCase()} pulses with primordial Dyson resonance.\nSurvive the night and descend into the Sub-Bedrock Core.`);
                return;
            }

            // Tools bonus
            let dmg = 1;
            const hasAxe = this.player.inventory && this.player.inventory.hasItem('STONE_AXE');
            if (node.type === 'PINE_TREE' && hasAxe) dmg = 2;
            if (node.type === 'FLINT_BOULDER' && hasAxe) dmg = 2;

            const res = this.currentMap.damageNode(node, dmg);
            if (!res) return;

            if (res.harvested) {
                this.harvestCount = (this.harvestCount || 0) + 1;
                const dropId = res.drops;
                const count = res.dropCount || 1;
                const coins = res.dropCoins || 0;
                const itemDef = (typeof BASE_ITEMS !== 'undefined' && BASE_ITEMS[dropId]) 
                    ? BASE_ITEMS[dropId] 
                    : { id: dropId, name: dropId };

                if (this.player.inventory) this.player.inventory.addItem(itemDef, count);
                if (coins) this.player.coinsCollected += coins;

                if (this.soundEnabled && this.sfxEnabled) {
                    if (node.type === 'PINE_TREE') this.renderer.audio.playSlash();
                    else if (node.type === 'FLINT_BOULDER') this.renderer.audio.playParry();
                    else this.renderer.audio.playHarvest();
                }

                this.renderer.addFloatingText(`+${count} ${itemDef.name}`, node.x, node.y - 12, '#81c784');
                if (coins > 0) {
                    setTimeout(() => {
                        this.renderer.addFloatingText(`+${coins} ALU`, node.x, node.y - 20, '#ffd54f');
                    }, 200);
                }
            } else {
                if (this.soundEnabled && this.sfxEnabled) {
                    if (node.type === 'PINE_TREE') this.renderer.audio.playSlash();
                    else if (node.type === 'FLINT_BOULDER') this.renderer.audio.playParry();
                }
                const hitAction = node.type === 'PINE_TREE' ? 'Chop' : 'Hit';
                this.renderer.addFloatingText(`${hitAction}! (${res.remainingHp}/${node.maxHp})`, node.x, node.y - 12, '#ffffff');
            }

            this.updateHUD();
            return;
        }

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
                btnASub.innerText = interactable.label || "EXAMINE";
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
            const hpBar = document.getElementById('hp-bar');
            const hpText = document.getElementById('hp-text');
            const energyBar = document.getElementById('energy-bar');
            const energyText = document.getElementById('energy-text');
            const walletCoins = document.getElementById('wallet-coins');

            if (hpBar) hpBar.style.width = `${hpPercent}%`;
            if (hpText) hpText.innerText = `${Math.round(this.player.hp)}/${this.player.maxHp}`;
            if (energyBar) energyBar.style.width = `${energyPercent}%`;
            if (energyText) energyText.innerText = `${Math.round(this.player.energy)}/${this.player.maxEnergy}`;
            if (walletCoins) walletCoins.innerText = this.player.coinsCollected;
        }

        // 4. Coin & Bonding curve info
        if (this.currentMap && this.currentMap.bondingCurve) {
            const curve = this.currentMap.bondingCurve;
            const coinTicker = document.getElementById('coin-ticker');
            const coinPrice = document.getElementById('coin-price');
            const coinFloor = document.getElementById('coin-floor');
            if (coinTicker) coinTicker.innerText = curve.ticker;
            if (coinPrice) coinPrice.innerText = `${curve.getCurrentPrice().toFixed(3)} ALU`;
            if (coinFloor) coinFloor.innerText = `Floor: ${curve.getGuaranteedFloor().toFixed(3)} ALU`;
        }

        // 5. Rustic Vitals Plate & Quest Info (Image 1 reference)
        const rusticArea = document.getElementById('rustic-area-title');
        const rusticLevel = document.getElementById('rustic-player-level');
        const rusticHpFill = document.getElementById('rustic-hp-fill');
        const rusticHpText = document.getElementById('rustic-hp-text');
        const rusticMpFill = document.getElementById('rustic-mp-fill');
        const rusticMpText = document.getElementById('rustic-mp-text');
        const rusticSpFill = document.getElementById('rustic-sp-fill');
        const rusticSpText = document.getElementById('rustic-sp-text');
        const rusticTimeText = document.getElementById('rustic-time-text');
        const questTitle = document.getElementById('quest-title-text');
        const questObj = document.getElementById('quest-obj-text');

        if (rusticArea && this.currentMap) rusticArea.innerText = this.currentMap.areaName || "CINDERWATCH HAMLET";
        if (rusticLevel && this.player) rusticLevel.innerText = `${Math.min(99, 1 + Math.floor((this.player.coinsCollected || 0) / 40))}`;

        if (this.player) {
            const hpPct = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
            const mpPct = Math.max(0, Math.min(100, (this.player.energy / this.player.maxEnergy) * 100));
            if (rusticHpFill) rusticHpFill.style.width = `${hpPct}%`;
            if (rusticHpText) rusticHpText.innerText = `${Math.round(this.player.hp)}/${this.player.maxHp}`;
            if (rusticMpFill) rusticMpFill.style.width = `${mpPct}%`;
            if (rusticMpText) rusticMpText.innerText = `${Math.round(this.player.energy)}/${this.player.maxEnergy}`;
            if (rusticSpFill) rusticSpFill.style.width = `100%`;
            if (rusticSpText) rusticSpText.innerText = `100/100`;
        }

        if (this.npcs) {
            if (questTitle) questTitle.innerText = this.npcs.activeQuestTitle;
            if (questObj) questObj.innerText = this.npcs.activeQuestObjective;
        }

        // Calculate 24h clock string & atmospheric state
        const dayProgress = this.dayTimer || 0.25;
        const totalMinutes = Math.floor(dayProgress * 1440);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const hh = (hours < 10 ? '0' : '') + hours;
        const mm = (mins < 10 ? '0' : '') + mins;
        let periodName = "Day";
        if (dayProgress >= 0.15 && dayProgress < 0.25) periodName = "Dawn Mist";
        else if (dayProgress >= 0.25 && dayProgress < 0.40) periodName = "Morning";
        else if (dayProgress >= 0.40 && dayProgress < 0.50) periodName = "High Noon";
        else if (dayProgress >= 0.50 && dayProgress < 0.65) periodName = "Golden Hour";
        else if (dayProgress >= 0.65 && dayProgress < 0.85) periodName = "Starry Night";
        else periodName = "Midnight";

        if (rusticTimeText) rusticTimeText.innerText = `${hh}:${mm} • ${periodName}`;

        this.updateMiniMap();
        this.updateTouchControlsVisibility();
    }

    updateMiniMap() {
        const miniCanvas = document.getElementById('mini-map-canvas');
        if (!miniCanvas || !this.currentMap || !this.player) return;
        const ctx = miniCanvas.getContext('2d');
        const mw = this.currentMap.width;
        const mh = this.currentMap.height;
        const cw = miniCanvas.width;
        const ch = miniCanvas.height;

        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, cw, ch);

        const ptx = Math.floor(this.player.pos.x / 16);
        const pty = Math.floor(this.player.pos.y / 16);
        const viewTiles = 30;
        const startX = Math.max(0, Math.min(mw - viewTiles, ptx - Math.floor(viewTiles / 2)));
        const startY = Math.max(0, Math.min(mh - viewTiles, pty - Math.floor(viewTiles / 2)));
        const step = cw / viewTiles;

        for (let y = 0; y < viewTiles; y++) {
            for (let x = 0; x < viewTiles; x++) {
                const mx = startX + x;
                const my = startY + y;
                const tile = this.currentMap.get(mx, my);
                if (tile === 1) ctx.fillStyle = '#1e88e5'; // River
                else if (tile === 12) ctx.fillStyle = '#8d6e63'; // Bridge
                else if (tile === 11) ctx.fillStyle = '#b0bec5'; // Cobblestone
                else if (tile === 5 || tile === 6) ctx.fillStyle = '#455a64'; // Cliff
                else if (tile === 14 || tile === 15) ctx.fillStyle = '#c62828'; // Cottage
                else if (tile === 4) ctx.fillStyle = '#2e7d32'; // Tall grass
                else if (tile === 20) ctx.fillStyle = '#00e5ff'; // Cavern mushroom
                else if (tile === 0) ctx.fillStyle = '#05070a'; // Void
                else ctx.fillStyle = '#388e3c'; // Ground

                ctx.fillRect(Math.floor(x * step), Math.floor(y * step), Math.ceil(step), Math.ceil(step));
            }
        }

        // Draw Portals
        if (this.currentMap.portals) {
            ctx.fillStyle = '#e040fb';
            for (const p of this.currentMap.portals) {
                const px = Math.floor(p.x / 16);
                const py = Math.floor(p.y / 16);
                if (px >= startX && px < startX + viewTiles && py >= startY && py < startY + viewTiles) {
                    ctx.fillRect(Math.floor((px - startX) * step), Math.floor((py - startY) * step), 3, 3);
                }
            }
        }

        // Draw NPCs
        if (this.npcs && this.npcs.npcs) {
            ctx.fillStyle = '#ffd54f';
            for (const n of this.npcs.npcs) {
                const nx = Math.floor(n.x / 16);
                const ny = Math.floor(n.y / 16);
                if (nx >= startX && nx < startX + viewTiles && ny >= startY && ny < startY + viewTiles) {
                    ctx.fillRect(Math.floor((nx - startX) * step), Math.floor((ny - startY) * step), 3, 3);
                }
            }
        }

        // Draw Player blip
        const pScreenX = Math.floor((ptx - startX) * step);
        const pScreenY = Math.floor((pty - startY) * step);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pScreenX, pScreenY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d50000';
        ctx.lineWidth = 1;
        ctx.stroke();
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

        // 0. If in START_SCREEN state: Render atmospheric runic title scene with zero gameplay blur
        if (this.gameState === 'START_SCREEN') {
            this.renderer.clear();
            this.renderer.renderTitleBackdrop(dt);
            requestAnimationFrame(this.loop.bind(this));
            return;
        }

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

        // Day/Night Cycle Progression (180s = 1 full day)
        this.dayTimer = (this.dayTimer || 0.25) + dt / 180.0;
        if (this.dayTimer >= 1.0) {
            this.dayTimer -= 1.0;
            this.currentDay = (this.currentDay || 1) + 1;
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(660, 'sine', 0.4, 0.1);
        }
        this.updateClockGauge();

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

        const isNight = (this.dayTimer >= 0.50 && this.dayTimer < 0.85);

        // Update Wildlife Critters & Friendly NPCs
        if (this.critters && this.currentMap) {
            this.critters.update(dt, this.player.pos, this.currentMap, isNight);
        }
        if (this.npcs) {
            this.npcs.update(dt, this.player.pos.x, this.player.pos.y);
        }

        // 2. Camera Update (Follow player smoothly)
        this.renderer.updateCamera(this.player.pos, this.currentMap.width, this.currentMap.height, dt);

        // 3. Render Pass
        this.renderer.clear();
        this.renderer.renderMap(this.currentMap, dt);
        this.renderer.renderEnemies(this.currentMap.enemies, this.currentMap.palette.colors);
        if (this.npcs) {
            this.renderer.renderNpcs(this.npcs.npcs, Math.round(this.renderer.camera.x), Math.round(this.renderer.camera.y), this.player.pos);
        }
        if (this.critters) {
            this.critters.render(this.renderer.ctx, Math.round(this.renderer.camera.x), Math.round(this.renderer.camera.y), isNight);
        }
        this.renderer.renderCharacter(this.player, this.currentMap.palette.colors);

        // 4. Render Day/Night Lighting Mask (Darkness + Torchlight radial aperture)
        this.renderer.renderLighting(this.dayTimer, this.player, Math.round(this.renderer.camera.x), Math.round(this.renderer.camera.y), this.currentMap);

        // 5. Render Floating Loot & Combat Texts
        this.renderer.renderFloatingTexts(Math.round(this.renderer.camera.x), Math.round(this.renderer.camera.y), dt);

        // 6. Render Cutscenes & Overlays
        this.renderer.renderDialogue(this.cutscenes);

        // 7. Render Minimap Radar during Gameplay
        if (this.screens && this.screens.currentScreen === 'GAMEPLAY') {
            this.screens.renderMinimap(this.renderer.ctx, this.canvas.width, this.canvas.height);
        }

        // 8. Update HUD metrics
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
