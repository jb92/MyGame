import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';

type EnemyState = 'patrol' | 'chase' | 'attack' | 'stun' | 'dead';

const PATROL_SPEED = 80;
const CHASE_SPEED = 140;
const DETECT_RANGE = 280;
const ATTACK_RANGE = 60;
const ATTACK_COOLDOWN = 1200;
const STUN_DURATION = 400;

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
        super(scene, x, y, 'enemy_idle');
        this.target = target;
        this.maxHp = hp;
        this.hp = hp;
        this.damage = dmg;
        this.facingRight = true;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(400);
        // Placeholder texture is 60×70px at scale 1.0 (world size 60×70px)
        body.setSize(44, 62);
        body.setOffset(8, 8);
        this.setScale(1.0);
        this.setDepth(9);

        this.healthBarBg = scene.add.rectangle(x, y - 55, 50, 6, 0x333333).setDepth(20);
        this.healthBar = scene.add.rectangle(x, y - 55, 50, 6, 0xff2222).setDepth(21);
    }

    update(delta: number) {
        if (this.state === 'dead') return;

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
        const texMap: Record<EnemyState, string> = {
            patrol: 'enemy_idle',
            chase: 'enemy_walk',
            attack: 'enemy_attack',
            stun: 'enemy_idle',
            dead: 'enemy_idle',
        };
        this.setTexture(texMap[next]);
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
        this.healthBarBg.setPosition(this.x, this.y - 55);
        this.healthBar.setPosition(this.x - 25 + (this.healthBar.width / 2), this.y - 55);
    }

    destroy(fromScene?: boolean) {
        this.healthBar?.destroy();
        this.healthBarBg?.destroy();
        super.destroy(fromScene);
    }
}

