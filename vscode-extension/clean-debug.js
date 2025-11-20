import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// This script cleans up the 'src' directory created by 'prepare-debug.js'.
// It's intended to be run as a post-debug task in VS Code.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetSrcDir = path.join(__dirname, 'src');

function cleanUp() {
    console.log('Cleaning up after debug session...');
    try {
        if (fs.existsSync(targetSrcDir)) {
            fs.rmSync(targetSrcDir, { recursive: true, force: true });
            console.log(`   Successfully removed debug directory: ${targetSrcDir}`);
        } else {
            console.log(`   Debug directory not found, no cleanup needed: ${targetSrcDir}`);
        }
        console.log('Cleanup complete.');
    } catch (error) {
        console.error('\nAn error occurred during cleanup:', error);
        // We don't exit with 1 here, as it's a cleanup task and shouldn't be overly disruptive.
    }
}

cleanUp();
