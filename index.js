/**
 * Host half of the 资产库 (asset library) bundle.
 *
 * Owns:
 *  - `/asset-library/*` HTTP routes used by the panel (state, import, analyze,
 *    commit, edit, delete, file streaming);
 *  - the `asset_library` agent tool and its short system-prompt section, so a
 *    session can search the material and open the exact file with `read_image`;
 *  - the vision-model analysis that names and classifies an uploaded image.
 *
 * Everything is local: the library is plain files inside the directory the
 * user picks, and the panel is the only writer.
 */
import fsp from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import * as store from './lib/store.js'
import { exportAssets } from './lib/export.js'
import { detectObjects, describePieces, MAX_OBJECTS } from './lib/analyze.js'

export const name = 'asset-library'
export const inject = ['webServer']

const VERSION = '0.7.0'
const ROUTE = '/asset-library'
const SMALL_BODY = 128 * 1024
const UPLOAD_BODY = 40 * 1024 * 1024
const MAX_ORIGINAL_BYTES = 24 * 1024 * 1024
const MAX_THUMB_BYTES = 3 * 1024 * 1024
const MAX_SEGMENT_BYTES = 12 * 1024 * 1024
const ANALYSIS_TIMEOUT_MS = 180000

/* ── HTTP helpers ─────────────────────────────────────────────────────── */

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': String(body.length),
  })
  response.end(body)
}

function readBody(request, limit) {
  return new Promise((resolve) => {
    let size = 0
    const chunks = []
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        request.destroy()
        resolve(null)
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', () => resolve(null))
  })
}

async function readJson(request, limit = SMALL_BODY) {
  const buffer = await readBody(request, limit)
  if (buffer === null) return null
  try {
    return JSON.parse(buffer.toString('utf8') || '{}')
  } catch {
    return null
  }
}

/** Refuse cross-origin browser requests, mirroring the host connection policy. */
function rejected(ctx, request, response) {
  try {
    const connection = typeof ctx.get === 'function' ? ctx.get('connection') : undefined
    if (!connection || typeof connection.requestRejection !== 'function') return false
    const code = connection.requestRejection(request)
    if (code === undefined || code === null || code === false) return false
    response.statusCode = typeof code === 'number' ? code : 403
    response.end()
    return true
  } catch {
    return false
  }
}

function errorMessage(error) {
  if (error && typeof error.message === 'string' && error.message) return error.message
  return String(error)
}

/** Accumulate token usage into the library's running total. */
async function recordUsage(config, usage) {
  if (!usage || typeof usage !== 'object' || !config.libraryPath) return
  try {
    await store.mutateLibrary(config.libraryPath, (state) => {
      const current = state.usage || { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0 }
      current.calls += 1
      current.inputTokens += Number(usage.inputTokens) || 0
      current.outputTokens += Number(usage.outputTokens) || 0
      current.reasoningTokens = (current.reasoningTokens || 0) + (Number(usage.reasoningTokens) || 0)
      state.usage = current
    })
  } catch {
    /* usage accounting never fails a request */
  }
}

function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(fallback)
    }, ms)
    promise.then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

/* ── model discovery ──────────────────────────────────────────────────── */

function defaultSelection(ctx) {
  try {
    const service = typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined
    if (!service || typeof service.currentSelection !== 'function') return null
    const selection = service.currentSelection()
    if (!selection || typeof selection.provider !== 'string' || typeof selection.model !== 'string') return null
    return { provider: selection.provider, model: selection.model }
  } catch {
    return null
  }
}

async function modelList(runtime) {
  const now = Date.now()
  if (runtime.models && now - runtime.models.at < 60000) return runtime.models.value
  const llm = typeof runtime.ctx.get === 'function' ? runtime.ctx.get('llm') : undefined
  if (!llm || typeof llm.listProviders !== 'function') return []
  const entries = []
  const seen = new Set()
  for (const provider of llm.listProviders()) {
    if (entries.length >= 90) break
    const models = await withTimeout(Promise.resolve().then(() => llm.listModels(provider.id)), 4000, [])
    for (const model of Array.isArray(models) ? models : []) {
      const key = `${provider.id}/${model.id}`
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({
        provider: provider.id,
        model: model.id,
        label: typeof model.name === 'string' && model.name ? model.name : model.id,
        image: Array.isArray(model.inputModalities) ? model.inputModalities.includes('image') : false,
      })
    }
  }
  entries.sort(
    (a, b) =>
      Number(b.image) - Number(a.image) ||
      a.provider.localeCompare(b.provider) ||
      a.label.localeCompare(b.label),
  )
  const value = entries.slice(0, 80)
  runtime.models = { at: now, value }
  return value
}

function pickAnalysisRoute(config, models, fallback) {
  const configured = config.analysis || {}
  if (configured.provider && configured.model) {
    const known = models.find((entry) => entry.provider === configured.provider && entry.model === configured.model)
    return { provider: configured.provider, model: configured.model, image: known ? known.image : true }
  }
  if (fallback) {
    const known = models.find((entry) => entry.provider === fallback.provider && entry.model === fallback.model)
    if (known && known.image) return known
  }
  const vision = models.find((entry) => entry.image)
  if (vision) return vision
  const preferred = fallback && models.find((entry) => entry.provider === fallback.provider && entry.model === fallback.model)
  if (preferred) return preferred
  if (fallback) return { ...fallback, image: false }
  if (models[0]) return models[0]
  return null
}

