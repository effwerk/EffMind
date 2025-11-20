const isMac = navigator.userAgentData
    ? navigator.userAgentData.platform === 'macOS'
    : /Mac/i.test(navigator.userAgent);

export default function getMenuItems(T) {
    return [
        {
            label: T('Search'),
            event: 'toggle-search',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + F`,
            icon: 'search',
        },
        { separator: true },
        {
            label: T('Expand All'),
            event: 'expand-all-node'
        },
        {
            label: T('Collapse All'),
            event: 'collapse-all-node'
        },
        { separator: true },
        {
            label: T('Edit'),
            items: [
                {
                    label: T('Undo'),
                    event: 'undo',
                    shortcut: `${isMac ? '⌘' : 'Ctrl'} + Z`,
                    statusKey: 'undo',
                },
                {
                    label: T('Redo'),
                    event: 'redo',
                    shortcut: `${isMac ? '⇧ + ⌘' : 'Shift + Ctrl'} + Z`,
                    statusKey: 'redo',
                },
                { separator: true },
                {
                    label: T('Copy'),
                    event: 'copy-node',
                    shortcut: `${isMac ? '⌘' : 'Ctrl'} + C`,
                    statusKey: 'copy',
                },
                {
                    label: T('Cut'),
                    event: 'cut-node',
                    shortcut: `${isMac ? '⌘' : 'Ctrl'} + X`,
                    statusKey: 'cut',
                },
                {
                    label: T('Paste'),
                    event: 'paste-node',
                    shortcut: `${isMac ? '⌘' : 'Ctrl'} + V`,
                    statusKey: 'paste',
                },
            ],
        },
        {
            label: T('View'),
            items: [
                { label: T('Zoom In'), event: 'mindmap-zoom-in' },
                { label: T('Zoom Out'), event: 'mindmap-zoom-out' },
                { separator: true },
                {
                    label: T('Reset View'),
                    event: 'mindmap-reset-view',
                },
                { label: T('Center View'), event: 'mindmap-center-view' },
            ],
        },
        {
            label: T('Minimap'),
            items: [
                {
                    label: [T('Hide'), T('Show')],
                    event: 'toggle-minimap',
                    statusKey: 'minimap',
                },
                {
                    label: [T('Internal drag'), T('Global Drag')],
                    event: 'mindmap-toggle-drag-mode',
                    statusKey: 'minimapGlobalDrag',
                },
            ],
        },
        { separator: true },
        {
            label: T('File'),
            items: [
                { label: T('Export Image'), event: 'mindmap-export-image' },
                { label: T('Export SVG'), event: 'mindmap-export-svg' },
            ],
        },
        { separator: true },
        {
            label: T('Curve Style'),
            items: [
                {
                    label: T('Smooth S-shape'),
                    event: 'mindmap-change-curve',
                    detail: { curveType: 'cubic_smooth_s' },
                    statusKey: 'curveStyle',
                },
                {
                    label: T('Straight'),
                    event: 'mindmap-change-curve',
                    detail: { curveType: 'straight' },
                    statusKey: 'curveStyle',
                },
                {
                    label: T('Quadratic Bezier - Mid Y-offset'),
                    event: 'mindmap-change-curve',
                    detail: { curveType: 'quadratic_mid_y_offset' },
                    statusKey: 'curveStyle',
                },
                {
                    label: T('Cubic Bezier - Original Horizontal Tangent'),
                    event: 'mindmap-change-curve',
                    detail: { curveType: 'cubic_original_horizontal' },
                    statusKey: 'curveStyle',
                },
            ],
        },
        {
            label: T('Language'),
            items: [
                {
                    label: T('English'),
                    event: 'change-lang',
                    detail: { lang: 'en' },
                    statusKey: 'lang',
                },
                {
                    label: T('Chinese (Simplified)'),
                    event: 'change-lang',
                    detail: { lang: 'zhs' },
                    statusKey: 'lang',
                },
                {
                    label: T('Chinese (Traditional)'),
                    event: 'change-lang',
                    detail: { lang: 'zht' },
                    statusKey: 'lang',
                },
                {
                    label: T('Dutch'),
                    event: 'change-lang',
                    detail: { lang: 'nl' },
                    statusKey: 'lang',
                },
                {
                    label: T('German'),
                    event: 'change-lang',
                    detail: { lang: 'de' },
                    statusKey: 'lang',
                },
            ],
        },
        {
            label: T('Theme'),
            items: [
                {
                    label: T('System'),
                    event: 'toggle-theme',
                    detail: { theme: 'system' },
                    statusKey: 'theme',
                },
                {
                    label: T('Light'),
                    event: 'toggle-theme',
                    detail: { theme: 'light' },
                    statusKey: 'theme',
                },
                {
                    label: T('Dark'),
                    event: 'toggle-theme',
                    detail: { theme: 'dark' },
                    statusKey: 'theme',
                },
            ],
        },
    ];
}
