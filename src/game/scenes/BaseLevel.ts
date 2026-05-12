import * as Phaser from 'phaser'
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
    private transitioning = false;   // guard against exit zone firing every frame

    constructor(key: string) {
        super(key);
        this.levelKey = key;
    }

    abstract getLevelConfig(): LevelConfig;
    abstract buildPlatforms(): void;
    abstract placeActors(): void;

    create() {
        this.transitioning = false;
        this.config = this.getLevelConfig();
        this.cameras.main.setBackgroundColor(this.config.bgColor);

        // No fade-in — seamless from cutscene

        // Physics world
        this.physics.world.setBounds(0, 0, 3200, 768);
        this.cameras.main.setBounds(0, 0, 3200, 768);

        // Platforms
        this.platforms = this.physics.add.staticGroup();
        this.buildPlatforms();

        // Player — spawn just above the ground (ground top = 728, feet-anchor origin)
        this.player = new Player(this, 80, 720);
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
                    this.skillOrb = undefined;
                    this.player.playPickup();
                    // Brief delay to show pickup animation, then unlock screen
                    this.time.delayedCall(800, () => {
                        this.scene.pause();
                        this.scene.launch('SkillUnlock', { ...cfg, parent: this.levelKey });
                    });
                }
            });
        }

        // Exit zone – wood sign image, bottom-aligned to ground surface
        const exitX = 3100;
        const exitSign = this.add.image(exitX, 748, 'exit_sign').setOrigin(0.5, 1).setScale(0.15);
        this.exitZone = this.add.rectangle(exitX, 748, exitSign.displayWidth, exitSign.displayHeight, 0x00ff88, 0)
            .setOrigin(0.5, 1);

        // Event listeners
        EventBus.on('player-dead', this.onPlayerDead, this);
        EventBus.on('enemy-killed', this.onEnemyKilled, this);
        EventBus.on('enemy-attack', this.onEnemyAttack, this);
        EventBus.on('skill-unlocked', this.onSkillUnlocked, this);

        // Launch HUD
        this.scene.launch('HUD');

        EventBus.emit('current-scene-ready', this);
    }

    update(_time: number, delta: number) {
        this.player.update(delta);
        this.enemies = this.enemies.filter(e => e.active);
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

        // Fist launch projectile hits enemies
        if (this.player.isFistActive()) {
            const fist = this.player.fistProjectile;
            for (const e of this.enemies) {
                const dist = Phaser.Math.Distance.Between(fist.x, fist.y, e.x, e.y);
                if (dist < 55) {
                    e.hit(this.player.getFistDamage());
                    this.player.deactivateFist();
                    break;
                }
            }
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

        // Exit zone check (bounding-box, forgiving for different sprite.y values)
        const dx = Math.abs(this.player.x - this.exitZone.x);
        const dy = Math.abs(this.player.y - this.exitZone.y);
        if (dx < 40 && dy < 70) {
            this.player.playVictory(() => this.goToNextLevel());
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
        gfx.fillRect(0, 0, 3200, 20);
        gfx.generateTexture(`ground_${this.levelKey}`, 3200, 20);
        gfx.destroy();
        this.platforms.create(1600, 758, `ground_${this.levelKey}`).refreshBody();
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

    /** Override in subclass to redirect the exit destination (e.g. MissingParts check). */
    protected getExitDestination(): string {
        return this.config.nextScene;
    }

    protected goToNextLevel() {
        if (this.transitioning) return;
        this.transitioning = true;

        // Remove all EventBus listeners before any scene stops
        EventBus.off('player-dead', this.onPlayerDead, this);
        EventBus.off('enemy-killed', this.onEnemyKilled, this);
        EventBus.off('enemy-attack', this.onEnemyAttack, this);
        EventBus.off('skill-unlocked', this.onSkillUnlocked, this);
        // Tell HUD to clean up its own listeners before we stop it
        EventBus.emit('hud-shutdown');
        this.scene.stop('HUD');

        const destination = this.getExitDestination();
        GameState.currentLevel++;
        this.cameras.main.fade(500, 0, 0, 0, false, (_cam: any, progress: number) => {
            if (progress === 1) this.scene.start(destination);
        });
    }

    shutdown() {
        EventBus.off('player-dead', this.onPlayerDead, this);
        EventBus.off('enemy-killed', this.onEnemyKilled, this);
        EventBus.off('enemy-attack', this.onEnemyAttack, this);
        EventBus.off('skill-unlocked', this.onSkillUnlocked, this);
    }
}

