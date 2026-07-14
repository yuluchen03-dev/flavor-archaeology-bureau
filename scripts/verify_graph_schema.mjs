#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const GRAPH_DIR = 'data/knowledge_graph';
const MANIFEST_PATH = 'data/knowledge_graph/expert_review_manifest.json';
const DEFAULT_REVIEW_STATUS_VALUES = ['internal_reviewed', 'pending_external_expert'];

function readJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addError(errors, message) {
  errors.push(message);
}

function idMapForNodes(nodesByType) {
  const nodeById = new Map();
  const typeById = new Map();
  const duplicates = [];

  for (const [type, nodes] of Object.entries(nodesByType)) {
    if (!Array.isArray(nodes)) {
      continue;
    }
    for (const node of nodes) {
      if (!hasText(node?.id)) {
        duplicates.push(`${type} node without id`);
        continue;
      }
      if (nodeById.has(node.id)) {
        duplicates.push(`duplicate node id "${node.id}"`);
      }
      nodeById.set(node.id, node);
      typeById.set(node.id, type);
    }
  }

  return { nodeById, typeById, duplicates };
}

function sourceMetadataForNode(node, type) {
  if (type === 'dish') {
    return hasText(node.source_text) && hasText(node.source_passage);
  }

  if (type === 'ancient_text') {
    const hasLocator = hasText(node.source_url) || hasText(node.catalog_url);
    const hasVerification = hasText(node.verification_note) || hasText(node.authority_institution);
    return hasLocator && hasVerification;
  }

  return true;
}

function relationshipHasSourceMetadata(relationship) {
  if (relationship.type !== 'recorded_in') {
    return true;
  }

  const properties = relationship.properties ?? {};
  return hasText(properties.chapter)
    || hasText(properties.page_reference)
    || hasText(properties.source_url)
    || hasText(properties.citation)
    || hasText(properties.verification_note);
}

function validateRelationship(relationship, index, schema, maps, errors) {
  const label = `relationship[${index}]`;

  if (!hasText(relationship?.source)) {
    addError(errors, `${label} is missing source`);
  } else if (!maps.nodeById.has(relationship.source)) {
    addError(errors, `${label} references missing source node "${relationship.source}"`);
  }

  if (!hasText(relationship?.target)) {
    addError(errors, `${label} is missing target`);
  } else if (!maps.nodeById.has(relationship.target)) {
    addError(errors, `${label} references missing target node "${relationship.target}"`);
  }

  if (!hasText(relationship?.type)) {
    addError(errors, `${label} is missing type`);
    return;
  }

  const relationSchema = schema.relationship_types?.[relationship.type];
  if (!relationSchema) {
    addError(errors, `${label} uses unknown relationship type "${relationship.type}"`);
  } else {
    const sourceType = maps.typeById.get(relationship.source);
    const targetType = maps.typeById.get(relationship.target);
    if (sourceType && relationSchema.source && sourceType !== relationSchema.source) {
      addError(errors, `${label} source "${relationship.source}" is ${sourceType}, expected ${relationSchema.source}`);
    }
    if (targetType && relationSchema.target && targetType !== relationSchema.target) {
      addError(errors, `${label} target "${relationship.target}" is ${targetType}, expected ${relationSchema.target}`);
    }
  }

  if (!relationshipHasSourceMetadata(relationship)) {
    addError(errors, `${label} recorded_in relationship needs source metadata in properties`);
  }
}

function reviewStatusValuesForManifest(manifest, errors) {
  if (manifest.review_status_values === undefined) {
    return new Set(DEFAULT_REVIEW_STATUS_VALUES);
  }

  if (!Array.isArray(manifest.review_status_values)) {
    addError(errors, 'expert review manifest review_status_values must be an array');
    return new Set(DEFAULT_REVIEW_STATUS_VALUES);
  }

  const values = manifest.review_status_values.filter(hasText);
  if (values.length === 0) {
    addError(errors, 'expert review manifest review_status_values must include at least one status');
    return new Set(DEFAULT_REVIEW_STATUS_VALUES);
  }

  return new Set(values);
}

function validateManifestReviewFields(item, label, errors, allowedStatuses) {
  for (const field of ['reviewer', 'notes']) {
    if (!hasText(item?.[field])) {
      addError(errors, `${label} is missing ${field}`);
    }
  }

  if (!hasText(item?.status)) {
    addError(errors, `${label} is missing status`);
  } else if (!allowedStatuses.has(item.status)) {
    addError(errors, `${label} has invalid status "${item.status}"`);
  }

  const date = item?.review_date ?? item?.date;
  if (!hasText(date)) {
    addError(errors, `${label} is missing review_date`);
  }
}

