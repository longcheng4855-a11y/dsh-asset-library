/**
 * Client half of the 资产库 bundle.
 *
 * Registers one sidebar icon and the matching `main` panel. The whole feature —
 * dashboard, category tree, upload/segment flow, library grid, and the
 * enable/disable switch — is one React tree, so the user opens a single place.
 */
window.__ModuleLoader__.load({
  id: 'dsh-asset-library',
  factory(require) {
    var React = require('react')
    var h = React.createElement

    var API = '/asset-library'
    var MAX_PIECES = 1000
    var NAMING_CAP = 120

    /* ── visible text ─────────────────────────────────────────────────── */

    var MESSAGES = {
      zh: {
        tab: '资产库',
        title: '资产库',
        subtitle: '图片自动分析 · 对象分割入库 · 分类检索',
        enabled: '已启用',
        disabled: '已禁用',
        enableHint: '启用后 AI 可检索并读取素材',
        dashboard: '仪表盘',
        library: '素材库',
        import: '导入',
        refresh: '刷新',
        chooseFolder: '选择文件夹',
        changePath: '更改路径',
        copyPath: '复制路径',
        copied: '路径已复制',
        setupTitle: '首次使用：选择素材库文件夹',
        setupBody:
          '之后上传的图片、切出的对象图和索引都会放在这里。建议选一个空文件夹或专门的素材文件夹，路径可以随时更换。',
        setupPathLabel: '素材库路径',
        setupPathPlaceholder: '例如 D:\\素材库 或 C:\\Users\\你\\Pictures\\素材',
        setupUseDefault: '使用默认位置',
        setupConfirm: '创建并开始',
        setupWorking: '正在创建…',
        total: '素材总数',
        segments: '切图',
        originals: '原图',
        categories: '一级分类',
        week: '最近 7 天',
        recentTitle: '最近入库',
        recentEmpty: '还没有素材，先去「导入」上传几张图片。',
        distTitle: '分类分布',
        libraryInfo: '素材库信息',
        detectorLabel: '对象识别',
        detectorPython: 'Python 识别（OpenCV，推荐；几百个对象也能切）',
        detectorLocal: '浏览器识别（无依赖，慢一些）',
        detectorModel: '视觉模型找框',
        detectorHint: '本地识别直接分析像素：剥离背景色、合并碎块后自动框出主体，不依赖模型；模型只负责命名和注释。',
        detectorSaved: '识别方式已更新',
        modelFallback: 'AI 找框失败，已改用本地识别：',
        pythonFallback: 'Python 识别失败，已改用浏览器识别：',
        localFailed: '本地识别失败：',
        nameFailedHint: '（切图已保留，可手动改名后入库）',
        modelLabel: '分析模型',
        modelHint: '选择支持图片输入的模型；列表中带「视觉」标记的模型可以看图。',
        modelNone: '没有可用的视觉模型',
        modelSave: '保存模型',
        modelSaved: '分析模型已更新',
        noModelWarn: '没有检测到支持图片输入的模型，自动分析会失败。请先在设置里配置带视觉能力的模型，或手动框选分割。',
        allAssets: '全部素材',
        searchPlaceholder: '搜索名称、标签、注释…',
        kindAll: '全部',
        kindSegment: '切图',
        kindOriginal: '原图',
        tagFilter: '标签',
        sortLabel: '排序',
        sortNewest: '最新',
        sortOldest: '最早',
        sortName: '名称',
        sortLarge: '尺寸',
        emptyLibrary: '这个分类还没有素材',
        emptyHint: '去「导入」上传图片，AI 会自动分析并切分对象。',
        loadMore: '显示更多',
        importTitle: '导入图片',
        importHint: '把图片拖到下面，或直接粘贴（Ctrl+V）。上传后会先自动框选并裁出切图，你确认框没问题再让 AI 命名。',
        dropHere: '拖入图片，或点击选择文件',
        chooseFiles: '选择图片',
        autoAnalyze: '自动框选',
        queueEmpty: '还没有待处理的图片',
        preparing: '读取中…',
        uploading: '上传中…',
        detecting: 'AI 识别对象…',
        detectingHint: '正在找出画面中可切分的对象',
        describing: 'AI 命名切图…',
        describingHint: '正在给每张切图命名、分类和写注释',
        pasted: '已粘贴图片',
        piecesTitle: '切图',
        confirmImport: '确认入库',
        tooMany: '一张图最多 {n} 个切图',
        review: '待确认框选',
        reviewHint: '先确认框选是否准确，再让 AI 命名',
        named: '已命名，待入库',
        aiName: 'AI 识别并命名',
        renameAi: '重新命名',
        zoom: '放大框选',
        zoomTitle: '放大框选对象',
        zoomHint: '在图上拖出矩形即可新增一个切图；Esc 关闭',
        close: '关闭',
        selectMode: '批量选择',
        selectModeOn: '退出批量',
        selectedCount: '已选',
        selectAllCurrent: '全选当前',
        clearSelection: '清空',
        batchCategory: '改分类',
        batchTags: '加标签',
        batchDelete: '删除选中',
        batchApply: '应用',
        batchDeleteConfirm: '确认删除选中的素材？',
        batchUpdated: '已更新',
        batchDeleted: '已删除',
        batchNeedPick: '请先勾选素材',
        renameCategory: '重命名分类',
        deleteCategory: '删除分类',
        newCategory: '新建一级分类',
        newSubcategory: '新建子分类',
        createTitle: '新建分类',
        categoryCreated: '分类已创建',
        categoryMenuHint: '右键可重命名或删除分类',
        renameTitle: '重命名分类',
        deleteTitle: '删除分类',
        deleteCategoryBody: '分类里的 {n} 个素材会移到「其他」，素材本身不会删除。',
        categoryRenamed: '分类已重命名',
        categoryDeleted: '分类已删除',
        aiUsage: 'AI 用量',
        usageBadge: 'tokens',
        usageHint: '本次 AI 识别消耗的输入/输出 token',
        usageEmpty: '还没有调用过模型',
        namingCapHint: '切图较多（{n} 个）：AI 命名每次处理前 {cap} 个，其余保留编号，可手动改名',
        duplicate: '已在素材库中',
        duplicateHint: '这张图片已经导入过，未重复入库：',
        ready: '待确认',
        committing: '入库中…',
        done: '已入库',
        failed: '失败',
        retry: '重试',
        reanalyze: '重新框选',
        analyze: '分析',
        toLibrary: '去素材库',
        remove: '移除',
        draw: '框选对象',
        drawOn: '框选中：在图上拖出矩形',
        drawOff: '退出框选',
        selectAll: '全选',
        selectNone: '全不选',
        objects: '对象',
        noObjects: '没有识别到可切分的对象；可以手动框选，或直接整图入库。',
        objectLabel: '对象名',
        manualObject: '手动框选',
        nameLabel: '素材名',
        categoryLabel: '分类',
        categoryHint: '一级/二级，最多两级',
        tagsLabel: '标签',
        tagsHint: '空格分隔',
        noteLabel: '注释',
        commitCount: '入库',
        commitWhole: '整图入库',
        skip: '跳过',
        savedSegments: '已入库',
        savedWhole: '原图已保留',
        inLibrary: '已完成的图片会留在素材库里',
        detailTitle: '素材详情',
        save: '保存',
        saved: '已保存',
        delete: '删除',
        deleteConfirm: '确认删除？',
        cancel: '取消',
        confirm: '确认',
        close: '关闭',
        path: '路径',
        size: '尺寸',
        created: '入库时间',
        source: '来源',
        kind: '类型',
        errorTitle: '出错了',
        clearDone: '清空已完成',
        importNeedSetup: '请先设置素材库路径',
        browseUnavailable: '目录选择器不可用，请手动填写路径',
        pathRequired: '请填写素材库路径',
        pathSaved: '素材库路径已更新',
        loadFailed: '读取素材库失败',
      },
      en: {
        tab: 'Assets',
        title: 'Asset Library',
        subtitle: 'auto analysis · object cut-out · category browsing',
        enabled: 'Enabled',
        disabled: 'Disabled',
        enableHint: 'When enabled, the agent can search and read assets',
        dashboard: 'Dashboard',
        library: 'Library',
        import: 'Import',
        refresh: 'Refresh',
        chooseFolder: 'Choose folder',
        changePath: 'Change path',
        copyPath: 'Copy path',
        copied: 'Path copied',
        setupTitle: 'First run: choose a library folder',
        setupBody:
          'Uploaded images, cut-out objects, and the index live here. Pick an empty or dedicated folder; you can change it later.',
        setupPathLabel: 'Library path',
        setupPathPlaceholder: 'e.g. D:\\Assets',
        setupUseDefault: 'Use default location',
        setupConfirm: 'Create and start',
        setupWorking: 'Creating…',
        total: 'Assets',
        segments: 'Cut-outs',
        originals: 'Sources',
        categories: 'Categories',
        week: 'Last 7 days',
        recentTitle: 'Recently added',
        recentEmpty: 'No assets yet — import a few images first.',
        distTitle: 'Distribution',
        libraryInfo: 'Library info',
        detectorLabel: 'Object detection',
        detectorPython: 'Python (OpenCV; handles hundreds of objects)',
        detectorLocal: 'Browser (no dependency, slower)',
        detectorModel: 'Vision model boxes',
        detectorHint: 'Local detection reads pixels directly: removes the border colour, merges fragments and frames each subject. No model needed; the model only names and annotates.',
        detectorSaved: 'Detection mode updated',
        modelFallback: 'Vision detection failed, fell back to local:',
        pythonFallback: 'Python detection failed, fell back to the browser:',
        localFailed: 'Local detection failed:',
        nameFailedHint: ' (pieces are kept; rename them and save)',
        modelLabel: 'Vision model',
        modelHint: 'Pick a model that accepts image input (marked "vision").',
        modelNone: 'No vision model available',
        modelSave: 'Save model',
        modelSaved: 'Vision model updated',
        noModelWarn: 'No image-capable model was detected. Automatic analysis will fail; configure a vision model or cut objects manually.',
        allAssets: 'All assets',
        searchPlaceholder: 'Search name, tag, note…',
        kindAll: 'All',
        kindSegment: 'Cut-outs',
        kindOriginal: 'Sources',
        tagFilter: 'Tags',
        sortLabel: 'Sort',
        sortNewest: 'Newest',
        sortOldest: 'Oldest',
        sortName: 'Name',
        sortLarge: 'Size',
        emptyLibrary: 'Nothing in this category yet',
        emptyHint: 'Import images and the model will split the objects for you.',
        loadMore: 'Show more',
        importTitle: 'Import images',
        importHint: 'Drop images below or paste with Ctrl+V. Upload crops the boxes first; let the AI name them once you agree with the boxes.',
        dropHere: 'Drop images here, or click to choose files',
        chooseFiles: 'Choose images',
        autoAnalyze: 'Auto crop',
        queueEmpty: 'No images waiting',
        preparing: 'Reading…',
        uploading: 'Uploading…',
        detecting: 'Finding objects…',
        detectingHint: 'Looking for the objects worth cutting out',
        describing: 'Naming pieces…',
        describingHint: 'Naming, classifying and annotating every piece',
        pasted: 'Image pasted',
        piecesTitle: 'Pieces',
        confirmImport: 'Save',
        tooMany: 'At most {n} pieces per image',
        review: 'Check the boxes',
        reviewHint: 'Confirm the boxes, then let the AI name them',
        named: 'Named, ready to save',
        aiName: 'Name with AI',
        renameAi: 'Name again',
        zoom: 'Enlarge',
        zoomTitle: 'Draw boxes on the full-size image',
        zoomHint: 'Drag on the image to add a piece; Esc closes',
        close: 'Close',
        selectMode: 'Select',
        selectModeOn: 'Done selecting',
        selectedCount: 'selected',
        selectAllCurrent: 'Select all shown',
        clearSelection: 'Clear',
        batchCategory: 'Set category',
        batchTags: 'Add tags',
        batchDelete: 'Delete selected',
        batchApply: 'Apply',
        batchDeleteConfirm: 'Delete the selected assets?',
        batchUpdated: 'Updated',
        batchDeleted: 'Deleted',
        batchNeedPick: 'Select some assets first',
        renameCategory: 'Rename category',
        deleteCategory: 'Delete category',
        newCategory: 'New top-level category',
        newSubcategory: 'New subcategory',
        createTitle: 'New category',
        categoryCreated: 'Category created',
        categoryMenuHint: 'Right-click to rename or delete this category',
        renameTitle: 'Rename category',
        deleteTitle: 'Delete category',
        deleteCategoryBody: 'The {n} assets in this category move to 其他; the assets themselves are kept.',
        categoryRenamed: 'Category renamed',
        categoryDeleted: 'Category deleted',
        aiUsage: 'AI usage',
        usageBadge: 'tokens',
        usageHint: 'Input/output tokens spent by this AI pass',
        usageEmpty: 'No model calls yet',
        namingCapHint: 'Many pieces ({n}): AI naming handles the first {cap} per run; the rest keep their numbers',
        duplicate: 'Already in the library',
        duplicateHint: 'This image was imported before, so it was skipped:',
        ready: 'Review',
        committing: 'Saving…',
        done: 'Saved',
        failed: 'Failed',
        retry: 'Retry',
        reanalyze: 'Detect again',
        analyze: 'Analyze',
        toLibrary: 'Open library',
        remove: 'Remove',
        draw: 'Draw box',
        drawOn: 'Drag a rectangle on the image',
        drawOff: 'Stop drawing',
        selectAll: 'All',
        selectNone: 'None',
        objects: 'Objects',
        noObjects: 'No separable objects found. Draw a box manually or keep the whole image.',
        objectLabel: 'Object name',
        manualObject: 'Manual box',
        nameLabel: 'Name',
        categoryLabel: 'Category',
        categoryHint: 'top/sub, at most two levels',
        tagsLabel: 'Tags',
        tagsHint: 'space separated',
        noteLabel: 'Note',
        commitCount: 'Save',
        commitWhole: 'Keep whole image',
        skip: 'Skip',
        savedSegments: 'Saved',
        savedWhole: 'Source kept',
        inLibrary: 'Finished images stay in the library',
        detailTitle: 'Asset detail',
        save: 'Save',
        saved: 'Saved',
        delete: 'Delete',
        deleteConfirm: 'Delete this asset?',
        cancel: 'Cancel',
        confirm: 'Confirm',
        close: 'Close',
        path: 'Path',
        size: 'Size',
        created: 'Created',
        source: 'Source',
        kind: 'Kind',
        errorTitle: 'Something went wrong',
        clearDone: 'Clear finished',
        importNeedSetup: 'Set the library path first',
        browseUnavailable: 'Directory picker unavailable; type the path manually',
        pathRequired: 'Enter a library path',
        pathSaved: 'Library path updated',
        loadFailed: 'Could not read the library',
      },
    }

    /* ── styles ───────────────────────────────────────────────────────── */

    var CSS = [
      '.al-root{height:100%;display:flex;flex-direction:column;box-sizing:border-box;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5;overflow:hidden}',
      '.al-head{flex:none;display:flex;flex-direction:column;gap:9px;padding:14px 22px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.al-headRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}',
      '.al-title{font-size:16px;font-weight:600;letter-spacing:.01em}',
      '.al-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.al-spacer{flex:1;min-width:8px}',
      '.al-chip{display:inline-flex;align-items:center;gap:6px;max-width:340px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:2px 10px;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.al-chipPath{font-family:ui-monospace,Consolas,monospace;overflow:hidden;text-overflow:ellipsis}',
      '.al-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}',
      '.al-dotOn{background:var(--dsw-alias-state-success-primary)}',
      '.al-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:4px 11px;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}',
      '.al-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#3964fe)}',
      '.al-btn:disabled{opacity:.45;cursor:default}',
      '.al-btnPrimary{border-color:var(--dsw-alias-brand-primary,#3964fe);background:var(--dsw-alias-bg-layer-2);background:color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 22%, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font-weight:600}',
      '.al-btnPrimary:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#3964fe);filter:brightness(1.04)}',
      '.al-btnDanger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-border-l2)}',
      '.al-btnGhost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.al-switch{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.al-track{width:32px;height:18px;border-radius:999px;background:var(--dsw-alias-state-idle-primary);position:relative;transition:background .15s ease;flex:none}',
      '.al-trackOn{background:var(--dsw-alias-state-success-primary)}',
      '.al-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s ease}',
      '.al-knobOn{left:16px}',
      '.al-tabs{display:flex;gap:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:2px;background:var(--dsw-alias-bg-layer-1);align-self:flex-start}',
      '.al-tab{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:3px 12px;border-radius:7px;cursor:pointer}',
      '.al-tabOn{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.al-badge{font-size:10.5px;line-height:15px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
      '.al-body{flex:1;min-height:0;display:flex}',
      '.al-side{width:228px;flex:none;border-right:1px solid var(--dsw-alias-border-l1);overflow:auto;padding:10px 8px 28px;background:var(--dsw-alias-bg-layer-1)}',
      '.al-sideTitle{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);padding:2px 8px 6px}',
      '.al-sideTitleRow{display:flex;align-items:center;justify-content:space-between;padding:2px 8px 6px}',
      '.al-sideAdd{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:1;cursor:pointer;padding:0 5px;border-radius:4px}',
      '.al-sideAdd:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.al-main{flex:1;min-width:0;overflow:auto;padding:16px 22px 48px}',
      '.al-node{display:flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;cursor:pointer;user-select:none;min-width:0}',
      '.al-node:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.al-nodeSel{background:var(--dsw-alias-bg-layer-2)}',
      '.al-nodeName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.al-nodeCount{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.al-caret{width:11px;flex:none;text-align:center;color:var(--dsw-alias-label-secondary);font-size:9px}',
      '.al-nodeChild{padding-left:22px}',
      '.al-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(142px,1fr));gap:10px}',
      '.al-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.al-cardValue{font-size:21px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.2}',
      '.al-cardLabel{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.al-section{display:flex;flex-direction:column;gap:9px;margin-top:18px}',
      '.al-sectionTitle{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600}',
      '.al-muted{font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.al-strip{display:flex;gap:10px;overflow:auto;padding-bottom:4px}',
      '.al-stripItem{flex:none;width:112px;cursor:pointer}',
      '.al-stripThumb{width:112px;height:84px;object-fit:cover;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);display:block;background:var(--dsw-alias-bg-layer-2)}',
      '.al-stripName{font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.al-bars{display:flex;flex-direction:column;gap:6px}',
      '.al-barRow{display:flex;align-items:center;gap:8px;font-size:11.5px}',
      '.al-barName{width:96px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.al-barTrack{flex:1;height:7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;min-width:30px}',
      '.al-barFill{height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary,#3964fe)}',
      '.al-barCount{width:34px;text-align:right;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.al-infoGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px 18px}',
      '.al-info{display:flex;flex-direction:column;gap:1px;min-width:0}',
      '.al-infoLabel{font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
      '.al-infoValue{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.al-warn{border:1px solid var(--dsw-alias-state-warn-primary);border-radius:9px;padding:8px 11px;font-size:11.5px;color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-layer-1);line-height:1.55}',
      '.al-error{border:1px solid var(--dsw-alias-state-error-primary);border-radius:9px;padding:8px 11px;font-size:11.5px;color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-1);line-height:1.55;white-space:pre-wrap}',
      '.al-ok{border:1px solid var(--dsw-alias-state-success-primary);border-radius:9px;padding:8px 11px;font-size:11.5px;color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-bg-layer-1);line-height:1.55}',
      '.al-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.al-input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:7px;padding:4px 9px;font:inherit;font-size:12px;box-sizing:border-box;outline:none;min-width:0}',
      '.al-input:focus{border-color:var(--dsw-alias-brand-primary,#3964fe)}',
      '.al-inputWide{width:100%}',
      '.al-select{max-width:420px}',
      '.al-search{width:230px}',
      '.al-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}',
      '.al-tile{position:relative;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1);cursor:pointer;display:flex;flex-direction:column;transition:border-color .15s ease}',
      '.al-tileSel{border-color:var(--dsw-alias-brand-primary,#3964fe);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary,#3964fe) inset}',
      '.al-tileCheck{position:absolute;top:8px;left:8px;z-index:2;width:16px;height:16px;margin:0;cursor:pointer;accent-color:var(--dsw-alias-brand-primary,#3964fe)}',
      '.al-batchBar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}',
      '.al-batchCount{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}',
      '.al-menuLayer{position:fixed;inset:0;z-index:150}',
      '.al-menu{position:absolute;min-width:156px;display:flex;flex-direction:column;gap:2px;padding:4px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));border:1px solid var(--dsw-alias-border-l2);border-radius:9px;box-shadow:0 10px 28px rgba(0,0,0,.4)}',
      '.al-menuItem{border:0;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;font:inherit;font-size:12px;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}',
      '.al-menuItem:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.al-menuItemDanger{color:var(--dsw-alias-state-error-primary)}',
      '.al-tile:hover{border-color:var(--dsw-alias-brand-primary,#3964fe)}',
      '.al-thumb{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:var(--dsw-alias-bg-layer-2)}',
      '.al-tileBody{padding:6px 8px 8px;display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.al-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.al-tags{display:flex;gap:4px;flex-wrap:wrap;max-height:34px;overflow:hidden}',
      '.al-tag{font-size:10px;line-height:15px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:0 6px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.al-drop{border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px;padding:22px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);text-align:center;cursor:pointer}',
      '.al-dropOver{border-color:var(--dsw-alias-brand-primary,#3964fe);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}',
      '.al-queue{display:flex;flex-direction:column;gap:12px;margin-top:14px}',
      '.al-item{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:12px;display:grid;grid-template-columns:minmax(180px,300px) minmax(0,1fr);gap:14px;background:var(--dsw-alias-bg-layer-1);align-items:start}',
      '.al-itemDone{border-color:var(--dsw-alias-state-success-primary)}',
      '.al-itemErr{border-color:var(--dsw-alias-state-error-primary)}',
      '.al-stage{position:relative;user-select:none;touch-action:none;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}',
      '.al-stage img{display:block;width:100%;height:auto;pointer-events:none}',
      '.al-stageDraw{cursor:crosshair}',
      '.al-box{position:absolute;border:1.5px solid var(--dsw-alias-state-success-primary);border-radius:3px;box-sizing:border-box}',
      '.al-boxOff{border-color:var(--dsw-alias-state-idle-primary);opacity:.6}',
      '.al-boxLabel{position:absolute;top:-16px;left:-1px;font-size:9.5px;line-height:14px;padding:0 4px;border-radius:4px;background:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-bg-base);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}',
      '.al-boxOff .al-boxLabel{background:var(--dsw-alias-state-idle-primary)}',
      '.al-boxEditable{cursor:move}',
      '.al-boxActive{border-color:var(--dsw-alias-state-warn-primary,#d97706)}',
      '.al-boxHandle{position:absolute;right:-6px;bottom:-6px;width:12px;height:12px;border-radius:3px;background:var(--dsw-alias-brand-primary,#3964fe);border:1px solid var(--dsw-alias-bg-layer-1);box-sizing:border-box;cursor:nwse-resize}',
      '.al-drawBox{position:absolute;border:1.5px dashed var(--dsw-alias-brand-primary,#3964fe);background:rgba(80,120,255,.16);box-sizing:border-box;pointer-events:none}',
      '.al-col{display:flex;flex-direction:column;gap:8px;min-width:0}',
      '.al-field{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.al-fieldLabel{font-size:10.5px;color:var(--dsw-alias-label-secondary)}',
      '.al-row2{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:8px}',
      '.al-objList{display:flex;flex-direction:column;gap:4px;max-height:190px;overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:5px}',
      '.al-obj{display:flex;align-items:center;gap:6px;font-size:11.5px;padding:1px 2px;min-width:0}',
      '.al-obj input[type=checkbox]{margin:0;flex:none}',
      '.al-obj input[type=text]{flex:1;min-width:0}',
      '.al-objDel{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:13px;line-height:1;padding:0 3px}',
      '.al-objDel:hover{color:var(--dsw-alias-state-error-primary)}',
      '.al-pieceList{display:flex;flex-direction:column;gap:5px;max-height:280px;overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:5px}',
      '.al-piece{display:flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:4px 6px;background:var(--dsw-alias-bg-base);min-width:0}',
      '.al-pieceThumb{width:42px;height:42px;flex:none;object-fit:contain;border-radius:5px;background:var(--dsw-alias-bg-layer-2)}',
      '.al-pieceBody{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}',
      '.al-pieceMeta{font-size:10px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.al-piece input[type=checkbox]{margin:0;flex:none}',
      '.al-status{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.al-spin{display:inline-block;width:9px;height:9px;border-radius:50%;border:1.5px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary,#3964fe);animation:al-spin .8s linear infinite}',
      '@keyframes al-spin{to{transform:rotate(360deg)}}',
      '.al-empty{border:1px dashed var(--dsw-alias-border-l1);border-radius:12px;padding:26px 18px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.al-zoomModal{padding:16px}',
      '.al-zoomDialog{width:min(1280px,100%);max-height:94vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);border-radius:14px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,.45)}',
      '.al-zoomBody{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:10px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}',
      '.al-zoomStage{position:relative;line-height:0;cursor:crosshair;touch-action:none;margin:0 auto;flex:none}',
      '.al-zoomStage img{display:block;width:100%;height:100%;user-select:none;border-radius:4px}',
      '.al-modal{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.5);display:grid;place-items:center;padding:24px}',
      '.al-dialog{width:min(900px,100%);max-height:88vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);border-radius:14px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,.4)}',
      '.al-dialogHead{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.al-dialogBody{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr);gap:16px;padding:16px;overflow:auto;min-height:0}',
      '.al-preview{display:flex;align-items:flex-start;justify-content:center;background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:8px;min-height:180px}',
      '.al-preview img{max-width:100%;max-height:58vh;object-fit:contain;border-radius:6px;display:block}',
      '.al-dialogFoot{display:flex;gap:8px;align-items:center;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}',
      '.al-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:200;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:7px 14px;font-size:12px;box-shadow:0 10px 26px rgba(0,0,0,.35)}',
      '.al-fadeIn{animation:al-fade .16s ease-out}',
      '@keyframes al-fade{from{opacity:0}to{opacity:1}}',
      '@media (max-width:860px){.al-side{width:180px}.al-item{grid-template-columns:1fr}.al-dialogBody{grid-template-columns:1fr}}',
    ].join('')

    /* ── helpers ──────────────────────────────────────────────────────── */

    function serviceOf(ctx, name) {
      try {
        return ctx && typeof ctx.get === 'function' ? ctx.get(name) : undefined
      } catch (error) {
        return undefined
      }
    }

    function detectLang(ctx) {
      try {
        var locale = serviceOf(ctx, 'locale')
        var snapshot = locale && typeof locale.getSnapshot === 'function' ? locale.getSnapshot() : undefined
        var active = snapshot && typeof snapshot.active === 'string' ? snapshot.active : ''
        return /^en/i.test(active) ? 'en' : 'zh'
      } catch (error) {
        return 'zh'
      }
    }

    function useLang(ctx) {
      var state = React.useState(function () {
        return detectLang(ctx)
      })
      var lang = state[0]
      var setLang = state[1]
      React.useEffect(
        function () {
          var locale = serviceOf(ctx, 'locale')
          if (!locale || typeof locale.subscribe !== 'function') return undefined
          return locale.subscribe(function () {
            setLang(detectLang(ctx))
          })
        },
        [ctx],
      )
      return lang
    }

    function messageOf(lang) {
      return MESSAGES[lang] || MESSAGES.zh
    }

    async function request(path, options) {
      var response = await fetch(API + path, options)
      var payload = null
      try {
        payload = await response.json()
      } catch (error) {
        payload = null
      }
      if (!response.ok || !payload || payload.ok === false) {
        var reason = payload && payload.error ? payload.error : 'HTTP ' + response.status
        throw new Error(String(reason))
      }
      return payload
    }

    function postJson(path, body) {
      return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    function fmtDate(timestamp) {
      try {
        return new Date(timestamp).toLocaleString(undefined, {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      } catch (error) {
        return ''
      }
    }

    function fmtTokens(value) {
      var count = Number(value) || 0
      if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
      if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
      return String(count)
    }

    function splitTags(text) {
      return String(text || '')
        .split(/[\s,，、]+/)
        .map(function (tag) {
          return tag.replace(/^#/, '').trim()
        })
        .filter(Boolean)
    }

    function fileUrl(path) {
      return API + '/file?p=' + encodeURIComponent(path)
    }

    function clamp01(value) {
      if (!Number.isFinite(value)) return 0
      return Math.min(1, Math.max(0, value))
    }

    function loadImage(url) {
      return new Promise(function (resolve, reject) {
        var image = new Image()
        image.onload = function () {
          resolve(image)
        }
        image.onerror = function () {
          reject(new Error('image load failed'))
        }
        image.src = url
      })
    }

    function canvasDataUrl(image, width, height, maxEdge, type, quality) {
      var scale = Math.min(1, maxEdge / Math.max(width, height))
      var w = Math.max(1, Math.round(width * scale))
      var h = Math.max(1, Math.round(height * scale))
      var canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      var context = canvas.getContext('2d')
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, 0, w, h)
      return { data: canvas.toDataURL(type, quality), width: w, height: h }
    }

    function base64ToBytes(base64) {
      var binary = window.atob(base64)
      var bytes = new Uint8Array(binary.length)
      for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
      return bytes
    }

    /** SHA-256 of the uploaded bytes, so the same image is not imported twice. */
    function sha256Hex(base64) {
      try {
        if (!window.crypto || !window.crypto.subtle || !window.crypto.subtle.digest) return Promise.resolve('')
        return window.crypto.subtle
          .digest('SHA-256', base64ToBytes(base64))
          .then(function (buffer) {
            var bytes = new Uint8Array(buffer)
            var out = ''
            for (var index = 0; index < bytes.length; index += 1) {
              out += (bytes[index] < 16 ? '0' : '') + bytes[index].toString(16)
            }
            return out
          })
          .catch(function () {
            return ''
          })
      } catch (error) {
        return Promise.resolve('')
      }
    }

    function prepareFile(file) {
      var url = URL.createObjectURL(file)
      return loadImage(url)
        .then(function (image) {
          var width = image.naturalWidth || image.width
          var height = image.naturalHeight || image.height
          var png = String(file.type || '').indexOf('png') >= 0 && width * height <= 4000000
          var mediaType = png ? 'image/png' : 'image/jpeg'
          var main = canvasDataUrl(image, width, height, 2400, mediaType, 0.9)
          var thumb = canvasDataUrl(image, width, height, 480, 'image/jpeg', 0.78)
          var name = String(file.name || '粘贴图片').replace(/\.[^.]+$/, '')
          var data = main.data.split(',')[1]
          URL.revokeObjectURL(url)
          return sha256Hex(data).then(function (hash) {
            return {
              name: name || '素材',
              mediaType: mediaType,
              data: data,
              thumb: thumb.data.split(',')[1],
              width: main.width,
              height: main.height,
              hash: hash,
            }
          })
        })
        .catch(function () {
          URL.revokeObjectURL(url)
          throw new Error('无法读取这张图片')
        })
    }

    function cropImage(url, bbox, maxEdge) {
      return loadImage(url).then(function (image) {
        var width = image.naturalWidth || image.width
        var height = image.naturalHeight || image.height
        var x = clamp01(bbox[0]) * width
        var y = clamp01(bbox[1]) * height
        var w = Math.max(1, clamp01(bbox[2]) * width)
        var h = Math.max(1, clamp01(bbox[3]) * height)
        var scale = Math.min(1, maxEdge / Math.max(w, h))
        var cw = Math.max(1, Math.round(w * scale))
        var ch = Math.max(1, Math.round(h * scale))
        var canvas = document.createElement('canvas')
        canvas.width = cw
        canvas.height = ch
        var context = canvas.getContext('2d')
        context.imageSmoothingQuality = 'high'
        context.drawImage(image, x, y, w, h, 0, 0, cw, ch)
        return { data: canvas.toDataURL('image/png').split(',')[1], w: cw, h: ch }
      })
    }

    /* ── local object boxes (no model, no dependency) ───────────────────
     * Read the pixels once at a small size, keep what differs from the border
     * colour, close small gaps, and report the bounding box of each surviving
     * blob. Works well on sprites, character sheets and flat backgrounds; on a
     * busy photo it simply finds the dominant regions. */

    function roundUnit(value) {
      return Math.round(value * 10000) / 10000
    }

    function closeMask(mask, w, h, passes, dilate) {
      var source = mask
      for (var pass = 0; pass < passes; pass += 1) {
        var target = new Uint8Array(w * h)
        for (var y = 0; y < h; y += 1) {
          for (var x = 0; x < w; x += 1) {
            var index = y * w + x
            var hit = source[index] === 1
            if (dilate ? !hit : hit) {
              var up = y > 0 ? source[index - w] : 0
              var down = y < h - 1 ? source[index + w] : 0
              var left = x > 0 ? source[index - 1] : 0
              var right = x < w - 1 ? source[index + 1] : 0
              if (dilate) {
                if (up || down || left || right) hit = true
              } else {
                var all = (y === 0 || up) && (y === h - 1 || down) && (x === 0 || left) && (x === w - 1 || right)
                if (!all) hit = false
              }
            }
            target[index] = hit ? 1 : 0
          }
        }
        source = target
      }
      return source
    }

    function findComponents(mask, w, h) {
      var visited = new Uint8Array(w * h)
      var stack = new Int32Array(w * h)
      var out = []
      for (var start = 0; start < mask.length; start += 1) {
        if (mask[start] !== 1 || visited[start] === 1) continue
        var top = 0
        stack[top++] = start
        visited[start] = 1
        var count = 0
        var x0 = w
        var y0 = h
        var x1 = -1
        var y1 = -1
        while (top > 0) {
          var index = stack[--top]
          var y = Math.floor(index / w)
          var x = index - y * w
          count += 1
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
          if (x > 0 && mask[index - 1] === 1 && visited[index - 1] === 0) {
            visited[index - 1] = 1
            stack[top++] = index - 1
          }
          if (x < w - 1 && mask[index + 1] === 1 && visited[index + 1] === 0) {
            visited[index + 1] = 1
            stack[top++] = index + 1
          }
          if (y > 0 && mask[index - w] === 1 && visited[index - w] === 0) {
            visited[index - w] = 1
            stack[top++] = index - w
          }
          if (y < h - 1 && mask[index + w] === 1 && visited[index + w] === 0) {
            visited[index + w] = 1
            stack[top++] = index + w
          }
        }
        out.push({ x0: x0, y0: y0, x1: x1, y1: y1, count: count })
      }
      return out
    }

    function mergeComponents(list, gap) {
      var boxes = list.slice()
      var changed = true
      while (changed) {
        changed = false
        for (var i = 0; i < boxes.length && !changed; i += 1) {
          for (var j = i + 1; j < boxes.length; j += 1) {
            var a = boxes[i]
            var b = boxes[j]
            if (a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1) {
              boxes[i] = {
                x0: Math.min(a.x0, b.x0),
                y0: Math.min(a.y0, b.y0),
                x1: Math.max(a.x1, b.x1),
                y1: Math.max(a.y1, b.y1),
                count: a.count + b.count,
              }
              boxes.splice(j, 1)
              changed = true
              break
            }
          }
        }
      }
      return boxes
    }

    /* ── local object boxes (no model, tiled for dense sheets) ────────── */

    /* Analyze one already-drawn canvas (a tile, or the whole image) and
       return boxes in that canvas's pixel space. */
    function maskBoxes(canvas) {
      var w = canvas.width
      var h = canvas.height
      var context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return []
      var data
      try {
        data = context.getImageData(0, 0, w, h).data
      } catch (error) {
        return []
      }
      var pixels = w * h

      /* The border is almost always background: use it as the reference colour. */
      var border = []
      var sumR = 0
      var sumG = 0
      var sumB = 0
      var samples = 0
      var stepX = Math.max(1, Math.round(w / 64))
      var stepY = Math.max(1, Math.round(h / 64))
      function sample(x, y) {
        samples += 1
        var index = (y * w + x) * 4
        if (data[index + 3] < 24) return
        sumR += data[index]
        sumG += data[index + 1]
        sumB += data[index + 2]
        if (border.length < 512) border.push([data[index], data[index + 1], data[index + 2]])
      }
      for (var x = 0; x < w; x += stepX) {
        sample(x, 0)
        sample(x, h - 1)
      }
      for (var y = 0; y < h; y += stepY) {
        sample(0, y)
        sample(w - 1, y)
      }
      var transparentBorder = samples > 0 && border.length / samples < 0.35
      var bgR = border.length > 0 ? sumR / border.length : 255
      var bgG = border.length > 0 ? sumG / border.length : 255
      var bgB = border.length > 0 ? sumB / border.length : 255
      var maxDev = 0
      for (var b = 0; b < border.length; b += 1) {
        var dev = Math.max(Math.abs(border[b][0] - bgR), Math.abs(border[b][1] - bgG), Math.abs(border[b][2] - bgB))
        if (dev > maxDev) maxDev = dev
      }
      var threshold = maxDev < 10 ? 20 : maxDev < 26 ? 30 : 40

      var mask = new Uint8Array(pixels)
      for (var index = 0; index < pixels; index += 1) {
        var p = index * 4
        if (data[p + 3] < 24) continue
        if (transparentBorder) {
          mask[index] = 1
          continue
        }
        var dr = data[p] - bgR
        var dg = data[p + 1] - bgG
        var db = data[p + 2] - bgB
        if (dr * dr + dg * dg + db * db > threshold * threshold) mask[index] = 1
      }

      /* Close gaps so the parts of one object become a single blob. */
      mask = closeMask(mask, w, h, 2, true)
      mask = closeMask(mask, w, h, 2, false)

      var components = findComponents(mask, w, h)
      var minArea = Math.max(8, Math.round(pixels * 0.0004))
      var boxes = []
      for (var c = 0; c < components.length; c += 1) {
        if (components[c].count >= minArea) boxes.push(components[c])
      }
      if (boxes.length === 0) return []
      if (boxes.length > 500) {
        boxes.sort(function (left, right) {
          return right.count - left.count
        })
        boxes = boxes.slice(0, 500)
      }
      boxes = mergeComponents(boxes, Math.max(2, Math.round(Math.min(w, h) * 0.003)))
      var minBoxArea = Math.max(4, Math.round(pixels * 0.0006))
      return boxes.filter(function (box) {
        var area = (box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1)
        return box.count >= minBoxArea && area < pixels * 0.96
      })
    }

    /** Draw one region of the source at analysis size and map boxes back. */
    function analyzeRegion(image, rx, ry, rw, rh) {
      try {
        var MAX = 640
        var scale = Math.min(1, MAX / Math.max(rw, rh))
        var w = Math.max(1, Math.round(rw * scale))
        var h = Math.max(1, Math.round(rh * scale))
        var canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        var context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return []
        context.drawImage(image, rx, ry, rw, rh, 0, 0, w, h)
        var boxes = maskBoxes(canvas)
        var mapped = []
        for (var i = 0; i < boxes.length; i += 1) {
          var box = boxes[i]
          mapped.push({
            x0: rx + box.x0 / scale,
            y0: ry + box.y0 / scale,
            x1: rx + (box.x1 + 1) / scale,
            y1: ry + (box.y1 + 1) / scale,
            count: box.count,
          })
        }
        return mapped
      } catch (error) {
        return []
      }
    }

    function boxArea(box) {
      return Math.max(1, (box.x1 - box.x0) * (box.y1 - box.y0))
    }

    function overlapRatio(a, b) {
      var ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0))
      var iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
      var inter = ix * iy
      if (inter <= 0) return 0
      return inter / Math.min(boxArea(a), boxArea(b))
    }

    function unionBox(a, b) {
      return {
        x0: Math.min(a.x0, b.x0),
        y0: Math.min(a.y0, b.y0),
        x1: Math.max(a.x1, b.x1),
        y1: Math.max(a.y1, b.y1),
        count: (a.count || 0) + (b.count || 0),
      }
    }

    /** Stitch tile results: an object seen by two overlapping tiles becomes one box. */
    function mergeTileBoxes(boxes) {
      var list = boxes.slice().sort(function (a, b) {
        return boxArea(b) - boxArea(a)
      })
      var merged = []
      for (var i = 0; i < list.length; i += 1) {
        var box = list[i]
        var placed = false
        for (var j = 0; j < merged.length; j += 1) {
          if (overlapRatio(box, merged[j]) > 0.22) {
            merged[j] = unionBox(merged[j], box)
            placed = true
            break
          }
        }
        if (!placed) merged.push(box)
      }
      var changed = true
      while (changed) {
        changed = false
        for (var a = 0; a < merged.length && !changed; a += 1) {
          for (var b = a + 1; b < merged.length; b += 1) {
            if (overlapRatio(merged[a], merged[b]) > 0.22) {
              merged[a] = unionBox(merged[a], merged[b])
              merged.splice(b, 1)
              changed = true
              break
            }
          }
        }
      }
      return merged
    }

    function finishBoxes(pixelBoxes, width, height) {
      var filtered = []
      for (var i = 0; i < pixelBoxes.length; i += 1) {
        var box = pixelBoxes[i]
        if (box.x1 - box.x0 < 4 || box.y1 - box.y0 < 4) continue
        filtered.push(box)
      }
      filtered.sort(function (a, b) {
        return boxArea(b) - boxArea(a)
      })
      filtered = filtered.slice(0, MAX_PIECES)
      filtered.sort(function (a, b) {
        var rowA = Math.round(a.y0 / (height * 0.04))
        var rowB = Math.round(b.y0 / (height * 0.04))
        if (rowA !== rowB) return rowA - rowB
        return a.x0 - b.x0
      })
      var pad = 2
      return filtered.map(function (box, index) {
        var x0 = Math.max(0, box.x0 - pad)
        var y0 = Math.max(0, box.y0 - pad)
        var x1 = Math.min(width, box.x1 + pad)
        var y1 = Math.min(height, box.y1 + pad)
        return {
          label: '对象 ' + (index + 1),
          bbox: [roundUnit(x0 / width), roundUnit(y0 / height), roundUnit((x1 - x0) / width), roundUnit((y1 - y0) / height)],
        }
      })
    }

    /**
     * Tiled local detection. A big sprite sheet is split into overlapping
     * ~700px tiles, each tile is analyzed at up to 640px (so small icons keep
     * enough pixels), and the results are stitched back together. Yields
     * between tiles so the panel can show progress instead of freezing.
     */
    function localDetect(url, onProgress) {
      return loadImage(url).then(function (image) {
        var width = image.naturalWidth || image.width
        var height = image.naturalHeight || image.height
        if (!width || !height) return []
        var TARGET = 700
        var OVERLAP = 90
        var tilesX = Math.max(1, Math.ceil(width / TARGET))
        var tilesY = Math.max(1, Math.ceil(height / TARGET))
        var total = tilesX * tilesY
        if (total <= 1) {
          return finishBoxes(analyzeRegion(image, 0, 0, width, height), width, height)
        }
        var tileW = Math.ceil(width / tilesX)
        var tileH = Math.ceil(height / tilesY)
        var collected = []
        var done = 0
        function step() {
          if (done >= total) {
            return finishBoxes(mergeTileBoxes(collected), width, height)
          }
          var tx = done % tilesX
          var ty = Math.floor(done / tilesX)
          var rx = Math.max(0, tx * tileW - OVERLAP)
          var ry = Math.max(0, ty * tileH - OVERLAP)
          var rw = Math.min(width, (tx + 1) * tileW + OVERLAP) - rx
          var rh = Math.min(height, (ty + 1) * tileH + OVERLAP) - ry
          var found = analyzeRegion(image, rx, ry, rw, rh)
          for (var index = 0; index < found.length; index += 1) collected.push(found[index])
          done += 1
          if (typeof onProgress === 'function') onProgress(done, total)
          return new Promise(function (resolve) {
            setTimeout(resolve, 0)
          }).then(step)
        }
        return step()
      })
    }

    async function pickFolder(ctx) {
      var service = serviceOf(ctx, 'uiWorkspace')
      if (!service || typeof service.pickDirectory !== 'function') throw new Error('directory picker unavailable')
      var picked = await service.pickDirectory()
      return typeof picked === 'string' && picked ? picked : null
    }

    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
      }
      try {
        var area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
        return Promise.resolve()
      } catch (error) {
        return Promise.reject(error)
      }
    }

    /* ── small components ─────────────────────────────────────────────── */

    function Button(props) {
      var className = 'al-btn' + (props.primary ? ' al-btnPrimary' : '') + (props.danger ? ' al-btnDanger' : '') + (props.ghost ? ' al-btnGhost' : '')
      return h(
        'button',
        {
          type: 'button',
          className: className,
          onClick: props.onClick,
          disabled: props.disabled,
          title: props.title || undefined,
        },
        props.children,
      )
    }

    function Switch(props) {
      return h(
        'span',
        {
          className: 'al-switch',
          role: 'switch',
          'aria-checked': props.checked ? 'true' : 'false',
          tabIndex: 0,
          onClick: props.onChange,
          onKeyDown: function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              props.onChange()
            }
          },
          title: props.title || undefined,
        },
        h('span', { className: 'al-track' + (props.checked ? ' al-trackOn' : '') }, h('span', { className: 'al-knob' + (props.checked ? ' al-knobOn' : '') })),
        h('span', null, props.label),
      )
    }

    function StatCard(props) {
      return h(
        'div',
        { className: 'al-card' },
        h('span', { className: 'al-cardValue' }, String(props.value)),
        h('span', { className: 'al-cardLabel' }, props.label),
      )
    }

    function StatusLine(props) {
      var spinning = props.busy === true
      return h(
        'span',
        { className: 'al-status' },
        spinning ? h('span', { className: 'al-spin' }) : null,
        props.text,
      )
    }

    /* ── category tree ────────────────────────────────────────────────── */

    function CategoryTree(props) {
      var t = props.t
      var tree = props.tree || []
      var selected = props.selected
      var expanded = props.expanded
      var onToggle = props.onToggle
      var onEnter = props.onEnter
      var onSelect = props.onSelect

      function row(node, depth, key) {
        var hasChildren = node.children && node.children.length > 0
        var open = expanded[key] !== false
        var isSelected = selected === key
        return h(
          'div',
          { key: 'row-' + key },
          h(
            'div',
            {
              className: 'al-node' + (isSelected ? ' al-nodeSel' : '') + (depth > 0 ? ' al-nodeChild' : ''),
              onClick: function () {
                onSelect(key)
                if (hasChildren) onToggle(key, !open)
              },
              onDoubleClick: function () {
                onEnter(key)
              },
              onContextMenu: function (event) {
                event.preventDefault()
                event.stopPropagation()
                var rect = event.currentTarget.getBoundingClientRect()
                if (typeof props.onMenu === 'function') props.onMenu(key, rect.left + 12, rect.bottom + 2)
              },
              title: key + '\n' + t.categoryMenuHint,
            },
            h(
              'span',
              {
                className: 'al-caret',
                onClick: function (event) {
                  if (!hasChildren) return
                  event.stopPropagation()
                  onToggle(key, !open)
                },
              },
              hasChildren ? (open ? '▾' : '▸') : '',
            ),
            h('span', { className: 'al-nodeName' }, node.name),
            h('span', { className: 'al-nodeCount' }, String(node.count)),
          ),
          hasChildren && open
            ? node.children.map(function (child) {
                return row(child, depth + 1, key + '/' + child.name)
              })
            : null,
        )
      }

      var total = tree.reduce(function (sum, node) {
        return sum + node.count
      }, 0)

      return h(
        'div',
        null,
        h(
          'div',
          { className: 'al-sideTitleRow' },
          h('span', { className: 'al-sideTitle', style: { padding: 0 } }, t.categories),
          h(
            'button',
            {
              type: 'button',
              className: 'al-sideAdd',
              title: t.newCategory,
              onClick: function () {
                if (typeof props.onCreate === 'function') props.onCreate(null)
              },
            },
            '+',
          ),
        ),
        h(
          'div',
          {
            className: 'al-node' + (selected === null ? ' al-nodeSel' : ''),
            onClick: function () {
              onSelect(null)
            },
            onDoubleClick: function () {
              onEnter(null)
            },
          },
          h('span', { className: 'al-caret' }, ''),
          h('span', { className: 'al-nodeName' }, t.allAssets),
          h('span', { className: 'al-nodeCount' }, String(total)),
        ),
        tree.map(function (node) {
          return row(node, 0, node.name)
        }),
        tree.length === 0 ? h('div', { className: 'al-muted', style: { padding: '8px' } }, t.recentEmpty) : null,
      )
    }

    /* ── dashboard ────────────────────────────────────────────────────── */

    function Dashboard(props) {
      var t = props.t
      var snapshot = props.snapshot
      var stats = snapshot.stats || {}
      var items = snapshot.items || []
      var tree = snapshot.tree || []
      var recent = snapshot.recent || []
      var maxCount = tree.length > 0 ? tree[0].count : 1

      return h(
        'div',
        { className: 'al-fadeIn' },
        h(
          'div',
          { className: 'al-cards' },
          h(StatCard, { label: t.total, value: stats.total || 0 }),
          h(StatCard, { label: t.segments, value: stats.segments || 0 }),
          h(StatCard, { label: t.originals, value: stats.originals || 0 }),
          h(StatCard, { label: t.categories, value: stats.categories || 0 }),
          h(StatCard, { label: t.week, value: stats.last7 || 0 }),
        ),
        h(
          'div',
          { className: 'al-section' },
          h('div', { className: 'al-sectionTitle' }, t.recentTitle, h('span', { className: 'al-badge' }, String(items.length))),
          recent.length === 0
            ? h('div', { className: 'al-empty' }, t.recentEmpty)
            : h(
                'div',
                { className: 'al-strip' },
                recent.map(function (item) {
                  return h(
                    'div',
                    {
                      key: item.id,
                      className: 'al-stripItem',
                      onClick: function () {
                        props.onOpen(item)
                      },
                      title: item.name,
                    },
                    h('img', { className: 'al-stripThumb', src: item.thumbUrl, alt: item.name, loading: 'lazy' }),
                    h('div', { className: 'al-stripName' }, item.name),
                  )
                }),
              ),
        ),
        h(
          'div',
          { className: 'al-section' },
          h('div', { className: 'al-sectionTitle' }, t.distTitle),
          tree.length === 0
            ? h('div', { className: 'al-muted' }, t.emptyHint)
            : h(
                'div',
                { className: 'al-bars' },
                tree.slice(0, 8).map(function (node) {
                  return h(
                    'div',
                    { key: node.name, className: 'al-barRow' },
                    h('span', { className: 'al-barName' }, node.name),
                    h('span', { className: 'al-barTrack' }, h('span', { className: 'al-barFill', style: { width: Math.max(3, Math.round((node.count / maxCount) * 100)) + '%' } })),
                    h('span', { className: 'al-barCount' }, String(node.count)),
                  )
                }),
              ),
        ),
        h(
          'div',
          { className: 'al-section' },
          h('div', { className: 'al-sectionTitle' }, t.libraryInfo),
          h(
            'div',
            { className: 'al-infoGrid' },
            h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, t.path), h('span', { className: 'al-infoValue', title: snapshot.libraryPath }, snapshot.libraryPath || '-')),
            h(
              'div',
              { className: 'al-info' },
              h('span', { className: 'al-infoLabel' }, t.modelLabel),
              h('span', { className: 'al-infoValue' }, props.modelText || t.modelNone),
            ),
            h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, t.kind), h('span', { className: 'al-infoValue' }, snapshot.enabled ? t.enabled : t.disabled)),
            h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, 'MCP'), h('span', { className: 'al-infoValue' }, 'mcp__assetlib__search_assets')),
            h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, '版本'), h('span', { className: 'al-infoValue' }, snapshot.version || '-')),
            h(
              'div',
              { className: 'al-info' },
              h('span', { className: 'al-infoLabel' }, t.aiUsage),
              h(
                'span',
                { className: 'al-infoValue' },
                snapshot.usage && snapshot.usage.calls
                  ? snapshot.usage.calls +
                    ' 次 · 输入 ' +
                    fmtTokens(snapshot.usage.inputTokens) +
                    ' / 输出 ' +
                    fmtTokens(snapshot.usage.outputTokens)
                  : t.usageEmpty,
              ),
            ),
          ),
        ),
      )
    }

    /* ── library grid ─────────────────────────────────────────────────── */

    function LibraryView(props) {
      var t = props.t
      var all = props.items || []
      var category = props.category
      var kind = props.kind
      var query = props.query
      var activeTags = Array.isArray(props.activeTags) ? props.activeTags : []
      var limit = props.limit
      var [selectMode, setSelectMode] = React.useState(false)
      var [selected, setSelected] = React.useState({})
      var [batchField, setBatchField] = React.useState('')
      var [batchValue, setBatchValue] = React.useState('')
      var [confirmDelete, setConfirmDelete] = React.useState(false)
      var [busy, setBusy] = React.useState(false)
      var [sort, setSort] = React.useState('newest')
      var selectedIds = Object.keys(selected).filter(function (id) {
        return selected[id]
      })

      function notify(text) {
        if (typeof props.notify === 'function') props.notify(text)
      }
      function refresh() {
        if (typeof props.refresh === 'function') props.refresh()
      }
      function toggleSelect(id) {
        setSelected(function (current) {
          var next = Object.assign({}, current)
          if (next[id]) delete next[id]
          else next[id] = true
          return next
        })
      }
      function applyBatch(field) {
        var value = String(batchValue || '').trim()
        if (selectedIds.length === 0) {
          notify(t.batchNeedPick)
          return
        }
        if (!value) return
        setBusy(true)
        var patch = field === 'category' ? { category: value } : { addTags: splitTags(value) }
        postJson('/update-many', { ids: selectedIds, patch: patch })
          .then(function (result) {
            notify(t.batchUpdated + ' ' + String(result.updated || 0))
            setBatchField('')
            setBatchValue('')
            refresh()
          })
          .catch(function (error) {
            notify(String((error && error.message) || error))
          })
          .then(function () {
            setBusy(false)
          })
      }
      function removeSelected() {
        if (selectedIds.length === 0) {
          notify(t.batchNeedPick)
          return
        }
        setBusy(true)
        postJson('/delete', { ids: selectedIds })
          .then(function (result) {
            notify(t.batchDeleted + ' ' + String(result.deleted || 0))
            setSelected({})
            setConfirmDelete(false)
            setSelectMode(false)
            refresh()
          })
          .catch(function (error) {
            notify(String((error && error.message) || error))
          })
          .then(function () {
            setBusy(false)
          })
      }

      var words = String(query || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)

      var filtered = all.filter(function (item) {
        if (category && !(item.category === category || item.category.indexOf(category + '/') === 0)) return false
        if (kind !== 'all' && item.kind !== kind) return false
        for (var tIndex = 0; tIndex < activeTags.length; tIndex += 1) {
          if (item.tags.indexOf(activeTags[tIndex]) < 0) return false
        }
        if (words.length > 0) {
          var haystack = [item.name, item.note, item.category].concat(item.tags).join(' ').toLowerCase()
          for (var index = 0; index < words.length; index += 1) {
            if (haystack.indexOf(words[index]) < 0) return false
          }
        }
        return true
      })

      var sorted = filtered.slice()
      if (sort === 'name') sorted.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh') })
      else if (sort === 'oldest') sorted.sort(function (a, b) { return a.createdAt - b.createdAt })
      else if (sort === 'large') sorted.sort(function (a, b) { return b.w * b.h - a.w * a.h })
      else sorted.sort(function (a, b) { return b.createdAt - a.createdAt })

      var shown = sorted.slice(0, limit)

      return h(
        'div',
        { className: 'al-fadeIn' },
        h(
          'div',
          { className: 'al-toolbar' },
          h('input', {
            className: 'al-input al-search',
            placeholder: t.searchPlaceholder,
            value: query,
            onChange: function (event) {
              props.onQuery(event.target.value)
            },
          }),
          h(
            'span',
            { className: 'al-tabs' },
            ['all', 'segment', 'original'].map(function (value) {
              return h(
                'button',
                {
                  key: value,
                  type: 'button',
                  className: 'al-tab' + (kind === value ? ' al-tabOn' : ''),
                  onClick: function () {
                    props.onKind(value)
                  },
                },
                value === 'all' ? t.kindAll : value === 'segment' ? t.kindSegment : t.kindOriginal,
              )
            }),
          ),
          category
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'al-btn',
                  onClick: function () {
                    props.onCategory(null)
                  },
                  title: category,
                },
                '⌘ ' + category + ' ✕',
              )
            : null,
          activeTags.length > 0
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'al-btn',
                  onClick: function () {
                    props.onClearTags()
                  },
                  title: activeTags.join(' '),
                },
                activeTags.map(function (value) {
                  return '#' + value
                }).join(' ') + ' ✕',
              )
            : null,
          h('span', { className: 'al-spacer' }),
          h(
            'select',
            {
              className: 'al-input',
              value: sort,
              onChange: function (event) {
                setSort(event.target.value)
              },
              title: t.sortLabel,
            },
            h('option', { value: 'newest' }, t.sortNewest),
            h('option', { value: 'oldest' }, t.sortOldest),
            h('option', { value: 'name' }, t.sortName),
            h('option', { value: 'large' }, t.sortLarge),
          ),
          h(
            Button,
            {
              primary: selectMode,
              onClick: function () {
                setSelectMode(!selectMode)
                setSelected({})
                setConfirmDelete(false)
                setBatchField('')
              },
            },
            selectMode ? t.selectModeOn : t.selectMode,
          ),
          h('span', { className: 'al-muted' }, String(filtered.length)),
        ),
        selectMode
          ? h(
              'div',
              { className: 'al-batchBar' },
              h('span', { className: 'al-batchCount' }, t.selectedCount + ' ' + selectedIds.length),
              h(
                Button,
                {
                  onClick: function () {
                    var next = Object.assign({}, selected)
                    filtered.forEach(function (item) {
                      next[item.id] = true
                    })
                    setSelected(next)
                  },
                },
                t.selectAllCurrent,
              ),
              h(
                Button,
                {
                  onClick: function () {
                    setSelected({})
                  },
                },
                t.clearSelection,
              ),
              h(
                Button,
                {
                  onClick: function () {
                    if (selectedIds.length === 0) {
                      notify(t.batchNeedPick)
                      return
                    }
                    var paths = all
                      .filter(function (item) {
                        return selected[item.id]
                      })
                      .map(function (item) {
                        return item.path
                      })
                    copyText(paths.join('\n'))
                      .then(function () {
                        notify(t.copied + ' (' + paths.length + ')')
                      })
                      .catch(function () {
                        /* clipboard unavailable */
                      })
                  },
                },
                t.copyPath,
              ),
              h('span', { className: 'al-spacer' }),
              h(
                Button,
                {
                  onClick: function () {
                    setBatchField(batchField === 'category' ? '' : 'category')
                    setBatchValue('')
                    setConfirmDelete(false)
                  },
                },
                t.batchCategory,
              ),
              h(
                Button,
                {
                  onClick: function () {
                    setBatchField(batchField === 'tags' ? '' : 'tags')
                    setBatchValue('')
                    setConfirmDelete(false)
                  },
                },
                t.batchTags,
              ),
              confirmDelete
                ? h(
                    'span',
                    { className: 'al-toolbar' },
                    h('span', { className: 'al-muted' }, t.batchDeleteConfirm),
                    h(Button, { danger: true, disabled: busy, onClick: removeSelected }, t.batchApply),
                    h(Button, { ghost: true, onClick: function () { setConfirmDelete(false) } }, t.cancel),
                  )
                : h(
                    Button,
                    {
                      danger: true,
                      onClick: function () {
                        setConfirmDelete(true)
                        setBatchField('')
                      },
                    },
                    t.batchDelete,
                  ),
            )
          : null,
        selectMode && batchField !== ''
          ? h(
              'div',
              { className: 'al-toolbar', style: { marginTop: '6px' } },
              h('input', {
                className: 'al-input',
                style: { minWidth: '240px' },
                value: batchValue,
                list: batchField === 'category' ? 'al-categories' : undefined,
                placeholder: batchField === 'category' ? t.categoryLabel : t.tagsHint,
                onChange: function (event) {
                  setBatchValue(event.target.value)
                },
                onKeyDown: function (event) {
                  if (event.key === 'Enter') applyBatch(batchField)
                },
              }),
              h(
                Button,
                {
                  primary: true,
                  disabled: busy,
                  onClick: function () {
                    applyBatch(batchField)
                  },
                },
                t.batchApply,
              ),
            )
          : null,
        (props.tags || []).length > 0
          ? h(
              'div',
              { className: 'al-toolbar', style: { marginTop: '8px' } },
              (props.tags || []).slice(0, 10).map(function (entry) {
                return h(
                  'button',
                  {
                    key: entry.name,
                    type: 'button',
                    className: 'al-btn' + (activeTags.indexOf(entry.name) >= 0 ? ' al-btnPrimary' : ''),
                    onClick: function () {
                      props.onToggleTag(entry.name)
                    },
                  },
                  '#' + entry.name,
                )
              }),
            )
          : null,
        filtered.length === 0
          ? h('div', { className: 'al-empty', style: { marginTop: '16px' } }, h('div', null, t.emptyLibrary), h('div', { className: 'al-muted', style: { marginTop: '6px' } }, t.emptyHint))
          : h(
              'div',
              { className: 'al-grid', style: { marginTop: '14px' } },
              shown.map(function (item) {
                return h(
                  'div',
                  {
                    key: item.id,
                    className: 'al-tile' + (selectMode && selected[item.id] ? ' al-tileSel' : ''),
                    onClick: function () {
                      if (selectMode) toggleSelect(item.id)
                      else props.onOpen(item)
                    },
                    onDoubleClick: function () {
                      if (!selectMode) props.onOpen(item)
                    },
                    title: item.note || item.name,
                  },
                  selectMode
                    ? h('input', {
                        type: 'checkbox',
                        className: 'al-tileCheck',
                        checked: Boolean(selected[item.id]),
                        onClick: function (event) {
                          event.stopPropagation()
                        },
                        onChange: function () {
                          toggleSelect(item.id)
                        },
                      })
                    : null,
                  h('img', { className: 'al-thumb', src: item.thumbUrl, alt: item.name, loading: 'lazy' }),
                  h(
                    'div',
                    { className: 'al-tileBody' },
                    h('span', { className: 'al-name' }, item.name),
                    h(
                      'span',
                      { className: 'al-muted' },
                      item.category + (item.kind === 'segment' ? ' · ' + t.kindSegment : ''),
                    ),
                    h(
                      'span',
                      { className: 'al-tags' },
                      item.tags.slice(0, 4).map(function (value) {
                        return h('span', { key: value, className: 'al-tag' }, '#' + value)
                      }),
                    ),
                  ),
                )
              }),
            ),
        filtered.length > shown.length
          ? h(
              'div',
              { style: { marginTop: '14px', display: 'flex', justifyContent: 'center' } },
              h(Button, {
                onClick: function () {
                  props.onMore()
                },
              }, t.loadMore + ' (' + (filtered.length - shown.length) + ')'),
            )
          : null,
      )
    }

    /* ── import view ──────────────────────────────────────────────────── */

    function ImportView(props) {
      var t = props.t
      var ctx = props.ctx
      var queue = props.queue
      var setQueue = props.setQueue
      var autoAnalyze = props.autoAnalyze
      var setAutoAnalyze = props.setAutoAnalyze
      var notify = props.notify
      var refresh = props.refresh
      var fileInput = React.useRef(null)
      var dragDepth = React.useRef(0)
      var [over, setOver] = React.useState(false)
      var [drag, setDrag] = React.useState(null)
      var [drawKey, setDrawKey] = React.useState(null)
      var [zoomKey, setZoomKey] = React.useState(null)
      var [piecePages, setPiecePages] = React.useState({})
      var queueRef = React.useRef(queue)
      queueRef.current = queue

      function patchEntry(key, patch) {
        setQueue(function (previous) {
          return previous.map(function (entry) {
            if (entry.key !== key) return entry
            return Object.assign({}, entry, typeof patch === 'function' ? patch(entry) : patch)
          })
        })
      }

      function findEntry(key) {
        for (var index = 0; index < queueRef.current.length; index += 1) {
          if (queueRef.current[index].key === key) return queueRef.current[index]
        }
        return null
      }

      function failure(error) {
        return String((error && error.message) || error)
      }

      function roundBox(values) {
        return values.map(function (value) {
          return Math.round(value * 10000) / 10000
        })
      }

      /* 1. Cut one box out of the staged original; the piece appears at once. */
      function cropPiece(url, bbox, label, index, total) {
        var maxEdge = total > 300 ? 192 : total > 120 ? 256 : total > 40 ? 384 : 768
        return cropImage(url, bbox, maxEdge).then(function (crop) {
          var name = label || t.manualObject + ' ' + (index + 1)
          return {
            id: 'p' + (index + 1),
            data: crop.data,
            mediaType: 'image/png',
            w: crop.w,
            h: crop.h,
            bbox: bbox,
            url: 'data:image/png;base64,' + crop.data,
            name: name,
            category: '',
            tags: [],
            note: '',
            selected: true,
          }
        })
      }

      /* 2. AI naming for crops that already exist (names, categories, tags, notes).
         Dense sheets are capped per run so one click does not fire hundreds of
         model calls; the rest keep their numbered names. */
      function describe(key, stageId, pieces) {
        patchEntry(key, { status: 'describing', error: '' })
        var target = pieces.slice(0, NAMING_CAP)
        var payload = target.map(function (piece) {
          return {
            data: piece.data,
            mediaType: piece.mediaType || 'image/png',
            w: piece.w,
            h: piece.h,
            bbox: piece.bbox,
          }
        })
        return postJson('/describe', { stageId: stageId, pieces: payload })
          .then(function (result) {
            var annotations = result.pieces || []
            var merged = pieces.map(function (piece, index) {
              if (index >= target.length) return piece
              var annotation = annotations[index] || {}
              return Object.assign({}, piece, {
                id: annotation.pieceId || piece.id,
                url: annotation.url || piece.url,
                name: annotation.name || piece.name,
                category: annotation.category || result.category || '其他',
                tags: Array.isArray(annotation.tags) ? annotation.tags : [],
                note: annotation.note || '',
              })
            })
            var patch = {
              status: 'ready',
              pieces: merged,
              category: result.category || '其他',
              tagsText: (result.tags || []).join(' '),
              note: result.note || '',
              model: result.model || '',
              error: '',
              progress: '',
            }
            if (result.usage) patch.usage = result.usage
            if (result.title) patch.name = result.title
            if (result.warning) patch.warning = result.warning
            patchEntry(key, patch)
          })
          .catch(function (error) {
            patchEntry(key, { status: 'ready', error: failure(error) + t.nameFailedHint, progress: '' })
          })
      }

      /* 3. Detect objects, crop every box immediately, then name the crops. */
      /* Boxes come from the local pixel pass by default; the vision model can
         be chosen in the dashboard when its boxes are better. Either way the
         crops happen immediately and naming is a separate pass. */
      function detectAndCrop(key, entry) {
        patchEntry(key, { status: 'detecting', error: '', warning: '', pieces: [], progress: '' })
        var detector = props.detector || 'python'
        var useModel = detector === 'model'
        var usePython = detector === 'python'
        var progress = function (done, total) {
          patchEntry(key, { progress: done + '/' + total })
        }
        var boxesPromise
        if (usePython) {
          boxesPromise = postJson('/detect-local', { stageId: entry.stageId })
            .then(function (result) {
              return { objects: result.objects || [], engine: result.engine }
            })
            .catch(function (error) {
              return localDetect(entry.url, progress).then(function (objects) {
                return { objects: objects, warning: t.pythonFallback + ' ' + failure(error) }
              })
            })
        } else if (useModel) {
          boxesPromise = postJson('/detect', { stageId: entry.stageId })
            .then(function (result) {
              return { objects: result.objects || [], title: result.title, model: result.model }
            })
            .catch(function (error) {
              return localDetect(entry.url, progress).then(function (objects) {
                return { objects: objects, warning: t.modelFallback + ' ' + failure(error) }
              })
            })
        } else {
          boxesPromise = localDetect(entry.url, progress)
            .then(function (objects) {
              return { objects: objects }
            })
            .catch(function (error) {
              return { objects: [], warning: t.localFailed + ' ' + failure(error) }
            })
        }
        return boxesPromise.then(function (result) {
          var patch = { title: result.title || entry.name, progress: '' }
          if (result.warning) patch.warning = result.warning
          patchEntry(key, patch)
          var objects = result.objects || []
          if (objects.length === 0) {
            patchEntry(key, { status: 'review', pieces: [] })
            return undefined
          }
          var pieces = []
          var chain = Promise.resolve()
          objects.forEach(function (object, index) {
            chain = chain.then(function () {
              return cropPiece(entry.url, object.bbox, object.label, index, objects.length)
                .then(function (piece) {
                  pieces.push(piece)
                })
                .catch(function () {
                  /* a bad box must not abort the rest */
                })
                .then(function () {
                  if ((index + 1) % 20 === 0 || index + 1 === objects.length) {
                    patchEntry(key, { pieces: pieces.slice(), progress: index + 1 + '/' + objects.length })
                    return new Promise(function (resolve) {
                      setTimeout(resolve, 0)
                    })
                  }
                  return undefined
                })
            })
          })
          return chain.then(function () {
            /* Stop here: the user checks the boxes before any model call. */
            patchEntry(key, { pieces: pieces, status: 'review', progress: '' })
          })
        })
      }

      function uploadOne(entry) {
        patchEntry(entry.key, { status: 'staging', error: '' })
        return postJson('/stage', {
          name: entry.name,
          mediaType: entry.mediaType,
          data: entry.data,
          thumb: entry.thumb,
          width: entry.width,
          height: entry.height,
          hash: entry.hash || '',
        })
          .then(function (result) {
            if (result.duplicate) {
              patchEntry(entry.key, {
                status: 'duplicate',
                duplicateName: result.item ? result.item.name : '',
                duplicateId: result.item ? result.item.id : '',
              })
              return undefined
            }
            var staged = Object.assign({}, entry, {
              stageId: result.stageId,
              url: result.url,
              thumbUrl: result.thumbUrl,
              width: result.width,
              height: result.height,
              status: autoAnalyze ? 'detecting' : 'review',
              pieces: [],
            })
            patchEntry(entry.key, {
              stageId: staged.stageId,
              url: staged.url,
              thumbUrl: staged.thumbUrl,
              width: staged.width,
              height: staged.height,
              status: staged.status,
              pieces: [],
              error: '',
            })
            if (!autoAnalyze) return undefined
            return detectAndCrop(entry.key, staged)
          })
          .catch(function (error) {
            patchEntry(entry.key, { status: 'error', error: failure(error) })
          })
      }

      function addFiles(files) {
        var list = []
        for (var index = 0; index < files.length; index += 1) {
          var file = files[index]
          if (!file || !file.type || file.type.indexOf('image/') !== 0) continue
          list.push(file)
        }
        if (list.length === 0) return
        var prepared = list.map(function (file) {
          return {
            key: 'q' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
            status: 'preparing',
            name: String(file.name || '粘贴图片').replace(/\.[^.]+$/, ''),
            pieces: [],
            tagsText: '',
            note: '',
            category: '其他',
            title: '',
            error: '',
            data: '',
            thumb: '',
            width: 0,
            height: 0,
          }
        })
        setQueue(function (previous) {
          return previous.concat(prepared)
        })
        var chain = Promise.resolve()
        list.forEach(function (file, position) {
          chain = chain.then(function () {
            var entry = prepared[position]
            return prepareFile(file)
              .then(function (preparedFile) {
                patchEntry(entry.key, Object.assign({}, preparedFile, { status: 'staging' }))
                var duplicate = null
                var known = (props.snapshot && props.snapshot.items) || []
                for (var index = 0; index < known.length; index += 1) {
                  if (preparedFile.hash && known[index].hash === preparedFile.hash) {
                    duplicate = known[index]
                    break
                  }
                }
                if (duplicate) {
                  patchEntry(entry.key, {
                    status: 'duplicate',
                    duplicateName: duplicate.name,
                    duplicateId: duplicate.id,
                  })
                  return undefined
                }
                return uploadOne(Object.assign({}, entry, preparedFile))
              })
              .catch(function (error) {
                patchEntry(entry.key, { status: 'error', error: failure(error) })
              })
          })
        })
        chain.then(function () {
          refresh()
        })
      }

      React.useEffect(
        function () {
          if (!props.active) return undefined
          function onPaste(event) {
            var items = event.clipboardData && event.clipboardData.items
            if (!items) return
            var files = []
            for (var index = 0; index < items.length; index += 1) {
              if (items[index].kind === 'file') {
                var file = items[index].getAsFile()
                if (file) files.push(file)
              }
            }
            if (files.length > 0) {
              event.preventDefault()
              addFiles(files)
              notify(t.pasted + ' ✓')
            }
          }
          document.addEventListener('paste', onPaste)
          return function () {
            document.removeEventListener('paste', onPaste)
          }
        },
        [props.active, autoAnalyze],
      )

      function commit(entry, wholeOnly) {
        var chosen = wholeOnly
          ? []
          : (entry.pieces || []).filter(function (piece) {
              return piece.selected
            })
        patchEntry(entry.key, { status: 'committing', error: '' })
        postJson('/commit', {
          stageId: entry.stageId,
          source: {
            name: entry.name,
            category: entry.category,
            tags: splitTags(entry.tagsText),
            note: entry.note,
          },
          pieces: chosen.map(function (piece) {
            return {
              pieceId: piece.id,
              name: piece.name,
              category: piece.category,
              tags: piece.tags,
              note: piece.note,
              bbox: piece.bbox,
              w: piece.w,
              h: piece.h,
              data: piece.data,
            }
          }),
        })
          .then(function () {
            patchEntry(entry.key, { status: 'done', saved: chosen.length })
            refresh()
          })
          .catch(function (error) {
            patchEntry(entry.key, { status: 'ready', error: failure(error) })
          })
      }

      function removeEntry(entry) {
        if (entry.stageId && entry.status !== 'done') {
          postJson('/discard', { stageId: entry.stageId }).catch(function () {
            /* removing the card matters more than deleting the staging copy */
          })
        }
        setQueue(function (previous) {
          return previous.filter(function (item) {
            return item.key !== entry.key
          })
        })
      }

      function startDraw(key) {
        setDrawKey(function (current) {
          return current === key ? null : key
        })
        setDrag(null)
      }

      function pointerPosition(event, element) {
        var rect = element.getBoundingClientRect()
        return {
          x: clamp01((event.clientX - rect.left) / Math.max(1, rect.width)),
          y: clamp01((event.clientY - rect.top) / Math.max(1, rect.height)),
        }
      }

      function onStageDown(entry, event) {
        if (drawKey !== entry.key || !entry.url) return
        event.preventDefault()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch (error) {
          /* pointer capture is best effort */
        }
        var point = pointerPosition(event, event.currentTarget)
        setDrag({ key: entry.key, x0: point.x, y0: point.y, x1: point.x, y1: point.y })
      }

      function onStageMove(event) {
        if (!drag) return
        event.preventDefault()
        var point = pointerPosition(event, event.currentTarget)
        setDrag(function (current) {
          if (!current) return current
          return { key: current.key, x0: current.x0, y0: current.y0, x1: point.x, y1: point.y }
        })
      }

      function adjustBox(entry, pieceId, bbox) {
        var current = findEntry(entry.key)
        if (!current || !current.url) return
        cropImage(current.url, bbox, 768)
          .then(function (crop) {
            var latest = findEntry(entry.key)
            if (!latest) return
            patchEntry(entry.key, {
              pieces: (latest.pieces || []).map(function (piece) {
                if (piece.id !== pieceId) return piece
                return Object.assign({}, piece, {
                  bbox: bbox,
                  data: crop.data,
                  w: crop.w,
                  h: crop.h,
                  url: 'data:image/png;base64,' + crop.data,
                })
              }),
            })
          })
          .catch(function () {
            /* cropping a tiny box can fail; nothing to report */
          })
      }

      function addManualBox(entry, bbox) {
        var current = findEntry(entry.key)
        if (!current || !current.url) return
        var index = (current.pieces || []).length
        if (index >= MAX_PIECES) {
          notify(t.tooMany.replace('{n}', String(MAX_PIECES)))
          return
        }
        cropPiece(current.url, bbox, t.manualObject + ' ' + (index + 1), index)
          .then(function (piece) {
            var latest = findEntry(entry.key)
            if (!latest) return
            patchEntry(entry.key, {
              pieces: (latest.pieces || []).concat([piece]),
              status: latest.status === 'ready' ? 'ready' : 'review',
            })
          })
          .catch(function () {
            /* cropping a tiny box can fail; nothing to report */
          })
      }

      function onStageUp(entry, event) {
        if (!drag || drag.key !== entry.key) return
        event.preventDefault()
        var x = Math.min(drag.x0, drag.x1)
        var y = Math.min(drag.y0, drag.y1)
        var w = Math.abs(drag.x1 - drag.x0)
        var hh = Math.abs(drag.y1 - drag.y0)
        setDrag(null)
        if (w < 0.015 || hh < 0.015) return
        addManualBox(entry, roundBox([x, y, w, hh]))
      }

      function stage(entry) {
        var showLabels = (entry.pieces || []).length <= 80
        var boxes = (entry.pieces || []).map(function (piece) {
          return h(
            'span',
            {
              key: piece.id,
              className: 'al-box' + (piece.selected ? '' : ' al-boxOff'),
              style: {
                left: piece.bbox[0] * 100 + '%',
                top: piece.bbox[1] * 100 + '%',
                width: piece.bbox[2] * 100 + '%',
                height: piece.bbox[3] * 100 + '%',
              },
            },
            showLabels ? h('span', { className: 'al-boxLabel' }, piece.name) : null,
          )
        })
        var preview = null
        if (drag && drag.key === entry.key) {
          var left = Math.min(drag.x0, drag.x1)
          var top = Math.min(drag.y0, drag.y1)
          preview = h('span', {
            className: 'al-drawBox',
            style: {
              left: left * 100 + '%',
              top: top * 100 + '%',
              width: Math.abs(drag.x1 - drag.x0) * 100 + '%',
              height: Math.abs(drag.y1 - drag.y0) * 100 + '%',
            },
          })
        }
        return h(
          'div',
          {
            className: 'al-stage' + (drawKey === entry.key ? ' al-stageDraw' : ''),
            onPointerDown: function (event) {
              onStageDown(entry, event)
            },
            onPointerMove: onStageMove,
            onPointerUp: function (event) {
              onStageUp(entry, event)
            },
            onPointerCancel: function () {
              setDrag(null)
            },
            onDoubleClick: function () {
              if (entry.url) setZoomKey(entry.key)
            },
          },
          entry.url
            ? h('img', { src: entry.url, alt: entry.name, draggable: false })
            : h('div', { style: { height: '160px' } }),
          boxes,
          preview,
        )
      }

      function statusOf(entry) {
        var progress = entry.progress ? ' ' + entry.progress : ''
        if (entry.status === 'preparing') return { text: t.preparing, busy: true }
        if (entry.status === 'staging') return { text: t.uploading, busy: true }
        if (entry.status === 'detecting') return { text: t.detecting + progress, busy: true }
        if (entry.status === 'describing') return { text: t.describing + progress + ' · ' + t.describingHint, busy: true }
        if (entry.status === 'committing') return { text: t.committing, busy: true }
        if (entry.status === 'done') return { text: entry.saved > 0 ? t.savedSegments + ' ' + entry.saved : t.savedWhole, busy: false }
        if (entry.status === 'error') return { text: t.failed, busy: false }
        if (entry.status === 'duplicate') return { text: t.duplicate, busy: false }
        if (entry.status === 'review') return { text: t.review + (entry.pieces && entry.pieces.length ? ' · ' + entry.pieces.length : ''), busy: false }
        return { text: t.named, busy: false }
      }

      function pieceRow(entry, piece) {
        var meta = [piece.category].concat(piece.tags || []).filter(Boolean).join(' · ')
        return h(
          'div',
          { key: piece.id, className: 'al-piece' },
          h('img', { className: 'al-pieceThumb', src: piece.url, alt: piece.name, loading: 'lazy' }),
          h(
            'div',
            { className: 'al-pieceBody' },
            h('input', {
              className: 'al-input al-inputWide',
              value: piece.name,
              title: piece.note || piece.name,
              onChange: function (event) {
                var value = event.target.value
                patchEntry(entry.key, function (current) {
                  return {
                    pieces: (current.pieces || []).map(function (item) {
                      return item.id === piece.id ? Object.assign({}, item, { name: value }) : item
                    }),
                  }
                })
              },
            }),
            h('span', { className: 'al-pieceMeta', title: piece.note || meta }, meta || '—'),
          ),
          h('input', {
            type: 'checkbox',
            checked: piece.selected,
            title: t.kindSegment,
            onChange: function () {
              patchEntry(entry.key, function (current) {
                return {
                  pieces: (current.pieces || []).map(function (item) {
                    return item.id === piece.id ? Object.assign({}, item, { selected: !item.selected }) : item
                  }),
                }
              })
            },
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'al-objDel',
              title: t.delete,
              onClick: function () {
                patchEntry(entry.key, function (current) {
                  return {
                    pieces: (current.pieces || []).filter(function (item) {
                      return item.id !== piece.id
                    }),
                  }
                })
              },
            },
            '×',
          ),
        )
      }

      function card(entry) {
        var status = statusOf(entry)
        var isReview = entry.status === 'review'
        var isReady = entry.status === 'ready'
        var isDone = entry.status === 'done'
        var busy = entry.status === 'detecting' || entry.status === 'describing' || entry.status === 'staging' || entry.status === 'committing'
        var pieces = entry.pieces || []
        var pageSize = piecePages[entry.key] || 60
        var visiblePieces = pieces.slice(0, pageSize)
        var selectedCount = pieces.filter(function (piece) {
          return piece.selected
        }).length
        var classes = 'al-item' + (isDone ? ' al-itemDone' : '') + (entry.status === 'error' ? ' al-itemErr' : '')

        return h(
          'div',
          { key: entry.key, className: classes },
          h(
            'div',
            { className: 'al-col' },
            stage(entry),
            entry.url
              ? h(
                  'div',
                  { className: 'al-toolbar' },
                  h(
                    Button,
                    {
                      onClick: function () {
                        startDraw(entry.key)
                      },
                    },
                    drawKey === entry.key ? t.drawOff : t.draw,
                  ),
                  h(
                    Button,
                    {
                      disabled: busy || !entry.stageId,
                      onClick: function () {
                        detectAndCrop(entry.key, entry)
                      },
                    },
                    t.reanalyze,
                  ),
                  h(
                    Button,
                    {
                      onClick: function () {
                        setZoomKey(entry.key)
                      },
                    },
                    t.zoom,
                  ),
                  h('span', { className: 'al-muted' }, pieces.length > 0 ? pieces.length + ' ' + t.segments : ''),
                )
              : null,
          ),
          h(
            'div',
            { className: 'al-col' },
            h(
              'div',
              { className: 'al-toolbar' },
              h(StatusLine, { text: status.text, busy: status.busy }),
              h('span', { className: 'al-spacer' }),
              entry.model ? h('span', { className: 'al-badge' }, entry.model) : null,
              entry.usage
                ? h(
                    'span',
                    { className: 'al-badge', title: t.usageHint },
                    t.usageBadge + ' ' + fmtTokens((entry.usage.inputTokens || 0) + (entry.usage.outputTokens || 0)),
                  )
                : null,
              !isDone ? h(Button, { ghost: true, onClick: function () { removeEntry(entry) } }, t.remove) : null,
            ),
            entry.error ? h('div', { className: 'al-error' }, entry.error) : null,
            entry.warning ? h('div', { className: 'al-warn', style: { marginTop: '2px' } }, entry.warning) : null,
            entry.status === 'duplicate'
              ? h('div', { className: 'al-ok' }, t.duplicateHint + (entry.duplicateName ? ' ' + entry.duplicateName : ''))
              : null,
            isDone
              ? h('div', { className: 'al-ok' }, entry.saved > 0 ? t.savedSegments + ' ' + entry.saved : t.savedWhole)
              : null,
            entry.status === 'error' && entry.data
              ? h(
                  'div',
                  { className: 'al-toolbar' },
                  h(Button, { onClick: function () { uploadOne(entry) } }, t.retry),
                )
              : null,
            entry.status === 'detecting' || entry.status === 'describing'
              ? h('div', { className: 'al-muted' }, entry.status === 'detecting' ? t.detectingHint : t.describingHint)
              : null,
            entry.url && entry.status !== 'done'
              ? h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'al-row2' },
                    h(
                      'div',
                      { className: 'al-field' },
                      h('span', { className: 'al-fieldLabel' }, t.nameLabel),
                      h('input', {
                        className: 'al-input al-inputWide',
                        value: entry.name,
                        onChange: function (event) {
                          patchEntry(entry.key, { name: event.target.value })
                        },
                      }),
                    ),
                    h(
                      'div',
                      { className: 'al-field' },
                      h('span', { className: 'al-fieldLabel' }, t.categoryLabel),
                      h('input', {
                        className: 'al-input al-inputWide',
                        value: entry.category,
                        list: 'al-categories',
                        onChange: function (event) {
                          patchEntry(entry.key, { category: event.target.value })
                        },
                        title: t.categoryHint,
                      }),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'al-row2' },
                    h(
                      'div',
                      { className: 'al-field' },
                      h('span', { className: 'al-fieldLabel' }, t.tagsLabel),
                      h('input', {
                        className: 'al-input al-inputWide',
                        value: entry.tagsText,
                        placeholder: t.tagsHint,
                        onChange: function (event) {
                          patchEntry(entry.key, { tagsText: event.target.value })
                        },
                      }),
                    ),
                    h(
                      'div',
                      { className: 'al-field' },
                      h('span', { className: 'al-fieldLabel' }, t.noteLabel),
                      h('input', {
                        className: 'al-input al-inputWide',
                        value: entry.note,
                        onChange: function (event) {
                          patchEntry(entry.key, { note: event.target.value })
                        },
                      }),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'al-field' },
                    h(
                      'span',
                      { className: 'al-fieldLabel' },
                      t.piecesTitle + ' (' + selectedCount + '/' + pieces.length + ')',
                    ),
                    pieces.length === 0
                      ? h('div', { className: 'al-muted' }, entry.status === 'detecting' ? t.detectingHint : t.noObjects)
                      : h(
                          'div',
                          { className: 'al-pieceList' },
                          visiblePieces.map(function (piece) {
                            return pieceRow(entry, piece)
                          }),
                          pieces.length > visiblePieces.length
                            ? h(
                                'div',
                                { className: 'al-toolbar', style: { justifyContent: 'center', padding: '4px' } },
                                h(
                                  Button,
                                  {
                                    onClick: function () {
                                      setPiecePages(function (current) {
                                        var next = Object.assign({}, current)
                                        next[entry.key] = (current[entry.key] || 60) + 120
                                        return next
                                      })
                                    },
                                  },
                                  t.loadMore + ' (' + (pieces.length - visiblePieces.length) + ')',
                                ),
                              )
                            : null,
                        ),
                  ),
                  isReview
                    ? h(
                        'div',
                        { className: 'al-toolbar' },
                        h(
                          'span',
                          { className: 'al-muted' },
                          pieces.length > NAMING_CAP
                            ? t.namingCapHint.replace('{cap}', String(NAMING_CAP)).replace('{n}', String(pieces.length))
                            : t.reviewHint,
                        ),
                        h('span', { className: 'al-spacer' }),
                        pieces.length > 0
                          ? h(
                              Button,
                              {
                                primary: true,
                                onClick: function () {
                                  describe(entry.key, entry.stageId, pieces)
                                },
                              },
                              t.aiName +
                                ' (' +
                                Math.min(pieces.length, NAMING_CAP) +
                                (pieces.length > NAMING_CAP ? '/' + pieces.length : '') +
                                ')',
                            )
                          : null,
                        h(
                          Button,
                          {
                            onClick: function () {
                              commit(entry, true)
                            },
                          },
                          t.commitWhole,
                        ),
                      )
                    : null,
                  isReady
                    ? h(
                        'div',
                        { className: 'al-toolbar' },
                        selectedCount > 0
                          ? h(
                              Button,
                              {
                                primary: true,
                                onClick: function () {
                                  commit(entry, false)
                                },
                              },
                              t.confirmImport + ' (' + selectedCount + ')',
                            )
                          : null,
                        h(
                          Button,
                          {
                            onClick: function () {
                              commit(entry, true)
                            },
                          },
                          t.commitWhole,
                        ),
                        pieces.length > 0
                          ? h(
                              Button,
                              {
                                onClick: function () {
                                  describe(entry.key, entry.stageId, pieces)
                                },
                              },
                              t.renameAi +
                                ' (' +
                                Math.min(pieces.length, NAMING_CAP) +
                                (pieces.length > NAMING_CAP ? '/' + pieces.length : '') +
                                ')',
                            )
                          : null,
                      )
                    : null,
                )
              : null,
            isDone
              ? h(
                  'div',
                  { className: 'al-toolbar' },
                  h(
                    Button,
                    {
                      onClick: function () {
                        props.onBrowse()
                      },
                    },
                    t.toLibrary,
                  ),
                )
              : null,
          ),
        )
      }

      var doneCount = queue.filter(function (entry) {
        return entry.status === 'done'
      }).length
      var zoomEntry = zoomKey ? findEntry(zoomKey) : null

      return h(
        'div',
        { className: 'al-fadeIn' },
        h(
          'div',
          { className: 'al-section', style: { marginTop: 0 } },
          h(
            'div',
            { className: 'al-toolbar' },
            h('div', { className: 'al-sectionTitle' }, t.importTitle),
            h('span', { className: 'al-spacer' }),
            h(Switch, {
              checked: autoAnalyze,
              label: t.autoAnalyze,
              onChange: function () {
                setAutoAnalyze(!autoAnalyze)
              },
            }),
            doneCount > 0
              ? h(
                  Button,
                  {
                    onClick: function () {
                      setQueue(function (previous) {
                        return previous.filter(function (entry) {
                          return entry.status !== 'done'
                        })
                      })
                    },
                  },
                  t.clearDone,
                )
              : null,
          ),
          h('div', { className: 'al-muted' }, t.importHint),
          h(
            'div',
            {
              className: 'al-drop' + (over ? ' al-dropOver' : ''),
              onClick: function () {
                if (fileInput.current) fileInput.current.click()
              },
              onDragEnter: function (event) {
                event.preventDefault()
                dragDepth.current += 1
                setOver(true)
              },
              onDragOver: function (event) {
                event.preventDefault()
              },
              onDragLeave: function (event) {
                event.preventDefault()
                dragDepth.current = Math.max(0, dragDepth.current - 1)
                if (dragDepth.current === 0) setOver(false)
              },
              onDrop: function (event) {
                event.preventDefault()
                dragDepth.current = 0
                setOver(false)
                var files = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : []
                addFiles(files)
              },
            },
            h('span', null, t.dropHere),
            h('span', { className: 'al-muted' }, 'PNG · JPG · WEBP · GIF'),
            h(
              'span',
              { className: 'al-toolbar' },
              h(
                Button,
                {
                  onClick: function (event) {
                    event.stopPropagation()
                    if (fileInput.current) fileInput.current.click()
                  },
                },
                t.chooseFiles,
              ),
            ),
          ),
          h('input', {
            ref: fileInput,
            type: 'file',
            accept: 'image/*',
            multiple: true,
            style: { display: 'none' },
            onChange: function (event) {
              var files = event.target.files
              if (files && files.length > 0) addFiles(files)
              event.target.value = ''
            },
          }),
        ),
        queue.length === 0
          ? h('div', { className: 'al-empty', style: { marginTop: '14px' } }, t.queueEmpty)
          : h('div', { className: 'al-queue' }, queue.map(card)),
        zoomEntry
          ? h(StageZoom, {
              t: t,
              entry: zoomEntry,
              onAdd: function (bbox) {
                addManualBox(zoomEntry, bbox)
              },
              onAdjust: function (pieceId, bbox) {
                adjustBox(zoomEntry, pieceId, bbox)
              },
              onClose: function () {
                setZoomKey(null)
              },
            })
          : null,
      )
    }

    /* ── enlarged box drawing (manual segmentation) ───────────────────── */

    function StageZoom(props) {
      var t = props.t
      var entry = props.entry
      var [drag, setDrag] = React.useState(null)
      var [edit, setEdit] = React.useState(null)
      var stageRef = React.useRef(null)
      var aspect = entry.width > 0 && entry.height > 0 ? entry.width / entry.height : 4 / 3

      React.useEffect(
        function () {
          function onKey(event) {
            if (event.key === 'Escape') props.onClose()
          }
          document.addEventListener('keydown', onKey)
          return function () {
            document.removeEventListener('keydown', onKey)
          }
        },
        [props.onClose],
      )

      function point(event) {
        var element = stageRef.current
        var rect = (element || event.currentTarget).getBoundingClientRect()
        return {
          x: clamp01((event.clientX - rect.left) / Math.max(1, rect.width)),
          y: clamp01((event.clientY - rect.top) / Math.max(1, rect.height)),
        }
      }

      /* Moving a box, or dragging its corner handle, re-crops on release. */
      function beginEdit(piece, mode, event) {
        event.preventDefault()
        event.stopPropagation()
        var stage = stageRef.current
        if (!stage) return
        try {
          stage.setPointerCapture(event.pointerId)
        } catch (error) {
          /* best effort */
        }
        var at = point(event)
        setEdit({
          id: piece.id,
          mode: mode,
          startX: at.x,
          startY: at.y,
          origin: piece.bbox.slice(),
          preview: piece.bbox.slice(),
        })
      }

      function moveEdit(event) {
        var at = point(event)
        var dx = at.x - edit.startX
        var dy = at.y - edit.startY
        var origin = edit.origin
        var next
        if (edit.mode === 'move') {
          var x = Math.min(Math.max(0, origin[0] + dx), Math.max(0, 1 - origin[2]))
          var y = Math.min(Math.max(0, origin[1] + dy), Math.max(0, 1 - origin[3]))
          next = [roundUnit(x), roundUnit(y), origin[2], origin[3]]
        } else {
          var w = Math.min(Math.max(0.02, origin[2] + dx), 1 - origin[0])
          var h = Math.min(Math.max(0.02, origin[3] + dy), 1 - origin[1])
          next = [origin[0], origin[1], roundUnit(w), roundUnit(h)]
        }
        setEdit(function (current) {
          return current ? Object.assign({}, current, { preview: next }) : current
        })
      }

      function finishEdit() {
        if (!edit) return
        var bbox = edit.preview
        var origin = edit.origin
        var changed =
          Math.abs(bbox[0] - origin[0]) +
            Math.abs(bbox[1] - origin[1]) +
            Math.abs(bbox[2] - origin[2]) +
            Math.abs(bbox[3] - origin[3]) >
          0.001
        var id = edit.id
        setEdit(null)
        if (changed && typeof props.onAdjust === 'function') props.onAdjust(id, bbox)
      }

      function down(event) {
        event.preventDefault()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch (error) {
          /* best effort */
        }
        var at = point(event)
        setDrag({ x0: at.x, y0: at.y, x1: at.x, y1: at.y })
      }

      function move(event) {
        if (edit) {
          event.preventDefault()
          moveEdit(event)
          return
        }
        if (!drag) return
        event.preventDefault()
        var at = point(event)
        setDrag(function (current) {
          if (!current) return current
          return { x0: current.x0, y0: current.y0, x1: at.x, y1: at.y }
        })
      }

      function up(event) {
        if (edit) {
          event.preventDefault()
          finishEdit()
          return
        }
        if (!drag) return
        event.preventDefault()
        var x = Math.min(drag.x0, drag.x1)
        var y = Math.min(drag.y0, drag.y1)
        var w = Math.abs(drag.x1 - drag.x0)
        var h = Math.abs(drag.y1 - drag.y0)
        setDrag(null)
        if (w < 0.01 || h < 0.01) return
        props.onAdd(roundBox([x, y, w, h]))
      }

      var boxes = (entry.pieces || []).map(function (piece) {
        var editing = edit && edit.id === piece.id
        var bbox = editing ? edit.preview : piece.bbox
        return h(
          'span',
          {
            key: piece.id,
            className: 'al-box al-boxEditable' + (piece.selected ? '' : ' al-boxOff') + (editing ? ' al-boxActive' : ''),
            style: {
              left: bbox[0] * 100 + '%',
              top: bbox[1] * 100 + '%',
              width: bbox[2] * 100 + '%',
              height: bbox[3] * 100 + '%',
            },
            onPointerDown: function (event) {
              beginEdit(piece, 'move', event)
            },
          },
          h('span', { className: 'al-boxLabel' }, piece.name),
          h('span', {
            className: 'al-boxHandle',
            onPointerDown: function (event) {
              beginEdit(piece, 'resize', event)
            },
          }),
        )
      })
      var preview = null
      if (drag) {
        preview = h('span', {
          className: 'al-drawBox',
          style: {
            left: Math.min(drag.x0, drag.x1) * 100 + '%',
            top: Math.min(drag.y0, drag.y1) * 100 + '%',
            width: Math.abs(drag.x1 - drag.x0) * 100 + '%',
            height: Math.abs(drag.y1 - drag.y0) * 100 + '%',
          },
        })
      }

      return h(
        'div',
        {
          className: 'al-modal al-zoomModal',
          onMouseDown: function (event) {
            if (event.target === event.currentTarget) props.onClose()
          },
        },
        h(
          'div',
          { className: 'al-zoomDialog' },
          h(
            'div',
            { className: 'al-dialogHead' },
            h('span', { style: { fontWeight: 600 } }, t.zoomTitle),
            h('span', { className: 'al-badge' }, (entry.pieces || []).length + ' ' + t.segments),
            h('span', { className: 'al-spacer' }),
            h(Button, { ghost: true, onClick: props.onClose }, '✕'),
          ),
          h(
            'div',
            { className: 'al-zoomBody' },
            h(
              'div',
              {
                className: 'al-zoomStage',
                /* A definite width + matching aspect keeps the overlay boxes
                   exactly on the rendered image instead of a stretched frame. */
                style: {
                  aspectRatio: String(aspect),
                  width: 'min(100%, calc(74vh * ' + aspect + '))',
                },
                ref: stageRef,
                onPointerDown: down,
                onPointerMove: move,
                onPointerUp: up,
                onPointerCancel: function () {
                  setDrag(null)
                  setEdit(null)
                },
              },
              h('img', {
                src: entry.url,
                alt: entry.name,
                draggable: false,
                style: { width: '100%', height: '100%', objectFit: 'fill' },
              }),
              boxes,
              preview,
            ),
          ),
          h(
            'div',
            { className: 'al-dialogFoot' },
            h('span', { className: 'al-muted' }, t.zoomHint),
            h('span', { className: 'al-spacer' }),
            h(Button, { primary: true, onClick: props.onClose }, t.close),
          ),
        ),
      )
    }

    /* ── detail dialog ────────────────────────────────────────────────── */

    function DetailDialog(props) {
      var t = props.t
      var item = props.item
      var [draft, setDraft] = React.useState({
        name: item.name,
        category: item.category,
        tagsText: item.tags.join(' '),
        note: item.note,
      })
      var [busy, setBusy] = React.useState(false)
      var [confirming, setConfirming] = React.useState(false)
      var [error, setError] = React.useState('')

      React.useEffect(
        function () {
          setDraft({ name: item.name, category: item.category, tagsText: item.tags.join(' '), note: item.note })
          setError('')
          setConfirming(false)
        },
        [item.id],
      )

      React.useEffect(
        function () {
          function onKey(event) {
            if (event.key === 'Escape') props.onClose()
          }
          document.addEventListener('keydown', onKey)
          return function () {
            document.removeEventListener('keydown', onKey)
          }
        },
        [props.onClose],
      )

      function save() {
        setBusy(true)
        setError('')
        postJson('/update', {
          id: item.id,
          patch: {
            name: draft.name,
            category: draft.category,
            tags: splitTags(draft.tagsText),
            note: draft.note,
          },
        })
          .then(function () {
            props.onSaved(t.saved)
            props.onClose()
            props.refresh()
          })
          .catch(function (reason) {
            setError(String((reason && reason.message) || reason))
          })
          .then(function () {
            setBusy(false)
          })
      }

      function remove() {
        setBusy(true)
        postJson('/delete', { ids: [item.id] })
          .then(function () {
            props.onSaved(t.delete + ' ✓')
            props.onClose()
            props.refresh()
          })
          .catch(function (reason) {
            setError(String((reason && reason.message) || reason))
          })
          .then(function () {
            setBusy(false)
          })
      }

      return h(
        'div',
        {
          className: 'al-modal',
          onMouseDown: function (event) {
            if (event.target === event.currentTarget) props.onClose()
          },
        },
        h(
          'div',
          { className: 'al-dialog' },
          h(
            'div',
            { className: 'al-dialogHead' },
            h('span', { style: { fontWeight: 600 } }, t.detailTitle),
            h('span', { className: 'al-badge' }, item.kind === 'segment' ? t.kindSegment : t.kindOriginal),
            h('span', { className: 'al-spacer' }),
            h(Button, { ghost: true, onClick: props.onClose }, '✕'),
          ),
          h(
            'div',
            { className: 'al-dialogBody' },
            h('div', { className: 'al-preview' }, h('img', { src: item.url, alt: item.name })),
            h(
              'div',
              { className: 'al-col' },
              h(
                'div',
                { className: 'al-field' },
                h('span', { className: 'al-fieldLabel' }, t.nameLabel),
                h('input', {
                  className: 'al-input al-inputWide',
                  value: draft.name,
                  onChange: function (event) {
                    setDraft(Object.assign({}, draft, { name: event.target.value }))
                  },
                }),
              ),
              h(
                'div',
                { className: 'al-field' },
                h('span', { className: 'al-fieldLabel' }, t.categoryLabel),
                h('input', {
                  className: 'al-input al-inputWide',
                  value: draft.category,
                  list: 'al-categories',
                  onChange: function (event) {
                    setDraft(Object.assign({}, draft, { category: event.target.value }))
                  },
                }),
              ),
              h(
                'div',
                { className: 'al-field' },
                h('span', { className: 'al-fieldLabel' }, t.tagsLabel),
                h('input', {
                  className: 'al-input al-inputWide',
                  value: draft.tagsText,
                  placeholder: t.tagsHint,
                  onChange: function (event) {
                    setDraft(Object.assign({}, draft, { tagsText: event.target.value }))
                  },
                }),
              ),
              h(
                'div',
                { className: 'al-field' },
                h('span', { className: 'al-fieldLabel' }, t.noteLabel),
                h('input', {
                  className: 'al-input al-inputWide',
                  value: draft.note,
                  onChange: function (event) {
                    setDraft(Object.assign({}, draft, { note: event.target.value }))
                  },
                }),
              ),
              h(
                'div',
                { className: 'al-infoGrid' },
                h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, t.size), h('span', { className: 'al-infoValue' }, item.w + ' × ' + item.h)),
                h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, t.created), h('span', { className: 'al-infoValue' }, fmtDate(item.createdAt))),
                h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, t.path), h('span', { className: 'al-infoValue', title: item.path }, item.path)),
                item.sourceId
                  ? h('div', { className: 'al-info' }, h('span', { className: 'al-infoLabel' }, t.source), h('span', { className: 'al-infoValue' }, item.sourceId))
                  : null,
              ),
              error ? h('div', { className: 'al-error' }, error) : null,
            ),
          ),
          h(
            'div',
            { className: 'al-dialogFoot' },
            h(Button, { primary: true, disabled: busy, onClick: save }, busy ? '…' : t.save),
            h(
              Button,
              {
                onClick: function () {
                  copyText(item.path)
                    .then(function () {
                      props.onSaved(t.copied)
                    })
                    .catch(function () {
                      /* clipboard unavailable */
                    })
                },
              },
              t.copyPath,
            ),
            h('span', { className: 'al-spacer' }),
            confirming
              ? h(
                  'span',
                  { className: 'al-toolbar' },
                  h('span', { className: 'al-muted' }, t.deleteConfirm),
                  h(Button, { danger: true, disabled: busy, onClick: remove }, t.confirm),
                  h(Button, { ghost: true, onClick: function () { setConfirming(false) } }, t.cancel),
                )
              : h(Button, { danger: true, onClick: function () { setConfirming(true) } }, t.delete),
          ),
        ),
      )
    }

    /* ── setup / path dialog ──────────────────────────────────────────── */

    function PathDialog(props) {
      var t = props.t
      var [value, setValue] = React.useState(props.initial || '')
      var [error, setError] = React.useState('')
      var [busy, setBusy] = React.useState(false)

      function browse() {
        pickFolder(props.ctx)
          .then(function (picked) {
            if (picked) setValue(picked)
          })
          .catch(function () {
            setError(t.browseUnavailable)
          })
      }

      function submit() {
        var path = value.trim()
        if (!path) {
          setError(t.pathRequired)
          return
        }
        setBusy(true)
        setError('')
        props
          .onSubmit(path)
          .then(function () {
            setBusy(false)
          })
          .catch(function (reason) {
            setBusy(false)
            setError(String((reason && reason.message) || reason))
          })
      }

      React.useEffect(
        function () {
          function onKey(event) {
            if (event.key === 'Escape') props.onClose()
          }
          document.addEventListener('keydown', onKey)
          return function () {
            document.removeEventListener('keydown', onKey)
          }
        },
        [props.onClose],
      )

      return h(
        'div',
        {
          className: 'al-modal',
          onMouseDown: function (event) {
            if (event.target === event.currentTarget) props.onClose()
          },
        },
        h(
          'div',
          { className: 'al-dialog', style: { width: 'min(620px,100%)' } },
          h(
            'div',
            { className: 'al-dialogHead' },
            h('span', { style: { fontWeight: 600 } }, props.title),
            h('span', { className: 'al-spacer' }),
            props.onClose ? h(Button, { ghost: true, onClick: props.onClose }, '✕') : null,
          ),
          h(
            'div',
            { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' } },
            props.description ? h('div', { className: 'al-muted' }, props.description) : null,
            h('span', { className: 'al-fieldLabel' }, t.setupPathLabel),
            h('input', {
              className: 'al-input al-inputWide',
              value: value,
              placeholder: t.setupPathPlaceholder,
              onChange: function (event) {
                setValue(event.target.value)
              },
              onKeyDown: function (event) {
                if (event.key === 'Enter') submit()
              },
            }),
            h(
              'div',
              { className: 'al-toolbar' },
              h(Button, { onClick: browse }, t.chooseFolder),
              props.defaultPath
                ? h(
                    Button,
                    {
                      onClick: function () {
                        setValue(props.defaultPath)
                      },
                    },
                    t.setupUseDefault,
                  )
                : null,
              h('span', { className: 'al-spacer' }),
              h(Button, { primary: true, disabled: busy, onClick: submit }, busy ? t.setupWorking : props.confirmLabel || t.confirm),
            ),
            error ? h('div', { className: 'al-error' }, error) : null,
          ),
        ),
      )
    }

    /* ── panel ────────────────────────────────────────────────────────── */

    function Panel(props) {
      var ctx = props.ctx
      var lang = useLang(ctx)
      var t = messageOf(lang)
      var state = React.useState(null)
      var snapshot = state[0]
      var setSnapshot = state[1]
      var loadingState = React.useState(true)
      var loading = loadingState[0]
      var setLoading = loadingState[1]
      var errorState = React.useState('')
      var error = errorState[0]
      var setError = errorState[1]
      var viewState = React.useState('dashboard')
      var view = viewState[0]
      var setView = viewState[1]
      var categoryState = React.useState(null)
      var category = categoryState[0]
      var setCategory = categoryState[1]
      var treeState = React.useState({})
      var expanded = treeState[0]
      var setExpanded = treeState[1]
      var detailState = React.useState(null)
      var detail = detailState[0]
      var setDetail = detailState[1]
      var noticeState = React.useState(null)
      var notice = noticeState[0]
      var setNotice = noticeState[1]
      var pathDialogState = React.useState(false)
      var pathDialog = pathDialogState[0]
      var setPathDialog = pathDialogState[1]
      var menuState = React.useState(null)
      var menu = menuState[0]
      var setMenu = menuState[1]
      var catDialogState = React.useState(null)
      var catDialog = catDialogState[0]
      var setCatDialog = catDialogState[1]
      var queryState = React.useState('')
      var query = queryState[0]
      var setQuery = queryState[1]
      var kindState = React.useState('all')
      var kind = kindState[0]
      var setKind = kindState[1]
      var tagState = React.useState([])
      var activeTags = tagState[0]
      var setActiveTags = tagState[1]
      var limitState = React.useState(60)
      var limit = limitState[0]
      var setLimit = limitState[1]
      var queueState = React.useState([])
      var queue = queueState[0]
      var setQueue = queueState[1]
      var autoState = React.useState(true)
      var autoAnalyze = autoState[0]
      var setAutoAnalyze = autoState[1]

      var refresh = React.useCallback(function () {
        return request('/state')
          .then(function (next) {
            setSnapshot(next)
            setError('')
            return next
          })
          .catch(function (reason) {
            setError(String((reason && reason.message) || reason))
            return null
          })
          .then(function (result) {
            setLoading(false)
            return result
          })
      }, [])

      React.useEffect(
        function () {
          refresh()
        },
        [refresh],
      )

      React.useEffect(
        function () {
          if (!notice) return undefined
          var timer = setTimeout(function () {
            setNotice(null)
          }, 2600)
          return function () {
            clearTimeout(timer)
          }
        },
        [notice],
      )

      var notify = React.useCallback(function (text) {
        setNotice(String(text || ''))
      }, [])

      function toggleEnabled() {
        if (!snapshot) return
        postJson('/config', { enabled: !snapshot.enabled })
          .then(function (next) {
            setSnapshot(next)
            setNotice(next.enabled ? t.enabled : t.disabled)
          })
          .catch(function (reason) {
            setError(String((reason && reason.message) || reason))
          })
      }

      function selectView(next) {
        setView(next)
      }

      function openCategory(key) {
        setCategory(key)
        setView('library')
        setLimit(60)
      }

      function savePath(path) {
        return postJson('/config', { libraryPath: path }).then(function (next) {
          setSnapshot(next)
          setPathDialog(false)
          setNotice(t.pathSaved)
        })
      }

      function saveModel(value) {
        var parts = String(value || '').split('::')
        if (parts.length !== 2) return
        postJson('/config', { analysis: { provider: parts[0], model: parts[1] } })
          .then(function (next) {
            setSnapshot(next)
            notify(t.modelSaved)
          })
          .catch(function (reason) {
            setError(String((reason && reason.message) || reason))
          })
      }

      function saveDetector(value) {
        postJson('/config', { detector: value })
          .then(function (next) {
            setSnapshot(next)
            notify(t.detectorSaved)
          })
          .catch(function (reason) {
            setError(String((reason && reason.message) || reason))
          })
      }

      function submitCategoryCreate(name) {
        var dialog = catDialog
        if (!dialog) return Promise.resolve()
        var trimmed = String(name || '').trim().slice(0, 8)
        if (!trimmed) return Promise.reject(new Error(t.pathRequired))
        var parent = dialog.parent || ''
        return postJson('/category', { action: 'create', path: parent + trimmed }).then(function (result) {
          if (parent) {
            var key = parent.replace(/\/$/, '')
            setExpanded(function (current) {
              var next = Object.assign({}, current)
              next[key] = true
              return next
            })
          }
          setCatDialog(null)
          notify(t.categoryCreated + ' ' + (result.path || parent + trimmed))
          refresh()
        })
      }

      function submitCategoryRename(name) {
        var dialog = catDialog
        if (!dialog) return Promise.resolve()
        var trimmed = String(name || '').trim().slice(0, 8)
        if (!trimmed) return Promise.reject(new Error(t.pathRequired))
        var parent = dialog.path.indexOf('/') >= 0 ? dialog.path.split('/')[0] + '/' : ''
        var nextPath = parent + trimmed
        return postJson('/category', { action: 'rename', from: dialog.path, to: nextPath }).then(function (result) {
          if (category === dialog.path || (category && category.indexOf(dialog.path + '/') === 0)) {
            setCategory(nextPath)
          }
          setCatDialog(null)
          notify(t.categoryRenamed + ' (' + (result.updated || 0) + ')')
          refresh()
        })
      }

      function submitCategoryDelete() {
        var dialog = catDialog
        if (!dialog) return Promise.resolve()
        return postJson('/category', { action: 'delete', path: dialog.path }).then(function (result) {
          if (category === dialog.path || (category && category.indexOf(dialog.path + '/') === 0)) {
            setCategory(null)
          }
          setCatDialog(null)
          notify(t.categoryDeleted + ' (' + (result.moved || 0) + ')')
          refresh()
        })
      }

      function activeModelValue() {
        if (!snapshot) return ''
        if (snapshot.analysis && snapshot.analysis.provider && snapshot.analysis.model) {
          return snapshot.analysis.provider + '::' + snapshot.analysis.model
        }
        var models = snapshot.models || []
        var vision = null
        for (var index = 0; index < models.length; index += 1) {
          if (models[index].image) {
            vision = models[index]
            break
          }
        }
        return vision ? vision.provider + '::' + vision.model : ''
      }

      function modelText() {
        var value = activeModelValue()
        if (!value) return ''
        return value.split('::').join(' / ')
      }

      var categories = (snapshot && snapshot.tree) || []
      var items = (snapshot && snapshot.items) || []
      var hasVision = false
      if (snapshot && snapshot.models) {
        for (var index = 0; index < snapshot.models.length; index += 1) {
          if (snapshot.models[index].image) {
            hasVision = true
            break
          }
        }
      }

      if (loading) {
        return h(
          'div',
          { className: 'al-root' },
          h('style', null, CSS),
          h('div', { style: { padding: '32px' } }, h(StatusLine, { text: t.title + ' …', busy: true })),
        )
      }

      if (!snapshot) {
        return h(
          'div',
          { className: 'al-root' },
          h('style', null, CSS),
          h(
            'div',
            { style: { padding: '28px' } },
            h('div', { className: 'al-error' }, t.loadFailed + (error ? '：' + error : '')),
            h('div', { style: { marginTop: '10px' } }, h(Button, { onClick: refresh }, t.refresh)),
          ),
        )
      }

      var header = h(
        'div',
        { className: 'al-head' },
        h(
          'div',
          { className: 'al-headRow' },
          h('span', { className: 'al-title' }, t.title),
          h('span', { className: 'al-sub' }, t.subtitle),
          h('span', { className: 'al-spacer' }),
          h(Switch, {
            checked: snapshot.enabled === true,
            label: snapshot.enabled ? t.enabled : t.disabled,
            title: t.enableHint,
            onChange: toggleEnabled,
          }),
          h(Button, { onClick: refresh, title: t.refresh }, '↻'),
        ),
        h(
          'div',
          { className: 'al-headRow' },
          h(
            'div',
            { className: 'al-tabs' },
            [
              ['dashboard', t.dashboard],
              ['library', t.library],
              ['import', t.import],
            ].map(function (entry) {
              return h(
                'button',
                {
                  key: entry[0],
                  type: 'button',
                  className: 'al-tab' + (view === entry[0] ? ' al-tabOn' : ''),
                  onClick: function () {
                    selectView(entry[0])
                  },
                },
                entry[1],
                entry[0] === 'import' && queue.length > 0
                  ? h('span', { className: 'al-badge', style: { marginLeft: '5px' } }, String(queue.length))
                  : null,
              )
            }),
          ),
          h('span', { className: 'al-spacer' }),
          snapshot.configured
            ? h(
                'span',
                { className: 'al-chip', title: snapshot.libraryPath },
                h('span', { className: 'al-dot' + (snapshot.enabled ? ' al-dotOn' : '') }),
                h('span', { className: 'al-chipPath' }, snapshot.libraryPath),
              )
            : null,
          snapshot.configured
            ? h(
                Button,
                {
                  onClick: function () {
                    setPathDialog(true)
                  },
                },
                t.changePath,
              )
            : null,
        ),
      )

      var content = null

      if (!snapshot.configured) {
        content = h(
          'div',
          { className: 'al-main' },
          h(
            'div',
            { className: 'al-section', style: { marginTop: 0, maxWidth: '760px' } },
            h('div', { className: 'al-sectionTitle' }, t.setupTitle),
            h('div', { className: 'al-muted' }, t.setupBody),
            h(
              'div',
              { style: { marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' } },
              h(
                'div',
                { className: 'al-toolbar' },
                h(Button, { primary: true, onClick: function () { setPathDialog(true) } }, t.chooseFolder),
                snapshot.defaultPath
                  ? h(
                      Button,
                      {
                        onClick: function () {
                          savePath(snapshot.defaultPath).catch(function (reason) {
                            setError(String((reason && reason.message) || reason))
                          })
                        },
                      },
                      t.setupUseDefault,
                    )
                  : null,
              ),
              error ? h('div', { className: 'al-error' }, error) : null,
            ),
          ),
        )
      } else {
        content = h(
          'div',
          { className: 'al-body' },
          h(
            'div',
            { className: 'al-side' },
            h(CategoryTree, {
              t: t,
              tree: categories,
              selected: category,
              expanded: expanded,
              onToggle: function (key, open) {
                setExpanded(function (current) {
                  var next = Object.assign({}, current)
                  next[key] = open
                  return next
                })
              },
              onSelect: function (key) {
                setCategory(key)
              },
              onEnter: function (key) {
                openCategory(key)
              },
              onMenu: function (path, x, y) {
                setMenu({ path: path, x: x, y: y })
              },
              onCreate: function (parent) {
                setCatDialog({ mode: 'create', parent: parent ? parent + '/' : '' })
              },
            }),
          ),
          h(
            'div',
            { className: 'al-main' },
            error ? h('div', { className: 'al-error', style: { marginBottom: '10px' } }, error) : null,
            snapshot.error ? h('div', { className: 'al-error', style: { marginBottom: '10px' } }, snapshot.error) : null,
            !hasVision && snapshot.enabled
              ? h('div', { className: 'al-warn', style: { marginBottom: '10px' } }, t.noModelWarn)
              : null,
            h(
              'div',
              { style: { display: view === 'dashboard' ? 'block' : 'none' } },
              h(Dashboard, {
                t: t,
                snapshot: snapshot,
                modelText: modelText(),
                onOpen: function (item) {
                  setDetail(item)
                },
              }),
              h(
                'div',
                { className: 'al-section' },
                h('div', { className: 'al-sectionTitle' }, t.detectorLabel),
                h('div', { className: 'al-muted' }, t.detectorHint),
                h(
                  'div',
                  { className: 'al-toolbar', style: { marginTop: '4px' } },
                  h(
                    'select',
                    {
                      className: 'al-input al-select',
                      value: snapshot.detector || 'python',
                      onChange: function (event) {
                        saveDetector(event.target.value)
                      },
                    },
                    h('option', { value: 'python' }, t.detectorPython),
                    h('option', { value: 'local' }, t.detectorLocal),
                    h('option', { value: 'model' }, t.detectorModel),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'al-section' },
                h('div', { className: 'al-sectionTitle' }, t.modelLabel),
                h('div', { className: 'al-muted' }, t.modelHint),
                h(
                  'div',
                  { className: 'al-toolbar', style: { marginTop: '4px' } },
                  h(
                    'select',
                    {
                      className: 'al-input al-select',
                      value: activeModelValue(),
                      onChange: function (event) {
                        saveModel(event.target.value)
                      },
                    },
                    (snapshot.models || []).length === 0 ? h('option', { value: '' }, t.modelNone) : null,
                    (snapshot.models || []).map(function (model) {
                      var value = model.provider + '::' + model.model
                      return h(
                        'option',
                        { key: value, value: value },
                        (model.image ? '视觉 · ' : '') + model.provider + ' / ' + model.label,
                      )
                    }),
                  ),
                ),
                h(
                  'div',
                  { className: 'al-toolbar', style: { marginTop: '6px' } },
                  h(
                    Button,
                    {
                      onClick: function () {
                        copyText(snapshot.libraryPath).then(function () {
                          notify(t.copied)
                        })
                      },
                    },
                    t.copyPath,
                  ),
                  h(
                    Button,
                    {
                      onClick: function () {
                        selectView('import')
                      },
                    },
                    t.import,
                  ),
                  h(
                    Button,
                    {
                      onClick: function () {
                        selectView('library')
                      },
                    },
                    t.library,
                  ),
                ),
              ),
            ),
            h(
              'div',
              { style: { display: view === 'library' ? 'block' : 'none' } },
              h(LibraryView, {
                t: t,
                items: items,
                tags: snapshot.tags || [],
                category: category,
                kind: kind,
                query: query,
                activeTags: activeTags,
                limit: limit,
                refresh: refresh,
                notify: notify,
                onQuery: setQuery,
                onKind: setKind,
                onToggleTag: function (name) {
                  setActiveTags(function (current) {
                    return current.indexOf(name) >= 0
                      ? current.filter(function (value) {
                          return value !== name
                        })
                      : current.concat([name])
                  })
                },
                onClearTags: function () {
                  setActiveTags([])
                },
                onCategory: setCategory,
                onMore: function () {
                  setLimit(limit + 60)
                },
                onOpen: function (item) {
                  setDetail(item)
                },
              }),
            ),
            h(
              'div',
              { style: { display: view === 'import' ? 'block' : 'none' } },
              h(ImportView, {
                t: t,
                ctx: ctx,
                active: view === 'import',
                queue: queue,
                setQueue: setQueue,
                snapshot: snapshot,
                detector: snapshot.detector || 'python',
                autoAnalyze: autoAnalyze,
                setAutoAnalyze: setAutoAnalyze,
                notify: notify,
                refresh: refresh,
                onBrowse: function () {
                  selectView('library')
                },
              }),
            ),
          ),
        )
      }

      var categoriesForInput = categories.map(function (node) {
        return node.name
      })

      return h(
        'div',
        { className: 'al-root' },
        h('style', null, CSS),
        h('datalist', { id: 'al-categories' }, categoriesForInput.map(function (name) {
          return h('option', { key: name, value: name })
        })),
        header,
        content,
        detail
          ? h(DetailDialog, {
              t: t,
              item: detail,
              refresh: refresh,
              onClose: function () {
                setDetail(null)
              },
              onSaved: notify,
            })
          : null,
        pathDialog
          ? h(PathDialog, {
              t: t,
              ctx: ctx,
              initial: snapshot.libraryPath || snapshot.defaultPath || '',
              defaultPath: snapshot.defaultPath,
              title: snapshot.configured ? t.changePath : t.setupTitle,
              confirmLabel: snapshot.configured ? t.confirm : t.setupConfirm,
              description: snapshot.configured ? t.setupBody : '',
              onSubmit: savePath,
              onClose: function () {
                setPathDialog(false)
              },
            })
          : null,
        notice ? h('div', { className: 'al-toast' }, notice) : null,
        menu
          ? h(
              'div',
              {
                className: 'al-menuLayer',
                onClick: function () {
                  setMenu(null)
                },
              },
              h(
                'div',
                {
                  className: 'al-menu',
                  style: { left: menu.x + 'px', top: menu.y + 'px' },
                  onClick: function (event) {
                    event.stopPropagation()
                  },
                },
                menu.path.indexOf('/') < 0 && menu.path !== ''
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'al-menuItem',
                        onClick: function () {
                          setCatDialog({ mode: 'create', parent: menu.path + '/' })
                          setMenu(null)
                        },
                      },
                      t.newSubcategory,
                    )
                  : null,
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'al-menuItem',
                    onClick: function () {
                      setCatDialog({ mode: 'rename', path: menu.path, name: menu.path.split('/').pop() })
                      setMenu(null)
                    },
                  },
                  t.renameCategory,
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'al-menuItem al-menuItemDanger',
                    onClick: function () {
                      var count = items.filter(function (item) {
                        return item.category === menu.path || item.category.indexOf(menu.path + '/') === 0
                      }).length
                      setCatDialog({ mode: 'delete', path: menu.path, count: count })
                      setMenu(null)
                    },
                  },
                  t.deleteCategory,
                ),
              ),
            )
          : null,
        catDialog
          ? h(CategoryDialog, {
              t: t,
              dialog: catDialog,
              onSubmit: function (name) {
                return catDialog.mode === 'delete'
                  ? submitCategoryDelete()
                  : catDialog.mode === 'create'
                    ? submitCategoryCreate(name)
                    : submitCategoryRename(name)
              },
              onClose: function () {
                setCatDialog(null)
              },
            })
          : null,
      )
    }

    /* ── category rename / delete dialog ─────────────────────────────── */

    function CategoryDialog(props) {
      var t = props.t
      var dialog = props.dialog
      var isDelete = dialog.mode === 'delete'
      var title = dialog.mode === 'create' ? t.createTitle : dialog.mode === 'rename' ? t.renameTitle : t.deleteTitle
      var [value, setValue] = React.useState(dialog.name || '')
      var [error, setError] = React.useState('')
      var [busy, setBusy] = React.useState(false)

      React.useEffect(
        function () {
          function onKey(event) {
            if (event.key === 'Escape') props.onClose()
          }
          document.addEventListener('keydown', onKey)
          return function () {
            document.removeEventListener('keydown', onKey)
          }
        },
        [props.onClose],
      )

      function submit() {
        setBusy(true)
        setError('')
        props
          .onSubmit(isDelete ? undefined : value)
          .then(function () {
            setBusy(false)
          })
          .catch(function (reason) {
            setBusy(false)
            setError(String((reason && reason.message) || reason))
          })
      }

      var body = isDelete
        ? h('div', { className: 'al-muted' }, t.deleteCategoryBody.replace('{n}', String(dialog.count || 0)))
        : h(
            'div',
            { className: 'al-field' },
            h('span', { className: 'al-fieldLabel' }, t.categoryLabel),
            h('input', {
              className: 'al-input al-inputWide',
              value: value,
              maxLength: 8,
              autoFocus: true,
              onChange: function (event) {
                setValue(event.target.value)
              },
              onKeyDown: function (event) {
                if (event.key === 'Enter') submit()
              },
            }),
            h('span', { className: 'al-muted' }, t.categoryHint),
          )

      return h(
        'div',
        {
          className: 'al-modal',
          onMouseDown: function (event) {
            if (event.target === event.currentTarget) props.onClose()
          },
        },
        h(
          'div',
          { className: 'al-dialog', style: { width: 'min(520px,100%)' } },
          h(
            'div',
            { className: 'al-dialogHead' },
            h('span', { style: { fontWeight: 600 } }, title),
            h('span', { className: 'al-spacer' }),
            h(Button, { ghost: true, onClick: props.onClose }, '✕'),
          ),
          h(
            'div',
            { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' } },
            body,
            error ? h('div', { className: 'al-error' }, error) : null,
          ),
          h(
            'div',
            { className: 'al-dialogFoot' },
            h('span', { className: 'al-spacer' }),
            h(Button, { onClick: props.onClose }, t.cancel),
            h(
              Button,
              {
                primary: !isDelete,
                danger: isDelete,
                disabled: busy,
                onClick: submit,
              },
              busy ? '…' : isDelete ? t.delete : t.save,
            ),
          ),
        ),
      )
    }

    /* ── sidebar icon ─────────────────────────────────────────────────── */

    function SidebarIcon(props) {
      var size = typeof props.size === 'number' && props.size > 0 ? props.size : 18
      var active = props.active === true
      return h(
        'svg',
        {
          viewBox: '0 0 64 64',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 4.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', opacity: active ? 1 : 0.72 },
        },
        h('rect', { x: 8, y: 14, width: 48, height: 40, rx: 7 }),
        h('path', { d: 'M8 28h48' }),
        h('circle', { cx: 19, cy: 21, r: 0.5, fill: 'currentColor' }),
        h('path', { d: 'M15 48l11-13 8 9 6-5 9 9' }),
        h('path', { d: 'M20 8h24' }),
      )
    }

    return {
      inject: ['slots'],
      apply: function (ctx) {
        var PanelView = function (props) {
          return h(Panel, Object.assign({}, props, { ctx: ctx }))
        }
        var label = function () {
          return (MESSAGES[detectLang(ctx)] || MESSAGES.zh).tab
        }
        ctx.slots.inject('sidebar.panellist', function () {
          return ctx.slots.register({ name: 'sidebar.panellist', id: 'asset-library', order: 30, label: label }, SidebarIcon)
        })
        ctx.slots.inject('main', function () {
          return ctx.slots.register({ name: 'main', key: 'asset-library' }, PanelView)
        })
      },
    }
  },
})