/**
 * Reasoning eats the whole token budget on some models, leaving no answer.
 * Ask the adapter for the effort list and use its lowest entry for these short
 * JSON tasks. Cached for five minutes; an empty string means "let the adapter
 * decide".
 */
async function lowestReasoningEffort(runtime, provider, model) {
  const key = `${provider}/${model}`
  const now = Date.now()
  if (!runtime.efforts) runtime.efforts = new Map()
  const cached = runtime.efforts.get(key)
  if (cached && now - cached.at < 300000) return cached.value
  let value = ''
  try {
    const llm = typeof runtime.ctx.get === 'function' ? runtime.ctx.get('llm') : undefined
    if (llm && typeof llm.resolveModelInfo === 'function') {
      const info = await withTimeout(Promise.resolve().then(() => llm.resolveModelInfo(provider, model)), 4000, null)
      const efforts = info && info.reasoning && Array.isArray(info.reasoning.efforts) ? info.reasoning.efforts : []
      if (efforts.length > 0) {
        const preferred = efforts.find((entry) => /none|off|minimal|low/i.test(String(entry.id)))
        value = String((preferred || efforts[0]).id)
      }
    }
  } catch {
    value = ''
  }
  runtime.efforts.set(key, { at: now, value })
  return value
}

async function resolveAnalysisRoute(runtime) {
  const config = await store.readConfig()
  const models = await modelList(runtime)
  const route = pickAnalysisRoute(config, models, defaultSelection(runtime.ctx))
  if (!route) throw new Error('没有可用的模型，请先在设置里配置模型')
  const reasoningEffort = await lowestReasoningEffort(runtime, route.provider, route.model)
  return { ...route, reasoningEffort }
}

/* ── snapshot ─────────────────────────────────────────────────────────── */

async function snapshot(runtime) {
  const config = await store.readConfig()
  const base = {
    ok: true,
    version: VERSION,
    configured: false,
    libraryPath: '',
    defaultPath: store.defaultLibraryPath(),
    enabled: config.enabled,
    detector: config.detector,
    analysis: config.analysis,
    models: await modelList(runtime),
    defaultModel: defaultSelection(runtime.ctx),
    items: [],
    tree: [],
    categories: [],
    usage: { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0 },
    tags: [],
    recent: [],
    stats: { total: 0, originals: 0, segments: 0, categories: 0, tags: 0, last7: 0 },
  }
  if (!config.libraryPath) return base
  let state
  try {
    state = await store.loadLibrary(config.libraryPath)
  } catch (error) {
    return { ...base, configured: true, libraryPath: config.libraryPath, error: errorMessage(error) }
  }
  const items = state.items.map((item) => store.publicItem(item, config.libraryPath))
  const tree = store.buildTree(items, state.categories)
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
  const stats = {
    total: items.length,
    originals: items.filter((item) => item.kind === 'original').length,
    segments: items.filter((item) => item.kind === 'segment').length,
    categories: tree.length,
    tags: store.uniqueTags(items).length,
    last7: items.filter((item) => item.createdAt >= weekAgo).length,
  }
  const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
  return {
    ...base,
    configured: true,
    libraryPath: config.libraryPath,
    items,
    tree,
    categories: state.categories,
    usage: state.usage,
    recent,
    tags: store.uniqueTags(items),
    stats,
  }
}

/* ── handlers ─────────────────────────────────────────────────────────── */

function fileHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      const url = new URL(request.url || '/', 'http://localhost')
      const relative = url.searchParams.get('p') || ''
      const config = await store.readConfig()
      if (!config.libraryPath) {
        response.writeHead(404)
        response.end()
        return
      }
      const absolute = store.resolveInside(config.libraryPath, relative)
      if (!absolute) {
        response.writeHead(400)
        response.end()
        return
      }
      const stat = await fsp.stat(absolute)
      if (!stat.isFile()) {
        response.writeHead(404)
        response.end()
        return
      }
      const headers = {
        'Content-Type': store.mediaTypeOf(absolute),
        'Content-Length': String(stat.size),
        'Cache-Control': 'private, max-age=600',
      }
      if (request.method === 'HEAD') {
        response.writeHead(200, headers)
        response.end()
        return
      }
      response.writeHead(200, headers)
      createReadStream(absolute).pipe(response)
    } catch {
      response.writeHead(404)
      response.end()
    }
  }
}

function stateHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      sendJson(response, 200, await snapshot(runtime))
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

function configHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const body = await readJson(request)
      if (!body || typeof body !== 'object') {
        sendJson(response, 400, { ok: false, error: '请求体不是 JSON' })
        return
      }
      const patch = {}
      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
      if (body.detector === 'local' || body.detector === 'model') patch.detector = body.detector
      if (body.analysis === null) {
        patch.analysis = { provider: '', model: '' }
      } else if (body.analysis && typeof body.analysis === 'object') {
        patch.analysis = {
          provider: typeof body.analysis.provider === 'string' ? body.analysis.provider : '',
          model: typeof body.analysis.model === 'string' ? body.analysis.model : '',
        }
      }
      if (typeof body.libraryPath === 'string') {
        const raw = body.libraryPath.trim()
        if (!raw) {
          sendJson(response, 400, { ok: false, error: '素材库路径不能为空' })
          return
        }
        if (!path.isAbsolute(raw)) {
          sendJson(response, 400, { ok: false, error: '请填写绝对路径，例如 D:\\素材库' })
          return
        }
        const resolved = path.resolve(raw)
        await store.loadLibrary(resolved)
        patch.libraryPath = resolved
      }
      await store.writeConfig(patch)
      sendJson(response, 200, await snapshot(runtime))
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

