import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

/**
 * Intro cutscene — plays between MainMenu and Level 1.
 *
 * Sequence:
 *  1. Starry sky, camera zooms toward a bright star
 *  2. The star reveals itself as the starship approaching
 *  3. Ship shakes and explodes
 *  4. Ship crashes toward city, panda ejects
 *  5. Panda falls into the street — fade to gameplay
 */
export class IntroCutscene extends Scene {
    constructor() {
        super('IntroCutscene');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Allow skipping with ENTER or SPACE
        const skipText = this.add.text(W - 20, H - 20, 'Press ENTER to skip', {
            fontSize: '12px', color: '#666688',
        }).setOrigin(1, 1).setDepth(100).setAlpha(0);
        this.tweens.add({ targets: skipText, alpha: 1, delay: 1500, duration: 500 });

        const skipCutscene = () => {
            this.cameras.main.fade(300, 0, 0, 0, false, (_c: any, p: number) => {
                if (p === 1) this.scene.start('Level1_City');
            });
        };
        this.input.keyboard!.on('keydown-ENTER', skipCutscene);
        this.input.keyboard!.on('keydown-SPACE', skipCutscene);

        // ──── Build the sky ────
        const bg = this.add.graphics().setDepth(0);
        bg.fillGradientStyle(0x000011, 0x000011, 0x000033, 0x000033, 1);
        bg.fillRect(0, 0, W, H);

        // Stars
        const starsGfx = this.add.graphics().setDepth(1);
        starsGfx.fillStyle(0xffffff, 1);
        for (let i = 0; i < 200; i++) {
            starsGfx.fillCircle(
                Math.random() * W,
                Math.random() * H,
                Math.random() < 0.85 ? 1 : 1.5
            );
        }

        // The bright "hero star" that becomes the ship
        const starX = W / 2;
        const starY = 120;
        const brightStar = this.add.circle(starX, starY, 3, 0xffffff).setDepth(2);
        const starGlow = this.add.circle(starX, starY, 10, 0x88aaff, 0.3).setDepth(2);

        // Starship — starts invisible, will fade in when star grows
        const ship = this.add.sprite(starX, starY, 'starship', 0)
            .setScale(0.01).setAlpha(0).setDepth(5);

        // Damaged ship version — used after explosion
        const damagedShip = this.add.sprite(starX, starY, 'starship', 2)
            .setScale(0.01).setAlpha(0).setDepth(5);

        // Hero panda — starts hidden
        const panda = this.add.sprite(starX, starY, 'hero_jump', 0)
            .setScale(0).setAlpha(0).setDepth(6);

        // City silhouette at bottom (drawn later, visible in phase 4+)
        const cityGfx = this.add.graphics().setDepth(3).setAlpha(0);
        cityGfx.fillStyle(0x111122, 1);
        const buildings = [
            [0, 520, 60, 248], [70, 480, 50, 288], [130, 540, 70, 228],
            [210, 460, 55, 308], [275, 510, 65, 258], [350, 470, 50, 298],
            [410, 530, 60, 238], [480, 490, 55, 278], [545, 450, 70, 318],
            [625, 520, 50, 248], [685, 480, 65, 288], [760, 500, 55, 268],
            [825, 460, 60, 308], [895, 530, 50, 238], [955, 490, 69, 278],
        ];
        buildings.forEach(([x, y, w, h]) => cityGfx.fillRect(x, y, w, h));
        // Windows
        cityGfx.fillStyle(0xffff88, 0.5);
        buildings.forEach(([bx, by, bw, bh]) => {
            for (let wx = bx + 5; wx + 6 < bx + bw - 5; wx += 14) {
                for (let wy = by + 8; wy + 8 < by + bh - 8; wy += 16) {
                    if (Math.random() > 0.3) cityGfx.fillRect(wx, wy, 6, 8);
                }
            }
        });
        // Ground
        cityGfx.fillStyle(0x333344, 1);
        cityGfx.fillRect(0, 740, W, 28);

        // Explosion flash overlay
        const flashOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0)
            .setDepth(50);

        // Smoke / fire particles (simple circles)
        const particles: Phaser.GameObjects.Arc[] = [];
        const createParticle = (x: number, y: number, color: number, size: number) => {
            const p = this.add.circle(x, y, size, color, 0.8).setDepth(4);
            particles.push(p);
            this.tweens.add({
                targets: p,
                x: x + (Math.random() - 0.5) * 100,
                y: y + Math.random() * 60 + 20,
                alpha: 0,
                scale: 2,
                duration: 800 + Math.random() * 400,
                onComplete: () => p.destroy(),
            });
        };

        // ──── ANIMATION TIMELINE ────

