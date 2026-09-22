// dsh-assistant-skin — 浏览器半。
//
// 「助理皮肤」分三层，都不碰 DSH 源码：
//
//   ① **整套视觉语言**：把主题的 token 覆盖层叠到活动主题上
//      （ctx.theme.overrideTokens，ui-theme 官方留的第三方主题扩展点）。表面/
//      文字/边框/强调全部换值，换的是整个界面的观感，不是点缀。深色主题还要
//      额外把 body[data-ds-dark-theme] 打上 —— 有六个组件不读 token、只听这个属性。
//   ② **会话区背景**：把助理形象（静图 / 循环片段）垫进会话主区，并为正文留出
//      右侧空间；片段按「常驻 + 稀有触发」调度，细节见 installStageLook。
//   ③ **Hero 助理形象**：只接管 conversation.hero.brand.mark 一处（空会话正中央
//      的品牌位）。**侧栏品牌位刻意不接管** —— 那里是 DSH 自己的身份（鱼形标识与
//      构建版本），换成助理头像既无信息增量，也让侧栏多了两块要读的文字。
//
// 能换什么、换不了什么（重要，避免预期错位）：token + 字体 + 圆角 + 阴影 + 一层
// 自己的媒体层能换掉整个界面的**观感**；组件的 DOM 结构与版式**换不掉** —— 那需要
// fork packages/client/* 并重建 web 产物。所以「满屏立绘 + 悬浮控件」那种版式不在
// 本插件的能力范围内。
//
// single 基数的语义是「priority 越低越先渲染」，所以一律以 priority:-1 注册，
// 不与其他注册者抢默认的 0（同优先级会抛错）。该席位原本只有 fallback、没有
// 注册者，因此这一层是纯粹的接管，卸载即恢复原样。
//
// 配置（助理名字/头像/主题 id）由宿主半经 /dsh-assistant-skin/api/config 下发；
// 拉取失败时用内置默认值，界面不会因为宿主半出问题而空掉。
window.__ModuleLoader__.load({
  id: 'dsh-assistant-skin',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    const React = require('react')

    const inject = ['slots']

    /** token 覆盖层的来源标识；同一 source 重复注册是替换，不是叠加。 */
    const THEME_SOURCE = 'dsh-assistant-skin'
    const ROUTE_ROOT = '/dsh-assistant-skin'

    /**
     * Hero 席位的头像放大倍数。
     *
     * owner 下发的 34px 是按鱼形 logo 的光学重量定的：一个字形占满方框，而
     * 人像照片在同样边长下四周留白更多，视觉体量明显更小。这不是「覆盖设计」，
     * 而是把两种素材的视觉重量对齐。
     */
    const HERO_MARK_SCALE = 1.65

    // <<<THEMES
    // 由 tools/gen-themes.py 从 tools/theme-specs.json 生成，请勿手改。
    const THEMES = {
      molan: {
        label: '墨蓝',
        note: '黑蓝暗调。bg-base 全透明：它会在内容与人物交接处留下明暗台阶，而暗区的职责归蒙版。页面底色由插件另注入的 html 实底承担。',
        glow: '#4FB6E8',
        cornerShape: 'superellipse(1.5)',
        brandFont: 'inherit',
        scheme: 'dark',
        tokens: {
          '--dsw-alias-bg-base': { light: 'rgba(10, 16, 24, 0)', dark: 'rgba(5, 8, 13, 0)' },
          '--dsw-alias-bg-document-preview': { light: 'var(--dsw-static-neutral-bluish-950)', dark: 'var(--dsw-static-neutral-bluish-950)' },
          '--dsw-alias-bg-layer-1': { light: '#101823', dark: '#0A1119' },
          '--dsw-alias-bg-layer-2': { light: '#141D2A', dark: '#0E1622' },
          '--dsw-alias-bg-layer-3': { light: '#1A2532', dark: '#131D2B' },
          '--dsw-alias-bg-mask-1': { light: 'rgba(0, 0, 0, 0.5)', dark: 'rgba(0, 0, 0, 0.5)' },
          '--dsw-alias-bg-mask-2': { light: 'rgba(0, 0, 0, 0.2)', dark: 'rgba(0, 0, 0, 0.2)' },
          '--dsw-alias-bg-mask-3': { light: 'rgba(0, 0, 0, 0.48)', dark: 'rgba(0, 0, 0, 0.48)' },
          '--dsw-alias-bg-mask-drop': { light: 'rgba(39, 39, 48, 0.7)', dark: 'rgba(39, 39, 48, 0.7)' },
          '--dsw-alias-bg-mask-photo': { light: 'rgba(0, 0, 0, 0.88)', dark: 'rgba(0, 0, 0, 0.88)' },
          '--dsw-alias-bg-module-platform': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-alias-bg-multi-select': { light: 'var(--dsw-static-neutral-850)', dark: 'var(--dsw-static-neutral-850)' },
          '--dsw-alias-bg-overlay': { light: '#1E2A3A', dark: '#17222F' },
          '--dsw-alias-bg-skeleton': { light: 'rgba(255, 255, 255, 0.08)', dark: 'rgba(255, 255, 255, 0.08)' },
          '--dsw-alias-border-inverted': { light: 'rgba(255, 255, 255, 0.06)', dark: 'rgba(255, 255, 255, 0.06)' },
          '--dsw-alias-border-inverted2': { light: 'rgba(255, 255, 255, 0.08)', dark: 'rgba(255, 255, 255, 0.08)' },
          '--dsw-alias-border-l1': { light: 'rgba(124, 180, 255, 0.10)', dark: 'rgba(124, 180, 255, 0.10)' },
          '--dsw-alias-border-l2': { light: 'rgba(124, 180, 255, 0.18)', dark: 'rgba(124, 180, 255, 0.18)' },
          '--dsw-alias-border-l2-darkmode-thin': { light: 'rgba(255, 255, 255, 0.06)', dark: 'rgba(255, 255, 255, 0.06)' },
          '--dsw-alias-border-l3': { light: 'rgba(255, 255, 255, 0.16)', dark: 'rgba(255, 255, 255, 0.16)' },
          '--dsw-alias-border-l4': { light: 'rgba(255, 255, 255, 0.2)', dark: 'rgba(255, 255, 255, 0.2)' },
          '--dsw-alias-brand-primary': { light: '#4FB6E8', dark: '#4FB6E8' },
          '--dsw-alias-brand-primary-invert': { light: 'var(--dsw-static-neutral-bluish-50)', dark: 'var(--dsw-static-neutral-bluish-50)' },
          '--dsw-alias-brand-primary-new-colorprimary-new-color': { light: 'var(--dsw-static-deepseek-450)', dark: 'var(--dsw-static-deepseek-450)' },
          '--dsw-alias-brand-text': { light: 'var(--dsw-static-neutral-bluish-50)', dark: 'var(--dsw-static-neutral-bluish-50)' },
          '--dsw-alias-button-contrast-fill': { light: 'var(--dsw-static-neutral-bluish-50)', dark: 'var(--dsw-static-neutral-bluish-50)' },
          '--dsw-alias-button-elevated-fill': { light: 'var(--dsw-static-neutral-bluish-750)', dark: 'var(--dsw-static-neutral-bluish-750)' },
          '--dsw-alias-button-floating-fill': { light: 'var(--dsw-static-neutral-bluish-850)', dark: 'var(--dsw-static-neutral-bluish-850)' },
          '--dsw-alias-button-floating-hover': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-alias-button-ghost-active-border': { light: 'var(--dsw-static-neutral-bluish-600)', dark: 'var(--dsw-static-neutral-bluish-600)' },
          '--dsw-alias-button-ghost-active-fill': { light: 'var(--dsw-static-neutral-bluish-750)', dark: 'var(--dsw-static-neutral-bluish-750)' },
          '--dsw-alias-button-ghost-active-hover': { light: 'var(--dsw-static-neutral-bluish-700)', dark: 'var(--dsw-static-neutral-bluish-700)' },
          '--dsw-alias-button-info-fill': { light: 'var(--dsw-static-deepseek-400)', dark: 'var(--dsw-static-deepseek-400)' },
          '--dsw-alias-button-info-hover': { light: 'var(--dsw-static-deepseek-500)', dark: 'var(--dsw-static-deepseek-500)' },
          '--dsw-alias-button-primary-dimmed': { light: 'var(--dsw-static-neutral-bluish-750)', dark: 'var(--dsw-static-neutral-bluish-750)' },
          '--dsw-alias-button-primary-fill': { light: '#4FB6E8', dark: '#4FB6E8' },
          '--dsw-alias-button-primary-hover': { light: '#6FC7F0', dark: '#6FC7F0' },
          '--dsw-alias-button-tool-bar-fill': { light: 'rgba(84, 85, 87, 0.5)', dark: 'rgba(84, 85, 87, 0.5)' },
          '--dsw-alias-button-tool-bar-fill-invisible': { light: 'rgba(31, 31, 31, 0.36)', dark: 'rgba(31, 31, 31, 0.36)' },
          '--dsw-alias-button-tool-bar-hover': { light: 'rgba(84, 85, 87, 0.6)', dark: 'rgba(84, 85, 87, 0.6)' },
          '--dsw-alias-interactive-bg-active': { light: 'rgba(255, 255, 255, 0.14)', dark: 'rgba(255, 255, 255, 0.14)' },
          '--dsw-alias-interactive-bg-hover': { light: 'rgba(255, 255, 255, 0.08)', dark: 'rgba(255, 255, 255, 0.08)' },
          '--dsw-alias-interactive-bg-hover-accent': { light: 'rgba(255, 255, 255, 0.24)', dark: 'rgba(255, 255, 255, 0.24)' },
          '--dsw-alias-interactive-bg-hover-danger': { light: 'rgba(242, 90, 90, 0.15)', dark: 'rgba(242, 90, 90, 0.15)' },
          '--dsw-alias-interactive-bg-hover-solid': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-alias-label-caption': { light: 'var(--dsw-static-neutral-bluish-600)', dark: 'var(--dsw-static-neutral-bluish-600)' },
          '--dsw-alias-label-dimmed': { light: 'var(--dsw-static-neutral-bluish-750)', dark: 'var(--dsw-static-neutral-bluish-750)' },
          '--dsw-alias-label-document-preview': { light: 'var(--dsw-static-neutral-bluish-300)', dark: 'var(--dsw-static-neutral-bluish-300)' },
          '--dsw-alias-label-primary': { light: '#E7EFF9', dark: '#E7EFF9' },
          '--dsw-alias-label-primary-bluish': { light: 'var(--dsw-static-neutral-bluish-50)', dark: 'var(--dsw-static-neutral-bluish-50)' },
          '--dsw-alias-label-primary-dimmed': { light: 'var(--dsw-static-neutral-bluish-100)', dark: 'var(--dsw-static-neutral-bluish-100)' },
          '--dsw-alias-label-primary-foreground': { light: '#05080D', dark: '#05080D' },
          '--dsw-alias-label-primary-inverted': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-alias-label-secondary': { light: '#9DB2C8', dark: '#9DB2C8' },
          '--dsw-alias-label-tertiary': { light: '#6C8299', dark: '#6C8299' },
          '--dsw-alias-link': { light: '#6FC7F0', dark: '#4FB6E8' },
          '--dsw-alias-markdown-citation': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-alias-markdown-code-block': { light: '#101823', dark: '#0A1119' },
          '--dsw-alias-markdown-code-block-banner': { light: 'var(--dsw-static-neutral-bluish-850)', dark: 'var(--dsw-static-neutral-bluish-850)' },
          '--dsw-alias-markdown-code-segment-selected': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-alias-markdown-code-segment-unselected': { light: 'var(--dsw-static-neutral-bluish-900)', dark: 'var(--dsw-static-neutral-bluish-900)' },
          '--dsw-alias-markdown-inline-code': { light: '#18222F', dark: '#131D2B' },
          '--dsw-alias-markdown-placeholder': { light: 'var(--dsw-static-neutral-bluish-850)', dark: 'var(--dsw-static-neutral-bluish-850)' },
          '--dsw-alias-markdown-tag': { light: 'var(--dsw-static-neutral-bluish-850)', dark: 'var(--dsw-static-neutral-bluish-850)' },
          '--dsw-alias-scrollbar-bg-l1': { light: 'var(--dsw-static-neutral-700)', dark: 'var(--dsw-static-neutral-700)' },
          '--dsw-alias-scrollbar-bg-l2': { light: 'var(--dsw-static-neutral-600)', dark: 'var(--dsw-static-neutral-600)' },
          '--dsw-alias-scrollbar-hover-l1': { light: 'var(--dsw-static-neutral-600)', dark: 'var(--dsw-static-neutral-600)' },
          '--dsw-alias-scrollbar-hover-l2': { light: 'var(--dsw-static-neutral-550)', dark: 'var(--dsw-static-neutral-550)' },
          '--dsw-alias-state-business-primary': { light: 'var(--dsw-static-deepseek-400)', dark: 'var(--dsw-static-deepseek-400)' },
          '--dsw-alias-state-business-tertiary': { light: 'var(--dsw-static-deepseek-800)', dark: 'var(--dsw-static-deepseek-800)' },
          '--dsw-alias-state-error-primary': { light: 'var(--dsw-static-red-400)', dark: 'var(--dsw-static-red-400)' },
          '--dsw-alias-state-error-secondary': { light: 'var(--dsw-static-red-400)', dark: 'var(--dsw-static-red-400)' },
          '--dsw-alias-state-success-primary': { light: 'var(--dsw-static-green-500)', dark: 'var(--dsw-static-green-500)' },
          '--dsw-alias-state-success-secondary': { light: 'var(--dsw-static-green-400)', dark: 'var(--dsw-static-green-400)' },
          '--dsw-alias-state-success-tertiary': { light: 'var(--dsw-static-green-900)', dark: 'var(--dsw-static-green-900)' },
          '--dsw-alias-state-warn-label': { light: 'var(--dsw-static-amber-600)', dark: 'var(--dsw-static-amber-600)' },
          '--dsw-alias-state-warn-primary': { light: 'var(--dsw-static-amber-500)', dark: 'var(--dsw-static-amber-500)' },
          '--dsw-alias-state-warn-secondary': { light: 'var(--dsw-static-amber-400)', dark: 'var(--dsw-static-amber-400)' },
          '--dsw-alias-state-warn-tertiary': { light: 'var(--dsw-static-amber-900)', dark: 'var(--dsw-static-amber-900)' },
          '--dsw-alias-toast-bg': { light: 'var(--dsw-static-neutral-bluish-750)', dark: 'var(--dsw-static-neutral-bluish-750)' },
          '--dsw-alias-tooltip-bg': { light: 'var(--dsw-static-neutral-bluish-750)', dark: 'var(--dsw-static-neutral-bluish-750)' },
          '--dsw-specific-bubble': { light: '#16202E', dark: '#111A26' },
          '--dsw-specific-bubble-highlight': { light: '#1F2D40', dark: '#1A2637' },
          '--dsw-specific-input-major': { light: '#141D2A', dark: '#0E1622' },
          '--dsw-specific-login-input': { light: 'var(--dsw-static-neutral-bluish-900)', dark: 'var(--dsw-static-neutral-bluish-900)' },
          '--dsw-specific-menu': { light: 'var(--dsw-alias-bg-layer-3)', dark: 'var(--dsw-alias-bg-layer-3)' },
          '--dsw-specific-selector': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-specific-sidebar-fill': { light: '#080D14', dark: '#04070B' },
          '--dsw-specific-sidebar-nav-item-active': { light: '#18222F', dark: '#131E2C' },
          '--dsw-specific-sidebar-nav-item-active-accent': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-specific-sidebar-nav-item-hover': { light: '#101822', dark: '#0A1119' },
          '--dsw-specific-tip': { light: 'var(--dsw-static-neutral-bluish-800)', dark: 'var(--dsw-static-neutral-bluish-800)' },
          '--dsw-static-blue-100': { light: 'rgb(224, 241, 249)', dark: 'rgb(224, 241, 249)' },
          '--dsw-static-blue-300': { light: 'rgb(161, 213, 239)', dark: 'rgb(161, 213, 239)' },
          '--dsw-static-blue-400': { light: 'rgb(116, 192, 230)', dark: 'rgb(116, 192, 230)' },
          '--dsw-static-blue-450': { light: 'rgb(98, 184, 227)', dark: 'rgb(98, 184, 227)' },
          '--dsw-static-blue-50': { light: 'rgb(241, 249, 253)', dark: 'rgb(241, 249, 253)' },
          '--dsw-static-blue-500': { light: 'rgb(81, 176, 224)', dark: 'rgb(81, 176, 224)' },
          '--dsw-static-blue-50p': { light: 'rgb(237, 247, 252)', dark: 'rgb(237, 247, 252)' },
          '--dsw-static-blue-600': { light: 'rgb(53, 164, 219)', dark: 'rgb(53, 164, 219)' },
          '--dsw-static-blue-75': { light: 'rgb(233, 245, 251)', dark: 'rgb(233, 245, 251)' },
          '--dsw-static-blue-800': { light: 'rgb(31, 126, 174)', dark: 'rgb(31, 126, 174)' },
          '--dsw-static-blue-900': { light: 'rgb(20, 80, 110)', dark: 'rgb(20, 80, 110)' },
          '--dsw-static-blue-950': { light: 'rgb(16, 66, 91)', dark: 'rgb(16, 66, 91)' },
          '--dsw-static-deepseek-100': { light: 'rgb(230, 244, 251)', dark: 'rgb(230, 244, 251)' },
          '--dsw-static-deepseek-200': { light: 'rgb(218, 238, 248)', dark: 'rgb(218, 238, 248)' },
          '--dsw-static-deepseek-300': { light: 'rgb(193, 227, 244)', dark: 'rgb(193, 227, 244)' },
          '--dsw-static-deepseek-400': { light: 'rgb(125, 196, 232)', dark: 'rgb(125, 196, 232)' },
          '--dsw-static-deepseek-450': { light: 'rgb(111, 190, 230)', dark: 'rgb(111, 190, 230)' },
          '--dsw-static-deepseek-50': { light: 'rgb(239, 248, 252)', dark: 'rgb(239, 248, 252)' },
          '--dsw-static-deepseek-500': { light: 'rgb(72, 173, 223)', dark: 'rgb(72, 173, 223)' },
          '--dsw-static-deepseek-600': { light: 'rgb(38, 154, 212)', dark: 'rgb(38, 154, 212)' },
          '--dsw-static-deepseek-700-delete': { light: 'rgb(29, 117, 162)', dark: 'rgb(29, 117, 162)' },
          '--dsw-static-deepseek-800': { light: 'rgb(21, 88, 122)', dark: 'rgb(21, 88, 122)' },
          '--dsw-static-deepseek-900': { light: 'rgb(16, 65, 90)', dark: 'rgb(16, 65, 90)' },
          '--dsw-static-neutral-bluish-00': { light: 'rgb(255, 255, 255)', dark: 'rgb(255, 255, 255)' },
          '--dsw-static-neutral-bluish-100': { light: 'rgb(236, 238, 241)', dark: 'rgb(236, 238, 241)' },
          '--dsw-static-neutral-bluish-1000': { light: 'rgb(15, 18, 21)', dark: 'rgb(15, 18, 21)' },
          '--dsw-static-neutral-bluish-150': { light: 'rgb(235, 237, 240)', dark: 'rgb(235, 237, 240)' },
          '--dsw-static-neutral-bluish-200': { light: 'rgb(228, 231, 235)', dark: 'rgb(228, 231, 235)' },
          '--dsw-static-neutral-bluish-300': { light: 'rgb(204, 209, 217)', dark: 'rgb(204, 209, 217)' },
          '--dsw-static-neutral-bluish-400': { light: 'rgb(168, 177, 189)', dark: 'rgb(168, 177, 189)' },
          '--dsw-static-neutral-bluish-50': { light: 'rgb(249, 250, 251)', dark: 'rgb(249, 250, 251)' },
          '--dsw-static-neutral-bluish-500': { light: 'rgb(145, 156, 172)', dark: 'rgb(145, 156, 172)' },
          '--dsw-static-neutral-bluish-60': { light: 'rgb(245, 246, 247)', dark: 'rgb(245, 246, 247)' },
          '--dsw-static-neutral-bluish-600': { light: 'rgb(118, 132, 151)', dark: 'rgb(118, 132, 151)' },
          '--dsw-static-neutral-bluish-700': { light: 'rgb(88, 100, 116)', dark: 'rgb(88, 100, 116)' },
          '--dsw-static-neutral-bluish-75': { light: 'rgb(241, 243, 245)', dark: 'rgb(241, 243, 245)' },
          '--dsw-static-neutral-bluish-750': { light: 'rgb(61, 69, 80)', dark: 'rgb(61, 69, 80)' },
          '--dsw-static-neutral-bluish-800': { light: 'rgb(47, 53, 62)', dark: 'rgb(47, 53, 62)' },
          '--dsw-static-neutral-bluish-850': { light: 'rgb(39, 44, 51)', dark: 'rgb(39, 44, 51)' },
          '--dsw-static-neutral-bluish-875': { light: 'rgb(31, 35, 40)', dark: 'rgb(31, 35, 40)' },
          '--dsw-static-neutral-bluish-900': { light: 'rgb(24, 27, 31)', dark: 'rgb(24, 27, 31)' },
          '--dsw-static-neutral-bluish-950': { light: 'rgb(19, 21, 25)', dark: 'rgb(19, 21, 25)' },
        },
      },
      ouhe: {
        label: '藕荷月白',
        note: '柔粉紫：明亮的藕荷底 + 玫瑰强调，现代女性化',
        glow: '#C04A82',
        cornerShape: 'superellipse(1.7)',
        brandFont: 'inherit',
        scheme: '',
        tokens: {
          '--dsw-alias-bg-base': { light: '#FBF5F8', dark: '#1E1519' },
          '--dsw-alias-bg-layer-1': { light: '#FFFFFF', dark: '#241A1F' },
          '--dsw-alias-bg-layer-2': { light: '#FDF7FA', dark: '#2A1F25' },
          '--dsw-alias-bg-layer-3': { light: '#F8EEF4', dark: '#32242C' },
          '--dsw-alias-bg-overlay': { light: '#F6EAF1', dark: '#382832' },
          '--dsw-alias-border-l1': { light: 'rgba(120, 60, 95, 0.08)', dark: 'rgba(255, 220, 240, 0.08)' },
          '--dsw-alias-border-l2': { light: 'rgba(120, 60, 95, 0.16)', dark: 'rgba(255, 220, 240, 0.16)' },
          '--dsw-alias-brand-primary': { light: '#C04A82', dark: '#E88BB4' },
          '--dsw-alias-button-primary-fill': { light: '#C04A82', dark: '#E88BB4' },
          '--dsw-alias-button-primary-hover': { light: '#A93A6E', dark: '#F0A6C6' },
          '--dsw-alias-label-primary': { light: '#2E2230', dark: '#F6EBF1' },
          '--dsw-alias-label-secondary': { light: '#6B5266', dark: '#C9AEC0' },
          '--dsw-alias-label-tertiary': { light: '#9A8093', dark: '#9C8494' },
          '--dsw-alias-link': { light: '#B03C74', dark: '#E88BB4' },
          '--dsw-alias-markdown-code-block': { light: '#F8F0F5', dark: '#2A1E24' },
          '--dsw-alias-markdown-inline-code': { light: '#F6EAF1', dark: '#33242C' },
          '--dsw-specific-bubble': { light: '#FBE9F2', dark: '#33242D' },
          '--dsw-specific-bubble-highlight': { light: '#F6D6E6', dark: '#432F3C' },
          '--dsw-specific-input-major': { light: '#FFFFFF', dark: '#2A1F25' },
          '--dsw-specific-sidebar-fill': { light: '#F7EDF3', dark: '#1A1216' },
          '--dsw-specific-sidebar-nav-item-active': { light: '#F3E2EC', dark: '#36262F' },
          '--dsw-specific-sidebar-nav-item-hover': { light: '#F8EDF3', dark: '#2A1E24' },
          '--dsw-static-blue-100': { light: 'rgb(247, 226, 236)', dark: 'rgb(247, 226, 236)' },
          '--dsw-static-blue-300': { light: 'rgb(230, 170, 200)', dark: 'rgb(230, 170, 200)' },
          '--dsw-static-blue-400': { light: 'rgb(218, 128, 173)', dark: 'rgb(218, 128, 173)' },
          '--dsw-static-blue-450': { light: 'rgb(213, 112, 163)', dark: 'rgb(213, 112, 163)' },
          '--dsw-static-blue-50': { light: 'rgb(251, 243, 247)', dark: 'rgb(251, 243, 247)' },
          '--dsw-static-blue-500': { light: 'rgb(209, 96, 153)', dark: 'rgb(209, 96, 153)' },
          '--dsw-static-blue-50p': { light: 'rgb(250, 239, 244)', dark: 'rgb(250, 239, 244)' },
          '--dsw-static-blue-600': { light: 'rgb(201, 71, 136)', dark: 'rgb(201, 71, 136)' },
          '--dsw-static-blue-75': { light: 'rgb(249, 235, 242)', dark: 'rgb(249, 235, 242)' },
          '--dsw-static-blue-800': { light: 'rgb(159, 46, 103)', dark: 'rgb(159, 46, 103)' },
          '--dsw-static-blue-900': { light: 'rgb(101, 29, 65)', dark: 'rgb(101, 29, 65)' },
          '--dsw-static-blue-950': { light: 'rgb(83, 24, 54)', dark: 'rgb(83, 24, 54)' },
          '--dsw-static-deepseek-100': { light: 'rgb(248, 233, 240)', dark: 'rgb(248, 233, 240)' },
          '--dsw-static-deepseek-200': { light: 'rgb(245, 221, 233)', dark: 'rgb(245, 221, 233)' },
          '--dsw-static-deepseek-300': { light: 'rgb(239, 198, 219)', dark: 'rgb(239, 198, 219)' },
          '--dsw-static-deepseek-400': { light: 'rgb(221, 136, 178)', dark: 'rgb(221, 136, 178)' },
          '--dsw-static-deepseek-450': { light: 'rgb(217, 123, 170)', dark: 'rgb(217, 123, 170)' },
          '--dsw-static-deepseek-50': { light: 'rgb(251, 240, 246)', dark: 'rgb(251, 240, 246)' },
          '--dsw-static-deepseek-500': { light: 'rgb(207, 88, 148)', dark: 'rgb(207, 88, 148)' },
          '--dsw-static-deepseek-600': { light: 'rgb(194, 56, 125)', dark: 'rgb(194, 56, 125)' },
          '--dsw-static-deepseek-700-delete': { light: 'rgb(147, 43, 95)', dark: 'rgb(147, 43, 95)' },
          '--dsw-static-deepseek-800': { light: 'rgb(111, 32, 72)', dark: 'rgb(111, 32, 72)' },
          '--dsw-static-deepseek-900': { light: 'rgb(82, 24, 53)', dark: 'rgb(82, 24, 53)' },
          '--dsw-static-neutral-bluish-00': { light: 'rgb(255, 255, 255)', dark: 'rgb(255, 255, 255)' },
          '--dsw-static-neutral-bluish-100': { light: 'rgb(240, 237, 239)', dark: 'rgb(240, 237, 239)' },
          '--dsw-static-neutral-bluish-1000': { light: 'rgb(20, 16, 19)', dark: 'rgb(20, 16, 19)' },
          '--dsw-static-neutral-bluish-150': { light: 'rgb(239, 236, 238)', dark: 'rgb(239, 236, 238)' },
          '--dsw-static-neutral-bluish-200': { light: 'rgb(234, 229, 232)', dark: 'rgb(234, 229, 232)' },
          '--dsw-static-neutral-bluish-300': { light: 'rgb(215, 206, 212)', dark: 'rgb(215, 206, 212)' },
          '--dsw-static-neutral-bluish-400': { light: 'rgb(186, 171, 181)', dark: 'rgb(186, 171, 181)' },
          '--dsw-static-neutral-bluish-50': { light: 'rgb(250, 250, 250)', dark: 'rgb(250, 250, 250)' },
          '--dsw-static-neutral-bluish-500': { light: 'rgb(168, 149, 162)', dark: 'rgb(168, 149, 162)' },
          '--dsw-static-neutral-bluish-60': { light: 'rgb(247, 245, 246)', dark: 'rgb(247, 245, 246)' },
          '--dsw-static-neutral-bluish-600': { light: 'rgb(147, 122, 139)', dark: 'rgb(147, 122, 139)' },
          '--dsw-static-neutral-bluish-700': { light: 'rgb(112, 92, 105)', dark: 'rgb(112, 92, 105)' },
          '--dsw-static-neutral-bluish-75': { light: 'rgb(244, 242, 243)', dark: 'rgb(244, 242, 243)' },
          '--dsw-static-neutral-bluish-750': { light: 'rgb(78, 63, 73)', dark: 'rgb(78, 63, 73)' },
          '--dsw-static-neutral-bluish-800': { light: 'rgb(60, 49, 56)', dark: 'rgb(60, 49, 56)' },
          '--dsw-static-neutral-bluish-850': { light: 'rgb(50, 40, 46)', dark: 'rgb(50, 40, 46)' },
          '--dsw-static-neutral-bluish-875': { light: 'rgb(39, 32, 37)', dark: 'rgb(39, 32, 37)' },
          '--dsw-static-neutral-bluish-900': { light: 'rgb(30, 25, 28)', dark: 'rgb(30, 25, 28)' },
          '--dsw-static-neutral-bluish-950': { light: 'rgb(24, 20, 23)', dark: 'rgb(24, 20, 23)' },
        },
      },
      moyu: {
        label: '墨玉鎏金',
        note: '中式典藏：暖墨褐底 + 鎏金强调，不偏黑蓝',
        glow: '#D9AE5F',
        cornerShape: 'superellipse(1.35)',
        brandFont: '"Songti SC", "STSong", "Noto Serif SC", serif',
        scheme: '',
        tokens: {
          '--dsw-alias-bg-base': { light: '#FBF7F0', dark: '#17120E' },
          '--dsw-alias-bg-layer-1': { light: '#FFFDF8', dark: '#1E1812' },
          '--dsw-alias-bg-layer-2': { light: '#FAF4EA', dark: '#251E16' },
          '--dsw-alias-bg-layer-3': { light: '#F4EBDA', dark: '#2E251B' },
          '--dsw-alias-bg-overlay': { light: '#F7EFE1', dark: '#362B1F' },
          '--dsw-alias-border-l1': { light: 'rgba(120, 90, 40, 0.08)', dark: 'rgba(255, 230, 180, 0.08)' },
          '--dsw-alias-border-l2': { light: 'rgba(120, 90, 40, 0.18)', dark: 'rgba(255, 230, 180, 0.16)' },
          '--dsw-alias-brand-primary': { light: '#8C6420', dark: '#D9AE5F' },
          '--dsw-alias-button-primary-fill': { light: '#8C6420', dark: '#D9AE5F' },
          '--dsw-alias-button-primary-hover': { light: '#77541A', dark: '#E6C078' },
          '--dsw-alias-label-primary': { light: '#2A231A', dark: '#F5EEDF' },
          '--dsw-alias-label-secondary': { light: '#6B5B45', dark: '#C9B692' },
          '--dsw-alias-label-tertiary': { light: '#9A8A72', dark: '#9A8A6E' },
          '--dsw-alias-link': { light: '#9A6E24', dark: '#D9AE5F' },
          '--dsw-alias-markdown-code-block': { light: '#F7F1E4', dark: '#241C15' },
          '--dsw-alias-markdown-inline-code': { light: '#F4EBDA', dark: '#2E251B' },
          '--dsw-specific-bubble': { light: '#F7EFD9', dark: '#2E2519' },
          '--dsw-specific-bubble-highlight': { light: '#EFE0BC', dark: '#3E331F' },
          '--dsw-specific-input-major': { light: '#FFFDF8', dark: '#251E16' },
          '--dsw-specific-sidebar-fill': { light: '#F6EFE2', dark: '#130F0B' },
          '--dsw-specific-sidebar-nav-item-active': { light: '#F2E8D5', dark: '#33291C' },
          '--dsw-specific-sidebar-nav-item-hover': { light: '#F7F1E4', dark: '#251D14' },
          '--dsw-static-blue-100': { light: 'rgb(247, 240, 226)', dark: 'rgb(247, 240, 226)' },
          '--dsw-static-blue-300': { light: 'rgb(230, 210, 170)', dark: 'rgb(230, 210, 170)' },
          '--dsw-static-blue-400': { light: 'rgb(218, 188, 128)', dark: 'rgb(218, 188, 128)' },
          '--dsw-static-blue-450': { light: 'rgb(213, 179, 112)', dark: 'rgb(213, 179, 112)' },
          '--dsw-static-blue-50': { light: 'rgb(251, 248, 243)', dark: 'rgb(251, 248, 243)' },
          '--dsw-static-blue-500': { light: 'rgb(209, 171, 96)', dark: 'rgb(209, 171, 96)' },
          '--dsw-static-blue-50p': { light: 'rgb(250, 246, 239)', dark: 'rgb(250, 246, 239)' },
          '--dsw-static-blue-600': { light: 'rgb(201, 158, 71)', dark: 'rgb(201, 158, 71)' },
          '--dsw-static-blue-75': { light: 'rgb(249, 244, 235)', dark: 'rgb(249, 244, 235)' },
          '--dsw-static-blue-800': { light: 'rgb(159, 121, 46)', dark: 'rgb(159, 121, 46)' },
          '--dsw-static-blue-900': { light: 'rgb(101, 77, 29)', dark: 'rgb(101, 77, 29)' },
          '--dsw-static-blue-950': { light: 'rgb(83, 63, 24)', dark: 'rgb(83, 63, 24)' },
          '--dsw-static-deepseek-100': { light: 'rgb(248, 243, 233)', dark: 'rgb(248, 243, 233)' },
          '--dsw-static-deepseek-200': { light: 'rgb(245, 237, 221)', dark: 'rgb(245, 237, 221)' },
          '--dsw-static-deepseek-300': { light: 'rgb(239, 225, 198)', dark: 'rgb(239, 225, 198)' },
          '--dsw-static-deepseek-400': { light: 'rgb(221, 193, 136)', dark: 'rgb(221, 193, 136)' },
          '--dsw-static-deepseek-450': { light: 'rgb(217, 186, 123)', dark: 'rgb(217, 186, 123)' },
          '--dsw-static-deepseek-50': { light: 'rgb(251, 247, 240)', dark: 'rgb(251, 247, 240)' },
          '--dsw-static-deepseek-500': { light: 'rgb(207, 167, 88)', dark: 'rgb(207, 167, 88)' },
          '--dsw-static-deepseek-600': { light: 'rgb(194, 148, 56)', dark: 'rgb(194, 148, 56)' },
          '--dsw-static-deepseek-700-delete': { light: 'rgb(147, 112, 43)', dark: 'rgb(147, 112, 43)' },
          '--dsw-static-deepseek-800': { light: 'rgb(111, 85, 32)', dark: 'rgb(111, 85, 32)' },
          '--dsw-static-deepseek-900': { light: 'rgb(82, 63, 24)', dark: 'rgb(82, 63, 24)' },
          '--dsw-static-neutral-bluish-00': { light: 'rgb(255, 255, 255)', dark: 'rgb(255, 255, 255)' },
          '--dsw-static-neutral-bluish-100': { light: 'rgb(240, 238, 237)', dark: 'rgb(240, 238, 237)' },
          '--dsw-static-neutral-bluish-1000': { light: 'rgb(20, 18, 16)', dark: 'rgb(20, 18, 16)' },
          '--dsw-static-neutral-bluish-150': { light: 'rgb(239, 238, 236)', dark: 'rgb(239, 238, 236)' },
          '--dsw-static-neutral-bluish-200': { light: 'rgb(234, 232, 229)', dark: 'rgb(234, 232, 229)' },
          '--dsw-static-neutral-bluish-300': { light: 'rgb(215, 210, 206)', dark: 'rgb(215, 210, 206)' },
          '--dsw-static-neutral-bluish-400': { light: 'rgb(186, 178, 171)', dark: 'rgb(186, 178, 171)' },
          '--dsw-static-neutral-bluish-50': { light: 'rgb(250, 250, 250)', dark: 'rgb(250, 250, 250)' },
          '--dsw-static-neutral-bluish-500': { light: 'rgb(168, 158, 149)', dark: 'rgb(168, 158, 149)' },
          '--dsw-static-neutral-bluish-60': { light: 'rgb(247, 246, 245)', dark: 'rgb(247, 246, 245)' },
          '--dsw-static-neutral-bluish-600': { light: 'rgb(147, 134, 122)', dark: 'rgb(147, 134, 122)' },
          '--dsw-static-neutral-bluish-700': { light: 'rgb(112, 102, 92)', dark: 'rgb(112, 102, 92)' },
          '--dsw-static-neutral-bluish-75': { light: 'rgb(244, 243, 242)', dark: 'rgb(244, 243, 242)' },
          '--dsw-static-neutral-bluish-750': { light: 'rgb(78, 70, 63)', dark: 'rgb(78, 70, 63)' },
          '--dsw-static-neutral-bluish-800': { light: 'rgb(60, 55, 49)', dark: 'rgb(60, 55, 49)' },
          '--dsw-static-neutral-bluish-850': { light: 'rgb(50, 45, 40)', dark: 'rgb(50, 45, 40)' },
          '--dsw-static-neutral-bluish-875': { light: 'rgb(39, 36, 32)', dark: 'rgb(39, 36, 32)' },
          '--dsw-static-neutral-bluish-900': { light: 'rgb(30, 28, 25)', dark: 'rgb(30, 28, 25)' },
          '--dsw-static-neutral-bluish-950': { light: 'rgb(24, 22, 20)', dark: 'rgb(24, 22, 20)' },
        },
      },
      qingyu: {
        label: '青玉清晖',
        note: '清冷古典：玉青底 + 松绿强调，对应「清雅出尘」那一类气质',
        glow: '#1F7A5E',
        cornerShape: 'superellipse(1.55)',
        brandFont: 'inherit',
        scheme: '',
        tokens: {
          '--dsw-alias-bg-base': { light: '#F4F8F6', dark: '#101C18' },
          '--dsw-alias-bg-layer-1': { light: '#FFFFFF', dark: '#16241F' },
          '--dsw-alias-bg-layer-2': { light: '#F1F7F4', dark: '#1C2C26' },
          '--dsw-alias-bg-layer-3': { light: '#E8F1EC', dark: '#23372F' },
          '--dsw-alias-bg-overlay': { light: '#EDF5F1', dark: '#2A4038' },
          '--dsw-alias-border-l1': { light: 'rgba(40, 90, 70, 0.08)', dark: 'rgba(180, 255, 225, 0.08)' },
          '--dsw-alias-border-l2': { light: 'rgba(40, 90, 70, 0.16)', dark: 'rgba(180, 255, 225, 0.16)' },
          '--dsw-alias-brand-primary': { light: '#1F7A5E', dark: '#57C39B' },
          '--dsw-alias-button-primary-fill': { light: '#1F7A5E', dark: '#57C39B' },
          '--dsw-alias-button-primary-hover': { light: '#196349', dark: '#74D2AE' },
          '--dsw-alias-label-primary': { light: '#1B2A24', dark: '#E9F4EF' },
          '--dsw-alias-label-secondary': { light: '#4E6359', dark: '#A9C6B9' },
          '--dsw-alias-label-tertiary': { light: '#7F948A', dark: '#7E9C8F' },
          '--dsw-alias-link': { light: '#1B6B52', dark: '#57C39B' },
          '--dsw-alias-markdown-code-block': { light: '#EFF6F2', dark: '#1A2924' },
          '--dsw-alias-markdown-inline-code': { light: '#E8F1EC', dark: '#23372F' },
          '--dsw-specific-bubble': { light: '#E6F2EC', dark: '#20332B' },
          '--dsw-specific-bubble-highlight': { light: '#D2E8DC', dark: '#2C473B' },
          '--dsw-specific-input-major': { light: '#FFFFFF', dark: '#1C2C26' },
          '--dsw-specific-sidebar-fill': { light: '#EDF4F0', dark: '#0D1714' },
          '--dsw-specific-sidebar-nav-item-active': { light: '#E3EFE9', dark: '#26392F' },
          '--dsw-specific-sidebar-nav-item-hover': { light: '#EFF6F2', dark: '#1B2A24' },
          '--dsw-static-blue-100': { light: 'rgb(229, 244, 239)', dark: 'rgb(229, 244, 239)' },
          '--dsw-static-blue-300': { light: 'rgb(177, 223, 208)', dark: 'rgb(177, 223, 208)' },
          '--dsw-static-blue-400': { light: 'rgb(139, 207, 184)', dark: 'rgb(139, 207, 184)' },
          '--dsw-static-blue-450': { light: 'rgb(124, 201, 175)', dark: 'rgb(124, 201, 175)' },
          '--dsw-static-blue-50': { light: 'rgb(244, 250, 248)', dark: 'rgb(244, 250, 248)' },
          '--dsw-static-blue-500': { light: 'rgb(109, 196, 167)', dark: 'rgb(109, 196, 167)' },
          '--dsw-static-blue-50p': { light: 'rgb(240, 249, 246)', dark: 'rgb(240, 249, 246)' },
          '--dsw-static-blue-600': { light: 'rgb(86, 186, 153)', dark: 'rgb(86, 186, 153)' },
          '--dsw-static-blue-75': { light: 'rgb(237, 247, 244)', dark: 'rgb(237, 247, 244)' },
          '--dsw-static-blue-800': { light: 'rgb(59, 146, 117)', dark: 'rgb(59, 146, 117)' },
          '--dsw-static-blue-900': { light: 'rgb(38, 92, 74)', dark: 'rgb(38, 92, 74)' },
          '--dsw-static-blue-950': { light: 'rgb(31, 76, 61)', dark: 'rgb(31, 76, 61)' },
          '--dsw-static-deepseek-100': { light: 'rgb(234, 247, 243)', dark: 'rgb(234, 247, 243)' },
          '--dsw-static-deepseek-200': { light: 'rgb(224, 242, 236)', dark: 'rgb(224, 242, 236)' },
          '--dsw-static-deepseek-300': { light: 'rgb(203, 234, 224)', dark: 'rgb(203, 234, 224)' },
          '--dsw-static-deepseek-400': { light: 'rgb(146, 211, 189)', dark: 'rgb(146, 211, 189)' },
          '--dsw-static-deepseek-450': { light: 'rgb(134, 206, 182)', dark: 'rgb(134, 206, 182)' },
          '--dsw-static-deepseek-50': { light: 'rgb(242, 249, 247)', dark: 'rgb(242, 249, 247)' },
          '--dsw-static-deepseek-500': { light: 'rgb(102, 193, 163)', dark: 'rgb(102, 193, 163)' },
          '--dsw-static-deepseek-600': { light: 'rgb(72, 178, 142)', dark: 'rgb(72, 178, 142)' },
          '--dsw-static-deepseek-700-delete': { light: 'rgb(55, 135, 108)', dark: 'rgb(55, 135, 108)' },
          '--dsw-static-deepseek-800': { light: 'rgb(41, 102, 82)', dark: 'rgb(41, 102, 82)' },
          '--dsw-static-deepseek-900': { light: 'rgb(31, 75, 60)', dark: 'rgb(31, 75, 60)' },
          '--dsw-static-neutral-bluish-00': { light: 'rgb(255, 255, 255)', dark: 'rgb(255, 255, 255)' },
          '--dsw-static-neutral-bluish-100': { light: 'rgb(237, 240, 239)', dark: 'rgb(237, 240, 239)' },
          '--dsw-static-neutral-bluish-1000': { light: 'rgb(17, 19, 19)', dark: 'rgb(17, 19, 19)' },
          '--dsw-static-neutral-bluish-150': { light: 'rgb(236, 239, 238)', dark: 'rgb(236, 239, 238)' },
          '--dsw-static-neutral-bluish-200': { light: 'rgb(230, 233, 232)', dark: 'rgb(230, 233, 232)' },
          '--dsw-static-neutral-bluish-300': { light: 'rgb(207, 214, 212)', dark: 'rgb(207, 214, 212)' },
          '--dsw-static-neutral-bluish-400': { light: 'rgb(172, 185, 182)', dark: 'rgb(172, 185, 182)' },
          '--dsw-static-neutral-bluish-50': { light: 'rgb(250, 250, 250)', dark: 'rgb(250, 250, 250)' },
          '--dsw-static-neutral-bluish-500': { light: 'rgb(151, 166, 162)', dark: 'rgb(151, 166, 162)' },
          '--dsw-static-neutral-bluish-60': { light: 'rgb(245, 247, 246)', dark: 'rgb(245, 247, 246)' },
          '--dsw-static-neutral-bluish-600': { light: 'rgb(125, 144, 139)', dark: 'rgb(125, 144, 139)' },
          '--dsw-static-neutral-bluish-700': { light: 'rgb(94, 110, 106)', dark: 'rgb(94, 110, 106)' },
          '--dsw-static-neutral-bluish-75': { light: 'rgb(242, 244, 243)', dark: 'rgb(242, 244, 243)' },
          '--dsw-static-neutral-bluish-750': { light: 'rgb(65, 76, 73)', dark: 'rgb(65, 76, 73)' },
          '--dsw-static-neutral-bluish-800': { light: 'rgb(50, 59, 57)', dark: 'rgb(50, 59, 57)' },
          '--dsw-static-neutral-bluish-850': { light: 'rgb(41, 49, 47)', dark: 'rgb(41, 49, 47)' },
          '--dsw-static-neutral-bluish-875': { light: 'rgb(33, 38, 37)', dark: 'rgb(33, 38, 37)' },
          '--dsw-static-neutral-bluish-900': { light: 'rgb(25, 30, 29)', dark: 'rgb(25, 30, 29)' },
          '--dsw-static-neutral-bluish-950': { light: 'rgb(20, 24, 23)', dark: 'rgb(20, 24, 23)' },
        },
      },
    }
    const DEFAULT_THEME = 'molan'
    // THEMES>>>

    /** 宿主半不可用时的兜底：保证界面至少还有头像与名字。 */
    const FALLBACK_CONFIG = {
      assistantName: '小汐',
      assistantTagline: '你的本地 AI 助理',
      looks: [],
      theme: DEFAULT_THEME,
      enabled: true,
    }

    /**
     * 当前生效的主题与配置。
     *
     * 组件在**渲染时**读这个对象而不是读闭包快照：主题/配置可能在组件注册之后
     * 才被异步改写，读快照会把旧值永久钉在界面上。对象引用本身不变，所以组件
     * 不需要任何订阅机制。
     */
    const state = {
      themeId: DEFAULT_THEME,
      theme: THEMES[DEFAULT_THEME],
      config: FALLBACK_CONFIG,
      /** 当前形象在 looks 里的下标；形象素材由宿主半按文件名扫描下发。 */
      lookIndex: 0,
    }

    /**
     * 当前形象。
     *
     * 配置可能还没到、素材也可能被删空，因此逐层回退到 null；调用方负责处理空值
     * （宁可不显示头像，也不要给一个 404 的 src 让界面出现裂图）。
     * @returns 形象对象 { id, label, image, video } 或 null。
     */
    function activeLook() {
      const looks = Array.isArray(state.config.looks) ? state.config.looks : []
      return looks[state.lookIndex] ?? looks[0] ?? null
    }

    /**
     * 给 6 位十六进制颜色加透明度，返回 8 位十六进制。
     * @param hex - `#RRGGBB`。
     * @param alpha - 0..1。
     * @returns CSS 可用的 `#RRGGBBAA`。
     */
    function withAlpha(hex, alpha) {
      const a = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, '0')
      return `${hex}${a}`
    }

    /**
     * 读宿主半下发的配置。
     *
     * 任何失败都退回内置默认值而不是抛出：这个插件的职责是「让界面好看」，
     * 它不该有能力让会话界面挂掉。
     * @returns 配置对象（永不为 null）。
     */
    async function readConfig() {
      try {
        const res = await fetch(ROUTE_ROOT + '/api/config', { headers: { accept: 'application/json' } })
        if (!res.ok) return FALLBACK_CONFIG
        const data = await res.json()
        return { ...FALLBACK_CONFIG, ...(data && typeof data === 'object' ? data : {}) }
      } catch (error) {
        console.warn('[dsh-assistant-skin] 读取配置失败，使用内置默认值:', error)
        return FALLBACK_CONFIG
      }
    }

    /**
     * 助理头像。
     *
     * 圆形裁切 + 描边都要落在 img 自己身上：侧栏把品牌位包在 aria-hidden 的
     * 定尺寸容器里（.brandMark / .railMark），容器不裁圆，靠容器样式裁会在
     * 展开/折叠两种几何下露角。
     * @param props - 席位 owner props：size 为请求的方形边长；className 由 Hero 席位下发。
     * @returns 头像元素。
     */
    function AssistantAvatar(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 24
      return React.createElement('img', {
        src: props.avatarUrl,
        alt: '',
        width: size,
        height: size,
        draggable: false,
        className: props.className,
        'aria-hidden': 'true',
        style: {
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          // 形象素材是全身竖构图，圆形裁切若取正中会露出躯干、把脸挤出画面；
          // 取靠上的位置对准脸部。方图素材下这个偏移几乎无影响。
          objectPosition: '50% 14%',
          display: 'block',
          border: '0.5px solid var(--dsw-alias-border-l2)',
          background: 'var(--dsw-alias-bg-layer-2)',
          // corner-shape 的全局超级椭圆会把正圆压成方圆形，圆形必须显式声明回 round。
          cornerShape: 'round',
        },
      })
    }


    /**
     * 空会话 Hero 的助理形象：外圈用主题强调色的柔光把视觉重心拉到
     * 「助理在等你说话」这件事上。
     *
     * 这里**刻意放大** owner 下发的 size：34px 是参照鱼形 logo 的光学重量定的，
     * 同一张照片在那个体量下只像个缩略图，压在 32px 级标题旁边撑不起形象。
     * 放大到 1.65 倍后与标题等高。容器是 inline-flex 居中且不设固定宽高，
     * 放大不会破坏原有版式。
     * @param props - 席位 owner props（size/className）+ 注入的助理配置。
     * @returns Hero 头像元素。
     */
    function AssistantHeroMark(props) {
      const requested = typeof props.size === 'number' && props.size > 0 ? props.size : 34
      const size = Math.round(requested * HERO_MARK_SCALE)
      const glow = (state.theme && state.theme.glow) || '#C04A82'
      return React.createElement(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            borderRadius: '50%',
            cornerShape: 'round',
            boxShadow: `0 0 0 2px ${withAlpha(glow, 0.30)}, 0 10px 28px ${withAlpha(glow, 0.30)}`,
          },
        },
        React.createElement(AssistantAvatar, { size, className: props.className, avatarUrl: props.avatarUrl }),
      )
    }

    /**
     * 注册助理形象席位。
     *
     * **只接管 Hero 一处**（空会话正中央那个品牌位）。侧栏品牌位（`sidebar.brand.mark`
     * / `sidebar.brand.name`）刻意**不接管**：那一处是 DSH 自己的身份（鱼形标识与构建
     * 版本），换成助理头像与名字既没有信息增量，也让侧栏多了两块要读的文字。助理形象
     * 出现在 Hero 与背景里已经足够。
     *
     * 用 slots.inject 等声明出现再注册：席位由 ui-conversation 声明，插件加载顺序不保证，
     * 裸 register 撞上未声明席位会直接报错。
     * @param ctx - 客户端插件上下文。
     */
    function registerBrandSlots(ctx) {
      ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({
        name: 'conversation.hero.brand.mark',
        priority: -1,
      }, (props) => React.createElement(AssistantHeroMark, { ...props, avatarUrl: (activeLook() ?? {}).image ?? '' })))
    }

    /**
     * 装上圆角配方。
     *
     * ui-theme 只在 `@supports (corner-shape: …)` 内定义 `--dsw-corner-shape`，
     * 并用通配选择器把它应用到所有元素；在 body 上重绑这个变量即可整体改变
     * 圆角曲率。不支持的引擎会忽略它并保持普通圆弧 —— 安全降级。
     * @param cornerShape - 主题配方的 corner-shape 值。
     * @returns 样式元素（供换主题时改写、卸载时移除）。
     */
    function installCornerShape(cornerShape) {
      const el = document.createElement('style')
      el.setAttribute('data-dsh-assistant-skin', 'recipe')
      el.textContent = `body { --dsw-corner-shape: ${cornerShape}; }`
      document.head.appendChild(el)
      return el
    }

    /** ui-theme 的深色档属性名（与 design-platform.css / theme-presenter 一致）。 */
    const DARK_ATTRIBUTE = 'data-ds-dark-theme'

    /**
     * 强制深色档。
     *
     * 为什么 token 覆盖层不够：有六个组件（交付物卡片、变更文件卡、计划卡、JSON 树、
     * 侧栏引导页、启动页）**不读 token**，而是按 `body[data-ds-dark-theme]` 切换自己的
     * 局部变量。深色皮肤若不把这些属性打上，它们仍取浅色档的局部值 —— 交付物卡片就是
     * 这样变成「近白底 + 浅字」而完全读不出来的。
     *
     * 属性归 ui-layout 的展示转换器维护（按 active.colorScheme 增删），而本主题是经
     * overrideTokens 叠上去的、不改 colorScheme，因此这里要自己设、并在被摘掉时补回。
     * 用等值判断做守卫，避免"改属性 → 触发自己"的循环。
     * @returns 拆除函数（断开两个观察器）。
     */
    function enforceScheme() {
      const enforce = () => {
        if (state.theme.scheme !== 'dark') return
        if (!document.body.hasAttribute(DARK_ATTRIBUTE)) document.body.setAttribute(DARK_ATTRIBUTE, '')
        // 原生控件（滚动条、表单控件）跟随 color-scheme，也要一并压成深色。
        if (document.documentElement.style.colorScheme !== 'dark') document.documentElement.style.colorScheme = 'dark'
      }
      enforce()
      const watcher = new MutationObserver(enforce)
      watcher.observe(document.body, { attributes: true, attributeFilter: [DARK_ATTRIBUTE] })
      watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
      return () => watcher.disconnect()
    }

    /**
     * 人物层宽度。**这一处是唯一真源**：媒体层的 CSS 宽度与主区为内容预留的
     * 右侧内边距都取自它，两处各写一份必然漂移，人物就会压到正文。
     */
    const FIGURE_WIDTH = 'min(42%, 620px)'

    /**
     * 为主区内容预留的右侧内边距 —— 取人物层宽度的约六成。
     *
     * **故意让她被压住一部分**，不做完全不重叠：人物整块暴露时太抢视线，而压住左侧那段
     * （正好落在人物层自身的渐隐带上）反而更安静，也更像"她就在旁边"而不是一张海报。
     */
    const CONTENT_CLEARANCE_RATIO = 0.26
    const CONTENT_CLEARANCE_MAX = 380

    /** 「一段安静」的判定阈值：超过它才把新增行当成新的一波动静（用户发了消息）。 */
    const ACTIVITY_QUIET_MS = 5000
    /** 主动触发动作的最小间隔，避免快速来回对话时动作叠在一起。 */
    const ACTIVITY_COOLDOWN_MS = 8000
    /** 点击人物触发动作的最小间隔 —— 防连点，不是克制（那是自动触发那边的职责）。 */
    const CLICK_COOLDOWN_MS = 1200


    /** 注入样式：背景媒体层 + 形象切换控件。全部限定在 .dsh-skin-* 前缀下，不碰 DSH 自身类名。 */
    const STAGE_CSS = [
      // bg-base 半透明后，页面画布（html）会透出浏览器默认白；媒体层只在会话区内，
      // 所以给 html 垫一层与皮肤同色系的实底，侧栏之外也不会露白。
      'html{background:#05080D}',
      '.dsh-skin-media{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
      // 媒体层整体 pointer-events:none（免得挡住对话操作），只把**人物层**放开：
      // 人物层在 z-index 上位于对话内容之下，所以内容区上的点击仍归内容，不会被抢。
      '.dsh-skin-fig{position:absolute;top:0;right:0;bottom:0;width:' + FIGURE_WIDTH + ';pointer-events:auto;cursor:pointer;background-repeat:no-repeat;background-size:cover;background-position:50% 14%;',
      // 渐隐带刻意拉长到 ~55%：人物从暗处徐徐浮现，而不是一块边缘生硬的图。
      // 内容压住的那一段正好落在这条渐隐带上，于是"压住"读起来像融合，不像遮挡。
      '-webkit-mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 18%,rgba(0,0,0,.78) 38%,#000 56%,#000 100%);mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 18%,rgba(0,0,0,.78) 38%,#000 56%,#000 100%)}',
      '.dsh-skin-fig[data-fit="cover"]{width:100%;-webkit-mask-image:none;mask-image:none}',
      // 压暗薄纱：正文与人物分开之后，右半边不再被正文那层蒙版顺带压暗，于是人物变亮、
      // 持续抢视线。薄纱盖在人物上（受人物层自身 mask 约束，左缘照旧渐隐）。
      // 薄纱只做**整体降调**，不做左右偏差：压暗内容那一段是蒙版的职责。
      // 两处都偏左会把人物左半边压两遍 —— 观感就是"形象被挡住了半边"（实测踩到）。
      '.dsh-skin-veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,13,.34) 0%,rgba(5,8,13,.24) 52%,rgba(5,8,13,.12) 100%)}',
      // 静图当底层（永远在），两个视频叠在它上面交替淡入淡出；两者都绝对定位，
      // 这样切换时不会互相挤动版式。
      '.dsh-skin-fig img,.dsh-skin-fig video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 14%;display:block}',
      // 刻意**不加**不透明度过渡：两条片段的内在尺寸相同、object-fit 算出的缩放也相同，
      // 硬切的几何变化为零，只剩内容差（与压缩噪声同阶）。任何淡入淡出都会引入
      // 可见的中间态 —— 交叉淡入是两帧叠加的重影，淡出到静图是取景不一致的"拉伸"。
      '.dsh-skin-fig video{opacity:0}',
      '.dsh-skin-fig video[data-on="1"]{opacity:1}',
      // 蒙版只为正文可读服务。主区右侧已为人物预留内边距，正文不会越过中线，
      // 因此右半段可以不压暗 —— 压太狠人物就看不清了。
      // 蒙版必须在**内容边界处已经压到接近全暗**，否则内容根容器那层半透明底色
      // （--dsw-alias-bg-base，alpha .45）会在交接处留下一道明暗台阶 —— 因为它的宽度
      // 正好停在内容边界上，左边比右边多那 .45。两边都压到 .9 以上，台阶就差不到 5%，
      // 看不出来。边界位置由 JS 算出并写进 --dsh-skin-content-edge，避免两处各写一份。
      // 暗区**严格跟着正文列走**，边界绑到 --dsh-skin-text-edge（正文列真实右边缘）。
      //
      // 演化过程值得记下来，因为每一步都踩过：
      //   · 一开始铺到内边距边界（74%）→ 比正文宽 11 个点，把人物白白压住；
      //   · 为对齐台阶又把全暗段拉到边界 → 人物从 58% 就被压，观感是"挡住半边"。
      //   · 现在：底色 alpha 压到近乎为零（台阶从根上消失），暗区只覆盖正文本身。
      // 收尾只留 4 个点的过渡带，且它是**连续渐变**而非台阶（二阶差分实测与画面自身同阶）。
      '.dsh-skin-scrim{position:absolute;inset:0;background:linear-gradient(90deg,'
        + 'rgba(5,8,13,.96) 0%,rgba(5,8,13,.94) calc(var(--dsh-skin-text-edge,63%) - 7%),'
        + 'rgba(5,8,13,.80) calc(var(--dsh-skin-text-edge,63%) - 3%),'
        + 'rgba(5,8,13,.38) calc(var(--dsh-skin-text-edge,63%) + 1%),'
        + 'rgba(5,8,13,.06) calc(var(--dsh-skin-text-edge,63%) + 5%),'
        + 'rgba(5,8,13,.02) 100%)}',
      '.dsh-skin-media[data-narrow="1"] .dsh-skin-fig{opacity:.4}',
      '.dsh-skin-media[data-narrow="1"] .dsh-skin-scrim{background:linear-gradient(90deg,rgba(5,8,13,.97) 0%,rgba(5,8,13,.93) 55%,rgba(5,8,13,.62) 100%)}',
      '.dsh-skin-hud{position:absolute;top:12px;right:14px;z-index:5;display:flex;align-items:center;gap:6px}',
      '.dsh-skin-chip{height:32px;padding:0 12px;border-radius:999px;display:flex;align-items:center;gap:8px;background:rgba(11,18,28,.62);border:1px solid rgba(124,180,255,.18);',
      '-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);color:#E7EFF9;font:12px/1 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}',
      '.dsh-skin-thumb{width:24px;height:24px;border-radius:50%;flex:none;cursor:pointer;opacity:.5;border:1px solid rgba(124,180,255,.25);background-size:cover;background-position:50% 14%}',
      '.dsh-skin-thumb:hover{opacity:.85}',
      '.dsh-skin-thumb[data-on="1"]{opacity:1;border-color:#4FB6E8;box-shadow:0 0 0 2px rgba(79,182,232,.28)}',
    ].join('')

    /**
     * 定位会话主区。
     *
     * DSH 的类名是构建期哈希的（形如 `fgkwxG_frame`），不能靠类名选。这里靠结构：
     * `#root` 下的 frame 是一个 grid，**在流内**的子元素依次是侧栏 / 主区 / 右栏；
     * 取其中最宽的那个即主区。必须排除绝对定位的浮层 —— 它们是整屏宽，会把主区选掉
     * （实测踩过：选到 1440 宽的浮层，媒体层挂错了地方）。
     * @returns 主区元素；结构不符时返回 null。
     */
    function findConversationStage() {
      const root = document.getElementById('root')
      if (root === null) return null
      /** 在流内、且宽于 200px 的子元素 —— 用于排除绝对定位的整屏浮层。 */
      const inFlowWide = (el) => [...el.children].filter((k) => {
        if (k.getBoundingClientRect().width <= 200) return false
        const ks = getComputedStyle(k)
        return ks.position === 'static' && ks.display !== 'none'
      })
      // 不再猜层级（`div > div` 会匹配到 display:contents 的包装层，实测踩过），
      // 改为按**计算样式**找栅格容器：那个 display 是 grid/flex、且有 ≥2 个在流宽子元素的
      // 元素就是应用外框；它的子元素依次是侧栏 / 主区 / 右栏。
      const frame = [...root.querySelectorAll('div')].find((el) => {
        const display = getComputedStyle(el).display
        return (display === 'grid' || display === 'flex') && inFlowWide(el).length >= 2
      })
      if (frame === undefined) return null
      const kids = inFlowWide(frame)
      if (kids.length === 0) return null
      // 主区 = 最宽的那个（侧栏固定窄、右栏可能为 0 宽）。
      return kids.reduce((a, b) => (a.getBoundingClientRect().width >= b.getBoundingClientRect().width ? a : b))
    }

    /**
     * 装上背景形象层与形象切换控件。
     *
     * 三个要点：
     *   ① 媒体层挂在**主区内部**而不是视口上 —— 文件面板打开把主区挤窄时，它跟着重排，
     *      不会盖住面板、也不需要重算位置。
     *   ② 尺寸按**主区宽度的百分比**（width:min(42%,620px)）而不是按高度 —— 按高度定尺寸
     *      的话，主区被挤到一半时图片占宽会从 42% 暴涨到 ~80%，直接压到正文上（实测）。
     *   ③ 主区窄于 860px 时降级（人物降到 40% 不透明度、蒙版加重），保证正文始终优先。
     *
     * @param ctx - 客户端插件上下文。
     * @returns 拆除函数。
     */
    function installStageLook(ctx) {
      const stage = findConversationStage()
      if (stage === null) return null

      const prev = { position: stage.style.position, isolation: stage.style.isolation, paddingRight: stage.style.paddingRight }
      stage.style.position = 'relative'
      // isolation 让主区成为独立层叠上下文：z-index:-1 的媒体层才能画在主区自身背景
      // 之上、而又在会话内容之下。
      stage.style.isolation = 'isolate'

      const styleEl = document.createElement('style')
      styleEl.setAttribute('data-dsh-assistant-skin', 'stage')
      styleEl.textContent = STAGE_CSS
      document.head.appendChild(styleEl)

      const media = document.createElement('div')
      media.className = 'dsh-skin-media dsh-skin-stage'
      const fig = document.createElement('div')
      fig.className = 'dsh-skin-fig'
      /** 两个视频槽交替使用：一个在放，另一个预载下一条 —— 切换时交叉淡入。 */
      const makeVideo = () => {
        const v = document.createElement('video')
        v.muted = true
        v.loop = false            // 本片放完要切下一条，不能自己循环
        v.playsInline = true
        v.preload = 'auto'
        return v
      }
      const videos = [makeVideo(), makeVideo()]
      const img = document.createElement('img')
      img.alt = ''; img.draggable = false
      const scrim = document.createElement('div')
      scrim.className = 'dsh-skin-scrim'
      const veil = document.createElement('div')
      veil.className = 'dsh-skin-veil'
      // 静图最底，视频叠在上面，最后是压暗薄纱（盖住两者，整块人物色调统一）。
      fig.append(img, videos[0], videos[1], veil)
      media.append(fig, scrim)

      const hud = document.createElement('div')
      hud.className = 'dsh-skin-hud'

      stage.prepend(hud)
      stage.prepend(media)

      /**
       * 竖构图走右侧贴合，横构图满屏铺满。
       * 只由**静图**决定：同一形象的所有片段都从这张静图生成、尺寸一致，让每个片段
       * 加载时都来改一次画幅，等于给运行中的版面留了一个会抖动的入口。
       */
      const setFit = (w, h) => { if (w > 0 && h > 0) fig.setAttribute('data-fit', h > w * 1.05 ? 'panel' : 'cover') }
      img.addEventListener('load', () => setFit(img.naturalWidth, img.naturalHeight))

      let thumbs = []
      let active = -1
      /** 当前形象的片段队列。 */
      let queue = []
      /** 当前在放的槽位（0/1）。 */
      let slot = 0
      /** 上一条播过的下标 —— 触发动作时用它避免连续两次同一条。 */
      let lastIndex = -1
      /** 当前常驻片段的下标（-1 = 还没选）。 */
      let idleIndex = -1
      /** 本段常驻的结束时刻（毫秒时间戳）。 */
      let idleUntil = 0

      /**
       * 常驻（"发呆"）动作集合 —— 近乎静止，只是安静地在边上。
       *
       * 必须与"会吸引注意力"的动作分开。人在工作时，一个每隔几秒就换个姿势的助理
       * 会持续抢注意力；正确的行为是**绝大部分时间停在常驻状态**，动作只是偶尔发生。
       * 这里的名字与 tools/make-look-video.mjs 的动作表对应，未列出的都视为动作。
       */
      const IDLE_ACTIONS = new Set(['breathe', 'breatheSlow', 'blink', 'idle', 'default'])
      /** 一段常驻持续多久（毫秒区间）。 */
      const IDLE_DWELL_MS = [40000, 120000]
      /** 一段常驻结束后触发一个动作的概率；其余情况只是换个发呆姿势继续待着。 */
      const GESTURE_PROBABILITY = 0.35

      /**
       * 选常驻片段 —— **每次换形象只选一次**，之后整段时间都用它自循环。
       *
       * 为什么不允许轮换：每条常驻片段都是独立生成的，静止姿态（头部位置、肩线）各不
       * 相同；在它们之间切换时姿态会跳一下，观感正是"她一直在扭头"。要安静，就不能换。
       * 优先用 `breathe`（动作表里最静的一条），没有就退到任意常驻片段、再退到第一条。
       * @returns 常驻片段下标。
       */
      const chooseIdle = () => {
        // 配置优先：idleAction 决定"她平时什么样"，而常驻占 98% 的时间，值得一个旋钮。
        // 依次回退：配置的动作 → breathe → 任意常驻 → 第一条，保证永远选得出来。
        const wanted = String((state.config && state.config.idleAction) || '').trim()
        if (wanted !== '') {
          const hit = queue.findIndex((c) => c.action === wanted)
          if (hit >= 0) return hit
        }
        const preferred = queue.findIndex((c) => c.action === 'breathe')
        if (preferred >= 0) return preferred
        const fallback = queue.findIndex((c) => IDLE_ACTIONS.has(c.action))
        return fallback >= 0 ? fallback : 0
      }

      /** 从下标数组里等概率取一个，尽量避开 `exclude`。 */
      const pickFrom = (list, exclude = -1) => {
        const pool = list.filter((i) => i !== exclude)
        const use = pool.length > 0 ? pool : list
        return use[Math.floor(Math.random() * use.length)]
      }

      const randomDwell = () => IDLE_DWELL_MS[0] + Math.random() * (IDLE_DWELL_MS[1] - IDLE_DWELL_MS[0])

      /**
       * 挑下一条片段。规则按优先级：
       *   ① 本段常驻还没到点 → **继续同一条**常驻片段。同一条自循环本身无缝，
       *      所以这段时间画面完全没有切换，她只是安静待着；
       *   ② 常驻到点 → 以小概率触发一个动作，随后重新开始一段常驻；
       *   ③ 其余情况 → 换一条常驻片段（换个发呆姿势），同样开启新的一段常驻。
       *
       * 按默认参数，动作平均每 3~6 分钟才出现一次，其余时间都是常驻。
       * @returns 片段下标；队列为空时返回 -1。
       */
      const pickIndex = () => {
        if (queue.length === 0) return -1
        const now = Date.now()
        const gestures = queue.map((c, i) => ({ c, i })).filter((x) => !IDLE_ACTIONS.has(x.c.action)).map((x) => x.i)

        // 常驻片段**只选一次**，整段时间都用同一条自循环 —— 见 chooseIdle() 的说明：
        // 轮换不同常驻片段会让静止姿态跳变，观感就是"她一直在扭头"。
        if (idleIndex < 0) idleIndex = chooseIdle()

        if (now < idleUntil) return idleIndex                            // ① 继续安静待着

        idleUntil = now + randomDwell()
        if (gestures.length > 0 && Math.random() < GESTURE_PROBABILITY) { // ② 偶尔动一下
          // 只返回动作下标，idleIndex 保持不变 —— 动作结束后自然回到同一条常驻片段，
          // 不会因为"重新挑一条常驻"而换掉静止姿态。
          return pickFrom(gestures, lastIndex)
        }
        return idleIndex                                                 // ③ 延长这段常驻
      }

      /**
       * 切换下一条片段 —— **硬切，不做任何过渡动画**。
       *
       * 这是试过两种过渡之后定下来的，两种都会被看出来：
       *   · 交叉淡入 → 两条片段各自独立生成、人物位置有细微差异，两帧同时可见时出现
       *     **重影**（观感是"抖一下"）；
       *   · 淡出到静图再淡入 → 静图用 `background-size:cover`、视频用 `object-fit:cover`，
       *     而两者内在尺寸不同（静图 710×1272 / 视频 480×832，且生成时 ImageScale 把长宽比
       *     改动了 3.4%），算出的缩放不一致 → 露出静图时出现**取景跳变**（观感是"拉伸"）。
       *
       * 硬切之所以干净：两条片段的内在尺寸完全相同，`object-fit` 在同一个人物层里算出的
       * 缩放必然一致，**几何变化为零**，只剩内容差（实测首尾差 2.4 量级，与压缩噪声同阶）。
       * 代价是需要等新片段真的能出画再切，否则会闪空帧 —— 用 readyState 守住。
       */
      const advance = (forced = -1) => {
        const index = forced >= 0 ? forced : pickIndex()
        if (index < 0) return
        lastIndex = index
        const incoming = 1 - slot
        const outgoing = slot
        const v = videos[incoming]
        v.src = queue[index].url

        const begin = () => {
          try { v.currentTime = 0 } catch { /* 元数据未就绪时忽略，play() 会从头开始 */ }
          const pr = v.play()
          if (pr && pr.catch) pr.catch(() => {})   // 被自动播放策略拦下时静默
          // 同一帧内完成切换：立即可见的那一帧就是新片段第 0 帧。
          v.setAttribute('data-on', '1')
          videos[outgoing].setAttribute('data-on', '0')
          slot = incoming
          // 旧槽在下一帧之后再释放，避免与本次切换抢同一帧。
          setTimeout(() => { videos[outgoing].pause(); videos[outgoing].removeAttribute('src') }, 120)
        }

        // 新片段真的能出画了再切，否则会闪一下空帧
        if (v.readyState >= 2) begin()
        else v.addEventListener('canplay', begin, { once: true })
      }

      videos.forEach((v, i) => {
        v.addEventListener('ended', () => { if (i === slot) advance() })
      })

      const selectLook = (index) => {
        const looks = Array.isArray(state.config.looks) ? state.config.looks : []
        const look = looks[index]
        if (look === undefined) return
        active = index
        state.lookIndex = index
        thumbs.forEach((t, k) => t.setAttribute('data-on', k === index ? '1' : '0'))
        if (look.image !== null && look.image !== undefined) {
          fig.style.backgroundImage = `url("${look.image}")`
          img.src = look.image          // 底层静图：视频缺席或淡出时兜底
        }
        queue = (Array.isArray(look.clips) ? look.clips : []).filter((c) => c !== null && c !== undefined && c.url)
        lastIndex = -1
        idleIndex = -1
        idleUntil = 0
        // 换形象时**不清空旧画面**：清了就会在加载新片段期间露出静图，而静图与视频取景
        // 不一致，那一下正是"拉伸"感的来源。让旧画面继续挂着，新片段就绪后硬切过去。
        if (queue.length > 0) {
          advance()
        } else {
          // 例外：新形象**一条片段都没有**（例如素材刚加进来、片段还没生成）。
          // 这时必须把旧视频退场，否则旧形象会一直挂着，看起来像"点了没反应"。
          // 退回静图正是这个情况下该做的事。
          videos.forEach((v) => { v.pause(); v.removeAttribute('src'); v.removeAttribute('data-on') })
          slot = 0
        }
      }

      /** 形象清单由宿主半异步下发；只有一个形象时不显示切换控件。 */
      const renderHud = () => {
        hud.textContent = ''
        thumbs = []
        const looks = Array.isArray(state.config.looks) ? state.config.looks : []
        hud.style.display = looks.length < 2 ? 'none' : ''
        if (looks.length < 2) return
        const chip = document.createElement('div')
        chip.className = 'dsh-skin-chip'
        const label = document.createElement('span')
        label.textContent = '形象'
        chip.appendChild(label)
        looks.forEach((look, i) => {
          const t = document.createElement('span')
          t.className = 'dsh-skin-thumb'
          t.title = look.label
          if (look.image !== null && look.image !== undefined) t.style.backgroundImage = `url("${look.image}")`
          t.addEventListener('click', () => selectLook(i))
          chip.appendChild(t)
          thumbs.push(t)
        })
        hud.appendChild(chip)
      }

      // 主区窄于 860px 时降级：人物让位给正文。
      /**
       * 读 DSH 的对话正文列宽（由 ui-conversation 的 --dsh-chat-content-width 决定）。
       *
       * 直接读这个变量而不是自己量元素：它是 DSH 内部唯一真源，会随窗口与用户拖动而变；
       * 自己量到的往往是外层容器，比正文宽，暗区就会多铺一截压住人物。
       * @returns 正文列宽（px）；读不到时返回 0。
       */
      const textColumnWidth = () => {
        // 这里的坑有两层，都踩过了：
        //   ① 变量定义在会话体的 .body 上，不在舞台第一层子元素上 —— 只探第一层读到空值；
        //   ② 它的计算值是 `clamp(680px, calc(...), 920px)` 这样的**表达式**，
        //      `parseFloat` 得到 NaN（不是"没读到"，而是"读到了但不会算"）。
        // 所以：先找一个确实带着这个变量的元素，再插一个探针元素用 `width: var(...)`
        // 让浏览器自己把表达式算成像素。
        const candidates = [stage, ...stage.querySelectorAll('*')].slice(0, 80)
        const owner = candidates.find((el) => getComputedStyle(el).getPropertyValue('--dsh-chat-content-width').trim() !== '')
        if (owner === undefined) return 0
        const probe = document.createElement('div')
        probe.setAttribute('data-dsh-assistant-skin', 'probe')
        probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--dsh-chat-content-width)'
        measuring = true
        owner.appendChild(probe)
        const width = probe.getBoundingClientRect().width
        probe.remove()
        measuring = false
        return width
      }

      /**
       * 给对话内容让出人物所在的那条右侧带。
       *
       * DSH 的对话内容列是**居中**的（宽度由 `--dsh-chat-content-width` 决定），所以
       * 只调列宽解决不了压人物的问题 —— 内容仍会在中间，右边缘照样伸到人物身上。
       * 这里改用「主区右侧内边距 = 人物层宽度」：内边距不参与绝对定位，媒体层与 HUD
       * 走的是 padding box（仍铺满整个主区），只有正常流里的对话内容被推左，
       * 于是它居中于「去掉人物之后」的那块区域。
       *
       * 窄舞台时收回去 —— 那时人物已经淡到 40%，正文优先。
       */
      const applyClearance = (width) => {
        const narrow = width < 860
        // 内边距**直接写像素**：比例与上限只在这里算一次，蒙版的边界位置也从同一个
        // 数字推出来 —— 两处各算一份必然会漂移，而漂移的后果就是交接处重新出现台阶。
        const padPx = narrow || width <= 0 ? 0 : Math.round(Math.min(width * CONTENT_CLEARANCE_RATIO, CONTENT_CLEARANCE_MAX))
        const wanted = padPx + 'px'
        if (media.getAttribute('data-narrow') !== (narrow ? '1' : '0')) media.setAttribute('data-narrow', narrow ? '1' : '0')
        if (stage.style.paddingRight !== wanted) stage.style.paddingRight = wanted
        if (width > 0) {
          const edge = Math.round((width - padPx) / width * 100) + '%'
          if (media.style.getPropertyValue('--dsh-skin-content-edge') !== edge) media.style.setProperty('--dsh-skin-content-edge', edge)

          // 正文列的**真实**右边缘：内容盒宽度由 DSH 的 --dsh-chat-content-width 决定，
          // 列在其中居中。暗区要跟着它走，而不是跟着内边距边界 —— 后者比正文宽，
          // 多出来的部分会把人物白白压住（实测：正文到 63%，边界在 74%）。
          const textW = textColumnWidth()
          const boxW = width - padPx
          const textEdgePct = textW > 0 && textW < boxW
            ? Math.round((boxW + textW) / 2 / width * 100)
            : Math.round(boxW / width * 100)
          const textEdge = Math.max(30, Math.min(96, textEdgePct)) + '%'
          if (media.style.getPropertyValue('--dsh-skin-text-edge') !== textEdge) media.style.setProperty('--dsh-skin-text-edge', textEdge)
        }
      }

      /**
       * 注意：这里**必须用边框盒宽度**（`getBoundingClientRect`），不能用
       * `entries[0].contentRect.width`。
       *
       * contentRect 是**内容盒**宽度、不含内边距；而本函数自己会给主区加内边距，
       * 于是形成自反馈：加内边距 → 内容盒 1320 变 766 → 低于 860 阈值判为「窄」→
       * 内边距清零 → 内容盒回到 1320 → 又判为「宽」→ 再加内边距 …… 无限振荡，
       * 表现就是界面疯狂闪烁（2026-09-22 实测踩到）。
       * 边框盒宽度不受自身内边距影响，振荡从根上不存在。
       */
      const observer = new ResizeObserver(() => {
        applyClearance(stage.getBoundingClientRect().width)
      })

      /** 测量期间为 true：探针元素的增删会触发 childList 观察器，必须屏蔽掉。 */
      let measuring = false

      /** 上一次"对话有动静"与上一次"主动触发动作"的时刻。 */
      let lastActivityAt = 0
      let lastGestureAt = 0

      /** 仅取动作片段的下标（常驻片段不算）。 */
      const gestureIndices = () => queue
        .map((c, i) => ({ c, i }))
        .filter((x) => !IDLE_ACTIONS.has(x.c.action))
        .map((x) => x.i)

      /**
       * 对话有动静时让她动一下。
       *
       * 触发条件是「**一段安静之后的第一次新增行**」，而不是"有新增就触发"：
       *   · 用户发消息时，那一行总是安静之后的第一次新增 → 正好对上"我一发消息她就回应"；
       *   · 助手流式输出、连续工具调用会密集产生行 → 不触发，否则她会从头动到尾。
       * 再加一次冷却，避免快速来回对话时动作叠在一起。
       *
       * 用 DOM 观察而不是 `useChat`：后者是 ChatSnapshot 的选择器钩子，要吃透整个 Chat
       * 对象层才能安全消费；而这里只关心"有没有新行"，DOM 的 childList 已经足够，
       * 且不依赖任何内部数据结构。
       */
      const onConversationActivity = () => {
        if (measuring) return
        const now = Date.now()
        const quietBefore = now - lastActivityAt
        lastActivityAt = now
        if (quietBefore < ACTIVITY_QUIET_MS) return          // 属于同一波，忽略
        if (now - lastGestureAt < ACTIVITY_COOLDOWN_MS) return
        const gestures = gestureIndices()
        if (gestures.length === 0) return
        lastGestureAt = now
        idleUntil = now + randomDwell()                      // 动作之后重新起一段常驻
        advance(pickFrom(gestures, lastIndex))
      }

      /**
       * 点击人物触发一个动作。
       *
       * 与"对话有动静"那条自动触发分开：这是**用户直接点名**，所以要即时响应，
       * 冷却只用来防连点刷动作（自动触发那边是在"稀有"这一侧克制的）。
       */
      let lastClickAt = 0
      fig.addEventListener('click', () => {
        const now = Date.now()
        if (now - lastClickAt < CLICK_COOLDOWN_MS) return
        const gestures = gestureIndices()
        if (gestures.length === 0) return          // 该形象还没有片段（或只有静图）
        lastClickAt = now
        idleUntil = now + randomDwell()            // 动作之后重新起一段常驻
        advance(pickFrom(gestures, lastIndex))
      })

      const activityObserver = new MutationObserver((records) => {
        if (measuring) return
        for (const r of records) {
          if (r.target instanceof Element && r.target.closest('.dsh-skin-media, .dsh-skin-hud') !== null) continue
          if (r.addedNodes.length > 0) { onConversationActivity(); return }
        }
      })
      activityObserver.observe(stage, { childList: true, subtree: true })
      observer.observe(stage)

      applyClearance(stage.getBoundingClientRect().width)
      renderHud()
      selectLook(0)
      // 配置是异步到的：到达后重画切换控件并切到当前形象。
      ctx.effect(() => () => {
        observer.disconnect()
        activityObserver.disconnect()
        media.remove(); hud.remove(); styleEl.remove()
        stage.style.position = prev.position
        stage.style.isolation = prev.isolation
        stage.style.paddingRight = prev.paddingRight
      }, 'dsh-assistant-skin: stage look')

      return { renderHud, selectLook }
    }

    /**
     * 插件入口。
     * @param ctx - 客户端插件上下文。
     */
    function apply(ctx) {
      // theme 用 ctx.get 软探测而非写进 inject：宿主没装 ui-theme 时（理论上不该发生，
      // 但这是第三方插件）皮肤应退化成「只有头像和名字」，而不是整个浏览器半挂起等一个
      // 永远不来的服务。
      const themeSvc = typeof ctx.get === 'function' ? ctx.get('theme') : undefined
      const usable = themeSvc !== undefined && typeof themeSvc.overrideTokens === 'function'
      if (!usable) console.warn('[dsh-assistant-skin] 主题服务不可用，跳过配色覆盖（头像与名字仍然生效）')

      // bg-base 现在是全透明的，页面底色必须另有人承担：这张表**与媒体层无关，始终注入**，
      // 否则媒体层没装上（找不到主区、或没有形象素材）时，body 透明会露出浏览器默认白底。
      const baseEl = document.createElement('style')
      baseEl.setAttribute('data-dsh-assistant-skin', 'base')
      baseEl.textContent = 'html{background:#05080D}'
      document.head.appendChild(baseEl)

      let disposeTokens = null
      const styleEl = installCornerShape(state.theme.cornerShape)

      /** 把当前主题的 token 层重新提交给 ui-theme（换主题时先撤销再提交）。 */
      const syncTokens = () => {
        if (!usable) return
        if (disposeTokens !== null) disposeTokens()
        disposeTokens = themeSvc.overrideTokens(THEME_SOURCE, state.theme.tokens)
      }

      // 先用内置默认主题顶上：配置是异步取回的，不先垫一层就会闪回原皮肤。
      syncTokens()
      const releaseScheme = enforceScheme()
      ctx.effect(() => releaseScheme, 'dsh-assistant-skin: forced color scheme')

      readConfig().then((cfg) => {
        state.config = cfg
        if (cfg.enabled === false) {
          // 整个插件关闭：连已经垫上的 token 层和圆角配方一起撤掉。
          if (disposeTokens !== null) { disposeTokens(); disposeTokens = null }
          styleEl.remove()
          return
        }
        const picked = THEMES[cfg.theme] !== undefined ? cfg.theme : DEFAULT_THEME
        if (picked !== state.themeId) {
          state.themeId = picked
          state.theme = THEMES[picked]
          syncTokens()
          styleEl.textContent = `body { --dsw-corner-shape: ${state.theme.cornerShape}; }`
        }
        registerBrandSlots(ctx)
        installWhenReady(ctx)
      }).catch((error) => {
        // readConfig 自带兜底，走到这里只可能是注册阶段出错；记下来但不拖垮插件加载。
        console.warn('[dsh-assistant-skin] 品牌位注册失败:', error)
      })

      /**
       * 主区是异步挂载的（插件可能在应用壳渲染完成前就 apply），因此做有限次重试。
       * 找不到就放弃并留日志 —— 宁可不显示背景，也不能因为找不到元素而报错。
       */
      let stageHandle = null
      const installWhenReady = (attempt = 0) => {
        stageHandle = installStageLook(ctx)
        if (stageHandle !== null) return
        if (attempt >= 20) {
          const root = document.getElementById('root')
          console.warn('[dsh-assistant-skin] 未定位到会话主区，跳过背景形象层；#root 子元素数=', root === null ? 'root 不存在' : root.querySelectorAll('*').length)
          return
        }
        setTimeout(() => installWhenReady(attempt + 1), 500)
      }

      ctx.effect(() => () => {
        if (disposeTokens !== null) disposeTokens()
        styleEl.remove()
        baseEl.remove()
      }, 'dsh-assistant-skin: teardown')
    }

    exports.apply = apply
    exports.inject = inject
    // 测试面（宿主忽略）：供 tools/smoke.mjs 在假 ctx 上断言席位注册与主题完整性。
    exports.__test = {
      THEMES,
      DEFAULT_THEME,
      FALLBACK_CONFIG,
      state,
      withAlpha,
      activeLook,
      AssistantAvatar,
      AssistantHeroMark,
      enforceScheme,
      DARK_ATTRIBUTE,
      registerBrandSlots,
      installCornerShape,
      readConfig,
    }
    return module.exports
  },
})
