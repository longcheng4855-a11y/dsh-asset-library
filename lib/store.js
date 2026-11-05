/**
 * Storage for the asset library.
 *
 * Two files own all state:
 *   <DSH_HOME>/asset-library/config.json  — where the library lives + switches
 *   <library>/library.json                — every item record
 *
 * A library directory looks like this:
 *   library.json
 *   originals/<id>.<ext>   uploaded source images
 *   thumbs/<id>.jpg        small previews for the grid
 *   assets/<id>.png        cropped segments
 *
 * Nothing here imports a Harness package, so the MCP server process can reuse
 * it unchanged.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

/** Top-level categories stay coarse on purpose: a shallow, readable tree. */
export const TOP_CATEGORIES = [
  '人物',
  '场景',
  '物体',
  '图标界面',
  '纹理材质',
  '文字排版',
  '其他',
]

const MEDIA_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const EXT_MEDIA = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const MAX_STATE_BYTES = 64 * 1024 * 1024

/** Editors and shells may add a BOM; JSON.parse would reject it. */
function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

/** Harness home: the profile that owns this process sets DSH_HOME. */
export function dshHome() {
  const env = process.env.DSH_HOME
  if (typeof env === 'string' && env.trim() !== '') return env.trim()
  return path.join(os.homedir(), '.dsh')
}

export function configDir() {
  return path.join(dshHome(), 'asset-library')
}

export function configPath() {
  return path.join(configDir(), 'config.json')
}

export function defaultLibraryPath() {
  return path.join(dshHome(), 'asset-library', 'library')
}

/** @returns {object} the normalized config */
export function emptyConfig() {
  return {
    version: 1,
    libraryPath: '',
    enabled: true,
    detector: 'python',
    analysis: { provider: '', model: '' },
    createdAt: 0,
    updatedAt: 0,
  }
}

function normalizeConfig(raw) {
  const config = emptyConfig()
  if (raw && typeof raw === 'object') {
    if (typeof raw.libraryPath === 'string') config.libraryPath = raw.libraryPath
    if (typeof raw.enabled === 'boolean') config.enabled = raw.enabled
    if (raw.detector === 'python' || raw.detector === 'local' || raw.detector === 'model') config.detector = raw.detector
    if (raw.analysis && typeof raw.analysis === 'object') {
      config.analysis = {
        provider: typeof raw.analysis.provider === 'string' ? raw.analysis.provider : '',
        model: typeof raw.analysis.model === 'string' ? raw.analysis.model : '',
      }
    }
    if (Number.isFinite(raw.createdAt)) config.createdAt = raw.createdAt
    if (Number.isFinite(raw.updatedAt)) config.updatedAt = raw.updatedAt
  }
  return config
}

let configCache = { at: 0, value: null }

/** Synchronous read for the prompt section, which cannot await. */
export function readConfigSync() {
  const now = Date.now()
  if (configCache.value && now - configCache.at < 1000) return configCache.value
  let raw = null
  try {
    raw = parseJsonText(fs.readFileSync(configPath(), 'utf8'))
  } catch {
    raw = null
  }
  const value = normalizeConfig(raw)
  configCache = { at: now, value }
  return value
}

export async function readConfig() {
  let raw = null
  try {
    raw = parseJsonText(await fsp.readFile(configPath(), 'utf8'))
  } catch {
    raw = null
  }
  const value = normalizeConfig(raw)
  configCache = { at: Date.now(), value }
  return value
}

export async function writeConfig(patch) {
  const current = await readConfig()
  const next = normalizeConfig({ ...current, ...patch })
  next.updatedAt = Date.now()
  if (!next.createdAt) next.createdAt = next.updatedAt
  await fsp.mkdir(configDir(), { recursive: true })
  const tmp = configPath() + '.tmp'
  await fsp.writeFile(tmp, JSON.stringify(next, null, 2), 'utf8')
  await fsp.rename(tmp, configPath())
  configCache = { at: Date.now(), value: next }
  return next
}

