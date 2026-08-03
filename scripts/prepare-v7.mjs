import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV7Scene.ts", import.meta.url);
let sceneSource = await readFile(scenePath, "utf8");

sceneSource = sceneSource
  .replaceAll("this.gamepad()", "this.currentGamepad()")
  .replace(
    "private gamepad(): Gamepad | null",
    "private currentGamepad(): Gamepad | null",
  )
  .replace("  private knifeStuck = false;\n", "")
  .replaceAll("    this.knifeStuck = true;\n", "")
  .replaceAll("    this.knifeStuck = false;\n", "")
  .replace("private knifeSharpness = 50;", "private knifeSharpness = 15;");

await writeFile(scenePath, sceneSource, "utf8");

const v8Path = new URL("../src/scenes/BunkerV8Scene.ts", import.meta.url);
let v8Source = await readFile(v8Path, "utf8");
if (!v8Source.includes("correctLivingRoomCamera")) {
  v8Source = v8Source
    .replace('const VERSION = "0.8.00";', 'const VERSION = "0.8.10";')
    .replaceAll("this.backpackButton", "this.workstationBackpackButton")
    .replace(
      "private backpackButton!: HTMLElement;",
      "private workstationBackpackButton!: HTMLElement;",
    )
    .replaceAll("this.requireElement", "this.requireV8Element")
    .replace(
      "private requireElement(selector: string): HTMLElement",
      "private requireV8Element(selector: string): HTMLElement",
    )
    .replaceAll("this.overlay", "this.v8Overlay")
    .replace("private overlay!: HTMLElement;", "private v8Overlay!: HTMLElement;")
    .replaceAll("this.controls", "this.v8Controls")
    .replace(
      "private controls!: HTMLElement;",
      "private v8Controls!: HTMLElement;",
    )
    .replaceAll("this.installStyles", "this.installV8Styles")
    .replace("private installStyles(): void", "private installV8Styles(): void")
    .replace(
      "  private rubDistance = 0;\n",
      `  private rubDistance = 0;
  private readonly bladePolish = Array.from({ length: 12 }, () => 0);
`,
    )
    .replace(
      "  private runtimeV8(): V8Runtime {",
      `  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.correctLivingRoomCamera();
  }

  private correctLivingRoomCamera(): void {
    const player = this.runtimeV8().player;
    if (player.x < 64 || player.x > 640 || player.y < 96 || player.y > 544)
      return;
    const camera = this.cameras.main;
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, 48, 0.18);
  }

  private runtimeV8(): V8Runtime {`,
    )
    .replace(
      `    const values = new Map([
      [".health-fill", detail.health],
      [".hunger-fill", detail.hunger],
      [".thirst-fill", detail.thirst],
      [".stamina-fill", detail.stamina],
    ]);
    for (const [selector, value] of values) {
      const oldFill = document.querySelector<HTMLElement>(selector);
      const track = oldFill?.parentElement;
      const row = track?.parentElement;
      if (!row || !track) continue;
      const segments = Array.from(
        track.querySelectorAll<HTMLElement>(".lcd-segment"),
      );
      segments.forEach((segment, index) => {
        const portion = Phaser.Math.Clamp(value / 10 - index, 0, 1);
        const level = Math.round(portion * 5);
        segment.dataset.level = level.toString();
      });
    }`,
      `    const values = [
      detail.health,
      detail.hunger,
      detail.thirst,
      detail.stamina,
    ];
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(".survival-hud .status-row"),
    );
    values.forEach((value, rowIndex) => {
      const track = rows[rowIndex]?.querySelector<HTMLElement>("i");
      if (!track) return;
      const segments = Array.from(
        track.querySelectorAll<HTMLElement>(".lcd-segment"),
      );
      segments.forEach((segment, index) => {
        const portion = Phaser.Math.Clamp(value / 10 - index, 0, 1);
        const level = Math.round(portion * 5);
        segment.dataset.level = level.toString();
      });
    });`,
    )
    .replace(
      '<div class="sharpen-zone"><div class="large-knife"><i></i><b></b></div><div class="stone"></div></div>',
      '<div class="sharpen-zone"><div class="large-knife"><i></i><b><span class="rust-segments">${this.bladePolish.map((_, index) => `<em data-rust="${index}"></em>`).join("")}</span></b></div><div class="stone"></div><div class="spark-layer"></div></div>',
    )
    .replace(
      `      this.rubDistance += distance;
      runtime.knifeSharpness = Phaser.Math.Clamp(
        runtime.knifeSharpness + distance / 45,
        0,
        100,
      );
      this.refreshSharpness(panel);`,
      `      const blade = panel.querySelector<HTMLElement>(".large-knife b");
      if (!blade) return;
      const bladeRect = blade.getBoundingClientRect();
      if (
        event.clientX < bladeRect.left ||
        event.clientX > bladeRect.right ||
        event.clientY < bladeRect.top ||
        event.clientY > bladeRect.bottom
      )
        return;
      const normalisedX = Phaser.Math.Clamp(
        (event.clientX - bladeRect.left) / bladeRect.width,
        0,
        0.999,
      );
      const segmentIndex = Math.floor(normalisedX * this.bladePolish.length);
      const currentPolish = this.bladePolish[segmentIndex] ?? 1;
      if (currentPolish >= 1) return;

      this.rubDistance += distance;
      this.bladePolish[segmentIndex] = Phaser.Math.Clamp(
        currentPolish + distance / 1275,
        0,
        1,
      );
      const averagePolish =
        this.bladePolish.reduce((total, polish) => total + polish, 0) /
        this.bladePolish.length;
      runtime.knifeSharpness = 15 + averagePolish * 85;
      this.makeSparks(panel, event.clientX, event.clientY);
      this.refreshSharpness(panel);`,
    )
    .replace(
      "  private refreshSharpness(panel: HTMLElement): void {",
      `  private makeSparks(
    panel: HTMLElement,
    clientX: number,
    clientY: number,
  ): void {
    const layer = panel.querySelector<HTMLElement>(".spark-layer");
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    for (let index = 0; index < 4; index += 1) {
      const spark = document.createElement("i");
      spark.className = "sharpen-spark";
      spark.style.left = \`\${clientX - rect.left}px\`;
      spark.style.top = \`\${clientY - rect.top}px\`;
      spark.style.setProperty("--spark-x", \`\${(Math.random() - 0.5) * 70}px\`);
      spark.style.setProperty("--spark-y", \`\${-20 - Math.random() * 55}px\`);
      layer.append(spark);
      window.setTimeout(() => spark.remove(), 420);
    }
  }

  private refreshSharpness(panel: HTMLElement): void {`,
    )
    .replace(
      `    if (number) number.textContent = \`\${Math.round(value)}%\`;
    if (fill) {`,
      `    if (number) number.textContent = \`\${Math.round(value)}%\`;
    panel
      .querySelectorAll<HTMLElement>("[data-rust]")
      .forEach((segment, index) => {
        segment.style.opacity = (
          1 - (this.bladePolish[index] ?? 0)
        ).toString();
      });
    if (fill) {`,
    )
    .replace(
      ".touch-weapon{right:112px;bottom:112px}.touch-throw{right:28px;bottom:112px}",
      ".touch-weapon{right:112px;bottom:205px}.touch-throw{right:28px;bottom:205px}",
    )
    .replace(
      ".large-knife b{position:absolute;left:25%;right:0;top:10%;height:80%;clip-path:polygon(0 0,100% 50%,0 100%);background:linear-gradient(#edf4f1,#6f7d7b 53%,#d5ddda)}",
      ".large-knife b{position:absolute;left:25%;right:0;top:10%;height:80%;clip-path:polygon(0 0,100% 50%,0 100%);background:linear-gradient(#edf4f1,#6f7d7b 53%,#d5ddda);overflow:hidden}.rust-segments{position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,1fr)}.rust-segments em{display:block;background:linear-gradient(90deg,#5a2d12,#9a5425 45%,#4a2410);border-right:1px solid #2b1308;opacity:1}.spark-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}.sharpen-spark{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff3a0;box-shadow:0 0 8px #ff9b22;animation:spark-flight .42s ease-out forwards}@keyframes spark-flight{to{transform:translate(var(--spark-x),var(--spark-y)) scale(.2);opacity:0}}",
    );
}

await writeFile(v8Path, v8Source, "utf8");

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV6Scene } from "@/scenes/BunkerV6Scene";',
    'import { BunkerV8Scene } from "@/scenes/BunkerV8Scene";',
  )
  .replace("scene: [BunkerV6Scene]", "scene: [BunkerV8Scene]")
  .replace('const VERSION = "0.6.00";', 'const VERSION = "0.8.10";');
await writeFile(mainPath, mainSource, "utf8");