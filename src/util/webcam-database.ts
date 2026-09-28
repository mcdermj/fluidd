import type { DatabaseWebcamConfig } from '@/store/webcams/types'

// Field names and defaults mirror Moonraker's webcam.py (_save_cam, WebCam.from_database),
// so Moonraker's webcam component reads these records as its own.

type DatabaseWebcamRecord = Partial<DatabaseWebcamConfig> & {
  rotate?: number;
}

const rotations: Moonraker.Webcam.Rotation[] = [0, 90, 180, 270]

const toRotation = (value: unknown): Moonraker.Webcam.Rotation => {
  const rotation = Number(value)

  return rotations.find(r => r === rotation) ?? 0
}

const isDatabaseWebcamRecord = (value: unknown): value is DatabaseWebcamRecord & { name: string } => (
  value != null &&
  typeof value === 'object' &&
  'name' in value &&
  typeof value.name === 'string'
)

export const fromDatabaseWebcam = (uid: string, record: unknown): Moonraker.Webcam.Entry | undefined => {
  if (!isDatabaseWebcamRecord(record)) {
    return
  }

  return {
    uid,
    source: 'database',
    name: record.name,
    location: record.location ?? 'printer',
    service: record.service ?? 'mjpegstreamer',
    enabled: record.enabled ?? true,
    icon: record.icon ?? 'mdiWebcam',
    target_fps: record.targetFps ?? 15,
    target_fps_idle: record.targetFpsIdle ?? 5,
    stream_url: record.urlStream ?? '',
    snapshot_url: record.urlSnapshot ?? '',
    flip_horizontal: record.flipX ?? false,
    flip_vertical: record.flipY ?? false,
    rotation: toRotation(record.rotation ?? record.rotate),
    aspect_ratio: record.aspectRatio ?? '4:3',
    extra_data: record.extra_data ?? {}
  }
}

export const fromDatabaseWebcams = (records: Record<string, unknown>): Moonraker.Webcam.Entry[] => (
  Object.entries(records)
    .map(([uid, record]) => fromDatabaseWebcam(uid, record))
    .filter((webcam): webcam is Moonraker.Webcam.Entry => webcam !== undefined)
)

export const toDatabaseWebcam = (webcam: Moonraker.Webcam.Entry): DatabaseWebcamConfig => ({
  name: webcam.name ?? '',
  location: webcam.location ?? 'printer',
  service: webcam.service ?? 'mjpegstreamer',
  enabled: webcam.enabled ?? true,
  icon: webcam.icon ?? 'mdiWebcam',
  targetFps: webcam.target_fps ?? 15,
  targetFpsIdle: webcam.target_fps_idle ?? 5,
  urlStream: webcam.stream_url ?? '',
  urlSnapshot: webcam.snapshot_url ?? '',
  flipX: webcam.flip_horizontal ?? false,
  flipY: webcam.flip_vertical ?? false,
  rotation: webcam.rotation ?? 0,
  aspectRatio: webcam.aspect_ratio ?? '4:3',
  extra_data: webcam.extra_data ?? {}
})
