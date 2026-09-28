import type { ActionTree } from 'vuex'
import type { DatabaseInfo, DatabaseState } from './types'
import type { RootState } from '../types'
import { SocketActions } from '@/api/socketActions'
import { isMoonrakerUnimplementedError, isSocketError } from '@/util/is-socket-error'

export const actions = {
  async reset ({ commit }) {
    commit('setReset')
  },

  async init ({ commit }) {
    try {
      await SocketActions.serverDatabaseList({ suppressError: isMoonrakerUnimplementedError })
    } catch (e) {
      if (isSocketError(e) && isMoonrakerUnimplementedError(e)) {
        commit('setListUnsupported')
      }
    }
  },

  async onServerDatabaseList ({ commit }, payload: DatabaseInfo) {
    commit('setServerDatabaseList', payload)
  },

  async onServerDatabasePostBackup ({ commit }, payload: { backup_path: string }) {
    commit('setServerDatabasePostBackup', payload)
  },

  async onServerDatabaseDeleteBackup ({ commit }, payload: { backup_path: string }) {
    commit('setServerDatabaseDeleteBackup', payload)
  }
} satisfies ActionTree<DatabaseState, RootState>