const STAGE_ID = /^stg_[a-z0-9]+$/

function stageDir(libraryPath, stageId) {
  if (!STAGE_ID.test(String(stageId || ''))) throw new Error('暂存 id 无效')
  return path.join(libraryPath, 'staging', stageId)
}

async function readStage(libraryPath, stageId) {
  const dir = stageDir(libraryPath, stageId)
  let meta
  try {
    meta = JSON.parse(await fsp.readFile(path.join(dir, 'stage.json'), 'utf8'))
  } catch {
    throw new Error('暂存已过期或被清理，请重新导入')
  }
  return { dir, meta }
}

/** Delete staging folders nobody committed (aborted imports). */
async function pruneStaging(libraryPath, maxAgeMs = 7 * 24 * 3600 * 1000) {
  const root = path.join(libraryPath, 'staging')
  let entries
  try {
    entries = await fsp.readdir(root, { withFileTypes: true })
  } catch {
    return
  }
  const now = Date.now()
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dir = path.join(root, entry.name)
    try {
      const stat = await fsp.stat(dir)
      if (now - stat.mtimeMs > maxAgeMs) await fsp.rm(dir, { recursive: true, force: true })
    } catch {
      /* best effort */
    }
  }
}

function stageHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      const body = await readJson(request, UPLOAD_BODY)
      if (!body || typeof body !== 'object') {
        sendJson(response, 400, { ok: false, error: '上传数据无效或过大' })
        return
      }
      const mediaType = typeof body.mediaType === 'string' ? body.mediaType : ''
      if (!store.isSupportedMediaType(mediaType)) {
        sendJson(response, 400, { ok: false, error: `不支持的图片格式：${mediaType || '未知'}` })
        return
      }
      const bytes = store.decodeBase64(body.data, MAX_ORIGINAL_BYTES)
      const width = Math.max(1, Math.round(Number(body.width) || 0))
      const height = Math.max(1, Math.round(Number(body.height) || 0))
      const hash = typeof body.hash === 'string' ? body.hash.slice(0, 128) : ''
      const state = await store.loadLibrary(config.libraryPath)
      const existing = hash ? state.items.find((item) => item.hash && item.hash === hash) : null
      if (existing) {
        sendJson(response, 200, {
          ok: true,
          duplicate: true,
          item: store.publicItem(existing, config.libraryPath),
        })
        return
      }
      const stageId = store.newId('stg')
      const extension = store.extForMediaType(mediaType)
      const dir = stageDir(config.libraryPath, stageId)
      await fsp.mkdir(dir, { recursive: true })
      await fsp.writeFile(path.join(dir, `source${extension}`), bytes)
      if (typeof body.thumb === 'string' && body.thumb) {
        const thumbBytes = store.decodeBase64(body.thumb, MAX_THUMB_BYTES)
        await fsp.writeFile(path.join(dir, 'thumb.jpg'), thumbBytes)
      }
      const meta = {
        stageId,
        name: store.sanitizeName(body.name, '素材'),
        mediaType,
        extension,
        width,
        height,
        bytes: bytes.length,
        hash,
        createdAt: Date.now(),
      }
      await fsp.writeFile(path.join(dir, 'stage.json'), JSON.stringify(meta), 'utf8')
      void pruneStaging(config.libraryPath)
      sendJson(response, 200, {
        ok: true,
        stageId,
        name: meta.name,
        width,
        height,
        url: store.assetUrl(`staging/${stageId}/source${extension}`),
        thumbUrl: store.assetUrl(`staging/${stageId}/thumb.jpg`),
      })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

function detectHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    let timer = null
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      if (!config.enabled) {
        sendJson(response, 400, { ok: false, error: '素材库已禁用，无法分析' })
        return
      }
      const body = await readJson(request)
      if (!body || typeof body.stageId !== 'string') {
        sendJson(response, 400, { ok: false, error: '缺少暂存 id' })
        return
      }
      const { dir, meta } = await readStage(config.libraryPath, body.stageId)
      const bytes = await fsp.readFile(path.join(dir, `source${meta.extension}`))
      const state = await store.loadLibrary(config.libraryPath)
      const route = await resolveAnalysisRoute(runtime)
      const controller = new AbortController()
      timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS)
      const detection = await detectObjects(runtime.ctx, {
        bytes,
        mediaType: meta.mediaType,
        name: meta.name,
        fileName: meta.name,
        categories: store.categoryPaths(state.items),
        provider: route.provider,
        model: route.model,
        reasoningEffort: route.reasoningEffort,
        signal: controller.signal,
      })
      await recordUsage(config, detection.usage)
      sendJson(response, 200, {
        ok: true,
        title: detection.title,
        objects: detection.objects.slice(0, MAX_OBJECTS),
        usage: detection.usage || null,
        model: `${route.provider}/${route.model}`,
      })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}

function describeHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    let timer = null
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      if (!config.enabled) {
        sendJson(response, 400, { ok: false, error: '素材库已禁用，无法分析' })
        return
      }
      const body = await readJson(request, UPLOAD_BODY)
      if (!body || typeof body.stageId !== 'string' || !Array.isArray(body.pieces)) {
        sendJson(response, 400, { ok: false, error: '请求格式无效' })
        return
      }
      if (body.pieces.length === 0) {
        sendJson(response, 400, { ok: false, error: '没有可分析的切图' })
        return
      }
      if (body.pieces.length > MAX_OBJECTS) {
        sendJson(response, 400, { ok: false, error: `一次最多分析 ${MAX_OBJECTS} 个切图` })
        return
      }
      const { dir, meta } = await readStage(config.libraryPath, body.stageId)
      const pieces = []
      for (let index = 0; index < body.pieces.length; index += 1) {
        const piece = body.pieces[index]
        if (!piece || typeof piece !== 'object') continue
        const mediaType = piece.mediaType === 'image/png' ? 'image/png' : 'image/jpeg'
        const bytes = store.decodeBase64(piece.data, MAX_SEGMENT_BYTES)
        const pieceId = `p${index + 1}`
        const extension = mediaType === 'image/png' ? '.png' : '.jpg'
        await fsp.writeFile(path.join(dir, `${pieceId}${extension}`), bytes)
        pieces.push({
          pieceId,
          bytes,
          mediaType,
          w: Math.max(1, Math.round(Number(piece.w) || 0)),
          h: Math.max(1, Math.round(Number(piece.h) || 0)),
          bbox: Array.isArray(piece.bbox) && piece.bbox.length === 4 ? piece.bbox.map(Number) : null,
        })
      }
      /* Drop piece files the new set no longer references. */
      try {
        const kept = new Set(pieces.map((piece) => piece.pieceId))
        const files = await fsp.readdir(dir)
        for (const file of files) {
          if (!/^p\d+\.(png|jpg)$/.test(file)) continue
          if (!kept.has(file.replace(/\.[^.]+$/, ''))) await fsp.unlink(path.join(dir, file))
        }
      } catch {
        /* best effort */
      }
      const state = await store.loadLibrary(config.libraryPath)
      const route = await resolveAnalysisRoute(runtime)
      const controller = new AbortController()
      timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS)
      const description = await describePieces(runtime.ctx, {
        pieces,
        title: meta.title || '',
        categories: store.categoryPaths(state.items),
        provider: route.provider,
        model: route.model,
        reasoningEffort: route.reasoningEffort,
        signal: controller.signal,
      })
      meta.title = description.title || meta.title
      await fsp.writeFile(path.join(dir, 'stage.json'), JSON.stringify(meta), 'utf8')
      await recordUsage(config, description.usage)
      /* Staged piece files are rewritten in place on every pass; version the URL
         so the browser does not show a stale crop. */
      const version = Date.now().toString(36)
      sendJson(response, 200, {
        ok: true,
        title: description.title,
        category: description.category,
        tags: description.tags,
        note: description.note,
        usage: description.usage || null,
        warning: description.warning || '',
        model: `${route.provider}/${route.model}`,
        pieces: pieces.map((piece, index) => {
          const annotation = description.pieces[index] || {}
          const extension = piece.mediaType === 'image/png' ? '.png' : '.jpg'
          return {
            pieceId: piece.pieceId,
            w: piece.w,
            h: piece.h,
            bbox: piece.bbox,
            url: store.assetUrl(`staging/${body.stageId}/${piece.pieceId}${extension}`) + '&v=' + version,
            name: annotation.name || `切图 ${index + 1}`,
            category: annotation.category || description.category,
            tags: annotation.tags || description.tags,
            note: annotation.note || description.note,
          }
        }),
      })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}

function discardHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      const body = await readJson(request)
      if (!body || typeof body.stageId !== 'string') {
        sendJson(response, 400, { ok: false, error: '缺少暂存 id' })
        return
      }
      const dir = stageDir(config.libraryPath, body.stageId)
      await fsp.rm(dir, { recursive: true, force: true })
      sendJson(response, 200, { ok: true })
    } catch (error) {
      sendJson(response, 400, { ok: false, error: errorMessage(error) })
    }
  }
}

async function moveFile(from, to) {
  await fsp.mkdir(path.dirname(to), { recursive: true })
  try {
    await fsp.rename(from, to)
  } catch {
    await fsp.copyFile(from, to)
    await fsp.unlink(from).catch(() => undefined)
  }
}

function commitHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      const body = await readJson(request, UPLOAD_BODY)
      if (!body || typeof body.stageId !== 'string' || !Array.isArray(body.pieces)) {
        sendJson(response, 400, { ok: false, error: '请求格式无效' })
        return
      }
      if (body.pieces.length > MAX_OBJECTS) {
        sendJson(response, 400, { ok: false, error: `单张图片一次最多入库 ${MAX_OBJECTS} 个切图` })
        return
      }
      const { dir, meta } = await readStage(config.libraryPath, body.stageId)
      const source = body.source && typeof body.source === 'object' ? body.source : {}
      const now = Date.now()
      const rootId = store.newId('img')
      const extension = meta.extension || store.extForMediaType(meta.mediaType)
      const originalRelative = `originals/${rootId}${extension}`
      await moveFile(path.join(dir, `source${extension}`), store.resolveInside(config.libraryPath, originalRelative))
      let thumbRelative = ''
      try {
        await fsp.access(path.join(dir, 'thumb.jpg'))
        thumbRelative = `thumbs/${rootId}.jpg`
        await moveFile(path.join(dir, 'thumb.jpg'), store.resolveInside(config.libraryPath, thumbRelative))
      } catch {
        thumbRelative = ''
      }
      const sourceItem = {
        id: rootId,
        name: store.sanitizeName(source.name, meta.name || '素材'),
        kind: 'original',
        category: store.normalizeCategory(source.category),
        tags: store.sanitizeTags(source.tags, 8),
        note: store.sanitizeNote(source.note),
        file: originalRelative,
        thumb: thumbRelative,
        w: Math.max(1, Math.round(Number(meta.width) || 0)),
        h: Math.max(1, Math.round(Number(meta.height) || 0)),
        bytes: Number(meta.bytes) || 0,
        mediaType: meta.mediaType,
        bbox: null,
        sourceId: '',
        ai: { title: meta.title || '', committedAt: now },
        originName: meta.name || '',
        hash: typeof meta.hash === 'string' ? meta.hash : '',
        createdAt: now,
        updatedAt: now,
      }
      const pieces = []
      for (let index = 0; index < body.pieces.length; index += 1) {
        const piece = body.pieces[index]
        if (!piece || typeof piece !== 'object') continue
        /* The panel sends the current crop bytes, so a box that was adjusted
           after naming still saves the final pixels instead of a stale file. */
        const bytes = store.decodeBase64(piece.data, MAX_SEGMENT_BYTES)
        const id = store.newId('ast')
        const relative = `assets/${id}.png`
        await fsp.writeFile(store.resolveInside(config.libraryPath, relative), bytes)
        pieces.push({
          id,
          name: store.sanitizeName(piece.name, '切图'),
          kind: 'segment',
          category: store.normalizeCategory(piece.category || sourceItem.category),
          tags: store.sanitizeTags(piece.tags, 6),
          note: store.sanitizeNote(piece.note),
          file: relative,
          thumb: '',
          w: Math.max(1, Math.round(Number(piece.w) || 0)),
          h: Math.max(1, Math.round(Number(piece.h) || 0)),
          bytes: bytes.length,
          mediaType: 'image/png',
          bbox: Array.isArray(piece.bbox) && piece.bbox.length === 4 ? piece.bbox.map(Number) : null,
          sourceId: rootId,
          ai: null,
          originName: '',
          hash: '',
          createdAt: now + index + 1,
          updatedAt: now,
        })
      }
      const created = await store.mutateLibrary(config.libraryPath, (state) => {
        state.items.push(sourceItem)
        for (const item of pieces) state.items.push(item)
        return [sourceItem, ...pieces].map((item) => store.publicItem(item, config.libraryPath))
      })
      await fsp.rm(dir, { recursive: true, force: true })
      sendJson(response, 200, { ok: true, items: created })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

function updateHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const body = await readJson(request)
      if (!body || typeof body.id !== 'string' || !body.patch || typeof body.patch !== 'object') {
        sendJson(response, 400, { ok: false, error: '请求格式无效' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      const patch = body.patch
      const updated = await store.mutateLibrary(config.libraryPath, (state) => {
        const item = state.items.find((entry) => entry.id === body.id)
        if (!item) throw new Error('素材不存在')
        if (patch.name !== undefined) item.name = store.sanitizeName(patch.name, item.name)
        if (patch.category !== undefined) item.category = store.normalizeCategory(patch.category)
        if (patch.tags !== undefined) item.tags = store.sanitizeTags(patch.tags, 8)
        if (patch.note !== undefined) item.note = store.sanitizeNote(patch.note)
        item.updatedAt = Date.now()
        return store.publicItem(item, config.libraryPath)
      })
      sendJson(response, 200, { ok: true, item: updated })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

/** Batch metadata for the library's multi-select toolbar. */
function updateManyHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const body = await readJson(request)
      if (!body || !Array.isArray(body.ids) || body.ids.length === 0 || !body.patch || typeof body.patch !== 'object') {
        sendJson(response, 400, { ok: false, error: '请求格式无效' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      const ids = new Set(body.ids.filter((id) => typeof id === 'string').slice(0, 500))
      const patch = body.patch
      const category = typeof patch.category === 'string' && patch.category.trim() ? store.normalizeCategory(patch.category) : ''
      const addTags = store.sanitizeTags(patch.addTags, 6)
      let updated = 0
      await store.mutateLibrary(config.libraryPath, (state) => {
        for (const item of state.items) {
          if (!ids.has(item.id)) continue
          if (category) item.category = category
          if (addTags.length > 0) {
            const merged = item.tags.slice()
            for (const tag of addTags) if (!merged.includes(tag)) merged.push(tag)
            item.tags = merged.slice(0, 12)
          }
          item.updatedAt = Date.now()
          updated += 1
        }
      })
      sendJson(response, 200, { ok: true, updated })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

/** Rename or delete one category; items never disappear with it. */
function categoryHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const body = await readJson(request)
      if (!body || typeof body.action !== 'string') {
        sendJson(response, 400, { ok: false, error: '请求格式无效' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      if (body.action === 'rename') {
        const from = typeof body.from === 'string' ? body.from : ''
        const to = typeof body.to === 'string' ? body.to : ''
        let updated = 0
        await store.mutateLibrary(config.libraryPath, (state) => {
          updated = store.renameCategoryInState(state, from, to)
        })
        sendJson(response, 200, { ok: true, updated })
        return
      }
      if (body.action === 'create') {
        const path = typeof body.path === 'string' ? body.path : ''
        let created = ''
        await store.mutateLibrary(config.libraryPath, (state) => {
          created = store.createCategoryInState(state, path)
        })
        sendJson(response, 200, { ok: true, path: created })
        return
      }
      if (body.action === 'delete') {
        const target = typeof body.path === 'string' ? body.path : ''
        let moved = 0
        await store.mutateLibrary(config.libraryPath, (state) => {
          moved = store.removeCategoryFromState(state, target)
        })
        sendJson(response, 200, { ok: true, moved })
        return
      }
      sendJson(response, 400, { ok: false, error: '未知分类操作' })
    } catch (error) {
      sendJson(response, 400, { ok: false, error: errorMessage(error) })
    }
  }
}

/** Copy chosen assets into a game project folder (the panel rarely needs it,
 *  but it keeps the route and the agent tool on one implementation). */
function exportHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const body = await readJson(request)
      if (!body || !Array.isArray(body.ids) || typeof body.destination !== 'string') {
        sendJson(response, 400, { ok: false, error: '请求格式无效' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      const ids = new Set(body.ids.filter((id) => typeof id === 'string').slice(0, 200))
      const state = await store.loadLibrary(config.libraryPath)
      const items = state.items
        .filter((item) => ids.has(item.id))
        .map((item) => store.publicItem(item, config.libraryPath))
      if (items.length === 0) {
        sendJson(response, 400, { ok: false, error: '没有匹配的素材' })
        return
      }
      const result = await exportAssets({
        libraryPath: config.libraryPath,
        items,
        destination: body.destination,
      })
      sendJson(response, 200, { ok: true, ...result })
    } catch (error) {
      sendJson(response, 400, { ok: false, error: errorMessage(error) })
    }
  }
}

function deleteHandler(runtime) {
  return async (request, response) => {
    if (rejected(runtime.ctx, request, response)) return
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '只支持 POST' })
        return
      }
      const body = await readJson(request)
      if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
        sendJson(response, 400, { ok: false, error: '缺少要删除的素材 id' })
        return
      }
      const config = await store.readConfig()
      if (!config.libraryPath) {
        sendJson(response, 400, { ok: false, error: '还没有设置素材库路径' })
        return
      }
      const ids = new Set(body.ids.filter((id) => typeof id === 'string').slice(0, 200))
      const removed = await store.mutateLibrary(config.libraryPath, (state) => {
        const keep = []
        const gone = []
        for (const item of state.items) {
          if (ids.has(item.id)) gone.push(item)
          else keep.push(item)
        }
        state.items = keep
        return gone
      })
      for (const item of removed) {
        for (const relative of [item.file, item.thumb]) {
          if (!relative) continue
          const absolute = store.resolveInside(config.libraryPath, relative)
          if (!absolute) continue
          await fsp.unlink(absolute).catch(() => undefined)
        }
      }
      sendJson(response, 200, { ok: true, deleted: removed.length })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

/* ── agent tool ───────────────────────────────────────────────────────── */

function summarizeItem(item, index) {
  const tags = item.tags.length > 0 ? item.tags.map((tag) => `#${tag}`).join(' ') : '无标签'
  const size = item.w && item.h ? `${item.w}x${item.h}` : '尺寸未知'
  const lines = [`${index + 1}. ${item.name} [${item.category}] ${tags} ${size}`]
  if (item.kind === 'segment') lines.push(`   类型：切图${item.sourceId ? `（源 ${item.sourceId}）` : ''}`)
  if (item.note) lines.push(`   说明：${item.note}`)
  lines.push(`   路径：${item.path}`)
  return lines.join('\n')
}

function searchItems(items, args) {
  const limit = Math.min(40, Math.max(1, Number(args.limit) || 12))
  const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : ''
  const category = typeof args.category === 'string' ? args.category.trim() : ''
  const tags = Array.isArray(args.tags) ? args.tags.filter((tag) => typeof tag === 'string') : []
  const kind = args.kind === 'original' || args.kind === 'segment' ? args.kind : ''
  const words = query ? query.split(/\s+/).filter(Boolean) : []
  const scored = []
  for (const item of items) {
    if (kind && item.kind !== kind) continue
    if (category && !(item.category === category || item.category.startsWith(category + '/'))) continue
    if (tags.length > 0 && !tags.every((tag) => item.tags.includes(tag))) continue
    let score = 0
    if (words.length > 0) {
      const haystack = [item.name, item.note, item.category, ...item.tags].join(' ').toLowerCase()
      let hits = 0
      for (const word of words) if (haystack.includes(word)) hits += 1
      if (hits === 0) continue
      score += hits * 10
      if (item.name.toLowerCase().includes(query)) score += 20
    }
    score += item.kind === 'segment' ? 2 : 0
    scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score || b.item.createdAt - a.item.createdAt)
  return { total: scored.length, rows: scored.slice(0, limit).map((entry) => entry.item) }
}

async function runTool(runtime, args) {
  const config = await store.readConfig()
  if (!config.libraryPath) {
    return { text: '素材库还没有设置路径。请让用户在左侧菜单打开「资产库」面板，先选择素材库文件夹。' }
  }
  if (!config.enabled) {
    return { text: '素材库当前处于禁用状态。请在「资产库」面板右上角重新启用后再检索。' }
  }
  const state = await store.loadLibrary(config.libraryPath)
  const items = state.items.map((item) => store.publicItem(item, config.libraryPath))
  const action = typeof args.action === 'string' ? args.action : 'search'
  const head = `素材库：${config.libraryPath}（共 ${items.length} 个素材）`

  if (action === 'stats') {
    const tree = store.buildTree(items, state.categories)
    const lines = [head]
    lines.push(`切图 ${items.filter((item) => item.kind === 'segment').length} 个，原图 ${items.filter((item) => item.kind === 'original').length} 个，一级分类 ${tree.length} 个。`)
    const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6)
    if (recent.length > 0) {
      lines.push('最近入库：')
      for (const item of recent) lines.push(`- ${item.name} [${item.category}] ${item.path}`)
    }
    lines.push('需要预览时对路径调用 read_image。')
    return { text: lines.join('\n') }
  }

  if (action === 'categories') {
    const tree = store.buildTree(items, state.categories)
    if (tree.length === 0) return { text: `${head}\n还没有素材。` }
    const lines = [head, '分类（最多两级）：']
    for (const top of tree) {
      lines.push(`- ${top.name}：${top.count}`)
      for (const child of top.children) lines.push(`  - ${top.name}/${child.name}：${child.count}`)
    }
    lines.push('用法：asset_library {action:"search", category:"人物/女性"}')
    return { text: lines.join('\n') }
  }

  if (action === 'get') {
    const id = typeof args.id === 'string' ? args.id : ''
    const item = items.find((entry) => entry.id === id)
    if (!item) return { text: `没有找到 id 为 ${id || '(空)'} 的素材。可先用 search 检索。` }
    const lines = [head, summarizeItem(item, 0), `id：${item.id}`, `创建：${new Date(item.createdAt).toLocaleString('zh-CN')}`]
    if (item.bbox) lines.push(`原图归一化位置：${item.bbox.map((n) => n.toFixed(3)).join(', ')}`)
    lines.push('需要预览时对路径调用 read_image。')
    return { text: lines.join('\n') }
  }

  if (action === 'recent') {
    const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, Math.min(20, Math.max(1, Number(args.limit) || 10)))
    if (recent.length === 0) return { text: `${head}\n还没有素材。` }
    return { text: [head, '最近入库：', ...recent.map((item, index) => summarizeItem(item, index)), '需要预览时对路径调用 read_image。'].join('\n') }
  }

  if (action === 'export') {
    const destination = typeof args.destination === 'string' ? args.destination.trim() : ''
    if (!destination) {
      return { text: '请在 destination 里给出游戏项目目录的绝对路径，例如 D:\\MyGame\\assets。' }
    }
    const ids = Array.isArray(args.ids) ? args.ids.filter((id) => typeof id === 'string') : []
    const chosen = ids.length > 0 ? items.filter((item) => ids.includes(item.id)) : searchItems(items, args).rows
    if (chosen.length === 0) {
      return { text: '没有匹配的素材可导出。先用 action:"search" 找到素材 id，再用 action:"export" 加 ids 导出。' }
    }
    const result = await exportAssets({ libraryPath: config.libraryPath, items: chosen, destination })
    const lines = [
      `已导出 ${result.exported.length} 个素材到：${result.destination}`,
      `清单文件：${result.manifest}`,
      ...result.exported.slice(0, 20).map((entry) => `- ${entry.file}（${entry.w}x${entry.h}，${entry.category}）`),
      '可以直接在 Godot/Unity/网页项目里引用这些文件；harness-assets.json 记录了名称、分类、标签和尺寸。',
    ]
    return { text: lines.join('\n') }
  }

  const result = searchItems(items, args)
  if (result.total === 0) {
    return {
      text: `${head}\n没有匹配「${typeof args.query === 'string' ? args.query : ''}」的素材。可以换关键词，或先用 action:"categories" 看现有分类。`,
    }
  }
  const lines = [`${head}，命中 ${result.total} 个，显示前 ${result.rows.length} 个：`]
  for (let index = 0; index < result.rows.length; index += 1) {
    lines.push(summarizeItem(result.rows[index], index))
  }
  lines.push('需要看具体画面时，对上面的「路径」调用 read_image；只读真正要用的图。')
  return { text: lines.join('\n') }
}

function registerTool(runtime) {
  const ctx = runtime.ctx
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['tools'], (scope) => {
    scope.effect(() =>
      scope.tools.register({
        name: 'asset_library',
        description:
          '本地美术素材库：用户上传图片后由视觉模型命名、分类并切出的对象图。做页面、插画、演示或游戏（Godot/Unity/网页）需要图片素材时先在这里找。' +
          'action=search 按关键词/分类/标签检索；categories 列出分类树与数量；stats 看概览；recent 看最近入库；get 按 id 看详情；' +
          'export 把选中的素材复制到游戏项目目录并写一份 harness-assets.json 清单（需要 destination 绝对路径，可用 ids 指定，或沿用 query/category/tags 筛选）。' +
          '返回结果包含素材的绝对路径，需要看画面时对路径调用 read_image。',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['search', 'categories', 'stats', 'recent', 'get', 'export'],
              description: 'search（默认）| categories | stats | recent | get | export',
            },
            query: { type: 'string', description: '中文关键词，空格分隔多个词，匹配名称、注释、标签与分类' },
            category: { type: 'string', description: '分类路径，例如「人物」或「人物/女性」' },
            tags: { type: 'array', items: { type: 'string' }, description: '必须同时具备的标签（AND）' },
            kind: { type: 'string', enum: ['original', 'segment'], description: 'original 原图 / segment 切图' },
            id: { type: 'string', description: 'action=get 时的素材 id' },
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'action=export 时要导出的素材 id 列表（省略则按 query/category/tags 筛选）',
            },
            destination: {
              type: 'string',
              description: 'action=export 的目标目录绝对路径，例如 D:\\MyGame\\assets',
            },
            limit: { type: 'integer', description: '返回条数，默认 12，最多 40' },
          },
          required: ['action'],
          additionalProperties: false,
        },
        output: {
          schema: {
            type: 'object',
            properties: { text: { type: 'string' } },
            required: ['text'],
            additionalProperties: false,
          },
          render: (_args, value) => [{ type: 'text', text: String((value && value.text) || '') }],
        },
        async execute(args) {
          const safe = args && typeof args === 'object' ? args : {}
          try {
            return await runTool(runtime, safe)
          } catch (error) {
            return { text: `素材库读取失败：${errorMessage(error)}` }
          }
        },
      }),
    )
  })
}

