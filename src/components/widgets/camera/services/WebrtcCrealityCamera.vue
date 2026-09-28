<template>
  <video
    ref="streamingElement"
    autoplay
    disablePictureInPicture
    playsinline
    muted
    :style="cameraStyle"
    :crossorigin="crossorigin"
    @play="updateStatus('connected')"
    @error="updateStatus('error')"
  />
</template>

<script lang="ts">
import { Component, Ref, Mixins } from 'vue-property-decorator'
import { markRaw } from 'vue'
import CameraMixin from '@/mixins/camera'
import { consola } from 'consola'
import sleep from '@/util/sleep'
import decodeCrealityWebrtcAnswer from '@/util/creality-webrtc-answer'

const ICE_GATHERING_TIMEOUT = 5000
const MEDIA_TIMEOUT = 10000
const RETRY_DELAY = 2000

@Component({})
export default class WebrtcCrealityCamera extends Mixins(CameraMixin) {
  @Ref('streamingElement')
  readonly cameraVideo!: HTMLVideoElement

  pc: RTCPeerConnection | null = null
  playbackAbortController: AbortController | null = null
  sessionAbortController: AbortController | null = null

  async loadStream () {
    this.closeSession()

    const playbackSignal = this.playbackAbortController?.signal

    if (!playbackSignal || playbackSignal.aborted) {
      return
    }

    const sessionAbortController = this.sessionAbortController = new AbortController()
    const signal = AbortSignal.any([playbackSignal, sessionAbortController.signal])

    try {
      this.updateStatus('connecting')

      const url = this.buildAbsoluteUrl(this.camera.stream_url || '')

      const pc = this.pc = markRaw(new RTCPeerConnection({
        // Browsers hide host candidates behind mDNS names the printer cannot resolve,
        // so it only connects once STUN adds a server-reflexive candidate
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }))

      pc.addTransceiver('video', { direction: 'recvonly' })

      pc.ontrack = (ev) => {
        // Creality's answer carries no a=msid, so the track can arrive without a stream
        this.cameraVideo.srcObject = ev.streams[0] ?? new MediaStream([ev.track])
      }

      pc.oniceconnectionstatechange = () => {
        switch (pc.iceConnectionState) {
          case 'disconnected':
          case 'failed':
            this.onSessionFailed(sessionAbortController, `ICE connection ${pc.iceConnectionState}`)
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          this.onSessionFailed(sessionAbortController, 'peer connection failed')
        }
      }

      await pc.setLocalDescription(await pc.createOffer())

      await this.iceGatheringComplete(pc, signal)

      const sdp = pc.localDescription?.sdp

      if (!sdp) {
        throw new Error('no local description')
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          // CORS-safelisted, so the printer is never sent a preflight
          'Content-Type': 'text/plain'
        },
        body: btoa(JSON.stringify({ type: 'offer', sdp })),
        signal
      })

      if (!res.ok) {
        throw new Error(`bad status code ${res.status}`)
      }

      const answer = decodeCrealityWebrtcAnswer(await res.text())

      if (signal.aborted) {
        return
      }

      await pc.setRemoteDescription(answer)

      await sleep(MEDIA_TIMEOUT, signal)

      if (this.cameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        throw new Error(`no media after ${MEDIA_TIMEOUT}ms (ICE ${pc.iceConnectionState}, connection ${pc.connectionState})`)
      }
    } catch (e) {
      if (signal.aborted) {
        return
      }

      this.onSessionFailed(sessionAbortController, e)
    }
  }

  iceGatheringComplete (pc: RTCPeerConnection, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      if (pc.iceGatheringState === 'complete') {
        resolve()
        return
      }

      const cleanup = () => {
        clearTimeout(timeout)
        pc.removeEventListener('icegatheringstatechange', onStateChange)
        signal.removeEventListener('abort', onAbort)
      }

      const onStateChange = () => {
        if (pc.iceGatheringState === 'complete') {
          cleanup()
          resolve()
        }
      }

      const onAbort = () => {
        cleanup()
        reject(signal.reason)
      }

      // Send whatever has been gathered; the offer is not trickled afterwards
      const timeout = setTimeout(() => {
        cleanup()
        resolve()
      }, ICE_GATHERING_TIMEOUT)

      pc.addEventListener('icegatheringstatechange', onStateChange)
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  async onSessionFailed (sessionAbortController: AbortController, reason: unknown) {
    if (sessionAbortController.signal.aborted) {
      return
    }

    consola.error(`[WebrtcCrealityCamera] session failed "${this.camera.name}"`, reason)

    this.updateStatus('error')
    this.closeSession()

    const playbackSignal = this.playbackAbortController?.signal

    if (!playbackSignal || playbackSignal.aborted) {
      return
    }

    try {
      await sleep(RETRY_DELAY, playbackSignal)

      this.loadStream()
    } catch {}
  }

  closeSession () {
    this.sessionAbortController?.abort()
    this.sessionAbortController = null

    if (this.pc) {
      this.pc.getReceivers().forEach(receiver => {
        receiver.track.stop()
      })
      this.pc.close()
      this.pc = null
    }

    this.cameraVideo.srcObject = null
  }

  startPlayback () {
    this.playbackAbortController?.abort()
    this.playbackAbortController = new AbortController()

    this.loadStream()
  }

  stopPlayback () {
    this.playbackAbortController?.abort()
    this.playbackAbortController = null
    this.closeSession()
    this.updateStatus('disconnected')
    this.cameraVideo.src = ''
  }
}
</script>
