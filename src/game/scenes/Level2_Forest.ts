import * as Phaser from 'phaser';
import { BaseLevel, LevelConfig } from './BaseLevel';
import { Ally } from '../entities/Ally';
import { Soldier } from '../entities/Soldier';
import { SkillOrb } from '../entities/SkillOrb';
import { Skill } from '../systems/GameState';

/** Surface y-coordinate in the 1024×1024 platform image (top of the dirt mound). */
const PLAT_SURFACE_Y = 555;
const PLAT_IMG_SIZE = 1024;

/**
 * Level 2 — Forest
 * Environment: dense tropical forest by day
 * Skill unlocked: COMBO PUNCH
 */
export class Level2_Forest extends BaseLevel {
    constructor() { super('Level2_Forest'); }

    getLevelConfig(): LevelConfig {
        return {
            bgColor: '#1a3a1a',
            groundColor: 0x4a6a28,
            platformColor: 0x5a7a36,
            nextScene: 'Level3_Lab',
            skillToUnlock: Skill.FIST_LAUNCH,
            allyPartLabel: 'Warp Drive Crystal',
            enemyCount: 7,
            enemyHp: 80,
            enemyDmg: 20,
        };
    }

    buildPlatforms() {
        this.makeGround();
        // Tree branch platforms
        this.makeForestPlatform(100, 640, 200);
        this.makeForestPlatform(380, 580, 160);
        this.makeForestPlatform(620, 520, 200);
        this.makeForestPlatform(900, 460, 180);
        this.makeForestPlatform(1140, 540, 140);
        this.makeForestPlatform(1360, 480, 200);
        this.makeForestPlatform(1650, 420, 160);
        this.makeForestPlatform(1900, 500, 180);
        this.makeForestPlatform(2180, 440, 200);
        this.makeForestPlatform(2460, 380, 160);
        this.makeForestPlatform(2700, 460, 200);
        this.makeForestPlatform(2980, 540, 180);

        // High branches
        this.makeForestPlatform(750, 340, 120);
        this.makeForestPlatform(1200, 300, 140);
        this.makeForestPlatform(1750, 280, 120);
        this.makeForestPlatform(2300, 260, 140);
    }

    /** Create a platform with the tree-branch sprite and a thin physics body. */
    private makeForestPlatform(x: number, y: number, w: number) {
        const scale = w / PLAT_IMG_SIZE;

        // Visual sprite — origin at the surface so sprite.y = platform surface y
        const sprite = this.add.sprite(x + w / 2, y, 'forest_plat');
        sprite.setScale(scale);
        sprite.setOrigin(0.5, PLAT_SURFACE_Y / PLAT_IMG_SIZE);
        sprite.setDepth(2);

        // Thin invisible physics body for collision
        const bodyH = 16;
        const key = `fplat_${x}_${y}`;
        const gfx = this.add.graphics();
        gfx.fillStyle(0x000000, 0);
        gfx.fillRect(0, 0, w, bodyH);
        gfx.generateTexture(key, w, bodyH);
        gfx.destroy();
        const plat = this.platforms.create(x + w / 2, y, key) as Phaser.Physics.Arcade.Sprite;
        plat.setAlpha(0);
        plat.refreshBody();
    }

    placeActors() {
        const positions = [320, 750, 1100, 1500, 1900, 2350, 2750];
        positions.forEach(x => {
            const s = new Soldier(this, x, 720, this.player, this.config.enemyHp, this.config.enemyDmg);
            this.enemies.push(s as any);

            // Bullet → player collision
            this.physics.add.overlap(this.player, s.bullets, (_player, bullet) => {
                const b = bullet as Phaser.Physics.Arcade.Sprite;
                b.setActive(false).setVisible(false);
                const body = b.body as Phaser.Physics.Arcade.Body;
                if (body) { body.stop(); body.enable = false; }
                this.player.takeHit(s.damage);
            });
        });

        this.ally = new Ally(this, 2310, 276, this.player, this.config.allyPartLabel);
        this.skillOrb = new SkillOrb(this, 2600, 690, Skill.FIST_LAUNCH);

        this.createForestBackdrop();
        this.createSunRays();
        this.createFloatingParticles();
    }

