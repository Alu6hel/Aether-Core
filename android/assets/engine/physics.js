/**
 * Aether-Core: Kinematics & Sub-Pixel Collision Physics
 * 
 * Provides responsive 8-direction analog movement with momentum,
 * sub-pixel precision, and corner-assisted collision sliding.
 */

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const len = this.length();
        if (len > 0.0001) {
            this.x /= len;
            this.y /= len;
        } else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    clone() {
        return new Vector2(this.x, this.y);
    }
}

class AABB {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.w = width;
        this.h = height;
    }

    overlaps(other) {
        return (
            this.x < other.x + other.w &&
            this.x + this.w > other.x &&
            this.y < other.y + other.h &&
            this.y + this.h > other.y
        );
    }
}

class KinematicBody {
    constructor(x, y, width = 12, height = 12) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2(0, 0);
        this.input = new Vector2(0, 0);
        
        // Physics constants
        this.maxSpeed = 120.0;     // Pixels per second
        this.accelTime = 0.12;     // 0.12s to reach max speed (snappy)
        this.decelTime = 0.08;     // 0.08s to stop (crisp brake)
        this.accel = this.maxSpeed / this.accelTime;
        this.decel = this.maxSpeed / this.decelTime;

        // Collision bounds (smaller than 16x16 tile to allow tight navigation)
        this.boxWidth = width;
        this.boxHeight = height;
        this.cornerAssistTolerance = 4.0; // 4px corner slide
        
        // State
        this.facing = new Vector2(0, 1); // Default facing down
        this.isMoving = false;
        this.isSkidding = false;
    }

    setInput(x, y) {
        this.input.set(x, y);
        if (this.input.length() > 1.0) {
            this.input.normalize();
        }
        if (this.input.length() > 0.1) {
            this.facing.set(this.input.x, this.input.y).normalize();
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }
    }

    update(dt, map) {
        // Target velocity based on analog input
        const targetVel = this.input.clone().scale(this.maxSpeed);

        if (this.isMoving) {
            // Accelerate towards target velocity
            const diffX = targetVel.x - this.vel.x;
            const diffY = targetVel.y - this.vel.y;
            const maxDelta = this.accel * dt;

            this.vel.x += Math.sign(diffX) * Math.min(Math.abs(diffX), maxDelta);
            this.vel.y += Math.sign(diffY) * Math.min(Math.abs(diffY), maxDelta);
            this.isSkidding = false;
        } else {
            // Decelerate (apply braking friction)
            const speed = this.vel.length();
            if (speed > 0.1) {
                const drop = this.decel * dt;
                const newSpeed = Math.max(0, speed - drop);
                this.vel.scale(newSpeed / speed);
                this.isSkidding = speed > (this.maxSpeed * 0.4);
            } else {
                this.vel.set(0, 0);
                this.isSkidding = false;
            }
        }

        // Move with corner-assisted collision
        this.moveWithCollision(this.vel.x * dt, this.vel.y * dt, map);
    }

    moveWithCollision(dx, dy, map) {
        if (!map) {
            this.pos.x += dx;
            this.pos.y += dy;
            return;
        }

        // Try moving X axis first
        if (Math.abs(dx) > 0.0001) {
            const nextX = this.pos.x + dx;
            if (!this.checkTileCollision(nextX, this.pos.y, map)) {
                this.pos.x = nextX;
            } else {
                // Corner assist for vertical glide when hitting horizontal wall
                this.cornerSlideY(map, Math.sign(dx));
                this.vel.x = 0;
            }
        }

        // Try moving Y axis
        if (Math.abs(dy) > 0.0001) {
            const nextY = this.pos.y + dy;
            if (!this.checkTileCollision(this.pos.x, nextY, map)) {
                this.pos.y = nextY;
            } else {
                // Corner assist for horizontal glide when hitting vertical wall
                this.cornerSlideX(map, Math.sign(dy));
                this.vel.y = 0;
            }
        }
    }

    checkTileCollision(x, y, map) {
        const left = Math.floor((x - this.boxWidth / 2) / map.tileSize);
        const right = Math.floor((x + this.boxWidth / 2 - 0.01) / map.tileSize);
        const top = Math.floor((y - this.boxHeight / 2) / map.tileSize);
        const bottom = Math.floor((y + this.boxHeight / 2 - 0.01) / map.tileSize);

        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (map.isSolid(tx, ty)) {
                    return true;
                }
            }
        }
        return false;
    }

    cornerSlideY(map, dirX) {
        // Nudge up or down if within corner assist tolerance
        const testOffsets = [-this.cornerAssistTolerance, this.cornerAssistTolerance];
        for (const off of testOffsets) {
            if (!this.checkTileCollision(this.pos.x + dirX * 2, this.pos.y + off, map)) {
                this.pos.y += Math.sign(off) * 1.5;
                break;
            }
        }
    }

    cornerSlideX(map, dirY) {
        // Nudge left or right if within corner assist tolerance
        const testOffsets = [-this.cornerAssistTolerance, this.cornerAssistTolerance];
        for (const off of testOffsets) {
            if (!this.checkTileCollision(this.pos.x + off, this.pos.y + dirY * 2, map)) {
                this.pos.x += Math.sign(off) * 1.5;
                break;
            }
        }
    }

    getRenderPosition() {
        // Pixel-perfect rounding for rendering to avoid sprite tearing
        return {
            x: Math.round(this.pos.x),
            y: Math.round(this.pos.y)
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vector2, AABB, KinematicBody };
}
