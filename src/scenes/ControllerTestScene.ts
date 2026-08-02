import Phaser from 'phaser';
import { EventBus } from '@/core/EventBus';
import type { GameEvents } from '@/core/GameEvents';
import { InputService } from '@/input/InputService';

const VERSION = '0.0.01';

export class ControllerTestScene extends Phaser.Scene {
  private readonly inputService = new InputService(new EventBus<GameEvents>());
  private status?: Phaser.GameObjects.Text;
  private device?: Phaser.GameObjects.Text;
  private axes?: Phaser.GameObjects.Text;
  private buttons?: Phaser.GameObjects.Text;

  public constructor() {
    super('ControllerTest');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#08111f');
    this.add.rectangle(640, 360, 1160, 650, 0x111827).setStrokeStyle(2, 0x334155);
    this.add.text(640, 70, 'BUNKER GAME', {
      fontFamily: 'monospace', fontSize: '38px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(640, 112, `v${VERSION} • JOYPAD TEST`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#93c5fd',
    }).setOrigin(0.5);

    this.status = this.add.text(640, 165, 'WAITING FOR CONTROLLER', {
      fontFamily: 'monospace', fontSize: '24px', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.device = this.add.text(640, 210, 'Connect your controller and press any button', {
      fontFamily: 'monospace', fontSize: '16px', color: '#cbd5e1', align: 'center',
      wordWrap: { width: 1050 },
    }).setOrigin(0.5);
    this.axes = this.add.text(130, 280, 'AXES\n\nNo input', {
      fontFamily: 'monospace', fontSize: '20px', color: '#93c5fd', lineSpacing: 10,
    });
    this.buttons = this.add.text(650, 280, 'BUTTONS\n\nNo input', {
      fontFamily: 'monospace', fontSize: '20px', color: '#86efac', lineSpacing: 8,
      wordWrap: { width: 500 },
    });
    this.add.text(640, 660, 'On iPhone, the browser may not reveal the controller until you press a button.', {
      fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8', align: 'center',
    }).setOrigin(0.5);

    this.inputService.start();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.inputService.stop());
  }

  public update(): void {
    const snapshot = this.inputService.poll();
    const pad = snapshot.gamepads[0];
    if (!pad) {
      this.status?.setText('WAITING FOR CONTROLLER').setColor('#fbbf24');
      this.device?.setText('Connect your controller and press any button');
      this.axes?.setText('AXES\n\nNo input');
      this.buttons?.setText('BUTTONS\n\nNo input');
      return;
    }

    const active = pad.axes.some((value) => value !== 0) || pad.buttons.some((button) => button.pressed || button.value > 0.1);
    this.status?.setText(active ? 'INPUT DETECTED ✓' : 'CONTROLLER CONNECTED').setColor(active ? '#4ade80' : '#60a5fa');
    this.device?.setText(`#${pad.index} ${pad.id}\n${pad.buttons.length} buttons • ${pad.axes.length} axes • ${pad.mapping || 'unmapped'}`);
    this.axes?.setText(`AXES\n\n${pad.axes.map((value, index) => `${index}: ${value.toFixed(3)}`).join('\n') || 'None'}`);
    const pressed = pad.buttons
      .map((button) => `${button.index}: ${button.value.toFixed(2)}${button.pressed ? '  PRESSED' : ''}`)
      .join('\n');
    this.buttons?.setText(`BUTTONS\n\n${pressed || 'None'}`);
  }
}
