# 资产库（dsh-asset-library）

一个用于 DeepSeek Harness 的整包插件：左侧菜单多一个「资产库」入口，里面有仪表盘、分类树、导入与素材库面板；上传的图片由视觉模型自动识别对象、命名、分类并切成独立素材，之后 AI 在项目中可以通过工具或 MCP 检索这些资源。

## 功能

- **导入**：拖入、粘贴（Ctrl+V）或选择文件；自动压缩到 2400px 内并生成 480px 缩略图。
- **导入流程（先裁 → 人工确认 → 再命名 → 确认入库）**：
  1. 图片先进入「暂存」，此时**不会**出现在素材库里；
  2. 找出对象框（默认**本地像素识别**，见下），客户端**立即按框裁剪**并在卡片里显示每张切图；
  3. **停下来等你检查**：框多了删掉、框少了补框、重新框选，都确认无误后再点「AI 识别并命名」；
  4. 视觉模型逐张命名、定分类、打标签、写注释；
  5. 你确认（或手动改）后才写进素材库；关掉卡片或删掉暂存不会留下垃圾素材。
- **Python 对象识别（默认，推荐）**：仪表盘「对象识别」默认选 **Python**。插件调用 `lib/segment.py`：装了 OpenCV 时用轮廓（`findContours`）找框，没有 OpenCV 时自动退回逐行网格/连通域；透明背景、纯色背景都能处理，**实测 500 个对象的精灵表 0.4 秒切完**。需要本机有 Python（numpy + Pillow，OpenCV 可选；可用环境变量 `DSH_ASSET_PYTHON` 指定解释器）。**没有 Python 也不用自己装**：仪表盘点「创建 Python 环境」，确认后插件会在 Harness 数据目录里创建独立 venv 并自动下载 numpy/Pillow（可选 OpenCV），带进度显示；也可以直接使用 Harness 自带运行时 Python。都没有时会自动改用浏览器识别。
- **浏览器对象识别（兜底）**：没有 Python 时在浏览器里直接读像素：大图切成互相重叠的小块分别识别，再把跨块的同一个对象拼回一个框。不调用模型、不依赖任何运行时，**单图最多 1000 个切图**；照片类图片可切到「视觉模型找框」。
- **模型只负责命名**：即使视觉模型不可用，切图仍然会被裁好，可以手动改名后入库；命名失败时卡片会保留切图并提示原因。切图很多时**分批命名**：每次 120 个，命名完可以「继续命名下一批」，不满意可以「重新生成这一批」。
- **框选放大与微调**：卡片右侧「放大框选」或双击图片，会打开接近全屏的框选窗口（最高 74vh）；在图上拖矩形新增切图，已有的框可以**拖动移动**、拖右下角**缩放**，松手后自动重新裁剪。
- **分割**：自动裁剪之外，也可以手动拖框；单图最多 1000 个切图（密集表按区块识别后拼接）。
- **导入去重**：按图片字节的 SHA-256 判重，同一张图重复导入会提示「已在素材库中」并跳过，不会产生重复素材。
- **分类树**：一级/二级两层，刻意保持粗粒度；双击分类进入素材库预览；**右键分类可重命名、删除、新建子分类**（删除只移除分类，里面的素材会移到「其他」），分类标题旁的 **+** 新建一级分类。
- **空分类保留**：分类单独存在 `library.json` 的 `categories` 里，删光某个分类下的图片后分类节点仍然保留，不会自己消失。
- **素材库**：搜索、按类型/多标签（可多选）过滤、排序（最新/最早/名称/尺寸）、大图预览、改名/改分类/改标签/改注释、删除、复制路径。
- **批量操作**：素材库工具栏「批量选择」后勾选多张，可全选当前筛选结果、清空、批量改分类、批量加标签、批量复制路径、批量删除（带确认）。
- **Token 用量**：每次「AI 识别并命名」后，卡片上显示这次消耗的 token；仪表盘「AI 用量」累计显示调用次数与输入/输出 token 总数（数据存在 `library.json` 的 `usage` 里，不会丢）。
- **调用统计（百分比仪表盘）**：仪表盘新增「调用统计」：环形百分比显示**调用成功率**和**素材使用率**（被调用过的素材 / 全部素材），另显示总调用次数、今日次数、最近 7 天柱状图和按操作（检索/分类/详情/导出/读图）的细分。原生工具和 MCP 调用都会记录（`%DSH_HOME%\asset-library\usage.log`，JSONL，两个进程各自追加，互不干扰）。
- **启用/禁用**：面板右上角开关。禁用后 AI 看不到系统提示里的素材库段，工具也会明确拒绝。
- **给 AI 用**：
  - 原生工具 `asset_library`（search / categories / stats / recent / get / export），返回素材绝对路径，配合 `read_image` 看图；
  - MCP 服务 `mcp__assetlib__*`（search_assets / list_categories / library_stats / get_asset / read_asset / export_assets），`read_asset` 直接返回图片内容。
