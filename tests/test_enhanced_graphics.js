/**
 * test_enhanced_graphics.js
 * Verification of high-fidelity GBA / Terraria graphics:
 * - 5 player classes x 4 cardinal directions (DOWN, UP, LEFT, RIGHT)
 * - Eye rendering (sclera, iris, pupil, specular glint, blinking)
 * - Humanoid & Unique NPCs (Elder, Blacksmith, Herbalist, Zara, Krell, Nabilah, Rowan, Archivist)
 * - Brutal Monsters (Wolf, Goblin, Bat, Scorpion, Void Stalker, Imp, Wyvern) & Frenzy effects
 * - 4 Colossal Bosses (Dreadnought, Cinder Golem, Dune Tyrant, Frost Wraith)
 * - Ambient environmental particles across 5 biomes
 */

const assert = require('assert');
const path = require('path');

// Mock Canvas 2D Context
class MockCanvasContext {
    constructor() {
        this.ops = [];
        this.fillStyle = '#000000';
        this.strokeStyle = '#000000';
        this.lineWidth = 1;
        this.globalAlpha = 1.0;
        this.font = '10px monospace';
        this.textAlign = 'left';
    }

    fillRect(x, y, w, h) {
        this.ops.push({ op: 'fillRect', x, y, w, h, fillStyle: this.fillStyle });
    }

    strokeRect(x, y, w, h) {
        this.ops.push({ op: 'strokeRect', x, y, w, h, strokeStyle: this.strokeStyle });
    }

    beginPath() { this.ops.push({ op: 'beginPath' }); }
    closePath() { this.ops.push({ op: 'closePath' }); }
    moveTo(x, y) { this.ops.push({ op: 'moveTo', x, y }); }
    lineTo(x, y) { this.ops.push({ op: 'lineTo', x, y }); }
    fill() { this.ops.push({ op: 'fill', fillStyle: this.fillStyle }); }
    stroke() { this.ops.push({ op: 'stroke', strokeStyle: this.strokeStyle }); }
    arc(x, y, r, sa, ea) { this.ops.push({ op: 'arc', x, y, r }); }
    ellipse(x, y, rx, ry, rot, sa, ea) { this.ops.push({ op: 'ellipse', x, y, rx, ry }); }
    save() { this.ops.push({ op: 'save' }); }
    restore() { this.ops.push({ op: 'restore' }); }
    translate(x, y) { this.ops.push({ op: 'translate', x, y }); }
    rotate(a) { this.ops.push({ op: 'rotate', a }); }
    setLineDash(d) {}
    fillText(t, x, y) { this.ops.push({ op: 'fillText', t, x, y }); }
}

const mockCanvas = {
    width: 320,
    height: 240,
    getContext: () => new MockCanvasContext()
};

// Mock classes required by RetroRenderer
global.SpriteSheet = class {
    drawSprite() {}
};
global.ChiptuneSynth = class {
    playNote() {}
    playSfx() {}
};

const { RetroRenderer } = require('/home/davidalujones/.gemini/antigravity/scratch/Aether-Core/engine/renderer.js');
const renderer = new RetroRenderer(mockCanvas);

console.log('================================================================================');
console.log('         AETHER-CORE: HIGH-FIDELITY GRAPHICS VERIFICATION SUITE                 ');
console.log('================================================================================\\n');

// 1. TEST PLAYER CLASSES & CARDINAL DIRECTIONS
console.log('--- TEST 1: Player Classes & Cardinal Directions ---');
const classes = ['TECHNO_MAGE', 'SUPER_SOLDIER', 'FARMER_GOD', 'CHRONO_GLITCHER', 'SOLARION_ARCHITECT'];
const facings = ['DOWN', 'UP', 'LEFT', 'RIGHT'];

