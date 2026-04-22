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

    /** Create a platform with a static city-tile sprite overlay. */
    private makeCityPlatform(x: number, y: number, w: number, h = 24) {
        // Invisible physics body for collision
        const gfx = this.add.graphics();
        gfx.fillStyle(0x000000, 0);
        gfx.fillRect(0, 0, w, h);
        const key = `cplat_${x}_${y}`;
        gfx.generateTexture(key, w, h);
        gfx.destroy();
        const plat = this.platforms.create(x + w / 2, y, key);
        plat.setAlpha(0).refreshBody();

        // Static visual overlay — top-aligned with physics body
        const scale = w / 156;
        const sprite = this.add.sprite(x + w / 2, y - h / 2, 'city_plat_wide', 0);
        sprite.setScale(scale);
        sprite.setOrigin(0.5, 0);  // anchor at top so visual extends downward from physics surface
        sprite.setDepth(2);
        this.platSprites.push(sprite);
    }

    placeActors() {
        const positions = [350, 680, 1100, 1650, 2300];
        positions.forEach(x => {
            const e = new Enemy(this, x, 680, this.player, this.config.enemyHp, this.config.enemyDmg);
            this.enemies.push(e);
        });

        this.ally = new Ally(this, 2500, 680, this.player, this.config.allyPartLabel);
        this.skillOrb = new SkillOrb(this, 1490, 360, Skill.DASH);

        this.createCityBackdrop();
    }

    private createCityBackdrop() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x0d0d1e, 1);
        gfx.fillRect(0, 0, 3200, 480);

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

        gfx.fillStyle(0xffff88, 0.6);
        for (let bx = 0; bx < 3200; bx += 30) {
            for (let by = 200; by < 700; by += 28) {
                if (Math.random() > 0.65) gfx.fillRect(bx + 4, by + 4, 8, 10);
            }
        }

        gfx.fillStyle(0xff0066, 0.8);
        gfx.fillRect(430, 395, 40, 10);
        gfx.fillStyle(0x00ffcc, 0.8);
        gfx.fillRect(900, 355, 50, 10);
        gfx.fillStyle(0xff8800, 0.8);
        gfx.fillRect(1510, 415, 45, 10);
    }
}
