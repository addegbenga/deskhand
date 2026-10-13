import { now } from './clock'
import { deleteDb, getDb, getSnapshotDb, SEED_VERSION, TABLES, type Dump, type MockDb, type TableName } from './db'
import { devSettings } from './dev-settings'
import type { ScenarioId } from './scenarios'
import { generateSeed } from './seed'
import { notifyChange } from './sync'

/**
 * Repository layer over IndexedDB. Handlers go through here, never to Dexie directly,
 * so a real API can replace the mock without touching the UI (FE-DOC 8.6).
 */

const seeding = new Map<ScenarioId, Promise<MockDb>>()

export function currentScenario(): ScenarioId {
  return devSettings().scenario
}

export async function ensureSeeded(scenario: ScenarioId = currentScenario()): Promise<MockDb> {
  const pending = seeding.get(scenario)
  if (pending) return pending
  const task = (async () => {
    const db = getDb(scenario)
    const seeded = await db.meta.get('seededAt')
    const version = await db.meta.get('seedVersion')
    if (!seeded || version?.value !== SEED_VERSION) {
      const data = generateSeed(scenario)
      await db.transaction('rw', [db.meta, ...TABLES.map((name) => db.table(name))], async () => {
        for (const name of TABLES) {
          await db.table(name).clear()
          await db.table(name).bulkPut(data[name])
        }
        await db.meta.bulkPut([
          { key: 'seededAt', value: now().toISOString() },
          { key: 'seedVersion', value: SEED_VERSION },
        ])
      })
    }
    return db
  })()
  seeding.set(scenario, task)
  try {
    return await task
  } catch (error) {
    seeding.delete(scenario)
    throw error
  }
}

export async function db(): Promise<MockDb> {
  return ensureSeeded(currentScenario())
}

export async function write<T>(topics: string[], fn: (db: MockDb) => Promise<T>): Promise<T> {
  const database = await db()
  try {
    const result = await fn(database)
    notifyChange(topics)
    return result
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      notifyChange(['storage-full'])
    }
    throw error
  }
}

export async function resetScenario(scenario: ScenarioId = currentScenario()) {
  seeding.delete(scenario)
  await deleteDb(scenario)
  await ensureSeeded(scenario)
  notifyChange(['*'])
}

export async function dumpScenario(scenario: ScenarioId = currentScenario()): Promise<Dump> {
  const database = await ensureSeeded(scenario)
  const tables = {} as Record<TableName, unknown[]>
  for (const name of TABLES) tables[name] = await database.table(name).toArray()
  return { scenario, seedVersion: SEED_VERSION, tables, meta: await database.meta.toArray() }
}

export async function restoreDump(dump: Dump) {
  if (!dump?.tables || !dump.scenario) throw new Error('invalid_dump')
  seeding.delete(dump.scenario)
  await deleteDb(dump.scenario)
  const database = getDb(dump.scenario)
  await database.transaction('rw', [database.meta, ...TABLES.map((name) => database.table(name))], async () => {
    for (const name of TABLES) await database.table(name).bulkPut(dump.tables[name] ?? [])
    await database.meta.bulkPut(dump.meta)
  })
  notifyChange(['*'])
}

export async function saveSnapshot(name: string) {
  const data = await dumpScenario()
  await getSnapshotDb().snapshots.put({
    id: crypto.randomUUID(),
    scenario: data.scenario,
    name,
    createdAt: new Date().toISOString(),
    data,
  })
}

export async function listSnapshots(scenario: ScenarioId = currentScenario()) {
  return getSnapshotDb().snapshots.where('scenario').equals(scenario).reverse().sortBy('createdAt')
}

export async function loadSnapshot(id: string) {
  const snapshot = await getSnapshotDb().snapshots.get(id)
  if (snapshot) await restoreDump(snapshot.data)
}

export async function storageEstimate(): Promise<{ usedMb: number; quotaMb: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usedMb: usage / 1024 / 1024, quotaMb: quota / 1024 / 1024 }
}
