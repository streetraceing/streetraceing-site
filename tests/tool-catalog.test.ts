import assert from 'node:assert/strict';
import test from 'node:test';

import { mainPageConfig } from '../utils/config';
import {
  availableTools,
  featuredTools,
  genericTools,
  getGenericToolBySlug,
  getToolBySlug,
  getToolHref,
  toolCategories,
} from '../utils/tool-catalog';

test('tool catalog keeps stable unique slugs and known categories', () => {
  const slugs = mainPageConfig.tools.map((tool) => tool.slug);

  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(
    mainPageConfig.tools.every((tool) =>
      toolCategories.includes(tool.category),
    ),
    true,
  );
});

test('catalog helpers expose only routable tools', () => {
  assert.equal(
    availableTools.every((tool) => tool.status === 'available'),
    true,
  );
  assert.equal(
    genericTools.every(
      (tool) =>
        Boolean(tool.component) && getGenericToolBySlug(tool.slug) === tool,
    ),
    true,
  );
  assert.equal(
    availableTools.every(
      (tool) =>
        getToolBySlug(tool.slug) === tool &&
        getToolHref(tool) === `/tool/${tool.slug}`,
    ),
    true,
  );
});

test('featured tools are an available curated subset', () => {
  assert.equal(featuredTools.length > 0, true);
  assert.equal(
    featuredTools.every(
      (tool) => tool.status === 'available' && tool.featured === true,
    ),
    true,
  );
});
