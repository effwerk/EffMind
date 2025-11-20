const isMac = navigator.userAgentData
    ? navigator.userAgentData.platform === 'macOS'
    : /Mac/i.test(navigator.userAgent);

export const getContextMenuItems = (T, type, selectedNodeId, isTextEditing, canUndo, canRedo, canPaste) => {

    const nodeItems = [
        {
            label: T('Add Child Node'),
            event: 'add-child-node',
            icon: 'addChildNode',
            shortcut: 'Tab',
            group: 'node-creation',
        },
        {
            label: T('Add Sibling Node'),
            event: 'add-sibling-node',
            icon: 'addSiblingNode',
            shortcut: 'Enter',
            group: 'node-creation',
            hidden: selectedNodeId === 'root',
        },
        {
            label: T('Delete'),
            event: 'delete-node',
            icon: 'deleteNode',
            shortcut: 'Del',
            group: 'node-actions',
            hidden: selectedNodeId === 'root',
        },
        {
            label: T('Copy'),
            event: 'copy-node',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + C`,
            group: 'clipboard',
        },
        {
            label: T('Cut'),
            event: 'cut-node',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + X`,
            group: 'clipboard',
            hidden: selectedNodeId === 'root',
        },
        {
            label: T('Paste'),
            event: 'paste-node',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + V`,
            disabled: !canPaste,
            group: 'clipboard',
        },
        {
            label: T('Undo'),
            event: 'undo',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + Z`,
            disabled: !canUndo,
            group: 'history',
        },
        {
            label: T('Redo'),
            event: 'redo',
            shortcut: `${isMac ? '⇧ + ⌘' : 'Shift + Ctrl'} + Z`,
            disabled: !canRedo,
            group: 'history',
        },
    ];

    const canvasItems = [
        {
            label: T('Undo'),
            event: 'undo',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + Z`,
            disabled: !canUndo,
            group: 'history',
        },
        {
            label: T('Redo'),
            event: 'redo',
            shortcut: `${isMac ? '⇧ + ⌘' : 'Shift + Ctrl'} + Z`,
            disabled: !canRedo,
            group: 'history',
        },
    ];

    const textEditingItems = [
        {
            label: T('Copy'),
            event: 'copy-text',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + C`,
            group: 'textEdit',
        },
        {
            label: T('Cut'),
            event: 'cut-text',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + X`,
            group: 'textEdit',
        },
        {
            label: T('Paste'),
            event: 'paste-text',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + V`,
            disabled: !canPaste,
            group: 'textEdit',
        },
        {
            label: T('Undo'),
            event: 'undo-text',
            shortcut: `${isMac ? '⌘' : 'Ctrl'} + Z`,
            disabled: !canUndo,
            group: 'textEdit',
        },
        {
            label: T('Redo'),
            event: 'redo-text',
            shortcut: `${isMac ? '⇧ + ⌘' : 'Shift + Ctrl'} + Z`,
            disabled: !canRedo,
            group: 'textEdit',
        },
    ];

    if (type === 'node') {
        if (isTextEditing) {
            return textEditingItems;
        }
        return nodeItems;
    } else if (type === 'canvas') {
        return canvasItems;
    }
    return [];
};