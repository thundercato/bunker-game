export type RectangleBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CameraViewport = RectangleBounds;

export type RoomCameraResult = {
  viewport: CameraViewport;
  scrollX: number;
  scrollY: number;
  zoom: number;
};

/**
 * Calculates a camera viewport that displays exactly the supplied room bounds.
 *
 * The returned viewport is letterboxed within the available Phaser viewport so
 * aspect-ratio differences never crop the room or reveal world outside it.
 * Rooms smaller than the available viewport remain at 1:1 scale and are centred.
 * Larger rooms are uniformly scaled down until their complete rectangle fits.
 */
export function calculateRoomCamera(
  roomBounds: RectangleBounds,
  cameraViewport: CameraViewport,
): RoomCameraResult {
  if (roomBounds.width <= 0 || roomBounds.height <= 0) {
    throw new Error("Room bounds must have a positive width and height.");
  }
  if (cameraViewport.width <= 0 || cameraViewport.height <= 0) {
    throw new Error("Camera viewport must have a positive width and height.");
  }

  const fitZoom = Math.min(
    cameraViewport.width / roomBounds.width,
    cameraViewport.height / roomBounds.height,
  );
  const zoom = Math.min(1, fitZoom);
  const framedWidth = roomBounds.width * zoom;
  const framedHeight = roomBounds.height * zoom;

  return {
    viewport: {
      x: cameraViewport.x + (cameraViewport.width - framedWidth) / 2,
      y: cameraViewport.y + (cameraViewport.height - framedHeight) / 2,
      width: framedWidth,
      height: framedHeight,
    },
    scrollX: roomBounds.x,
    scrollY: roomBounds.y,
    zoom,
  };
}