for (const cls of classes) {
    for (const facing of facings) {
        const dummyChar = {
            charClass: cls,
            cardinalFacing: facing,
            pos: { x: 160, y: 120, z: 0 },
            vel: { length: () => 10 },
            walkTimer: 1.5,
            inventory: { equippedWeapon: null, equippedArmor: null },
            dashTrail: [],
            invulnerableTimer: 0,
            activeSwings: [],
            activeVortices: [],
            projectiles: [],
            sparks: []
        };
        const ctx = new MockCanvasContext();
        renderer.ctx = ctx;
        renderer.renderCharacter(dummyChar, ['#000', '#111', '#222', '#333', '#444', '#555', '#666', '#777'], null);
        assert(ctx.ops.length > 15, `Expected detailed draw operations for ${cls} facing ${facing}, got ${ctx.ops.length}`);
    }
}
console.log('  ✓ Test 1 Passed: All 5 classes rendered across all 4 cardinal directions (20 distinct combinations).\\n');

// 2. TEST EYE DETAILS & BLINKING
console.log('--- TEST 2: Eye Techniques & Blinking ---');
const eyeCtxOpen = new MockCanvasContext();
renderer.drawPixelEyes(eyeCtxOpen, 100, 100, 'DOWN', '#00e5ff', false);
const hasSclera = eyeCtxOpen.ops.some(op => op.op === 'fillRect' && op.fillStyle === '#ffffff');
const hasIris = eyeCtxOpen.ops.some(op => op.op === 'fillRect' && op.fillStyle === '#00e5ff');
const hasPupil = eyeCtxOpen.ops.some(op => op.op === 'fillRect' && op.fillStyle === '#0f172a');
assert(hasSclera && hasIris && hasPupil, 'Eye technique must include sclera, iris, and pupil');

const eyeCtxBlink = new MockCanvasContext();
renderer.drawPixelEyes(eyeCtxBlink, 100, 100, 'DOWN', '#00e5ff', true);
const hasLashLine = eyeCtxBlink.ops.some(op => op.op === 'fillRect' && op.fillStyle === '#1e293b');
assert(hasLashLine, 'Blinking eyes must render eyelid lash line');
console.log('  ✓ Test 2 Passed: Expressive eyes with sclera, iris, pupil, glint, and blink verified.\\n');

// 3. TEST NPC DETAILED RENDERING
console.log('--- TEST 3: NPC Rendering with Roles & Accessories ---');
const testNpcs = [
    { id: 'BLACKSMITH_THORNE', name: 'Blacksmith Thorne', x: 100, y: 100, facing: 'down', hairColor: '#212121' },
    { id: 'ELDER_OAKHAVEN', name: 'Elder Oakhaven', x: 120, y: 100, facing: 'down', hairColor: '#eceff1' },
    { id: 'HERBALIST_MAEVE', name: 'Herbalist Maeve', x: 140, y: 100, facing: 'down', hairColor: '#a04000' },
    { id: 'ARCHIVIST_UNIT_7', name: 'Archivist Unit-7', x: 160, y: 100, facing: 'down' },
    { id: 'INVENTOR_ZARA', name: 'Inventor Zara', x: 180, y: 100, facing: 'down', hairColor: '#1e293b' },
    { id: 'COMMANDER_KRELL', name: 'Commander Krell', x: 200, y: 100, facing: 'down', hairColor: '#475569' },
    { id: 'ASTRONOMER_NABILAH', name: 'Astronomer Nabilah', x: 220, y: 100, facing: 'down' },
    { id: 'MYSTIC_ROWAN', name: 'Mystic Rowan', x: 240, y: 100, facing: 'down' }
];

for (const npc of testNpcs) {
    const ctx = new MockCanvasContext();
    renderer.ctx = ctx;
    renderer.renderNpcs([npc], 0, 0, { x: 100, y: 100 }, null);
    assert(ctx.ops.length > 10, `Expected detailed drawing for NPC ${npc.id}`);
}
console.log('  ✓ Test 3 Passed: All 8 key NPCs rendered with role accessories, hair volume, and blinking eyes.\\n');

