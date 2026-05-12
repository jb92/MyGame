import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { GameState } from '../systems/GameState';
import { EventBus } from '../EventBus';

/**
 * Boss Level — City Arena
 * Inserted between Level1_City and Level2_Forest.
 * The hero is trapped in a small arena inspired by the city level.
 * Once the boss is defeated, the hero auto-runs to the exit.
 */
export class BossArena extends Scene {
    private player!: Player;
    private boss!: Boss;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private transitioning = false;
    private bossDefeated = false;
    private autoRunning = false;
    private exitX = 950;
    private rightWall!: Phaser.GameObjects.Zone;
    private rightWallCollider!: Phaser.Physics.Arcade.Collider;

    // Track punch hits so we only damage once per punch press
    private punchHitRegistered = false;

    constructor() {
        super('BossArena');
    }

    create() {
        this.transitioning = false;
        this.bossDefeated = false;
        this.autoRunning = false;
        this.punchHitRegistered = false;

        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Arena is a single-screen width (no scroll)
        const W = 1024;
        const H = 768;
        this.physics.world.setBounds(0, 0, W, H);
        this.cameras.main.setBounds(0, 0, W, H);

        // Platforms
        this.platforms = this.physics.add.staticGroup();
        this.buildArena();

        // Player — spawn at left side
        this.player = new Player(this, 80, 720);
        this.physics.add.collider(this.player, this.platforms);

        // Boss — spawn at right side
        this.boss = new Boss(this, 800, 720, this.player, 300, 25);
        this.physics.add.collider(this.boss, this.platforms);

        // Arena walls (invisible blockers)
        this.createWalls();

        // Create city-inspired backdrop
        this.createCityBackdrop();
        this.createRain();
        this.createThunder();

        // Events — only player-dead needs EventBus (from Player entity)
        EventBus.on('player-dead', this.onPlayerDead, this);

        // Properly register shutdown cleanup
        this.events.once('shutdown', this.cleanup, this);

        // Launch HUD
        this.scene.launch('HUD');

        // Boss intro: brief camera shake
        this.cameras.main.shake(300, 0.005);

        EventBus.emit('current-scene-ready', this);
    }

    private buildArena() {
        // Ground
        const gfx = this.add.graphics();
        gfx.fillStyle(0x444455, 1);
        gfx.fillRect(0, 0, 1024, 20);
        gfx.generateTexture('ground_boss', 1024, 20);
        gfx.destroy();
        this.platforms.create(512, 758, 'ground_boss').refreshBody();

        // A couple of floating platforms for verticality
        this.makeArenaPlatform(250, 600, 160);
        this.makeArenaPlatform(600, 560, 160);
        this.makeArenaPlatform(420, 450, 140);
    }

    private makeArenaPlatform(x: number, y: number, w: number, h = 24) {
        const scaleX = w / 156;
        const scaleY = h / 36;
        const sprite = this.add.sprite(x + w / 2, y, 'city_plat_wide', 0);
        sprite.setScale(scaleX, scaleY);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(2);
        this.physics.add.existing(sprite, true);
        this.platforms.add(sprite);
    }

    private createWalls() {
        // Left wall
        const leftWall = this.add.zone(5, 384, 10, 768);
        this.physics.add.existing(leftWall, true);
        this.physics.add.collider(this.player, leftWall);
        this.physics.add.collider(this.boss, leftWall);

        // Right wall (blocks exit until boss is dead)
        this.rightWall = this.add.zone(1019, 384, 10, 768);
        this.physics.add.existing(this.rightWall, true);
        this.physics.add.collider(this.boss, this.rightWall);
        this.rightWallCollider = this.physics.add.collider(this.player, this.rightWall);
    }

