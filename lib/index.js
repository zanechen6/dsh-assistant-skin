/**
 * dsh-assistant-skin — host half.
 *
 * 「助理皮肤」的宿主侧，两件事：
 *   ① GET /dsh-assistant-skin/api/config —— 下发助理名字与**形象清单**
 *   ② GET /dsh-assistant-skin/looks/<file> —— 伺服 assets/looks/ 下的形象素材（图/视频）
 *
 * 形象是**按文件名扫描**的，不写死清单：加一个 look-03.jpg 就多一个形象，
 * 不需要改代码。同号的视频优先于静图（视频当循环背景，静图当封面/兜底）。
 *
 * 视频必须支持 Range 请求 —— 播放器要 seek，只回整段 200 会被部分浏览器拒绝播放。
 *
 * 本文件刻意零 @deepseek-ai/* 运行时 import，全部走注入的 ctx（webServer）：
 * 本插件以 file: / link: 安装进 profile，peer 解析路径不受控。这一取舍与同机的
 * dsh-short-video-studio 一致。
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

export const name = 'assistant-skin'

/** 宿主服务依赖：只需要一条 HTTP 路由能力。 */
export const inject = ['webServer']

const HERE = dirname(fileURLToPath(import.meta.url))
/** 形象素材目录（lib/ 的上一级）。 */
const LOOKS_DIR = resolve(HERE, '..', 'assets', 'looks')
const ROUTE_ROOT = '/dsh-assistant-skin'

/**
 * 文件名约定：
 *   look-<id>.<ext>              静图（底图 / 视频缺失时的兜底）
 *   look-<id>.<action>.<ext>     某个动作的循环片段（首末帧一致，可任意串接）
 *   look-<id>.<ext>（ext 为视频） 旧版单片段写法，按动作名 `default` 兼容
 * id 允许字母数字，便于 look-03、look-a 这类扩展。
 */
const LOOK_FILE = /^look-([a-z0-9]{1,8})(?:\.([a-z0-9]{1,16}))?\.([a-z0-9]{2,5})$/i

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const VIDEO_EXT = ['.mp4', '.webm']

const CONTENT_TYPES = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
})

/** 内置默认值：新部署不写任何配置也能直接用。 */
const DEFAULTS = Object.freeze({
  enabled: true,
  assistantName: '小汐',
  assistantTagline: '你的本地 AI 助理',
  theme: 'molan',
  /** 形象名可另给：{ "01": "小汐", "02": "夜澜" }；不给就用「形象 01」。 */
  lookLabels: {},
})

/**
 * 合并配置：内置默认值 < 用户配置文件 < cordis.yml 行配置。
 *
 * 行配置优先，因为它写在 profile 的 patch 层里、是显式声明；用户配置文件
 * (~/.dsh/dsh-assistant-skin.json) 只是免改 profile 的快捷入口。
 * @param rowConfig - cordis.yml 该行 config 段的内容。
 * @returns 冻结后的生效配置。
 */
function resolveConfig(rowConfig) {
  let fileConfig = {}
  const filePath = join(homedir(), '.dsh', 'dsh-assistant-skin.json')
  if (existsSync(filePath)) {
    try {
      fileConfig = JSON.parse(readFileSync(filePath, 'utf8')) ?? {}
    } catch (error) {
      // 配置文件损坏不该让插件起不来：退回默认并在日志里点名原因。
      console.warn(`[dsh-assistant-skin] 配置 ${filePath} 解析失败，已忽略:`, error.message)
    }
  }
  const merged = { ...DEFAULTS, ...fileConfig, ...(rowConfig ?? {}) }
  return Object.freeze({
    enabled: merged.enabled !== false,
    assistantName: String(merged.assistantName || DEFAULTS.assistantName),
    assistantTagline: String(merged.assistantTagline ?? DEFAULTS.assistantTagline),
    theme: String(merged.theme || DEFAULTS.theme),
    lookLabels: typeof merged.lookLabels === 'object' && merged.lookLabels !== null ? merged.lookLabels : {},
  })
}

