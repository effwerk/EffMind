import { build } from "esbuild";
import { rm, mkdir, readdir, copyFile, readFile, writeFile } from "fs/promises";
import path from "path";

const srcDir = "src";
const distDir = "dist";
const swRelative = "common/ServiceWorker.js";
const swSrcPath = path.join(srcDir, swRelative);
const swDistPath = path.join(distDir, swRelative);

// 排除列表
const exclude = [
    ".DS_Store",
    "common/ComponentAPI",
    "common/LangManager",
    "common/NodeTextManager.html"
];

// 判断是否排除
function isExcluded(rel) {
    return exclude.some(ex => rel === ex || rel.startsWith(ex + "/"));
}

// 递归扫描 JS/CSS 文件
async function scanJsCss(dir, base = dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    let files = [];
    for (const e of entries) {
        const full = path.join(dir, e.name);
        const rel = path.relative(base, full).replace(/\\/g, "/");
        if (isExcluded(rel) || rel === swRelative) continue;

        if (e.isDirectory()) {
            files.push(...(await scanJsCss(full, base)));
        } else if (e.isFile() && (rel.endsWith(".js") || rel.endsWith(".css"))) {
            files.push(full);
        }
    }
    return files;
}

// 递归复制静态文件（非 JS/CSS）
async function copyStatic(src, dest, base = src) {
    const entries = await readdir(src, { withFileTypes: true });
    for (const e of entries) {
        const srcPath = path.join(src, e.name);
        const destPath = path.join(dest, e.name);
        const rel = path.relative(base, srcPath).replace(/\\/g, "/");
        if (isExcluded(rel)) continue;

        if (e.isDirectory()) {
            await mkdir(destPath, { recursive: true });
            await copyStatic(srcPath, destPath, base);
        } else if (e.isFile()) {
            if ((rel.endsWith(".js") || rel.endsWith(".css")) && rel !== swRelative) continue;
            await mkdir(path.dirname(destPath), { recursive: true });
            await copyFile(srcPath, destPath);
        }
    }
}

// 扫描 dist 生成 CORE_ASSETS
async function collectAssets(dir, base = dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    let files = [];
    for (const e of entries) {
        const full = path.join(dir, e.name);
        const rel = path.relative(base, full).replace(/\\/g, "/");
        if (isExcluded(rel)) continue;

        if (e.isDirectory()) {
            files.push(...(await collectAssets(full, base)));
        } else if (e.isFile()) {
            files.push("/" + rel);
        }
    }
    return files;
}

// 将 CORE_ASSETS 写入 SW 源文件（未压缩版本）
async function injectAssetsToSW(assetList, srcPath) {
    let sw = await readFile(srcPath, "utf8");
    sw = sw.replace(
        /const\s+CORE_ASSETS\s*=\s*\[[\s\S]*?\];/,
        `const CORE_ASSETS=${JSON.stringify(assetList)};`
    );
    const tempSwPath = path.join(distDir, "common/ServiceWorker.tmp.js");
    await mkdir(path.dirname(tempSwPath), { recursive: true });
    await writeFile(tempSwPath, sw, "utf8");
    return tempSwPath;
}

// 主流程
async function main() {
    console.log("🚀 Starting PWA build...");

    // 1) 清理 dist
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
    console.log("✔ dist ready");

    // 2) 扫描 JS/CSS
    const jsCssFiles = await scanJsCss(srcDir);
    console.log("📌 JS/CSS files:", jsCssFiles.length);

    // 3) 压缩 JS/CSS
    await build({
        entryPoints: jsCssFiles,
        bundle: false,
        minify: true,
        format: "esm",
        outdir: distDir,
        loader: { ".css": "css", ".png": "file", ".svg": "file" },
        legalComments: "none",
        charset: "utf8"
    });
    console.log("✔ JS/CSS compressed");

    // 4) 复制静态资源
    await copyStatic(srcDir, distDir);
    console.log("✔ Static files copied");

    // 5) 扫描 dist 获取完整文件列表
    const assets = await collectAssets(distDir);

    // 6) 写入 CORE_ASSETS 到 SW 源文件并生成临时文件
    const tempSwPath = await injectAssetsToSW(assets, swSrcPath);

    // 7) 压缩 SW
    await build({
        entryPoints: [tempSwPath],
        bundle: false,
        minify: true,
        format: "iife",
        outfile: swDistPath,
        legalComments: "none",
        charset: "utf8"
    });
    console.log("✔ ServiceWorker.js compressed with CORE_ASSETS");

    // 8) 删除临时文件
    await rm(tempSwPath);
    console.log("🎉 Build complete!");
}

main().catch(err => {
    console.error("❌ Build failed:", err);
    process.exit(1);
});