import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';

type SoldierState = 'patrol' | 'chase' | 'attack' | 'stun' | 'dead';

const PATROL_SPEED = 60;
const CHASE_SPEED = 110;
const DETECT_RANGE = 500;
const ATTACK_RANGE = 380;
const ATTACK_COOLDOWN = 2200;
const STUN_DURATION = 400;
const BULLET_SPEED = 400;
const SOLDIER_SCALE = 0.5;

export class Soldier extends Phaser.Physics.Arcade.Sprite {
    private state: SoldierState = 'patrol';
    private facingRight: boolean;
    private patrolDir = 1;
    private attackCooldown = 0;
    private stunTimer = 0;
    private target!: Phaser.Physics.Arcade.Sprite;
    maxHp: number;
    hp: number;
    damage: number;
    bullets: Phaser.Physics.Arcade.Group;
    private healthBar!: Phaser.GameObjects.Rectangle;
    private healthBarBg!: Phaser.GameObjects.Rectangle;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        target: Phaser.Physics.Arcade.Sprite,
        hp = 80,
        dmg = 15,
    ) {
        super(scene, x, y, 'soldier_idle');
        this.target = target;
        this.maxHp = hp;
        this.hp = hp;
        this.damage = dmg;
        this.facingRight = true;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.bullets = scene.physics.add.group({ defaultKey: 'soldier_bullet', maxSize: 30 });

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(400);
        body.setSize(100, 160);
        body.setOffset(78, 74);
        this.setScale(SOLDIER_SCALE);
        this.setOrigin(0.5, 1);
        this.setDepth(9);

        this.healthBarBg = scene.add.rectangle(-100, -100, 50, 6, 0x333333).setDepth(50).setVisible(false);
        this.healthBar = scene.add.rectangle(-100, -100, 50, 6, 0xff2222).setDepth(51).setVisible(false);

        this.createAnimations();
        this.play('anim_soldier_idle');
    }

    private createAnimations() {
        const anims = this.scene.anims;
        if (!anims.exists('anim_soldier_idle')) {
            anims.create({
                key: 'anim_soldier_idle',
                frames: anims.generateFrameNumbers('soldier_idle', { start: 0, end: 24 }),
                frameRate: 10,
                repeat: -1,
            });
        }
        if (!anims.exists('anim_soldier_walk')) {
            anims.create({
                key: 'anim_soldier_walk',
                frames: anims.generateFrameNumbers('soldier_walk', { start: 0, end: 24 }),
                frameRate: 12,
                repeat: -1,
            });
        }
        if (!anims.exists('anim_soldier_attack')) {
            anims.create({
                key: 'anim_soldier_attack',
                frames: anims.generateFrameNumbers('soldier_attack', { start: 0, end: 24 }),
                frameRate: 16,
                repeat: 0,
            });
        }
    }

    update(delta: number) {
        if (this.state === 'dead' || !this.active || !this.body) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        this.stunTimer = Math.max(0, this.stunTimer - delta);

        if (this.stunTimer > 0) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
            this.updateHealthBar();
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        const body = this.body as Phaser.Physics.Arcade.Body;

        if (dist <= ATTACK_RANGE && this.attackCooldown <= 0) {
            this.transitionTo('attack');
        } else if (dist <= DETECT_RANGE && dist > ATTACK_RANGE) {
            this.transitionTo('chase');
        } else if (dist > DETECT_RANGE) {
            this.transitionTo('patrol');
        }

        switch (this.state) {
            case 'patrol': {
                body.setVelocityX(this.patrolDir * PATROL_SPEED);
                if (body.blocked.right || body.blocked.left) this.patrolDir *= -1;
                this.facingRight = this.patrolDir > 0;
                this.setFlipX(!this.facingRight);
                break;
            }
            case 'chase': {
                const dx = this.target.x - this.x;
                const dir = dx > 0 ? 1 : -1;
                body.setVelocityX(dir * CHASE_SPEED);
                this.facingRight = dir > 0;
                this.setFlipX(!this.facingRight);
                break;
            }
            case 'attack': {
                body.setVelocityX(0);
                this.facingRight = this.target.x > this.x;
                this.setFlipX(!this.facingRight);
                if (this.attackCooldown <= 0) {
                    this.attackCooldown = ATTACK_COOLDOWN;
                    this.fireBullet();
                }
                break;
            }
        }

        // Remove off-screen bullets
        this.bullets.getChildren().forEach((b: any) => {
            if (b.active && (b.x < -50 || b.x > 3250 || b.y < -50 || b.y > 800)) {
                this.deactivateBullet(b);
            }
        });

        this.updateHealthBar();
    }

    private fireBullet() {
        this.play('anim_soldier_attack', true);
        this.once('animationcomplete-anim_soldier_attack', () => {
            if (this.state !== 'dead' && this.active) {
                const anim = this.state === 'patrol' || this.state === 'chase'
                    ? 'anim_soldier_walk' : 'anim_soldier_idle';
                this.play(anim, true);
            }
        });

        // Spawn bullet synced with muzzle flash (~450ms into the 25-frame animation at 16fps)
        this.scene.time.delayedCall(450, () => {
            if (this.state === 'dead' || !this.active) return;
            this.spawnBullet();
        });
    }

    private spawnBullet() {
        const muzzleX = this.facingRight ? this.x + 50 : this.x - 50;
        const muzzleY = this.y - 65;

        const bullet = this.bullets.get(muzzleX, muzzleY, 'soldier_bullet') as Phaser.Physics.Arcade.Sprite;
        if (!bullet) return;

        bullet.setPosition(muzzleX, muzzleY);
        bullet.setActive(true).setVisible(true);
        bullet.setDepth(8);
        bullet.setScale(1);

        // Brief muzzle flash
        const flash = this.scene.add.circle(muzzleX, muzzleY, 8, 0xffff88, 0.9).setDepth(12);
        this.scene.tweens.add({
            targets: flash, alpha: 0, scale: 2,
            duration: 120, onComplete: () => flash.destroy(),
        });

        // Horizontal-only shooting — platforms protect the player
        const body = bullet.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        body.setAllowGravity(false);
        body.velocity.x = this.facingRight ? BULLET_SPEED : -BULLET_SPEED;
        body.velocity.y = 0;
        bullet.setRotation(this.facingRight ? 0 : Math.PI);

        // Auto-destroy after 3s
        this.scene.time.delayedCall(3000, () => {
            if (bullet.active) this.deactivateBullet(bullet);
        });
    }

    private deactivateBullet(bullet: Phaser.Physics.Arcade.Sprite) {
        bullet.setActive(false).setVisible(false);
        const body = bullet.body as Phaser.Physics.Arcade.Body;
        if (body) { body.stop(); body.enable = false; }
    }

    private transitionTo(next: SoldierState) {
        if (this.state === next) return;
        this.state = next;
        const animMap: Record<SoldierState, string> = {
            patrol: 'anim_soldier_walk',
            chase:  'anim_soldier_walk',
            attack: 'anim_soldier_idle',
            stun:   'anim_soldier_idle',
            dead:   'anim_soldier_idle',
        };
        this.play(animMap[next], true);
    }

    hit(damage: number) {
        if (this.state === 'dead') return;
        this.hp -= damage;
        this.stunTimer = STUN_DURATION;
        this.transitionTo('stun');
        this.setTint(0xff8888);
        this.scene.time.delayedCall(200, () => this.clearTint());
        this.healthBarBg.setVisible(true);
        this.healthBar.setVisible(true);
        if (this.hp <= 0) this.die();
    }

    private die() {
        this.state = 'dead';
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
        this.healthBar.destroy();
        this.healthBarBg.destroy();
        this.bullets.getChildren().forEach((b: any) => {
            if (b.active) this.deactivateBullet(b);
        });
        this.scene.tweens.add({
            targets: this, alpha: 0, y: this.y - 20, duration: 400,
            onComplete: () => this.destroy(),
        });
        EventBus.emit('enemy-killed', { score: 150 });
    }

    private updateHealthBar() {
        const ratio = this.hp / this.maxHp;
        this.healthBar.width = 50 * ratio;
        this.healthBarBg.setPosition(this.x, this.y - 110);
        this.healthBar.setPosition(this.x - 25 + (this.healthBar.width / 2), this.y - 110);
    }

    destroy(fromScene?: boolean) {
        this.healthBar?.destroy();
        this.healthBarBg?.destroy();
        super.destroy(fromScene);
    }
}
