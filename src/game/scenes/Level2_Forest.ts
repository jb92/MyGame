import { BaseLevel, LevelConfig } from './BaseLevel';
import { Enemy } from '../entities/Enemy';
import { Ally } from '../entities/Ally';
import { SkillOrb } from '../entities/SkillOrb';
import { Skill } from '../systems/GameState';

/** Surface y-coordinate in the 1024×1024 platform image (top of the dirt mound). */
const PLAT_SURFACE_Y = 555;
const PLAT_IMG_SIZE = 1024;

/**
 * Level 2 — Forest
 * Environment: dense alien-lit forest at night
 * Skill unlocked: COMBO PUNCH
 */
export class Level2_Forest extends BaseLevel {
    constructor() { super('Level2_Forest'); }

    getLevelConfig(): LevelConfig {
        return {
            bgColor: '#0a1a0a',
            groundColor: 0x2d4a1e,
            platformColor: 0x3d6b2e,
            nextScene: 'Level3_Lab',
            skillToUnlock: Skill.COMBO_PUNCH,
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
            const e = new Enemy(this, x, 720, this.player, this.config.enemyHp, this.config.enemyDmg);
            this.enemies.push(e);
        });

        this.ally = new Ally(this, 2600, 772, this.player, this.config.allyPartLabel);
        this.skillOrb = new SkillOrb(this, 2310, 220, Skill.COMBO_PUNCH);

        this.createForestBackdrop();
    }

    private createForestBackdrop() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x030d03, 1);
        gfx.fillRect(0, 0, 3200, 768);

        // Fireflies
        gfx.fillStyle(0xaaffaa, 0.8);
        for (let i = 0; i < 200; i++) {
            gfx.fillCircle(Math.random() * 3200, Math.random() * 400, Math.random() < 0.7 ? 1 : 2);
        }

        // Background tree trunks
        gfx.fillStyle(0x1a3010, 1);
        for (let tx = 0; tx < 3200; tx += 80) {
            const h = 200 + Math.random() * 300;
            gfx.fillRect(tx + 20, 768 - h, 30, h);
        }

        // Tree canopy
        const colors = [0x1a4d0a, 0x0d3305, 0x224d10];
        for (let tx = 0; tx < 3200; tx += 80) {
            gfx.fillStyle(colors[Math.floor(Math.random() * colors.length)], 1);
            gfx.fillCircle(tx + 35, 200 + Math.random() * 200, 50 + Math.random() * 40);
        }

        // Glowing mushrooms
        gfx.fillStyle(0x44ff44, 0.5);
        for (let mx = 0; mx < 3200; mx += 120) {
            gfx.fillCircle(mx + 60, 730, 8);
            gfx.fillRect(mx + 57, 730, 6, 18);
        }
    }
}
