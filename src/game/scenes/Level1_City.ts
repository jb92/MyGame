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
    constructor() { super('Level1_City'); }

    getLevelConfig(): LevelConfig {
        return {
            bgColor: '#1a1a2e',
            groundColor: 0x444455,
            platformColor: 0x667788,
            nextScene: 'Level2_Forest',
            skillToUnlock: Skill.DASH,
            allyPartLabel: 'Quantum Engine Core',
            enemyCount: 5,
            enemyHp: 60,
            enemyDmg: 15,
        };
    }

    buildPlatforms() {
        this.makeGround();
        // City platform layout
        this.makePlatform(200, 620, 180);
        this.makePlatform(500, 560, 160);
        this.makePlatform(780, 500, 200);
        this.makePlatform(1050, 580, 140);
        this.makePlatform(1300, 520, 200);
        this.makePlatform(1580, 600, 160);
        this.makePlatform(1800, 540, 220);
        this.makePlatform(2100, 480, 180);
        this.makePlatform(2380, 560, 200);
        this.makePlatform(2650, 620, 160);
        this.makePlatform(2900, 560, 180);
        // Buildings (tall platforms as walls/edges)
        this.makePlatform(400, 400, 30, 320);
        this.makePlatform(900, 360, 30, 360);
        this.makePlatform(1500, 420, 30, 300);
        this.makePlatform(2200, 380, 30, 340);
        this.makePlatform(2800, 400, 30, 320);
        // Rooftops
        this.makePlatform(380, 400, 200, 16);
        this.makePlatform(880, 360, 200, 16);
        this.makePlatform(1480, 420, 200, 16);
    }

    placeActors() {
        // Enemies spread across the level
        const positions = [350, 680, 1100, 1650, 2300];
        positions.forEach(x => {
            const e = new Enemy(this, x, 680, this.player, this.config.enemyHp, this.config.enemyDmg);
            this.enemies.push(e);
        });

        // Ally (gives quantum engine core)
        this.ally = new Ally(this, 2500, 680, this.player, this.config.allyPartLabel);

        // Skill orb: DASH — on a rooftop, hard to reach
        this.skillOrb = new SkillOrb(this, 1490, 360, Skill.DASH);

        // Background city ambiance (simple colored rectangles)
        this.createCityBackdrop();
    }

    private createCityBackdrop() {
        const gfx = this.add.graphics().setDepth(0);
        // Sky gradient effect
        gfx.fillStyle(0x0d0d1e, 1);
        gfx.fillRect(0, 0, 3200, 480);
        // Buildings silhouettes
        const buildings = [
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

        // Windows
        gfx.fillStyle(0xffff88, 0.6);
        for (let bx = 0; bx < 3200; bx += 30) {
            for (let by = 200; by < 700; by += 28) {
                if (Math.random() > 0.65) gfx.fillRect(bx + 4, by + 4, 8, 10);
            }
        }

        // Neon signs
        gfx.fillStyle(0xff0066, 0.8);
        gfx.fillRect(430, 395, 40, 10);
        gfx.fillStyle(0x00ffcc, 0.8);
        gfx.fillRect(900, 355, 50, 10);
        gfx.fillStyle(0xff8800, 0.8);
        gfx.fillRect(1510, 415, 45, 10);
    }
}
