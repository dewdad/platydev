import { exec } from '@platyplus/process'

export type LernaPackage = {
  name: string
  location: string
  version: string
  private: boolean
}

/**
 * * Gets package information based on its name as per defined in package.json
 * @param name package name as per defined in package.json
 * @param rootDir root dir of the monorepo
 * @return basic package information
 */
export const getLernaPackage = async (name: string): Promise<LernaPackage> => {
  try {
    const stdout = await exec(
      `lerna ls --all --exclude-dependents --json --scope='${name}'`
    )
    const list = JSON.parse(stdout) as LernaPackage[]
    if (list.length !== 1)
      throw Error(
        `lernaPackage(${name}): found ${list.length} package(s) where only one should be found.`
      )
    return list[0]
  } catch (error) {
    console.log(error)
    throw Error(`Cannot find package ${name}`)
  }
}

/**
 * * Returns the dependent packages of the package given as a parameter
 * ! Only the 'non-private' packages are returned
 * @param name package name as per defined in package.json
 */
export const getLernaDependencies = async (
  name: string
): Promise<LernaPackage[]> => {
  try {
    const stdout = await exec(
      `lerna ls --include-dependencies --json --scope='${name}'`
    )
    const list = JSON.parse(stdout) as LernaPackage[]
    return list.filter((p) => p.name !== name)
  } catch (error) {
    console.log(error)
    throw Error(`Cannot find package ${name}.`)
  }
}

/**
 * * Checks if a given package is present in the current lerna project
 * @param name package name as per defined in package.json
 */
export const hasLernaPackage = async (name: string): Promise<boolean> => {
  try {
    const stdout = await exec(`lerna ls --all --json --scope='${name}'`)
    const list = JSON.parse(stdout) as LernaPackage[]
    return list.length === 1
  } catch (error) {
    return false
  }
}