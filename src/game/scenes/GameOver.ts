import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

export class GameOver extends Scene
{
    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor('#110000');

        const bg = this.add.graphics();
        bg.fillStyle(0x220000, 1);
        bg.fillRect(0, 0, W, H);

        this.add.text(W / 2, 200, '💀 CAPTURED!', {
            fontSize: '54px', color: '#ff2222',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5);

        this.add.text(W / 2, 290, 'The G-men got you.\nYour alien panda instincts failed you this time.', {
            fontSize: '16px', color: '#ffaaaa', align: 'center',
        }).setOrigin(0.5);

        this.add.text(W / 2, 370, `Score: ${GameState.score}`, {
            fontSize: '22px', color: '#ffdd44',
        }).setOrigin(0.5);

        this.add.text(W / 2, 420, `Level reached: ${GameState.currentLevel} / 3`, {
            fontSize: '16px', color: '#ffaa44',
        }).setOrigin(0.5);

        const retryBtn = this.add.text(W / 2, 530, '[ ENTER — Retry from Level 1 ]', {
            fontSize: '18px', color: '#ffdd44',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: retryBtn, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

        const menuBtn = this.add.text(W / 2, 590, '[ M — Main Menu ]', {
            fontSize: '16px', color: '#aaaaff',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        retryBtn.on('pointerdown', () => this.retry());
        menuBtn.on('pointerdown', () => this.menu());
        this.input.keyboard!.once('keydown-ENTER', () => this.retry());
        this.input.keyboard!.once('keydown-M', () => this.menu());

        EventBus.emit('current-scene-ready', this);
    }

    private retry() {
        GameState.reset();
        this.scene.start('Level1_City');
    }

    private menu() {
        GameState.reset();
        this.scene.start('MainMenu');
    }
}
