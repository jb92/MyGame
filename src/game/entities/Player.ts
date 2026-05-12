import * as Phaser from 'phaser';
import { GameState, Skill } from '../systems/GameState';
import { EventBus } from '../EventBus';

const MOVE_SPEED = 220;
const JUMP_VELOCITY = -520;
const DASH_DISTANCE = 500;
const DASH_COOLDOWN = 800;
const PUNCH_COOLDOWN = 400;
const SLAM_VELOCITY = 600;

const FIST_SPEED = 350;
const FIST_RANGE = 280;
const FIST_DAMAGE = 30;

// Time in ms a move key must be held before switching from walk to run
const WALK_TO_RUN_THRESHOLD = 2000;

// 256×256 frames at 0.5 ≈ 128px display
const HERO_SCALE = 0.5;

export type PlayerState =
    | 'idle' | 'walk' | 'run' | 'jump'
    | 'punch' | 'dash' | 'slam'
    | 'victory' | 'pickup';

export class Player extends Phaser.Physics.Arcade.Sprite {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyZ!: Phaser.Input.Keyboard.Key;
    private keyShift!: Phaser.Input.Keyboard.Key;
    private keyDown!: Phaser.Input.Keyboard.Key;

    private state: PlayerState = 'idle';
    private facingRight = true;
    private dashCooldown = 0;
    private punchCooldown = 0;
    private slamming = false;
    private invincibleTimer = 0;

    // Walk/run duration tracking
    private moveKeyHoldTime = 0;

    // Locks input during victory / pickup one-shot anims
    private inputLocked = false;

    // Ground dust particles
    private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    private dustTimer = 0;
    private wasOnGround = true;

    // Fist launch projectile (Rayman-style)
    fistProjectile!: Phaser.GameObjects.Sprite;
    private fistActive = false;
    private fistStartX = 0;
    private fistDir = 1;
    private fistTrailTimer = 0;

    // Hitbox for melee attack
    punchHitbox!: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'hero_idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(300);
        body.setCollideWorldBounds(true);
        // setSize/setOffset in TEXTURE pixels (scaled by 0.5 for world space).
        // Phaser: body.y = sprite.y + scale*(offset.y - originY*frameH)
        //         body.height = sourceH * scale
        // Hero art feet at texture y=222 (33px padding below).
        // Visible feet world = sprite.y + 0.5*(222-256) = sprite.y - 17
        // body.bottom should = sprite.y - 17 → offset.y = 222 - sourceH = 62
        body.setSize(100, 160);
        body.setOffset(78, 62);
        this.setScale(HERO_SCALE);
        this.setOrigin(0.5, 1);
        this.setDepth(10);

        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.keyZ = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.keyShift = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.keyDown = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

        this.punchHitbox = scene.add.rectangle(x, y, 50, 40, 0xff6600, 0)
            .setDepth(11);

