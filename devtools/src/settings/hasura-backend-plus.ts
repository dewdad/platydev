import fs, { tmp } from '@platyplus/fs'
import chalk from 'chalk'
import { execSync } from 'child_process'
import path from 'path'

import { ServiceConfig } from '../service'
import { DEFAULT_WORKING_DIR } from '.'
import { ServiceTypeConfig } from './types'

export const hasuraBackendPlusConfig: ServiceTypeConfig = ({ name }) => ({
  main: {
    build: {
      image: name,
      context: name
    }
  },
  dev: {
    build: false,
    helm: {
      setValues: {
        ingress: {
          enabled: true,
          'hosts[0].name': `${name}.localhost`
        }
      }
    }
  },
  chartName: 'hasura-backend-plus',

  // * Connect to an Hasura service and copy the official HBP migrations/metadata into it
  postServiceCreate: async (project, options?: { hasura?: ServiceConfig }) => {
    const hasura = options?.hasura
    if (hasura) {
      const projectPath = path.join(DEFAULT_WORKING_DIR, project.directory)
      console.log(
        chalk.green(
          `Loading migrations and metadata to ${hasura.directory}/${hasura.name} from https://github.com/nhost/hasura-backend-plus...`
        )
      )

      // * Clone the repo in a temp dir
      const tempDir = tmp.dirSync().name
      execSync(
        'git clone --depth=1 https://github.com/nhost/hasura-backend-plus.git',
        {
          cwd: tempDir,
          stdio: 'ignore'
        }
      )

      // * Copy HBP migrations
      try {
        for (const migration of fs.glob.sync(
          path.join(tempDir, 'hasura-backend-plus/migrations/*')
        )) {
          await fs.move(
            migration,
            path.join(
              hasura.absolutePath,
              'migrations',
              path.basename(migration)
            )
          )
        }
      } catch (err) {
        console.log(
          chalk.red(
            `Something went wrong in loading HBP migrations into ${hasura.directory}/${hasura.name}. Please copy/mere them manually.`
          )
        )
        console.log(err)
      }

      // * Copy HBP metadata. Will not work if some metadata already exists
      for (const source of fs.glob.sync(
        path.join(tempDir, 'hasura-backend-plus/metadata/*')
      )) {
        const destination = path.join(
          hasura.absolutePath,
          'metadata',
          path.basename(source)
        )
        if (fs.pathExistsSync(destination)) {
          // * If the file already exists, check if it's a YAML file or not
          if (path.extname(source) === '.yaml') {
            // * If it's a YAML file, then concatenate if it's an object, or merge if it's an object
            const oldData = await fs.readYaml(destination)
            if (Array.isArray(oldData)) {
              const newData = await fs.readYaml<Record<string, unknown>[]>(
                source
              )
              await fs.saveYaml(destination, [...oldData, ...newData])
            } else {
              const newData = await fs.readYaml<Record<string, unknown>>(source)
              await fs.loadYaml(destination, newData, true)
            }
          } else {
            // * If the file is not a YAML file, then consider as text and append it (e.g. graphql file)
            const newData = fs.readFileSync(source).toString()
            fs.appendFileSync(destination, newData)
          }
        } else {
          await fs.move(source, destination)
        }
      }

      await fs.remove(tempDir)

      // * Update Helm Chart values so it loads Hasura-related environment values from Hasura secrets and config-map
      await fs.loadYaml(path.join(projectPath, 'helm/values.yaml'), {
        [name]: {
          hasura: { enabled: false, serviceName: hasura.name }
        }
      })
    }
  }
})
