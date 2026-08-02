export type InputDeviceType = 'gamepad' | 'keyboard' | 'touch';

export interface GamepadButtonState {
  readonly index: number;
  readonly value: number;
  readonly pressed: boolean;
  readonly touched: boolean;
}

export interface GamepadSnapshot {
  readonly connected: boolean;
  readonly index: number;
  readonly id: string;
  readonly mapping: GamepadMappingType;
  readonly timestamp: number;
  readonly axes: readonly number[];
  readonly buttons: readonly GamepadButtonState[];
}

export interface InputSnapshot {
  readonly activeDevice: InputDeviceType | null;
  readonly gamepads: readonly GamepadSnapshot[];
}
