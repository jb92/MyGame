import { BaseLevel, LevelConfig } from './BaseLevel';
import { Enemy } from '../entities/Enemy';
import { Ally } from '../entities/Ally';
import { SkillOrb } from '../entities/SkillOrb';
import { Skill, GameState } from '../systems/GameState';
import { EventBus } from '../EventBus';

/**
 * Level 3 — Lab
 * Environment: government research facility
 * Skill unlocked: GROUND SLAM
 * Final goal: find the starship (requires all 3 spare parts)
 */
export class Level3_Lab extends BaseLevel {
    private starship!: Phaser.GameObjects.Container;
    private starshipCollider!: Phaser.Physics.Arcade.StaticGroup;

    constructor() { super('Level3_Lab'); }

    getLevelConfig(): LevelConfig {
        return {
            bgColor: '#0a0a1a',
            groundColor: 0x334455,
            platformColor: 0x445566,
            nextScene: 'Victory',
            skillToUnlock: Skill.GROUND_SLAM,
            allyPartLabel: 'Hyperdrive Stabilizer',
            enemyCount: 9,
            enemyHp: 100,
            enemyDmg: 25,
        };
    }

    buildPlatforms() {
        this.makeGround();
        // Lab catwalks and raised floors
        this.makePlatform(80, 640, 200);
        this.makePlatform(350, 580, 160);
        this.makePlatform(580, 520, 200);
        this.makePlatform(850, 460, 180);
        this.makePlatform(1100, 540, 140);
        this.makePlatform(1340, 480, 200);
        this.makePlatform(1620, 420, 160);
        this.makePlatform(1880, 360, 220);
        this.makePlatform(2180, 440, 180);
        this.makePlatform(2450, 380, 160);
        this.makePlatform(2720, 320, 200);
        this.makePlatform(3000, 260, 160);

        // Lab equipment platforms
        this.makePlatform(700, 340, 120);
        this.makePlatform(1450, 300, 140);
        this.makePlatform(2050, 260, 120);
        this.makePlatform(2600, 220, 140);
    }

    placeActors() {
        const positions = [300, 650, 1000, 1350, 1700, 2050, 2400, 2750, 3050];
        positions.forEach(x => {
            const e = new Enemy(this, x, 680, this.player, this.config.enemyHp, this.config.enemyDmg);
            this.enemies.push(e);
        });

        this.ally = new Ally(this, 2850, 680, this.player, this.config.allyPartLabel);
        this.skillOrb = new SkillOrb(this, 2610, 180, Skill.GROUND_SLAM);

        // Starship object near the exit
        this.buildStarship();

        this.createLabBackdrop();
    }

    private buildStarship() {
        const x = 3050;
        const y = 500;
        const gfx = this.add.graphics();

        // Ship body
        gfx.fillStyle(0x7799bb, 1);
        gfx.fillEllipse(0, 0, 140, 50);
        // Cockpit
        gfx.fillStyle(0x99bbdd, 1);
        gfx.fillEllipse(0, -22, 60, 28);
        // Engine glow
        gfx.fillStyle(0xff6600, 0.7);
        gfx.fillCircle(-62, 8, 10);
        gfx.fillCircle(62, 8, 10);
        gfx.generateTexture('starship_crashed', 180, 100);
        gfx.destroy();

        this.starship = this.add.container(x, y, [
            this.add.image(0, 0, 'starship_crashed').setScale(0.9),
        ]).setDepth(5);

        // Interaction zone
        this.starshipCollider = this.physics.add.staticGroup();
        const zone = this.physics.add.sprite(x, y, 'starship_crashed').setAlpha(0);
        this.starshipCollider.add(zone);

        const label = this.add.text(x, y - 70, '🚀 YOUR STARSHIP', {
            fontSize: '13px', color: '#88aaff',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({ targets: label, y: y - 80, duration: 800, yoyo: true, repeat: -1 });

        this.physics.add.overlap(this.player, zone, () => {
            this.tryRepairShip();
        });
    }

    private tryRepairShip() {
        if (GameState.spareParts < GameState.totalSpareParts) {
            // Not enough parts yet — show hint
            if (!this['_hintShown']) {
                this['_hintShown'] = true;
                const W = this.scale.width;
                const hint = this.add.text(W / 2, 80,
                    `You need all ${GameState.totalSpareParts} spare parts to repair the ship!\n(Have: ${GameState.spareParts})`,
                    { fontSize: '14px', color: '#ffaa44', align: 'center', backgroundColor: '#000000aa', padding: { x: 8, y: 4 } }
                ).setScrollFactor(0).setOrigin(0.5).setDepth(200);
                this.time.delayedCall(3000, () => {
                    hint.destroy();
                    this['_hintShown'] = false;
                });
            }
            return;
        }
        // All parts collected! Launch Victory
        EventBus.off('player-dead');
        this.scene.stop('HUD');
        this.cameras.main.fade(800, 255, 255, 255, false, (_cam: any, progress: number) => {
            if (progress === 1) this.scene.start('Victory');
        });
    }

    private createLabBackdrop() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x050510, 1);
        gfx.fillRect(0, 0, 3200, 768);

        // Lab wall panels
        gfx.lineStyle(1, 0x224466, 0.5);
        for (let gx = 0; gx < 3200; gx += 80) {
            gfx.strokeLinePoints([{ x: gx, y: 0 }, { x: gx, y: 768 }]);
        }
        for (let gy = 0; gy < 768; gy += 80) {
            gfx.strokeLinePoints([{ x: 0, y: gy }, { x: 3200, y: gy }]);
        }

        // Control panels
        const panelColors = [0x003366, 0x004466, 0x003344];
        for (let px = 0; px < 3200; px += 200) {
            gfx.fillStyle(panelColors[Math.floor(Math.random() * 3)], 1);
            gfx.fillRect(px, 680, 160, 48);
            // Blinking lights
            gfx.fillStyle(0x00ffcc, 0.9);
            gfx.fillRect(px + 10, 690, 8, 8);
            gfx.fillStyle(0xff0044, 0.9);
            gfx.fillRect(px + 30, 690, 8, 8);
            gfx.fillStyle(0xffff00, 0.9);
            gfx.fillRect(px + 50, 690, 8, 8);
        }

        // Warning stripes on walls
        gfx.fillStyle(0xffcc00, 0.3);
        for (let wx = 0; wx < 3200; wx += 60) {
            gfx.fillRect(wx, 0, 20, 768);
        }
    }
}
