import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';

type EnemyState = 'patrol' | 'chase' | 'attack' | 'stun' | 'dead';

const PATROL_SPEED = 80;
const CHASE_SPEED = 140;
const DETECT_RANGE = 280;
const ATTACK_RANGE = 60;
const ATTACK_COOLDOWN = 1200;
const STUN_DURATION = 400;

const ENEMY_SCALE = 0.5;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private state: EnemyState = 'patrol';
    private facingRight: boolean;
    private patrolDir = 1;
    private attackCooldown = 0;
    private stunTimer = 0;
    private target!: Phaser.Physics.Arcade.Sprite;
    maxHp: number;
    hp: number;
    damage: number;
    private healthBar!: Phaser.GameObjects.Rectangle;
    private healthBarBg!: Phaser.GameObjects.Rectangle;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        target: Phaser.Physics.Arcade.Sprite,
        hp = 60,
        dmg = 15
    ) {
        super(scene, x, y, 'gman_walk');
        this.target = target;
        this.maxHp = hp;
        this.hp = hp;
        this.damage = dmg;
        this.facingRight = true;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(400);
        // 256×256 frames at scale 0.5. Walk feet at texture y=234.
        // body.bottom = sprite.y + scale*(offset.y - 256 + sourceH)
        // For visible feet at surface: offset.y + sourceH = 234
        body.setSize(100, 160);
        body.setOffset(78, 74);
        this.setScale(ENEMY_SCALE);
        this.setOrigin(0.5, 1);
        this.setDepth(9);

        this.healthBarBg = scene.add.rectangle(-100, -100, 50, 6, 0x333333).setDepth(20);
        this.healthBar = scene.add.rectangle(-100, -100, 50, 6, 0xff2222).setDepth(21);

        this.createAnimations();
        this.play('anim_gman_walk');
    }

    private createAnimations() {
        const anims = this.scene.anims;
        if (!anims.exists('anim_gman_walk')) {
            anims.create({
                key: 'anim_gman_walk',
                frames: anims.generateFrameNumbers('gman_walk', { start: 0, end: 24 }),
                frameRate: 12,
                repeat: -1,
            });
        }
        if (!anims.exists('anim_gman_attack')) {
            anims.create({
                key: 'anim_gman_attack',
                frames: anims.generateFrameNumbers('gman_attack', { start: 0, end: 24 }),
                frameRate: 16,
                repeat: -1,
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

        if (dist <= ATTACK_RANGE && this.attackCooldown <= 0) {
            this.transitionTo('attack');
        } else if (dist <= DETECT_RANGE) {
            this.transitionTo('chase');
        } else {
            this.transitionTo('patrol');
        }

        const body = this.body as Phaser.Physics.Arcade.Body;

        switch (this.state) {
            case 'patrol': {
                body.setVelocityX(this.patrolDir * PATROL_SPEED);
                if (body.blocked.right || body.blocked.left) {
                    this.patrolDir *= -1;
                }
                this.facingRight = this.patrolDir > 0;
                this.setFlipX(!this.facingRight);
                break;
            }
            case 'chase': {
                const dir = this.target.x > this.x ? 1 : -1;
                body.setVelocityX(dir * CHASE_SPEED);
                this.facingRight = dir > 0;
                this.setFlipX(!this.facingRight);
                break;
            }
            case 'attack': {
                body.setVelocityX(0);
                if (this.attackCooldown <= 0) {
                    this.attackCooldown = ATTACK_COOLDOWN;
                    EventBus.emit('enemy-attack', { enemy: this, damage: this.damage });
                }
                break;
            }
        }

        this.updateHealthBar();
    }

    private transitionTo(next: EnemyState) {
        if (this.state === next) return;
        this.state = next;

        const animMap: Record<EnemyState, string> = {
            patrol: 'anim_gman_walk',
            chase:  'anim_gman_walk',
            attack: 'anim_gman_attack',
            stun:   'anim_gman_walk',
            dead:   'anim_gman_walk',
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

        if (this.hp <= 0) {
            this.die();
        }
    }

    private die() {
        this.state = 'dead';
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
        this.healthBar.destroy();
        this.healthBarBg.destroy();
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            y: this.y - 20,
            duration: 400,
            onComplete: () => this.destroy(),
        });
        EventBus.emit('enemy-killed', { score: 100 });
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
