import type { ActionTree } from 'vuex'
import type { WebcamsState, LegacyCamerasState, LegacyCameraType, DatabaseWebcamConfig } from './types'
import type { RootState } from '../types'
import { SocketActions } from '@/api/socketActions'
import setUrlQueryParam from '@/util/set-url-query-param'
import { Globals } from '@/globals'
import { v4 as uuidv4 } from 'uuid'
import { fromDatabaseWebcams, toDatabaseWebcam } from '@/util/webcam-database'
import { isMoonrakerNotFoundError } from '@/util/is-socket-error'
import { consola } from 'consola'

const legacyCameraTypeToWebcamService: Record<LegacyCameraType, Moonraker.Webcam.Service> = {
  mjpgstream: 'mjpegstreamer',
  mjpgadaptive: 'mjpegstreamer-adaptive',
  iframe: 'iframe',
  ipstream: 'ipstream'
}

const mjpegstreamerServices: Moonraker.Webcam.Service[] = [
  'mjpegstreamer',
  'mjpegstreamer-adaptive'
]

export const actions = {
  async reset ({ commit }) {
    commit('setReset')
  },

  async init () {
    SocketActions.serverWebcamsList()
  },

  async initFromDatabase ({ commit }) {
    try {
      const response = await SocketActions.serverDatabaseGetItem<Record<string, unknown>>(
        undefined,
        Globals.MOONRAKER_DB.webcams.NAMESPACE,
        { suppressError: isMoonrakerNotFoundError }
      )

      commit('setWebcamsList', { webcams: fromDatabaseWebcams(response.value ?? {}) })
    } catch (e) {
      consola.debug('[webcams] error reading webcams namespace', e)
    }
  },

  async initWebcams ({ commit }, payload: { activeWebcam?: string }) {
    commit('setInitWebcams', payload)
  },

  async initLegacyCameras (_, payload: LegacyCamerasState) {
    if (payload.cameras) {
      for (const legacyCamera of payload.cameras) {
        const service = legacyCameraTypeToWebcamService[legacyCamera.type]
        const isMjpegStreamer = mjpegstreamerServices.includes(service)

        const webcam: DatabaseWebcamConfig = {
          name: legacyCamera.name,
          location: 'printer',
          service,
          icon: 'mdiWebcam',
          enabled: legacyCamera.enabled ?? true,
          targetFps: legacyCamera.fpstarget || 15,
          targetFpsIdle: legacyCamera.fpsidletarget || 5,
          urlStream: isMjpegStreamer && legacyCamera.url ? setUrlQueryParam(legacyCamera.url, 'action', 'stream') : legacyCamera.url,
          urlSnapshot: isMjpegStreamer && legacyCamera.url ? setUrlQueryParam(legacyCamera.url, 'action', 'snapshot') : legacyCamera.url,
          flipX: legacyCamera.flipX ?? false,
          flipY: legacyCamera.flipY ?? false,
          rotation: legacyCamera.rotate ? +legacyCamera.rotate as Moonraker.Webcam.Rotation : 0,
          aspectRatio: '4:3',
          extra_data: {}
        }

        await SocketActions.serverDatabasePostItem(legacyCamera.id, webcam, Globals.MOONRAKER_DB.webcams.NAMESPACE)
      }

      await SocketActions.serverDatabaseDeleteItem(Globals.MOONRAKER_DB.fluidd.ROOTS.cameras.name, Globals.MOONRAKER_DB.fluidd.NAMESPACE)
    }
  },

  async updateWebcam ({ commit, rootGetters }, payload: Moonraker.Webcam.Entry) {
    if (rootGetters['server/componentSupport'](Globals.MOONRAKER_COMPONENTS.webcams.name)) {
      commit('setUpdateWebcam', payload)

      SocketActions.serverWebcamsWrite(payload)

      return
    }

    const webcam: Moonraker.Webcam.Entry = {
      ...payload,
      // Not crypto.randomUUID(): it is missing on plain-HTTP pages, where Fluidd usually runs
      uid: payload.uid || uuidv4(),
      source: 'database'
    }

    commit('setUpdateWebcam', webcam)

    SocketActions.serverDatabasePostItem(webcam.uid, toDatabaseWebcam(webcam), Globals.MOONRAKER_DB.webcams.NAMESPACE)
  },

  async removeWebcam ({ commit, rootGetters }, payload: string) {
    commit('setRemoveWebcam', payload)

    if (rootGetters['server/componentSupport'](Globals.MOONRAKER_COMPONENTS.webcams.name)) {
      SocketActions.serverWebcamsDelete(payload)
    } else {
      SocketActions.serverDatabaseDeleteItem(payload, Globals.MOONRAKER_DB.webcams.NAMESPACE)
    }
  },

  async updateActiveWebcam ({ commit, state }, payload: string) {
    commit('setActiveWebcam', payload)

    SocketActions.serverDatabasePostItem(Globals.MOONRAKER_DB.fluidd.ROOTS.webcams.name + '.activeWebcam', state.activeWebcam)
  },

  async onWebcamsList ({ commit }, payload: Moonraker.Webcam.ListResponse) {
    if (payload) {
      commit('setWebcamsList', payload)
    }
  },

  async onWebcamsChanged ({ commit }, payload: Moonraker.Webcam.ListResponse) {
    if (payload) {
      commit('setWebcamsList', payload)
    }
  }
} satisfies ActionTree<WebcamsState, RootState>
