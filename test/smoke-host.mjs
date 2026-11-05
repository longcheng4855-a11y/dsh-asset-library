import path from 'node:path'
import os from 'node:os'
import fsp from 'node:fs/promises'
import { apply } from 'file:///C:/Users/uersA/Desktop/plug-ins/zichanguanli/index.js'

process.env.DSH_HOME = path.join(os.tmpdir(), 'al-host-test-home')
const libraryPath = path.join(os.tmpdir(), 'al-host-test-lib')
await fsp.rm(libraryPath, { recursive: true, force: true })
await fsp.rm(process.env.DSH_HOME, { recursive: true, force: true })

const routes = new Map()
const tools = []
const sections = []
let lastCall = null
let dispatched = null

const attachments = {
  async saveImage(input) {
    return { attachmentId: 'att_' + Math.random().toString(16).slice(2), mediaType: input.mediaType, bytes: input.data.length, width: 2, height: 2, name: input.name }
  },
}
const llm = {
  listProviders: () => [{ id: 'fake', name: 'Fake' }],
  listModels: async () => [
    { provider: 'fake', id: 'text-only', name: 'Text only', inputModalities: ['text'] },
    { provider: 'fake', id: 'vision-1', name: 'Vision One', inputModalities: ['text', 'image'] },
  ],
  async prepareCall(config) {
    lastCall = { ...config }
    return {
      config: { ...config },
      inputModalities: ['text', 'image'],
      stream(options) {
        dispatched = { provider: options.provider, model: options.model, temperature: options.temperature, maxTokens: options.maxTokens }
        const describe = String(options.system || '').includes('按顺序切出的片段')
        const payload = describe
          ? {
              title: '红色小方块',
              category: '图标界面/测试',
              tags: ['红色', '方块'],
              note: '一像素测试图，用于验证命名链路',
              pieces: [{ name: '红色方格', category: '图标界面/方块', tags: ['红色'], note: '切图的说明' }],
            }
          : {
              title: '红色小方块',
              objects: [{ label: '方块主体', bbox: [0.1, 0.1, 0.8, 0.8] }],
            }
        const text = '```json\n' + JSON.stringify(payload) + '\n```'
        return (async function* () {
          yield { type: 'text-delta', index: 0, text }
          yield { type: 'usage', usage: { inputTokens: 120, outputTokens: 30, reasoningTokens: 40 } }
          yield { type: 'finish', reason: { kind: 'stop' } }
        })()
      },
    }
  },
}
const services = { llm, attachments }
const ctx = {
  effect(fn) {
    const disposer = fn()
    return () => {
      if (typeof disposer === 'function') disposer()
    }
  },
  inject(_deps, callback) {
    callback(scope)
  },
  get(name) {
    return services[name]
  },
  logger: console,
}
const scope = {
  effect: ctx.effect,
  get: ctx.get,
  webServer: {
    register(route) {
      routes.set(route.path, route.handler)
      return () => routes.delete(route.path)
    },
  },
  tools: {
    register(definition) {
      tools.push(definition)
      return () => undefined
    },
  },
  systemPrompt: {
    section(section) {
      sections.push(section)
      return () => undefined
    },
  },
}

apply(ctx)

function makeReq(method, url, body) {
  const listeners = {}
  let scheduled = false
  const req = {
    method,
    url,
    on(event, callback) {
      listeners[event] = callback
      if (event === 'end' && !scheduled) {
        scheduled = true
        setImmediate(() => {
          if (body !== undefined && listeners.data) {
            const buffer = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body), 'utf8')
            listeners.data(buffer)
          }
          if (listeners.end) listeners.end()
        })
      }
      return req
    },
    destroy() {},
  }
  return req
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    writeHead(code, headers) {
      this.statusCode = code
      Object.assign(this.headers, headers || {})
    },
    end(buffer) {
      this.body = buffer ? Buffer.from(buffer) : Buffer.alloc(0)
    },
  }
}