/** 素材版本号：用 mtime 当 cache-buster，换素材后浏览器立刻拿到新的。 */
function revision(fileName) {
  try {
    return String(Math.round(statSync(join(LOOKS_DIR, fileName)).mtimeMs))
  } catch {
    return '0'
  }
}

/**
 * 扫描形象清单。
 *
 * 同号素材归为一个形象；视频优先于静图。返回按 id 升序，保证界面上形象顺序稳定。
 * @param config - 生效配置（取 lookLabels）。
 * @returns 形象数组，元素形如 { id, label, image, video }；无素材时为空数组。
 */
function scanLooks(config) {
  if (!existsSync(LOOKS_DIR)) return []
  let entries
  try {
    entries = readdirSync(LOOKS_DIR)
  } catch (error) {
    console.warn('[dsh-assistant-skin] 读取形象目录失败:', error.message)
    return []
  }
  const byId = new Map()
  for (const entry of entries) {
    const m = LOOK_FILE.exec(entry)
    if (!m) continue
    const id = m[1]
    const action = m[2]
    const ext = '.' + m[3].toLowerCase()
    const rec = byId.get(id) ?? { id, clips: [] }
    if (VIDEO_EXT.includes(ext)) {
      // 旧写法 look-01.mp4 没有动作段，归到 default，仍然可用。
      rec.clips.push({ action: action === undefined ? 'default' : action.toLowerCase(), file: entry })
    } else if (IMAGE_EXT.includes(ext)) {
      rec.imageFile ??= entry
    } else continue
    byId.set(id, rec)
  }
  // 默认片段优先挑最"安静"的：它是常驻背景，长时间停留时不该有动作反复吸引注意。
  const quietFirst = ['breathe', 'default', 'nod', 'hair', 'wipe']
  return [...byId.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(rec => {
      const clips = rec.clips
        .slice()
        .sort((a, b) => {
          const ia = quietFirst.indexOf(a.action); const ib = quietFirst.indexOf(b.action)
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        })
        .map(c => ({ action: c.action, url: `${ROUTE_ROOT}/looks/${c.file}?v=${revision(c.file)}` }))
      return {
        id: rec.id,
        label: String(config.lookLabels[rec.id] ?? `形象 ${rec.id}`),
        image: rec.imageFile === undefined ? null : `${ROUTE_ROOT}/looks/${rec.imageFile}?v=${revision(rec.imageFile)}`,
        clips,
      }
    })
}

/**
 * 把 URL 里的文件名解析为 looks/ 内的绝对路径。
 *
 * 只认纯文件名（basename），再校验最终路径确实落在 looks/ 内、扩展名在白名单里：
 * 即便请求写成 `../../etc/passwd`，解析结果也只会是 looks/ 里的某个文件名。
 * @param rawName - URL 末段。
 * @returns 存在的绝对路径；非法或不存在时返回 undefined。
 */
function resolveLookPath(rawName) {
  let safeName
  try {
    safeName = basename(decodeURIComponent(rawName))
  } catch {
    // 畸形的百分号编码：按不合法处理，不抛给上层。
    return undefined
  }
  if (!LOOK_FILE.test(safeName)) return undefined
  const candidate = resolve(LOOKS_DIR, safeName)
  if (!candidate.startsWith(LOOKS_DIR + sep)) return undefined
  if (!CONTENT_TYPES[extname(candidate).toLowerCase()]) return undefined
  if (!existsSync(candidate)) return undefined
  return candidate
}

/**
 * 写 JSON 响应。
 * @param res - HTTP 响应。
 * @param status - 状态码。
 * @param body - 可序列化响应体。
 */
function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/**
 * 带 Range 支持地发送素材。
 *
 * 视频元素会发 `Range: bytes=…` 做 seek 与渐进加载；只回整段 200 会让部分浏览器
 * 直接不出画面。这里实现单段 Range，即可覆盖播放器的实际用法。
 * @param req - HTTP 请求。
 * @param res - HTTP 响应。
 * @param path - 素材绝对路径。
 */
function sendAsset(req, res, path) {
  const size = statSync(path).size
  const type = CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
  const range = req.headers?.range
  const m = typeof range === 'string' ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null

  if (m === null || (m[1] === '' && m[2] === '')) {
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' })
    createReadStream(path).on('error', () => res.destroy()).pipe(res)
    return
  }

  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1])
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    res.writeHead(416, { 'content-range': `bytes */${size}` })
    res.end()
    return
  }
  res.writeHead(206, {
    'content-type': type,
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${size}`,
    'accept-ranges': 'bytes',
    'cache-control': 'no-cache',
  })
  createReadStream(path, { start, end }).on('error', () => res.destroy()).pipe(res)
}

/**
 * 插件入口：挂上「配置」与「形象素材」两条只读路由。
 * @param ctx - 宿主插件上下文（需已注入 webServer）。
 * @param rowConfig - cordis.yml 该行的 config 段。
 */
export function apply(ctx, rowConfig) {
  const config = resolveConfig(rowConfig)
  // 只在启动时做一次"有没有素材"的体检并留日志；**清单本身改为每次请求现扫**，
  // 这样新生成的片段刷新页面就会出现，不需要重启 dsh（重启会打断正在跑的会话）。
  const bootLooks = scanLooks(config)
  if (bootLooks.length === 0) {
    // 明确点名而不是静默空清单：界面会没有形象，日志里要先有原因。
    console.warn(`[dsh-assistant-skin] ${LOOKS_DIR} 下没有可用的形象素材（需要 look-<id>.jpg / .mp4），界面将只有配色皮肤`)
  }

  // 升级期的兼容别名：本插件先前的接口是单个 /avatar.jpg。运行中的 dsh 进程内存里
  // 可能还是旧宿主半（只有那条路由），而浏览器刷新后拿到的是新浏览器半（请求 /looks/…），
  // 于是会出现「头像裂图」的空窗。把首个形象的静图也挂在旧路径上即可消除。
  const compatAvatar = () => scanLooks(config).reduce((found, l) => found ?? (l.image === null ? null : resolveLookPath(basename(l.image.split('?')[0]))), null)

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE_ROOT,
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? ROUTE_ROOT, 'http://localhost')
        if (url.pathname === `${ROUTE_ROOT}/api/config`) {
          sendJson(res, 200, {
            enabled: config.enabled,
            assistantName: config.assistantName,
            assistantTagline: config.assistantTagline,
            theme: config.theme,
            looks: scanLooks(config),   // 现扫：新片段刷新即生效
          })
          return
        }
        if (url.pathname === `${ROUTE_ROOT}/avatar.jpg`) {
          const alias = compatAvatar()
          if (alias === null || alias === undefined) { sendJson(res, 404, { ok: false, message: 'not found' }); return }
          sendAsset(req, res, alias)
          return
        }
        if (url.pathname.startsWith(`${ROUTE_ROOT}/looks/`)) {
          const path = resolveLookPath(url.pathname.slice(`${ROUTE_ROOT}/looks/`.length))
          if (path === undefined) { sendJson(res, 404, { ok: false, message: 'not found' }); return }
          sendAsset(req, res, path)
          return
        }
        sendJson(res, 404, { ok: false, message: 'not found' })
      } catch (error) {
        if (res.headersSent) { res.destroy(error instanceof Error ? error : undefined); return }
        sendJson(res, 500, { ok: false, message: error?.message ?? 'request failed' })
      }
    },
  }), 'dsh-assistant-skin: routes')

  const clipCount = bootLooks.reduce((n, l) => n + l.clips.length, 0)
  console.log(`[dsh-assistant-skin] 助理皮肤已挂载：${config.assistantName}，主题 ${config.theme}，形象 ${bootLooks.length} 个 / 片段 ${clipCount} 条（清单每次请求现扫，新片段刷新即生效）`)
  for (const l of bootLooks) console.log(`  · 形象 ${l.id}（${l.clips.length} 条）：${l.clips.map(c => c.action).join(', ') || '仅静图'}`)
}

// 暴露内部供冒烟测试断言（宿主运行时不消费）。
export const _internals = { resolveConfig, resolveLookPath, scanLooks, DEFAULTS, LOOKS_DIR, ROUTE_ROOT, CONTENT_TYPES }