/** The library state file is small JSON; keep one shape for reads. */
export function emptyLibrary() {
  return { version: 1, createdAt: 0, updatedAt: 0, items: [], categories: [], usage: { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0 } }
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null
  if (typeof item.id !== 'string' || item.id === '') return null
  if (typeof item.file !== 'string' || item.file === '') return null
  return {
    id: item.id,
    name: typeof item.name === 'string' ? item.name : '未命名素材',
    kind: item.kind === 'original' ? 'original' : 'segment',
    category: typeof item.category === 'string' && item.category ? item.category : '其他',
    tags: Array.isArray(item.tags) ? item.tags.filter((t) => typeof t === 'string').slice(0, 12) : [],
    note: typeof item.note === 'string' ? item.note : '',
    file: item.file,
    thumb: typeof item.thumb === 'string' ? item.thumb : '',
    w: Number.isFinite(item.w) ? item.w : 0,
    h: Number.isFinite(item.h) ? item.h : 0,
    bytes: Number.isFinite(item.bytes) ? item.bytes : 0,
    mediaType: typeof item.mediaType === 'string' ? item.mediaType : mediaTypeOf(item.file),
    bbox: Array.isArray(item.bbox) && item.bbox.length === 4 ? item.bbox.map(Number) : null,
    sourceId: typeof item.sourceId === 'string' ? item.sourceId : '',
    ai: item.ai && typeof item.ai === 'object' ? item.ai : null,
    originName: typeof item.originName === 'string' ? item.originName : '',
    hash: typeof item.hash === 'string' ? item.hash : '',
    createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
    updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
  }
}

function normalizeLibrary(raw) {
  const state = emptyLibrary()
  if (raw && typeof raw === 'object') {
    if (Number.isFinite(raw.createdAt)) state.createdAt = raw.createdAt
    if (Number.isFinite(raw.updatedAt)) state.updatedAt = raw.updatedAt
    if (Array.isArray(raw.categories)) {
      for (const entry of raw.categories) {
        const path = normalizeCategoryPath(entry)
        if (path && !state.categories.includes(path)) state.categories.push(path)
      }
    }
    if (raw.usage && typeof raw.usage === 'object') {
      state.usage = {
        calls: Math.max(0, Number(raw.usage.calls) || 0),
        inputTokens: Math.max(0, Number(raw.usage.inputTokens) || 0),
        outputTokens: Math.max(0, Number(raw.usage.outputTokens) || 0),
        reasoningTokens: Math.max(0, Number(raw.usage.reasoningTokens) || 0),
      }
    }
    if (Array.isArray(raw.items)) {
      for (const item of raw.items) {
        const normalized = normalizeItem(item)
        if (normalized) state.items.push(normalized)
      }
    }
  }
  syncCategories(state)
  return state
}

export function libraryFile(libraryPath) {
  return path.join(libraryPath, 'library.json')
}

export async function loadLibrary(libraryPath) {
  if (!libraryPath) throw new Error('尚未设置素材库路径')
  let raw = null
  try {
    const text = await fsp.readFile(libraryFile(libraryPath), 'utf8')
    raw = parseJsonText(text)
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      if (String(error.message || '').includes('Unexpected') || error instanceof SyntaxError) {
        throw new Error(`library.json 解析失败：${String(error.message || error)}`)
      }
      throw error
    }
    raw = null
  }
  const state = normalizeLibrary(raw)
  if (raw === null) {
    state.createdAt = Date.now()
    state.updatedAt = state.createdAt
    await ensureLibraryDirs(libraryPath)
    await writeLibrary(libraryPath, state)
  }
  return state
}

export async function writeLibrary(libraryPath, state) {
  await ensureLibraryDirs(libraryPath)
  const tmp = libraryFile(libraryPath) + '.tmp'
  await fsp.writeFile(tmp, JSON.stringify(state), 'utf8')
  await fsp.rename(tmp, libraryFile(libraryPath))
}

async function ensureLibraryDirs(libraryPath) {
  for (const dir of ['', 'originals', 'thumbs', 'assets']) {
    await fsp.mkdir(path.join(libraryPath, dir), { recursive: true })
  }
}

/** One mutation at a time per library path. */
const queues = new Map()

export function withLibraryLock(key, task) {
  const previous = queues.get(key) || Promise.resolve()
  const next = previous.then(task, task)
  queues.set(
    key,
    next.catch(() => undefined),
  )
  return next
}