async function call(routePath, method, payload) {
  const handler = routes.get(routePath)
  if (!handler) throw new Error('route missing: ' + routePath)
  const res = makeRes()
  await handler(makeReq(method, routePath, payload), res)
  let json = null
  try {
    json = JSON.parse(res.body.toString('utf8'))
  } catch {
    json = null
  }
  return { status: res.statusCode, json }
}

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const results = []
const check = (label, value) => results.push([label, value])

check('routes registered', routes.size === 13 ? 'yes (' + routes.size + ')' : 'NO ' + routes.size)
check('tools registered', tools.length === 1 ? tools[0].name : 'NO')
check('prompt sections', sections.length === 1 ? sections[0].name + '@' + sections[0].order : 'NO')

const state = await call('/asset-library/state', 'GET')
check('initial configured', String(state.json.configured) + ' defaultPath=' + Boolean(state.json.defaultPath))
check('models', (state.json.models || []).map((m) => m.model + (m.image ? '*' : '')).join(','))

const config = await call('/asset-library/config', 'POST', { libraryPath })
check('config status', config.status + ' configured=' + config.json.configured)

const staged = await call('/asset-library/stage', 'POST', {
  name: 'demo',
  mediaType: 'image/png',
  data: png.toString('base64'),
  thumb: png.toString('base64'),
  width: 2,
  height: 2,
  hash: 'testhash1',
})
const stageId = staged.json.stageId
check('stage status', staged.status + ' id=' + (stageId || JSON.stringify(staged.json)))
check('stage not in library', (await call('/asset-library/state', 'GET')).json.items.length + ' items')

const detected = await call('/asset-library/detect', 'POST', { stageId })
check('detect status', detected.status + ' title=' + (detected.json.title || detected.json.error))
check('detect objects', JSON.stringify(detected.json.objects || []))
check('prepare/stream match', JSON.stringify(lastCall) + ' => ' + JSON.stringify(dispatched))

const described = await call('/asset-library/describe', 'POST', {
  stageId,
  pieces: [{ data: png.toString('base64'), mediaType: 'image/png', w: 2, h: 2, bbox: [0.1, 0.1, 0.8, 0.8] }],
})
check('describe status', described.status + ' category=' + (described.json.category || described.json.error))
check('piece name', described.json.pieces ? described.json.pieces[0].name + ' / ' + described.json.pieces[0].category : 'NO')
check('piece url', described.json.pieces ? described.json.pieces[0].url : '-')

const committed = await call('/asset-library/commit', 'POST', {
  stageId,
  source: { name: '红块原图', category: '图标界面/测试', tags: ['原图'], note: '源图' },
  pieces: [
    {
      pieceId: described.json.pieces[0].pieceId,
      name: described.json.pieces[0].name,
      category: described.json.pieces[0].category,
      tags: described.json.pieces[0].tags,
      note: described.json.pieces[0].note,
      bbox: [0.1, 0.1, 0.8, 0.8],
      w: 2,
      h: 2,
      data: png.toString('base64'),
    },
  ],
})
check('commit status', committed.status + ' created=' + (committed.json.items ? committed.json.items.length : JSON.stringify(committed.json)))
check('staging cleaned', String(await fsp.access(path.join(libraryPath, 'staging', stageId)).then(() => false, () => true)))

const duplicate = await call('/asset-library/stage', 'POST', {
  name: 'demo again',
  mediaType: 'image/png',
  data: png.toString('base64'),
  width: 2,
  height: 2,
  hash: 'testhash1',
})
check('duplicate detected', String(duplicate.json.duplicate) + ' ' + (duplicate.json.item ? duplicate.json.item.name : '-'))

const createdCat = await call('/asset-library/category', 'POST', { action: 'create', path: '新分类/子类' })
const afterCreate = await call('/asset-library/state', 'GET')
check('category create', createdCat.status + ' path=' + createdCat.json.path + ' cats=' + afterCreate.json.categories.join(','))

