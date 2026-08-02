import type { EventBus } from "@/core/EventBus";
import type { GameEvents } from "@/core/GameEvents";
import type { GamepadSnapshot, InputSnapshot } from "@/input/InputTypes";

const AXIS_DEADZONE = 0.12;
const BUTTON_ACTIVITY_THRESHOLD = 0.1;

type OptionalGamepadNavigator = {
  getGamepads?: () => readonly (Gamepad | null)[];
};

function normaliseAxis(value: number): number {
  if (Math.abs(value) < AXIS_DEADZONE) return 0;
  return Math.round(value * 1000) / 1000;
}

function snapshotGamepad(gamepad: Gamepad): GamepadSnapshot {
  return {
    connected: gamepad.connected,
    index: gamepad.index,
    id: gamepad.id,
    mapping: gamepad.mapping,
    timestamp: gamepad.timestamp,
    axes: gamepad.axes.map(normaliseAxis),
    buttons: gamepad.buttons.map((button, index) => ({
      index,
      value: Math.round(button.value * 1000) / 1000,
      pressed: button.pressed,
      touched: button.touched,
    })),
  };
}

export class InputService {
  private started = false;
  private previousIndexes = new Set<number>();
  private lastSnapshot: InputSnapshot = { activeDevice: null, gamepads: [] };
  private activationCount = 0;

  public constructor(private readonly events: EventBus<GameEvents>) {}

  public isGamepadApiAvailable(): boolean {
    const gamepadNavigator = navigator as unknown as OptionalGamepadNavigator;
    return typeof gamepadNavigator.getGamepads === "function";
  }

  public getActivationCount(): number {
    return this.activationCount;
  }

  public start(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener("gamepadconnected", this.handleConnection);
    window.addEventListener("gamepaddisconnected", this.handleDisconnection);
    window.addEventListener("focus", this.handleResume);
    window.addEventListener("pageshow", this.handleResume);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.poll();
  }

  public stop(): void {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener("gamepadconnected", this.handleConnection);
    window.removeEventListener("gamepaddisconnected", this.handleDisconnection);
    window.removeEventListener("focus", this.handleResume);
    window.removeEventListener("pageshow", this.handleResume);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.previousIndexes.clear();
  }

  public activate(): InputSnapshot {
    if (!this.started) this.start();
    this.activationCount += 1;
    this.previousIndexes.clear();
    return this.poll();
  }

  public poll(): InputSnapshot {
    const gamepadNavigator = navigator as unknown as OptionalGamepadNavigator;
    let gamepads: GamepadSnapshot[] = [];

    if (typeof gamepadNavigator.getGamepads === "function") {
      gamepads = Array.from(gamepadNavigator.getGamepads())
        .filter((gamepad): gamepad is Gamepad => gamepad !== null)
        .map(snapshotGamepad);
    }

    const currentIndexes = new Set(gamepads.map((gamepad) => gamepad.index));

    for (const gamepad of gamepads) {
      if (!this.previousIndexes.has(gamepad.index)) {
        this.events.emit("input:gamepad-connected", {
          index: gamepad.index,
          id: gamepad.id,
        });
      }
    }

    for (const index of this.previousIndexes) {
      if (!currentIndexes.has(index)) {
        this.events.emit("input:gamepad-disconnected", { index });
      }
    }

    this.previousIndexes = currentIndexes;
    const activeGamepad = gamepads.some(
      (gamepad) =>
        gamepad.axes.some((axis) => axis !== 0) ||
        gamepad.buttons.some(
          (button) =>
            button.pressed || button.value > BUTTON_ACTIVITY_THRESHOLD,
        ),
    );

    this.lastSnapshot = {
      activeDevice: activeGamepad ? "gamepad" : this.lastSnapshot.activeDevice,
      gamepads,
    };

    return this.lastSnapshot;
  }

  public getSnapshot(): InputSnapshot {
    return this.lastSnapshot;
  }

  private readonly handleConnection = (event: GamepadEvent): void => {
    this.events.emit("input:gamepad-connected", {
      index: event.gamepad.index,
      id: event.gamepad.id,
    });
  };

  private readonly handleDisconnection = (event: GamepadEvent): void => {
    this.events.emit("input:gamepad-disconnected", {
      index: event.gamepad.index,
    });
  };

  private readonly handleResume = (): void => {
    this.activate();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible") this.activate();
  };
}
