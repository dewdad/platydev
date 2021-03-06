import { readdirSync, statSync } from '@platyplus/fs'
import chalk from 'chalk'
import { execSync } from 'child_process'
import path from 'path'
import yargs, { CommandModule } from 'yargs'

import {
  DEFAULT_WORKING_DIR,
  helmVersion,
  listProjects,
  syncProject
} from '../..'
import { error } from '../error'
import { versionChart } from './chart'
import { versionProject } from './project'

type args = {
  all?: boolean
}

export const version: CommandModule<args, args> = {
  command: 'version',
  describe: 'version [project|chart]',
  builder: yargs =>
    yargs
      .usage('Usage: $0 version <project|chart>')
      .command(versionProject)
      .command(versionChart)
      .option('all', {
        describe: 'sync all the projects and charts of the monorepo',
        type: 'boolean',
        default: false
      }),
  handler: async ({ all }) => {
    if (all) {
      let push = false
      try {
        const chartsDir = path.join(DEFAULT_WORKING_DIR, 'charts')
        const charts = readdirSync(chartsDir)
          .filter(f => statSync(path.join(chartsDir, f)).isDirectory())
          .map(p => path.join('charts', p))
        if (charts.length) {
          push = true
          console.log(
            chalk.green(
              "Versionning Helm Charts from the 'charts' directory..."
            )
          )
          for (const p of charts) {
            await helmVersion(p, {
              gitDir: DEFAULT_WORKING_DIR,
              additionalPaths: [p],
              addAll: true,
              tagName: p,
              push: false
            })
          }
        } else {
          console.log(chalk.green("No chart found in the 'charts' directory"))
        }
      } catch (e) {
        error(e)
      }

      try {
        const projects = await listProjects()
        if (projects.length) {
          console.log(chalk.green('Versionning projects...'))
          push = true
          for (const { name } of projects) {
            await syncProject(name)
            await helmVersion(path.join(name, 'helm'), {
              gitDir: DEFAULT_WORKING_DIR,
              additionalPaths: [name],
              addAll: true,
              tagName: name,
              push: false
            })
          }
        } else {
          console.log(chalk.green('No project to version.'))
        }
      } catch (e) {
        error(e)
      }
      if (push) {
        execSync('git push', {
          cwd: DEFAULT_WORKING_DIR,
          stdio: 'inherit'
        })
      }
    } else {
      yargs.showHelp()
    }
  }
}