    private createCityBackdrop() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x0d0d1e, 1);
        gfx.fillRect(0, 0, 1024, 480);

        // Buildings
        const buildings: number[][] = [
            [0, 200, 100, 550], [120, 280, 80, 470], [220, 150, 110, 600],
            [360, 220, 90, 530], [480, 180, 100, 570], [610, 250, 70, 500],
            [710, 130, 120, 620], [860, 200, 90, 550], [970, 170, 54, 580],
        ];
        gfx.fillStyle(0x111122, 1);
        buildings.forEach(([x, y, w, h]) => gfx.fillRect(x, y, w, h));

        // Windows
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

        // "ARENA" text on backdrop
        this.add.text(512, 100, 'ARENA', {
            fontSize: '48px', color: '#ff3366',
            stroke: '#000000', strokeThickness: 6,
            fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0.3).setDepth(0);
    }

    private createRain() {
        // Heavy rain falling from the sky
        this.add.particles(0, -10, 'raindrop', {
            x: { min: 0, max: 1024 },
            lifespan: 1000,
            speedY: { min: 500, max: 800 },
            speedX: { min: -60, max: -30 },
            alpha: { start: 0.6, end: 0.1 },
            scale: { start: 1, end: 0.4 },
            quantity: 6,
            frequency: 20,
        }).setDepth(50).setScrollFactor(0);

        // Second layer — lighter background rain for depth
        this.add.particles(0, -10, 'raindrop', {
            x: { min: 0, max: 1024 },
            lifespan: 1200,
            speedY: { min: 350, max: 550 },
            speedX: { min: -40, max: -15 },
            alpha: { start: 0.2, end: 0 },
            scale: { start: 0.5, end: 0.2 },
            quantity: 4,
            frequency: 25,
        }).setDepth(49).setScrollFactor(0);

        // Ground splash particles — small bursts where rain hits the floor
        this.createSplashTexture();
        this.add.particles(0, 0, 'rain_splash', {
            x: { min: 0, max: 1024 },
            y: 748,
            lifespan: 300,
            speedY: { min: -40, max: -80 },
            speedX: { min: -30, max: 30 },
            alpha: { start: 0.7, end: 0 },
            scale: { start: 0.6, end: 0.1 },
            quantity: 1,
            frequency: 40,
        }).setDepth(51).setScrollFactor(0);
    }

    private createSplashTexture() {
        if (this.textures.exists('rain_splash')) return;
        const gfx = this.add.graphics();
        gfx.fillStyle(0xaaccff, 1);
        gfx.fillCircle(3, 3, 3);
        gfx.generateTexture('rain_splash', 6, 6);
        gfx.destroy();
    }

    private createThunder() {
        const flash = this.add.rectangle(512, 384, 1024, 768, 0xffffff)
            .setScrollFactor(0).setDepth(80).setAlpha(0);

        const bolt = this.add.graphics().setDepth(79).setScrollFactor(0).setAlpha(0);

        const randInt = (min: number, max: number) =>
            Math.floor(Math.random() * (max - min + 1)) + min;

        let active = true;
        this.events.once('shutdown', () => { active = false; });

        const strike = () => {
            if (!active) return;

            // Main lightning bolt reaching down to the ground
            bolt.clear();
            bolt.lineStyle(4, 0xccddff, 1);
            const startX = randInt(80, 944);
            let x = startX;
            let y = 0;
            bolt.beginPath();
            bolt.moveTo(x, y);
            while (y < 740) {
                x += randInt(-35, 35);
                y += randInt(25, 60);
                bolt.lineTo(x, y);
            }
            bolt.strokePath();

            // Branch bolts for realism
            for (let b = 0; b < randInt(1, 3); b++) {
                bolt.lineStyle(1.5, 0xaabbee, 0.7);
                const branchY = randInt(80, 400);
                const branchX = startX + randInt(-30, 30);
                bolt.beginPath();
                bolt.moveTo(branchX, branchY);
                let bx = branchX;
                let by = branchY;
                for (let i = 0; i < randInt(3, 6); i++) {
                    bx += randInt(-30, 30);
                    by += randInt(20, 45);
                    bolt.lineTo(bx, by);
                }
                bolt.strokePath();
            }

            // Ground impact glow
            const impactX = x;
            bolt.fillStyle(0xccddff, 0.4);
            const glowW = randInt(40, 80);
            bolt.fillRoundedRect(impactX - glowW / 2, 742, glowW, 12, 6);

            // Flash + shake
            bolt.setAlpha(1);
            flash.setAlpha(0.25);
            this.cameras.main.shake(150, 0.004);

            this.tweens.add({
                targets: [bolt, flash],
                alpha: 0,
                duration: 250,
                onComplete: () => {
                    if (!active) return;
                    // Double-flash for dramatic effect
                    if (Math.random() < 0.5) {
                        this.time.delayedCall(80, () => {
                            if (!active) return;
                            flash.setAlpha(0.12);
                            bolt.setAlpha(0.4);
                            this.tweens.add({ targets: [bolt, flash], alpha: 0, duration: 180 });
                        });
                    }
                },
            });

            // More frequent strikes for boss intensity
            this.time.delayedCall(randInt(2000, 5000), strike);
        };

        // First strike quickly
        this.time.delayedCall(randInt(500, 1500), strike);
    }

    update(_time: number, delta: number) {
        if (this.transitioning) return;

        // During auto-run, don't process player input — control manually
        if (this.autoRunning) {
            const body = this.player.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.setVelocityX(220);
            }
            this.player.setFlipX(false);
            // Play walk animation if not already playing
            if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'anim_run') {
                this.player.play('anim_run');
            }
            if (this.player.x >= this.exitX) {
                this.goToNextLevel();
            }
            return;
        }

        this.player.update(delta);

        // Reset punch tracking when player stops punching
        if (!this.player.isPunching()) {
            this.punchHitRegistered = false;
        }

        if (!this.bossDefeated && this.boss && this.boss.active) {
            // Boss AI tick — returns true on the frame boss deals damage
            const bossHits = this.boss.tick();

            // Boss damages player
            if (bossHits) {
                const dist = Math.abs(this.boss.x - this.player.x);
                if (dist < 120) {
                    this.player.takeHit(this.boss.damage);
                }
            }

            // Player punch hits boss (ONCE per punch press)
            if (this.player.isPunching() && !this.punchHitRegistered) {
                const dist = Math.abs(this.player.x - this.boss.x);
                if (dist < 100) {
                    this.punchHitRegistered = true;
                    this.boss.hit(this.player.getPunchDamage());
                }
            }

            // Ground slam hits boss
            if (this.player.isSlamming()) {
                const dist = Math.abs(this.player.x - this.boss.x);
                if (dist < 100) {
                    this.boss.hit(this.player.getSlamDamage());
                }
            }

            // Check if boss died
            if (this.boss.isDead() && !this.bossDefeated) {
                this.onBossKilled();
            }
        }
    }

    private onPlayerDead() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.cleanup();
        this.scene.stop('HUD');
        this.scene.start('GameOver');
    }

    private onBossKilled() {
        this.bossDefeated = true;
        this.rightWallCollider.active = false;
        GameState.score += 500;

        // Camera effect
        this.cameras.main.flash(400, 255, 255, 255);

        // Show victory text then auto-run
        const victoryText = this.add.text(512, 300, 'BOSS DEFEATED!', {
            fontSize: '40px', color: '#ffdd00',
            stroke: '#000000', strokeThickness: 6,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(100).setAlpha(0);

        this.tweens.add({
            targets: victoryText,
            alpha: 1,
            duration: 500,
            yoyo: true,
            hold: 1000,
            onComplete: () => {
                victoryText.destroy();
                this.autoRunning = true;
                this.player.setFlipX(false);
            },
        });
    }

    private goToNextLevel() {
        if (this.transitioning) return;
        this.transitioning = true;

        this.cleanup();
        EventBus.emit('hud-shutdown');
        this.scene.stop('HUD');

        GameState.currentLevel++;
        this.cameras.main.fade(500, 0, 0, 0, false, (_cam: any, progress: number) => {
            if (progress === 1) this.scene.start('Level2_Forest');
        });
    }

    private cleanup() {
        EventBus.off('player-dead', this.onPlayerDead, this);
    }
}
