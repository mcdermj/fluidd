import { crealityWebrtcHost, crealityWebrtcStreamUrl, isCrealityWebrtcStreamUrl } from '../creality-webrtc-url'

describe('crealityWebrtcStreamUrl', () => {
  it.each([
    ['creality-k1c.example.com', 'http://creality-k1c.example.com:8000/call/webrtc_local'],
    ['10.0.3.138', 'http://10.0.3.138:8000/call/webrtc_local'],
    ['  10.0.3.138  ', 'http://10.0.3.138:8000/call/webrtc_local'],
    ['[fe80::1]', 'http://[fe80::1]:8000/call/webrtc_local'],
    ['printer:8080', 'http://printer:8080/call/webrtc_local'],
    ['[fe80::1]:8080', 'http://[fe80::1]:8080/call/webrtc_local'],
  ])('builds the signaling URL for host "%s"', (host, expected) => {
    expect(crealityWebrtcStreamUrl(host)).toBe(expected)
  })

  it.each([
    ['http://printer:8000/', 'http://printer:8000/call/webrtc_local'],
    ['http://printer:8000/call/webrtc_local', 'http://printer:8000/call/webrtc_local'],
    ['https://printer/?x=1#y', 'http://printer:8000/call/webrtc_local'],
  ])('accepts a pasted URL "%s"', (host, expected) => {
    expect(crealityWebrtcStreamUrl(host)).toBe(expected)
  })

  it.each([
    [''],
    ['   '],
    ['fe80::1'],
    ['ftp://printer'],
    ['printer:notaport'],
  ])('rejects "%s"', (host) => {
    expect(crealityWebrtcStreamUrl(host)).toBe('')
  })
})

describe('crealityWebrtcHost', () => {
  it.each([
    ['http://creality-k1c.example.com:8000/call/webrtc_local', 'creality-k1c.example.com'],
    ['http://[fe80::1]:8000/call/webrtc_local', '[fe80::1]'],
    ['http://printer:8080/call/webrtc_local', 'printer:8080'],
    ['not a url', ''],
  ])('reads the host back from "%s"', (streamUrl, expected) => {
    expect(crealityWebrtcHost(streamUrl)).toBe(expected)
  })

  it.each([
    ['printer'],
    ['printer:8080'],
    ['[fe80::1]'],
  ])('round-trips host "%s"', (host) => {
    expect(crealityWebrtcHost(crealityWebrtcStreamUrl(host))).toBe(host)
  })
})

describe('isCrealityWebrtcStreamUrl', () => {
  it.each([
    ['http://printer:8000/call/webrtc_local', true],
    ['/webcam/?action=stream', false],
    ['http://printer/webcam/?action=stream', false],
  ])('recognises "%s" as %s', (streamUrl, expected) => {
    expect(isCrealityWebrtcStreamUrl(streamUrl)).toBe(expected)
  })
})
