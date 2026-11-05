/**
 * Vision-model calls behind the asset library.
 *
 * Two passes, mirroring what the panel shows:
 *   1. detectObjects  — one call on the original image: a short title plus the
 *      boxes worth cutting out. The panel crops those boxes immediately.
 *   2. describePieces — one call on the cropped pieces: per-piece name,
 *      category, tags and note, plus the overall classification.
 *
 * Both call `prepareCall` with the complete control set and then stream the
 * exactly prepared config, so the adapter never sees a changed config.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { normalizeCategory, sanitizeName, sanitizeNote, sanitizeTags, configDir } from './store.js'

export const MAX_OBJECTS = 6

const DETECT_SYSTEM = [
  '你是素材库的图片分析助手。只输出一个 JSON 对象，不要输出解释、Markdown 或代码块围栏。',
  'JSON 结构：{"title":string,"objects":[{"label":string,"bbox":[number,number,number,number]}]}',
  '字段要求：',
  '- title：不超过 12 个汉字，概括整张图，例如「粉色短发少女半身像」。',
  '- objects：画面中值得单独切出的对象，按显著性排序，最多 6 个。',
  '- bbox：归一化坐标 [x, y, w, h]，取值 0–1，紧贴对象边缘；整张图就是一个主体时给它一个整体框；没有可切分对象时给空数组。',
].join('\n')

const DESCRIBE_SYSTEM = [
  '你是素材库的图片分析助手。用户会把同一张图里按顺序切出的片段依次发给你（第 1 张是片段 1，以此类推）。',
  '只输出一个 JSON 对象，不要输出解释、Markdown 或代码块围栏。',
  'JSON 结构：{"title":string,"category":string,"tags":string[],"note":string,"pieces":[{"name":string,"category":string,"tags":string[],"note":string}]}',
  '字段要求：',
  '- title：不超过 12 个汉字，概括整张图的来源，例如「粉色短发少女半身像」。',
  '- category：整张图的一级分类，必要时加一个二级分类，形如「人物/女性」，最多两级；优先复用用户已有分类。',
  '- tags：2–5 个中文短标签，描述颜色、风格、视角或用途。',
  '- note：一句话说明整张图的内容与可能的用途，不超过 40 字。',
  '- pieces：与输入片段一一对应、数量必须相等。每项给出该片段的名字（不超过 12 个汉字，具体可检索）、分类（尽量继承整图分类，可更具体）、2–4 个标签、一句话说明（不超过 30 字）。',
].join('\n')

function detectionPrompt(fileName, categories) {
  const lines = ['请分析这张图片并输出 JSON。']
  if (fileName) lines.push(`原始文件名：${fileName}`)
  if (categories.length > 0) lines.push(`已有分类（仅作参考）：${categories.slice(0, 40).join('、')}`)
  lines.push('只输出 JSON。')
  return lines.join('\n')
}

function describePrompt(count, title, categories) {
  const lines = [`下面依次是 ${count} 个切图片段，请逐个命名并给出分类、标签和说明。`]
  if (title) lines.push(`整张图的参考标题：${title}`)
  if (categories.length > 0) lines.push(`已有分类（优先复用，避免把分类做碎）：${categories.slice(0, 40).join('、')}`)
  lines.push(`必须返回 ${count} 个 pieces，顺序与输入一致。只输出 JSON。`)
  return lines.join('\n')
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function normalizeBox(raw, width, height) {
  if (!Array.isArray(raw) || raw.length !== 4) return null
  const numbers = raw.map(Number)
  if (!numbers.every((value) => Number.isFinite(value))) return null
  let [x, y, w, h] = numbers
  /* The prompt asks for normalized coordinates; models that answer in pixels
     or in a 0–1000 grid still produce usable boxes after rescaling. */
  if (Math.max(x, y, w, h) > 1.001) {
    if (width > 0 && height > 0) {
      x /= width
      y /= height
      w /= width
      h /= height
    } else {
      x /= 1000
      y /= 1000
      w /= 1000
      h /= 1000
    }
  }
  x = clamp01(x)
  y = clamp01(y)
  w = clamp01(w)
  h = clamp01(h)
  if (w <= 0.01 || h <= 0.01) return null
  if (x + w > 1) w = 1 - x
  if (y + h > 1) h = 1 - y
  if (w <= 0.01 || h <= 0.01) return null
  const round = (n) => Math.round(n * 10000) / 10000
  return [round(x), round(y), round(w), round(h)]
}

