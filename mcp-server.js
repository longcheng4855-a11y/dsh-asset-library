#!/usr/bin/env node
/**
 * MCP (stdio) face of the asset library.
 *
 * It reads the same `config.json` and `library.json` the panel writes, so the
 * agent can reach the material through an MCP client as well as through the
 * native `asset_library` tool. Speak newline-delimited JSON-RPC 2.0; every
 * response is a single line on stdout and diagnostics go to stderr only.
 */
import readline from 'node:readline'
import fsp from 'node:fs/promises'
import * as store from './lib/store.js'
import { exportAssets } from './lib/export.js'

const SERVER_INFO = { name: 'asset-library', version: '0.7.0' }
const PROTOCOL_VERSION = '2025-06-18'
const MAX_INLINE_IMAGE_BYTES = 8 * 1024 * 1024

const TOOLS = [
  {
    name: 'search_assets',
    description:
      '检索本地美术素材库（用户上传图片后由视觉模型命名、分类并切出的对象图）。按中文关键词、分类路径或标签过滤，返回素材名称、分类、标签、注释、尺寸和绝对文件路径。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '中文关键词，空格分隔多个词' },
        category: { type: 'string', description: '分类路径，例如「人物」或「人物/女性」' },
        tags: { type: 'array', items: { type: 'string' }, description: '必须同时具备的标签' },
        kind: { type: 'string', enum: ['original', 'segment'], description: 'original 原图 / segment 切图' },
        limit: { type: 'integer', description: '返回条数，默认 12，最多 40' },
      },
    },
  },
  {
    name: 'list_categories',
    description: '列出素材库的两级分类树与每个分类的素材数量。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'library_stats',
    description: '素材库概览：总数、原图与切图数量、一级分类数、最近入库的素材。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_asset',
    description: '按 id 读取一个素材的完整元数据（含注释、尺寸、归一化位置和文件路径）。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '素材 id' } },
      required: ['id'],
    },
  },
  {
    name: 'read_asset',
    description: '读取素材图片本身（返回 image 内容），用于直接查看画面。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '素材 id' } },
      required: ['id'],
    },
  },
  {
    name: 'export_assets',
    description:
      '把素材复制到游戏项目目录（Godot / Unity / 网页），按素材名命名文件，并在目标目录写 harness-assets.json 清单（名称、分类、标签、尺寸）。用 ids 指定素材；省略时按 query/category 筛选。',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: '要导出的素材 id 列表' },
        query: { type: 'string', description: '省略 ids 时按关键词筛选' },
        category: { type: 'string', description: '省略 ids 时按分类筛选' },
        destination: { type: 'string', description: '目标目录的绝对路径，例如 D:\\MyGame\\assets' },
        limit: { type: 'integer', description: '省略 ids 时最多导出多少个，默认 12' },
      },
      required: ['destination'],
    },
  },
]

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n')
}

function replyError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n')
}

function textResult(text) {
  return { content: [{ type: 'text', text }] }
}

async function libraryContext() {
  const config = await store.readConfig()
  if (!config.libraryPath) throw new Error('素材库还没有设置路径：请在 Harness 左侧「资产库」面板里先选择素材库文件夹。')
  if (!config.enabled) throw new Error('素材库当前已禁用：请在「资产库」面板右上角重新启用。')
  const state = await store.loadLibrary(config.libraryPath)
  const items = state.items.map((item) => store.publicItem(item, config.libraryPath))
  return { config, items, categories: state.categories || [] }
}

function describe(item, index) {
  const tags = item.tags.length > 0 ? item.tags.map((tag) => `#${tag}`).join(' ') : '无标签'
  const size = item.w && item.h ? `${item.w}x${item.h}` : '尺寸未知'
  const lines = [`${index + 1}. ${item.name} [${item.category}] ${tags} ${size}`]
  if (item.note) lines.push(`   说明：${item.note}`)
  lines.push(`   路径：${item.path}`)
  lines.push(`   id：${item.id}`)
  return lines.join('\n')
}

function findItem(items, id) {
  const item = items.find((entry) => entry.id === id)
  if (!item) throw new Error(`没有找到 id 为 ${id || '(空)'} 的素材`)
  return item
}

