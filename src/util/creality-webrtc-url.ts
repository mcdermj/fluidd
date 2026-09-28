const CREALITY_WEBRTC_PORT = '8000'
const CREALITY_WEBRTC_PATH = '/call/webrtc_local'

const hasScheme = (value: string) => /^[a-z][a-z\d+.-]*:\/\//i.test(value)

export const crealityWebrtcStreamUrl = (host: string): string => {
  const trimmed = host.trim()

  if (trimmed === '') {
    return ''
  }

  try {
    const url = new URL(hasScheme(trimmed) ? trimmed : `http://${trimmed}`)

    if (!['http:', 'https:'].includes(url.protocol) || url.hostname === '') {
      return ''
    }

    // The printer only serves plain HTTP, whatever scheme was pasted
    url.protocol = 'http:'

    if (url.port === '') {
      url.port = CREALITY_WEBRTC_PORT
    }

    url.pathname = CREALITY_WEBRTC_PATH
    url.search = ''
    url.hash = ''

    return url.toString()
  } catch {
    return ''
  }
}

export const isCrealityWebrtcStreamUrl = (streamUrl: string): boolean => {
  try {
    return new URL(streamUrl).pathname === CREALITY_WEBRTC_PATH
  } catch {
    return false
  }
}

export const crealityWebrtcHost = (streamUrl: string): string => {
  try {
    const url = new URL(streamUrl)

    return url.port === CREALITY_WEBRTC_PORT
      ? url.hostname
      : url.host
  } catch {
    return ''
  }
}
