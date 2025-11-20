import path from 'path';
import { fileURLToPath } from 'url';
import { prepareSourceFiles } from './helpers.js';

// This script prepares the debug environment by copying and fixing source files.

// --- Main Script ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const extensionDir = __dirname;

function prepareForDebug() {
    console.log('Preparing for debug session...');

    try {
        // Use the shared function to handle file preparation and path fixing.
        prepareSourceFiles(extensionDir, rootDir);

        console.log('\nDebug preparation finished successfully!');

    } catch (error) {
        console.error('\nAn error occurred during debug preparation:', error);
        process.exit(1);
    }
}

prepareForDebug();