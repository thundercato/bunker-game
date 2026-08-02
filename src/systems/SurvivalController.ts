import Phaser from "phaser";

type BunkerRuntime = Phaser.Scene & {
  gameMinutes: number;
  health: number;
  hunger: number;
  thirst: number;
  stamina: number;
  uiOpen: boolean;
  emitState: () => void;
};

export type SleepResult = {
  requestedMinutes: number;
  sleptMinutes: number;
  wokeEarly: boolean;
};

const MINUTES_PER_DAY = 24 * 60;
const HUNGER_LOSS_PER_SLEEP_HOUR = 1.5;
const THIRST_LOSS_PER_SLEEP_HOUR = 2;
const HEALTH_LOSS_PER_SECOND_WHEN_DEHYDRATED = 0.02;
const PASSIVE_HUNGER_LOSS_PER_SECOND = 0.0003;
const PASSIVE_THIRST_LOSS_PER_SECOND = 0.0006;

export class SurvivalController {
  private lastUpdate = performance.now();
  private lastStamina = 100;
  private running = true;

  public constructor(private readonly game: Phaser.Game) {
    requestAnimationFrame(this.update);
  }

  public destroy(): void {
    this.running = false;
  }

  public setUiOpen(open: boolean): void {
    this.scene().uiOpen = open;
  }

  public hoursUntil(targetHour: number): number {
    const scene = this.scene();
    const targetMinutes = targetHour * 60;
    let difference = targetMinutes - scene.gameMinutes;
    if (difference <= 0) difference += MINUTES_PER_DAY;
    return Math.max(1, Math.ceil(difference / 60));
  }

  public async sleep(
    hours: number,
    onMinute?: (elapsedMinutes: number) => void,
  ): Promise<SleepResult> {
    const scene = this.scene();
    const safeHours = Phaser.Math.Clamp(Math.round(hours), 1, 24);
    const requestedMinutes = safeHours * 60;

    scene.uiOpen = true;
    let sleptMinutes = 0;
    let wokeEarly = false;
    const delayPerMinute = 2000 / 60;

    for (let minute = 0; minute < requestedMinutes; minute += 1) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, delayPerMinute);
      });

      scene.gameMinutes = (scene.gameMinutes + 1) % MINUTES_PER_DAY;
      scene.hunger = Math.max(
        0,
        scene.hunger - HUNGER_LOSS_PER_SLEEP_HOUR / 60,
      );
      scene.thirst = Math.max(
        0,
        scene.thirst - THIRST_LOSS_PER_SLEEP_HOUR / 60,
      );
      sleptMinutes += 1;
      scene.emitState();
      onMinute?.(sleptMinutes);

      if (scene.hunger <= 5 || scene.thirst <= 5) {
        wokeEarly = true;
        break;
      }
    }

    scene.uiOpen = false;
    scene.emitState();
    this.lastStamina = scene.stamina;
    return { requestedMinutes, sleptMinutes, wokeEarly };
  }

  private readonly update = (now: number): void => {
    if (!this.running) return;
    const scene = this.scene();
    const elapsedSeconds = Math.min(0.25, (now - this.lastUpdate) / 1000);
    this.lastUpdate = now;

    if (!scene.uiOpen) {
      scene.hunger = Math.max(
        0,
        scene.hunger - PASSIVE_HUNGER_LOSS_PER_SECOND * elapsedSeconds,
      );
      const thirstMultiplier = scene.hunger <= 0 ? 2 : 1;
      scene.thirst = Math.max(
        0,
        scene.thirst -
          PASSIVE_THIRST_LOSS_PER_SECOND * thirstMultiplier * elapsedSeconds,
      );

      if (scene.thirst <= 0) {
        scene.health = Math.max(
          0,
          scene.health - HEALTH_LOSS_PER_SECOND_WHEN_DEHYDRATED * elapsedSeconds,
        );
      }

      if (scene.hunger <= 0 && scene.stamina < this.lastStamina) {
        const normalDrain = this.lastStamina - scene.stamina;
        scene.stamina = Math.max(0, scene.stamina - normalDrain * 0.5);
      }

      this.lastStamina = scene.stamina;
      scene.emitState();
    } else {
      this.lastStamina = scene.stamina;
    }

    requestAnimationFrame(this.update);
  };

  private scene(): BunkerRuntime {
    return this.game.scene.getScene(
      "ScrollingBunkerV3",
    ) as unknown as BunkerRuntime;
  }
}
