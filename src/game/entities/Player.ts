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

export type PlayerState = 'idle' | 'run' | 'jump' | 'duck' | 'punch' | 'dash' | 'slam';

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

    // Hitbox for melee attack
    punchHitbox!: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'hero_idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(300);
        body.setCollideWorldBounds(true);
        // Scale 0.18 → sprite displayed at 512*0.18 ≈ 92px.
        // Character fills roughly the center 60% of the cell.
        // Use display-size body (no setSize) so Phaser auto-sizes to 92×92,
        // then pull the bottom up slightly via offset to match the feet.
        // offset.y = 10 keeps feet near the bottom of the 92px sprite.
        body.setOffset(10, 10);
        this.setScale(0.18);
        this.setOrigin(0.5, 1);   // anchor at feet — bottom of sprite = player y
        this.setDepth(10);

        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.keyZ = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.keyShift = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.keyDown = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

        this.punchHitbox = scene.add.rectangle(x, y, 50, 40, 0xff6600, 0)
            .setDepth(11);
    }

    update(delta: number) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const onGround = body.blocked.down;

        this.dashCooldown = Math.max(0, this.dashCooldown - delta);
        this.punchCooldown = Math.max(0, this.punchCooldown - delta);
        this.comboTimer = Math.max(0, this.comboTimer - delta);
        this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);

        if (this.comboTimer <= 0) this.comboCount = 0;

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

        // --- Duck ---
        // Only change the texture — do NOT resize the body (resizing while on ground
        // shifts sprite.y upward because body.y is anchored to ground).
        if (onGround && this.keyDown.isDown && !moving) {
            this.setState('duck');
            this.updateHitbox();
            return;
        }

        // --- Jump ---
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && onGround) {
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
            // Briefly show hitbox
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
                this.setState('run');
            } else {
                this.setState('idle');
            }
        }

        this.updateHitbox();
    }

    private setState(s: PlayerState) {
        if (this.state === s) return;
        this.state = s;
        const texMap: Record<PlayerState, string> = {
            idle: 'hero_idle',
            run: 'hero_run',
            jump: 'hero_run',
            duck: 'hero_duck',
            punch: 'hero_punch',
            dash: 'hero_run',
            slam: 'hero_duck',
        };
        this.setTexture(texMap[s]);
        this.setScale(0.18, 0.18);
        // Keep origin fixed at (0.5, 1) always — changing origin mid-frame causes
        // a physics-sync gap that renders a ghost/duplicate of the sprite.
        this.setOrigin(0.5, 1.0);
        // Use body offset to shift the sprite lower when ducking.
        // sprite.y = body.bottom - offsetY, so reducing offsetY pushes sprite.y
        // higher (larger y = lower on screen), giving a clean ~15px downward shift.
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (s === 'duck' || s === 'slam') {
            body.setOffset(10, -5);
        } else {
            body.setOffset(10, 10);
        }
    }

    private updateHitbox() {
        const dir = this.facingRight ? 1 : -1;
        const offsetX = dir * 55;
        this.punchHitbox.setPosition(this.x + offsetX, this.y - 5);
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

