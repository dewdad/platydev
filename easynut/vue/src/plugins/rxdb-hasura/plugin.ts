import { Instance } from '@platyplus/vue-hasura-backend-plus'
import { pathToArray } from 'graphql/jsutils/Path'
import { GraphQLClient } from 'graphql-request'
import { RxCollection } from 'rxdb'
import { App, InjectionKey, Ref, ref } from 'vue'

import { getSdk, TableFragment } from '../../generated'
import { createDb, RxHasuraDatabase } from './database'
import { GraphQLReplicator } from './replicator'
export const DefaultRxDBKey = Symbol()
import path from 'path'

import { fullTableName } from './helpers'
export type RxDBHasuraPluginOptions = {
  name: string
  endpoint: string
  hbp: Instance
  adminSecret?: string
}
// TODO explicit 'logout' that destroys the database. Don't destroy when auth status changes (it means we're offline)
export class RxDBHasuraPlugin {
  readonly client: GraphQLClient
  readonly hbp: Instance
  readonly db: Ref<RxHasuraDatabase | undefined> = ref()
  readonly collections: Ref<Record<string, RxCollection>> = ref({})
  readonly tables: Ref<Record<string, TableFragment>> = ref({})
  readonly name: string
  private replicator?: GraphQLReplicator
  readonly endpoint: string

  constructor({ name, endpoint, adminSecret, hbp }: RxDBHasuraPluginOptions) {
    this.client = new GraphQLClient(endpoint)
    if (adminSecret) {
      this.client.setHeader('x-hasura-admin-secret', adminSecret)
    }
    this.hbp = hbp
    this.name = name
    this.endpoint = endpoint
  }

  private updateToken(): string {
    const token = this.hbp.auth.getJWTToken()
    this.replicator?.setToken(token)
    if (token) {
      this.client.setHeader('authorization', `Bearer ${token}`)
    } else {
      this.client.setHeader('authorization', '') // TODO ugly
    }

    return token
  }

  install(app: App, injectKey: string | InjectionKey<unknown>): void {
    this.hbp.auth.onAuthStateChanged(async (status: boolean) => {
      console.log('State changed', status)
      const token = this.updateToken()
      if (status) {
        if (!this.db?.value) {
          this.db.value = await createDb({
            name: this.name,
            // password: 'myPassword', // <- password (optional)
            multiInstance: true, // <- multiInstance (optional, default: true)
            eventReduce: true // <- eventReduce (optional, default: true))
          })
          const tablesArray = (await getSdk(this.client).metadata())
            .metadata_table
          this.tables.value = tablesArray.reduce<Record<string, TableFragment>>(
            (aggr, cursor) => ((aggr[fullTableName(cursor)] = cursor), aggr),
            {}
          )
          await this.db.value.addTables(tablesArray)
          this.collections.value = this.db.value.collections
          await this.replicator?.stop()
          this.replicator = new GraphQLReplicator(
            this.db.value,
            tablesArray,
            this.endpoint,
            token
          )
          await this.replicator.start()
        }
      } else {
        await this.replicator?.stop()
      }
    })

    this.hbp.auth.onTokenChanged(() => {
      console.log('Token changed')
      this.updateToken()
    })

    // * Load all components from the `./components` directory
    const components = require.context('./components', true, /\.vue$/)
    components.keys().forEach(filename => {
      // const name = path.basename(filename, '.vue')
      const Comp = components(filename).default
      app.component(Comp.name, Comp)
    })

    app.provide(injectKey || DefaultRxDBKey, this)
  }
}

export const createRxDBHasuraPlugin = (
  options: RxDBHasuraPluginOptions
): RxDBHasuraPlugin => {
  return new RxDBHasuraPlugin(options)
}