/* ── system prompt ────────────────────────────────────────────────────── */

function promptText(runtime) {
  try {
    const config = store.readConfigSync()
    if (!config.libraryPath || !config.enabled) return ''
    const state = store.readLibrarySync(config.libraryPath)
    if (!state) return ''
    const count = state.items.length
    if (count === 0) {
      return `本地素材库已启用：${config.libraryPath}（暂无素材）。用户上传图片后会自动分析入库。`
    }
    const tree = store.buildTree(state.items, state.categories)
    const tops = tree
      .slice(0, 8)
      .map((top) => `${top.name} ${top.count}`)
      .join('：')
    return [
      '本地素材库（用户上传并自动切分的图片素材）：',
      `路径：${config.libraryPath}`,
      `共 ${count} 个素材；分类：${tops}`,
      '需要图片素材或参考图时，先调用 asset_library 工具检索（中文关键词、分类或标签），命中后对返回的路径调用 read_image 查看；只读真正要用的图，避免浪费 token。',
    ].join('\n')
  } catch {
    return ''
  }
}

function registerPrompt(runtime) {
  const ctx = runtime.ctx
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['systemPrompt'], (scope) => {
    scope.effect(() =>
      scope.systemPrompt.section({
        name: 'asset-library',
        order: 62,
        text: () => promptText(runtime),
      }),
    )
  })
}

