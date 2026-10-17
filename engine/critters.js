/**
 * Aether-Core: Living World Wildlife & Ambient Particle Engine
 * 
 * Simulates interactive wildlife (hopping rabbits, fluttering butterflies,
 * luminescent night wisps/fireflies) and ambient atmospheric particles
 * (wind-blown leaves, drifting floral petals, and cottage chimney smoke).
 */

class CritterManager {
    constructor() {
        this.rabbits = [];
        this.butterflies = [];
        this.fireflies = [];
        this.windParticles = [];
        this.chimneyEmitters = [];
        this.chimneySmoke = [];
        this.windTimer = 0;
    }

    /**
     * Initializes wildlife for a specific area map
     */
    initForArea(areaId, mapWidth, mapHeight, prng = null) {
        this.rabbits = [];
        this.butterflies = [];
        this.fireflies = [];
        this.windParticles = [];
        this.chimneySmoke = [];

        const random = () => (prng ? prng.nextFloat() : Math.random());

        // Spawn Rabbits in Hamlet and Woods
        if (areaId === 'CINDERWATCH_HAMLET' || areaId === 'WHISPERING_WOODS') {
            const rabbitCount = areaId === 'WHISPERING_WOODS' ? 12 : 6;
            for (let i = 0; i < rabbitCount; i++) {
                this.rabbits.push({
                    x: 100 + random() * (mapWidth * 16 - 200),
                    y: 100 + random() * (mapHeight * 16 - 200),
                    vx: 0,
                    vy: 0,
                    facing: random() > 0.5 ? 1 : -1,
                    state: 'IDLE', // 'IDLE', 'NIBBLING', 'HOPPING', 'FLEEING'
                    stateTimer: 1.0 + random() * 2.5,
                    hopProgress: 0,
                    furColor: random() > 0.3 ? '#d8c29d' : '#8e7960' // Tan or brown
                });
            }
        }

        // Spawn Butterflies in Hamlet and Woods near vegetation
        if (areaId === 'CINDERWATCH_HAMLET' || areaId === 'WHISPERING_WOODS') {
            const butterflyColors = ['#f5cd79', '#546de5', '#e66767', '#63cdda', '#ea8685'];
            const butterflyCount = areaId === 'CINDERWATCH_HAMLET' ? 14 : 10;
            for (let i = 0; i < butterflyCount; i++) {
                const ox = 120 + random() * (mapWidth * 16 - 240);
                const oy = 120 + random() * (mapHeight * 16 - 240);
                this.butterflies.push({
                    x: ox,
                    y: oy,
                    originX: ox,
                    originY: oy,
                    color: butterflyColors[Math.floor(random() * butterflyColors.length)],
                    angle: random() * Math.PI * 2,
                    speed: 24 + random() * 16,
                    wingTimer: random() * 5.0,
                    wanderRadius: 45 + random() * 35
                });
            }
        }

        // Fireflies / Wisps (Always present, visually active at dusk/night)
        const fireflyCount = areaId === 'SUNKEN_GROTTO' ? 18 : 14;
        for (let i = 0; i < fireflyCount; i++) {
            this.fireflies.push({
                x: 80 + random() * (mapWidth * 16 - 160),
                y: 80 + random() * (mapHeight * 16 - 160),
                baseX: 80 + random() * (mapWidth * 16 - 160),
                baseY: 80 + random() * (mapHeight * 16 - 160),
                hue: areaId === 'SUNKEN_GROTTO' ? 185 : (random() > 0.5 ? 55 : 120), // Cyan or golden/emerald
                phase: random() * Math.PI * 2,
                speed: 1.2 + random() * 1.5,
                radius: 1.5 + random() * 1.5
            });
        }

        // Ambient Wind Particles (Windblown leaves / petals)
        for (let i = 0; i < 20; i++) {
            this.windParticles.push({
                x: random() * (mapWidth * 16),
                y: random() * (mapHeight * 16),
                vx: 30 + random() * 25,
                vy: 12 + random() * 15,
                rot: random() * Math.PI * 2,
                rotSpeed: (random() - 0.5) * 4.0,
                color: random() > 0.5 ? '#78e08f' : '#f8c291', // Leaf green or blossom pink
                size: 2.5 + random() * 1.5
            });
        }
    }

    addChimneyEmitter(x, y) {
        this.chimneyEmitters.push({ x, y, timer: 0 });
    }

