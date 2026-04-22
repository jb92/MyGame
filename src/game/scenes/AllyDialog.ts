import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

interface AllyDialogData {
    partLabel: string;
    parentScene?: string;
}

export class AllyDialog extends Scene {
    constructor() { super('AllyDialog'); }

    create(data: AllyDialogData) {
        console.log('[AllyDialog] create() called with data:', data);
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setDepth(200);

        this.add.rectangle(W / 2, H - 140, 700, 170, 0x112211)
            .setStrokeStyle(2, 0x00cc88).setDepth(201);

        this.add.rectangle(W / 2 - 280, H - 140, 80, 80, 0x00cc88).setDepth(201);
        this.add.text(W / 2 - 280, H - 140, '👽', { fontSize: '36px' }).setOrigin(0.5).setDepth(202);

        this.add.text(W / 2 - 220, H - 175, 'EARTH ALLY', {
            fontSize: '11px', color: '#00cc88',
        }).setDepth(202);

        const dialog = `"Hey there, friend! I've been waiting for you.\n` +
            `I found a ${data.partLabel} from your crashed starship.\n` +
            `Here, take it — you'll need it to repair your ship and get off this planet!\n` +
            `Be careful out there, those G-men won't stop hunting you."`;

        this.add.text(W / 2 - 210, H - 160, dialog, {
            fontSize: '13px', color: '#eeffee',
            wordWrap: { width: 460 },
            lineSpacing: 4,
        }).setDepth(202);

        this.add.text(W / 2, H - 90, '[ Press E or ENTER ]', {
            fontSize: '12px', color: '#ffdd44',
        }).setOrigin(0.5).setDepth(202);

        EventBus.emit('spare-part-collected');

        this.input.keyboard!.once('keydown-E', () => this.close(data.parentScene));
        this.input.keyboard!.once('keydown-ENTER', () => this.close(data.parentScene));
    }

    private close(parentScene?: string) {
        if (parentScene) this.scene.get(parentScene)?.scene.resume();
        this.scene.stop();
    }
}
