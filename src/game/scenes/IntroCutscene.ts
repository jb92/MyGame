import { Scene } from 'phaser';
import { GameState } from '../systems/GameState';

/**
 * Intro cutscene — plays between MainMenu and Level 1.
 *
 * Sequence:
 *  1. Starry sky (matches menu), camera zooms toward a bright star
 *  2. The star reveals itself as the starship approaching
 *  3. Ship shakes and explodes
 *  4. Ship crashes toward city, panda ejects
 *  5. Panda falls into the street — seamless transition to Level 1
 */
export class IntroCutscene extends Scene {
    private transitioning = false;

    constructor() {
        super('IntroCutscene');
    }

    create() {
        this.transitioning = false;
        const W = this.scale.width;
        const H = this.scale.height;

        // No fade — cutscene sky matches menu sky exactly

        // Allow skipping with ENTER or SPACE
        const skipText = this.add.text(W - 20, H - 20, 'Press ENTER to skip', {
            fontSize: '12px', color: '#666688',
        }).setOrigin(1, 1).setDepth(100).setAlpha(0);
        this.tweens.add({ targets: skipText, alpha: 1, delay: 1500, duration: 500 });

        const skipCutscene = () => {
            if (this.transitioning) return;
            this.transitioning = true;
            this.scene.start('Level1_City');
        };
        this.input.keyboard!.on('keydown-ENTER', skipCutscene);
        this.input.keyboard!.on('keydown-SPACE', skipCutscene);

        // ──── Sky — matches MainMenu gradient exactly ────
        const bg = this.add.graphics().setDepth(0);
        bg.fillGradientStyle(0x000022, 0x000022, 0x001144, 0x001144, 1);
        bg.fillRect(0, 0, W, H);

        // Stars (same density as menu)
        const starsGfx = this.add.graphics().setDepth(1);
        starsGfx.fillStyle(0xffffff, 1);
        for (let i = 0; i < 150; i++) {
            starsGfx.fillCircle(
                Math.random() * W,
                Math.random() * H * 0.85,
                Math.random() < 0.85 ? 1 : 1.5
            );
        }

        // The bright "hero star" that becomes the ship
        const starX = W / 2;
        const starY = 120;
        const brightStar = this.add.circle(starX, starY, 3, 0xffffff).setDepth(2);
        const starGlow = this.add.circle(starX, starY, 10, 0x88aaff, 0.3).setDepth(2);

        // Starship — starts tiny and invisible
        const ship = this.add.sprite(starX, starY, 'starship', 0)
            .setScale(0.01).setAlpha(0).setDepth(5);

        // Damaged ship version — used after explosion
        const damagedShip = this.add.sprite(starX, starY, 'starship', 2)
            .setScale(0.01).setAlpha(0).setDepth(5);

        // Hero panda — starts hidden
        const panda = this.add.sprite(starX, starY, 'hero_jump', 0)
            .setScale(0).setAlpha(0).setDepth(6);

        // ──── City backdrop — matches Level 1 colors exactly ────
        const cityGfx = this.add.graphics().setDepth(3).setAlpha(0);

        // Level 1 bg color (#1a1a2e) for the sky portion
        cityGfx.fillStyle(0x1a1a2e, 1);
        cityGfx.fillRect(0, 0, W, H);

        // Dark building backdrop (same as Level 1: 0x0d0d1e)
        cityGfx.fillStyle(0x0d0d1e, 1);
        cityGfx.fillRect(0, 0, W, 480);

        // Buildings (same colors as Level 1: 0x111122)
        cityGfx.fillStyle(0x111122, 1);
        const buildings = [
            [0, 200, 120, 568], [150, 280, 90, 488], [280, 150, 140, 618],
            [460, 220, 100, 548], [600, 180, 120, 588], [760, 250, 80, 518],
            [880, 130, 150, 638],
        ];
        buildings.forEach(([x, y, w, h]) => cityGfx.fillRect(x, y, w, h));

        // Windows (same style as Level 1)
        cityGfx.fillStyle(0xffff88, 0.6);
        buildings.forEach(([bx, by, bw, bh]) => {
            const padX = 8, padY = 12, winW = 8, winH = 10, gapX = 20, gapY = 22;
            for (let wx = bx + padX; wx + winW < bx + bw - padX; wx += gapX) {
                for (let wy = by + padY; wy + winH < by + bh - padY; wy += gapY) {
                    if (Math.random() > 0.4) cityGfx.fillRect(wx, wy, winW, winH);
                }
            }
        });

        // Ground (same color as Level 1: 0x444455)
        cityGfx.fillStyle(0x444455, 1);
        cityGfx.fillRect(0, 748, W, 20);

        // Explosion flash overlay
        const flashOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0)
            .setDepth(50);

        // Fire / smoke particles
        const createParticle = (x: number, y: number, color: number, size: number) => {
            const p = this.add.circle(x, y, size, color, 0.8).setDepth(4);
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

        // Phase 3 (4–5.5s): Ship shakes and catches fire
        this.time.delayedCall(3800, () => {
            this.tweens.add({
                targets: ship,
                x: starX - 8,
                duration: 50,
                yoyo: true,
                repeat: 15,
                ease: 'Sine.easeInOut',
            });

            this.time.addEvent({
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
            this.tweens.add({
                targets: flashOverlay,
                alpha: 0.8,
                duration: 100,
                yoyo: true,
                hold: 80,
            });

            damagedShip.setPosition(ship.x, ship.y).setScale(ship.scale).setAlpha(1);
            ship.setAlpha(0);
            this.cameras.main.shake(400, 0.01);
        });

        // Phase 4 (5.5–8s): City appears, ship crashes, panda ejects
        this.time.delayedCall(5500, () => {
            // Crossfade: sky fades out, city fades in
            this.tweens.add({ targets: [bg, starsGfx], alpha: 0, duration: 1200 });
            this.tweens.add({ targets: cityGfx, alpha: 1, duration: 1200 });

            // Ship falls diagonally
            this.tweens.add({
                targets: damagedShip,
                x: W / 2 + 100,
                y: H - 100,
                scale: 0.08,
                angle: 35,
                duration: 2500,
                ease: 'Quad.easeIn',
            });

            // Smoke trail
            this.time.addEvent({
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

            // Panda ejects upward
            this.time.delayedCall(500, () => {
                panda.setPosition(damagedShip.x - 30, damagedShip.y - 20)
                    .setAlpha(1).setScale(0.3);
                this.tweens.add({
                    targets: panda,
                    x: 80,
                    y: 200,
                    angle: -180,
                    duration: 1000,
                    ease: 'Quad.easeOut',
                });
            });
        });

        // Phase 5 (8–9.5s): Crash impact, panda falls to spawn point
        this.time.delayedCall(8000, () => {
            this.tweens.add({
                targets: flashOverlay,
                alpha: 0.6,
                duration: 80,
                yoyo: true,
                hold: 60,
            });
            this.cameras.main.shake(600, 0.02);

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

            // Panda falls to the street at x≈80 (Level 1 spawn point)
            this.tweens.add({
                targets: panda,
                y: 700,
                x: 80,
                angle: 0,
                scale: 0.5,
                duration: 1200,
                ease: 'Bounce.easeOut',
            });
        });

        // Phase 6 (9.5–11s): Panda lands, direct transition to Level 1
        this.time.delayedCall(9800, () => {
            if (this.transitioning) return;
            panda.setTexture('hero_idle', 0);

            this.time.delayedCall(600, () => {
                if (this.transitioning) return;
                this.transitioning = true;
                this.scene.start('Level1_City');
            });
        });
    }
}