function extractJson(raw) {
  const text = String(raw || '').trim()
  if (!text) throw new Error('模型没有返回内容')
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型返回的内容不是 JSON')
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch (error) {
    throw new Error(`模型返回的 JSON 无法解析：${String((error && error.message) || error)}`)
  }
}

/** Normalize the detection pass. */
export function parseDetection(raw, dimensions) {
  const width = dimensions && Number(dimensions.width) > 0 ? Number(dimensions.width) : 0
  const height = dimensions && Number(dimensions.height) > 0 ? Number(dimensions.height) : 0
  const parsed = extractJson(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('模型返回的 JSON 不是对象')
  const objects = []
  const seen = new Set()
  if (Array.isArray(parsed.objects)) {
    for (const entry of parsed.objects) {
      if (!entry || typeof entry !== 'object') continue
      const box = normalizeBox(entry.bbox, width, height)
      if (!box) continue
      const key = box.join(',')
      if (seen.has(key)) continue
      seen.add(key)
      objects.push({ label: sanitizeName(entry.label, '对象').slice(0, 16), bbox: box })
      if (objects.length >= MAX_OBJECTS) break
    }
  }
  return {
    title: sanitizeName(parsed.title, '素材').slice(0, 24),
    objects,
  }
}

/** Normalize the piece-description pass; count is authoritative. */
export function parseDescription(raw, count) {
  const parsed = extractJson(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('模型返回的 JSON 不是对象')
  const list = Array.isArray(parsed.pieces) ? parsed.pieces : []
  const pieces = []
  const fallbackCategory = normalizeCategory(parsed.category)
  const fallbackTags = sanitizeTags(parsed.tags, 6)
  const fallbackNote = sanitizeNote(parsed.note)
  for (let index = 0; index < count; index += 1) {
    const entry = list[index] && typeof list[index] === 'object' ? list[index] : {}
    pieces.push({
      name: sanitizeName(entry.name, `切图 ${index + 1}`).slice(0, 24),
      category: entry.category === undefined ? fallbackCategory : normalizeCategory(entry.category),
      tags: Array.isArray(entry.tags) ? sanitizeTags(entry.tags, 5) : fallbackTags,
      note: entry.note === undefined ? fallbackNote : sanitizeNote(entry.note),
    })
  }
  return {
    title: sanitizeName(parsed.title, '').slice(0, 24),
    category: fallbackCategory,
    tags: fallbackTags,
    note: fallbackNote,
    pieces,
  }
}

/** Keep the last raw call around: the panel shows a readable error, this file
 *  holds what the adapter actually sent back so a failure can be diagnosed. */
async function recordLastCall(record) {
  try {
    await fsp.mkdir(configDir(), { recursive: true })
    await fsp.writeFile(path.join(configDir(), 'last-call.json'), JSON.stringify(record, null, 2), 'utf8')
  } catch {
    /* diagnostics never fail the call */
  }
}

/** Sum token usage chunks; adapters may report them once or per step. */
function addUsage(total, usage) {
  if (!usage || typeof usage !== 'object') return total
  const next = total || { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cacheReadTokens: 0 }
  next.inputTokens += Number(usage.inputTokens) || 0
  next.outputTokens += Number(usage.outputTokens) || 0
  next.reasoningTokens += Number(usage.reasoningTokens) || 0
  next.cacheReadTokens += Number(usage.cacheReadTokens) || 0
  return next
}

/**
 * One model call that returns parsed JSON. `controls` are handed to
 * `prepareCall` and then streamed back unchanged, so the adapter always sees
 * the config it prepared.
 */
async function runJsonCall(ctx, { provider, model, system, messages, maxTokens, signal, kind }) {
  const llm = typeof ctx.get === 'function' ? ctx.get('llm') : undefined
  if (!llm) throw new Error('LLM 服务不可用')
  if (!provider || !model) throw new Error('没有可用的视觉模型，请先在仪表盘里选择分析模型')
  const callConfig = { provider, model, temperature: 0.2, maxTokens }
  const prepared = await llm.prepareCall(callConfig, signal)
  const modalities = prepared && prepared.inputModalities
  if (Array.isArray(modalities) && !modalities.includes('image')) {
    throw new Error(`模型 ${provider}/${model} 不支持图片输入，请在仪表盘里换一个视觉模型`)
  }
  const options = Object.assign({}, prepared.config, { system, messages, signal })
  let text = ''
  let reasoning = ''
  let finish
  let blocks = 0
  let usage = null
  for await (const chunk of prepared.stream(options)) {
    if (!chunk || typeof chunk !== 'object') continue
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      text += chunk.text
    } else if (chunk.type === 'reasoning-delta' && typeof chunk.text === 'string') {
      reasoning += chunk.text
    } else if (chunk.type === 'block-end' && chunk.block) {
      blocks += 1
      if (chunk.block.type === 'text' && typeof chunk.block.text === 'string' && !text) text = chunk.block.text
      if (chunk.block.type === 'reasoning' && typeof chunk.block.text === 'string' && !reasoning) reasoning = chunk.block.text
    } else if (chunk.type === 'usage' && chunk.usage) {
      usage = addUsage(usage, chunk.usage)
    } else if (chunk.type === 'finish') {
      finish = chunk.reason
    }
  }
  await recordLastCall({
    at: new Date().toISOString(),
    kind,
    provider,
    model,
    prepared: prepared.config,
    finish: finish ? finish.kind : 'none',
    failure: finish && finish.failure ? finish.failure : null,
    usage,
    textLength: text.length,
    reasoningLength: reasoning.length,
    blocks,
    textPreview: text.slice(0, 600),
    reasoningPreview: reasoning.slice(0, 600),
  })
  if (finish && finish.kind === 'error') {
    const failure = finish.failure || {}
    throw new Error(`视觉模型调用失败：${failure.message || '未知错误'}${failure.status ? `（${failure.status}）` : ''}`)
  }
  if (finish && finish.kind === 'aborted') throw new Error('分析已取消')
  if (!text.trim()) {
    const parts = [`finish=${finish ? finish.kind : 'none'}`]
    if (reasoning.length > 0) parts.push(`只返回了推理内容 ${reasoning.length} 字`)
    if (blocks === 0) parts.push('没有任何内容块')
    throw new Error(`模型没有返回内容（${parts.join('，')}）`)
  }
  return { text, usage }
}

/** Pass 1: title + boxes for one image. */
export async function detectObjects(ctx, request) {
  const { bytes, mediaType, name, fileName, categories, provider, model, signal } = request
  const attachments = typeof ctx.get === 'function' ? ctx.get('attachments') : undefined
  if (!attachments) throw new Error('附件服务不可用，无法读取图片')
  const ref = await attachments.saveImage({ data: bytes, mediaType, name })
  const { text, usage } = await runJsonCall(ctx, {
    provider,
    model,
    kind: 'detect',
    system: DETECT_SYSTEM,
    maxTokens: 2000,
    signal,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: detectionPrompt(fileName, categories) },
          { type: 'image', attachment: ref },
        ],
      },
    ],
  })
  return { ...parseDetection(text, { width: ref.width, height: ref.height }), usage }
}

/** Pass 2: per-piece naming for the crops the panel already cut. */
export async function describePieces(ctx, request) {
  const { pieces, title, categories, provider, model, signal } = request
  const attachments = typeof ctx.get === 'function' ? ctx.get('attachments') : undefined
  if (!attachments) throw new Error('附件服务不可用，无法读取图片')
  if (!Array.isArray(pieces) || pieces.length === 0) throw new Error('没有可分析的切图')
  const refs = []
  for (const piece of pieces.slice(0, MAX_OBJECTS)) {
    refs.push(await attachments.saveImage({ data: piece.bytes, mediaType: piece.mediaType, name: piece.name }))
  }
  const content = [{ type: 'text', text: describePrompt(refs.length, title, categories) }]
  for (const ref of refs) content.push({ type: 'image', attachment: ref })
  const { text, usage } = await runJsonCall(ctx, {
    provider,
    model,
    kind: 'describe',
    system: DESCRIBE_SYSTEM,
    maxTokens: 2600,
    signal,
    messages: [{ role: 'user', content }],
  })
  return { title: title || '', ...parseDescription(text, refs.length), usage }
}
