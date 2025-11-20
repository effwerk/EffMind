import fs from 'fs';
import path from 'path';

/**
 * --- Config: List of files/folders to exclude from the 'src' directory ---
 * This list is shared between the build and debug-preparation scripts.
 */
export const excludeFromSrc = [
    'favicon.ico',
    'favicon.svg',
    'appicon.png',
    'manifest.json',
    'index.html',
    'index.js',
    'menuItems.js',
    'common/LangManager',
    'common/ComponentAPI',
    'common/MindmapStorage.js',
    'common/ServiceWorker.js',
    'common/NodeTextManager.html'
];

/**
 * Recursively copies a directory while excluding specified paths.
 * This is an internal helper function.
 */
function copyDirRecursive(source, destination, excludeList, baseSource) {
    baseSource = baseSource || source;

    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }
    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);
        
        const relativePath = path.relative(baseSource, srcPath).replace(/\\/g, '/');

        if (
            excludeList.some((excludePath) => {
                return relativePath === excludePath || relativePath.startsWith(excludePath + '/');
            })
        ) {
            continue;
        }

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath, excludeList, baseSource);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Performs a thorough scan and replace action to fix all known incorrect path patterns.
 * This is an internal helper function.
 */
function fixAllPathsInDirectory(directory, rootDir) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            // We only want to fix paths inside the copied 'src' directory
            if (entry.name === 'src') {
                fixAllPathsInDirectory(fullPath, rootDir);
            }
        } else if (
            entry.isFile() &&
            (fullPath.endsWith('.js') || fullPath.endsWith('.css') || fullPath.endsWith('.html'))
        ) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            const originalContent = content;

            // This regex handles paths in JS/CSS (e.g., `import './src/...'`)
            // and in HTML (e.g., `href="./src/..."`).
            // It looks for `./src` preceded by a quote or an equals sign.
            content = content.replace(/(['"`=])\.\.\/src/g, '$1./src');

            // This regex handles absolute paths like `import './src/...'`
            // or `href="./src/..."`.
            content = content.replace(/(['"`=])\/src/g, '$1./src');

            if (content !== originalContent) {
                console.log(`   [FIX] Corrected paths in: ${path.relative(rootDir, fullPath)}`);
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

/**
 * --- Shared Main Function ---
 * Cleans the target 'src' directory, copies source files with exclusions,
 * and fixes path references.
 *
 * @param {string} extensionDir - The absolute path to the 'vscode-extension' directory.
 * @param {string} rootDir - The absolute path to the project root.
 */
export function prepareSourceFiles(extensionDir, rootDir) {
    const targetSrcDir = path.join(extensionDir, 'src');
    
    // 1. Clean up previous src directory
    console.log('[Common] Preparing files...');
    if (fs.existsSync(targetSrcDir)) {
        fs.rmSync(targetSrcDir, { recursive: true, force: true });
        console.log(`   Cleaned up existing src directory: ${targetSrcDir}`);
    }

    // 2. Copy main 'src' directory with exclusions
    const sourceSrcDir = path.join(rootDir, 'src');
    console.log(`   Copying ${sourceSrcDir} to ${targetSrcDir} with exclusions...`);
    copyDirRecursive(sourceSrcDir, targetSrcDir, excludeFromSrc);
    console.log('   File preparation complete.');

    // 3. Fix path references
    console.log('[Common] Fixing path references...');
    fixAllPathsInDirectory(extensionDir, rootDir);
    console.log('   Path fixing complete.');
}
