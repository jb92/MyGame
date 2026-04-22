import * as Phaser from 'phaser';
import { GameState, Skill } from '../systems/GameState';
import { EventBus } from '../EventBus';

const MOVE_SPEED = 220;
const JUMP_VELOCITY = -520;
const DASH_DISTANCE = 280;
const DASH_COOLDOWN = 800;
const PUNCH_COOLDOWN = 400;
const COMBO_WINDOW = 600;
const SLAM_VELOCITY = 600;

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
    private comboCount = 0;
    private comboTimer = 0;
    private slamming = false;
    private invincibleTimer = 0;

    // Walk/run duration tracking
    private moveKeyHoldTime = 0;

    // Locks input during victory / pickup one-shot anims
    private inputLocked = false;

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
        this.comboTimer = Math.max(0, this.comboTimer - delta);
        this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);

        if (this.comboTimer <= 0) this.comboCount = 0;

        // Block all input during one-shot animations (victory / pickup)
        if (this.inputLocked) {
            this.updateHitbox();
            return;
        }

        // Block movement during slam landing
        if (this.slamming) {
            if (onGround) {
                this.slamming = false;
                this.setState('idle');
            }
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
            this.scene.time.delayedCall(150, () => {
                if (this.state === 'dash') this.setState('idle');
            });
        }

        // --- Punch / Combo ---
        if (Phaser.Input.Keyboard.JustDown(this.keyZ) && this.punchCooldown <= 0) {
            this.punchCooldown = GameState.hasSkill(Skill.COMBO_PUNCH) ? PUNCH_COOLDOWN * 0.7 : PUNCH_COOLDOWN;
            if (GameState.hasSkill(Skill.COMBO_PUNCH)) {
                this.comboCount = (this.comboTimer > 0 ? this.comboCount + 1 : 1) % 3;
                this.comboTimer = COMBO_WINDOW;
            } else {
                this.comboCount = 0;
            }
            this.setState('punch');
            this.punchHitbox.setAlpha(0);
            EventBus.emit('player-punch', { combo: this.comboCount });
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

    getPunchCombo(): number {
        return this.comboCount;
    }

    getPunchDamage(): number {
        const base = 20;
        if (!GameState.hasSkill(Skill.COMBO_PUNCH)) return base;
        return base + this.comboCount * 10;
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

    destroy(fromScene?: boolean) {
        this.punchHitbox.destroy();
        super.destroy(fromScene);
    }
}

