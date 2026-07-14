import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const scriptDir = import.meta.dirname;
const repoRoot = path.resolve(scriptDir, '..');

// sharp 安装在 frontend/node_modules，需要从 frontend 目录解析。
const requireFromFrontend = createRequire(path.resolve(repoRoot, 'frontend', 'package.json'));
const sharp = requireFromFrontend('sharp');
const backgroundsDir = path.resolve(repoRoot, 'frontend/public/dish-backgrounds');
const generatedDir = path.resolve(repoRoot, 'frontend/src/offline/data/generated');
const generatedModulePath = path.resolve(repoRoot, 'frontend/src/offline/data/generatedDishImages.js');

const MAX_WIDTH = 720;
const MAX_HEIGHT = 405;
const WEBP_QUALITY = 56;

// 只读取已批准的 dish_001.png ... dish_040.png，不包含 candidate 或 override 图片。
const dishIds = Array.from({ length: 40 }, (_, i) => `dish_${String(i + 1).padStart(3, '0')}`);

async function build() {
  fs.mkdirSync(generatedDir, { recursive: true });

  const entries = [];
  for (const dishId of dishIds) {
    const sourcePath = path.join(backgroundsDir, `${dishId}.png`);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`[skip] 未找到已批准图片: ${dishId}.png`);
      continue;
    }

    const webpBuffer = await sharp(sourcePath)
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const webpFileName = `${dishId}.webp`;
    fs.writeFileSync(path.join(generatedDir, webpFileName), webpBuffer);

    const dataUri = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    entries.push([dishId, dataUri]);
    console.log(`[ok] ${dishId} -> ${webpFileName} (${(webpBuffer.length / 1024).toFixed(1)} KB)`);
  }

  const moduleSource =
    '// 自动生成：请勿手动编辑。由 scripts/build_offline_assets.mjs 生成。\n' +
    `// 共 ${entries.length} 张已批准菜品图片，以 WebP data URI 形式内联。\n` +
    'export const generatedDishImages = {\n' +
    entries.map(([id, uri]) => `  ${JSON.stringify(id)}: ${JSON.stringify(uri)},`).join('\n') +
    '\n};\n';

  fs.writeFileSync(generatedModulePath, moduleSource);
  console.log(`\n[done] 生成 ${entries.length} 张图片，写入 generatedDishImages.js`);
}

build().catch((err) => {
  console.error('离线资源构建失败:', err);
  process.exit(1);
});
