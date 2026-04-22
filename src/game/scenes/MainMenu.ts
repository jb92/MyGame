import * as Phaser from 'phaser'
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { GameState } from '../systems/GameState';

export class MainMenu extends Scene
{
    private title!: Phaser.GameObjects.Text;
    private subtitle!: Phaser.GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        const W = this.scale.width;
        const H = this.scale.height;

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x000022, 0x000022, 0x001144, 0x001144, 1);
        bg.fillRect(0, 0, W, H);

        // Stars
        bg.fillStyle(0xffffff, 1);
        for (let i = 0; i < 120; i++) {
            bg.fillCircle(Math.random() * W, Math.random() * H * 0.7, Math.random() < 0.8 ? 1 : 2);
        }

        // Crashed ship silhouette
        bg.fillStyle(0x334455, 0.7);
        bg.fillEllipse(W / 2 + 200, H - 100, 160, 55);
        bg.fillStyle(0x223344, 0.5);
        bg.fillEllipse(W / 2 + 200, H - 115, 70, 30);

        // Title
        this.title = this.add.text(W / 2, 160, '🐼 ALIEN PANDA', {
            fontSize: '56px', color: '#ffffff',
            stroke: '#001166', strokeThickness: 8,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(10);

        this.add.text(W / 2, 230, 'CRASH ON EARTH', {
            fontSize: '28px', color: '#88aaff',
            stroke: '#000033', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(10);

        // Lore
        this.add.text(W / 2, 320,
            '"Your starship crash-landed on Earth.\nG-men are closing in. You must fight through 3 environments,\nrecover your lost skills, and find your ship."',
            {
                fontSize: '14px', color: '#aaccff', align: 'center',
                wordWrap: { width: 560 },
            }
        ).setOrigin(0.5).setDepth(10);

        // Controls panel
        const panelY = 410;
        const panelW = 480;
        const panelH = 120;
        const panel = this.add.graphics();
        panel.fillStyle(0x112244, 0.85);
        panel.fillRoundedRect(W / 2 - panelW / 2, panelY - 10, panelW, panelH, 12);
        panel.lineStyle(2, 0x4488cc, 0.9);
        panel.strokeRoundedRect(W / 2 - panelW / 2, panelY - 10, panelW, panelH, 12);
        panel.setDepth(10);

        this.add.text(W / 2, panelY + 8, '— CONTROLS —', {
            fontSize: '16px', color: '#ffdd44', fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5).setDepth(11);

        const controlLines = [
            '← →  Move        ↑  Jump        Z  Punch',
            'SHIFT  Dash (unlock)        E  Talk to allies',
        ];
        controlLines.forEach((line, i) => {
            this.add.text(W / 2, panelY + 40 + i * 28, line, {
                fontSize: '16px', color: '#cce0ff', align: 'center',
                fontFamily: 'monospace',
            }).setOrigin(0.5).setDepth(11);
        });

        // Start button
        const startBtn = this.add.text(W / 2, 540, '[ PRESS ENTER TO START ]', {
            fontSize: '22px', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

        this.tweens.add({ targets: startBtn, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

        startBtn.on('pointerdown', () => this.startGame());
        this.input.keyboard!.once('keydown-ENTER', () => this.startGame());

        EventBus.emit('current-scene-ready', this);
    }

    private startGame() {
        GameState.reset();
        this.cameras.main.fade(400, 0, 0, 0, false, (_cam: any, p: number) => {
            if (p === 1) this.scene.start('Level1_City');
        });
    }
}

