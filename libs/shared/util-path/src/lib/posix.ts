function normalizeSegments(path: string, allowAboveRoot: boolean): string {
  const out: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
      else if (allowAboveRoot) out.push('..');
      continue;
    }
    out.push(segment);
  }
  return out.join('/');
}

function normalize(path: string): string {
  if (path.length === 0) return '.';
  const isAbsolute = path.startsWith('/');
  const trailingSeparator = path.endsWith('/');
  let body = normalizeSegments(path, !isAbsolute);
  if (body.length === 0) {
    if (isAbsolute) return '/';
    return trailingSeparator ? './' : '.';
  }
  if (trailingSeparator) body += '/';
  return isAbsolute ? `/${body}` : body;
}

function join(...paths: string[]): string {
  const joined = paths.filter((p) => p.length > 0).join('/');
  return joined.length === 0 ? '.' : normalize(joined);
}

function isAbsolute(path: string): boolean {
  return path.startsWith('/');
}

function resolve(...paths: string[]): string {
  let resolved = '';
  for (let i = paths.length - 1; i >= 0 && !resolved.startsWith('/'); i--) {
    const path = paths[i];
    if (path.length === 0) continue;
    resolved = resolved.length === 0 ? path : `${path}/${resolved}`;
  }
  const absolute = resolved.startsWith('/');
  const body = normalizeSegments(resolved, !absolute);
  if (absolute) return `/${body}`;
  return body.length > 0 ? body : '.';
}

function relative(from: string, to: string): string {
  if (from === to) return '';
  const fromParts = resolve('/', from).split('/').filter(Boolean);
  const toParts = resolve('/', to).split('/').filter(Boolean);
  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  )
    common++;
  return [
    ...fromParts.slice(common).map(() => '..'),
    ...toParts.slice(common),
  ].join('/');
}

function dirname(path: string): string {
  if (path.length === 0) return '.';
  const hasRoot = path.startsWith('/');
  let end = -1;
  let matchedSlash = true;
  for (let i = path.length - 1; i >= 1; --i) {
    if (path[i] === '/') {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else matchedSlash = false;
  }
  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) return '//';
  return path.slice(0, end);
}

function basename(path: string, suffix?: string): string {
  let start = 0;
  let end = -1;
  let matchedSlash = true;
  if (
    suffix !== undefined &&
    suffix.length > 0 &&
    suffix.length <= path.length
  ) {
    if (suffix === path) return '';
    let suffixIndex = suffix.length - 1;
    let firstNonSlashEnd = -1;
    for (let i = path.length - 1; i >= 0; --i) {
      const char = path[i];
      if (char === '/') {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1) {
          matchedSlash = false;
          firstNonSlashEnd = i + 1;
        }
        if (suffixIndex >= 0) {
          if (char === suffix[suffixIndex]) {
            if (--suffixIndex === -1) end = i;
          } else {
            suffixIndex = -1;
            end = firstNonSlashEnd;
          }
        }
      }
    }
    if (start === end) end = firstNonSlashEnd;
    else if (end === -1) end = path.length;
    return path.slice(start, end);
  }
  for (let i = path.length - 1; i >= 0; --i) {
    if (path[i] === '/') {
      if (!matchedSlash) {
        start = i + 1;
        break;
      }
    } else if (end === -1) {
      matchedSlash = false;
      end = i + 1;
    }
  }
  return end === -1 ? '' : path.slice(start, end);
}

function extname(path: string): string {
  let startDot = -1;
  let startPart = 0;
  let end = -1;
  let matchedSlash = true;
  let preDotState = 0;
  for (let i = path.length - 1; i >= 0; --i) {
    const char = path[i];
    if (char === '/') {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      matchedSlash = false;
      end = i + 1;
    }
    if (char === '.') {
      if (startDot === -1) startDot = i;
      else if (preDotState !== 1) preDotState = 1;
    } else if (startDot !== -1) preDotState = -1;
  }
  if (
    startDot === -1 ||
    end === -1 ||
    preDotState === 0 ||
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
  )
    return '';
  return path.slice(startDot, end);
}

export const posix = {
  sep: '/' as const,
  normalize,
  join,
  isAbsolute,
  resolve,
  relative,
  dirname,
  basename,
  extname,
};
