import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedDatabase } from '../data/seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDirectory = path.join(__dirname, '..', 'data')
const dataFile = path.join(dataDirectory, 'storage.json')

let writeQueue = Promise.resolve()

export async function ensureDatabase() {
  await mkdir(dataDirectory, { recursive: true })

  try {
    await readFile(dataFile, 'utf8')
  } catch {
    await writeFile(dataFile, JSON.stringify(seedDatabase, null, 2))
  }
}

export async function readDatabase() {
  const raw = await readFile(dataFile, 'utf8')
  return JSON.parse(raw)
}

export function writeDatabase(nextDatabase) {
  writeQueue = writeQueue.then(() =>
    writeFile(dataFile, JSON.stringify(nextDatabase, null, 2)),
  )

  return writeQueue
}
