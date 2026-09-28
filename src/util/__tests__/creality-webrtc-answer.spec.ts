import decodeCrealityWebrtcAnswer from '../creality-webrtc-answer'

const sdp = 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=sendonly\r\n'

describe('decodeCrealityWebrtcAnswer', () => {
  it('decodes a base64-wrapped answer', () => {
    const body = btoa(JSON.stringify({ type: 'answer', sdp }))

    expect(decodeCrealityWebrtcAnswer(body)).toEqual({ type: 'answer', sdp })
  })

  it('ignores surrounding whitespace', () => {
    const body = `${btoa(JSON.stringify({ type: 'answer', sdp }))}\n`

    expect(decodeCrealityWebrtcAnswer(body)).toEqual({ type: 'answer', sdp })
  })

  it('treats a literal {} as a rejected offer', () => {
    expect(() => decodeCrealityWebrtcAnswer('{}')).toThrow(/rejected the offer/)
  })

  it.each([
    ['an offer', { type: 'offer', sdp }],
    ['a missing sdp', { type: 'answer' }],
    ['an empty sdp', { type: 'answer', sdp: '' }],
    ['a non-string sdp', { type: 'answer', sdp: 42 }],
    ['a non-object', 'answer'],
    ['null', null],
  ])('treats a decoded object with %s as a rejected offer', (_, decoded) => {
    const body = btoa(JSON.stringify(decoded))

    expect(() => decodeCrealityWebrtcAnswer(body)).toThrow(/rejected the offer/)
  })

  it.each([
    ['invalid base64', 'not base64 %%%'],
    ['base64 of non-JSON', btoa('not json')],
    ['an empty body', ''],
  ])('rejects %s as malformed', (_, body) => {
    expect(() => decodeCrealityWebrtcAnswer(body)).toThrow(/Malformed/)
  })

  it('truncates a long body in the error', () => {
    const body = 'x'.repeat(200)

    expect(() => decodeCrealityWebrtcAnswer(body)).toThrow(`"${'x'.repeat(80)}…"`)
  })
})
