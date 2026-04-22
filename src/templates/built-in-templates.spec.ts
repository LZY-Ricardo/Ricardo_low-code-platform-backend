import { builtInTemplates } from './built-in-templates';

describe('builtInTemplates', () => {
  it('contains a broad built-in template set', () => {
    expect(builtInTemplates).toHaveLength(12);
  });

  it('stores component trees as arrays and keeps pages in sync', () => {
    builtInTemplates.forEach((template) => {
      expect(Array.isArray(template.components)).toBe(true);
      expect(template.components.length).toBeGreaterThan(0);
      expect(template.pages).toHaveLength(1);
      expect(template.pages[0].components).toEqual(template.components);
    });
  });

  it('assigns theme and shared styles to every template', () => {
    builtInTemplates.forEach((template) => {
      expect(typeof template.themeId).toBe('string');
      expect(template.sharedStyles.length).toBeGreaterThan(0);
    });
  });
});