    private createForestBackdrop() {
        const gfx = this.add.graphics().setDepth(0);

        // Dappled canopy shade base
        gfx.fillStyle(0x142e14, 1);
        gfx.fillRect(0, 0, 3200, 768);

        // Pollen / floating leaf specks
        gfx.fillStyle(0xccdd88, 0.4);
        for (let i = 0; i < 120; i++) {
            gfx.fillCircle(Math.random() * 3200, Math.random() * 500, Math.random() < 0.6 ? 1 : 2);
        }

        // Background tree trunks + canopy (same loop so they align)
        const canopyColors = [0x2a6a1a, 0x1d5010, 0x3a7a28];
        const fruitColors = [0xff3333, 0xff8800, 0xffee00, 0xff55aa, 0xaa44ff, 0x44ddff];
        for (let tx = 0; tx < 3200; tx += 80) {
            const h = 200 + Math.random() * 300;
            const trunkTop = 768 - h;
            const cx = tx + 35;

            // Warm brown bark
            gfx.fillStyle(0x4a3020, 1);
            gfx.fillRect(tx + 20, trunkTop, 30, h);

            const radius = 50 + Math.random() * 40;
            gfx.fillStyle(canopyColors[Math.floor(Math.random() * canopyColors.length)], 1);
            gfx.fillCircle(cx, trunkTop - radius * 0.4, radius);

            // Colourful fruits hanging in the canopy
            const canopyCY = trunkTop - radius * 0.4;
            const fruitCount = 2 + Math.floor(Math.random() * 4);
            for (let f = 0; f < fruitCount; f++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * (radius * 0.75);
                const fx = cx + Math.cos(angle) * dist;
                const fy = canopyCY + Math.sin(angle) * dist;
                const fc = fruitColors[Math.floor(Math.random() * fruitColors.length)];
                const fr = 3 + Math.random() * 3;

                // Fruit body
                gfx.fillStyle(fc, 0.9);
                gfx.fillCircle(fx, fy, fr);
                // Bright highlight
                gfx.fillStyle(0xffffff, 0.4);
                gfx.fillCircle(fx - fr * 0.3, fy - fr * 0.3, fr * 0.35);
            }
        }

        // Ground ferns and undergrowth
        const fernColors = [0x3a8a2a, 0x2d7020, 0x48a035];
        for (let fx = 0; fx < 3200; fx += 60) {
            const fc = fernColors[Math.floor(Math.random() * fernColors.length)];
            gfx.fillStyle(fc, 0.7);
            const fh = 10 + Math.random() * 14;
            gfx.fillTriangle(fx + 30, 748 - fh, fx + 25, 748, fx + 35, 748);
            gfx.fillTriangle(fx + 40, 748 - fh * 0.8, fx + 36, 748, fx + 44, 748);
        }

        // Occasional small flowers on the ground
        const flowerColors = [0xff6688, 0xffaa44, 0xffee55, 0xcc88ff];
        for (let bx = 0; bx < 3200; bx += 200) {
            const fc = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            gfx.fillStyle(fc, 0.6);
            gfx.fillCircle(bx + 80 + Math.random() * 40, 740 + Math.random() * 6, 3);
        }
    }

    /** Tropical-style sun rays filtering through the canopy with floating dust. */
    private createSunRays() {
        const GROUND_Y = 748;
        const rayDefs = [
            { x: 150,  w: 50,  h: GROUND_Y, a: 0.12 },
            { x: 430,  w: 70,  h: GROUND_Y, a: 0.08 },
            { x: 680,  w: 55,  h: GROUND_Y, a: 0.15 },
            { x: 960,  w: 85,  h: GROUND_Y, a: 0.06 },
            { x: 1220, w: 48,  h: GROUND_Y, a: 0.13 },
            { x: 1490, w: 72,  h: GROUND_Y, a: 0.09 },
            { x: 1760, w: 58,  h: GROUND_Y, a: 0.14 },
            { x: 2040, w: 78,  h: GROUND_Y, a: 0.07 },
            { x: 2310, w: 52,  h: GROUND_Y, a: 0.16 },
            { x: 2580, w: 68,  h: GROUND_Y, a: 0.10 },
            { x: 2850, w: 55,  h: GROUND_Y, a: 0.13 },
            { x: 3060, w: 45,  h: GROUND_Y, a: 0.08 },
        ];

        rayDefs.forEach((r, i) => {
            const gfx = this.add.graphics();
            gfx.setDepth(10);
            gfx.setBlendMode(Phaser.BlendModes.ADD);
            gfx.setAlpha(r.a);

            const topHalf = r.w * 0.12;
            const botHalf = r.w * 0.5;

            // Outer soft glow
            gfx.fillStyle(0xffcc44, 0.12);
            this.drawRayTrapezoid(gfx, r.x, topHalf, botHalf, r.h);

            // Mid beam
            gfx.fillStyle(0xffe080, 0.25);
            this.drawRayTrapezoid(gfx, r.x, topHalf * 0.65, botHalf * 0.55, r.h);

            // Bright core
            gfx.fillStyle(0xfff4cc, 0.5);
            this.drawRayTrapezoid(gfx, r.x, topHalf * 0.3, botHalf * 0.2, r.h);

            // Ground glow where ray lands
            gfx.fillStyle(0xffee88, 0.2);
            gfx.fillEllipse(r.x, r.h + 10, r.w * 0.7, 20);

            // Shimmer animation
            this.tweens.add({
                targets: gfx,
                alpha: { from: r.a * 0.25, to: r.a },
                duration: 3000 + i * 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 250,
            });
        });

        this.createDustMotes();
    }

