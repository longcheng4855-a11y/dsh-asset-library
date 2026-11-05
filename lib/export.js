/**
 * Copy library assets into a game project (Godot / Unity / web) and keep a
 * manifest next to them. Shared by the Host route, the agent tool and the MCP
 * server so all three behave identically.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import * as store from './store.js'

const INVALID = /[<>:"/\\|?*\u0000-\u001f]/g

/** A file name a game engine accepts, derived from the asset name. */
export function safeFileName(name, extension) {
  let base = String(name || '')
    .replace(INVALID, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim()
  if (!base) base = 'asset'
  return base.slice(0, 60) + extension
}

async function exists(target) {
  try {
    await fsp.access(target)
    return true
  } catch {
    return false
  }
}

/**
 * @param {object} request libraryPath, the items to copy, and the destination
 * @returns {Promise<{destination: string, manifest: string, exported: object[]}>}
 */
export async function exportAssets(request) {
  const { libraryPath, items, destination } = request
  const raw = typeof destination === 'string' ? destination.trim() : ''
  if (!raw) throw new Error('请提供导出目录（绝对路径）')
  const dir = path.resolve(raw)
  if (!path.isAbsolute(dir)) throw new Error('导出目录必须是绝对路径')
  await fsp.mkdir(dir, { recursive: true })

  const exported = []
  const manifestEntries = []
  for (const item of Array.isArray(items) ? items : []) {
    const source = store.resolveInside(libraryPath, item.file)
    if (!source) continue
    let stat
    try {
      stat = await fsp.stat(source)
    } catch {
      continue
    }
    if (!stat.isFile()) continue
    const extension = path.extname(item.file) || '.png'
    let fileName = safeFileName(item.name, extension)
    let target = path.join(dir, fileName)
    let suffix = 2
    while (await exists(target)) {
      fileName = safeFileName(`${item.name}-${suffix}`, extension)
      target = path.join(dir, fileName)
      suffix += 1
    }
    await fsp.copyFile(source, target)
    exported.push({
      id: item.id,
      name: item.name,
      file: fileName,
      path: target,
      w: item.w,
      h: item.h,
      category: item.category,
      tags: item.tags,
    })
    manifestEntries.push({
      id: item.id,
      name: item.name,
      file: fileName,
      width: item.w,
      height: item.h,
      category: item.category,
      tags: item.tags,
      note: item.note,
      kind: item.kind,
    })
  }

  const manifestPath = path.join(dir, 'harness-assets.json')
  let manifest = { version: 1, updatedAt: 0, assets: [] }
  try {
    const existing = JSON.parse(await fsp.readFile(manifestPath, 'utf8'))
    if (existing && Array.isArray(existing.assets)) manifest.assets = existing.assets
  } catch {
    /* first export into this folder */
  }
  const byId = new Map()
  for (const entry of manifest.assets) {
    if (entry && typeof entry.id === 'string') byId.set(entry.id, entry)
  }
  for (const entry of manifestEntries) byId.set(entry.id, entry)
  manifest.assets = [...byId.values()]
  manifest.updatedAt = Date.now()
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  return { destination: dir, manifest: manifestPath, exported }
}