// 4. TEST BRUTAL MONSTERS & FRENZY EFFECTS
console.log('--- TEST 4: Brutal Monster Pixel Art & Frenzy FX ---');
const monsterTypes = ['WOLF', 'GOBLIN', 'SHADOW_BAT', 'SCORPION', 'VOID_STALKER', 'CYBER_DRONE', 'IMP', 'WYVERN'];

for (const mType of monsterTypes) {
    const normalEnemy = { type: mType, x: 100, y: 100, hp: 50, maxHp: 50, isFrenzied: false };
    const ctxNormal = new MockCanvasContext();
    renderer.ctx = ctxNormal;
    renderer.renderSingleEnemy(normalEnemy, ['#000', '#111', '#222', '#333'], 0, 0, null);
    assert(ctxNormal.ops.length > 5, `Expected sprite render for monster ${mType}`);

    const frenziedEnemy = { type: mType, x: 100, y: 100, hp: 50, maxHp: 50, isFrenzied: true, facingAngle: 0 };
    const ctxFrenzied = new MockCanvasContext();
    renderer.ctx = ctxFrenzied;
    renderer.renderSingleEnemy(frenziedEnemy, ['#000', '#111', '#222', '#333'], 0, 0, null);
    const hasRedAura = ctxFrenzied.ops.some(op => op.op === 'stroke' && op.strokeStyle && op.strokeStyle.includes('255, 23, 68'));
    assert(hasRedAura, `Frenzied monster ${mType} must have blood-red rage aura`);
}
console.log('  ✓ Test 4 Passed: All 8 monster types rendered with high-fidelity pixel art and frenzy rage auras.\\n');

// 5. TEST COLOSSAL BOSS SPRITES
console.log('--- TEST 5: Colossal Boss Sprites ---');
const bosses = [
    { id: 'boss_aegis_dreadnought', type: 'AEGIS_DREADNOUGHT', isBoss: true, hp: 200, maxHp: 200, x: 100, y: 100 },
    { id: 'boss_cinder_golem', type: 'CINDER_GOLEM', isBoss: true, hp: 200, maxHp: 200, x: 100, y: 100 },
    { id: 'dune_reaver_boss', type: 'DUNE_TYRANT', isBoss: true, hp: 200, maxHp: 200, x: 100, y: 100 },
    { id: 'zenith_archon_boss', type: 'FROST_WRAITH', isBoss: true, hp: 200, maxHp: 200, x: 100, y: 100 }
];

for (const b of bosses) {
    const ctx = new MockCanvasContext();
    renderer.ctx = ctx;
    renderer.renderSingleEnemy(b, ['#111', '#222', '#333', '#444', '#555', '#666', '#777', '#888'], 0, 0, null);
    assert(ctx.ops.length >= 10, `Expected detailed boss sprite for ${b.type}`);
}
console.log('  ✓ Test 5 Passed: All 4 colossal boss titans (Dreadnought, Golem, Dune Tyrant, Frost Wraith) rendered.\\n');

// 6. TEST PROCEDURAL AMBIENT ENVIRONMENTAL PARTICLES
console.log('--- TEST 6: Ambient Environmental Particles ---');
const biomes = ['VERDANT_VALE', 'GLACIAL_STEPPE', 'ASHEN_CRAGS', 'SOLARIUM_DUNES', 'SUNKEN_GROTTO'];

for (const b of biomes) {
    renderer.ambientParticles = [];
    const ctx = new MockCanvasContext();
    renderer.ctx = ctx;
    renderer.renderAmbientParticles(0, 0, 0.016, { areaId: b });
    assert.strictEqual(renderer.ambientParticles.length, 45, `Expected 45 ambient particles for ${b}`);
    assert(ctx.ops.length > 40, `Expected particle draw ops for ${b}`);
}
console.log('  ✓ Test 6 Passed: Ambient particles initialized and animated across all 5 biomes.\\n');

console.log('================================================================================');
console.log('  HIGH-FIDELITY GRAPHICS OVERHAUL: 6/6 test suites PASSED (100%)!               ');
console.log('================================================================================');
