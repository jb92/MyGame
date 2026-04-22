import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { GameState } from '../systems/GameState';

const ALLY_SCALE = 0.5;
const WAKE_DISTANCE = 200;
const INTERACT_DISTANCE = 100;

export class Ally {
    private sprite: Phaser.Physics.Arcade.Sprite;
    private prompt: Phaser.GameObjects.Text;
    private interacted = false;
    private awake = false;
    private playerRef: Phaser.Physics.Arcade.Sprite;
    private partLabel: string;
    private keyE: Phaser.Input.Keyboard.Key;
    private scene: Phaser.Scene;
    private dialogContainer?: Phaser.GameObjects.Container;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        player: Phaser.Physics.Arcade.Sprite,
        partLabel: string
    ) {
        this.scene = scene;
        this.playerRef = player;
        this.partLabel = partLabel;

        this.sprite = scene.physics.add
            .sprite(x, y, 'ally_sleep')
            .setScale(ALLY_SCALE)
            .setOrigin(0.5, 1)
            .setDepth(8);
        this.sprite.play('anim_ally_sleep');

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);

        this.prompt = scene.add.text(x, y - 80, 'Press E', {
            fontSize: '12px', color: '#ffffff',
            backgroundColor: '#000000', padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(30).setVisible(false);

        this.keyE = scene.input.keyboard!.addKey('E');
    }

    update() {
        const dist = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.playerRef.x, this.playerRef.y
        );

        if (!this.awake && dist < WAKE_DISTANCE) {
            this.awake = true;
            this.sprite.play('anim_ally_idle');
        } else if (this.awake && dist >= WAKE_DISTANCE && !this.interacted) {
            this.awake = false;
            this.sprite.play('anim_ally_sleep');
        }

        const inRange = dist < INTERACT_DISTANCE && !this.interacted;
        this.prompt.setVisible(inRange);
        this.prompt.setPosition(this.sprite.x, this.sprite.y - 80);

        if (inRange && Phaser.Input.Keyboard.JustDown(this.keyE)) {
            this.interact();
        }

        // Close dialog on E or ENTER press
        if (this.dialogContainer) {
            if (Phaser.Input.Keyboard.JustDown(this.keyE) ||
                Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey('ENTER'))) {
                this.closeDialog();
            }
        }
    }

    private interact() {
        this.interacted = true;
        GameState.addSparePart();
        this.prompt.setVisible(false);
        EventBus.emit('spare-part-collected');
        this.showDialog();
    }

    private showDialog() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const cx = W / 2;
        const cy = H - 140;

        // Use a container with scrollFactor 0 so it stays fixed on screen
        this.dialogContainer = this.scene.add.container(0, 0).setDepth(500);
        this.dialogContainer.setScrollFactor(0);

        // Semi-transparent overlay
        const overlay = this.scene.add.rectangle(cx, H / 2, W, H, 0x000000, 0.55);
        this.dialogContainer.add(overlay);

        // Dialog box
        const box = this.scene.add.rectangle(cx, cy, 700, 170, 0x112211)
            .setStrokeStyle(2, 0x00cc88);
        this.dialogContainer.add(box);

        // Icon
        const icon = this.scene.add.rectangle(cx - 280, cy, 80, 80, 0x00cc88);
        this.dialogContainer.add(icon);
        const emoji = this.scene.add.text(cx - 280, cy, '🐐', { fontSize: '36px' }).setOrigin(0.5);
        this.dialogContainer.add(emoji);

        // Title
        const title = this.scene.add.text(cx - 220, cy - 35, 'EARTH ALLY', {
            fontSize: '11px', color: '#00cc88',
        });
        this.dialogContainer.add(title);

        // Dialog text
        const dialogText = `"Hey there, friend! I've been waiting for you.\n` +
            `I found a ${this.partLabel} from your crashed starship.\n` +
            `Here, take it — you'll need it to repair your ship and get off this planet!\n` +
            `Be careful out there, those G-men won't stop hunting you."`;

        const text = this.scene.add.text(cx - 210, cy - 20, dialogText, {
            fontSize: '13px', color: '#eeffee',
            wordWrap: { width: 460 },
            lineSpacing: 4,
        });
        this.dialogContainer.add(text);

        // Close hint
        const hint = this.scene.add.text(cx, cy + 60, '[ Press E or ENTER ]', {
            fontSize: '12px', color: '#ffdd44',
        }).setOrigin(0.5);
        this.dialogContainer.add(hint);

        // Set up close key listeners
        this.scene.input.keyboard!.once('keydown-ENTER', () => this.closeDialog());
    }

    private closeDialog() {
        if (this.dialogContainer) {
            this.dialogContainer.destroy(true);
            this.dialogContainer = undefined;
        }
    }

    getSprite(): Phaser.Physics.Arcade.Sprite {
        return this.sprite;
    }
}

