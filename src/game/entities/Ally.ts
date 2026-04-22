import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { GameState } from '../systems/GameState';

export class Ally {
    private sprite: Phaser.Physics.Arcade.Sprite;
    private prompt: Phaser.GameObjects.Text;
    private interacted = false;
    private playerRef: Phaser.Physics.Arcade.Sprite;
    private partLabel: string;
    private keyE: Phaser.Input.Keyboard.Key;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        player: Phaser.Physics.Arcade.Sprite,
        partLabel: string
    ) {
        this.playerRef = player;
        this.partLabel = partLabel;

        this.sprite = scene.physics.add.sprite(x, y, 'ally').setScale(0.13).setDepth(8);
        (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);

        this.prompt = scene.add.text(x, y - 70, 'Press E', {
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
        const inRange = dist < 100 && !this.interacted;
        this.prompt.setVisible(inRange);
        this.prompt.setPosition(this.sprite.x, this.sprite.y - 70);

        if (inRange && Phaser.Input.Keyboard.JustDown(this.keyE)) {
            this.interact();
        }
    }

    private interact() {
        this.interacted = true;
        GameState.addSparePart();
        this.prompt.setVisible(false);
        EventBus.emit('show-ally-dialog', { partLabel: this.partLabel });
    }

    getSprite(): Phaser.Physics.Arcade.Sprite {
        return this.sprite;
    }
}