    clearChimneys() {
        this.chimneyEmitters = [];
        this.chimneySmoke = [];
    }

    update(dt, playerPos, map, isNight = false) {
        this.windTimer += dt;

        // 1. Update Rabbits
        for (const rabbit of this.rabbits) {
            rabbit.stateTimer -= dt;

            // Check distance to player
            const dx = rabbit.x - playerPos.x;
            const dy = rabbit.y - playerPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Flee if player is close
            if (dist < 65 && rabbit.state !== 'FLEEING') {
                rabbit.state = 'FLEEING';
                rabbit.stateTimer = 1.2;
                const angle = Math.atan2(dy, dx);
                rabbit.vx = Math.cos(angle) * 110;
                rabbit.vy = Math.sin(angle) * 110;
                rabbit.facing = rabbit.vx >= 0 ? 1 : -1;
            }

            if (rabbit.state === 'FLEEING') {
                rabbit.hopProgress = (rabbit.hopProgress + dt * 6.0) % 1.0;
                rabbit.x += rabbit.vx * dt;
                rabbit.y += rabbit.vy * dt;

                // Clamp to map boundaries
                rabbit.x = Math.max(32, Math.min(map.width * 16 - 32, rabbit.x));
                rabbit.y = Math.max(32, Math.min(map.height * 16 - 32, rabbit.y));

                if (rabbit.stateTimer <= 0) {
                    rabbit.state = 'IDLE';
                    rabbit.vx = 0;
                    rabbit.vy = 0;
                    rabbit.stateTimer = 1.5 + Math.random() * 2.0;
                }
            } else if (rabbit.state === 'HOPPING') {
                rabbit.hopProgress = Math.min(1.0, rabbit.hopProgress + dt * 3.5);
                rabbit.x += rabbit.vx * dt;
                rabbit.y += rabbit.vy * dt;

                if (rabbit.hopProgress >= 1.0 || rabbit.stateTimer <= 0) {
                    rabbit.state = 'IDLE';
                    rabbit.vx = 0;
                    rabbit.vy = 0;
                    rabbit.hopProgress = 0;
                    rabbit.stateTimer = 1.0 + Math.random() * 3.0;
                }
            } else {
                // IDLE or NIBBLING
                if (rabbit.stateTimer <= 0) {
                    if (Math.random() < 0.45) {
                        // Start gentle hop
                        rabbit.state = 'HOPPING';
                        rabbit.stateTimer = 0.4;
                        rabbit.hopProgress = 0;
                        const angle = Math.random() * Math.PI * 2;
                        rabbit.vx = Math.cos(angle) * 35;
                        rabbit.vy = Math.sin(angle) * 35;
                        rabbit.facing = rabbit.vx >= 0 ? 1 : -1;
                    } else {
                        rabbit.state = Math.random() > 0.5 ? 'NIBBLING' : 'IDLE';
                        rabbit.stateTimer = 1.5 + Math.random() * 2.0;
                    }
                }
            }
        }

        // 2. Update Butterflies
        for (const b of this.butterflies) {
            b.wingTimer += dt * 9.0;
            b.angle += (Math.random() - 0.5) * 2.5 * dt;

            // Steer gently back toward origin if drifted too far
            const odx = b.originX - b.x;
            const ody = b.originY - b.y;
            const odist = Math.sqrt(odx * odx + ody * ody);
            if (odist > b.wanderRadius) {
                b.angle = Math.atan2(ody, odx) + (Math.random() - 0.5) * 0.5;
            }

            b.x += Math.cos(b.angle) * b.speed * dt;
            b.y += Math.sin(b.angle) * b.speed * dt;
        }

        // 3. Update Fireflies / Wisps
        for (const f of this.fireflies) {
            f.phase += f.speed * dt;
            f.x = f.baseX + Math.sin(f.phase) * 18;
            f.y = f.baseY + Math.cos(f.phase * 0.8) * 14;
        }

        // 4. Update Windblown Particles
        for (const p of this.windParticles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.rotSpeed * dt;

            // Wrap around map boundary
            if (p.x > map.width * 16) p.x = 0;
            if (p.y > map.height * 16) p.y = 0;
        }

        // 5. Update Chimney Smoke Emitters
        for (const ch of this.chimneyEmitters) {
            ch.timer += dt;
            if (ch.timer >= 0.35) {
                ch.timer = 0;
                this.chimneySmoke.push({
                    x: ch.x + (Math.random() - 0.5) * 3,
                    y: ch.y,
                    vx: 6 + Math.random() * 5,
                    vy: -14 - Math.random() * 8,
                    size: 2.0,
                    alpha: 0.65,
                    life: 1.8
                });
            }
        }

        // Update Smoke Puffs
        for (let i = this.chimneySmoke.length - 1; i >= 0; i--) {
            const sm = this.chimneySmoke[i];
            sm.life -= dt;
            if (sm.life <= 0) {
                this.chimneySmoke.splice(i, 1);
                continue;
            }
            sm.x += sm.vx * dt;
            sm.y += sm.vy * dt;
            sm.size += dt * 3.5;
            sm.alpha = Math.max(0, sm.alpha - dt * 0.38);
        }
    }

