import * as Phaser from 'phaser';

/**
 * Boss entity — simplified to avoid Phaser 4 physics-engine infinite loops.
 * Movement and attacks use simple per-frame logic with no delayedCalls,
 * no EventBus, and no physics velocity changes during combat.
 */

const BOSS_SCALE = 0.7;
const WALK_SPEED = 120;
const ATTACK_RANGE = 100;
const PUNCH_COOLDOWN = 1600;
const STUN_FRAMES = 30; // ~500ms at 60fps

export class Boss extends Phaser.Physics.Arcade.Sprite {
    maxHp: number;
    hp: number;
    damage: number;

    private dead = false;
    private stunFrames = 0;
    private punchCdFrames = 0;
    private attackFrames = 0; // >0 means playing punch animation
    private hitThisFrame = false; // flag read by scene
    private tintFrames = 0;
    private target: Phaser.Physics.Arcade.Sprite;

    private healthBar!: Phaser.GameObjects.Rectangle;
    private healthBarBg!: Phaser.GameObjects.Rectangle;
    private healthBarFrame!: Phaser.GameObjects.Rectangle;
    private nameText!: Phaser.GameObjects.Text;
    private currentAnim = '';

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        target: Phaser.Physics.Arcade.Sprite,
        hp = 300,
        dmg = 25
    ) {
        super(scene, x, y, 'gman_boss_idle');
        this.target = target;
        this.maxHp = hp;
        this.hp = hp;
        this.damage = dmg;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(400);
        body.setSize(100, 160);
        body.setOffset(78, 74);
        body.setCollideWorldBounds(true);
        this.setScale(BOSS_SCALE);
        this.setOrigin(0.5, 1);
        this.setDepth(9);

        this.createHUD(scene);
        this.createAnimations();
        this.safePlay('anim_boss_idle');
    }

    private createHUD(scene: Phaser.Scene) {
        const barWidth = 200;
        const barHeight = 14;
        const cx = scene.scale.width / 2;
        const topY = 50;
        const leftX = cx - barWidth / 2;
        this.healthBarBg = scene.add.rectangle(cx, topY, barWidth + 4, barHeight + 4, 0x000000)
            .setDepth(90).setScrollFactor(0);
        this.healthBarFrame = scene.add.rectangle(cx, topY, barWidth + 4, barHeight + 4)
            .setStrokeStyle(2, 0xffffff).setFillStyle(0x000000, 0).setDepth(91).setScrollFactor(0);
        this.healthBar = scene.add.rectangle(leftX, topY, barWidth, barHeight, 0xff2222)
            .setOrigin(0, 0.5).setDepth(91).setScrollFactor(0);
        this.nameText = scene.add.text(cx, topY - 14, 'G-MAN', {
            fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(91).setScrollFactor(0);
    }

    private createAnimations() {
        const anims = this.scene.anims;
        const defs: { key: string; sheet: string; rate: number; repeat: number }[] = [
            { key: 'anim_boss_idle',  sheet: 'gman_boss_idle',  rate: 10, repeat: -1 },
            { key: 'anim_boss_walk',  sheet: 'gman_boss_walk',  rate: 12, repeat: -1 },
            { key: 'anim_boss_jump',  sheet: 'gman_boss_jump',  rate: 12, repeat: -1 },
            { key: 'anim_boss_punch', sheet: 'gman_boss_punch', rate: 14, repeat: -1 },
        ];
        for (const d of defs) {
            if (!anims.exists(d.key)) {
                anims.create({
                    key: d.key,
                    frames: anims.generateFrameNumbers(d.sheet, { start: 0, end: 24 }),
                    frameRate: d.rate,
                    repeat: d.repeat,
                });
            }
        }
    }

    /** Safe play that never re-triggers the same animation */
    private safePlay(key: string) {
        if (this.currentAnim === key) return;
        this.currentAnim = key;
        this.play(key);
    }

    /**
     * Called once per frame by the scene. Returns true if the boss
     * wants to deal damage this frame (scene should check distance).
     */
    tick(): boolean {
        if (this.dead || !this.active) return false;

        this.hitThisFrame = false;

        // Decrement frame-based timers
        if (this.punchCdFrames > 0) this.punchCdFrames--;
        if (this.tintFrames > 0) {
            this.tintFrames--;
            if (this.tintFrames === 0) this.clearTint();
        }

        // Stunned — just stand still
        if (this.stunFrames > 0) {
            this.stunFrames--;
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocityX(0);
            this.safePlay('anim_boss_idle');
            return false;
        }

        // Attack animation playing — hold pose then resume
        if (this.attackFrames > 0) {
            this.attackFrames--;
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocityX(0);
            // Deal damage at the midpoint of the attack anim
            if (this.attackFrames === 18) {
                this.hitThisFrame = true;
            }
            if (this.attackFrames === 0) {
                this.safePlay('anim_boss_idle');
            }
            return this.hitThisFrame;
        }

        // AI: chase or attack
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return false;

        const dx = this.target.x - this.x;
        const dist = Math.abs(dx);
        const dir = dx > 0 ? 1 : -1;

        // Face target
        this.setFlipX(dir < 0);

        if (dist <= ATTACK_RANGE && this.punchCdFrames <= 0) {
            // Start attack
            body.setVelocityX(0);
            this.safePlay('anim_boss_punch');
            this.attackFrames = 36; // ~600ms at 60fps
            this.punchCdFrames = Math.round(PUNCH_COOLDOWN / 16.67);
        } else if (dist > ATTACK_RANGE) {
            // Chase
            body.setVelocityX(dir * WALK_SPEED);
            this.safePlay('anim_boss_walk');
        } else {
            // In range but on cooldown
            body.setVelocityX(0);
            this.safePlay('anim_boss_idle');
        }

        return false;
    }

    /** Called by scene when player hits the boss */
    hit(damage: number) {
        if (this.dead) return;
        this.hp -= damage;
        this.stunFrames = STUN_FRAMES;
        this.attackFrames = 0;
        this.setTint(0xff8888);
        this.tintFrames = 12;

        this.updateHealthBar();

        if (this.hp <= 0) {
            this.die();
        }
    }

    private die() {
        this.dead = true;
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setVelocityX(0);
            body.setVelocityY(0);
            body.enable = false;
        }
        this.clearTint();
        this.setActive(false);
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            y: this.y - 30,
            duration: 800,
        });
    }

    private updateHealthBar() {
        const ratio = Math.max(0, this.hp / this.maxHp);
        this.healthBar.width = 200 * ratio;
    }

    isDead(): boolean {
        return this.dead;
    }

    destroy(fromScene?: boolean) {
        this.healthBar?.destroy();
        this.healthBarBg?.destroy();
        this.healthBarFrame?.destroy();
        this.nameText?.destroy();
        super.destroy(fromScene);
    }
}
