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
    [Skill.FIST_LAUNCH]: {
        skill: Skill.FIST_LAUNCH,
        label: 'ROCKET FIST',
        description: 'Your fists remember the alien projection technique!\nPress Z to launch a powerful fist forward.',
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

        // Animated power orb sprite
        this.orb = scene.physics.add.sprite(x, y, 'power_orb').setDepth(12).setScale(0.25);
        this.orb.play('anim_power_orb');
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