- **导出到游戏项目**：`export` 把选中的素材按名称复制到指定目录（如 `D:\MyGame\assets`），并在那里写 `harness-assets.json`（名称、分类、标签、尺寸），Godot / Unity / 网页项目可直接引用；同名文件自动加序号。
- **系统提示**：启用且已配置时，注入一小段素材库说明（路径、数量、分类），让模型知道先检索再读图。

## 在游戏项目里用素材

让 Harness 搭建 Godot、Unity 或网页游戏时，可以直接取用素材库：

```text
asset_library {action:"search", query:"角色 立绘", category:"人物"}
asset_library {action:"get", id:"ast_xxx"}                     // 看尺寸/分类/注释
asset_library {action:"export", ids:["ast_xxx","ast_yyy"], destination:"D:\\MyGame\\assets"}
```

导出后目标目录里会有按名称命名的图片和 `harness-assets.json` 清单；Godot 的 `res://assets`、Unity 的 `Assets/`、网页的静态目录都能直接用。MCP 侧对应 `export_assets`。

## 数据位置

- 配置：`%DSH_HOME%\asset-library\config.json`（路径、启用开关、识别方式、分析模型）
- 素材库：用户选择的目录
  - `library.json` 索引
  - `staging/` 未确认的暂存（提交后移入正式目录）
  - `originals/` 原图
  - `thumbs/` 缩略图
  - `assets/` 切图
- 诊断：`%DSH_HOME%\asset-library\last-boot.json`（启动时探测到的模型）、`last-call.json`（最近一次模型调用：finish 原因、文本/推理长度与预览，用于排查“模型没有返回内容”）

## 安装

- **从链接安装（推荐，不需要安装 git）**：在 Harness 插件管理的「从链接安装 / 添加插件」里粘贴：

  ```text
  https://github.com/longcheng4855-a11y/dsh-asset-library/archive/refs/tags/v0.10.0.tar.gz
  ```

  这是仓库的源码压缩包地址，pnpm 直接 HTTPS 下载解包，不调用 `git`。如果粘贴 `git+https://...` 或仓库地址而机器上没装 git，会报 `git ls-remote failed: 'git' 不是内部或外部命令`。
- **有 git 的机器**也可以用：`git+https://github.com/longcheng4855-a11y/dsh-asset-library.git`（可加 `#v0.6.0` 固定版本）。
- **本地目录安装**：把仓库下载解压到任意目录，在插件管理里选择该目录。
- 安装后左侧菜单出现「资产库」，首次打开先选择素材库文件夹。

## MCP 行

`cordis.patch.yml` 里的 `asset-library-mcp` 行通过 `@deepseek-ai/dsh-mcp-client` 启动本包的 MCP 服务。为了让任何机器都能用（包括没装 git 的机器），它用 `npx` 直接取同版本的源码压缩包：

```yaml
command: npx
args:
  - '-y'
  - 'https://github.com/longcheng4855-a11y/dsh-asset-library/archive/refs/tags/v0.10.0.tar.gz'
  - 'dsh-asset-library-mcp'
```

- **这一行默认是 `disabled: true`**：`npx` 首次拉取压缩包在慢网/断网环境会拖住应用启动，所以默认不启用；需要 MCP 工具时在插件管理里启用 `asset-library-mcp`（或把 `disabled` 改成 `false`）。
- 原生工具 `asset_library` 不依赖 MCP；离线时只有 `mcp__assetlib__*` 不可用。
- 发布新版本时，把这里的版本号改成新 tag 即可。
- 想用本地已安装的副本（启动更快、不联网），在 profile 的 `cordis.patch.yml` 里覆盖同一行：

```yaml
- id: asset-library-mcp
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    transport: stdio
    serverName: assetlib
    command: node
    args: ['<你的插件目录>/mcp-server.js']
```


## 权限与隐私

所有图片、索引和模型调用都在本机完成；只有分析这一步会把图片发给用户配置的模型。

## 开发

```powershell
node test/smoke-host.mjs   # 用假模型跑通 状态→导入→分析→入库→工具→提示词 全链路
```

修改 Host 半侧（`index.js`、`lib/*.js`、`mcp-server.js`）后需要重启 Harness 才会加载新模块；
只改 `client.js` 刷新页面即可。MCP 子进程被结束时会自动重连，重连后即使用新代码。
