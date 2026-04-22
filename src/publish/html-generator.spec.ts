import { HtmlGenerator } from './html-generator';

describe('HtmlGenerator', () => {
  let generator: HtmlGenerator;

  beforeEach(() => {
    generator = new HtmlGenerator();
  });

  it('renders simple text content', () => {
    const html = generator.generateHTML([
      {
        name: 'Page',
        props: {},
        children: [{ name: 'Text', props: { text: 'Hello' } }],
      },
    ]);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Hello');
  });

  it('renders nested button in container', () => {
    const html = generator.generateHTML([
      {
        name: 'Container',
        props: {},
        children: [{ name: 'Button', props: { text: '按钮' } }],
      },
    ]);

    expect(html).toContain('<div class="lc-container"');
    expect(html).toContain('<button class="lc-button"');
    expect(html).toContain('按钮');
  });

  it('renders image attributes', () => {
    const html = generator.generateHTML([
      {
        name: 'Image',
        props: { src: 'a.png', alt: '示例' },
      },
    ]);

    expect(html).toContain('src="a.png"');
    expect(html).toContain('alt="示例"');
  });

  it('renders publishable form runtime metadata and submission script', () => {
    const html = generator.generateHTML([
      {
        id: 'form_1',
        name: 'Form',
        props: { collectData: true, formId: 'schema_123' },
        children: [
          { id: 'input_1', name: 'Input', props: { placeholder: '请输入姓名' } },
          { id: 'select_1', name: 'Select', props: { optionsText: '学生,老师' } },
          { id: 'submit_1', name: 'Button', props: { text: '提交' } },
        ],
      },
    ]);

    expect(html).toContain('data-form-id="schema_123"');
    expect(html).toContain('data-collect-data="true"');
    expect(html).toContain('name="field_input_1"');
    expect(html).toContain('name="field_select_1"');
    expect(html).toContain('data-role="form-status"');
    expect(html).toContain('__LOWCODE_API_V1_BASE__');
    expect(html).toContain('async function submitLowcodeForm');
  });
});
