import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProjectBySlug,
  getProjectHref,
  projects,
} from '../utils/project-catalog';

test('project catalog keeps unique routable slugs', () => {
  const slugs = projects.map((project) => project.slug);

  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(
    projects.every(
      (project) =>
        getProjectBySlug(project.slug) === project &&
        getProjectHref(project) === `/project/${project.slug}`,
    ),
    true,
  );
});
