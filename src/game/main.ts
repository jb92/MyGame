import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { HUD } from './scenes/HUD';
import { SkillUnlock } from './scenes/SkillUnlock';
import { AllyDialog } from './scenes/AllyDialog';
import { Victory } from './scenes/Victory';
import { IntroCutscene } from './scenes/IntroCutscene';
import { Level1_City } from './scenes/Level1_City';
import { Level2_Forest } from './scenes/Level2_Forest';
import { Level3_Lab } from './scenes/Level3_Lab';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 600 },
            debug: false,
        },
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        IntroCutscene,
        Level1_City,
        Level2_Forest,
        Level3_Lab,
        HUD,
        SkillUnlock,
        AllyDialog,
        Victory,
        GameOver,
    ]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
