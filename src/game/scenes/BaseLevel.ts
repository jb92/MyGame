import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Ally } from '../entities/Ally';
import { SkillOrb } from '../entities/SkillOrb';
import { GameState, Skill } from '../systems/GameState';
import { EventBus } from '../EventBus';

export interface LevelConfig {
    bgColor: string;
    groundColor: number;
    platformColor: number;
    nextScene: string;
    skillToUnlock?: Skill;
    allyPartLabel: string;
    enemyCount: number;
    enemyHp: number;
    enemyDmg: number;
}

/**
 * Base class shared by all three level scenes.
 * Handles: tilemap-like platform layout, player, enemies, ally, skill orb,
 * combat, HUD, event wiring, and exit trigger.
 */
export abstract class BaseLevel extends Scene {
    protected player!: Player;
    protected enemies: Enemy[] = [];
    protected ally!: Ally;
    protected skillOrb?: SkillOrb;
    protected platforms!: Phaser.Physics.Arcade.StaticGroup;
    protected exitZone!: Phaser.GameObjects.Rectangle;
    protected config!: LevelConfig;
    private levelKey: string;

    constructor(key: string) {
        super(key);
        this.levelKey = key;
    }

    abstract getLevelConfig(): LevelConfig;
    abstract buildPlatforms(): void;
    abstract placeActors(): void;

    create() {
        this.config = this.getLevelConfig();
        this.cameras.main.setBackgroundColor(this.config.bgColor);

        // Physics world
        this.physics.world.setBounds(0, 0, 3200, 768);
        this.cameras.main.setBounds(0, 0, 3200, 768);

        // Platforms
        this.platforms = this.physics.add.staticGroup();
        this.buildPlatforms();

        // Player
        this.player = new Player(this, 80, 600);
        this.physics.add.collider(this.player, this.platforms);

        // Camera follows player
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

        // Place enemies, ally, skill orb, exit
        this.placeActors();

        // Wire enemy colliders
        this.enemies.forEach(e => {
            this.physics.add.collider(e, this.platforms);
        });

        // Wire skill orb overlap
        if (this.skillOrb) {
            this.physics.add.overlap(this.player, this.skillOrb.getOrb(), () => {
                if (this.skillOrb) {
                    const cfg = this.skillOrb.getConfig();
                    this.skillOrb.collect();
                    this.scene.pause();
                    this.scene.launch('SkillUnlock', { ...cfg, parent: this.levelKey });
                }
            });
        }

        // Exit zone label
        const exitX = 3100;
        this.exitZone = this.add.rectangle(exitX, 660, 60, 120, 0x00ff88, 0.3)
            .setStrokeStyle(2, 0x00ff88);
        this.add.text(exitX, 600, '▶ EXIT', { fontSize: '12px', color: '#00ff88' }).setOrigin(0.5);

        // Event listeners
        EventBus.on('player-dead', this.onPlayerDead, this);
        EventBus.on('enemy-killed', this.onEnemyKilled, this);
        EventBus.on('enemy-attack', this.onEnemyAttack, this);
        EventBus.on('skill-unlocked', this.onSkillUnlocked, this);
        EventBus.on('show-ally-dialog', this.onAllyDialog, this);

        // Launch HUD
        this.scene.launch('HUD');

        EventBus.emit('current-scene-ready', this);
    }

    update(_time: number, delta: number) {
        this.player.update(delta);
        this.enemies.forEach(e => e.update(delta));
        this.ally?.update();

        // Combat: player punch hits enemies
        if (this.player.isPunching()) {
            this.enemies.forEach(e => {
                const dist = Phaser.Math.Distance.Between(
                    this.player.punchHitbox.x, this.player.punchHitbox.y,
                    e.x, e.y
                );
                if (dist < 80) {
                    e.hit(this.player.getPunchDamage());
                }
            });
        }

        // Ground slam hits enemies below
        if (this.player.isSlamming()) {
            this.enemies.forEach(e => {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
                if (dist < 90) {
                    e.hit(this.player.getSlamDamage());
                }
            });
        }

        // Exit zone check
        const distToExit = Phaser.Math.Distance.Between(
            this.player.x, this.player.y,
            this.exitZone.x, this.exitZone.y
        );
        if (distToExit < 50) {
            this.goToNextLevel();
        }
    }

    protected makePlatform(x: number, y: number, w: number, h = 24) {
        const gfx = this.add.graphics();
        gfx.fillStyle(this.config.platformColor, 1);
        gfx.fillRect(0, 0, w, h);
        const key = `plat_${this.levelKey}_${x}_${y}`;
        gfx.generateTexture(key, w, h);
        gfx.destroy();
        this.platforms.create(x + w / 2, y, key).refreshBody();
    }

    protected makeGround() {
        const gfx = this.add.graphics();
        gfx.fillStyle(this.config.groundColor, 1);
        gfx.fillRect(0, 0, 3200, 40);
        gfx.generateTexture(`ground_${this.levelKey}`, 3200, 40);
        gfx.destroy();
        this.platforms.create(1600, 748, `ground_${this.levelKey}`).refreshBody();
    }

    private onPlayerDead() {
        this.scene.stop('HUD');
        this.scene.start('GameOver');
    }

    private onEnemyKilled(data: { score: number }) {
        GameState.score += data.score;
    }

    private onEnemyAttack(data: { enemy: Enemy; damage: number }) {
        const dist = Phaser.Math.Distance.Between(
            data.enemy.x, data.enemy.y,
            this.player.x, this.player.y
        );
        if (dist < 70) {
            this.player.takeHit(data.damage);
        }
    }

    private onSkillUnlocked(_data: any) {
        // HUD will update via its own listener
    }

    private onAllyDialog(data: { partLabel: string }) {
        this.scene.pause();
        this.scene.launch('AllyDialog', { ...data, parentScene: this.levelKey });
    }

    private goToNextLevel() {
        EventBus.off('player-dead', this.onPlayerDead, this);
        EventBus.off('enemy-killed', this.onEnemyKilled, this);
        EventBus.off('enemy-attack', this.onEnemyAttack, this);
        EventBus.off('skill-unlocked', this.onSkillUnlocked, this);
        EventBus.off('show-ally-dialog', this.onAllyDialog, this);
        this.scene.stop('HUD');
        GameState.currentLevel++;
        this.cameras.main.fade(500, 0, 0, 0, false, (_cam: any, progress: number) => {
            if (progress === 1) this.scene.start(this.config.nextScene);
        });
    }

    shutdown() {
        EventBus.off('player-dead', this.onPlayerDead, this);
        EventBus.off('enemy-killed', this.onEnemyKilled, this);
        EventBus.off('enemy-attack', this.onEnemyAttack, this);
        EventBus.off('skill-unlocked', this.onSkillUnlocked, this);
        EventBus.off('show-ally-dialog', this.onAllyDialog, this);
    }
}