export async function mutateLibrary(libraryPath, mutate) {
  return withLibraryLock(libraryPath, async () => {
    const state = await loadLibrary(libraryPath)
    const outcome = await mutate(state)
    syncCategories(state)
    state.updatedAt = Date.now()
    await writeLibrary(libraryPath, state)
    return outcome
  })
}

/** Cheap synchronous cache for the prompt section. */
const stateCache = new Map()

export function readLibrarySync(libraryPath) {
  if (!libraryPath) return null
  let stat
  try {
    stat = fs.statSync(libraryFile(libraryPath))
  } catch {
    return null
  }
  const cached = stateCache.get(libraryPath)
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.state
  let raw = null
  try {
    if (stat.size > MAX_STATE_BYTES) return null
    raw = parseJsonText(fs.readFileSync(libraryFile(libraryPath), 'utf8'))
  } catch {
    return null
  }
  const state = normalizeLibrary(raw)
  stateCache.set(libraryPath, { mtimeMs: stat.mtimeMs, size: stat.size, state })
  return state
}

export function newId(prefix) {
  const stamp = Date.now().toString(36)
  const random = crypto.randomBytes(4).toString('hex')
  return `${prefix}_${stamp}${random}`
}

export function mediaTypeOf(file) {
  return EXT_MEDIA[path.extname(String(file || '')).toLowerCase()] || 'application/octet-stream'
}

export function extForMediaType(mediaType) {
  return MEDIA_EXT[mediaType] || ''
}

export function isSupportedMediaType(mediaType) {
  return Object.hasOwn(MEDIA_EXT, mediaType)
}

/** Resolve a library-relative path and refuse anything that escapes it. */
export function resolveInside(libraryPath, relative) {
  if (typeof relative !== 'string' || relative === '') return null
  if (path.isAbsolute(relative)) return null
  const root = path.resolve(libraryPath)
  const absolute = path.resolve(root, relative)
  const normalizedRoot = root.endsWith(path.sep) ? root : root + path.sep
  if (absolute !== root && !absolute.startsWith(normalizedRoot)) return null
  return absolute
}

/** Public JSON shape: adds absolute path and same-origin URLs. */
export function publicItem(item, libraryPath) {
  const absolute = path.join(libraryPath, item.file)
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    category: item.category,
    tags: item.tags,
    note: item.note,
    w: item.w,
    h: item.h,
    bytes: item.bytes,
    mediaType: item.mediaType,
    bbox: item.bbox,
    sourceId: item.sourceId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    file: item.file,
    hash: item.hash,
    path: absolute,
    thumb: item.thumb || item.file,
    url: assetUrl(item.file),
    thumbUrl: assetUrl(item.thumb || item.file),
    hasAnalysis: Boolean(item.ai),
  }
}

export function assetUrl(relative) {
  return '/asset-library/file?p=' + encodeURIComponent(relative)
}

/**
 * Split a category path into at most two trimmed segments. Unknown top-level
 * names are kept when they are short; otherwise the item falls back to 其他.
 */
export function normalizeCategory(raw) {
  let text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return '其他'
  text = text.replace(/[\\>»→|]+/g, '/')
  let parts = text
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return '其他'
  if (parts.length > 2) parts = [parts[0], parts[1]]
  const head = parts[0].slice(0, 8)
  const tail = parts[1] ? parts[1].slice(0, 8) : ''
  return tail ? `${head}/${tail}` : head
}

/** Path normalization that keeps an empty result empty (no 其他 fallback). */
export function normalizeCategoryPath(raw) {
  let text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return ''
  text = text.replace(/[\\>»→|]+/g, '/')
  const parts = text
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return ''
  return parts
    .map((part) => part.slice(0, 8))
    .join('/')
}

/** Keep the stored category list in sync with the items: empty categories stay. */
export function syncCategories(state) {
  if (!Array.isArray(state.categories)) state.categories = []
  const set = new Set()
  for (const entry of state.categories) {
    const path = normalizeCategoryPath(entry)
    if (!path) continue
    set.add(path)
    const head = path.split('/')[0]
    if (head) set.add(head)
  }
  for (const item of state.items) {
    const path = normalizeCategoryPath(item.category)
    if (!path) continue
    set.add(path)
    const head = path.split('/')[0]
    if (head) set.add(head)
  }
  state.categories = [...set].sort((a, b) => a.localeCompare(b, 'zh'))
}

