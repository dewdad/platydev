import { Skaffold } from './types'

export const defaultSkaffoldConfiguration: Skaffold = {
  apiVersion: 'skaffold/v2beta8',
  kind: 'Config',
  build: {
    tagPolicy: {
      sha256: {}
    },
    artifacts: []
  },
  deploy: {
    helm: {
      releases: []
    }
  },
  profiles: []
}