        // Phase 1 (0–2s): Zoom toward the bright star
        this.tweens.add({
            targets: [brightStar, starGlow],
            scale: 3,
            duration: 2000,
            ease: 'Quad.easeIn',
        });

        // Phase 2 (2–4s): Star fades, ship appears and grows
        this.time.delayedCall(1800, () => {
            this.tweens.add({
                targets: [brightStar, starGlow],
                alpha: 0,
                duration: 500,
            });
            ship.setAlpha(1);
            this.tweens.add({
                targets: ship,
                scale: 0.15,
                duration: 2000,
                ease: 'Quad.easeOut',
            });
        });

        // Phase 3 (4–5.5s): Ship shakes and explodes
        this.time.delayedCall(3800, () => {
            // Shake the ship
            this.tweens.add({
                targets: ship,
                x: starX - 8,
                duration: 50,
                yoyo: true,
                repeat: 15,
                ease: 'Sine.easeInOut',
            });

            // Spawn fire particles around ship
            const fireTimer = this.time.addEvent({
                delay: 80,
                repeat: 15,
                callback: () => {
                    createParticle(
                        ship.x + (Math.random() - 0.5) * 60,
                        ship.y + (Math.random() - 0.5) * 20,
                        Math.random() > 0.5 ? 0xff4400 : 0xff8800,
                        4 + Math.random() * 6
                    );
                },
            });
        });

        // Phase 3b (5s): Explosion flash, switch to damaged ship
        this.time.delayedCall(5000, () => {
            // Flash
            this.tweens.add({
                targets: flashOverlay,
                alpha: 0.8,
                duration: 100,
                yoyo: true,
                hold: 80,
            });

            // Swap to damaged ship
            damagedShip.setPosition(ship.x, ship.y).setScale(ship.scale).setAlpha(1);
            ship.setAlpha(0);

            // Camera shake
            this.cameras.main.shake(400, 0.01);
        });

        // Phase 4 (5.5–8s): Ship falls toward city, panda ejects upward
        this.time.delayedCall(5500, () => {
            // Show city
            this.tweens.add({
                targets: cityGfx,
                alpha: 1,
                duration: 800,
            });

            // Ship falls diagonally with rotation
            this.tweens.add({
                targets: damagedShip,
                x: W / 2 + 100,
                y: H - 100,
                scale: 0.08,
                angle: 35,
                duration: 2500,
                ease: 'Quad.easeIn',
            });

            // Trail smoke behind ship
            const smokeTimer = this.time.addEvent({
                delay: 60,
                repeat: 40,
                callback: () => {
                    createParticle(
                        damagedShip.x - 20,
                        damagedShip.y - 10,
                        0x555555,
                        5 + Math.random() * 8
                    );
                },
            });

            // Panda ejects upward (0.5s after ship starts falling)
            this.time.delayedCall(500, () => {
                panda.setPosition(damagedShip.x - 30, damagedShip.y - 20)
                    .setAlpha(1).setScale(0.3);
                this.tweens.add({
                    targets: panda,
                    x: W / 2 - 80,
                    y: 200,
                    angle: -180,
                    duration: 1000,
                    ease: 'Quad.easeOut',
                });
            });
        });

        // Phase 5 (8–9.5s): Crash impact, panda falls down
        this.time.delayedCall(8000, () => {
            // Crash flash + shake
            this.tweens.add({
                targets: flashOverlay,
                alpha: 0.6,
                duration: 80,
                yoyo: true,
                hold: 60,
            });
            this.cameras.main.shake(600, 0.02);

            // Explosion particles at crash site
            for (let i = 0; i < 12; i++) {
                this.time.delayedCall(i * 40, () => {
                    createParticle(
                        damagedShip.x + (Math.random() - 0.5) * 80,
                        damagedShip.y + (Math.random() - 0.5) * 30,
                        [0xff4400, 0xff8800, 0xffcc00][Math.floor(Math.random() * 3)],
                        6 + Math.random() * 10
                    );
                });
            }
            damagedShip.setAlpha(0);

            // Panda falls to the street
            this.tweens.add({
                targets: panda,
                y: H - 70,
                x: W / 2 - 60,
                angle: 0,
                scale: 0.4,
                duration: 1200,
                ease: 'Bounce.easeOut',
            });
        });

        // Phase 6 (9.5–11s): Brief pause, then fade to gameplay
        this.time.delayedCall(9800, () => {
            // Flash panda texture to idle
            panda.setTexture('hero_idle', 0);

            this.time.delayedCall(800, () => {
                this.cameras.main.fade(600, 0, 0, 0, false, (_c: any, p: number) => {
                    if (p === 1) this.scene.start('Level1_City');
                });
            });
        });
    }
}
