/**
 * Unit Test: Level 1-100 Progression, Yggdrasil Tree of Life & Multi-Rank Cross-Skills
 */
const assert = require('assert');
const { CHARACTER_CLASS, Character, CLASS_SKILL_TREES, CROSS_SKILLS } = require('../engine/combat.js');

console.log("================================================================================");
console.log("   YGGDRASIL TREE OF LIFE, LEVEL 1-100 & CROSS-SKILLS TEST SUITE               ");
console.log("================================================================================");

// TEST 1: Level 1 to 100 Progression and Cap
console.log("\n--- TEST 1: Level 1 to 100 Progression ---");
{
    const warrior = new Character(CHARACTER_CLASS.SUPER_SOLDIER, 0, 0);
    assert.strictEqual(warrior.level, 1);
    assert.strictEqual(warrior.maxLevel, 100);

    // Gain sufficient EXP to reach level 100
    warrior.gainExp(15000000);
    assert.strictEqual(warrior.level, 100, "Warrior must cap at level 100");
    assert(warrior.skillPoints >= 100, "Warrior must earn at least 100 SP across 100 levels + milestone bonuses");
    assert(warrior.maxHp >= 2000, `Warrior Max HP scaled to level 100: ${warrior.maxHp}`);

    // Gaining more EXP does not exceed level 100
    warrior.gainExp(500000);
    assert.strictEqual(warrior.level, 100, "Level cannot exceed 100");
    console.log("✔ Passed: Level 100 cap, SP milestones, and stat scaling verified.");
}

// TEST 2: Distinct Class Skill Unlock Levels
console.log("\n--- TEST 2: Distinct Class Skill Unlock Levels from 1 to 100 ---");
{
    const classes = Object.keys(CLASS_SKILL_TREES);
    assert.strictEqual(classes.length, 5, "5 character classes must have defined skill trees");

    const unlockLevelsByClass = {};
    for (const cls of classes) {
        const tree = CLASS_SKILL_TREES[cls];
        const classExclusiveSkills = tree.filter(s => !s.isCrossSkill);
        assert(classExclusiveSkills.length >= 9, `${cls} must have at least 9 class-exclusive skills (including Lv 100 pinnacle)`);
        
        // Check Lv 100 Pinnacle skill
        const pinnacle = classExclusiveSkills.find(s => s.unlockLevel === 100);
        assert.ok(pinnacle, `${cls} must have a Level 100 Pinnacle skill`);
        assert.strictEqual(pinnacle.tier, 5, `${cls} Pinnacle skill must be Tier 5 (Crown)`);

        unlockLevelsByClass[cls] = classExclusiveSkills.map(s => s.unlockLevel);
    }

    // Verify distinct unlock levels across classes
    assert.notDeepStrictEqual(unlockLevelsByClass.SUPER_SOLDIER, unlockLevelsByClass.TECHNO_MAGE);
    assert.notDeepStrictEqual(unlockLevelsByClass.TECHNO_MAGE, unlockLevelsByClass.FARMER_GOD);
    assert.notDeepStrictEqual(unlockLevelsByClass.FARMER_GOD, unlockLevelsByClass.CHRONO_GLITCHER);
    assert.notDeepStrictEqual(unlockLevelsByClass.CHRONO_GLITCHER, unlockLevelsByClass.SOLARION_ARCHITECT);

    console.log("✔ Passed: Distinct leveling milestones for all 5 classes verified.");
}

// TEST 3: Multi-Rank Cross-Skills Upgradeable up to Rank 5
console.log("\n--- TEST 3: Multi-Rank Cross-Skills (Ranks 1 to 5) ---");
{
    assert.strictEqual(CROSS_SKILLS.length, 5, "Must define 5 Cross-Skills");
    for (const cs of CROSS_SKILLS) {
        assert.strictEqual(cs.isCrossSkill, true);
        assert.strictEqual(cs.maxRank, 5, `${cs.name} must support up to Rank 5`);
    }

    const testChar = new Character(CHARACTER_CLASS.CHRONO_GLITCHER, 0, 0);
    testChar.level = 60;
    testChar.skillPoints = 20;

    const baseHp = testChar.maxHp;
    // Rank 1
    assert.strictEqual(testChar.unlockSkill('cross_aether_vitality'), true);
    assert.strictEqual(testChar.getSkillRank('cross_aether_vitality'), 1);
    assert.strictEqual(testChar.maxHp, baseHp + 25);

    // Rank 2
    assert.strictEqual(testChar.unlockSkill('cross_aether_vitality'), true);
    assert.strictEqual(testChar.getSkillRank('cross_aether_vitality'), 2);
    assert.strictEqual(testChar.maxHp, baseHp + 50);

    // Rank 3, 4, 5
    assert.strictEqual(testChar.unlockSkill('cross_aether_vitality'), true); // 3
    assert.strictEqual(testChar.unlockSkill('cross_aether_vitality'), true); // 4
    assert.strictEqual(testChar.unlockSkill('cross_aether_vitality'), true); // 5
    assert.strictEqual(testChar.getSkillRank('cross_aether_vitality'), 5);
    assert.strictEqual(testChar.maxHp, baseHp + 125);

    // Rank 6 (Exceeds maxRank 5)
    assert.strictEqual(testChar.unlockSkill('cross_aether_vitality'), false, "Cannot exceed maxRank 5");
    assert.strictEqual(testChar.getSkillRank('cross_aether_vitality'), 5);

    console.log("✔ Passed: Multi-rank Cross-Skill progression up to Rank 5 verified.");
}

// TEST 4: Pioneer System Mechanics
console.log("\n--- TEST 4: Pioneer System Mechanics ---");
{
    const char = new Character(CHARACTER_CLASS.SOLARION_ARCHITECT, 0, 0);
    const initialHp = char.maxHp;
    const initialSpeed = char.speed;

    // Apply Rank 1
    char.applyPioneerPerks(1);
    assert.strictEqual(char.pioneerRank, 1);
    assert.strictEqual(char.scavengingYieldBonus, 0.05);

    // Apply Rank 4
    char.applyPioneerPerks(4);
    assert.strictEqual(char.pioneerRank, 4);
    assert(char.maxHp >= initialHp + 15, "Rank 2+ grants +15 Max HP");
    assert(char.parryWindowScale >= 1.25, "Rank 3+ grants +25% parry window");
    assert(char.speed >= initialSpeed * 1.10, "Rank 4+ grants +10% move speed");

    // Apply Rank 5
    char.applyPioneerPerks(5);
    assert.strictEqual(char.hasGenesisGodhood, true, "Rank 5 grants Genesis Godhood");

    console.log("✔ Passed: Pioneer Rank 1-5 passive perks verified.");
}

console.log("\n================================================================================");
console.log("   ALL LEVEL 100, YGGDRASIL TREE & CROSS-SKILL TESTS PASSED!                   ");
console.log("================================================================================\n");
