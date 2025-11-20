import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';
import { prepareSourceFiles } from './helpers.js';

// --- Build Configuration ---
const config = {
    // Specify an output directory for the .vsix file.
    // Default: '.' (the 'vscode-extension' directory)
    outputDir: '../',
};

// --- Helper Functions ---

/**
 * Recursively finds and minifies all .js and .css files in a directory using esbuild.
 */
async function minifyFilesInDirectory(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            await minifyFilesInDirectory(fullPath);
        } else if (entry.isFile()) {
            const loader = path.extname(fullPath).substring(1); // 'js' or 'css'

            if (loader === 'js' || loader === 'css') {
                // Skip minifying lit.js as it's already minified and can cause issues.
                if (path.basename(fullPath) === 'lit.js') {
                    continue;
                }

                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const result = await esbuild.transform(content, {
                        loader,
                        minifyWhitespace: true,
                        minifyIdentifiers: true,
                        minifySyntax: true,
                    });
                    fs.writeFileSync(fullPath, result.code);
                } catch (error) {
                    console.error(`   [ERROR] Failed to minify ${loader.toUpperCase()} ${fullPath}:`, error.message);
                }
            }
        }
    }
}

// --- Main Script ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const extensionDir = __dirname;
const targetSrcDir = path.join(extensionDir, 'src');

async function main() {
    console.log('Starting build process...');
    let buildSuccess = false;

    try {
        // --- 1. Prepare source files using the shared function ---
        console.log('\n[Step 1/4] Preparing and fixing source files...');
        prepareSourceFiles(extensionDir, rootDir);
        console.log('   Source file preparation complete.');

        // --- 2. Minify JS and CSS files ---
        console.log('\n[Step 2/4] Minifying JS and CSS files...');
        // We only minify the copied src directory, not the whole extension
        await minifyFilesInDirectory(targetSrcDir);
        console.log('   Minification complete.');

        // --- 3. Package: Run vsce from within the extension directory ---
        console.log('\n[Step 3/4] Packaging extension...');
        execSync('npx vsce package', { cwd: extensionDir, stdio: 'inherit' });
        console.log('   vsce packaging complete.');

        // --- 4. Move: Move the .vsix file out of the extension directory if needed ---
        console.log('\n[Step 4/4] Moving artifact...');
        const vsixFile = fs.readdirSync(extensionDir).find(file => file.endsWith('.vsix'));
        if (vsixFile) {
            const sourcePath = path.join(extensionDir, vsixFile);

            const outputDir = path.resolve(extensionDir, config.outputDir);
            if (config.outputDir !== '.' && !fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
                console.log(`   Created output directory: ${outputDir}`);
            }

            const destPath = path.join(outputDir, vsixFile);
            // If source and destination are the same, skip moving.
            if (sourcePath !== destPath) {
                fs.renameSync(sourcePath, destPath);
                console.log(`   Moved ${vsixFile} to ${destPath}`);
            } else {
                console.log(`   Artifact ${vsixFile} is already in the output directory.`);
            }
        } else {
            throw new Error('Could not find .vsix file to move.');
        }

        console.log('\nBuild process finished successfully!');
        buildSuccess = true;

    } catch (error) {
        console.error('\nAn error occurred during the build process:', error);
        process.exit(1);
    } finally {
        // --- Cleanup: Remove the copied src directory ---
        if (buildSuccess && fs.existsSync(targetSrcDir)) {
            console.log('\n[Cleanup] Cleaning up copied src directory...');
            fs.rmSync(targetSrcDir, { recursive: true, force: true });
            console.log(`   Removed copied src directory: ${targetSrcDir}`);
        } else if (fs.existsSync(targetSrcDir)) {
            console.log(`\n[Cleanup] Copied src directory retained for inspection at: ${targetSrcDir}`);
        }
    }
}

main();