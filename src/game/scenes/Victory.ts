import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { GameState } from '../systems/GameState';

export class Victory extends Scene {
    constructor() { super('Victory'); }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor('#001122');

        // Starship animation
        const ship = this.add.rectangle(W / 2, H - 80, 120, 50, 0x88aaff)
            .setStrokeStyle(3, 0xffffff);
        this.add.rectangle(W / 2, H - 95, 60, 20, 0xaaccff);

        this.tweens.add({
            targets: ship,
            y: -100,
            duration: 3500,
            delay: 1500,
            ease: 'Cubic.easeIn',
        });

        this.add.text(W / 2, 120, '🐼 YOU ESCAPED!', {
            fontSize: '40px', color: '#ffffff',
            stroke: '#003366', strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.text(W / 2, 200, 'Your starship is repaired.\nYou blasted off Earth — the G-men never caught you.', {
            fontSize: '16px', color: '#aaddff',
            align: 'center', wordWrap: { width: 600 },
        }).setOrigin(0.5);

        this.add.text(W / 2, 280, `Score: ${GameState.score}`, {
            fontSize: '22px', color: '#ffdd44',
        }).setOrigin(0.5);

        this.add.text(W / 2, 330, `Parts collected: ${GameState.spareParts} / ${GameState.totalSpareParts}`, {
            fontSize: '16px', color: '#88ff88',
        }).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            const btn = this.add.text(W / 2, 680, '[ Press ENTER to return to menu ]', {
                fontSize: '16px', color: '#ffdd44',
            }).setOrigin(0.5);
            this.tweens.add({ targets: btn, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
            this.input.keyboard!.once('keydown-ENTER', () => {
                GameState.reset();
                this.scene.start('MainMenu');
            });
        });

        EventBus.emit('current-scene-ready', this);
    }
}
