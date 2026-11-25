import { describe, it, expect } from 'vitest';
import { isEditableTarget, isGlobalShortcut } from './shortcuts.js';

describe('shortcuts util', () => {
  it('detects editable targets', () => {
    expect(
      isEditableTarget({ tagName: 'INPUT' } as unknown as EventTarget),
    ).toBe(true);
    expect(
      isEditableTarget({ tagName: 'textarea' } as unknown as EventTarget),
    ).toBe(true);
    expect(
      isEditableTarget({ isContentEditable: true } as unknown as EventTarget),
    ).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(
      false,
    );
    expect(isEditableTarget(null)).toBe(false);
  });

  it('ignores shortcuts with modifiers or inside editable fields', () => {
    const div = { tagName: 'DIV' } as unknown as EventTarget;
    const input = { tagName: 'INPUT' } as unknown as EventTarget;
    expect(isGlobalShortcut({ key: 'p', target: div })).toBe(true);
    expect(isGlobalShortcut({ key: 'p', ctrlKey: true, target: div })).toBe(
      false,
    );
    expect(isGlobalShortcut({ key: 'p', metaKey: true, target: div })).toBe(
      false,
    );
    expect(isGlobalShortcut({ key: 'p', altKey: true, target: div })).toBe(
      false,
    );
    expect(isGlobalShortcut({ key: 'p', target: input })).toBe(false);
  });
});