/* ── boot ─────────────────────────────────────────────────────────────── */

function registerRoutes(runtime) {
  const ctx = runtime.ctx
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (scope) => {
    const server = scope.webServer
    if (!server || typeof server.register !== 'function') return
    scope.effect(() => {
      const routes = [
        { path: `${ROUTE}/state`, handler: stateHandler(runtime) },
        { path: `${ROUTE}/config`, handler: configHandler(runtime) },
        { path: `${ROUTE}/stage`, handler: stageHandler(runtime) },
        { path: `${ROUTE}/detect`, handler: detectHandler(runtime) },
        { path: `${ROUTE}/describe`, handler: describeHandler(runtime) },
        { path: `${ROUTE}/commit`, handler: commitHandler(runtime) },
        { path: `${ROUTE}/discard`, handler: discardHandler(runtime) },
        { path: `${ROUTE}/update`, handler: updateHandler(runtime) },
        { path: `${ROUTE}/update-many`, handler: updateManyHandler(runtime) },
        { path: `${ROUTE}/category`, handler: categoryHandler(runtime) },
        { path: `${ROUTE}/export`, handler: exportHandler(runtime) },
        { path: `${ROUTE}/delete`, handler: deleteHandler(runtime) },
        { path: `${ROUTE}/file`, handler: fileHandler(runtime) },
      ]
      const disposers = routes.map((route) =>
        server.register({ kind: 'exact', path: route.path, handler: route.handler }),
      )
      return () => {
        for (const dispose of disposers) {
          if (typeof dispose === 'function') dispose()
        }
      }
    })
  })
}

function writeDiagnostics(runtime) {
  const ctx = runtime.ctx
  if (typeof ctx.effect !== 'function') return
  ctx.effect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const models = await modelList(runtime)
        await fsp.mkdir(store.configDir(), { recursive: true })
        await fsp.writeFile(
          path.join(store.configDir(), 'last-boot.json'),
          JSON.stringify(
            {
              plugin: 'dsh-asset-library',
              version: VERSION,
              at: new Date().toISOString(),
              defaultModel: defaultSelection(ctx),
              imageModels: models.filter((model) => model.image),
              modelCount: models.length,
            },
            null,
            2,
          ),
          'utf8',
        )
      } catch {
        /* diagnostics never affect activation */
      }
    }, 2000)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  })
}

export function apply(ctx) {
  const runtime = { ctx, models: null }
  registerRoutes(runtime)
  registerTool(runtime)
  registerPrompt(runtime)
  writeDiagnostics(runtime)
  void (async () => {
    try {
      const config = await store.readConfig()
      if (config.libraryPath) await pruneStaging(config.libraryPath)
    } catch {
      /* staging cleanup never affects activation */
    }
  })()
}