    render(ctx, cameraX, cameraY, isNight = false) {
        const camX = Math.round(cameraX);
        const camY = Math.round(cameraY);

        // 1. Render Chimney Smoke
        for (const sm of this.chimneySmoke) {
            const sx = sm.x - camX;
            const sy = sm.y - camY;
            if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) continue;
            ctx.fillStyle = `rgba(210, 218, 226, ${sm.alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, sm.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Render Rabbits
        for (const r of this.rabbits) {
            const sx = Math.round(r.x - camX);
            const sy = Math.round(r.y - camY);
            if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) continue;

            const hopY = r.state === 'HOPPING' || r.state === 'FLEEING' 
                ? Math.sin(r.hopProgress * Math.PI) * 5.5 
                : 0;

            const drawY = sy - hopY;
            const f = r.facing;

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 3, 4.5, 2.0, 0, 0, Math.PI * 2);
            ctx.fill();

            // Rabbit Body
            ctx.fillStyle = r.furColor;
            ctx.fillRect(sx - 3, drawY - 4, 7, 6);

            // Rabbit Head
            ctx.fillRect(sx + (f > 0 ? 2 : -4), drawY - 7, 4, 4);

            // Ears
            ctx.fillStyle = '#f8a5c2';
            ctx.fillRect(sx + (f > 0 ? 3 : -3), drawY - 10, 1, 3);
            ctx.fillRect(sx + (f > 0 ? 4 : -2), drawY - 10, 1, 3);

            // Fluffy Tail
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx + (f > 0 ? -4 : 4), drawY - 3, 2, 2);

            // Eye
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(sx + (f > 0 ? 4 : -3), drawY - 6, 1, 1);
        }

        // 3. Render Butterflies
        for (const b of this.butterflies) {
            const sx = Math.round(b.x - camX);
            const sy = Math.round(b.y - camY);
            if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) continue;

            const wingSpan = Math.abs(Math.sin(b.wingTimer)) * 3.5;

            // Small shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.fillRect(sx - 1, sy + 6, 3, 1);

            // Left Wing
            ctx.fillStyle = b.color;
            ctx.fillRect(sx - wingSpan, sy - 2, Math.max(1, wingSpan), 4);
            // Right Wing
            ctx.fillRect(sx + 1, sy - 2, Math.max(1, wingSpan), 4);
            // Body
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(sx, sy - 3, 1, 5);
        }

        // 4. Render Fireflies / Wisps
        for (const f of this.fireflies) {
            const sx = Math.round(f.x - camX);
            const sy = Math.round(f.y - camY);
            if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) continue;

            const pulse = (Math.sin(f.phase * 2.0) + 1.0) * 0.5;
            const alpha = isNight ? (0.4 + pulse * 0.55) : (0.15 + pulse * 0.2);

            // Soft radial aura
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, f.radius * 3.5);
            grad.addColorStop(0, `hsla(${f.hue}, 95%, 70%, ${alpha})`);
            grad.addColorStop(1, `hsla(${f.hue}, 95%, 70%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, f.radius * 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Core bright dot
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 1, sy - 1, 2, 2);
        }

        // 5. Render Windblown Leaves & Petals
        for (const p of this.windParticles) {
            const sx = Math.round(p.x - camX);
            const sy = Math.round(p.y - camY);
            if (sx < -10 || sx > ctx.canvas.width + 10 || sy < -10 || sy > ctx.canvas.height + 10) continue;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CritterManager };
}
