const { KinematicBody, Vector2 } = require('../engine/physics.js');

function runTest() {
    console.log("==================================================");
    console.log("       4-DIRECTIONAL FACING & WALK TIMER TEST     ");
    console.log("==================================================");

    const body = new KinematicBody(100, 100);

    // Initial state: Default facing DOWN
    if (body.cardinalFacing !== 'DOWN') throw new Error(`Expected initial DOWN, got ${body.cardinalFacing}`);
    console.log("[PASS] Initial cardinal facing is DOWN");

    // Face UP
    body.setInput(0, -1);
    if (body.cardinalFacing !== 'UP') throw new Error(`Expected UP, got ${body.cardinalFacing}`);
    console.log("[PASS] Input (0, -1) sets cardinal facing to UP");

    // Face LEFT
    body.setInput(-1, 0);
    if (body.cardinalFacing !== 'LEFT') throw new Error(`Expected LEFT, got ${body.cardinalFacing}`);
    console.log("[PASS] Input (-1, 0) sets cardinal facing to LEFT");

    // Face RIGHT
    body.setInput(1, 0);
    if (body.cardinalFacing !== 'RIGHT') throw new Error(`Expected RIGHT, got ${body.cardinalFacing}`);
    console.log("[PASS] Input (1, 0) sets cardinal facing to RIGHT");

    // Face DOWN again
    body.setInput(0, 1);
    if (body.cardinalFacing !== 'DOWN') throw new Error(`Expected DOWN, got ${body.cardinalFacing}`);
    console.log("[PASS] Input (0, 1) sets cardinal facing to DOWN");

    // Diagonal bias test: mostly horizontal
    body.setInput(1, 0.5);
    if (body.cardinalFacing !== 'RIGHT') throw new Error(`Expected RIGHT for (1, 0.5), got ${body.cardinalFacing}`);
    console.log("[PASS] Diagonal (1, 0.5) biases to RIGHT");

    // Diagonal bias test: mostly vertical
    body.setInput(0.4, -1);
    if (body.cardinalFacing !== 'UP') throw new Error(`Expected UP for (0.4, -1), got ${body.cardinalFacing}`);
    console.log("[PASS] Diagonal (0.4, -1) biases to UP");

    // Walk timer updates while moving
    body.vel.set(100, 0);
    body.update(0.1, null);
    if (body.walkTimer <= 0) throw new Error("Walk timer did not increment during movement");
    console.log(`[PASS] Walk timer incremented smoothly to ${body.walkTimer.toFixed(3)}`);

    // Walk timer resets when stopped
    body.setInput(0, 0);
    body.vel.set(0, 0);
    body.update(0.1, null);
    if (body.walkTimer !== 0) throw new Error("Walk timer did not reset when stopped");
    console.log("[PASS] Walk timer resets to 0 when idle");

    console.log("==================================================");
    console.log("RESULTS: All 4-Directional & Walk Tests Passed!");
    console.log("==================================================");
}

runTest();
