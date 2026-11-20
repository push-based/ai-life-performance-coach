import { posix } from './posix.js';

describe('posix', () => {
  it.each([
    ['', '.'],
    ['.', '.'],
    ['./', './'],
    ['/', '/'],
    ['//a//b/', '/a/b/'],
    ['a/./b/../c', 'a/c'],
    ['../a/..', '..'],
    ['a/../..', '..'],
    ['/../a', '/a'],
    ['1.Projects/x/', '1.Projects/x/'],
  ])('normalize(%j) is %j', (input, expected) => {
    expect(posix.normalize(input)).toBe(expected);
  });

  it.each([
    [['a', 'b'], 'a/b'],
    [['a/', '/b'], 'a/b'],
    [['', ''], '.'],
    [['', 'a'], 'a'],
    [['a', '..', 'b'], 'b'],
    [['/a', 'b/'], '/a/b/'],
    [['3.Resources', 'Book', 'note.md'], '3.Resources/Book/note.md'],
  ])('join(%j) is %j', (input, expected) => {
    expect(posix.join(...input)).toBe(expected);
  });

  it.each([
    ['', '.'],
    ['a', '.'],
    ['/a', '/'],
    ['/', '/'],
    ['a/b/', 'a'],
    ['a//b', 'a/'],
    ['3.Resources/Book/note.md', '3.Resources/Book'],
  ])('dirname(%j) is %j', (input, expected) => {
    expect(posix.dirname(input)).toBe(expected);
  });

  it.each([
    ['a/b.md', undefined, 'b.md'],
    ['a/b.md', '.md', 'b'],
    ['a/b/', undefined, 'b'],
    ['/', undefined, ''],
    ['', undefined, ''],
    ['.md', '.md', ''],
    ['a/b.png', '.md', 'b.png'],
  ])('basename(%j, %j) is %j', (input, suffix, expected) => {
    expect(posix.basename(input, suffix)).toBe(expected);
  });

  it.each([
    ['a/b.md', '.md'],
    ['a/.hidden', ''],
    ['a/b', ''],
    ['a/b.tar.gz', '.gz'],
  ])('extname(%j) is %j', (input, expected) => {
    expect(posix.extname(input)).toBe(expected);
  });

  it.each([
    ['a/b', 'a/b', ''],
    ['a/b', 'a/c/d', '../c/d'],
    ['a', 'a/b', 'b'],
    ['a/b/c', 'a', '../..'],
    ['/x/y', '/z', '../../z'],
  ])('relative(%j, %j) is %j', (from, to, expected) => {
    expect(posix.relative(from, to)).toBe(expected);
  });

  it('resolve stops at the last absolute path', () => {
    expect(posix.resolve('a', '/b', 'c')).toBe('/b/c');
    expect(posix.resolve('/', 'a/../b')).toBe('/b');
  });
});
