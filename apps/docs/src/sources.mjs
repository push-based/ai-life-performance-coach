import { globSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY = 'push-based/ai-performance-coach';
export const BRANCH = 'main';
export const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

export const ADR_DIR = 'kb/source/initiatives/ai-coach/decisions';

export const INCLUDE = [
  'README.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  'docs/guide/*.md',
  'apps/*/README.md',
  'libs/*/*/README.md',
  '.agents/skills/README.md',
  '.agents/skills/vault-planning/conventions.md',
  'kb/README.md',
  `${ADR_DIR}/*.md`,
];

export const EXCLUDE = ['**/node_modules/**'];

export const GUIDE = [
  'setup',
  'first-session',
  'the-climb',
  'vault-view',
  'planning',
  'commands',
  'coaching-styles',
  'configuration',
  'privacy',
  'troubleshooting',
  'glossary',
];

const PACKAGE_ORDER = [
  'libs/coach/domain',
  'libs/coach/application',
  'libs/coach/adapter-ollama',
  'libs/coach/adapter-gemini',
  'libs/coach/adapter-vault-mcp',
  'libs/coach/adapter-local-state',
  'apps/cli',
  'libs/vault/core',
  'apps/vault-server',
  'apps/climb-board',
];

export function siteFiles() {
  return new Set(
    globSync(INCLUDE, { cwd: repoRoot, exclude: EXCLUDE }).map(toPosix),
  );
}

export function searchDirs() {
  return [...new Set([...siteFiles()].map((file) => dirname(file)))]
    .filter((dir) => dir !== '.')
    .sort()
    .map((dir) => join(repoRoot, dir));
}

export function toPosix(path) {
  return path.split(sep).join('/');
}

export function repoRelative(absolutePath) {
  return toPosix(relative(repoRoot, absolutePath));
}

export function packages() {
  const found = [...siteFiles()]
    .filter((file) =>
      /^(apps\/[^/]+|libs\/[^/]+\/[^/]+)\/README\.md$/.test(file),
    )
    .map((file) => file.replace(/\/README\.md$/, ''));
  const rank = (name) => {
    const index = PACKAGE_ORDER.indexOf(name);
    return index === -1 ? PACKAGE_ORDER.length : index;
  };
  return found.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function adrFiles() {
  return readdirSync(join(repoRoot, ADR_DIR))
    .filter((name) => /^ADR-AIC-\d{4}-.+\.md$/.test(name))
    .sort();
}

export function adrId(fileName) {
  const head = readFileSync(join(repoRoot, ADR_DIR, fileName), 'utf8');
  const match = head.match(/^id:\s*['"]?([^'"\s]+)/m);
  return match ? match[1] : fileName.replace(/\.md$/, '');
}

export function adrFileFor(id) {
  return adrFiles().find((name) => name.startsWith(`${id}-`));
}

export function adrsSucceededBy(id) {
  return adrFiles()
    .filter((name) => {
      const head = readFileSync(join(repoRoot, ADR_DIR, name), 'utf8');
      return head.match(/^succeeded_by:.*$/m)?.[0].includes(id);
    })
    .map(adrId);
}

export function pageFor(path, frontMatter) {
  if (path === 'README.md') {
    return {
      slug: '/',
      title: 'Getting started',
      sidebar_label: 'Getting started',
    };
  }
  if (path === 'CONTRIBUTING.md') {
    return { slug: '/contributing', sidebar_label: 'Contributing' };
  }
  const guide = path.match(/^docs\/guide\/(.+)\.md$/);
  if (guide) {
    return { slug: `/guide/${guide[1]}` };
  }
  if (path === 'ARCHITECTURE.md') {
    return { slug: '/architecture', sidebar_label: 'Architecture' };
  }
  const app = path.match(/^apps\/([^/]+)\/README\.md$/);
  if (app) {
    return { slug: `/apps/${app[1]}`, sidebar_label: app[1] };
  }
  const lib = path.match(/^libs\/([^/]+)\/([^/]+)\/README\.md$/);
  if (lib) {
    return {
      slug: `/libs/${lib[1]}/${lib[2]}`,
      sidebar_label: `${lib[1]}/${lib[2]}`,
    };
  }
  if (path === '.agents/skills/README.md') {
    return { slug: '/planning', sidebar_label: 'Planning skills' };
  }
  if (path === '.agents/skills/vault-planning/conventions.md') {
    return {
      slug: '/planning/conventions',
      sidebar_label: 'The planning model',
    };
  }
  if (path === 'kb/README.md') {
    return {
      slug: '/decisions',
      title: 'Decisions',
      sidebar_label: 'All decisions',
    };
  }
  const adr = path.startsWith(`${ADR_DIR}/`)
    ? path.match(/\/ADR-AIC-((\d{4})-.+)\.md$/)
    : null;
  if (adr) {
    const status = String(frontMatter.status ?? 'draft');
    return {
      slug: `/decisions/${adr[1]}`,
      sidebar_label: `${adr[2]} ${frontMatter.title ?? adr[1]}`,
      sidebar_class_name: `adr-status adr-status--${status}`,
    };
  }
  return {};
}
