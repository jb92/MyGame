import * as Phaser from 'phaser'
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { GameState, Skill } from '../systems/GameState';

export class HUD extends Scene {
    private healthBarBg!: Phaser.GameObjects.Rectangle;
    private healthBar!: Phaser.GameObjects.Rectangle;
    private healthText!: Phaser.GameObjects.Text;
    private partsText!: Phaser.GameObjects.Text;
    private skillIcons: Phaser.GameObjects.Rectangle[] = [];
    private skillLabels: Phaser.GameObjects.Text[] = [];
    private alive = false;

    constructor() { super({ key: 'HUD', active: false }); }

    create() {
        this.alive = true;
        // Clear arrays so stale references from a previous run don't linger
        this.skillIcons = [];
        this.skillLabels = [];

        // Health bar
        this.add.rectangle(110, 24, 204, 20, 0x000000).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
        this.healthBarBg = this.add.rectangle(112, 24, 200, 16, 0x550000).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
        this.healthBar = this.add.rectangle(112, 24, 200, 16, 0xff3333).setOrigin(0, 0.5).setScrollFactor(0).setDepth(102);

        this.add.text(12, 14, '❤', { fontSize: '18px' }).setScrollFactor(0).setDepth(103);
        this.healthText = this.add.text(320, 14, '', { fontSize: '12px', color: '#ffffff' }).setScrollFactor(0).setDepth(103);

        // Spare parts
        this.partsText = this.add.text(12, 44, '🔧 0 / 3', { fontSize: '13px', color: '#ffdd44' })
            .setScrollFactor(0).setDepth(103);

        // Skill icons
        const skills = ['DASH', 'COMBO', 'SLAM'];
        skills.forEach((s, i) => {
            const x = 14 + i * 64;
            const icon = this.add.rectangle(x + 24, 740, 44, 28, 0x222244)
                .setStrokeStyle(2, 0x4444aa)
                .setScrollFactor(0).setDepth(102);
            const lbl = this.add.text(x + 24, 740, s, { fontSize: '8px', color: '#555588' })
                .setOrigin(0.5).setScrollFactor(0).setDepth(103);
            this.skillIcons.push(icon);
            this.skillLabels.push(lbl);
        });

        // Listen for game events
        EventBus.on('player-damaged', this.updateHealth, this);
        EventBus.on('skill-unlocked', this.updateSkills, this);
        EventBus.on('spare-part-collected', this.updateParts, this);
        // Explicit pre-shutdown hook so the level can clean us up before scene.stop()
        EventBus.on('hud-shutdown', this.shutdown, this);

        // Phaser scene shutdown also calls our cleanup
        this.events.once('shutdown', this.shutdown, this);

        this.updateHealth(GameState.playerHealth);
        this.updateSkills();
        this.updateParts();
    }

    private updateHealth(hp: number) {
        if (!this.alive) return;
        const ratio = hp / GameState.maxHealth;
        this.healthBar.width = 200 * ratio;
        this.healthText.setText(`${hp} / ${GameState.maxHealth}`);
    }

    private updateSkills() {
        if (!this.alive) return;
        const skillKeys = [Skill.DASH, Skill.COMBO_PUNCH, Skill.GROUND_SLAM];
        skillKeys.forEach((k, i) => {
            const unlocked = GameState.hasSkill(k);
            this.skillIcons[i].setFillStyle(unlocked ? 0x334488 : 0x222244);
            this.skillLabels[i].setColor(unlocked ? '#aaaaff' : '#555588');
        });
    }

    private updateParts() {
        if (!this.alive) return;
        this.partsText.setText(`🔧 ${GameState.spareParts} / ${GameState.totalSpareParts}`);
    }

    shutdown() {
        if (!this.alive) return;
        this.alive = false;
        EventBus.off('player-damaged', this.updateHealth, this);
        EventBus.off('skill-unlocked', this.updateSkills, this);
        EventBus.off('spare-part-collected', this.updateParts, this);
        EventBus.off('hud-shutdown', this.shutdown, this);
    }
}

