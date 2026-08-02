import Phaser from "phaser";
import { EventBus } from "@/core/EventBus";
import type { GameEvents } from "@/core/GameEvents";
import { InputService } from "@/input/InputService";

const VERSION = "0.0.02";

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as StandaloneNavigator).standalone)
  );
}

export class ControllerTestScene extends Phaser.Scene {
  private readonly inputService = new InputService(new EventBus<GameEvents>());
  private status?: Phaser.GameObjects.Text;
  private device?: Phaser.GameObjects.Text;
  private axes?: Phaser.GameObjects.Text;
  private buttons?: Phaser.GameObjects.Text;
  private diagnostics?: Phaser.GameObjects.Text;
  private activationHint?: Phaser.GameObjects.Text;

  public constructor() {
    super("ControllerTest");
  }

  public create(): void {
    const standalone = isStandaloneMode();

    this.cameras.main.setBackgroundColor("#08111f");
    this.add
      .rectangle(640, 360, 1160, 650, 0x111827)
      .setStrokeStyle(2, 0x334155);

    this.add
      .text(640, 52, "BUNKER GAME", {
        fontFamily: "monospace",
        fontSize: "34px",
        color: "#f8fafc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(640, 92, `v${VERSION} • CONTROLLER ACTIVATION DIAGNOSTIC`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#93c5fd",
      })
      .setOrigin(0.5);

    this.add
      .text(
        640,
        122,
        standalone ? "HOME SCREEN WEB APP MODE" : "SAFARI BROWSER MODE",
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: standalone ? "#fbbf24" : "#86efac",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5);

    const activateButton = this.add
      .rectangle(640, 174, 470, 66, 0x1d4ed8)
      .setStrokeStyle(2, 0x93c5fd)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(640, 174, "TAP TO ACTIVATE CONTROLLER", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    activateButton.on("pointerup", () => {
      this.inputService.activate();
      this.activationHint?.setText(
        "Activation requested. Now press a controller button and move both sticks.",
      );
    });

    this.activationHint = this.add
      .text(640, 222, "Tap first, then press any controller button.", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cbd5e1",
        align: "center",
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(640, 256, "WAITING FOR CONTROLLER", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#fbbf24",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.device = this.add
      .text(
        640,
        292,
        "Connect your controller, tap Activate, then press a button",
        {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#cbd5e1",
          align: "center",
          wordWrap: { width: 1050 },
        },
      )
      .setOrigin(0.5);

    this.axes = this.add.text(130, 352, "AXES\n\nNo input", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#93c5fd",
      lineSpacing: 8,
    });

    this.buttons = this.add.text(650, 352, "BUTTONS\n\nNo input", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#86efac",
      lineSpacing: 6,
      wordWrap: { width: 500 },
    });

    this.diagnostics = this.add
      .text(640, 620, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#94a3b8",
        align: "center",
      })
      .setOrigin(0.5);

    if (standalone) {
      const safariButton = this.add
        .rectangle(640, 674, 360, 42, 0x334155)
        .setStrokeStyle(1, 0x94a3b8)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(640, 674, "OPEN THIS PAGE IN SAFARI", {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#f8fafc",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      safariButton.on("pointerup", () => {
        window.open(window.location.href, "_blank", "noopener,noreferrer");
      });
    }

    this.inputService.start();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.inputService.stop(),
    );
  }

  public update(): void {
    const standalone = isStandaloneMode();
    const snapshot = this.inputService.poll();
    const pad = snapshot.gamepads[0];

    this.diagnostics?.setText(
      [
        `Mode: ${standalone ? "standalone web app" : "Safari tab"}`,
        `Gamepad API: ${this.inputService.isGamepadApiAvailable() ? "available" : "missing"}`,
        `Page visibility: ${document.visibilityState}`,
        `Activation attempts: ${String(this.inputService.getActivationCount())}`,
        `Controllers exposed by iOS: ${String(snapshot.gamepads.length)}`,
      ].join("  •  "),
    );

    if (!pad) {
      this.status?.setText("WAITING FOR CONTROLLER").setColor("#fbbf24");
      this.device?.setText(
        standalone
          ? "Standalone mode detected. Tap Activate, then press buttons. If the count stays at 0, iOS is withholding the controller from the web app."
          : "Connect your controller, tap Activate, then press a button",
      );
      this.axes?.setText("AXES\n\nNo input");
      this.buttons?.setText("BUTTONS\n\nNo input");
      return;
    }

    const active =
      pad.axes.some((value) => value !== 0) ||
      pad.buttons.some((button) => button.pressed || button.value > 0.1);

    this.status
      ?.setText(active ? "INPUT DETECTED ✓" : "CONTROLLER CONNECTED")
      .setColor(active ? "#4ade80" : "#60a5fa");

    this.device?.setText(
      `#${String(pad.index)} ${pad.id}\n${String(pad.buttons.length)} buttons • ${String(pad.axes.length)} axes • ${pad.mapping || "unmapped"}`,
    );

    this.axes?.setText(
      `AXES\n\n${
        pad.axes
          .map((value, index) => `${String(index)}: ${value.toFixed(3)}`)
          .join("\n") || "None"
      }`,
    );

    const pressed = pad.buttons
      .map(
        (button) =>
          `${String(button.index)}: ${button.value.toFixed(2)}${button.pressed ? "  PRESSED" : ""}`,
      )
      .join("\n");

    this.buttons?.setText(`BUTTONS\n\n${pressed || "None"}`);
  }
}
