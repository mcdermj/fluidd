import { fromDatabaseWebcam, fromDatabaseWebcams, toDatabaseWebcam } from '../webcam-database'

const entry: Moonraker.Webcam.Entry = {
  uid: '6f1f0c52-7a0e-4b64-9b3e-0d7f7b1f2a10',
  source: 'database',
  name: 'K1C',
  location: 'printer',
  service: 'webrtc-go2rtc',
  enabled: true,
  icon: 'mdiWebcam',
  target_fps: 15,
  target_fps_idle: 5,
  stream_url: 'http://printer:1984/api/ws?src=cam',
  snapshot_url: '',
  flip_horizontal: true,
  flip_vertical: false,
  rotation: 90,
  aspect_ratio: '16:9',
  extra_data: { key: 'value' }
}

describe('toDatabaseWebcam', () => {
  it('writes the field names Moonraker stores', () => {
    expect(toDatabaseWebcam(entry)).toEqual({
      name: 'K1C',
      location: 'printer',
      service: 'webrtc-go2rtc',
      enabled: true,
      icon: 'mdiWebcam',
      targetFps: 15,
      targetFpsIdle: 5,
      urlStream: 'http://printer:1984/api/ws?src=cam',
      urlSnapshot: '',
      flipX: true,
      flipY: false,
      rotation: 90,
      aspectRatio: '16:9',
      extra_data: { key: 'value' }
    })
  })

  it('omits uid and source, which Moonraker keeps outside the record', () => {
    const record = toDatabaseWebcam(entry)

    expect(record).not.toHaveProperty('uid')
    expect(record).not.toHaveProperty('source')
  })
})

describe('fromDatabaseWebcam', () => {
  it('round-trips an entry', () => {
    expect(fromDatabaseWebcam(entry.uid, toDatabaseWebcam(entry))).toEqual(entry)
  })

  it('applies Moonraker defaults to a record with only a name', () => {
    expect(fromDatabaseWebcam('uid', { name: 'cam' })).toEqual({
      uid: 'uid',
      source: 'database',
      name: 'cam',
      location: 'printer',
      service: 'mjpegstreamer',
      enabled: true,
      icon: 'mdiWebcam',
      target_fps: 15,
      target_fps_idle: 5,
      stream_url: '',
      snapshot_url: '',
      flip_horizontal: false,
      flip_vertical: false,
      rotation: 0,
      aspect_ratio: '4:3',
      extra_data: {}
    })
  })

  it('reads the legacy rotate field when rotation is missing', () => {
    expect(fromDatabaseWebcam('uid', { name: 'cam', rotate: 180 })?.rotation).toBe(180)
  })

  it.each([
    [45],
    ['sideways'],
  ])('falls back to no rotation for %s', (rotation) => {
    expect(fromDatabaseWebcam('uid', { name: 'cam', rotation })?.rotation).toBe(0)
  })

  it.each([
    ['null', null],
    ['a string', 'cam'],
    ['a record without a name', { service: 'iframe' }],
    ['a record with a non-string name', { name: 42 }],
  ])('skips %s', (_, record) => {
    expect(fromDatabaseWebcam('uid', record)).toBeUndefined()
  })
})

describe('fromDatabaseWebcams', () => {
  it('keys each entry by its database key and drops unreadable records', () => {
    const webcams = fromDatabaseWebcams({
      first: { name: 'one' },
      junk: { probe: true },
      second: { name: 'two' }
    })

    expect(webcams.map(webcam => [webcam.uid, webcam.name])).toEqual([
      ['first', 'one'],
      ['second', 'two']
    ])
  })
})
