import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { GameState } from '../systems/GameState';

export class MissingParts extends Scene {
    constructor() { super('MissingParts'); }

    create() {
        const W = this.scale.width;

        this.cameras.main.setBackgroundColor('#110022');

        // Warning icon
        this.add.text(W / 2, 140, '⚠️', { fontSize: '64px' }).setOrigin(0.5);

        this.add.text(W / 2, 230, 'STARSHIP INCOMPLETE', {
            fontSize: '32px', color: '#ffaa44',
            stroke: '#442200', strokeThickness: 5,
        }).setOrigin(0.5);

        const missing = GameState.totalSpareParts - GameState.spareParts;
        this.add.text(W / 2, 310, `You still need ${missing} spare part${missing > 1 ? 's' : ''} to repair your starship!`, {
            fontSize: '18px', color: '#ffffff',
            align: 'center', wordWrap: { width: 600 },
        }).setOrigin(0.5);

        this.add.text(W / 2, 370, `Parts collected: ${GameState.spareParts} / ${GameState.totalSpareParts}`, {
            fontSize: '16px', color: '#88ff88',
        }).setOrigin(0.5);

        this.add.text(W / 2, 440, 'Go back and find the missing pieces.\nYour skills and equipment are intact.', {
            fontSize: '16px', color: '#aabbcc',
            align: 'center', wordWrap: { width: 600 },
        }).setOrigin(0.5);

        this.time.delayedCall(1500, () => {
            const btn = this.add.text(W / 2, 580, '[ Press ENTER to return to the City ]', {
                fontSize: '16px', color: '#ffdd44',
            }).setOrigin(0.5);
            this.tweens.add({ targets: btn, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

            this.input.keyboard!.once('keydown-ENTER', () => {
                GameState.currentLevel = 1;
                // Keep health, skills, score, and collected parts intact
                this.scene.start('Level1_City');
            });
        });

        EventBus.emit('current-scene-ready', this);
    }
}
