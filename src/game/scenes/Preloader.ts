import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, 0x000022);
        this.add.text(W / 2, H / 2 - 60, '🐼 ALIEN PANDA', {
            fontSize: '36px', color: '#ffffff',
            stroke: '#001166', strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.rectangle(W / 2, H / 2, 468, 32).setStrokeStyle(1, 0xffffff);
        const bar = this.add.rectangle(W / 2 - 230, H / 2, 4, 28, 0x4488ff);

        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        this.load.setPath('assets');
        const frameConfig = { frameWidth: 256, frameHeight: 256 };
        this.load.spritesheet('hero_idle',    'hero/Martin-idle.png',    frameConfig);
        this.load.spritesheet('hero_walk',    'hero/Martin-walk.png',    frameConfig);
        this.load.spritesheet('hero_run',     'hero/Martin-run.png',     frameConfig);
        this.load.spritesheet('hero_jump',    'hero/Martin-jump.png',    frameConfig);
        this.load.spritesheet('hero_punch',   'hero/Martin-punch.png',   frameConfig);
        this.load.spritesheet('hero_dash',    'hero/Martin-dash.png',    frameConfig);
        this.load.spritesheet('hero_victory', 'hero/Martin-victory.png', frameConfig);
        this.load.spritesheet('hero_pickup',  'hero/Martin-pickup.png',  frameConfig);

        // G-man enemy sprites (1280×1280, 5×5 grid)
        this.load.spritesheet('gman_walk',   'enemies/G-man-walk.png',   frameConfig);
        this.load.spritesheet('gman_attack', 'enemies/G-man-attack.png', frameConfig);

        // Starship: 1024×1024, 3 rows — frame 0=repaired, frame 2=damaged
        this.load.spritesheet('starship', 'ship/Starship-nobg.png', { frameWidth: 1024, frameHeight: 341 });

        // City platforms: extracted individual frames
        this.load.spritesheet('city_plat_wide', 'platforms/city-platform-wide.png', { frameWidth: 156, frameHeight: 36 });
        this.load.spritesheet('city_plat_narrow', 'platforms/city-platform-narrow.png', { frameWidth: 69, frameHeight: 36 });
    }

    create ()
    {
        // Generate placeholder textures for enemies and allies
        this.generatePlaceholders();
        this.scene.start('MainMenu');
    }

    private generatePlaceholders() {
        // Ally: friendly NPC (placeholder)
        const allyGfx = this.make.graphics({ x: 0, y: 0 });
        allyGfx.fillStyle(0x006633, 1);
        allyGfx.fillRect(10, 10, 30, 40);   // body
        allyGfx.fillStyle(0xffcc99, 1);
        allyGfx.fillCircle(25, 5, 18);       // head
        allyGfx.fillStyle(0x005522, 1);
        allyGfx.fillRect(0, 12, 10, 22);    // left arm
        allyGfx.fillRect(40, 12, 10, 22);   // right arm
        allyGfx.fillRect(10, 50, 12, 22);   // left leg
        allyGfx.fillRect(28, 50, 12, 22);   // right leg
        allyGfx.generateTexture('ally', 50, 75);
        allyGfx.destroy();
    }
}