        this.createAnimations();
        this.createDustEffect();
        this.createFistProjectile();
        this.play('anim_idle');
    }

    /** Register all hero sprite-sheet animations once. */
    private createAnimations() {
        const anims = this.scene.anims;

        const defs: { key: string; sheet: string; end: number; rate: number; repeat: number }[] = [
            { key: 'anim_idle',    sheet: 'hero_idle',    end: 24, rate: 10, repeat: -1 },
            { key: 'anim_walk',    sheet: 'hero_walk',    end: 24, rate: 12, repeat: -1 },
            { key: 'anim_run',     sheet: 'hero_run',     end: 24, rate: 14, repeat: -1 },
            { key: 'anim_jump',    sheet: 'hero_jump',    end: 24, rate: 12, repeat:  0 },
            { key: 'anim_punch',   sheet: 'hero_punch',   end: 24, rate: 20, repeat:  0 },
            { key: 'anim_dash',    sheet: 'hero_dash',    end: 24, rate: 20, repeat:  0 },
            { key: 'anim_victory', sheet: 'hero_victory', end: 24, rate: 10, repeat:  0 },
            { key: 'anim_pickup',  sheet: 'hero_pickup',  end: 24, rate: 14, repeat:  0 },
        ];

        for (const d of defs) {
            if (!anims.exists(d.key)) {
                anims.create({
                    key: d.key,
                    frames: anims.generateFrameNumbers(d.sheet, { start: 0, end: d.end }),
                    frameRate: d.rate,
                    repeat: d.repeat,
                });
            }
        }
    }

    update(delta: number) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;
        const onGround = body.blocked.down;

        this.dashCooldown = Math.max(0, this.dashCooldown - delta);
        this.punchCooldown = Math.max(0, this.punchCooldown - delta);
        this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);

        this.updateFist(delta);

        // Block all input during one-shot animations (victory / pickup)
        if (this.inputLocked) {
            this.wasOnGround = onGround;
            this.updateHitbox();
            return;
        }

        // Block movement during slam landing
        if (this.slamming) {
            if (onGround) {
                this.slamming = false;
                this.setState('idle');
                this.dustEmitter?.explode(12, this.x, this.y - 10);
            }
            this.wasOnGround = onGround;
            this.updateHitbox();
            return;
        }

        // --- Horizontal movement ---
        let moving = false;
        if (this.cursors.left.isDown) {
            body.setVelocityX(-MOVE_SPEED);
            this.facingRight = false;
            this.setFlipX(true);
            moving = true;
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(MOVE_SPEED);
            this.facingRight = true;
            this.setFlipX(false);
            moving = true;
        } else {
            body.setVelocityX(0);
        }

        // Track how long a move key is held
        if (moving) {
            this.moveKeyHoldTime += delta;
        } else {
            this.moveKeyHoldTime = 0;
        }

        // --- Jump ---
        if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) && onGround) {
            body.setVelocityY(JUMP_VELOCITY);
            this.dustEmitter?.explode(6, this.x, this.y - 10);
        }

        // --- Ground Slam (↓ in air) ---
        if (
            GameState.hasSkill(Skill.GROUND_SLAM) &&
            !onGround &&
            Phaser.Input.Keyboard.JustDown(this.keyDown)
        ) {
            body.setVelocityY(SLAM_VELOCITY);
            this.slamming = true;
            this.setState('slam');
            this.updateHitbox();
            return;
        }

        // --- Dash ---
        if (
            GameState.hasSkill(Skill.DASH) &&
            Phaser.Input.Keyboard.JustDown(this.keyShift) &&
            this.dashCooldown <= 0
        ) {
            const dir = this.facingRight ? 1 : -1;
            body.setVelocityX(dir * DASH_DISTANCE * 5);
            this.dashCooldown = DASH_COOLDOWN;
            this.setState('dash');
            this.scene.time.delayedCall(300, () => {
                if (this.state === 'dash') this.setState('idle');
            });
        }

        // --- Punch + Fist Launch ---
        if (Phaser.Input.Keyboard.JustDown(this.keyZ) && this.punchCooldown <= 0) {
            this.punchCooldown = PUNCH_COOLDOWN;
            this.setState('punch');
            this.punchHitbox.setAlpha(0);
            EventBus.emit('player-punch', { combo: 0 });

            if (GameState.hasSkill(Skill.FIST_LAUNCH)) {
                this.launchFist();
            }

            this.scene.time.delayedCall(200, () => {
                if (this.state === 'punch') this.setState('idle');
            });
        }

        // --- Determine visual state ---
        if (this.state !== 'punch' && this.state !== 'dash' && this.state !== 'slam') {
            if (!onGround) {
                this.setState('jump');
            } else if (moving) {
                // Walk if held < threshold, run if held longer
                if (this.moveKeyHoldTime < WALK_TO_RUN_THRESHOLD) {
                    this.setState('walk');
                } else {
                    this.setState('run');
                }
            } else {
                this.setState('idle');
            }
        }

        this.emitRunDust(delta, onGround, moving);
        this.wasOnGround = onGround;
        this.updateHitbox();
    }

    private setState(s: PlayerState) {
        if (this.state === s) return;
        this.state = s;

        const animMap: Record<PlayerState, string> = {
            idle:    'anim_idle',
            walk:    'anim_walk',
            run:     'anim_run',
            jump:    'anim_jump',
            punch:   'anim_punch',
            dash:    'anim_dash',
            slam:    'anim_jump',   // reuse jump frames for slam
            victory: 'anim_victory',
            pickup:  'anim_pickup',
        };

        this.play(animMap[s], true);
        this.setScale(HERO_SCALE);
        this.setOrigin(0.5, 1.0);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;
        body.setSize(100, 160);
        body.setOffset(78, 62);
    }

    /** Play the victory animation (one-shot), locks input, then calls cb. */
    playVictory(onComplete?: () => void) {
        this.inputLocked = true;
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) body.setVelocity(0, 0);
        this.setState('victory');
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.inputLocked = false;
            if (onComplete) onComplete();
        });
    }

    /** Play the pickup animation (one-shot), locks input briefly. */
    playPickup() {
        this.inputLocked = true;
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) body.setVelocityX(0);
        this.setState('pickup');
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.inputLocked = false;
            this.setState('idle');
        });
    }

    private updateHitbox() {
        const dir = this.facingRight ? 1 : -1;
        const offsetX = dir * 55;
        this.punchHitbox.setPosition(this.x + offsetX, this.y - 50);
    }

    isPunching(): boolean {
        return this.state === 'punch';
    }

    isSlamming(): boolean {
        return this.slamming;
    }

    getPunchDamage(): number {
        return 20;
    }

    getFistDamage(): number {
        return FIST_DAMAGE;
    }

    isFistActive(): boolean {
        return this.fistActive;
    }

    deactivateFist() {
        if (!this.fistActive) return;
        this.fistActive = false;
        // Impact flash
        const flash = this.scene.add.circle(
            this.fistProjectile.x, this.fistProjectile.y,
            18, 0xff8833, 0.8,
        ).setDepth(12);
        this.scene.tweens.add({
            targets: flash, alpha: 0, scale: 2.5, duration: 150,
            onComplete: () => flash.destroy(),
        });
        this.scene.tweens.add({
            targets: this.fistProjectile,
            alpha: 0, scale: 0.3, duration: 120,
            onComplete: () => this.fistProjectile.setVisible(false),
        });
    }

    getSlamDamage(): number {
        return 50;
    }

    takeHit(damage: number) {
        if (this.invincibleTimer > 0) return;
        GameState.takeDamage(damage);
        this.invincibleTimer = 1000;
        this.setAlpha(0.5);
        this.scene.time.delayedCall(1000, () => this.setAlpha(1));
        EventBus.emit('player-damaged', GameState.playerHealth);
        if (!GameState.isAlive()) {
            EventBus.emit('player-dead');
        }
    }

    private createDustEffect() {
        if (!this.scene.textures.exists('hero_dust')) {
            const gfx = this.scene.add.graphics();
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(3, 3, 3);
            gfx.generateTexture('hero_dust', 6, 6);
            gfx.destroy();
        }

        this.dustEmitter = this.scene.add.particles(0, 0, 'hero_dust', {
            speed: { min: 30, max: 80 },
            angle: { min: 230, max: 310 },
            lifespan: { min: 250, max: 450 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: [0xaa9977, 0xbbaa88, 0x998866, 0xccbb99],
            gravityY: 100,
            frequency: -1,
            emitting: false,
        }).setDepth(5);
    }

    private emitRunDust(delta: number, onGround: boolean, moving: boolean) {
        if (!this.dustEmitter) return;

        // Landing burst
        if (onGround && !this.wasOnGround) {
            this.dustEmitter.explode(8, this.x, this.y - 10);
        }

        // Walking / running dust
        if (onGround && moving && (this.state === 'walk' || this.state === 'run')) {
            this.dustTimer += delta;
            const interval = this.state === 'run' ? 80 : 180;
            if (this.dustTimer >= interval) {
                const behindX = this.facingRight ? this.x - 8 : this.x + 8;
                this.dustEmitter.explode(this.state === 'run' ? 3 : 1, behindX, this.y - 10);
                this.dustTimer = 0;
            }
        } else {
            this.dustTimer = 0;
        }
    }

    private createFistProjectile() {
        if (!this.scene.textures.exists('fist_projectile')) {
            const gfx = this.scene.add.graphics();
            // Fist body — large oval (orange to match hero)
            gfx.fillStyle(0xff6600, 1);
            gfx.fillEllipse(16, 14, 28, 22);
            // Knuckle bumps
            gfx.fillStyle(0xdd5500, 1);
            gfx.fillCircle(28, 8, 5);
            gfx.fillCircle(28, 14, 5);
            gfx.fillCircle(28, 20, 5);
            // Thumb
            gfx.fillCircle(6, 20, 4);
            // Outline
            gfx.lineStyle(2, 0xaa4400, 1);
            gfx.strokeEllipse(16, 14, 28, 22);
            // Highlight
            gfx.fillStyle(0xffffff, 0.3);
            gfx.fillEllipse(14, 10, 10, 8);
            gfx.generateTexture('fist_projectile', 34, 28);
            gfx.destroy();
        }

        this.fistProjectile = this.scene.add.sprite(0, 0, 'fist_projectile');
        this.fistProjectile.setVisible(false);
        this.fistProjectile.setDepth(11);
        this.fistProjectile.setScale(1.8);
    }

    private launchFist() {
        if (this.fistActive) return;
        this.fistActive = true;
        this.fistDir = this.facingRight ? 1 : -1;
        this.fistStartX = this.x;
        this.fistTrailTimer = 0;

        const spawnX = this.x + this.fistDir * 40;
        const spawnY = this.y - 55;
        this.fistProjectile.setPosition(spawnX, spawnY);
        this.fistProjectile.setVisible(true);
        this.fistProjectile.setAlpha(1);
        this.fistProjectile.setScale(1.8);
        this.fistProjectile.setFlipX(this.fistDir < 0);
    }

    private updateFist(delta: number) {
        if (!this.fistActive) return;

        this.fistProjectile.x += this.fistDir * FIST_SPEED * (delta / 1000);

        // Motion trail
        this.fistTrailTimer += delta;
        if (this.fistTrailTimer >= 35) {
            this.fistTrailTimer = 0;
            const trail = this.scene.add.circle(
                this.fistProjectile.x - this.fistDir * 12,
                this.fistProjectile.y,
                10, 0xff6600, 0.35,
            ).setDepth(10);
            this.scene.tweens.add({
                targets: trail, alpha: 0, scale: 0.2, duration: 180,
                onComplete: () => trail.destroy(),
            });
        }

        // Max range reached
        if (Math.abs(this.fistProjectile.x - this.fistStartX) >= FIST_RANGE) {
            this.deactivateFist();
        }
    }

    destroy(fromScene?: boolean) {
        this.dustEmitter?.destroy();
        this.fistProjectile?.destroy();
        this.punchHitbox.destroy();
        super.destroy(fromScene);
    }
}

