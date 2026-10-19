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
        this.renderer.game = this;
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
        this.isFarmerUnlocked = true;
        this.soundEnabled = true;
        this.bgmEnabled = true;
        this.sfxEnabled = true;
        this.godMode = false;
        this.hasInitializedProfile = false;
        this.activeSlotIndex = 0;
        this.pendingSlotIndex = null;
        this.saveSlots = [];
        this.dayTimer = 0.25; // 0.0 to 1.0 (0.25 = noon)
        this.currentDay = 1;
        this.harvestCount = 0;
        this.runsCount = 1;
        this.bossSlainCount = 0;
        this.coresExtractedCount = 0;

        // Image 4 Runic Hub & Meta Progression State
        this.relicKeys = 15;
        this.starTokens = 0;
        this.attendanceStreak = 1;
        this.attendanceClaimedDay = 0;
        this.achievementsClaimed = {};
        this.elevationJumpsCount = 0;
        this.combatParriesCount = 0;
        this.craftedItemsCount = 0;
        this.remainsOpenedCount = 0;
        this.discoveredBiomes = new Set(['CINDERWATCH_HAMLET']);
        this.discoveredBiomesCount = 1;

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
        this.lastModalDismissTime = 0;

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
            this.isFarmerUnlocked = saved.isFarmerUnlocked !== undefined ? saved.isFarmerUnlocked : true;
            if (saved.hasInitializedProfile) {
                this.hasInitializedProfile = true;
            }
        }

        try {
            const savedKeys = localStorage.getItem('aether_relic_keys');
            if (savedKeys !== null) this.relicKeys = parseInt(savedKeys, 10);
            const savedTokens = localStorage.getItem('aether_star_tokens');
            if (savedTokens !== null) this.starTokens = parseInt(savedTokens, 10);
            const savedAttStreak = localStorage.getItem('aether_attendance_streak');
            if (savedAttStreak !== null) this.attendanceStreak = parseInt(savedAttStreak, 10);
            const savedAttDay = localStorage.getItem('aether_attendance_claimed_day');
            if (savedAttDay !== null) this.attendanceClaimedDay = parseInt(savedAttDay, 10);
            const savedAch = localStorage.getItem('aether_achievements_claimed');
            if (savedAch) this.achievementsClaimed = JSON.parse(savedAch);
            const savedRemains = localStorage.getItem('aether_remains_opened');
            if (savedRemains !== null) this.remainsOpenedCount = parseInt(savedRemains, 10);
            const savedPity = localStorage.getItem('aether_remains_pity');
            if (savedPity !== null) this.remainsPityPoints = parseInt(savedPity, 10) || 0;
            const savedBoss = localStorage.getItem('aether_boss_slain');
            if (savedBoss !== null) this.bossSlainCount = parseInt(savedBoss, 10);
            const savedCores = localStorage.getItem('aether_cores_extracted');
            if (savedCores !== null) this.coresExtractedCount = parseInt(savedCores, 10);
            const savedJumps = localStorage.getItem('aether_elevation_jumps');
            if (savedJumps !== null) this.elevationJumpsCount = parseInt(savedJumps, 10);
            const savedParries = localStorage.getItem('aether_combat_parries');
            if (savedParries !== null) this.combatParriesCount = parseInt(savedParries, 10);
            const savedCrafts = localStorage.getItem('aether_crafted_items');
            if (savedCrafts !== null) this.craftedItemsCount = parseInt(savedCrafts, 10);
        } catch (e) {
            console.warn("Could not load hub storage:", e);
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
        this.initSettings();

        // 5. Initial State: Boot into 4-Second Alumungandr Splash Screen
        this.initSplashScreen();

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

    initSettings() {
        try {
            const savedScale = localStorage.getItem('aether_btn_scale') || '1.0';
            this.setButtonScale(savedScale);
            this.setFontMode('large');
        } catch (e) {
            console.warn("Could not load settings:", e);
        }
    }

    setButtonScale(scale) {
        this.touchButtonScale = scale;
        document.documentElement.style.setProperty('--touch-scale', String(scale));
        try {
            localStorage.setItem('aether_btn_scale', String(scale));
        } catch (e) {}
        document.querySelectorAll('.scale-choice-btn').forEach(b => {
            if (b.getAttribute('data-scale') === String(scale)) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    }

    setFontMode(mode = 'large') {
        this.fontMode = 'large';
        document.body.classList.add('font-mode-large');
        document.documentElement.classList.add('font-mode-large');
        document.documentElement.style.setProperty('--ui-font-scale', '1.25');
        try {
            localStorage.setItem('aether_font_mode', 'large');
        } catch (e) {}
        document.querySelectorAll('.font-choice-btn').forEach(b => {
            if (b.getAttribute('data-font') === 'large') {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        const previewBox = document.getElementById('font-preview-box');
        if (previewBox) {
            previewBox.innerHTML = '<span class="preview-tag">[CLEAR & LEGIBLE ACTIVE]:</span> The Living Runic Matrix is synchronized. [HP 140 / 140]';
        }
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

    closeModal(modal) {
        if (!modal) return;
        this.lastModalDismissTime = Date.now();
        modal.classList.add('hidden');
        this.updateTouchControlsVisibility();
    }

    bindTap(elem, cb) {
        if (!elem) return;
        let lastTrigger = 0;
        const trigger = (e) => {
            const now = Date.now();
            if (now - lastTrigger < 300) return;
            if (now - (this.lastModalDismissTime || 0) < 350) return;
            lastTrigger = now;
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            if (this.renderer && this.renderer.audio) this.renderer.audio.init();
            cb(e);
        };
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

        const cChrono = document.getElementById('canvas-chrono');
        if (cChrono) {
            const ctx = cChrono.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(this.renderer.sprites.getClassPreview('CHRONO_GLITCHER'), 0, 0);
            console.log("[UI CANVASES] Drew chrono preview.");
        }

        const cArchitect = document.getElementById('canvas-architect');
        if (cArchitect) {
            const ctx = cArchitect.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(this.renderer.sprites.getClassPreview('SOLARION_ARCHITECT'), 0, 0);
            console.log("[UI CANVASES] Drew architect preview.");
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

        // Hide touch controls if on START_SCREEN, SPLASH, or if any modal, start menu, or dialogue is open
        const activeModal = document.querySelector('.game-modal:not(.hidden), .gba-dialogue-capsule:not(.hidden), .dialogue-modal:not(.hidden), #gba-start-menu:not(.hidden)');
        const isModalOpen = !!activeModal;

        if (this.gameState === 'START_SCREEN' || this.gameState === 'SPLASH' || isModalOpen) {
            touchControls.classList.add('controls-hidden');
        } else {
            touchControls.classList.remove('controls-hidden');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('app-container') || document.body;
        let toast = document.getElementById('aether-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'aether-toast';
            toast.style.cssText = `
                position: absolute;
                top: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(-20px);
                background: #172230;
                border: 2px solid #00e5ff;
                border-radius: 8px;
                padding: 10px 18px;
                color: #ffffff;
                font-family: 'Press Start 2P', monospace;
                font-size: 8px;
                line-height: 1.5;
                text-align: center;
                z-index: 99999;
                pointer-events: none;
                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.8), 0 0 12px rgba(0, 229, 255, 0.4);
                opacity: 0;
                transition: opacity 0.2s, transform 0.2s;
                max-width: 85%;
                white-space: pre-line;
            `;
            container.appendChild(toast);
        }

        if (type === 'error') {
            toast.style.borderColor = '#ff5252';
            toast.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.8), 0 0 14px rgba(255, 82, 82, 0.5)';
            toast.style.color = '#ffcdd2';
        } else if (type === 'success') {
            toast.style.borderColor = '#ffd54f';
            toast.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.8), 0 0 14px rgba(255, 213, 79, 0.5)';
            toast.style.color = '#fff9c4';
        } else {
            toast.style.borderColor = '#00e5ff';
            toast.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.8), 0 0 12px rgba(0, 229, 255, 0.4)';
            toast.style.color = '#ffffff';
        }

        toast.innerHTML = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0px)';

        if (this._toastTimeout) clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
        }, 2800);
    }

    /* Randomized Dyson Sphere Trajectory on Each App Boot (User Requirement) */
    randomizeDysonSphereTrajectory() {
        const dysonActor = document.querySelector('.splash-dyson-actor');
        if (!dysonActor) return;

        // 1. Random entry sector
        const entryVariants = [
            { x: -350 - Math.random() * 50, y: -90 - Math.random() * 60, rot: -1200 - Math.random() * 360 }, // Top-left high
            { x: -360 - Math.random() * 40, y: -10 + Math.random() * 20, rot: -1080 - Math.random() * 240 }, // Direct west
            { x: -330 - Math.random() * 50, y: 80 + Math.random() * 60, rot: -980 - Math.random() * 260 },   // Bottom-left low
            { x: -160 - Math.random() * 60, y: -290 - Math.random() * 50, rot: -1140 - Math.random() * 300 } // North-west steep
        ];
        const entry = entryVariants[Math.floor(Math.random() * entryVariants.length)];

        // Hit 1 (21.5%): strikes perimeter at angle theta1 (left hemisphere 130deg - 230deg)
        const hitRadius = 42 + Math.random() * 6;
        const theta1 = (130 + Math.random() * 100) * (Math.PI / 180);
        const hit1X = Math.round(Math.cos(theta1) * hitRadius);
        const hit1Y = Math.round(Math.sin(theta1) * hitRadius);

        // Rebound 1: bounces back along reflection angle
        const reb1Dist = 80 + Math.random() * 35;
        const reb1Angle = theta1 + Math.PI + (Math.random() - 0.5) * 0.8;
        const reb1X = Math.round(Math.cos(reb1Angle) * reb1Dist);
        const reb1Y = Math.round(Math.sin(reb1Angle) * reb1Dist);

        // Hit 2 (35%): swings around and strikes opposite perimeter (upper-right 290deg - 370deg)
        const theta2 = (290 + Math.random() * 80) * (Math.PI / 180);
        const hit2X = Math.round(Math.cos(theta2) * hitRadius);
        const hit2Y = Math.round(Math.sin(theta2) * hitRadius);

        // Ricochet 2 (40%): sweeps around right flank
        const swooX = Math.round(65 + Math.random() * 30);
        const swooY = Math.round(45 + Math.random() * 25);

        // Hit 3 (48%): strikes right flank
        const theta3 = (20 + Math.random() * 80) * (Math.PI / 180);
        const hit3X = Math.round(Math.cos(theta3) * hitRadius);
        const hit3Y = Math.round(Math.sin(theta3) * hitRadius);

        // Hit 4 (60%): sweeps underneath to bottom-left
        const theta4 = (80 + Math.random() * 70) * (Math.PI / 180);
        const hit4X = Math.round(Math.cos(theta4) * hitRadius);
        const hit4Y = Math.round(Math.sin(theta4) * hitRadius);

        let styleEl = document.getElementById('dynamic-dyson-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-dyson-style';
            document.head.appendChild(styleEl);
        }

        const keyframeCss = `
            @keyframes dynamicDysonRoll {
                0% {
                    transform: translate(${Math.round(entry.x)}px, ${Math.round(entry.y)}px) rotate(${Math.round(entry.rot)}deg) scale(0.85);
                    opacity: 0;
                }
                4% {
                    opacity: 1;
                }
                16% {
                    transform: translate(${Math.round(entry.x * 0.35 + hit1X * 0.65)}px, ${Math.round(entry.y * 0.35 + hit1Y * 0.65)}px) rotate(${Math.round(entry.rot * 0.4)}deg) scale(0.96);
                }
                /* Hit 1: First massive kinetic strike */
                21.5% {
                    transform: translate(${hit1X}px, ${hit1Y}px) rotate(0deg) scale(1.08);
                }
                25% {
                    transform: translate(${reb1X}px, ${reb1Y}px) rotate(160deg) scale(0.92);
                }
                /* Hit 2: Knocks upper flank */
                35.0% {
                    transform: translate(${hit2X}px, ${hit2Y}px) rotate(420deg) scale(0.95);
                }
                40% {
                    transform: translate(${swooX}px, ${swooY}px) rotate(580deg) scale(1.02);
                }
                /* Hit 3: Ricochet strike */
                48.0% {
                    transform: translate(${hit3X}px, ${hit3Y}px) rotate(740deg) scale(1.04);
                }
                54% {
                    transform: translate(${Math.round(-hit3X * 0.7)}px, ${Math.round(-hit3Y * 0.6)}px) rotate(880deg) scale(0.97);
                }
                /* Hit 4: Under-sweep strike */
                60.0% {
                    transform: translate(${hit4X}px, ${hit4Y}px) rotate(1020deg) scale(1.05);
                }
                /* Concentric Containment Orbit Lock */
                68% {
                    transform: translate(0px, 0px) rotate(1200deg) scale(1.0);
                }
                85% {
                    transform: translate(0px, 0px) rotate(1380deg) scale(1.02);
                }
                100% {
                    transform: translate(0px, 0px) rotate(1540deg) scale(1.0);
                }
            }
        `;
        styleEl.textContent = keyframeCss;
        dysonActor.style.animation = 'dynamicDysonRoll 6.66s cubic-bezier(0.2, 0.85, 0.32, 1.05) forwards';
    }

    initSplashScreen() {
        this.gameState = 'SPLASH';
        if (this.screens) {
            this.screens.currentScreen = 'TITLE';
        }
        const splashContainer = document.getElementById('splash-screen-container');
        const startScreen = document.getElementById('start-screen-container');
        const header = document.getElementById('game-header');
        const footer = document.getElementById('game-footer');
        const touchControls = document.getElementById('touch-controls');
        const gbaMenu = document.getElementById('gba-start-menu');
        const rusticHud = document.getElementById('rustic-hud-overlay');

        if (startScreen) startScreen.classList.add('hidden');
        if (header) header.classList.add('hidden');
        if (footer) footer.classList.add('hidden');
        if (touchControls) touchControls.classList.add('controls-hidden');
        if (gbaMenu) gbaMenu.classList.add('hidden');
        if (rusticHud) rusticHud.classList.add('hidden');
        document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));

        if (!splashContainer) {
            this.setGameState('START_SCREEN');
            return;
        }

        splashContainer.classList.remove('hidden', 'fade-out');
        this.randomizeDysonSphereTrajectory();
        const fillBar = document.getElementById('splash-progress-fill');
        const statusText = document.getElementById('splash-status-text');
        const percentText = document.getElementById('splash-percent-text');

        const startTime = performance.now();
        const DURATION = 6660; // Exactly 6.66 seconds as requested

        const stages = [
            { t: 0.00, msg: 'INITIALIZING ALUMUNGANDR CORE VECTOR...' },
            { t: 0.15, msg: 'DYSON SPHERE ROLLING INTO STELLAR ORBIT...' },
            { t: 0.35, msg: 'CRITICAL KINETIC IMPACT & LOGO RESONANCE...' },
            { t: 0.55, msg: 'ORBITAL RICOCHET & CONFINEMENT HARMONICS...' },
            { t: 0.75, msg: 'CONVERGING RUNIC MONOLITH CONDUITS...' },
            { t: 0.90, msg: 'DYSON MATRIX LOCKED & STABILIZED...' },
            { t: 0.98, msg: 'EXPEDITION READY [SYSTEM ONLINE]' }
        ];

        let finished = false;
        const finishSplash = () => {
            if (finished) return;
            finished = true;
            if (fillBar) fillBar.style.width = '100%';
            if (percentText) percentText.textContent = '100%';
            if (statusText) statusText.textContent = 'EXPEDITION READY [SYSTEM ONLINE]';

            if (this.soundEnabled && this.sfxEnabled && this.renderer && this.renderer.audio) {
                this.renderer.audio.playItemObtained();
            }

            // Smooth crossfade: apply fade-out class first, then activate START_SCREEN
            splashContainer.classList.add('fade-out');
            this.setGameState('START_SCREEN');

            setTimeout(() => {
                splashContainer.classList.add('hidden');
                splashContainer.classList.remove('fade-out');
            }, 850);
        };

        const updateFrame = (now) => {
            if (finished) return;
            const elapsed = now - startTime;
            const progress = Math.min(1.0, elapsed / DURATION);

            if (fillBar) fillBar.style.width = `${Math.round(progress * 100)}%`;
            if (percentText) percentText.textContent = `${Math.round(progress * 100)}%`;

            for (let i = stages.length - 1; i >= 0; i--) {
                if (progress >= stages[i].t) {
                    if (statusText && statusText.textContent !== stages[i].msg) {
                        statusText.textContent = stages[i].msg;
                    }
                    break;
                }
            }

            if (progress >= 1.0) {
                finishSplash();
            } else {
                requestAnimationFrame(updateFrame);
            }
        };

        requestAnimationFrame(updateFrame);
        // User Requirement: No tap to skip. The cinematic Dyson sequence runs for the full 6.66 seconds.
    }

    setGameState(state) {
        this.gameState = state;
        if (this.screens) {
            this.screens.currentScreen = (state === 'START_SCREEN' || state === 'SPLASH' ? 'TITLE' : 'GAMEPLAY');
        }
        const startScreen = document.getElementById('start-screen-container');
        const header = document.getElementById('game-header');
        const footer = document.getElementById('game-footer');
        const touchControls = document.getElementById('touch-controls');

        if (state === 'SPLASH') {
            const splashScreen = document.getElementById('splash-screen-container');
            if (splashScreen) splashScreen.classList.remove('hidden', 'fade-out');
            if (startScreen) startScreen.classList.add('hidden');
            if (header) header.classList.add('hidden');
            if (footer) footer.classList.add('hidden');
            if (touchControls) touchControls.classList.add('controls-hidden');
            const gbaMenu = document.getElementById('gba-start-menu');
            if (gbaMenu) gbaMenu.classList.add('hidden');
            const rusticHud = document.getElementById('rustic-hud-overlay');
            if (rusticHud) rusticHud.classList.add('hidden');
            document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
        } else if (state === 'START_SCREEN') {
            const splashScreen = document.getElementById('splash-screen-container');
            if (splashScreen && !splashScreen.classList.contains('fade-out')) {
                splashScreen.classList.add('hidden');
            }
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

            this.updateStartCurrencies();

            if (this.renderer && this.renderer.audio && this.bgmEnabled) {
                this.renderer.audio.stopBgm();
            }
        } else if (state === 'GAMEPLAY') {
            const splashScreen = document.getElementById('splash-screen-container');
            if (splashScreen) splashScreen.classList.add('hidden');
            if (startScreen) startScreen.classList.add('hidden');
            if (header) header.classList.remove('hidden');
            if (footer) footer.classList.remove('hidden');
            if (touchControls) touchControls.classList.remove('controls-hidden');
            const rusticHud = document.getElementById('rustic-hud-overlay');
            if (rusticHud) rusticHud.classList.remove('hidden');
            document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
            if (this.soundEnabled && this.bgmEnabled) {
                let track = 'OVERWORLD';
                if (this.currentAreaId === 'SUB_BEDROCK_CORE') track = 'SUB_CORE';
                else if (this.currentAreaId === 'WHISPERING_WOODS') track = 'WHISPERING_WOODS';
                else if (this.currentAreaId === 'SUNKEN_GROTTO') track = 'SUNKEN_GROTTO';
                else if (this.currentAreaId === 'SOLARIUM_DUNES') track = 'SOLARIUM_DUNES';
                else if (this.currentAreaId === 'CELESTIAL_ZENITH') track = 'CELESTIAL_ZENITH';
                this.renderer.audio.startBgm(track);
            }
        }
    }

    updateStartCurrencies() {
        const keysVal = document.getElementById('start-keys-val');
        const coresVal = document.getElementById('start-cores-val');
        const tokensVal = document.getElementById('start-tokens-val');
        const streakBadge = document.getElementById('attendance-streak-badge');
        const pioneerRank = document.getElementById('start-pioneer-rank');
        const remainsKeys = document.getElementById('remains-keys-display');
        const shopCoins = document.getElementById('shop-coins-val');
        const shopCores = document.getElementById('shop-cores-val');
        const shopTokens = document.getElementById('shop-tokens-val');

        const curKeys = this.relicKeys !== undefined ? this.relicKeys : 15;
        const curCores = this.coresExtractedCount || 0;
        const curTokens = this.starTokens || (this.player ? Math.floor(this.player.coinsCollected / 100) : 0);
        const curCoins = this.player ? this.player.coinsCollected : 0;

        if (keysVal) keysVal.innerText = `${curKeys}/15`;
        if (coresVal) coresVal.innerText = `${curCores}`;
        if (tokensVal) tokensVal.innerText = `${curTokens}`;
        if (streakBadge) streakBadge.innerText = `DAY ${this.attendanceStreak || 1}`;
        if (pioneerRank) pioneerRank.innerText = `RANK ${Math.min(5, 1 + Math.floor(curCores / 2))}`;
        if (remainsKeys) remainsKeys.innerText = `${curKeys}/15`;
        if (shopCoins) shopCoins.innerText = `${curCoins}`;
        if (shopCores) shopCores.innerText = `${curCores}`;
        if (shopTokens) shopTokens.innerText = `${curTokens}`;

        const startTokensIcon = document.getElementById('start-tokens-icon');
        if (startTokensIcon && !startTokensIcon.querySelector('svg')) {
            startTokensIcon.innerHTML = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(14) : '🩸';
        }
        const shopTokensIcon = document.getElementById('shop-tokens-icon');
        if (shopTokensIcon && !shopTokensIcon.querySelector('svg')) {
            shopTokensIcon.innerHTML = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(16) : '🩸';
        }

        this.updateRemainsPityDisplay();
    }

    addCoins(amt) {
        if (!this.player) {
            this.player = { coinsCollected: 0 };
        }
        this.player.coinsCollected = (this.player.coinsCollected || 0) + amt;
        const wallet = document.getElementById('wallet-coins');
        if (wallet) wallet.innerText = `${this.player.coinsCollected}`;
        this.updateStartCurrencies();
    }

    setupStartScreen() {
        const btnStart = document.getElementById('btn-game-start');
        if (btnStart) {
            this.bindTap(btnStart, () => {
                this.openSaveSlotsModal();
            });
        }

        // Top currency info chips
        const keysChip = document.getElementById('start-keys-chip');
        if (keysChip) {
            this.bindTap(keysChip, () => this.openCurrencyInfo('KEYS'));
        }

        const coresChip = document.getElementById('start-cores-chip');
        if (coresChip) {
            this.bindTap(coresChip, () => this.openCurrencyInfo('CORES'));
        }

        const tokensChip = document.getElementById('start-tokens-chip');
        if (tokensChip) {
            this.bindTap(tokensChip, () => this.openCurrencyInfo('TOKENS'));
        }

        const pioneerChip = document.getElementById('start-pioneer-chip');
        if (pioneerChip) {
            this.bindTap(pioneerChip, () => this.openCurrencyInfo('PIONEER'));
        }

        const closeCurrencyInfo = document.getElementById('currency-info-close');
        if (closeCurrencyInfo) {
            this.bindTap(closeCurrencyInfo, () => {
                const modal = document.getElementById('currency-info-modal');
                if (modal) this.closeModal(modal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const tabRemains = document.getElementById('start-tab-remains');
        if (tabRemains) {
            this.bindTap(tabRemains, () => {
                this.openRemainsModal();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const tabShop = document.getElementById('start-tab-shop');
        if (tabShop) {
            this.bindTap(tabShop, () => {
                this.openShopModal();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const tabAchievements = document.getElementById('start-tab-achievements');
        if (tabAchievements) {
            this.bindTap(tabAchievements, () => {
                this.openAchievementsModal();
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

        const btnAttendance = document.getElementById('btn-attendance');
        if (btnAttendance) {
            this.bindTap(btnAttendance, () => {
                this.openAttendanceModal();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        // Title Screen Interactive Tap Listener (6 Holding Points & Persistent Save Stars)
        const handleTitleTap = (e) => {
            if (e.target && (e.target.closest('button') || e.target.closest('.clickable-chip') || e.target.closest('.modal-content'))) {
                return;
            }

            if (!this.canvas || !this.renderer) return;
            const rect = this.canvas.getBoundingClientRect();
            const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : (e.clientX !== undefined ? e.clientX : (e.pageX || 0));
            const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : (e.clientY !== undefined ? e.clientY : (e.pageY || 0));
            if (clientX === undefined || clientY === undefined) return;

            // Scale to internal canvas coordinates
            const scaleX = (this.renderer.width || 480) / rect.width;
            const scaleY = (this.renderer.height || 320) / rect.height;
            const canvasX = (clientX - rect.left) * scaleX;
            const canvasY = (clientY - rect.top) * scaleY;

            // 1. Check 6 Holding Points on Title Screen
            const pts = this.renderer.holdingPointPositions || [];
            for (const pt of pts) {
                const dist = Math.hypot(canvasX - pt.x, canvasY - pt.y);
                if (dist < (pt.radius || 24)) {
                    this.handleHoldingPointTap(pt);
                    return;
                }
            }

            // 2. Check Persistent Save Stars in Sky
            const stars = this.renderer.saveStarPositions || [];
            for (const st of stars) {
                const sDist = Math.hypot(canvasX - st.x, canvasY - st.y);
                if (sDist < 42) {
                    this.showSaveStarInfo(st);
                    return;
                }
            }
        };

        const startScreen = document.getElementById('start-screen-container');
        if (startScreen) {
            this.bindTap(startScreen, handleTitleTap);
        }

        // Modal Close Handlers
        const closeRemains = document.getElementById('remains-close');
        if (closeRemains) {
            this.bindTap(closeRemains, () => {
                const modal = document.getElementById('remains-modal');
                if (modal) this.closeModal(modal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const closeShop = document.getElementById('shop-close');
        if (closeShop) {
            this.bindTap(closeShop, () => {
                const modal = document.getElementById('shop-modal');
                if (modal) this.closeModal(modal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const closeAttendance = document.getElementById('attendance-close');
        if (closeAttendance) {
            this.bindTap(closeAttendance, () => {
                const modal = document.getElementById('attendance-modal');
                if (modal) this.closeModal(modal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const closeAchievements = document.getElementById('achievements-close');
        if (closeAchievements) {
            this.bindTap(closeAchievements, () => {
                const modal = document.getElementById('achievements-modal');
                if (modal) this.closeModal(modal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        // Wire Relic Chest Open Buttons & Alt Token Buttons
        document.querySelectorAll('.relic-open-btn, .relic-alt-btn').forEach(btn => {
            this.bindTap(btn, () => {
                const tier = btn.getAttribute('data-chest');
                this.handleOpenRemains(tier);
            });
        });

        // Wire Claim Remains Loot
        const btnClaimRemains = document.getElementById('btn-claim-remains');
        if (btnClaimRemains) {
            this.bindTap(btnClaimRemains, () => {
                this.claimRemainsLoot();
            });
        }

        // Wire Claim Attendance
        const btnClaimAttendance = document.getElementById('btn-claim-attendance');
        if (btnClaimAttendance) {
            this.bindTap(btnClaimAttendance, () => {
                this.claimAttendanceReward();
            });
        }

        this.updateStartCurrencies();
    }

    /* ==========================================================================
       CURRENCY & SYSTEM INFO MODAL (TITLE SCREEN BADGES)
       ========================================================================== */
    openCurrencyInfo(type) {
        const modal = document.getElementById('currency-info-modal');
        if (!modal) return;
        const titleEl = document.getElementById('currency-info-title');
        const iconEl = document.getElementById('currency-info-icon');
        const headlineEl = document.getElementById('currency-info-headline');
        const descEl = document.getElementById('currency-info-desc');
        const labelEl = document.getElementById('currency-info-label');
        const valEl = document.getElementById('currency-info-val');

        const curKeys = this.relicKeys !== undefined ? this.relicKeys : 15;
        const curCores = this.coresExtractedCount || 0;
        const curTokens = this.starTokens || (this.player ? Math.floor(this.player.coinsCollected / 100) : 0);

        if (type === 'KEYS') {
            if (titleEl) titleEl.innerText = '🗝️ KEYS OF AWAKENING';
            if (iconEl) iconEl.innerText = '🗝️';
            if (headlineEl) headlineEl.innerText = 'Sacred Reliquary Keystones';
            if (descEl) descEl.innerText = 'Used to unlock Weathered Urns, Runic Coffers, and Celestial Vaults in the Open Remains vault. Keys replenish naturally (1 every 20 mins, max 15) or drop from dungeon exploration and daily attendance.';
            if (labelEl) labelEl.innerText = 'CURRENT KEYS:';
            if (valEl) valEl.innerText = `${curKeys} / 15`;
        } else if (type === 'CORES') {
            if (titleEl) titleEl.innerText = '☥ ANCIENT DYSON CORES';
            if (iconEl) iconEl.innerText = '☥';
            if (headlineEl) headlineEl.innerText = 'Sub-Bedrock Stellar Power Sources';
            if (descEl) descEl.innerText = 'High-density quantum batteries extracted from the Sub-Bedrock Core reactor. Used to forge legendary end-game artifacts and unlock permanent pioneer awakenings.';
            if (labelEl) labelEl.innerText = 'CORES HARVESTED:';
            if (valEl) valEl.innerText = `${curCores}`;
        } else if (type === 'TOKENS') {
            if (titleEl) titleEl.innerText = '🩸 BLOOD CURRENCY';
            if (iconEl) {
                iconEl.innerHTML = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(32) : '🩸';
            }
            if (headlineEl) headlineEl.innerText = 'Sacred Erythrocyte Essence';
            if (descEl) descEl.innerText = 'Transcendence currency containing microscopic erythrocyte organelles and vital cellular lifeforce. Earned from milestones, relic unboxing, and daily attendance. Spend in the Bazaar for permanent boons and cross-skill augmentations.';
            if (labelEl) labelEl.innerText = 'BLOOD ESSENCE:';
            if (valEl) valEl.innerText = `${curTokens}`;
        } else if (type === 'PIONEER') {
            const rank = Math.min(5, 1 + Math.floor(curCores / 2));
            if (titleEl) titleEl.innerText = `🎖️ PIONEER RANK ${rank}`;
            if (iconEl) iconEl.innerText = '🎖️';
            if (headlineEl) headlineEl.innerText = 'Expeditionary Honor & Tier Perks';
            if (descEl) descEl.innerText = `Rank ${rank} Pioneer Status. Grants permanent passive enhancements: Rank I (+5% scavenging yield), Rank II (+15 Max HP), Rank III (+25% parry window), Rank IV (+10% move speed), Rank V (Ascended Godhood). Earn higher ranks by surviving more days and extracting Genesis Cores!`;
            if (labelEl) labelEl.innerText = 'PIONEER TIER:';
            if (valEl) valEl.innerText = `RANK ${rank} (EXPEDITION LEVEL ${rank * 3})`;
        }

        modal.classList.remove('hidden');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
    }

    /* ==========================================================================
       6 TITLE SCREEN HOLDING POINTS & DAILY CONSECUTIVE ACCUMULATION (USER REQ)
       ========================================================================== */
    getDailyHoldingState() {
        let streak = 1;
        let claimedDays = [];
        let lastDate = null;
        try {
            const rawStreak = localStorage.getItem('aether_daily_holding_streak');
            if (rawStreak !== null) streak = parseInt(rawStreak, 10) || 1;
            const rawClaimed = localStorage.getItem('aether_daily_holding_claimed');
            if (rawClaimed) claimedDays = JSON.parse(rawClaimed) || [];
            lastDate = localStorage.getItem('aether_daily_holding_last_date');
        } catch (e) {
            console.warn("Could not read daily holding storage:", e);
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (!lastDate) {
            streak = 1;
            claimedDays = [];
            lastDate = todayStr;
            try {
                localStorage.setItem('aether_daily_holding_streak', streak);
                localStorage.setItem('aether_daily_holding_claimed', JSON.stringify(claimedDays));
                localStorage.setItem('aether_daily_holding_last_date', lastDate);
            } catch (e) {}
        } else if (lastDate !== todayStr) {
            const prev = new Date(lastDate);
            const curr = new Date(todayStr);
            const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Next day opened: add one remain to holding points up to 6th day
                if (streak < 6) {
                    streak += 1;
                } else {
                    // Past 6th day or uncollected: resets and always starts from 0 (day 1)
                    streak = 1;
                    claimedDays = [];
                }
            } else if (diffDays > 1) {
                // Missed days: resets and starts from 0 to get to 6
                streak = 1;
                claimedDays = [];
            }
            lastDate = todayStr;
            try {
                localStorage.setItem('aether_daily_holding_streak', streak);
                localStorage.setItem('aether_daily_holding_claimed', JSON.stringify(claimedDays));
                localStorage.setItem('aether_daily_holding_last_date', lastDate);
            } catch (e) {}
        }

        return { currentDay: streak, claimedDays };
    }

    handleHoldingPointTap(pt) {
        if (!pt) return;
        const state = this.getDailyHoldingState();
        if (!pt.isUnlocked) {
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(180, 'sawtooth', 0.2, 0.1);
            this.showToast(`🔒 Day ${pt.day} Celestial Orb awakens tomorrow! (Streak: Day ${state.currentDay}/6)`, 'info');
            return;
        }

        if (pt.isClaimed || state.claimedDays.includes(pt.day)) {
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(280, 'sine', 0.15, 0.08);
            this.showToast(`✓ Day ${pt.day} Celestial Orb already collected for this cycle!`, 'info');
            return;
        }

        this.claimDailyHoldingRemain(pt.day, pt.type);
    }

    claimDailyHoldingRemain(day, type) {
        const state = this.getDailyHoldingState();
        if (state.claimedDays.includes(day)) return;

        state.claimedDays.push(day);
        try {
            localStorage.setItem('aether_daily_holding_claimed', JSON.stringify(state.claimedDays));
        } catch (e) {}

        const rewardNames = [];
        let coins = 75;
        let keys = 2;
        let cores = 0;
        let tokens = 0;

        const dropIcon = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(12) : '🩸';
        if (day === 1) {
            coins = 75;
            keys = 2;
            rewardNames.push(`${dropIcon} 75`, "2 🗝️ Keys", "5 🍞 Bread");
            if (this.player && this.player.inventory) this.player.inventory.addItem('BREAD', 5);
            if (this.inventory) this.inventory.addItem('BREAD', 5);
        } else if (day === 2) {
            coins = 150;
            keys = 2;
            cores = 1;
            rewardNames.push(`${dropIcon} 150`, "2 🗝️ Keys", "1 ☥ Dyson Core", "2 🧪 Salves");
            if (this.player && this.player.inventory) this.player.inventory.addItem('ENERGY_SALVE', 2);
            if (this.inventory) this.inventory.addItem('ENERGY_SALVE', 2);
        } else if (day === 3) {
            coins = 220;
            keys = 3;
            tokens = 2;
            rewardNames.push(`${dropIcon} 220`, "3 🗝️ Keys", "2 Blood Essence", "2 ⚡ Conduits");
            if (this.player && this.player.inventory) this.player.inventory.addItem('ANCIENT_CONDUIT', 2);
            if (this.inventory) this.inventory.addItem('ANCIENT_CONDUIT', 2);
        } else if (day === 4) {
            coins = 300;
            keys = 3;
            cores = 2;
            tokens = 2;
            rewardNames.push(`${dropIcon} 300`, "3 🗝️ Keys", "2 ☥ Cores", "2 Blood Essence", "1 ✨ Master Elixir");
            if (this.player && this.player.inventory) this.player.inventory.addItem('SUPER_SALVE', 1);
            if (this.inventory) this.inventory.addItem('SUPER_SALVE', 1);
        } else if (day === 5) {
            coins = 450;
            keys = 4;
            cores = 2;
            tokens = 3;
            rewardNames.push(`${dropIcon} 450`, "4 🗝️ Keys", "2 ☥ Cores", "3 Blood Essence", "3 🪨 Titanium");
            if (this.player && this.player.inventory) this.player.inventory.addItem('TITANIUM_ORE', 3);
            if (this.inventory) this.inventory.addItem('TITANIUM_ORE', 3);
        } else if (day === 6) {
            coins = 600;
            keys = 5;
            cores = 3;
            tokens = 5;
            rewardNames.push(`${dropIcon} 600`, "5 🗝️ Keys", "3 ☥ Cores", "5 Blood Essence", "1 🌌 Primordial Ambrosia [T6]");
            if (this.player && this.player.inventory) {
                this.player.inventory.addItem('SUPER_SALVE', 3);
                this.player.inventory.addItem('PRIMORDIAL_AMBROSIA', 1);
            }
            if (this.inventory) {
                this.inventory.addItem('SUPER_SALVE', 3);
                this.inventory.addItem('PRIMORDIAL_AMBROSIA', 1);
            }
        }

        this.addCoins(coins);
        this.relicKeys = Math.min(15, (this.relicKeys || 15) + keys);
        if (cores > 0) this.coresExtractedCount = (this.coresExtractedCount || 0) + cores;
        if (tokens > 0) this.starTokens = (this.starTokens || 0) + tokens;

        try {
            localStorage.setItem('aether_relic_keys', this.relicKeys);
            localStorage.setItem('aether_cores_extracted', this.coresExtractedCount || 0);
            localStorage.setItem('aether_star_tokens', this.starTokens || 0);
        } catch (e) {}

        if (this.soundEnabled && this.sfxEnabled) {
            this.renderer.audio.playItemObtained();
        }

        const orbTitle = (type || 'ASTRAL').toUpperCase();
        this.showToast(`✨ DAY ${day} ${orbTitle} CELESTIAL ORB CLAIMED!\n${rewardNames.join(' • ')}`, 'success');
        this.updateStartCurrencies();

        if (state.claimedDays.length >= 6) {
            setTimeout(() => {
                this.showToast(`🌟 ALL 6 CELESTIAL ORBS COLLECTED! The Astral Altar will reset on your next day cycle.`, 'success');
            }, 3000);
        }
    }

    showSaveStarInfo(st) {
        if (!st) return;
        const slot = (this.saveSlots && this.saveSlots[st.index]) ? this.saveSlots[st.index] : null;
        if (this.soundEnabled && this.sfxEnabled) {
            this.renderer.audio.playTone(587.33, 'triangle', 0.25, 0.12);
        }

        if (slot) {
            const pioneerName = slot.pioneerName || 'PIONEER';
            const cls = (slot.selectedClass || 'WARRIOR').replace('_', ' ');
            const day = slot.currentDay || 1;
            const gold = slot.coins || 0;
            const drop = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(12) : '';
            this.showToast(`★ SAVE STAR 0${st.index + 1}: ${pioneerName}\n${cls} • Day ${day} • ${drop} ${gold}\n(Tap SAVE SLOTS to load expedition)`, 'info');
        } else {
            this.showToast(`★ SAVE STAR 0${st.index + 1}: Uncharted Star\n(Tap SAVE SLOTS to embark on a new expedition)`, 'info');
        }
    }

    /* ==========================================================================
       OPEN REMAINS / CELESTIAL RELIQUARY & PITY CONVERGENCE (USER REQ)
       ========================================================================== */
    updateRemainsPityDisplay() {
        const pityVal = document.getElementById('remains-pity-val');
        const pityFill = document.getElementById('remains-pity-fill');
        const pts = this.remainsPityPoints || 0;
        if (pityVal) pityVal.innerText = `${pts} / 100 PT`;
        if (pityFill) pityFill.style.width = `${Math.min(100, pts)}%`;
    }

    openRemainsModal() {
        const modal = document.getElementById('remains-modal');
        if (!modal) return;
        const rewardDisplay = document.getElementById('remains-reward-display');
        if (rewardDisplay) rewardDisplay.classList.add('hidden');
        this.updateStartCurrencies();
        this.updateRemainsPityDisplay();
        modal.classList.remove('hidden');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
    }

    handleOpenRemains(tier) {
        let keyCost = 0;
        let tokenCost = 0;
        let addedPity = 10;
        let orbName = 'Astral Vapor Sphere';

        if (tier === 'common') {
            keyCost = 1;
            addedPity = 10;
            orbName = 'Astral Vapor Sphere';
        } else if (tier === 'runic') {
            keyCost = 2;
            addedPity = 25;
            orbName = 'Resonant Nebula Orb';
        } else if (tier === 'runic-tokens') {
            tokenCost = 30;
            addedPity = 25;
            orbName = 'Resonant Nebula Orb';
        } else if (tier === 'celestial') {
            keyCost = 3;
            addedPity = 50;
            orbName = 'Primordial Singularity Orb';
        } else if (tier === 'celestial-tokens') {
            tokenCost = 300;
            addedPity = 50;
            orbName = 'Primordial Singularity Orb';
        }

        // Validate Key Cost
        if (keyCost > 0) {
            const curKeys = this.relicKeys !== undefined ? this.relicKeys : 15;
            if (curKeys < keyCost) {
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(130, 'sawtooth', 0.2, 0.1);
                this.showToast(`Not enough keys! Need ${keyCost} 🗝️ keys.`, 'error');
                return;
            }
            this.relicKeys = curKeys - keyCost;
        }

        // Validate Token Cost
        if (tokenCost > 0) {
            const curTokens = this.starTokens || 0;
            if (curTokens < tokenCost) {
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(130, 'sawtooth', 0.2, 0.1);
                this.showToast(`Not enough Blood Essence! Need ${tokenCost} Blood Essence.`, 'error');
                return;
            }
            this.starTokens = curTokens - tokenCost;
        }

        this.remainsOpenedCount = (this.remainsOpenedCount || 0) + 1;
        this.remainsPityPoints = (this.remainsPityPoints || 0) + addedPity;
        let triggeredConvergence = false;

        // Guaranteed Mythic Resonance Convergence at 100 pt
        if (this.remainsPityPoints >= 100) {
            triggeredConvergence = true;
            this.remainsPityPoints = this.remainsPityPoints % 100;
        }

        try {
            localStorage.setItem('aether_relic_keys', this.relicKeys);
            localStorage.setItem('aether_star_tokens', this.starTokens || 0);
            localStorage.setItem('aether_remains_opened', this.remainsOpenedCount);
            localStorage.setItem('aether_remains_pity', this.remainsPityPoints);
        } catch (e) {}

        // Roll Rich Non-Copyright Relic Rewards
        const loot = [];
        const bloodDropIcon = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(20) : '🩸';
        if (tier === 'common') {
            const coins = 40 + Math.floor(Math.random() * 35);
            loot.push({ type: 'coins', name: '', icon: bloodDropIcon, qty: coins });
            loot.push({ type: 'item', id: 'BREAD', name: 'Field Provisions', icon: '🍞', qty: 3 });
            loot.push({ type: 'item', id: 'COPPER_ORE', name: 'Copper Shards', icon: '🪨', qty: 4 });
            if (Math.random() < 0.25) {
                loot.push({ type: 'keys', name: 'Astral Key Refund', icon: '🗝️', qty: 1 });
            }
        } else if (tier === 'runic' || tier === 'runic-tokens') {
            const coins = 120 + Math.floor(Math.random() * 80);
            loot.push({ type: 'coins', name: '', icon: bloodDropIcon, qty: coins });
            loot.push({ type: 'item', id: 'ENERGY_SALVE', name: 'Energy Salve', icon: '🧪', qty: 2 });
            loot.push({ type: 'item', id: 'ANCIENT_CONDUIT', name: 'Matrix Conduits', icon: '⚡', qty: 2 });
            if (Math.random() < 0.35) {
                loot.push({ type: 'item', id: 'CHRONO_STASIS_ELIXIR', name: 'Chrono-Stasis Elixir [T4]', icon: '⏳', qty: 1 });
            }
            if (Math.random() < 0.65) {
                loot.push({ type: 'cores', name: 'Ancient Dyson Core', icon: '☥', qty: 1 });
            }
            if (Math.random() < 0.40) {
                loot.push({ type: 'tokens', name: 'Blood Essence', icon: bloodDropIcon, qty: 1 });
            }
        } else { // celestial or celestial-tokens
            const coins = 300 + Math.floor(Math.random() * 150);
            loot.push({ type: 'coins', name: '', icon: bloodDropIcon, qty: coins });
            loot.push({ type: 'cores', name: 'Quantum Dyson Core', icon: '☥', qty: 1 + (Math.random() < 0.5 ? 1 : 0) });
            loot.push({ type: 'tokens', name: 'Blood Essence', icon: bloodDropIcon, qty: 2 });
            loot.push({ type: 'item', id: 'PRIMORDIAL_AMBROSIA', name: 'Primordial Ambrosia [T6]', icon: '🌌', qty: 1 });
            loot.push({ type: 'item', id: 'TITANIUM_ORE', name: 'Singularity Ingot', icon: '💠', qty: 2 });
            // Top Tier VI weapons and armor in celestial remains
            if (Math.random() < 0.50) {
                loot.push({ type: 'item', id: 'PRIMORDIAL_VOID_SCYTHE', name: 'Primordial Void Scythe [T6]', icon: '⚡', qty: 1 });
            } else {
                loot.push({ type: 'item', id: 'GENESIS_STARMANTLE', name: 'Genesis Starmantle [T6]', icon: '👘', qty: 1 });
            }
        }

        // Add Resonance Convergence Bonus if reached
        if (triggeredConvergence) {
            loot.unshift({
                type: 'mythic_bonus',
                name: '⚡ 100 PT RESONANCE BONUS',
                icon: '👑',
                qty: 1
            });
            loot.push({ type: 'item', id: 'PRIMORDIAL_CORE', name: 'Primordial Void Core [T6]', icon: '🌀', qty: 1 });
            this.showToast('⚡ RESONANCE CONVERGENCE (100 PT) TRIGGERED! Guaranteed Mythic Relic unsealed!', 'success');
        }

        this.pendingRemainsLoot = loot;

        // Render Rewards Modal
        const container = document.getElementById('remains-reward-items');
        if (container) {
            container.innerHTML = '';
            for (const item of loot) {
                const card = document.createElement('div');
                card.className = 'reward-item-card';
                card.innerHTML = `
                    <div class="rw-icon">${item.icon}</div>
                    <div class="rw-name">${item.name}</div>
                    <div class="rw-qty">+${item.qty}</div>
                `;
                container.appendChild(card);
            }
        }

        const rewardDisplay = document.getElementById('remains-reward-display');
        if (rewardDisplay) rewardDisplay.classList.remove('hidden');

        if (this.soundEnabled && this.sfxEnabled) {
            this.renderer.audio.playCoinCollect();
        }
        this.updateStartCurrencies();
        this.updateRemainsPityDisplay();
    }

    claimRemainsLoot() {
        if (!this.pendingRemainsLoot) return;
        let count = 0;
        for (const item of this.pendingRemainsLoot) {
            count++;
            if (item.type === 'coins') {
                this.addCoins(item.qty);
            } else if (item.type === 'keys') {
                this.relicKeys = Math.min(15, (this.relicKeys || 15) + item.qty);
                try { localStorage.setItem('aether_relic_keys', this.relicKeys); } catch (e) {}
            } else if (item.type === 'cores') {
                this.coresExtractedCount = (this.coresExtractedCount || 0) + item.qty;
                try { localStorage.setItem('aether_cores_extracted', this.coresExtractedCount); } catch (e) {}
            } else if (item.type === 'tokens') {
                this.starTokens = (this.starTokens || 0) + item.qty;
                try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {}
            } else if (item.type === 'mythic_bonus') {
                this.addCoins(300);
                this.coresExtractedCount = (this.coresExtractedCount || 0) + 1;
                this.starTokens = (this.starTokens || 0) + 2;
                try {
                    localStorage.setItem('aether_cores_extracted', this.coresExtractedCount);
                    localStorage.setItem('aether_star_tokens', this.starTokens);
                } catch (e) {}
            } else if (item.type === 'item') {
                if (this.player && this.player.inventory) {
                    this.player.inventory.addItem(item.id, item.qty);
                }
                if (this.inventory) {
                    this.inventory.addItem(item.id, item.qty);
                }
            }
        }
        this.pendingRemainsLoot = null;
        const rewardDisplay = document.getElementById('remains-reward-display');
        if (rewardDisplay) rewardDisplay.classList.add('hidden');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
        this.showToast(`✨ Collected ${count} relic treasures!`, 'success');
        this.updateStartCurrencies();
        this.updateRemainsPityDisplay();
    }

    /* ==========================================================================
       STAR MATRIX BAZAAR & OUTPOST SHOP (IMAGE 4)
       ========================================================================== */
    openShopModal() {
        const modal = document.getElementById('shop-modal');
        if (!modal) return;
        this.renderShopItems();
        this.updateStartCurrencies();
        modal.classList.remove('hidden');
    }

    getShopCatalog() {
        const bloodDrop = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(16) : '🩸';
        return [
            { key: 'provisions', name: 'Field Provisions (x3)', desc: 'Maeve\'s fresh baked bread. Restores 60 HP.', icon: '🍞', costCoins: 25 },
            { key: 'energy_salve', name: 'Energy Salve (x2)', desc: 'Synthesized herbal ointment. Restores 70 Energy.', icon: '🧪', costCoins: 40 },
            { key: 'torches', name: 'Illumination Torches (x5)', desc: 'Phosphor sticks to light dark subterranean grottos.', icon: '🔥', costCoins: 30 },
            { key: 'deflect_charm', name: 'Nine Sols Deflector', desc: 'Permanent boon: Increases parry window by 25%.', icon: '🛡️', costCoins: 120 },
            { key: 'dash_booster', name: 'Kinetic Dash Booster', desc: 'Permanent boon: Reduces dash cooldown by 25%.', icon: '⚡', costCoins: 150 },
            { key: 'dyson_core', name: 'Ancient Dyson Core', desc: 'Quantum cell needed for high-tier relic activation.', icon: '☥', costCoins: 250 },
            { key: 'star_token', name: 'Blood Essence Phial', desc: 'Concentrated erythrocyte currency for deific character boons.', icon: bloodDrop, costCoins: 500 },
            { key: 'vitality_boon', name: 'Vitality Matrix Boon', desc: 'Permanent blessing: +25 Max Health.', icon: '💖', costTokens: 2 },
            { key: 'aether_surge', name: 'Aether Surge Boon', desc: 'Permanent blessing: +20 Max Energy.', icon: '🌀', costTokens: 2 }
        ];
    }

    renderShopItems() {
        const container = document.getElementById('shop-items-container');
        if (!container) return;
        container.innerHTML = '';
        const catalog = this.getShopCatalog();

        for (const item of catalog) {
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            const bloodDrop = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(13) : '';
            const costStr = item.costTokens ? `${bloodDrop} ${item.costTokens} Essence` : `${bloodDrop} ${item.costCoins}`;

            card.innerHTML = `
                <div class="shop-item-left">
                    <div class="shop-item-icon">${item.icon}</div>
                    <div class="shop-item-details">
                        <div class="shop-item-name">${item.name}</div>
                        <div class="shop-item-desc">${item.desc}</div>
                    </div>
                </div>
                <button class="shop-item-buy-btn" data-key="${item.key}">BUY (${costStr})</button>
            `;
            container.appendChild(card);
        }

        container.querySelectorAll('.shop-item-buy-btn').forEach(btn => {
            this.bindTap(btn, () => {
                const key = btn.getAttribute('data-key');
                this.buyShopItem(key);
            });
        });
    }

    buyShopItem(key) {
        const catalog = this.getShopCatalog();
        const item = catalog.find(i => i.key === key);
        if (!item) return;

        const playerCoins = this.player ? this.player.coinsCollected : 0;
        const playerTokens = this.starTokens || 0;

        if (item.costCoins) {
            if (playerCoins < item.costCoins) {
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(130, 'sawtooth', 0.15, 0.1);
                const drop = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(12) : '';
                this.showToast(`Insufficient balance! Need ${drop} ${item.costCoins}`, 'error');
                return;
            }
            this.player.coinsCollected -= item.costCoins;
        } else if (item.costTokens) {
            if (playerTokens < item.costTokens) {
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playTone(130, 'sawtooth', 0.15, 0.1);
                this.showToast(`Insufficient Blood Essence! Need ${item.costTokens} Blood Essence.`, 'error');
                return;
            }
            this.starTokens -= item.costTokens;
            try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {}
        }

        // Apply item purchase
        if (key === 'provisions' && this.player && this.player.inventory) {
            this.player.inventory.addItem('BREAD', 3);
        } else if (key === 'energy_salve' && this.player && this.player.inventory) {
            this.player.inventory.addItem('ENERGY_SALVE', 2);
        } else if (key === 'torches' && this.player && this.player.inventory) {
            this.player.inventory.addItem('TORCH', 5);
        } else if (key === 'deflect_charm') {
            if (this.player) this.player.parryWindowMultiplier = 1.25;
        } else if (key === 'dash_booster') {
            if (this.player) this.player.dashCooldownMultiplier = 0.75;
        } else if (key === 'dyson_core') {
            this.coresExtractedCount = (this.coresExtractedCount || 0) + 1;
        } else if (key === 'star_token') {
            this.starTokens = (this.starTokens || 0) + 1;
            try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {}
        } else if (key === 'vitality_boon') {
            if (this.player) {
                this.player.maxHp += 25;
                this.player.hp += 25;
            }
        } else if (key === 'aether_surge') {
            if (this.player) {
                this.player.maxEnergy += 20;
                this.player.energy += 20;
            }
        }

        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoinCollect();
        this.updateStartCurrencies();
        this.renderShopItems();
    }

    /* ==========================================================================
       7-DAY ATTENDANCE REWARDS (IMAGE 4)
       ========================================================================== */
    openAttendanceModal() {
        const modal = document.getElementById('attendance-modal');
        if (!modal) return;
        this.renderAttendanceDays();
        this.updateStartCurrencies();
        modal.classList.remove('hidden');
    }

    renderAttendanceDays() {
        const grid = document.getElementById('attendance-days-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const dropIcon = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(22) : '🩸';
        const days = [
            { day: 1, name: '+50', icon: dropIcon },
            { day: 2, name: '1 Dyson Core', icon: '☥' },
            { day: 3, name: '3 Keys', icon: '🗝️' },
            { day: 4, name: '+120', icon: dropIcon },
            { day: 5, name: '2 Blood Essence', icon: dropIcon },
            { day: 6, name: 'Master Salve', icon: '🧪' },
            { day: 7, name: 'Matrix Coffer', icon: '👑' }
        ];

        const streak = this.attendanceStreak || 1;
        const claimedDay = this.attendanceClaimedDay || 0;

        for (const d of days) {
            const card = document.createElement('div');
            let statusClass = 'locked';
            let statusText = 'LOCKED';

            if (d.day < streak || (d.day === streak && claimedDay >= streak)) {
                statusClass = 'claimed';
                statusText = 'CLAIMED ✓';
            } else if (d.day === streak && claimedDay < streak) {
                statusClass = 'active-day';
                statusText = 'READY!';
            }

            card.className = `att-day-card ${statusClass}`;
            card.innerHTML = `
                <div class="att-day-title">DAY ${d.day}</div>
                <div class="att-day-icon">${d.icon}</div>
                <div class="att-day-reward">${d.name}</div>
                <div class="att-day-status">${statusText}</div>
            `;
            grid.appendChild(card);
        }

        const claimBtn = document.getElementById('btn-claim-attendance');
        if (claimBtn) {
            if (claimedDay >= streak) {
                claimBtn.innerText = 'REWARD CLAIMED (COME BACK TOMORROW)';
                claimBtn.disabled = true;
                claimBtn.style.opacity = '0.6';
            } else {
                claimBtn.innerText = `CLAIM TODAY'S REWARD (DAY ${streak})`;
                claimBtn.disabled = false;
                claimBtn.style.opacity = '1';
            }
        }
    }

    claimAttendanceReward() {
        const streak = this.attendanceStreak || 1;
        if (this.attendanceClaimedDay >= streak) return;

        if (streak === 1) this.addCoins(50);
        else if (streak === 2) this.coresExtractedCount = (this.coresExtractedCount || 0) + 1;
        else if (streak === 3) {
            this.relicKeys = Math.min(15, (this.relicKeys || 15) + 3);
            try { localStorage.setItem('aether_relic_keys', this.relicKeys); } catch (e) {}
        }
        else if (streak === 4) this.addCoins(120);
        else if (streak === 5) {
            this.starTokens = (this.starTokens || 0) + 2;
            try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {}
        }
        else if (streak === 6) {
            if (this.player && this.player.inventory) this.player.inventory.addItem('SUPER_SALVE', 1);
        }
        else if (streak === 7) {
            this.addCoins(300);
            this.coresExtractedCount = (this.coresExtractedCount || 0) + 2;
            this.starTokens = (this.starTokens || 0) + 1;
            try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {}
        }

        this.attendanceClaimedDay = streak;
        try {
            localStorage.setItem('aether_attendance_claimed_day', this.attendanceClaimedDay);
            localStorage.setItem('aether_attendance_streak', this.attendanceStreak);
        } catch (e) {}

        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
        this.renderAttendanceDays();
        this.updateStartCurrencies();
    }

    /* ==========================================================================
       MILESTONES & ACHIEVEMENTS (IMAGE 4)
       ========================================================================== */
    getAchievementsList() {
        const drop = typeof getBloodDropSvg === 'function' ? getBloodDropSvg(13) : '';
        return [
            {
                id: 'pioneer_awaken',
                title: 'Pioneer Awakening',
                desc: 'Deploy into the Aether-Core network and establish neural link.',
                icon: '⚡',
                target: 1,
                current: () => (this.player ? 1 : 0),
                rewardText: `${drop} +50`,
                reward: () => this.addCoins(50)
            },
            {
                id: 'elevation_pathfinder',
                title: 'Elevation Pathfinder',
                desc: 'Leap across elevation tiers using [JMP] / [SPACE].',
                icon: '🧗',
                target: 3,
                current: () => (this.elevationJumpsCount || 0),
                rewardText: `${drop} +100, 1 Core`,
                reward: () => { 
                    this.addCoins(100); 
                    this.coresExtractedCount = (this.coresExtractedCount || 0) + 1;
                    try { localStorage.setItem('aether_cores_extracted', this.coresExtractedCount); } catch (e) {}
                }
            },
            {
                id: 'nine_sols_master',
                title: 'Nine Sols Deflector',
                desc: 'Execute precision deflects with [B] parry timing.',
                icon: '🛡️',
                target: 3,
                current: () => (this.combatParriesCount || 0),
                rewardText: `${drop} +150, 1 Token`,
                reward: () => { this.addCoins(150); this.starTokens = (this.starTokens || 0) + 1; try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {} }
            },
            {
                id: 'master_artisan',
                title: 'Master Artisan',
                desc: 'Craft survival tools or elixirs at the anvil workbench.',
                icon: '🔨',
                target: 3,
                current: () => (this.craftedItemsCount || 0),
                rewardText: `${drop} +80`,
                reward: () => this.addCoins(80)
            },
            {
                id: 'relic_hunter',
                title: 'Relic Archaeologist',
                desc: 'Unbox an Ancient Reliquary at the Runic Monolith.',
                icon: '⚱️',
                target: 1,
                current: () => (this.remainsOpenedCount || 0),
                rewardText: `${drop} +100, 1 Core`,
                reward: () => { 
                    this.addCoins(100); 
                    this.coresExtractedCount = (this.coresExtractedCount || 0) + 1;
                    try { localStorage.setItem('aether_cores_extracted', this.coresExtractedCount); } catch (e) {}
                }
            },
            {
                id: 'world_cartographer',
                title: 'World Cartographer',
                desc: 'Discover multiple biomes across the procedural planet.',
                icon: '🗺️',
                target: 2,
                current: () => (this.discoveredBiomesCount || 1),
                rewardText: `${drop} +120`,
                reward: () => this.addCoins(120)
            },
            {
                id: 'dyson_capitalist',
                title: 'Pioneer Reserve',
                desc: 'Accumulate 300+ in your Pioneer wallet.',
                icon: typeof getBloodDropSvg === 'function' ? getBloodDropSvg(20) : '🩸',
                target: 300,
                current: () => (this.player ? this.player.coinsCollected : 0),
                rewardText: `${drop} +200, 2 Blood Essence`,
                reward: () => { this.addCoins(200); this.starTokens = (this.starTokens || 0) + 2; try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {} }
            },
            {
                id: 'apex_dreadnought',
                title: 'Apex Dreadnought',
                desc: 'Vanquish an Aegis Boss or elite biome guardian.',
                icon: '👾',
                target: 1,
                current: () => (this.bossSlainCount || 0),
                rewardText: `${drop} +300, 3 Blood Essence`,
                reward: () => { this.addCoins(300); this.starTokens = (this.starTokens || 0) + 3; try { localStorage.setItem('aether_star_tokens', this.starTokens); } catch (e) {} }
            }
        ];
    }

    openAchievementsModal() {
        const modal = document.getElementById('achievements-modal');
        if (!modal) return;
        this.renderAchievements();
        modal.classList.remove('hidden');
    }

    renderAchievements() {
        const container = document.getElementById('achievements-list-container');
        if (!container) return;
        container.innerHTML = '';
        const list = this.getAchievementsList();

        for (const ach of list) {
            const card = document.createElement('div');
            const curVal = ach.current();
            const pct = Math.min(100, Math.floor((curVal / ach.target) * 100));
            const isClaimed = !!this.achievementsClaimed[ach.id];
            const isCompleted = curVal >= ach.target;

            let cardClass = 'achievement-card';
            if (isClaimed) cardClass += ' claimed';
            else if (isCompleted) cardClass += ' completed';

            let btnHtml = '';
            if (isClaimed) {
                btnHtml = `<button class="ach-claim-btn" disabled>CLAIMED ✓</button>`;
            } else if (isCompleted) {
                btnHtml = `<button class="ach-claim-btn" data-ach="${ach.id}">CLAIM</button>`;
            } else {
                btnHtml = `<button class="ach-claim-btn" disabled>${curVal}/${ach.target}</button>`;
            }

            card.className = cardClass;
            card.innerHTML = `
                <div class="ach-left">
                    <div class="ach-icon-frame">${ach.icon}</div>
                    <div class="ach-info">
                        <div class="ach-title">${ach.title}</div>
                        <div class="ach-desc">${ach.desc}</div>
                        <div class="ach-progress-row">
                            <div class="ach-progress-track">
                                <div class="ach-progress-fill" style="width: ${pct}%;"></div>
                            </div>
                            <span class="ach-progress-text">${curVal}/${ach.target}</span>
                        </div>
                    </div>
                </div>
                <div class="ach-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <span class="ach-reward-badge">${ach.rewardText}</span>
                    ${btnHtml}
                </div>
            `;
            container.appendChild(card);
        }

        container.querySelectorAll('.ach-claim-btn[data-ach]').forEach(btn => {
            this.bindTap(btn, () => {
                const id = btn.getAttribute('data-ach');
                this.claimAchievement(id);
            });
        });
    }

    claimAchievement(achId) {
        const list = this.getAchievementsList();
        const ach = list.find(a => a.id === achId);
        if (!ach || this.achievementsClaimed[achId]) return;

        ach.reward();
        this.achievementsClaimed[achId] = true;
        try {
            localStorage.setItem('aether_achievements_claimed', JSON.stringify(this.achievementsClaimed));
            localStorage.setItem('aether_cores_extracted', this.coresExtractedCount || 0);
            localStorage.setItem('aether_star_tokens', this.starTokens || 0);
        } catch (e) {}

        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playItemObtained();
        this.renderAchievements();
        this.updateStartCurrencies();
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
                    <div class="slot-desc" style="display: flex; align-items: center; gap: 4px; color: #ff8a80;">${typeof getBloodDropSvg === 'function' ? getBloodDropSvg(13) : ''} ${slot.coins || 0}</div>
                    <div class="slot-card-actions">
                        <button class="slot-action-btn slot-resume-btn" type="button">RESUME ▶</button>
                        <button class="slot-action-btn slot-delete-btn" type="button" title="Wipe Slot">🗑️ WIPE</button>
                    </div>
                `;
                const resumeBtn = card.querySelector('.slot-resume-btn');
                const deleteBtn = card.querySelector('.slot-delete-btn');
                
                if (resumeBtn) {
                    this.bindTap(resumeBtn, (e) => {
                        if (e && e.stopPropagation) e.stopPropagation();
                        this.loadSlot(i);
                    });
                }
                if (deleteBtn) {
                    this.bindTap(deleteBtn, (e) => {
                        if (e && e.stopPropagation) e.stopPropagation();
                        this.deleteSlot(i);
                    });
                }
                this.bindTap(card, () => this.loadSlot(i));
            } else {
                card.innerHTML = `
                    <div class="slot-num">SLOT 0${i + 1}</div>
                    <div class="slot-title" style="color: #00e5ff;">+ NEW RUN</div>
                    <div class="slot-desc">START EXPEDITION</div>
                    <div class="slot-card-actions">
                        <button class="slot-action-btn slot-new-btn" type="button">CHOOSE CLASS ▶</button>
                    </div>
                `;
                const newBtn = card.querySelector('.slot-new-btn');
                if (newBtn) {
                    this.bindTap(newBtn, (e) => {
                        if (e && e.stopPropagation) e.stopPropagation();
                        this.openCharacterSelectionForSlot(i);
                    });
                }
                this.bindTap(card, () => this.openCharacterSelectionForSlot(i));
            }

            grid.appendChild(card);
        }
    }

    deleteSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 10) return;
        this.saveSlots[slotIndex] = null;
        this.writeSaveSlots();
        if (this.soundEnabled && this.sfxEnabled) {
            this.renderer.audio.playCancel();
        }
        this.renderSaveSlots();
    }

    openCharacterSelectionForSlot(slotIndex) {
        this.pendingSlotIndex = slotIndex;
        const slotsModal = document.getElementById('save-slots-modal');
        if (slotsModal) slotsModal.classList.add('hidden');

        const setupModal = document.getElementById('setup-modal');
        if (setupModal) {
            setupModal.classList.remove('hidden');
            const confirmBtn = document.getElementById('btn-confirm-setup');
            if (confirmBtn) {
                confirmBtn.innerText = `CONFIRM & EMBARK (SLOT 0${slotIndex + 1}) ▶`;
            }

            // Sync Callsign input
            const callsignInput = document.getElementById('callsign-input');
            if (callsignInput) callsignInput.value = this.pioneerName || 'ALU-01';

            // Sync visual cards with current selected class
            const cards = document.querySelectorAll('.class-card');
            cards.forEach(card => {
                if (card.getAttribute('data-class') === this.selectedClass) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
        }
        this.screens.currentScreen = 'SETUP';
        this.updateTouchControlsVisibility();
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
    }

    startNewExpeditionInSlot(slotIndex) {
        this.activeSlotIndex = slotIndex;
        document.getElementById('save-slots-modal').classList.add('hidden');

        this.currentDay = 1;
        this.dayTimer = 0.35; // Start in bright morning daylight (08:24)
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
            if (slot.level && this.player) this.player.level = slot.level;
            if (slot.exp && this.player) this.player.exp = slot.exp;
            if (slot.skillPoints !== undefined && this.player) this.player.skillPoints = slot.skillPoints;
            if (slot.skillRanks && this.player) this.player.skillRanks = slot.skillRanks;
            if (slot.unlockedSkills && this.player) this.player.unlockedSkills = slot.unlockedSkills;
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
            level: this.player.level,
            exp: this.player.exp,
            skillPoints: this.player.skillPoints,
            skillRanks: this.player.skillRanks,
            unlockedSkills: this.player.unlockedSkills,
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
            const targetItem = (typeof BASE_ITEMS !== 'undefined' && (BASE_ITEMS[recipe.resultId] || BASE_ITEMS[recipe.resultItemId])) ? (BASE_ITEMS[recipe.resultId] || BASE_ITEMS[recipe.resultItemId]) : { tier: recipe.tier || 1, tierBadge: `T${recipe.tier || 1}`, tierColor: '#b0bec5' };
            const card = document.createElement('div');
            card.className = `craft-recipe-card tier-${targetItem.tier || 1}`;
            if (targetItem.tierColor) {
                card.style.borderLeft = `3px solid ${targetItem.tierColor}`;
            }

            const matsHtml = recipe.materials.map(mat => {
                const have = this.player.inventory.getItemCount(mat.itemId);
                const itemDef = (typeof BASE_ITEMS !== 'undefined' && BASE_ITEMS[mat.itemId]) ? BASE_ITEMS[mat.itemId] : { name: mat.itemId };
                const isOk = have >= mat.count;
                return `<span class="${isOk ? 'mat-ok' : 'mat-missing'}">${itemDef.name}: ${have}/${mat.count}</span>`;
            }).join(' • ');

            card.innerHTML = `
                <div class="craft-recipe-info">
                    <div class="craft-recipe-title" style="display: flex; align-items: center; gap: 6px;">
                        <span class="slot-tier-badge badge-t${targetItem.tier || 1}" style="position: static; font-size: 7px; padding: 1px 4px;">${targetItem.tierBadge || 'T1'}</span>
                        <span>${recipe.name}</span>
                    </div>
                    <div class="craft-recipe-mats">${matsHtml}</div>
                </div>
                <button class="craft-action-btn" ${canCraft ? '' : 'disabled'}>CRAFT</button>
            `;

            const btn = card.querySelector('.craft-action-btn');
            this.bindTap(btn, () => {
                const res = this.player.inventory.craftItem(recipe.id, this.player);
                if (res.success) {
                    this.craftedItemsCount = (this.craftedItemsCount || 0) + 1;
                    try { localStorage.setItem('aether_crafted_items', this.craftedItemsCount); } catch (e) {}
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

        let periodName = 'HIGH NOON';
        if (this.dayTimer < 0.20) periodName = 'MIDNIGHT';
        else if (this.dayTimer < 0.32) periodName = 'DAWN';
        else if (this.dayTimer < 0.45) periodName = 'MORNING';
        else if (this.dayTimer < 0.55) periodName = 'HIGH NOON';
        else if (this.dayTimer < 0.68) periodName = 'AFTERNOON';
        else if (this.dayTimer < 0.80) periodName = 'DUSK';
        else periodName = 'NIGHT';

        if (badge) {
            badge.innerText = `DAY ${this.currentDay} (${periodName})`;
            if (periodName === 'NIGHT' || periodName === 'MIDNIGHT') {
                badge.style.background = '#1a237e';
                badge.style.color = '#82b1ff';
            } else if (periodName === 'DUSK') {
                badge.style.background = '#bf360c';
                badge.style.color = '#ffab91';
            } else if (periodName === 'DAWN') {
                badge.style.background = '#4a148c';
                badge.style.color = '#e1bee7';
            } else {
                badge.style.background = '#0277bd';
                badge.style.color = '#ffd54f';
            }
        }

        ctx.save();
        ctx.translate(cx, cy);
        // At dayTimer = 0.50 (Noon), sun should be at top. At 0.00 (Midnight), moon is at top.
        const angle = this.dayTimer * Math.PI * 2;
        ctx.rotate(angle);

        // Day half (light blue)
        ctx.fillStyle = '#29b6f6';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI);
        ctx.fill();

        // Night half (deep navy)
        ctx.fillStyle = '#0a101f';
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI, Math.PI * 2);
        ctx.fill();

        // Sun (placed at bottom without rotation; when angle = PI at noon, it rotates to TOP!)
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(0, 5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Moon (placed at top without rotation; when angle = 0 at midnight, it is at TOP!)
        ctx.fillStyle = '#cfd8dc';
        ctx.beginPath();
        ctx.arc(0, -5, 2.5, 0, Math.PI * 2);
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
            SUB_BEDROCK_CORE: new WorldMap(seed, 64, 64, 'SUB_BEDROCK_CORE'),
            SOLARIUM_DUNES: new WorldMap(seed, 72, 72, 'SOLARIUM_DUNES'),
            CELESTIAL_ZENITH: new WorldMap(seed, 70, 70, 'CELESTIAL_ZENITH')
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
        this.player.game = this;
        this.player.inventory = this.inventory;

        const pioneerRank = Math.min(5, 1 + Math.floor((this.coresExtractedCount || 0) / 2));
        if (typeof this.player.applyPioneerPerks === 'function') {
            this.player.applyPioneerPerks(pioneerRank);
        }
        
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

        if (!this.discoveredBiomes) this.discoveredBiomes = new Set();
        this.discoveredBiomes.add(newAreaId);
        this.discoveredBiomesCount = this.discoveredBiomes.size;

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
            let track = 'OVERWORLD';
            if (newAreaId === 'SUB_BEDROCK_CORE') track = 'SUB_CORE';
            else if (newAreaId === 'WHISPERING_WOODS') track = 'WHISPERING_WOODS';
            else if (newAreaId === 'SUNKEN_GROTTO') track = 'SUNKEN_GROTTO';
            else if (newAreaId === 'SOLARIUM_DUNES') track = 'SOLARIUM_DUNES';
            else if (newAreaId === 'CELESTIAL_ZENITH') track = 'CELESTIAL_ZENITH';
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

            // Do not handle gameplay action keys on Splash or Start Screen
            if (this.gameState === 'START_SCREEN' || this.gameState === 'SPLASH') {
                return;
            }

            // Gameplay Action keys
            if (key === ' ' || key === 'x') { // Jump / Leap
                e.preventDefault();
                this.handleJump();
            } else if (key === 'j' || key === 'z') { // A = Action (Attack or Examine)
                this.handleAction();
            } else if (key === 'k') { // B = Parry / Deflect
                this.handleParry();
            } else if (key === 'l' || e.shiftKey) { // C = Dash
                this.handleDash();
            } else if (key === 'u') { // Active Class Ability / Ultimate
                this.handleSpecialAbility();
            } else if (key === 'p' || key === 'm') { // Skill Tree Matrix
                this.toggleSkillTree();
            } else if (key === 'e') { // Examine
                this.handleInteract();
            } else if (key === 'r') { // Restart
                this.restartPioneer();
            } else if (key === 'b' || key === 'i') {
                this.toggleInventory();
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
        const btnJump = document.getElementById('btn-jump');

        const bindAction = (elem, cb) => this.bindTap(elem, cb);

        // Jump Button: Elevation Leap
        if (btnJump) bindAction(btnJump, () => this.handleJump());

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
        // C Button: Dash Evasion
        bindAction(btnC, () => this.handleDash());

        // SP Button: Active Class Ability / Ultimate (Whirlwind, Singularity, Gaia Root)
        const btnSp = document.getElementById('btn-sp');
        if (btnSp) bindAction(btnSp, () => this.handleSpecialAbility());

        // Center Buttons: Settings & Menu
        const btnTouchSettings = document.getElementById('btn-touch-settings');
        if (btnTouchSettings) bindAction(btnTouchSettings, () => this.toggleSoundModal());

        const btnStart = document.getElementById('btn-start');
        if (btnStart) bindAction(btnStart, () => this.toggleGbaMenu());

        // Footer Settings Button
        const btnSettingsFooter = document.getElementById('btn-settings-footer');
        if (btnSettingsFooter) bindAction(btnSettingsFooter, () => this.toggleSoundModal());

        // Top Header Buttons
        const btnSkillsTop = document.getElementById('btn-skills-top');
        if (btnSkillsTop) bindAction(btnSkillsTop, () => this.toggleSkillTree());

        const btnMenuTop = document.getElementById('btn-menu-top');
        bindAction(btnMenuTop, () => this.toggleGbaMenu());

        const btnCraftingTop = document.getElementById('btn-crafting-top');
        if (btnCraftingTop) bindAction(btnCraftingTop, () => this.openCraftingModal());

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

        // Setup Confirm Button -> Moves to Menu Hub or embarks into selected slot
        const btnConfirmSetup = document.getElementById('btn-confirm-setup');
        if (btnConfirmSetup) {
            this.bindTap(btnConfirmSetup, () => {
                if (callsignInput && callsignInput.value.trim()) {
                    this.pioneerName = callsignInput.value.trim().toUpperCase();
                }
                this.hasInitializedProfile = true;
                this.saveState();
                this.updateHUD();

                const targetSlot = this.pendingSlotIndex;
                this.pendingSlotIndex = null;

                document.getElementById('setup-modal').classList.add('hidden');

                if (targetSlot !== null && targetSlot !== undefined) {
                    // Chosen from save slot screen -> immediately embark into that run!
                    this.startNewExpeditionInSlot(targetSlot);
                } else {
                    // Transition from Setup to Menu Hub
                    document.getElementById('menu-hub-modal').classList.remove('hidden');
                    this.screens.currentScreen = 'MENU';
                    this.updateTouchControlsVisibility();
                }
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        }

        const setupClose = document.getElementById('setup-close');
        if (setupClose) {
            this.bindTap(setupClose, () => {
                this.closeModal(document.getElementById('setup-modal'));
                if (this.pendingSlotIndex !== null) {
                    this.pendingSlotIndex = null;
                    this.openSaveSlotsModal();
                } else if (this.gameState === 'START_SCREEN') {
                    this.screens.currentScreen = 'START_SCREEN';
                }
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
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
            this.bindTap(menuClose, () => {
                this.toggleMenuHub();
            });
        }

        // Hub: Start Game
        const hubStartGame = document.getElementById('hub-start-game');
        if (hubStartGame) {
            this.bindTap(hubStartGame, () => {
                this.closeModal(menuHubModal);
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
            this.bindTap(hubOpenMarket, () => {
                this.closeModal(menuHubModal);
                this.toggleMarket();
            });
        }

        // Hub: New Seed
        const hubNewSeed = document.getElementById('hub-new-seed');
        if (hubNewSeed) {
            this.bindTap(hubNewSeed, () => {
                this.closeModal(menuHubModal);
                this.showGbaSeedDialog();
            });
        }

        // Hub: Sound Settings
        const hubSoundSettings = document.getElementById('hub-sound-settings');
        if (hubSoundSettings) {
            this.bindTap(hubSoundSettings, () => {
                this.closeModal(menuHubModal);
                this.toggleSoundModal();
            });
        }

        // Hub: Reconfigure Pioneer (Back to Setup)
        const hubChangePioneer = document.getElementById('hub-change-pioneer');
        if (hubChangePioneer) {
            this.bindTap(hubChangePioneer, () => {
                this.closeModal(menuHubModal);
                document.getElementById('setup-modal').classList.remove('hidden');
                this.screens.currentScreen = 'SETUP';
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
            });
        }

        // Hub: Dev Tools
        const hubDevTools = document.getElementById('hub-dev-tools');
        if (hubDevTools) {
            this.bindTap(hubDevTools, () => {
                this.closeModal(menuHubModal);
                this.toggleDevModal();
            });
        }

        // Hub: Skills & Mastery Matrix
        const hubSkills = document.getElementById('hub-skills');
        if (hubSkills) {
            this.bindTap(hubSkills, () => {
                this.closeModal(menuHubModal);
                this.toggleSkillTree();
            });
        }

        // 2. Skill Tree Modal Controls
        const skillTreeModal = document.getElementById('skill-tree-modal');
        const skillTreeClose = document.getElementById('skill-tree-close');
        if (skillTreeClose) {
            this.bindTap(skillTreeClose, () => {
                this.closeModal(skillTreeModal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        // 3. Sound Modal Controls
        const soundModal = document.getElementById('sound-modal');
        const soundClose = document.getElementById('sound-close');
        if (soundClose) {
            this.bindTap(soundClose, () => {
                this.closeModal(soundModal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const toggleMaster = document.getElementById('toggle-audio-master');
        if (toggleMaster) {
            this.bindTap(toggleMaster, () => {
                this.soundEnabled = !this.soundEnabled;
                toggleMaster.className = `gba-btn-sm ${this.soundEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleMaster.innerText = this.soundEnabled ? "ENABLED (ON)" : "MUTED (OFF)";
                if (this.soundEnabled) this.renderer.audio.init();
            });
        }

        const toggleBgm = document.getElementById('toggle-audio-bgm');
        if (toggleBgm) {
            this.bindTap(toggleBgm, () => {
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
            this.bindTap(toggleSfx, () => {
                this.sfxEnabled = !this.sfxEnabled;
                toggleSfx.className = `gba-btn-sm ${this.sfxEnabled ? 'toggle-on' : 'toggle-off'}`;
                toggleSfx.innerText = this.sfxEnabled ? "ENABLED (ON)" : "DISABLED (OFF)";
            });
        }

        const btnTestParry = document.getElementById('btn-test-parry');
        if (btnTestParry) this.bindTap(btnTestParry, () => this.renderer.audio.playParry());

        const btnTestCoin = document.getElementById('btn-test-coin');
        if (btnTestCoin) this.bindTap(btnTestCoin, () => this.renderer.audio.playCoin());

        const btnTestHit = document.getElementById('btn-test-hit');
        if (btnTestHit) this.bindTap(btnTestHit, () => this.renderer.audio.playSlash());

        // Touch Controls Scale buttons
        const scaleButtons = document.querySelectorAll('.scale-choice-btn');
        scaleButtons.forEach(btn => {
            this.bindTap(btn, () => {
                const scale = btn.getAttribute('data-scale');
                this.setButtonScale(scale);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        });

        // Typography Mode buttons
        const fontButtons = document.querySelectorAll('.font-choice-btn');
        fontButtons.forEach(btn => {
            this.bindTap(btn, () => {
                const fontMode = btn.getAttribute('data-font');
                this.setFontMode(fontMode);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
            });
        });

        // 4. Dev / Debug Modal Controls
        const devModal = document.getElementById('dev-modal');
        const devClose = document.getElementById('dev-close');
        if (devClose) {
            this.bindTap(devClose, () => {
                this.closeModal(devModal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const devSkipScene = document.getElementById('dev-skip-scene');
        if (devSkipScene) this.bindTap(devSkipScene, () => this.devSkip());

        const devToggleLayer = document.getElementById('dev-toggle-layer');
        if (devToggleLayer) {
            this.bindTap(devToggleLayer, () => {
                this.switchLayer(this.currentLayer === 'SURFACE' ? 'SUB_CORE' : 'SURFACE');
                devToggleLayer.innerText = this.currentLayer === 'SURFACE' ? "🌀 TELEPORT TO SUB-BEDROCK CORE" : "☀️ TELEPORT TO SURFACE OVERWORLD";
            });
        }

        const devTeleportBoss = document.getElementById('dev-teleport-boss');
        if (devTeleportBoss) {
            this.bindTap(devTeleportBoss, () => {
                if (this.currentLayer !== 'SUB_CORE') this.switchLayer('SUB_CORE');
                const boss = this.currentMap.enemies.find(e => e.isBoss && e.hp > 0);
                if (boss) {
                    this.player.pos.set(boss.x - 48, boss.y);
                    this.player.vel.set(0, 0);
                    this.closeModal(devModal);
                    this.screens.currentScreen = 'GAMEPLAY';
                }
            });
        }

        const devTeleportPlot = document.getElementById('dev-teleport-plot');
        if (devTeleportPlot) {
            this.bindTap(devTeleportPlot, () => {
                if (this.currentLayer !== 'SUB_CORE') this.switchLayer('SUB_CORE');
                this.player.pos.set(36 * 16 + 8, 25 * 16 + 8);
                this.player.vel.set(0, 0);
                this.closeModal(devModal);
                this.screens.currentScreen = 'GAMEPLAY';
            });
        }

        const devToggleGod = document.getElementById('dev-toggle-god');
        if (devToggleGod) this.bindTap(devToggleGod, () => this.toggleGodMode());

        const devUnlockFarmer = document.getElementById('dev-unlock-farmer');
        if (devUnlockFarmer) this.bindTap(devUnlockFarmer, () => this.unlockFarmerDev());

        const devGrantSp = document.getElementById('dev-grant-sp');
        if (devGrantSp) {
            this.bindTap(devGrantSp, () => {
                if (!this.player) return;
                this.player.skillPoints = (this.player.skillPoints || 0) + 15;
                this.player.level = Math.min(100, (this.player.level || 1) + 10);
                this.updateHUD();
                this.renderSkillTree();
                this.saveState();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCoin();
                this.renderer.addFloatingText(this.player.x, this.player.y - 30, `+10 LVLS & +15 SP!`, '#ffd54f');
            });
        }

        const devGrantCoins = document.getElementById('dev-grant-coins');
        if (devGrantCoins) this.bindTap(devGrantCoins, () => this.grantCoinsDev(100));

        const devInstantRestart = document.getElementById('dev-instant-restart');
        if (devInstantRestart) {
            this.bindTap(devInstantRestart, () => {
                this.restartPioneer();
                this.closeModal(devModal);
            });
        }

        // 5. Inventory Modal Controls
        const invModal = document.getElementById('inventory-modal');
        const invClose = document.getElementById('inv-close');
        if (invClose) {
            this.bindTap(invClose, () => {
                this.closeModal(invModal);
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        // 6. Slots, Crafting, Worldgen & Records Modals Controls
        const slotsClose = document.getElementById('slots-close');
        if (slotsClose) {
            this.bindTap(slotsClose, () => {
                this.closeModal(document.getElementById('save-slots-modal'));
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const craftingClose = document.getElementById('crafting-close');
        if (craftingClose) {
            this.bindTap(craftingClose, () => {
                this.closeModal(document.getElementById('crafting-modal'));
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const worldgenClose = document.getElementById('worldgen-close');
        if (worldgenClose) {
            this.bindTap(worldgenClose, () => {
                this.closeModal(document.getElementById('worldgen-modal'));
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        const recordsClose = document.getElementById('records-close');
        if (recordsClose) {
            this.bindTap(recordsClose, () => {
                this.closeModal(document.getElementById('records-modal'));
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            });
        }

        // 7. Safe background backdrop click dismissal for all modals
        document.querySelectorAll('.game-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
                }
            });
        });

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
        if (this.gameState === 'START_SCREEN' || this.gameState === 'SPLASH') {
            const openModals = Array.from(document.querySelectorAll('.game-modal:not(.hidden)'));
            if (openModals.length > 0) {
                openModals.forEach(m => m.classList.add('hidden'));
                if (this.screens) this.screens.currentScreen = 'TITLE';
                this.updateTouchControlsVisibility();
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
            }
            return;
        }

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
        if (this.gameState === 'START_SCREEN' || this.gameState === 'SPLASH') return;
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
                    `Harvests: ${this.harvestCount || 0}`
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
                this.showGbaDialogue("MISSION PROGRESS SAVED", `Expedition telemetry saved to Slot 0${this.activeSlotIndex + 1}.\nDay: ${this.currentDay}`);
                break;
            case 'dev':
                this.toggleDevModal();
                break;
            case 'exit':
                this.saveCurrentSlot();
                this.setGameState('START_SCREEN');
                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
                break;
            case 'skills':
            case 'market':
                this.toggleSkillTree();
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
            this.updateTouchControlsVisibility();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        } else {
            this.closeModal(modal);
            this.screens.currentScreen = 'GAMEPLAY';
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
    }

    toggleSoundModal() {
        const modal = document.getElementById('sound-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            this.updateTouchControlsVisibility();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        } else {
            this.closeModal(modal);
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
    }

    toggleDevModal() {
        const modal = document.getElementById('dev-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            this.updateTouchControlsVisibility();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        } else {
            this.closeModal(modal);
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
    }

    handleSpecialAbility() {
        if (!this.player || !this.currentMap) return;
        const res = this.player.performClassAbility(this.currentMap.enemies, this.currentMap);
        if (res) {
            if (this.soundEnabled && this.sfxEnabled) {
                if (res.type === 'WHIRLWIND') this.renderer.audio.playWhirlwind();
                else if (res.type === 'SINGULARITY') this.renderer.audio.playSingularity();
                else if (res.type === 'GAIA') this.renderer.audio.playGaiaRoot();
                else this.renderer.audio.playParry();
            }
            const label = res.type === 'WHIRLWIND' ? 'WHIRLWIND STRIKE!' : (res.type === 'SINGULARITY' ? 'GRAVITON VORTEX!' : 'GAIA CATACLYSM!');
            this.renderer.addFloatingText(label, this.player.pos.x, this.player.pos.y - 20, '#00e5ff');
            this.updateHUD();
        } else {
            if (this.player.abilityCooldowns && this.player.abilityCooldowns[0] > 0) {
                this.renderer.addFloatingText(`RECHARGING (${this.player.abilityCooldowns[0].toFixed(1)}s)`, this.player.pos.x, this.player.pos.y - 14, '#ff9800');
            } else if (this.player.energy < 20) {
                this.renderer.addFloatingText('LOW ENERGY', this.player.pos.x, this.player.pos.y - 14, '#ff5252');
            }
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
    }

    toggleSkillTree() {
        const modal = document.getElementById('skill-tree-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            this.openSkillTreeModal();
        } else {
            modal.classList.add('hidden');
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
        this.updateTouchControlsVisibility();
    }

    openSkillTreeModal() {
        const modal = document.getElementById('skill-tree-modal');
        if (!modal) return;
        this.renderSkillTree();
        modal.classList.remove('hidden');
        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuSelect();
        this.updateTouchControlsVisibility();
    }

    renderSkillTree() {
        const container = document.getElementById('skill-tree-container');
        if (!container) return;

        const player = this.player;
        const playerLevel = player ? player.level : 1;
        const playerSp = player ? (player.skillPoints || 0) : 0;
        const charClass = player ? player.charClass : (this.selectedClass || 'SUPER_SOLDIER');
        const trees = (typeof CLASS_SKILL_TREES !== 'undefined') ? CLASS_SKILL_TREES : {};
        const allSkills = trees[charClass] || [];

        const pioneerNameElem = document.getElementById('skill-pioneer-name');
        const pioneerClassElem = document.getElementById('skill-pioneer-class');
        const pioneerLevelElem = document.getElementById('skill-pioneer-level');
        const skillPointsVal = document.getElementById('skill-points-val');

        if (pioneerNameElem) pioneerNameElem.innerText = this.pioneerName || 'ALU-01';
        if (pioneerClassElem) pioneerClassElem.innerText = charClass.replace('_', ' ');
        if (pioneerLevelElem) pioneerLevelElem.innerText = `LV. ${playerLevel}/100`;
        if (skillPointsVal) skillPointsVal.innerText = `${playerSp}`;

        container.innerHTML = '';

        // Separate Class Skills and Universal Cross-Skills
        const classSkills = allSkills.filter(s => !s.isCrossSkill);
        const crossSkills = (typeof CROSS_SKILLS !== 'undefined') ? CROSS_SKILLS : allSkills.filter(s => s.isCrossSkill);

        // Group into Yggdrasil 5-Tier Cosmological Structure
        const tiers = [
            {
                tierId: 'crown',
                tierNum: 5,
                title: '👑 YGGDRASIL APEX CROWN',
                subtitle: 'Level 100 Godhood Pinnacle',
                sectionClass: 'tier-crown',
                skills: classSkills.filter(s => s.tier === 5)
            },
            {
                tierId: 'canopy',
                tierNum: 4,
                title: '🌌 CELESTIAL CANOPY',
                subtitle: 'Level 70–90 Grand Ultimates',
                sectionClass: 'tier-canopy',
                skills: classSkills.filter(s => s.tier === 4)
            },
            {
                tierId: 'boughs',
                tierNum: 3,
                title: '🍃 VERDANT BOUGHS',
                subtitle: 'Level 40–65 Branching Masteries',
                sectionClass: 'tier-boughs',
                skills: classSkills.filter(s => s.tier === 3)
            },
            {
                tierId: 'trunk',
                tierNum: 2,
                title: '🌳 THE WORLD TRUNK & CROSS-SKILLS',
                subtitle: 'Level 15–35 Core & Universal Ranks (1-5)',
                sectionClass: 'tier-trunk',
                // Combine Cross Skills + Tier 2 Class skills
                skills: [...crossSkills, ...classSkills.filter(s => s.tier === 2)]
            },
            {
                tierId: 'roots',
                tierNum: 1,
                title: '🌿 ROOTS OF YGGDRASIL',
                subtitle: 'Level 1–10 Foundational Matrix',
                sectionClass: 'tier-roots',
                skills: classSkills.filter(s => s.tier === 1)
            }
        ];

        tiers.forEach(tierDef => {
            if (!tierDef.skills || tierDef.skills.length === 0) return;

            const section = document.createElement('div');
            section.className = `ygg-tier-section ${tierDef.sectionClass}`;

            section.innerHTML = `
                <div class="ygg-tier-header">
                    <span class="ygg-tier-title">${tierDef.title}</span>
                    <span class="ygg-tier-level">${tierDef.subtitle}</span>
                </div>
                <div class="ygg-cards-grid"></div>
            `;

            const cardsGrid = section.querySelector('.ygg-cards-grid');

            tierDef.skills.forEach(skill => {
                const isCross = !!skill.isCrossSkill;
                const curRank = player ? player.getSkillRank(skill.id) : 0;
                const maxRank = skill.maxRank || 1;
                const isMastered = isCross ? (curRank >= maxRank) : (curRank > 0);
                const reqLevel = skill.unlockLevel || 1;
                const levelMet = playerLevel >= reqLevel;
                const prereqSkill = skill.req ? allSkills.find(s => s.id === skill.req) : null;
                const prereqMet = !skill.req || (player && player.hasSkill(skill.req));
                const cost = skill.cost || 1;
                const canAfford = playerSp >= cost;
                const canUpgrade = !isMastered && levelMet && prereqMet && canAfford;

                const card = document.createElement('div');
                let cardState = 'locked';
                if (isMastered) cardState = 'unlocked';
                else if (canUpgrade) cardState = 'available';

                card.className = `ygg-node-card ${cardState} ${skill.tier === 5 ? 'crown-node' : ''} ${isCross ? 'cross-skill-card' : ''}`;

                // Rank Pips for Cross Skills
                let rankProgressHtml = '';
                if (isCross) {
                    let pipsHtml = '';
                    for (let r = 1; r <= maxRank; r++) {
                        pipsHtml += `<span class="rank-pip ${r <= curRank ? 'filled' : ''}"></span>`;
                    }
                    rankProgressHtml = `
                        <div class="rank-progress-wrap">
                            <span class="rank-text">RANK ${curRank}/${maxRank}</span>
                            <div class="rank-pips">${pipsHtml}</div>
                        </div>
                    `;
                }

                // Requirements tag
                const reqLabel = prereqSkill ? `Req: ${prereqSkill.name}` : (isCross ? 'Universal Boon' : 'Foundational');

                card.innerHTML = `
                    <div class="skill-node-header">
                        <span class="skill-node-icon">${skill.icon || '⚔️'}</span>
                        <div class="skill-node-title-group">
                            <span class="skill-node-name">${skill.name}</span>
                            <div class="skill-node-meta-line">
                                <span class="skill-node-tier">${isCross ? 'CROSS-SKILL' : `TIER ${skill.tier}`} ${skill.passive ? 'PASSIVE' : 'ACTIVE'}</span>
                                <span class="ygg-level-req-badge ${levelMet ? 'met' : 'unmet'}">LV. ${reqLevel}</span>
                            </div>
                        </div>
                    </div>
                    ${rankProgressHtml}
                    <div class="skill-node-desc">${skill.desc}</div>
                    <div class="skill-node-footer">
                        <span class="skill-cost-badge">COST: ${cost} SP</span>
                        ${isMastered
                            ? `<span class="skill-status-tag mastered">${skill.tier === 5 ? '👑 TRANSCENDED ✓' : (isCross ? `MAX RANK ${maxRank} ✓` : 'MASTERED ✓')}</span>`
                            : (!levelMet
                                ? `<span class="skill-status-tag locked">REQUIRES LV. ${reqLevel}</span>`
                                : (!prereqMet
                                    ? `<span class="skill-status-tag locked">LOCKED (${prereqSkill ? prereqSkill.name : 'Req'})</span>`
                                    : `<button class="ygg-upgrade-btn ${isCross ? 'cross-btn' : ''}" data-skill-id="${skill.id}" ${canUpgrade ? '' : 'disabled'}>${isCross ? (curRank > 0 ? `UPGRADE R${curRank + 1} (${cost} SP)` : `UNLOCK R1 (${cost} SP)`) : `UNLOCK (${cost} SP)`}</button>`
                                  )
                              )
                        }
                    </div>
                `;

                const btn = card.querySelector('.ygg-upgrade-btn');
                if (btn && canUpgrade) {
                    this.bindTap(btn, () => {
                        if (this.player && this.player.unlockSkill(skill.id)) {
                            if (skill.tier === 5) {
                                if (this.soundEnabled && this.sfxEnabled) {
                                    this.renderer.audio.playTone(523.25, 'triangle', 0.2, 0.2);
                                    setTimeout(() => this.renderer.audio.playTone(659.25, 'triangle', 0.2, 0.2), 150);
                                    setTimeout(() => this.renderer.audio.playTone(783.99, 'triangle', 0.35, 0.25), 300);
                                    setTimeout(() => this.renderer.audio.playTone(1046.50, 'sine', 0.6, 0.3), 500);
                                }
                                this.renderer.addFloatingText(`👑 ASCENDED: ${skill.name}!`, this.player.pos.x, this.player.pos.y - 30, '#ffd54f');
                            } else if (isCross) {
                                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playSkillUnlocked();
                                this.renderer.addFloatingText(`RANK ${this.player.getSkillRank(skill.id)}: ${skill.name}!`, this.player.pos.x, this.player.pos.y - 20, '#ff1744');
                            } else {
                                if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playSkillUnlocked();
                                this.renderer.addFloatingText(`MASTERY: ${skill.name}!`, this.player.pos.x, this.player.pos.y - 20, '#00e5ff');
                            }
                            this.renderSkillTree();
                            this.updateHUD();
                        }
                    });
                }

                cardsGrid.appendChild(card);
            });

            container.appendChild(section);
        });
    }

    toggleMarket() {
        this.toggleSkillTree();
    }

    toggleInventory() {
        const modal = document.getElementById('inventory-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            this.renderInventoryModal();
            modal.classList.remove('hidden');
            this.updateTouchControlsVisibility();
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
        } else {
            this.closeModal(modal);
            if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playCancel();
        }
    }

    renderInventoryModal() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Wire up Category Filter Tabs if not already bound
        const filterContainer = document.getElementById('inv-filter-tabs');
        if (filterContainer && !this._invFilterBound) {
            this._invFilterBound = true;
            filterContainer.querySelectorAll('.inv-tab-btn').forEach(btn => {
                this.bindTap(btn, () => {
                    filterContainer.querySelectorAll('.inv-tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentInvFilter = btn.dataset.cat || 'ALL';
                    this.renderInventoryModal();
                });
            });
        }
        const activeCat = this.currentInvFilter || 'ALL';

        const activeInv = (this.player && this.player.inventory) ? this.player.inventory : this.inventory;

        // Update Equipped Gear Bar
        const gearNameWep = document.getElementById('gear-name-weapon');
        const gearNameArm = document.getElementById('gear-name-armor');
        if (gearNameWep) {
            const wep = activeInv && activeInv.equippedWeapon;
            gearNameWep.innerText = wep ? `${wep.name} (${wep.tierBadge || 'T' + (wep.tier || 1)})` : 'NONE';
            gearNameWep.style.color = wep ? (wep.tierColor || '#ffd54f') : '#90a4ae';
        }
        if (gearNameArm) {
            const arm = activeInv && activeInv.equippedArmor;
            gearNameArm.innerText = arm ? `${arm.name} (${arm.tierBadge || 'T' + (arm.tier || 1)})` : 'NONE';
            gearNameArm.style.color = arm ? (arm.tierColor || '#00e5ff') : '#90a4ae';
        }

        const totalSlots = Math.max(16, (activeInv && activeInv.maxSlots) || 16);
        const allSlots = (activeInv && activeInv.slots) ? activeInv.slots : [];

        // Filter items based on active category
        const displaySlots = [];
        for (let i = 0; i < totalSlots; i++) {
            const slot = allSlots[i] || null;
            if (!slot || !slot.item) {
                if (activeCat === 'ALL') displaySlots.push(null);
            } else if (activeCat === 'ALL' || slot.item.category === activeCat) {
                displaySlots.push(slot);
            }
        }
        while (displaySlots.length < 16) {
            displaySlots.push(null);
        }

        for (let i = 0; i < displaySlots.length; i++) {
            const slot = displaySlots[i];
            const el = document.createElement('div');

            if (slot && slot.item) {
                const item = slot.item;
                const isEquipped = (activeInv.equippedWeapon && activeInv.equippedWeapon.id === item.id) ||
                                   (activeInv.equippedArmor && activeInv.equippedArmor.id === item.id);
                const tier = item.tier || 1;
                const tierBadge = item.tierBadge || `T${tier}`;
                const tierName = item.tierName || (tier === 6 ? 'Mythic' : tier === 5 ? 'Legendary' : tier === 4 ? 'Epic' : tier === 3 ? 'Rare' : tier === 2 ? 'Uncommon' : 'Common');
                const tierColor = item.tierColor || (tier === 6 ? '#ff1744' : tier === 5 ? '#ffb300' : tier === 4 ? '#ba68c8' : tier === 3 ? '#00b0ff' : tier === 2 ? '#4caf50' : '#90a4ae');

                el.className = `inv-slot tier-${tier} rarity-${item.rarity || 'common'}`;
                el.innerHTML = `
                    ${isEquipped ? '<span class="slot-equipped-badge">EQUIPPED</span>' : ''}
                    <span class="slot-tier-badge badge-t${tier}">${tierBadge}</span>
                    <div class="slot-icon">${item.icon || '📦'}</div>
                    <div class="slot-name" style="color:${tierColor};">${item.name}</div>
                    ${slot.count > 1 ? `<span class="slot-count">x${slot.count}</span>` : ''}
                `;

                this.bindTap(el, () => {
                    grid.querySelectorAll('.inv-slot').forEach(s => s.classList.remove('selected'));
                    el.classList.add('selected');

                    let statsHtml = '';
                    if (item.damageBonus) statsHtml += `<span class="item-stat-chip" style="color:#ffb74d;">ATK +${item.damageBonus}</span>`;
                    if (item.defenseBonus) statsHtml += `<span class="item-stat-chip" style="color:#64b5f6;">DEF +${item.defenseBonus}</span>`;
                    if (item.speedBonus) statsHtml += `<span class="item-stat-chip" style="color:#81c784;">SPD +${item.speedBonus}</span>`;
                    if (item.maxHpBonus) statsHtml += `<span class="item-stat-chip" style="color:#e57373;">MAX HP +${item.maxHpBonus}</span>`;
                    if (item.maxEnergyBonus) statsHtml += `<span class="item-stat-chip" style="color:#4dd0e1;">MAX NRG +${item.maxEnergyBonus}</span>`;
                    if (item.lifeSteal) statsHtml += `<span class="item-stat-chip" style="color:#ff5252;">${Math.round(item.lifeSteal * 100)}% LIFE STEAL</span>`;
                    if (item.rangeBonus) statsHtml += `<span class="item-stat-chip" style="color:#ffd54f;">RANGE +${item.rangeBonus}</span>`;
                    if (item.parryBonus) statsHtml += `<span class="item-stat-chip" style="color:#ce93d8;">+${Math.round(item.parryBonus * 1000)}ms PARRY</span>`;
                    if (item.healAmount) statsHtml += `<span class="item-stat-chip" style="color:#81c784;">HEAL +${item.healAmount} HP</span>`;
                    if (item.energyAmount) statsHtml += `<span class="item-stat-chip" style="color:#4dd0e1;">NRG +${item.energyAmount}</span>`;
                    if (item.stasisDuration) statsHtml += `<span class="item-stat-chip" style="color:#ffd54f;">STASIS ${item.stasisDuration}s</span>`;
                    if (item.berserkDuration) statsHtml += `<span class="item-stat-chip" style="color:#ff5252;">BERSERK +50% ATK (${item.berserkDuration}s)</span>`;
                    if (item.barrierHp) statsHtml += `<span class="item-stat-chip" style="color:#40c4ff;">SHIELD +${item.barrierHp}</span>`;
                    if (item.regenDuration) statsHtml += `<span class="item-stat-chip" style="color:#69f0ae;">REGEN +${item.regenRate || 8} HP/s (${item.regenDuration}s)</span>`;
                    if (item.fortifyDuration) statsHtml += `<span class="item-stat-chip" style="color:#ab47bc;">DEF +${item.defenseBonus || 30} (${item.fortifyDuration}s)</span>`;
                    if (item.reflectDamage) statsHtml += `<span class="item-stat-chip" style="color:#ffb300;">${Math.round(item.reflectDamage * 100)}% REFLECT</span>`;

                    let actionBtnHtml = '';
                    if (item.type === 'WEAPON' || item.type === 'ARMOR' || item.type === 'RELIC') {
                        if (isEquipped) {
                            actionBtnHtml = `<button id="btn-inv-action" class="item-act-btn unequip-btn">UNEQUIP</button>`;
                        } else {
                            actionBtnHtml = `<button id="btn-inv-action" class="item-act-btn">EQUIP</button>`;
                        }
                    } else if (item.type === 'CONSUMABLE' || item.type === 'FOOD' || item.id === 'MEDICINAL_HERB') {
                        actionBtnHtml = `<button id="btn-inv-action" class="item-act-btn">USE ITEM</button>`;
                    } else if (item.id === 'PRIMITIVE_TORCH' || item.id === 'TORCH') {
                        actionBtnHtml = `<button id="btn-inv-action" class="item-act-btn">${this.player && this.player.hasTorchActive ? 'DOUSE TORCH' : 'LIGHT TORCH'}</button>`;
                    } else if (item.id === 'CAMPFIRE_KIT') {
                        actionBtnHtml = `<button id="btn-inv-action" class="item-act-btn">DEPLOY CAMPFIRE</button>`;
                    }

                    const sourceClass = item.isCraftable ? 'source-crafted' : (tier === 6 ? 'source-remains' : '');
                    const sourcePrefix = item.isCraftable ? 'CRAFTED' : (tier === 6 ? 'REMAINS' : 'FOUND');

                    const detailsEl = document.getElementById('item-details');
                    if (detailsEl) {
                        detailsEl.innerHTML = `
                            <div class="item-detail-header">
                                <span class="item-detail-title" style="color:${tierColor};">${item.icon || ''} ${item.name}</span>
                                <div class="item-detail-badges">
                                    <span class="item-tier-pill slot-tier-badge badge-t${tier}">${tierBadge} • ${tierName.toUpperCase()}</span>
                                    <span class="item-detail-type">${item.category || item.type}</span>
                                </div>
                            </div>
                            <div class="item-source-badge ${sourceClass}">⚡ ${sourcePrefix}: ${item.source || (item.isCraftable ? 'Crafted at Anvil' : 'Found in the wild')}</div>
                            ${statsHtml ? `<div class="item-detail-stats">${statsHtml}</div>` : ''}
                            <div class="item-detail-desc">${item.desc}</div>
                            ${actionBtnHtml}
                        `;

                        const actBtn = document.getElementById('btn-inv-action');
                        if (actBtn) {
                            this.bindTap(actBtn, () => {
                                const res = activeInv.useItem(item.id, this.player);
                                if (res && (res.success || res === true)) {
                                    this.renderInventoryModal();
                                    this.updateHUD();
                                    if (this.soundEnabled && this.sfxEnabled) {
                                        this.renderer.audio.playTone(720, 'sine', 0.22, 0.12);
                                    }
                                }
                            });
                        }
                    }
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playMenuMove();
                });
            } else {
                // Empty slot
                el.className = 'inv-slot empty';
                el.innerHTML = '<span style="font-size:12px;opacity:0.3;">·</span>';
            }

            grid.appendChild(el);
        }
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

    handleJump() {
        if (!this.player) return;
        const didJump = this.player.jump();
        if (didJump) {
            this.elevationJumpsCount = (this.elevationJumpsCount || 0) + 1;
            try { localStorage.setItem('aether_elevation_jumps', this.elevationJumpsCount); } catch (e) {}
            if (this.soundEnabled && this.sfxEnabled && this.renderer && this.renderer.audio) {
                this.renderer.audio.playJump();
            }
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

                // Award EXP for resource harvesting
                let expGain = (node.type === 'FLINT_BOULDER') ? 20 : ((node.type === 'PINE_TREE') ? 15 : 12);
                if (this.player && typeof this.player.gainExp === 'function') {
                    const leveled = this.player.gainExp(expGain);
                    setTimeout(() => {
                        this.renderer.addFloatingText(`+${expGain} EXP`, node.x, node.y - 26, '#00e5ff');
                    }, 350);
                    if (leveled) {
                        this.renderer.addFloatingText(`LEVEL UP! LVL ${this.player.level}`, this.player.pos.x, this.player.pos.y - 28, '#ffd700');
                        if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playLevelUp();
                    }
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
            if (this.player && typeof this.player.gainExp === 'function') {
                const leveled = this.player.gainExp(45);
                this.renderer.addFloatingText('+45 EXP', chest.x, chest.y - 24, '#00e5ff');
                if (leveled) {
                    this.renderer.addFloatingText(`LEVEL UP! LVL ${this.player.level}`, this.player.pos.x, this.player.pos.y - 28, '#ffd700');
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playLevelUp();
                }
            }
            this.showGbaDialogue(`SUPPLY POD UNLOCKED!\n\nObtained: ${chest.count || 1}x ${itemDef.name}\n+${chest.coins || 0} ALU Coins!\n+45 EXP`, 'ITEM DISCOVERED');
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
            if (this.player && typeof this.player.gainExp === 'function') {
                const leveled = this.player.gainExp(20);
                this.renderer.addFloatingText('+20 EXP', sp.x, sp.y - 20, '#00e5ff');
                if (leveled) {
                    this.renderer.addFloatingText(`LEVEL UP! LVL ${this.player.level}`, this.player.pos.x, this.player.pos.y - 28, '#ffd700');
                    if (this.soundEnabled && this.sfxEnabled) this.renderer.audio.playLevelUp();
                }
            }
            this.showGbaDialogue(`FORAGED CACHE!\n\nGathered: +${sp.coins} ALU Coins${extraMsg}\n+20 EXP`, 'CACHE DISCOVERED');
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
        if (rusticLevel && this.player) rusticLevel.innerText = `${this.player.level || 1}`;

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
        let periodName = "High Noon";
        if (dayProgress < 0.20) periodName = "Midnight";
        else if (dayProgress < 0.32) periodName = "Dawn";
        else if (dayProgress < 0.45) periodName = "Morning";
        else if (dayProgress < 0.55) periodName = "High Noon";
        else if (dayProgress < 0.68) periodName = "Afternoon";
        else if (dayProgress < 0.80) periodName = "Dusk";
        else periodName = "Night";

        if (rusticTimeText) rusticTimeText.innerText = `${hh}:${mm} • ${periodName}`;

        // 6. Active Combat Buffs HUD (Stasis, Berserk, Barrier, Regen, Fortify)
        const buffsHud = document.getElementById('active-buffs-hud');
        if (buffsHud) {
            if (this.player) {
                let chips = '';
                if (this.player.stasisTimer > 0) {
                    chips += `<span class="buff-chip buff-stasis">⏱️ STASIS ${this.player.stasisTimer.toFixed(1)}s</span>`;
                }
                if (this.player.berserkerTimer > 0) {
                    chips += `<span class="buff-chip buff-berserk">⚔️ BERSERK ${this.player.berserkerTimer.toFixed(1)}s</span>`;
                }
                if (this.player.barrierShield > 0) {
                    chips += `<span class="buff-chip buff-shield">🛡️ BARRIER ${Math.round(this.player.barrierShield)}</span>`;
                }
                if (this.player.regenTimer > 0) {
                    chips += `<span class="buff-chip buff-regen">🌿 REGEN ${this.player.regenTimer.toFixed(1)}s</span>`;
                }
                if (this.player.fortifyTimer > 0) {
                    chips += `<span class="buff-chip buff-fortify">🪵 FORTIFY ${this.player.fortifyTimer.toFixed(1)}s</span>`;
                }
                buffsHud.innerHTML = chips;
            } else {
                buffsHud.innerHTML = '';
            }
        }

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
                    this.combatParriesCount = (this.combatParriesCount || 0) + 1;
                    try { localStorage.setItem('aether_combat_parries', this.combatParriesCount); } catch (e) {}
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
        if (typeof currentTime !== 'number' || isNaN(currentTime)) {
            currentTime = performance.now();
        }
        if (typeof this.lastTime !== 'number' || isNaN(this.lastTime) || this.lastTime > currentTime) {
            this.lastTime = currentTime;
        }
        const rawDt = (currentTime - this.lastTime) / 1000.0;
        const dt = Math.max(0.001, Math.min(0.05, isNaN(rawDt) ? 0.016 : rawDt));
        this.lastTime = currentTime;

        try {
            // 0. If in START_SCREEN or SPLASH state: Render atmospheric runic title scene with zero gameplay leak
            if (this.gameState === 'START_SCREEN' || this.gameState === 'SPLASH') {
                this.renderer.clear();
                this.renderer.renderTitleBackdrop(dt);
                return;
            }

            // Check if player died
            if (this.player && this.player.hp <= 0 && this.screens.currentScreen === 'GAMEPLAY') {
                this.screens.currentScreen = 'GAMEOVER';
            }

            // If on Game Over Screen
            if (this.screens && this.screens.currentScreen === 'GAMEOVER') {
                this.screens.render(this.renderer.ctx, this.canvas.width, this.canvas.height);
                return;
            }

            // Day/Night Cycle Progression (600s = 10 minutes per full in-game day)
            this.dayTimer = (this.dayTimer || 0.25) + dt / 600.0;
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
            this.renderer.renderEntitiesYSorted(
                this.currentMap,
                this.player,
                this.currentMap.enemies,
                this.npcs ? this.npcs.npcs : [],
                this.critters,
                dt,
                isNight
            );

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
        } catch (loopErr) {
            console.error("[GAME LOOP CRITICAL ERROR]", loopErr);
        } finally {
            requestAnimationFrame(this.loop.bind(this));
        }
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
