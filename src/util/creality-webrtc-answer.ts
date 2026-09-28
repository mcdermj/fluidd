export type CrealityWebrtcAnswer = {
  type: 'answer';
  sdp: string;
}

const describeBody = (body: string) => JSON.stringify(
  body.length > 80
    ? `${body.slice(0, 80)}…`
    : body
)

const parseBody = (body: string): unknown => {
  try {
    return JSON.parse(atob(body))
  } catch {
    // A rejected offer is answered with a bare `{}`, not base64, still with a 200
    return JSON.parse(body)
  }
}

const decodeCrealityWebrtcAnswer = (body: string): CrealityWebrtcAnswer => {
  let parsed: unknown

  try {
    parsed = parseBody(body.trim())
  } catch {
    throw new Error(`Malformed Creality WebRTC answer ${describeBody(body)}`)
  }

  if (
    parsed != null &&
    typeof parsed === 'object' &&
    'type' in parsed &&
    parsed.type === 'answer' &&
    'sdp' in parsed &&
    typeof parsed.sdp === 'string' &&
    parsed.sdp !== ''
  ) {
    return {
      type: 'answer',
      sdp: parsed.sdp
    }
  }

  throw new Error(`Creality camera rejected the offer ${describeBody(body)}`)
}

export default decodeCrealityWebrtcAnswer
