import * as Phaser from 'phaser';
import { BaseLevel, LevelConfig } from './BaseLevel';
import { Enemy } from '../entities/Enemy';
import { Ally } from '../entities/Ally';
import { SkillOrb } from '../entities/SkillOrb';
import { Skill } from '../systems/GameState';

/**
 * Level 1 — City
 * Environment: urban rooftops and streets
 * Skill unlocked: DASH
 */
export class Level1_City extends BaseLevel {
    private platSprites: Phaser.GameObjects.Sprite[] = [];

    constructor() { super('Level1_City'); }

    getLevelConfig(): LevelConfig {
        return {
            bgColor: '#1a1a2e',
            groundColor: 0x444455,
            platformColor: 0x667788,
            nextScene: 'BossArena',
            skillToUnlock: Skill.DASH,
            allyPartLabel: 'Quantum Engine Core',
            enemyCount: 5,
            enemyHp: 60,
            enemyDmg: 15,
        };
    }

    buildPlatforms() {
        this.makeGround();

        // City platforms — static sprite overlays
        this.makeCityPlatform(200, 620, 180);
        this.makeCityPlatform(500, 560, 160);
        this.makeCityPlatform(780, 500, 200);
        this.makeCityPlatform(1050, 580, 140);
        this.makeCityPlatform(1300, 520, 200);
        this.makeCityPlatform(1580, 600, 160);
        this.makeCityPlatform(1800, 540, 220);
        this.makeCityPlatform(2100, 480, 180);
        this.makeCityPlatform(2380, 560, 200);
        this.makeCityPlatform(2650, 620, 160);
        this.makeCityPlatform(2900, 560, 180);

        // Rooftops
        this.makeCityPlatform(380, 400, 200, 16);
        this.makeCityPlatform(880, 360, 200, 16);
        this.makeCityPlatform(1480, 420, 200, 16);
    }

    /** Create a platform using the city sprite directly as physics body. */
    private makeCityPlatform(x: number, y: number, w: number, h = 24) {
        const scaleX = w / 156;
        const scaleY = h / 36;
        const sprite = this.add.sprite(x + w / 2, y, 'city_plat_wide', 0);
        sprite.setScale(scaleX, scaleY);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(2);
        this.physics.add.existing(sprite, true);  // static body
        this.platforms.add(sprite);
        this.platSprites.push(sprite);
    }

    placeActors() {
        const positions = [350, 680, 1100, 1650, 2300];
        positions.forEach(x => {
            const e = new Enemy(this, x, 720, this.player, this.config.enemyHp, this.config.enemyDmg);
            this.enemies.push(e);
        });

        this.ally = new Ally(this, 1490, 436, this.player, this.config.allyPartLabel);
        this.skillOrb = new SkillOrb(this, 2500, 690, Skill.DASH);

        this.createCityBackdrop();
        this.createRain();
        this.createThunder();
    }

    private createRain() {
        this.add.particles(0, -10, 'raindrop', {
            x: { min: 0, max: 1024 },
            lifespan: 1400,
            speedY: { min: 300, max: 500 },
            speedX: { min: -50, max: -20 },
            alpha: { start: 0.4, end: 0 },
            scale: { start: 0.8, end: 0.3 },
            quantity: 2,
            frequency: 30,
        }).setDepth(50).setScrollFactor(0);
    }

    private createCityBackdrop() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x0d0d1e, 1);
        gfx.fillRect(0, 0, 3200, 480);

        const buildings: number[][] = [
            [0, 200, 120, 550], [150, 280, 90, 470], [280, 150, 140, 600],
            [460, 220, 100, 530], [600, 180, 120, 570], [760, 250, 80, 500],
            [880, 130, 150, 620], [1080, 200, 110, 550], [1240, 170, 130, 580],
            [1420, 140, 120, 610], [1600, 210, 100, 540], [1760, 160, 140, 590],
            [1960, 200, 110, 550], [2120, 180, 130, 570], [2310, 150, 120, 600],
            [2490, 220, 100, 530], [2650, 170, 140, 580], [2850, 200, 120, 550],
            [3020, 160, 110, 590],
        ];
        gfx.fillStyle(0x111122, 1);
        buildings.forEach(([x, y, w, h]) => gfx.fillRect(x, y, w, h));

        // Draw windows only inside each building
        gfx.fillStyle(0xffff88, 0.6);
        buildings.forEach(([bx, by, bw, bh]) => {
            const padX = 8, padY = 12, winW = 8, winH = 10, gapX = 20, gapY = 22;
            for (let wx = bx + padX; wx + winW < bx + bw - padX; wx += gapX) {
                for (let wy = by + padY; wy + winH < by + bh - padY; wy += gapY) {
                    if (Math.random() > 0.4) {
                        gfx.fillRect(wx, wy, winW, winH);
                    }
                }
            }
        });
    }

    private createThunder() {
        // Flash overlay for lightning strikes
        const flash = this.add.rectangle(512, 384, 1024, 768, 0xffffff)
            .setScrollFactor(0).setDepth(80).setAlpha(0);

        // Lightning bolt graphic (drawn procedurally)
        const bolt = this.add.graphics().setDepth(79).setScrollFactor(0).setAlpha(0);

        const randInt = (min: number, max: number) =>
            Math.floor(Math.random() * (max - min + 1)) + min;

        let active = true;
        this.events.once('shutdown', () => { active = false; });

        const strike = () => {
            if (!active) return;

            // Draw a jagged lightning bolt
            bolt.clear();
            bolt.lineStyle(3, 0xccddff, 1);
            const startX = randInt(100, 924);
            let x = startX;
            let y = 0;
            bolt.beginPath();
            bolt.moveTo(x, y);
            for (let i = 0; i < 15 && y < 300; i++) {
                x += randInt(-30, 30);
                y += randInt(20, 50);
                bolt.lineTo(x, y);
            }
            bolt.strokePath();

            // Branch bolt
            bolt.lineStyle(1.5, 0xaabbee, 0.7);
            const branchY = randInt(60, 150);
            const branchX = startX + randInt(-20, 20);
            bolt.beginPath();
            bolt.moveTo(branchX, branchY);
            let bx = branchX;
            let by = branchY;
            for (let i = 0; i < 4; i++) {
                bx += randInt(-25, 25);
                by += randInt(15, 35);
                bolt.lineTo(bx, by);
            }
            bolt.strokePath();

            // Flash + fade
            bolt.setAlpha(1);
            flash.setAlpha(0.15);

            this.tweens.add({
                targets: [bolt, flash],
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (!active) return;
                    // Sometimes double-flash
                    if (Math.random() < 0.4) {
                        this.time.delayedCall(100, () => {
                            if (!active) return;
                            flash.setAlpha(0.08);
                            this.tweens.add({ targets: flash, alpha: 0, duration: 150 });
                        });
                    }
                },
            });

            // Schedule next strike
            this.time.delayedCall(randInt(3000, 8000), strike);
        };

        // First strike after a short delay
        this.time.delayedCall(randInt(1000, 3000), strike);
    }
}
