# Aether-Core 🌌⚔️
### *A Retro-Tactile Action RPG with Procedural Seed Worlds & Hidden Sci-Fi Foundations*

> **"Every map is an on-chain ALU Coin asset. Every dungeon is a decommissioned quantum reactor."**

---

## 🌟 Overview & Core Concept

**Aether-Core** merges the tactile, nostalgic charm of Game Boy Advance top-down action RPGs (*Golden Sun*, *The Minish Cap*, *Pokémon Emerald*) with cutting-edge procedural generation and decentralized tokenomics.

```
                                  WORLD GENERATION
                       Seed S = keccak256(Block + CreatorID)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
       ┌───────────────────┐                           ┌───────────────────┐
       │   PLAYABLE MAP    │                           │     ALU COIN      │
       ├───────────────────┤                           ├───────────────────┤
       │ • 8-Color Palette │                           │ • Ticker: $ALU-S  │
       │ • Dungeon Layouts │      1-to-1 LOCK          │ • Bonding Curve   │
       │ • Sub-bedrock Tech│ ◄───────────────────────► │ • Reserve Vault   │
       │ • Monster Spawns  │                           │ • Liquidity Pool  │
       └───────────────────┘                           └───────────────────┘
```

### 1. The Map *Is* the ALU Coin
- Every generated map is cryptographically tied to a unique **ALU Coin** (e.g. `$ALU-7F3A`).
- **Bonding Curve:** The token's price scales dynamically as players explore, conquer, and trade the world:
  $$P(S) = P_0 + k \cdot S$$
- **Rug-Pull Immune (The Genesis Vault Floor):**  
  Every trade deposits 2.5% into an immutable Genesis Vault. Circulating tokens can be burned at any time to liquidate a pro-rata share of the reserve floor:
  $$\text{Floor Price} = \frac{\text{Genesis Vault Balance}}{S_{\text{circulating}}}$$

---

## 🕹️ Controls & Kinematics Engine

Designed for ultra-responsive, momentum-based feel:

- **8-Direction Analog Movement:** 360° gamepad, touch virtual D-pad, and WASD/arrow keys.
- **Sub-Pixel Precision:** Internal positions stored as high-precision floats to eliminate micro-stuttering.
- **Inertia & Braking Curves:** Snappy $0.12\text{s}$ acceleration with $0.08\text{s}$ skid deceleration.
- **Corner-Sliding Assist:** Characters gliding within 4px of obstacle edges are smoothly nudged around corners without stopping dead.

| Action | Keyboard | Touch / Gamepad |
| :--- | :--- | :--- |
| **Move** | `W`, `A`, `S`, `D` / Arrows | Analog D-Pad |
| **Attack** | `J` | Button **A** |
| **Parry / Deflect** | `K` | Button **B** |
| **Special Skill / Dash** | `L` | Button **L** |
| **Interact / Inspect** | `E` | Button **R** |
| **Advance Cutscene** | `Enter` / `Space` | Button **START** / Tap |

---

## 🎭 Playable Characters

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLAYABLE HEROES                                   │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ 1. TECHNO-MAGE       │ 2. SUPER-SOLDIER     │ 3. THE FARMER (SECRET UNLOCK) │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ • Nanite Sigil Magic │ • Kinetic Momentum   │ • Reality-Altering Hoe        │
│ • Energy Overload    │ • Cyber-Blade Combos │ • Cosmic Crop Growth          │
│ • High-Tech Sorcery  │ • Heavy Shield Bash  │ • "Harvest" Singularity       │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

1. **The Techno-Mage (*The Arcane Machinist*):**  
   Wields an antique brass staff housing a particle emitter. Fires homing Photon Darts and deploys Singularity Surges that pull enemies into vortex traps.
2. **The Super-Soldier (*The Dreadnought*):**  
   Heavy plate armor with steam exhausts and an ultrasonic broadsword. Features **Momentum Slashes** that deal damage proportional to player velocity, and Thruster Dashes with invulnerability frames.
3. **Secret Unlock: The Farmer (*The Deific Rustic*):**  
   *Unlock Condition:* Strike/till the hidden 3×3 arable soil plot beneath the sub-bedrock reactor. Wields cosmic agricultural artifacts that tear spacetime bedrock apart and instantly harvest downed foes.

---

## ⚔️ Nine-Sols Inspired Tactical Combat

- **Rhythm & Deflection:** Enemies telegraph attacks with visual flashes. Pressing Parry (**B** / `K`) during the active 180ms window deflects all incoming damage, produces a metallic "CLANG!", replenishes energy, and counter-staggers the enemy.
- **Telegraphed Hazards:** Balance aggressive offense with split-second parries to conquer the subterranean **Aegis Dreadnought** boss.

---

## 🎨 Seed-Driven 8-Color Mathematical Palettes

Every world derives an 8-color palette in real time from its 32-bit seed using color wheel harmonies (OKLCH/HSL):

```
┌────┬───────────────┬───────────────────────────────────────────────────┐
│ #0 │ Void Shadow   │ Deepest abyss, cave ceilings, sharp outlines      │
│ #1 │ Low Terrain   │ Cliff base & crevice shadow                       │
│ #2 │ Mid Terrain   │ Main ground / rock body (obsidian, granite, etc.) │
│ #3 │ Terrain High  │ Sunlit cliff highlights and ledges                │
│ #4 │ Surface Foil  │ Interactive grass, bioluminescent moss            │
│ #5 │ Water Deep    │ Subterranean coolant canals and deep oceans       │
│ #6 │ Water Foam    │ Animated shoreline ripples and light foam         │
│ #7 │ Accent Glow   │ Ancient sci-fi conduits, neon glyphs, spells      │
└────┴───────────────┴───────────────────────────────────────────────────┘
```

---

## 🔬 Integration with the ALU Language

Aether-Core incorporates the **[ALU Language](https://github.com/Alu6hel/alu-language.git)** toolchain for formal mathematical guarantees:
- **`src/alu/aether_seed.alu`**: Formally checked with the Z3 Theorem Prover to eliminate integer overflows, memory bounds violations, and float desyncs across multi-platform seed expansions.
- **Physical Dimensions:** Enforces dimensional types (`int<m/s>`, `int<N>`) for deterministic momentum across frame rates.

---

## 🚀 Running & Testing Locally

### 1. Run Automated Engine Tests:
```bash
node tests/test_engine.js
```

### 2. Run 100-Frame Gameplay Simulation:
```bash
node tests/test_simulation.js
```

### 3. Launch the Playable Web App:
Start any local static server:
```bash
# Using Python:
python3 -m http.server 8080

# Using Node:
npx serve .
```
Open `http://localhost:8080` in your browser. Play using your keyboard or the on-screen GBA touch controls.

---

## 🌐 Deploying to Alumungandr (Cloudflare Edge)

To deploy Aether-Core to [alumungandr.com](https://alumungandr.com/):
1. Copy `index.html`, `styles.css`, and `engine/` into your Alumungandr repository.
2. Route the API via your Cloudflare Worker `_worker.js` for instant sub-30ms global edge delivery.

---

*Engineered with mathematical precision and retro passion.*
