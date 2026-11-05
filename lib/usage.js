/**
 * Append-only usage log for asset calls.
 *
 * The native tool and the MCP server are separate processes, so each call is
 * appended as one JSON line to `<DSH_HOME>/asset-library/usage.log`. Appends of
 * small lines are atomic enough on every platform, and the dashboard only
 * needs an aggregate, so a plain log is simpler and safer than a shared JSON
 * document. Statistics must never break a call: every helper swallows errors.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { configDir } from './store.js'

const MAX_BYTES = 3 * 1024 * 1024
const KEEP_LINES = 8000

function usageFile() {
  return path.join(configDir(), 'usage.log')
}

export async function recordCall(entry) {
  try {
    const line = JSON.stringify({
      at: (entry && entry.at) || new Date().toISOString(),
      source: (entry && entry.source) || 'tool',
      action: String((entry && entry.action) || 'unknown').slice(0, 40),
      ok: !(entry && entry.ok === false),
      ids: entry && Array.isArray(entry.ids) ? entry.ids.filter((id) => typeof id === 'string').slice(0, 200) : [],
    })
    await fsp.mkdir(configDir(), { recursive: true })
    await fsp.appendFile(usageFile(), line + '\n', 'utf8')
    await pruneIfNeeded()
  } catch {
    /* ignore */
  }
}

async function pruneIfNeeded() {
  try {
    const stat = await fsp.stat(usageFile())
    if (stat.size < MAX_BYTES) return
    const text = await fsp.readFile(usageFile(), 'utf8')
    const lines = text.split('\n').filter((line) => line.trim()).slice(-KEEP_LINES)
    await fsp.writeFile(usageFile(), lines.join('\n') + '\n', 'utf8')
  } catch {
    /* ignore */
  }
}

export function emptyUsage() {
  return {
    total: 0,
    ok: 0,
    failed: 0,
    rate: 0,
    usedCount: 0,
    used: [],
    byAction: {},
    sources: {},
    daily: {},
    today: 0,
    lastAt: '',
  }
}

export async function readUsage() {
  let text = ''
  try {
    text = await fsp.readFile(usageFile(), 'utf8')
  } catch {
    return emptyUsage()
  }
  const used = new Set()
  const byAction = {}
  const sources = {}
  const daily = {}
  let total = 0
  let ok = 0
  let failed = 0
  let lastAt = ''
  const todayKey = new Date().toISOString().slice(0, 10)
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    total += 1
    if (entry.ok === false) failed += 1
    else ok += 1
    const action = String(entry.action || 'unknown')
    byAction[action] = (byAction[action] || 0) + 1
    const source = String(entry.source || 'tool')
    sources[source] = (sources[source] || 0) + 1
    if (entry.at) lastAt = entry.at
    const day = String(entry.at || '').slice(0, 10)
    if (day) daily[day] = (daily[day] || 0) + 1
    if (Array.isArray(entry.ids)) {
      for (const id of entry.ids) if (typeof id === 'string') used.add(id)
    }
  }
  return {
    total,
    ok,
    failed,
    rate: total > 0 ? Math.round((ok / total) * 1000) / 10 : 0,
    usedCount: used.size,
    used: [...used].slice(0, 5000),
    byAction,
    sources,
    daily,
    today: daily[todayKey] || 0,
    lastAt,
  }
}

/** Last 7 days (oldest first) for the dashboard bar strip. */
export function lastWeek(daily) {
  const days = []
  const now = new Date()
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now.getTime() - offset * 24 * 3600 * 1000).toISOString().slice(0, 10)
    days.push({ day, count: (daily && daily[day]) || 0 })
  }
  return days
}