    private drawRayTrapezoid(
        gfx: Phaser.GameObjects.Graphics,
        cx: number, topHalf: number, botHalf: number, h: number,
    ) {
        gfx.beginPath();
        gfx.moveTo(cx - topHalf, 0);
        gfx.lineTo(cx + topHalf, 0);
        gfx.lineTo(cx + botHalf, h);
        gfx.lineTo(cx - botHalf, h);
        gfx.closePath();
        gfx.fillPath();
    }

    /** Golden dust motes drifting through the light beams. */
    private createDustMotes() {
        if (!this.textures.exists('forest_dust')) {
            const gfx = this.add.graphics();
            gfx.fillStyle(0xffeedd, 1);
            gfx.fillCircle(4, 4, 4);
            gfx.generateTexture('forest_dust', 8, 8);
            gfx.destroy();
        }

        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 3200;
            const y = 50 + Math.random() * 500;
            const mote = this.add.image(x, y, 'forest_dust');
            mote.setDepth(11);
            mote.setBlendMode(Phaser.BlendModes.ADD);
            mote.setAlpha(0.08 + Math.random() * 0.15);
            mote.setScale(0.2 + Math.random() * 0.6);

            this.tweens.add({
                targets: mote,
                x: x + (Math.random() - 0.5) * 50,
                y: y + 20 + Math.random() * 30,
                alpha: { from: mote.alpha, to: mote.alpha * 0.2 },
                duration: 5000 + Math.random() * 5000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 4000,
            });
        }
    }

    /** Leaves and flower petals drifting through the air. */
    private createFloatingParticles() {
        this.createParticleTextures();

        // Background leaves (behind platforms, gentle drift)
        this.add.particles(0, 0, 'forest_leaf_tex', {
            x: { min: 0, max: 3200 },
            y: -20,
            speedX: { min: -50, max: -15 },
            speedY: { min: 15, max: 40 },
            lifespan: { min: 10000, max: 16000 },
            scale: { start: 0.7, end: 0.3 },
            alpha: { start: 0.5, end: 0 },
            rotate: { start: 0, end: 720 },
            frequency: 500,
            quantity: 1,
            tint: [0x4a9a3a, 0x6aaa4a, 0x8a7a2a, 0xaa8a3a, 0x3a7a2a],
        }).setDepth(1);

        // Foreground leaves (in front of action, subtle)
        this.add.particles(0, 0, 'forest_leaf_tex', {
            x: { min: 0, max: 3200 },
            y: -20,
            speedX: { min: -60, max: -20 },
            speedY: { min: 20, max: 50 },
            lifespan: { min: 8000, max: 12000 },
            scale: { start: 1.0, end: 0.4 },
            alpha: { start: 0.3, end: 0 },
            rotate: { start: 0, end: -540 },
            frequency: 1200,
            quantity: 1,
            tint: [0x5aaa4a, 0x7aba5a, 0x9a8a3a],
        }).setDepth(12);

        // Flower petals (gentle flutter)
        this.add.particles(0, 0, 'forest_petal_tex', {
            x: { min: 0, max: 3200 },
            y: -20,
            speedX: { min: -35, max: -10 },
            speedY: { min: 10, max: 30 },
            lifespan: { min: 12000, max: 20000 },
            scale: { start: 0.6, end: 0.2 },
            alpha: { start: 0.6, end: 0 },
            rotate: { start: 0, end: 360 },
            frequency: 800,
            quantity: 1,
            tint: [0xff88aa, 0xffaacc, 0xffffcc, 0xffeeff, 0xffcc88],
        }).setDepth(12);
    }

    private createParticleTextures() {
        // Leaf: pointed ellipse shape (white base, tinted by emitter)
        if (!this.textures.exists('forest_leaf_tex')) {
            const gfx = this.add.graphics();
            gfx.fillStyle(0xffffff, 1);
            gfx.beginPath();
            gfx.moveTo(0, 4);
            gfx.lineTo(4, 1);
            gfx.lineTo(7, 0);
            gfx.lineTo(10, 1);
            gfx.lineTo(14, 4);
            gfx.lineTo(10, 7);
            gfx.lineTo(7, 8);
            gfx.lineTo(4, 7);
            gfx.closePath();
            gfx.fillPath();
            gfx.lineStyle(1, 0xdddddd, 0.5);
            gfx.lineBetween(2, 4, 12, 4);
            gfx.generateTexture('forest_leaf_tex', 14, 8);
            gfx.destroy();
        }

        // Petal: teardrop shape
        if (!this.textures.exists('forest_petal_tex')) {
            const gfx = this.add.graphics();
            gfx.fillStyle(0xffffff, 1);
            gfx.beginPath();
            gfx.moveTo(4, 0);
            gfx.lineTo(7, 2);
            gfx.lineTo(8, 5);
            gfx.lineTo(4, 8);
            gfx.lineTo(0, 5);
            gfx.lineTo(1, 2);
            gfx.closePath();
            gfx.fillPath();
            gfx.generateTexture('forest_petal_tex', 8, 8);
            gfx.destroy();
        }
    }
}
