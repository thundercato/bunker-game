export interface GameEvents extends Record<string, unknown> {
  "app:ready": { timestamp: number };
  "input:gamepad-connected": { index: number; id: string };
  "input:gamepad-disconnected": { index: number };
}