/** Rename a category (and its children paths) and every item that uses it. */
export function renameCategoryInState(state, from, to) {
  const source = normalizeCategoryPath(from)
  const target = normalizeCategoryPath(to)
  if (!source) throw new Error('分类路径无效')
  if (!target) throw new Error('分类名不能为空')
  if (source === target) return 0
  let updated = 0
  for (const item of state.items) {
    const current = normalizeCategoryPath(item.category)
    if (!current) continue
    if (current === source) {
      item.category = target
      updated += 1
    } else if (current.startsWith(source + '/')) {
      item.category = target + current.slice(source.length)
      updated += 1
    }
  }
  state.categories = state.categories.map((entry) => {
    const path = normalizeCategoryPath(entry)
    if (path === source) return target
    if (path.startsWith(source + '/')) return target + path.slice(source.length)
    return path
  })
  syncCategories(state)
  return updated
}

/** Create an empty category (or subcategory) that survives having no items. */
export function createCategoryInState(state, path) {
  const target = normalizeCategoryPath(path)
  if (!target) throw new Error('分类名不能为空')
  if (!state.categories.includes(target)) state.categories.push(target)
  syncCategories(state)
  return target
}

/** Remove a category (and its children); its items fall back to 其他. */
export function removeCategoryFromState(state, path) {
  const target = normalizeCategoryPath(path)
  if (!target) throw new Error('分类路径无效')
  let moved = 0
  for (const item of state.items) {
    const current = normalizeCategoryPath(item.category)
    if (!current) continue
    if (current === target || current.startsWith(target + '/')) {
      item.category = '其他'
      moved += 1
    }
  }
  state.categories = state.categories.filter((entry) => {
    const value = normalizeCategoryPath(entry)
    return value !== target && !value.startsWith(target + '/')
  })
  syncCategories(state)
  return moved
}

/** Two-level tree with counts; stored-but-empty categories still show up. */
export function buildTree(items, storedPaths = []) {
  const tops = new Map()
  const touch = (name) => {
    if (!tops.has(name)) tops.set(name, { count: 0, children: new Map() })
    return tops.get(name)
  }
  for (const item of items) {
    const path = normalizeCategoryPath(item.category) || '其他'
    const [head, tail] = path.split('/')
    const node = touch(head || '其他')
    node.count += 1
    if (tail) node.children.set(tail, (node.children.get(tail) || 0) + 1)
  }
  for (const entry of Array.isArray(storedPaths) ? storedPaths : []) {
    const path = normalizeCategoryPath(entry)
    if (!path) continue
    const [head, tail] = path.split('/')
    const node = touch(head)
    if (tail && !node.children.has(tail)) node.children.set(tail, 0)
  }
  const tree = []
  for (const [name, node] of tops) {
    const children = [...node.children.entries()]
      .map(([childName, count]) => ({ name: childName, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
    tree.push({ name, count: node.count, children })
  }
  tree.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
  return tree
}

export function sanitizeName(raw, fallback = '未命名素材') {
  const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  if (!text) return fallback
  return text.slice(0, 32)
}

export function sanitizeTags(raw, max = 6) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const tags = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const tag = entry.replace(/\s+/g, '').replace(/^#/, '').trim().slice(0, 12)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= max) break
  }
  return tags
}

export function sanitizeNote(raw) {
  const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  return text.slice(0, 120)
}

/** Every category path the model may reuse, deepest first is unnecessary. */
export function categoryPaths(items) {
  const set = new Set()
  for (const item of items) set.add(String(item.category || '其他'))
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
}

export function uniqueTags(items) {
  const counts = new Map()
  for (const item of items) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .slice(0, 24)
    .map(([name, count]) => ({ name, count }))
}

/** Decode a base64 payload, refusing oversized or malformed input. */
export function decodeBase64(raw, maxBytes) {
  if (typeof raw !== 'string' || raw === '') throw new Error('缺少图片数据')
  const body = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
  const buffer = Buffer.from(body, 'base64')
  if (buffer.length === 0) throw new Error('图片数据为空')
  if (buffer.length > maxBytes) throw new Error(`图片过大（上限 ${Math.round(maxBytes / (1024 * 1024))} MB）`)
  return buffer
}
