import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

interface SkillUnlockData {
    label: string;
    description: string;
    color: number;
}

export class SkillUnlock extends Scene {
    constructor() { super('SkillUnlock'); }

    create(data: SkillUnlockData) {
        const W = this.scale.width;
        const H = this.scale.height;

        // Dim overlay
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setDepth(200);

        // Panel
        const panel = this.add.rectangle(W / 2, H / 2, 420, 220, 0x111133)
            .setStrokeStyle(3, data.color).setDepth(201);

        // Orb visual
        const gfx = this.add.graphics().setDepth(202);
        gfx.fillStyle(data.color, 1);
        gfx.fillCircle(W / 2, H / 2 - 60, 28);

        this.add.text(W / 2, H / 2 - 10, `⚡ ${data.label} UNLOCKED!`, {
            fontSize: '20px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(202);

        this.add.text(W / 2, H / 2 + 30, data.description, {
            fontSize: '13px', color: '#ccccff',
            align: 'center', wordWrap: { width: 380 },
        }).setOrigin(0.5).setDepth(202);

        const btn = this.add.text(W / 2, H / 2 + 85, '[ Press Z or ENTER to continue ]', {
            fontSize: '13px', color: '#ffdd44',
        }).setOrigin(0.5).setDepth(202);

        this.tweens.add({ targets: btn, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

        this.input.keyboard!.once('keydown-Z', () => this.close());
        this.input.keyboard!.once('keydown-ENTER', () => this.close());
    }

    private close() {
        const parent = this.scene.get(this.scene.settings.data?.parent as string ?? 'Level1_City');
        parent?.scene.resume();
        this.scene.stop();
    }
}
