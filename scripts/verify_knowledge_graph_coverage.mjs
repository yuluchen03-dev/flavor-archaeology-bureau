#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CORE_RELATIONS = {
  recorded_in: {
    label: '文献出处',
    aliases: [
      'recorded_in',
      'documented_in',
      'cited_in',
      'appears_in',
      'has_source',
      'source_text',
      'from_text',
      'text_source',
      'record',
      'citation',
    ],
    targetHints: [/^text[_-]/i, /^ancient[_-]?text/i],
  },
  contains: {
    label: '食材构成',
    aliases: [
      'contains',
      'has_ingredient',
      'uses_ingredient',
      'ingredient',
      'includes',
      'made_of',
      'composed_of',
    ],
    targetHints: [/^ing[_-]/i, /^ingredient[_-]/i],
  },
  uses_technique: {
    label: '技法连接',
    aliases: [
      'uses_technique',
      'has_technique',
      'technique',
      'uses_method',
      'cooking_method',
      'prepared_by',
      'cooked_by',
    ],
    targetHints: [/^tech[_-]/i, /^technique[_-]/i],
  },
  originated_in: {
    label: '时代来源',
    aliases: [
      'originated_in',
      'origin',
      'from_dynasty',
      'dynasty',
      'created_in',
      'period',
      'era',
      'belongs_to_dynasty',
    ],
    targetHints: [/^dynasty[_-]/i, /^period[_-]/i, /^era[_-]/i],
  },
};

const CORE_KEYS = Object.keys(CORE_RELATIONS);

function readJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw);
}