async function callTool(name, args) {
  const input = args && typeof args === 'object' ? args : {}
  if (name === 'list_categories') {
    const { config, items, categories } = await libraryContext()
    const tree = store.buildTree(items, categories)
    if (tree.length === 0) return textResult(`素材库：${config.libraryPath}\n还没有素材。`)
    const lines = [`素材库：${config.libraryPath}（共 ${items.length} 个素材）`, '分类（最多两级）：']
    for (const top of tree) {
      lines.push(`- ${top.name}：${top.count}`)
      for (const child of top.children) lines.push(`  - ${top.name}/${child.name}：${child.count}`)
    }
    return textResult(lines.join('\n'))
  }

  if (name === 'library_stats') {
    const { config, items, categories } = await libraryContext()
    const tree = store.buildTree(items, categories)
    const segments = items.filter((item) => item.kind === 'segment').length
    const lines = [
      `素材库：${config.libraryPath}`,
      `素材 ${items.length} 个（切图 ${segments}，原图 ${items.length - segments}），一级分类 ${tree.length} 个。`,
    ]
    const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6)
    if (recent.length > 0) {
      lines.push('最近入库：')
      for (const item of recent) lines.push(`- ${item.name} [${item.category}] ${item.path}`)
    }
    return textResult(lines.join('\n'))
  }

  if (name === 'get_asset') {
    const { config, items } = await libraryContext()
    const item = findItem(items, String(input.id || ''))
    const lines = [describe(item, 0), `素材库：${config.libraryPath}`]
    if (item.bbox) lines.push(`原图归一化位置：${item.bbox.map((n) => Number(n).toFixed(3)).join(', ')}`)
    return textResult(lines.join('\n'))
  }

  if (name === 'read_asset') {
    const { config, items } = await libraryContext()
    const item = findItem(items, String(input.id || ''))
    const absolute = store.resolveInside(config.libraryPath, item.file)
    if (!absolute) throw new Error('素材路径无效')
    const stat = await fsp.stat(absolute)
    const meta = [describe(item, 0), `媒体类型：${item.mediaType}`].join('\n')
    if (stat.size > MAX_INLINE_IMAGE_BYTES) {
      return textResult(`${meta}\n图片较大（${Math.round(stat.size / 1024 / 1024)} MB），未内联返回；可直接读取该路径。`)
    }
    const bytes = await fsp.readFile(absolute)
    return {
      content: [
        { type: 'text', text: meta },
        { type: 'image', data: bytes.toString('base64'), mimeType: item.mediaType },
      ],
    }
  }

  if (name === 'search_assets') {
    const { config, items } = await libraryContext()
    const limit = Math.min(40, Math.max(1, Number(input.limit) || 12))
    const query = typeof input.query === 'string' ? input.query.trim().toLowerCase() : ''
    const category = typeof input.category === 'string' ? input.category.trim() : ''
    const tags = Array.isArray(input.tags) ? input.tags.filter((tag) => typeof tag === 'string') : []
    const kind = input.kind === 'original' || input.kind === 'segment' ? input.kind : ''
    const words = query ? query.split(/\s+/).filter(Boolean) : []
    const rows = []
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
      rows.push({ item, score })
    }
    rows.sort((a, b) => b.score - a.score || b.item.createdAt - a.item.createdAt)
    if (rows.length === 0) {
      return textResult(`素材库：${config.libraryPath}（共 ${items.length} 个素材）\n没有匹配的素材，可以换关键词或先用 list_categories 看分类。`)
    }
    const lines = [`素材库：${config.libraryPath}（共 ${items.length} 个素材，命中 ${rows.length} 个，显示前 ${Math.min(limit, rows.length)} 个）`]
    rows.slice(0, limit).forEach((row, index) => lines.push(describe(row.item, index)))
    return textResult(lines.join('\n'))
  }

  if (name === 'export_assets') {
    const { config, items } = await libraryContext()
    const destination = String(input.destination || '').trim()
    if (!destination) throw new Error('destination 需要是游戏项目目录的绝对路径')
    const ids = Array.isArray(input.ids) ? input.ids.filter((value) => typeof value === 'string') : []
    const limit = Math.min(40, Math.max(1, Number(input.limit) || 12))
    let chosen
    if (ids.length > 0) {
      chosen = items.filter((item) => ids.includes(item.id))
    } else {
      const query = String(input.query || '').trim().toLowerCase()
      const category = String(input.category || '').trim()
      chosen = items
        .filter((item) => {
          if (category && !(item.category === category || item.category.startsWith(category + '/'))) return false
          if (!query) return true
          return [item.name, item.note, item.category].concat(item.tags).join(' ').toLowerCase().includes(query)
        })
        .slice(0, limit)
    }
    if (chosen.length === 0) throw new Error('没有匹配的素材可导出，先用 search_assets 找到素材 id')
    const result = await exportAssets({ libraryPath: config.libraryPath, items: chosen, destination })
    const lines = [
      `已导出 ${result.exported.length} 个素材到：${result.destination}`,
      `清单：${result.manifest}`,
      ...result.exported.map((entry) => `- ${entry.file}（${entry.w}x${entry.h}，${entry.category}）`),
      '可以直接在 Godot/Unity/网页项目里引用这些文件。',
    ]
    return textResult(lines.join('\n'))
  }

  throw new Error(`未知工具：${name}`)
}

async function handle(message) {
  const { id, method, params } = message
  if (method === 'initialize') {
    const requested = params && typeof params.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL_VERSION
    reply(id, {
      protocolVersion: requested,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions:
        '这是 Harness 的本地美术素材库。先用 list_categories 了解分类，再用 search_assets 检索；read_asset 返回图片内容；做 Godot/Unity/网页游戏时用 export_assets 把素材复制进项目目录。',
    })
    return
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return
  if (method === 'ping') {
    reply(id, {})
    return
  }
  if (method === 'tools/list') {
    reply(id, { tools: TOOLS })
    return
  }
  if (method === 'tools/call') {
    const name = params && typeof params.name === 'string' ? params.name : ''
    const args = params && params.arguments && typeof params.arguments === 'object' ? params.arguments : {}
    try {
      reply(id, await callTool(name, args))
    } catch (error) {
      reply(id, textResult(`素材库读取失败：${String((error && error.message) || error)}`))
    }
    return
  }
  if (method === 'resources/list') {
    reply(id, { resources: [] })
    return
  }
  if (method === 'prompts/list') {
    reply(id, { prompts: [] })
    return
  }
  if (typeof id !== 'undefined') replyError(id, -32601, `不支持的方法：${method}`)
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
input.on('line', (line) => {
  const text = line.trim()
  if (!text) return
  let message
  try {
    message = JSON.parse(text)
  } catch {
    process.stderr.write('[asset-library-mcp] 非法 JSON 行\n')
    return
  }
  if (!message || typeof message !== 'object') return
  Promise.resolve()
    .then(() => handle(message))
    .catch((error) => {
      if (typeof message.id !== 'undefined') replyError(message.id, -32603, String((error && error.message) || error))
    })
})
input.on('close', () => {
  process.exit(0)
})
