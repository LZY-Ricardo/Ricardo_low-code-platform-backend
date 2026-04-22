import { Injectable } from '@nestjs/common';

type RenderableComponent = {
  id?: string | number;
  name?: string;
  props?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  children?: RenderableComponent[];
};

const API_V1_BASE_PLACEHOLDER = '__LOWCODE_API_V1_BASE__';

@Injectable()
export class HtmlGenerator {
  generateHTML(
    components: unknown,
    options?: {
      title?: string;
      description?: string;
    },
  ): string {
    const nodes = Array.isArray(components) ? (components as RenderableComponent[]) : [];
    const title = options?.title || '已发布页面';
    const description = options?.description || '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(title)}</title>
  <meta name="description" content="${this.escapeHtml(description)}" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: rgba(0, 0, 0, 0.88);
      background: #fff;
    }
    .lc-page { min-height: 100vh; }
    .lc-container { padding: 20px; }
    .lc-card {
      background: #fff;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .lc-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 4px 15px;
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      background: #1677ff;
      color: #fff;
    }
    .lc-button-default {
      background: #fff;
      color: rgba(0, 0, 0, 0.88);
      border-color: #d9d9d9;
    }
    .lc-input, .lc-select {
      min-height: 32px;
      padding: 4px 11px;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
    }
    .lc-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .lc-table {
      width: 100%;
      border-collapse: collapse;
    }
    .lc-table td, .lc-table th {
      border: 1px solid #f0f0f0;
      padding: 8px 12px;
    }
  </style>
</head>
<body>
${this.renderComponents(nodes)}
<script>
const LOWCODE_API_V1_BASE = '${API_V1_BASE_PLACEHOLDER}';

function updateFormStatus(form, message, isError) {
  const statusNode = form.querySelector('[data-role="form-status"]');
  if (!statusNode) {
    return;
  }

  statusNode.textContent = message;
  statusNode.style.color = isError ? '#cf1322' : '#1677ff';
}

function collectFormPayload(form) {
  const payload = {};
  const fields = form.querySelectorAll('input[name], select[name], textarea[name]');
  fields.forEach((field) => {
    if (!field.name) {
      return;
    }

    if (field instanceof HTMLInputElement && field.type === 'checkbox') {
      payload[field.name] = field.checked;
      return;
    }

    payload[field.name] = field.value;
  });

  return payload;
}

async function submitLowcodeForm(form) {
  const formId = form.dataset.formId;
  const collectData = form.dataset.collectData === 'true';

  if (!collectData || !formId) {
    return;
  }

  const payload = collectFormPayload(form);
  updateFormStatus(form, '提交中...', false);

  const response = await fetch(LOWCODE_API_V1_BASE + '/forms/' + encodeURIComponent(formId) + '/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || (result && typeof result.code === 'number' && result.code !== 0)) {
    const message = result && typeof result.message === 'string' ? result.message : '提交失败，请稍后重试';
    throw new Error(message);
  }

  form.reset();
  updateFormStatus(form, '提交成功', false);
}

document.querySelectorAll('form[data-collect-data="true"][data-form-id]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await submitLowcodeForm(form);
    } catch (error) {
      updateFormStatus(form, error instanceof Error ? error.message : '提交失败，请稍后重试', true);
    }
  });
});
</script>
</body>
</html>`;
  }

  private renderComponents(components: RenderableComponent[]): string {
    return components.map((component) => this.renderComponent(component)).join('\n');
  }

  private renderComponent(component: RenderableComponent): string {
    const name = component.name || 'Container';
    const props = component.props || {};
    const styles = this.styleObjectToString(component.styles);
    const children = component.children || [];

    switch (name) {
      case 'Page':
        return `<div class="lc-page" style="${styles}">${this.renderComponents(children)}</div>`;
      case 'Container':
        return `<div class="lc-container" style="${styles}">${this.renderComponents(children)}</div>`;
      case 'Text':
        return `<span style="${styles}">${this.escapeHtml(this.stringProp(props.text))}</span>`;
      case 'Title': {
        const level = Math.min(Math.max(this.numberProp(props.level, 1), 1), 6);
        return `<h${level} style="${styles}">${this.escapeHtml(this.stringProp(props.text))}</h${level}>`;
      }
      case 'Button': {
        const type = this.stringProp(props.type) === 'default' ? ' lc-button-default' : '';
        return `<button class="lc-button${type}" style="${styles}">${this.escapeHtml(
          this.stringProp(props.text, '按钮'),
        )}</button>`;
      }
      case 'Input':
        return `<input class="lc-input" style="${styles}" name="${this.escapeHtml(
          this.buildFieldName(component.id),
        )}" type="text" placeholder="${this.escapeHtml(
          this.stringProp(props.placeholder),
        )}" value="${this.escapeHtml(this.stringProp(props.value))}" />`;
      case 'Select':
        return `<select class="lc-select" style="${styles}" name="${this.escapeHtml(
          this.buildFieldName(component.id),
        )}">${this.renderSelectOptions(
          props.optionsText,
        )}</select>`;
      case 'DatePicker':
        return `<input class="lc-input" style="${styles}" name="${this.escapeHtml(
          this.buildFieldName(component.id),
        )}" type="date" value="${this.escapeHtml(this.stringProp(props.value))}" />`;
      case 'Image':
        return `<img src="${this.escapeHtml(
          this.stringProp(props.src),
        )}" alt="${this.escapeHtml(this.stringProp(props.alt, '图片'))}" style="${styles}" />`;
      case 'Card':
        return `<div class="lc-card" style="${styles}">${this.renderComponents(children)}</div>`;
      case 'Form': {
        const collectData = this.booleanProp(props.collectData);
        const formId = this.stringProp(props.formId);
        const attrs = collectData
          ? ` data-collect-data="true"${formId ? ` data-form-id="${this.escapeHtml(formId)}"` : ''}`
          : '';
        const status = collectData
          ? '<div data-role="form-status" style="min-height: 20px; font-size: 12px; color: #666;"></div>'
          : '';
        return `<form class="lc-form" style="${styles}"${attrs}>${this.renderComponents(children)}${status}</form>`;
      }
      case 'Table':
        return `<table class="lc-table" style="${styles}">${this.renderSimpleTable(props)}</table>`;
      case 'Divider':
        return `<hr style="${styles}" />`;
      case 'Tag':
        return `<span style="${styles}">${this.escapeHtml(this.stringProp(props.text, '标签'))}</span>`;
      default:
        return `<div style="${styles}">${this.renderComponents(children)}</div>`;
    }
  }

  private renderSelectOptions(value: unknown) {
    const text = this.stringProp(value);
    const items = text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length === 0) {
      return '<option value="">请选择</option>';
    }

    return items
      .map((item) => `<option value="${this.escapeHtml(item)}">${this.escapeHtml(item)}</option>`)
      .join('');
  }

  private renderSimpleTable(props: Record<string, unknown>) {
    const columns = this.stringProp(props.columnsText)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const rows = this.stringProp(props.dataText)
      .split('\n')
      .map((line) => line.split(',').map((cell) => cell.trim()))
      .filter((cells) => cells.some(Boolean));

    const thead =
      columns.length > 0
        ? `<thead><tr>${columns
            .map((column) => `<th>${this.escapeHtml(column)}</th>`)
            .join('')}</tr></thead>`
        : '';

    const tbody = `<tbody>${rows
      .map(
        (cells) =>
          `<tr>${cells
            .map((cell) => `<td>${this.escapeHtml(cell)}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody>`;

    return `${thead}${tbody}`;
  }

  private styleObjectToString(styles?: Record<string, unknown>) {
    if (!styles || Object.keys(styles).length === 0) {
      return '';
    }

    return Object.entries(styles)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        const cssValue =
          typeof value === 'number' &&
          !['opacity', 'zIndex', 'fontWeight', 'flex'].includes(key)
            ? `${value}px`
            : `${value}`;
        return `${cssKey}: ${cssValue}`;
      })
      .join('; ');
  }

  private stringProp(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private numberProp(value: unknown, fallback = 0): number {
    return typeof value === 'number' ? value : fallback;
  }

  private booleanProp(value: unknown): boolean {
    return value === true;
  }

  private buildFieldName(id: string | number | undefined) {
    return `field_${id ?? 'unknown'}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
