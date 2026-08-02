import Phaser from "phaser";

const KEY_CODES: Record<string, number> = {
  w: Phaser.Input.Keyboard.KeyCodes.W,
  a: Phaser.Input.Keyboard.KeyCodes.A,
  s: Phaser.Input.Keyboard.KeyCodes.S,
  d: Phaser.Input.Keyboard.KeyCodes.D,
  e: Phaser.Input.Keyboard.KeyCodes.E,
  Escape: Phaser.Input.Keyboard.KeyCodes.ESC,
};

export const setVirtualKey = (
  game: Phaser.Game,
  keyName: string,
  pressed: boolean,
): void => {
  const keyCode = KEY_CODES[keyName];
  if (keyCode === undefined) return;

  const scene = game.scene.getScene("ScrollingBunkerV3");
  const keyboard = scene?.input.keyboard;
  if (!keyboard) return;

  const key = keyboard.addKey(keyCode);
  key.isDown = pressed;
  key.isUp = !pressed;

  if (pressed) {
    key.timeDown = performance.now();
  } else {
    key.timeUp = performance.now();
  }
};
