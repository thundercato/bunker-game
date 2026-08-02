import Phaser from 'phaser';
import { ControllerTestScene } from '@/scenes/ControllerTestScene';
import '@/style.css';

const parent = document.querySelector<HTMLElement>('#app');
if (!parent) throw new Error('Missing #app element.');

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 1280,
  height: 720,
  backgroundColor: '#08111f',
  scene: [ControllerTestScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
