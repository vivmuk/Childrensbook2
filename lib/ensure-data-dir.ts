import { mkdirSync } from 'fs'
import { join } from 'path'

export function ensureDataDirectory() {
  const dataDir = join(process.cwd(), 'data')
  try {
    mkdirSync(dataDir, { recursive: true })
  } catch (error) {
    // Directory already exists or can't be created
  }
}
