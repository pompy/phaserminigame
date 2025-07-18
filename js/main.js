import { config } from './config.js';
import { MainScene } from './mainScene.js';

config.scene = [MainScene];

new Phaser.Game(config);