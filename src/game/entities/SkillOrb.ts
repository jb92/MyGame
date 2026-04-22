import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { GameState, Skill } from '../systems/GameState';

interface SkillOrbConfig {
    skill: Skill;
    label: string;
    description: string;
    color: number;
}

export const SKILL_CONFIGS: Record<Skill, SkillOrbConfig> = {
    [Skill.DASH]: {
        skill: Skill.DASH,
        label: 'DASH',
        description: 'Your legs remember the alien dash technique!\nPress SHIFT to dash forward.',
        color: 0x00aaff,
    },
    [Skill.COMBO_PUNCH]: {
        skill: Skill.COMBO_PUNCH,
        label: 'COMBO PUNCH',
        description: 'Your fists recall the triple combo!\nPress Z rapidly for a 3-hit combo.',
        color: 0xff6600,
    },
    [Skill.GROUND_SLAM]: {
        skill: Skill.GROUND_SLAM,
        label: 'GROUND SLAM',
        description: 'Your body remembers the seismic slam!\nPress ↓ in mid-air to slam down.',
        color: 0xaa00ff,
    },
};

export class SkillOrb extends Phaser.Physics.Arcade.StaticGroup {
    private orb: Phaser.Physics.Arcade.Sprite;
    private glowTween: Phaser.Tweens.Tween;
    private label: Phaser.GameObjects.Text;
    private config: SkillOrbConfig;
    private collected = false;

    constructor(scene: Phaser.Scene, x: number, y: number, skill: Skill) {
        super(scene.physics.world, scene);
        this.config = SKILL_CONFIGS[skill];

        // Visual orb
        const gfx = scene.add.graphics();
        gfx.fillStyle(this.config.color, 1);
        gfx.fillCircle(24, 24, 24);
        gfx.generateTexture(`orb_${skill}`, 48, 48);
        gfx.destroy();

        this.orb = scene.physics.add.sprite(x, y, `orb_${skill}`).setDepth(12);
        this.add(this.orb);

        this.label = scene.add.text(x, y - 36, this.config.label, {
            fontSize: '10px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(13);

        this.glowTween = scene.tweens.add({
            targets: this.orb,
            y: y - 12,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    collect() {
        if (this.collected) return;
        this.collected = true;
        GameState.unlockSkill(this.config.skill);
        this.glowTween.stop();
        this.label.destroy();
        this.scene.tweens.add({
            targets: this.orb,
            scale: 3,
            alpha: 0,
            duration: 400,
            onComplete: () => this.orb.destroy(),
        });
        EventBus.emit('skill-unlocked', this.config);
    }

    getConfig() {
        return this.config;
    }

    getOrb(): Phaser.Physics.Arcade.Sprite {
        return this.orb;
    }
}