function parseArgs(argv) {
  const options = {
    markdownPath: null,
    minCoreRelations: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--markdown') {
      options.markdownPath = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--markdown=')) {
      options.markdownPath = arg.slice('--markdown='.length);
    } else if (arg === '--min-core-relations') {
      options.minCoreRelations = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (arg.startsWith('--min-core-relations=')) {
      options.minCoreRelations = Number.parseInt(arg.slice('--min-core-relations='.length), 10);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.markdownPath === undefined) {
    throw new Error('--markdown requires a path');
  }

  if (options.minCoreRelations !== null) {
    if (!Number.isInteger(options.minCoreRelations) || options.minCoreRelations < 0) {
      throw new Error('--min-core-relations requires a non-negative integer');
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/verify_knowledge_graph_coverage.mjs [options]

Options:
  --markdown <path>              Write a Markdown coverage report.
  --min-core-relations <number>  Exit 1 if any dish has fewer core relations.
  -h, --help                     Show this help message.
`);
}

function normalizeToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function collectPrimitivePaths(value, prefix = []) {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectPrimitivePaths(item, [...prefix, String(index)]));
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => collectPrimitivePaths(item, [...prefix, key]));
  }

  return [{ path: prefix, value }];
}

function getPathValue(object, pathParts) {
  let cursor = object;
  for (const part of pathParts) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
}

function extractDishId(dish, index) {
  const candidateKeys = ['id', 'dish_id', 'dishId', '_id', 'uid', 'key', 'slug'];
  for (const key of candidateKeys) {
    if (typeof dish[key] === 'string' && dish[key].trim()) {
      return dish[key];
    }
  }
  return `dish_${String(index + 1).padStart(3, '0')}`;
}

function discoverDishEndpointPaths(relationships, dishIds) {
  const pathCounts = new Map();

  for (const relationship of relationships) {
    for (const entry of collectPrimitivePaths(relationship)) {
      if (typeof entry.value !== 'string') {
        continue;
      }
      if (!dishIds.has(entry.value)) {
        continue;
      }
      const pathKey = entry.path.join('.');
      pathCounts.set(pathKey, (pathCounts.get(pathKey) ?? 0) + 1);
    }
  }

  return [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pathKey]) => pathKey.split('.'));
}

function discoverTypePaths(relationships) {
  const pathScores = new Map();
  const preferredNames = new Set([
    'type',
    'relation',
    'relationship',
    'predicate',
    'label',
    'edge_type',
    'edgeType',
    'rel_type',
    'name',
  ].map(normalizeToken));

  for (const relationship of relationships) {
    for (const entry of collectPrimitivePaths(relationship)) {
      if (typeof entry.value !== 'string') {
        continue;
      }
      const normalizedValue = normalizeToken(entry.value);
      if (!normalizedValue) {
        continue;
      }

      const normalizedPath = normalizeToken(entry.path.join('_'));
      const directRelationMatch = CORE_KEYS.some((key) => CORE_RELATIONS[key].aliases.includes(normalizedValue));
      const pathLooksLikeType = entry.path.some((part) => preferredNames.has(normalizeToken(part)));

      if (!directRelationMatch && !pathLooksLikeType) {
        continue;
      }

      const pathKey = entry.path.join('.');
      const score = (directRelationMatch ? 10 : 0) + (pathLooksLikeType ? 3 : 0);
      pathScores.set(pathKey, (pathScores.get(pathKey) ?? 0) + score);
    }
  }

  return [...pathScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pathKey]) => pathKey.split('.'));
}

function valuesFromPaths(object, paths) {
  return paths
    .map((pathParts) => getPathValue(object, pathParts))
    .filter((value) => typeof value === 'string' && value.trim());
}

function relatedDishIdsForRelationship(relationship, dishIds, endpointPaths) {
  const matched = new Set();

  for (const value of valuesFromPaths(relationship, endpointPaths)) {
    if (dishIds.has(value)) {
      matched.add(value);
    }
  }

  if (matched.size > 0) {
    return matched;
  }

  for (const entry of collectPrimitivePaths(relationship)) {
    if (typeof entry.value === 'string' && dishIds.has(entry.value)) {
      matched.add(entry.value);
    }
  }

  return matched;
}

function endpointValuesWithoutDishes(relationship, dishIds) {
  return collectPrimitivePaths(relationship)
    .map((entry) => entry.value)
    .filter((value) => typeof value === 'string' && !dishIds.has(value));
}

function classifyRelationship(relationship, typePaths, dishIds) {
  const explicitTypeValues = valuesFromPaths(relationship, typePaths);
  const fallbackStringValues = collectPrimitivePaths(relationship)
    .map((entry) => entry.value)
    .filter((value) => typeof value === 'string');
  const candidateValues = explicitTypeValues.length > 0 ? explicitTypeValues : fallbackStringValues;

  for (const value of candidateValues) {
    const normalized = normalizeToken(value);
    for (const key of CORE_KEYS) {
      if (CORE_RELATIONS[key].aliases.includes(normalized)) {
        return key;
      }
    }
  }

  const nonDishValues = endpointValuesWithoutDishes(relationship, dishIds);
  for (const key of CORE_KEYS) {
    if (nonDishValues.some((value) => CORE_RELATIONS[key].targetHints.some((hint) => hint.test(value)))) {
      return key;
    }
  }

  return null;
}

function displayNameForDish(dish, dishId) {
  const candidateKeys = ['name', 'title', 'label', 'display_name', 'displayName'];
  for (const key of candidateKeys) {
    if (typeof dish[key] === 'string' && dish[key].trim()) {
      return dish[key];
    }
  }
  return dishId;
}

export function buildSummary(dishes, relationships, options = {}) {
  const dishRowsById = new Map();
  const dishIds = new Set();

  dishes.forEach((dish, index) => {
    const dishId = extractDishId(dish, index);
    dishIds.add(dishId);
    const relationCounts = Object.fromEntries(CORE_KEYS.map((key) => [key, 0]));
    dishRowsById.set(dishId, {
      dishId,
      dishName: displayNameForDish(dish, dishId),
      relationCounts,
      matchedRelationTypes: [],
    });
  });

  const endpointPaths = discoverDishEndpointPaths(relationships, dishIds);
  const typePaths = discoverTypePaths(relationships);

  for (const relationship of relationships) {
    const relatedDishIds = relatedDishIdsForRelationship(relationship, dishIds, endpointPaths);
    if (relatedDishIds.size === 0) {
      continue;
    }

    const coreRelation = classifyRelationship(relationship, typePaths, dishIds);
    if (!coreRelation) {
      continue;
    }

    for (const dishId of relatedDishIds) {
      const row = dishRowsById.get(dishId);
      if (!row) {
        continue;
      }
      row.relationCounts[coreRelation] += 1;
      const typeValue = valuesFromPaths(relationship, typePaths)[0] ?? coreRelation;
      row.matchedRelationTypes.push(normalizeToken(typeValue) || coreRelation);
    }
  }

  const dishCoverageRows = [...dishRowsById.values()].map((row) => {
    const flags = Object.fromEntries(CORE_KEYS.map((key) => [key, row.relationCounts[key] > 0]));
    const missingCoreRelations = CORE_KEYS.filter((key) => !flags[key]);
    const coreRelationCount = CORE_KEYS.filter((key) => flags[key]).length;

    return {
      dishId: row.dishId,
      dishName: row.dishName,
      ...flags,
      coreRelationCount,
      relationCounts: row.relationCounts,
      missingCoreRelations,
      matchedRelationTypes: [...new Set(row.matchedRelationTypes)].sort(),
    };
  });

  const totalDishes = dishCoverageRows.length;
  const coverageByRelation = Object.fromEntries(CORE_KEYS.map((key) => {
    const coveredDishes = dishCoverageRows.filter((row) => row[key]).length;
    return [key, {
      label: CORE_RELATIONS[key].label,
      coveredDishes,
      missingDishes: totalDishes - coveredDishes,
      coveragePercent: percent(coveredDishes, totalDishes),
    }];
  }));

  const dishesWithAnyCoreRelation = dishCoverageRows.filter((row) => row.coreRelationCount > 0).length;
  const dishesWithAllCoreRelations = dishCoverageRows.filter((row) => row.coreRelationCount === CORE_KEYS.length).length;
  const zeroCoreRelationDishes = totalDishes - dishesWithAnyCoreRelation;
  const averageCoreRelationsPerDish = totalDishes === 0
    ? 0
    : roundTo(dishCoverageRows.reduce((sum, row) => sum + row.coreRelationCount, 0) / totalDishes, 2);
  const minCoreRelations = options.minCoreRelations;
  const thresholdFailures = Number.isInteger(minCoreRelations)
    ? dishCoverageRows.filter((row) => row.coreRelationCount < minCoreRelations)
    : [];

  const highPriorityMissing = dishCoverageRows
    .filter((row) => row.coreRelationCount === 0 || !row.recorded_in || !row.contains)
    .map((row) => ({
      dishId: row.dishId,
      dishName: row.dishName,
      coreRelationCount: row.coreRelationCount,
      missingCoreRelations: row.missingCoreRelations,
      reason: row.coreRelationCount === 0
        ? '无核心图谱关系，无法审计出处、食材、技法和时代链路'
        : '缺少出处或食材关系，影响投资人对数据可信度的判断',
    }));

  const summaryText = [
    `当前图谱包含 ${totalDishes} 个菜品。`,
    `${dishesWithAnyCoreRelation} 个菜品至少具备 1 类核心关系，覆盖率 ${percent(dishesWithAnyCoreRelation, totalDishes)}%。`,
    `${zeroCoreRelationDishes} 个菜品没有任何核心关系。`,
    `平均每道菜 ${averageCoreRelationsPerDish} 类核心关系，${dishesWithAllCoreRelations} 个菜品具备 4 类核心关系。`,
  ].join('');

  return {
    totalDishes,
    coverageByRelation,
    dishCoverageRows,
    highPriorityMissing,
    summaryText,
    aggregate: {
      coreRelationTypes: CORE_KEYS,
      dishesWithAnyCoreRelation,
      dishesWithAllCoreRelations,
      zeroCoreRelationDishes,
      averageCoreRelationsPerDish,
    },
    auditShape: {
      relationshipCount: relationships.length,
      detectedDishEndpointPaths: endpointPaths.map((pathParts) => pathParts.join('.')),
      detectedRelationTypePaths: typePaths.map((pathParts) => pathParts.join('.')),
    },
    threshold: Number.isInteger(minCoreRelations)
      ? {
        minCoreRelations,
        failed: thresholdFailures.length > 0,
        failedDishes: thresholdFailures.map((row) => ({
          dishId: row.dishId,
          dishName: row.dishName,
          coreRelationCount: row.coreRelationCount,
          missingCoreRelations: row.missingCoreRelations,
        })),
      }
      : null,
  };
}

function percent(part, total) {
  if (total === 0) {
    return 0;
  }
  return roundTo((part / total) * 100, 1);
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function markdownBool(value) {
  return value ? '是' : '否';
}

function relationLabel(key) {
  return CORE_RELATIONS[key]?.label ?? key;
}

function formatMissingRelations(row) {
  if (row.missingCoreRelations.length === 0) {
    return '无';
  }
  return row.missingCoreRelations.map(relationLabel).join('、');
}

function markdownEscape(value) {
  return String(value)
    .replaceAll('|', '\\|')
    .replace(/\r?\n/g, ' ');
}

function topMissingRows(rows, count = 12) {
  return rows
    .filter((row) => row.coreRelationCount < CORE_KEYS.length)
    .sort((a, b) => a.coreRelationCount - b.coreRelationCount || a.dishId.localeCompare(b.dishId))
    .slice(0, count);
}

export function buildMarkdown(summary) {
  const core = summary.aggregate;
  const rows = summary.dishCoverageRows;
  const highPriorityZeroRows = rows.filter((row) => row.coreRelationCount === 0);
  const missingRecorded = rows.filter((row) => !row.recorded_in).length;
  const missingContains = rows.filter((row) => !row.contains).length;
  const topMissing = topMissingRows(rows);

  const coverageLines = CORE_KEYS.map((key) => {
    const item = summary.coverageByRelation[key];
    return `| ${relationLabel(key)} (${key}) | ${item.coveredDishes}/${summary.totalDishes} | ${item.coveragePercent}% | ${item.missingDishes} |`;
  }).join('\n');

  const priorityLines = topMissing.map((row) => {
    return `| ${row.dishId} | ${markdownEscape(row.dishName)} | ${row.coreRelationCount}/4 | ${formatMissingRelations(row)} |`;
  }).join('\n');

  const tableLines = rows.map((row) => {
    return [
      row.dishId,
      markdownEscape(row.dishName),
      markdownBool(row.recorded_in),
      markdownBool(row.contains),
      markdownBool(row.uses_technique),
      markdownBool(row.originated_in),
      `${row.coreRelationCount}/4`,
      formatMissingRelations(row),
    ].join(' | ');
  }).map((line) => `| ${line} |`).join('\n');

  return `# 图谱覆盖率审计报告

## 当前覆盖率

${summary.summaryText}

| 核心关系 | 已覆盖菜品 | 覆盖率 | 缺口菜品 |
| --- | ---: | ---: | ---: |
${coverageLines}

整体口径:

- 至少 1 类核心关系: ${core.dishesWithAnyCoreRelation}/${summary.totalDishes}，${percent(core.dishesWithAnyCoreRelation, summary.totalDishes)}%。
- 4 类核心关系齐全: ${core.dishesWithAllCoreRelations}/${summary.totalDishes}，${percent(core.dishesWithAllCoreRelations, summary.totalDishes)}%。
- 0 类核心关系: ${core.zeroCoreRelationDishes}/${summary.totalDishes}，${percent(core.zeroCoreRelationDishes, summary.totalDishes)}%。
- 平均每道菜核心关系数: ${core.averageCoreRelationsPerDish}/4。

## 影响投资人信任的缺口

- ${highPriorityZeroRows.length} 个菜没有任何核心图谱关系，演示时只能证明“有菜品节点”，不能证明“有可追溯的证据链”。
- ${missingRecorded} 个菜缺少文献出处关系，投资人会难以判断古籍、非遗线索和菜品复原之间是否可审计。
- ${missingContains} 个菜缺少食材构成关系，直接削弱从历史文本到现代复原方案的可解释性。
- 技法关系覆盖不足会让“技术护城河”看起来像静态内容库，而不是可推理、可扩展的知识图谱。

高优先级补齐清单（优先处理核心关系最少的菜品）:

| 菜品 ID | 菜品名称 | 核心关系数 | 缺失关系 |
| --- | --- | ---: | --- |
${priorityLines}

## 48 小时补强目标

- 先把 0 类核心关系菜品清零: 每道菜至少补 1 条 \`recorded_in\` 或 \`originated_in\`，让 40 个菜都能进入审计链路。
- 把 \`recorded_in\` 覆盖提升到 40/40，并在关系属性里保留章节、条目或校验备注。
- 把 \`contains\` 覆盖提升到至少 32/40，优先补演示路径和非遗代表菜的主料、辅料、调料。
- 把 \`uses_technique\` 覆盖提升到至少 24/40，优先绑定非遗技法、烹饪动作和复原步骤。
- 将脚本加入演示前检查: 默认只报告，路演前使用 \`--min-core-relations 1\` 阻断无核心关系的图谱发布。

## 复赛/融资阶段目标

- 复赛阶段: 每道菜至少 3 类核心关系，且 \`recorded_in\`、\`contains\` 两类达到 100%。
- 融资材料阶段: 每道菜 4 类核心关系齐全，并为关键关系补充证据等级、来源 URL、人工校验人和校验日期。
- 护城河方向: 从“菜品数量”转为“可审计关系密度”，持续追踪每道菜的证据闭环、技法迁移、地域传播和替代食材路径。

## 明细表

| 菜品 ID | 菜品名称 | 文献出处 | 食材构成 | 技法连接 | 时代来源 | 核心关系数 | 缺失关系 |
| --- | --- | --- | --- | --- | --- | ---: | --- |
${tableLines}
`;
}

function writeMarkdown(markdownPath, summary) {
  const absolutePath = path.resolve(projectRoot, markdownPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buildMarkdown(summary), 'utf8');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const dishes = readJson('data/knowledge_graph/nodes_dish.json');
  const relationships = readJson('data/knowledge_graph/relationships.json');

  if (!Array.isArray(dishes)) {
    throw new Error('data/knowledge_graph/nodes_dish.json must contain an array');
  }
  if (!Array.isArray(relationships)) {
    throw new Error('data/knowledge_graph/relationships.json must contain an array');
  }

  const summary = buildSummary(dishes, relationships, options);

  if (options.markdownPath) {
    writeMarkdown(options.markdownPath, summary);
  }

  console.log(JSON.stringify(summary, null, 2));

  if (summary.threshold?.failed) {
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
