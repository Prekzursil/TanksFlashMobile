import { describe, expect, it } from 'vitest';
import { format, getStrings, STRINGS } from '../../apps/web/src/i18n';

describe('getStrings', () => {
  it('returns the English string table', () => {
    expect(getStrings('en')).toBe(STRINGS.en);
    expect(getStrings('en').app.title).toBe('TANKS');
  });
});

describe('format', () => {
  it('substitutes named placeholders with string values', () => {
    expect(format('Hello {name}!', { name: 'World' })).toBe('Hello World!');
  });

  it('substitutes named placeholders with numeric values', () => {
    expect(format('v{version}', { version: 3 })).toBe('v3');
  });

  it('replaces every occurrence of a repeated placeholder', () => {
    expect(format('{a} and {a}', { a: 'x' })).toBe('x and x');
  });

  it('leaves a placeholder untouched when the variable is missing or null', () => {
    expect(format('{missing}', {})).toBe('{missing}');
    expect(format('{n}', { n: null as unknown as string })).toBe('{n}');
  });

  it('returns plain templates unchanged', () => {
    expect(format('no placeholders here', { unused: 'x' })).toBe('no placeholders here');
  });
});