function validateManifest(manifest, maps, errors) {
  if (!manifest || typeof manifest !== 'object') {
    addError(errors, 'expert review manifest is required');
    return { flagshipNodeCount: 0, flagshipCitationCount: 0 };
  }

  const flagshipNodes = Array.isArray(manifest.flagship_nodes) ? manifest.flagship_nodes : [];
  const flagshipCitations = Array.isArray(manifest.flagship_citations) ? manifest.flagship_citations : [];
  const citationIds = new Set();
  const allowedStatuses = reviewStatusValuesForManifest(manifest, errors);

  if (flagshipNodes.length === 0) {
    addError(errors, 'expert review manifest must include at least one flagship node');
  }
  if (flagshipCitations.length === 0) {
    addError(errors, 'expert review manifest must include at least one flagship citation');
  }

  flagshipCitations.forEach((citation, index) => {
    const label = `flagship_citations[${index}]`;
    validateManifestReviewFields(citation, label, errors, allowedStatuses);

    if (!hasText(citation?.citation_id)) {
      addError(errors, `${label} is missing citation_id`);
    } else {
      citationIds.add(citation.citation_id);
    }

    if (!hasText(citation?.ancient_text_id)) {
      addError(errors, `${label} is missing ancient_text_id`);
    } else if (maps.typeById.get(citation.ancient_text_id) !== 'ancient_text') {
      addError(errors, `${label} references unknown ancient_text "${citation.ancient_text_id}"`);
    } else {
      const textNode = maps.nodeById.get(citation.ancient_text_id);
      if (!sourceMetadataForNode(textNode, 'ancient_text')) {
        addError(errors, `${label} ancient_text "${citation.ancient_text_id}" lacks source metadata`);
      }
    }
  });

  flagshipNodes.forEach((entry, index) => {
    const label = `flagship_nodes[${index}]`;
    validateManifestReviewFields(entry, label, errors, allowedStatuses);

    if (!hasText(entry?.node_id)) {
      addError(errors, `${label} is missing node_id`);
    } else if (!maps.nodeById.has(entry.node_id)) {
      addError(errors, `${label} references unknown node "${entry.node_id}"`);
    } else if (hasText(entry.node_type)) {
      const actualType = maps.typeById.get(entry.node_id);
      if (entry.node_type !== actualType) {
        addError(errors, `${label} declares node_type "${entry.node_type}" but actual type is "${actualType}"`);
      }
    }

    const citations = Array.isArray(entry?.citation_ids) ? entry.citation_ids : [];
    if (citations.length === 0) {
      addError(errors, `${label} must reference at least one citation_id`);
    }
    for (const citationId of citations) {
      if (!citationIds.has(citationId)) {
        addError(errors, `${label} references unknown citation_id "${citationId}"`);
      }
    }
  });

  return {
    flagshipNodeCount: flagshipNodes.length,
    flagshipCitationCount: flagshipCitations.length,
  };
}

export function validateGraphData({ schema, nodesByType, relationships, manifest }) {
  const errors = [];

  if (!schema?.relationship_types || typeof schema.relationship_types !== 'object') {
    addError(errors, 'schema.relationship_types is required');
  }

  if (!nodesByType || typeof nodesByType !== 'object') {
    addError(errors, 'nodesByType is required');
  }

  if (!Array.isArray(relationships)) {
    addError(errors, 'relationships must be an array');
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      summary: {
        nodeCount: 0,
        relationshipCount: Array.isArray(relationships) ? relationships.length : 0,
        flagshipNodeCount: 0,
        flagshipCitationCount: 0,
      },
    };
  }

  for (const [type, nodes] of Object.entries(nodesByType)) {
    if (!Array.isArray(nodes)) {
      addError(errors, `nodesByType.${type} must be an array`);
      continue;
    }
    for (const node of nodes) {
      if ((type === 'dish') && !sourceMetadataForNode(node, type)) {
        addError(errors, `${type} node "${node.id}" lacks required source metadata`);
      }
    }
  }

  const maps = idMapForNodes(nodesByType);
  for (const duplicate of maps.duplicates) {
    addError(errors, duplicate);
  }

  relationships.forEach((relationship, index) => {
    validateRelationship(relationship, index, schema, maps, errors);
  });

  const manifestSummary = validateManifest(manifest, maps, errors);
  const nodeCount = [...Object.values(nodesByType)].reduce((sum, nodes) => {
    return sum + (Array.isArray(nodes) ? nodes.length : 0);
  }, 0);

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      nodeCount,
      relationshipCount: relationships.length,
      validRelationshipTypes: Object.keys(schema.relationship_types ?? {}).length,
      ...manifestSummary,
    },
  };
}

function loadNodesByType() {
  const graphDir = path.join(projectRoot, GRAPH_DIR);
  const files = fs.readdirSync(graphDir)
    .filter((file) => /^nodes_.+\.json$/.test(file))
    .sort();

  return Object.fromEntries(files.map((file) => {
    const type = file.replace(/^nodes_/, '').replace(/\.json$/, '');
    return [type, readJson(path.join(GRAPH_DIR, file))];
  }));
}

export function loadGraphData() {
  return {
    schema: readJson(path.join(GRAPH_DIR, 'schema.json')),
    nodesByType: loadNodesByType(),
    relationships: readJson(path.join(GRAPH_DIR, 'relationships.json')),
    manifest: readJson(MANIFEST_PATH),
  };
}

function main() {
  const result = validateGraphData(loadGraphData());
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
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