const exportDir = path.join(os.tmpdir(), 'al-export-test')
await fsp.rm(exportDir, { recursive: true, force: true })
const exportIds = afterCreate.json.items.map((item) => item.id)
const exported = await call('/asset-library/export', 'POST', { ids: exportIds, destination: exportDir })
check('export files', exported.status + ' exported=' + (exported.json.exported ? exported.json.exported.length : JSON.stringify(exported.json)))
const manifest = JSON.parse(await fsp.readFile(path.join(exportDir, 'harness-assets.json'), 'utf8'))
check('export manifest', manifest.assets.length + ' assets, first=' + (manifest.assets[0] ? manifest.assets[0].file : '-'))

const after = await call('/asset-library/state', 'GET')
check('state items', String(after.json.items.length) + ' tree=' + JSON.stringify(after.json.tree))
check('source item', after.json.items[0].name + ' / ' + after.json.items[0].tags.join('+'))
check('segment item', after.json.items[1].name + ' / ' + after.json.items[1].category + ' / linked=' + (after.json.items[1].sourceId === after.json.items[0].id))
check('describe usage', JSON.stringify(described.json.usage))
check('usage total', JSON.stringify(after.json.usage))

const renamed = await call('/asset-library/category', 'POST', { action: 'rename', from: '图标界面', to: '界面' })
const afterRename = await call('/asset-library/state', 'GET')
check('category rename', renamed.status + ' updated=' + renamed.json.updated + ' cats=' + afterRename.json.categories.join(',') + ' items=' + afterRename.json.items.map((item) => item.category).join('|'))
const removedCat = await call('/asset-library/category', 'POST', { action: 'delete', path: '界面/测试' })
const afterCatDelete = await call('/asset-library/state', 'GET')
check('category delete', removedCat.status + ' moved=' + removedCat.json.moved + ' cats=' + afterCatDelete.json.categories.join(',') + ' items=' + afterCatDelete.json.items.map((item) => item.category).join('|'))

const batchIds = after.json.items.map((item) => item.id)
const batchCat = await call('/asset-library/update-many', 'POST', {
  ids: batchIds,
  patch: { category: '批量/测试' },
})
const afterBatch = await call('/asset-library/state', 'GET')
check('batch category', batchCat.status + ' updated=' + batchCat.json.updated + ' cats=' + afterBatch.json.items.map((item) => item.category).join('|'))
const batchTags = await call('/asset-library/update-many', 'POST', {
  ids: [batchIds[0]],
  patch: { addTags: ['批量标签', '第二'] },
})
const afterTags = await call('/asset-library/state', 'GET')
check('batch tags', batchTags.status + ' tags=' + afterTags.json.items[0].tags.join('+'))
const batchDelete = await call('/asset-library/delete', 'POST', { ids: batchIds })
const afterDelete = await call('/asset-library/state', 'GET')
check('batch delete', batchDelete.status + ' deleted=' + batchDelete.json.deleted + ' left=' + afterDelete.json.items.length)
check('empty categories kept', JSON.stringify(afterDelete.json.categories))

const tool = tools[0]
const toolOut = await tool.execute({ action: 'search', query: '红色' }, {})
check('tool search', toolOut.text.split('\n').slice(0, 2).join(' | '))
const toolCats = await tool.execute({ action: 'categories' }, {})
check('tool categories', toolCats.text.split('\n').slice(0, 3).join(' | '))

const prompt = sections[0].text()
check('prompt text', prompt.split('\n')[0] + ' ... (' + prompt.length + ' chars)')

await call('/asset-library/config', 'POST', { enabled: false })
check('prompt when disabled', sections[0].text() === '' ? 'empty (correct)' : 'NOT EMPTY')
const offTool = await tool.execute({ action: 'stats' }, {})
check('tool when disabled', offTool.text.slice(0, 22))

const bad = await call('/asset-library/config', 'POST', { libraryPath: 'relative/path' })
check('relative path rejected', bad.status + ' ' + (bad.json.error || ''))
const unknown = await call('/asset-library/detect', 'POST', { stageId: 'stg_nope' })
check('unknown stage', unknown.status + ' ' + (unknown.json.error || ''))
check('file route exists', String(typeof routes.get('/asset-library/file')))

for (const [label, value] of results) console.log(label.padEnd(24), value)
process.exit(0)
