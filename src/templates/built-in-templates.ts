type TemplateCategory =
  | 'general'
  | 'form'
  | 'dashboard'
  | 'landing'
  | 'layout';

type StyleMap = Record<string, string | number>;

interface TemplateComponent {
  id: number;
  name: string;
  props: Record<string, unknown>;
  desc: string;
  parentId?: number;
  sharedStyleId?: string;
  styles?: StyleMap;
  children?: TemplateComponent[];
}

interface TemplatePage {
  id: string;
  name: string;
  components: TemplateComponent[];
}

interface SharedStyleDefinition {
  id: string;
  name: string;
  styles: StyleMap;
}

interface ThumbnailConfig {
  title: string;
  subtitle: string;
  accent: string;
  surface: string;
  chip: string;
}

export interface BuiltInTemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string | null;
  builtIn: true;
  components: TemplateComponent[];
  pages: TemplatePage[];
  dataSources: unknown[];
  variables: Record<string, unknown>;
  sharedStyles: SharedStyleDefinition[];
  themeId: string;
}

interface NodeFactory {
  page: (children: TemplateComponent[], sharedStyleId?: string, styles?: StyleMap) => TemplateComponent[];
  title: (
    text: string,
    options?: { level?: number; sharedStyleId?: string; styles?: StyleMap; parentId?: number },
  ) => TemplateComponent;
  text: (
    text: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number },
  ) => TemplateComponent;
  button: (
    text: string,
    options?: {
      type?: 'primary' | 'default';
      sharedStyleId?: string;
      styles?: StyleMap;
      parentId?: number;
    },
  ) => TemplateComponent;
  card: (
    title: string,
    children?: TemplateComponent[],
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number },
  ) => TemplateComponent;
  table: (
    columnsText: string,
    dataText: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number },
  ) => TemplateComponent;
  chart: (
    title: string,
    chartType: string,
    dataText: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number },
  ) => TemplateComponent;
  form: (
    title: string,
    layout: 'vertical' | 'horizontal' | 'inline',
    children: TemplateComponent[],
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number },
  ) => TemplateComponent;
  input: (
    placeholder: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number; value?: string },
  ) => TemplateComponent;
  select: (
    placeholder: string,
    optionsText: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number; value?: string },
  ) => TemplateComponent;
  datePicker: (
    placeholder: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number; value?: string },
  ) => TemplateComponent;
  switcher: (
    checkedText: string,
    uncheckedText: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number; checked?: boolean },
  ) => TemplateComponent;
  tag: (
    text: string,
    color: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number },
  ) => TemplateComponent;
  divider: (
    text: string,
    options?: { sharedStyleId?: string; styles?: StyleMap; parentId?: number; orientation?: string },
  ) => TemplateComponent;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createNodeFactory(): NodeFactory {
  let currentId = 1;

  const nextId = () => currentId++;

  const assignParent = (
    children: TemplateComponent[] | undefined,
    parentId: number,
  ): TemplateComponent[] | undefined =>
    children?.map((child) => ({
      ...child,
      parentId,
      children: assignParent(child.children, child.id),
    }));

  const createNode = (
    name: string,
    desc: string,
    props: Record<string, unknown>,
    options?: {
      parentId?: number;
      sharedStyleId?: string;
      styles?: StyleMap;
      children?: TemplateComponent[];
    },
  ): TemplateComponent => {
    const id = nextId();
    return {
      id,
      name,
      props,
      desc,
      parentId: options?.parentId,
      sharedStyleId: options?.sharedStyleId,
      styles: options?.styles,
      children: assignParent(options?.children, id),
    };
  };

  return {
    page: (children, sharedStyleId, styles) => [
      createNode('Page', '页面', {}, { sharedStyleId, styles, children }),
    ],
    title: (text, options) =>
      createNode(
        'Title',
        '标题',
        { text, level: options?.level ?? 2 },
        options,
      ),
    text: (text, options) =>
      createNode('Text', '文本', { text }, options),
    button: (text, options) =>
      createNode(
        'Button',
        '按钮',
        { text, type: options?.type ?? 'primary' },
        options,
      ),
    card: (title, children, options) =>
      createNode('Card', '卡片', { title }, { ...options, children }),
    table: (columnsText, dataText, options) =>
      createNode(
        'Table',
        '表格',
        { columnsText, dataText },
        options,
      ),
    chart: (title, chartType, dataText, options) =>
      createNode(
        'Chart',
        '图表',
        { title, chartType, dataText },
        options,
      ),
    form: (title, layout, children, options) =>
      createNode(
        'Form',
        '表单',
        { title, layout },
        { ...options, children },
      ),
    input: (placeholder, options) =>
      createNode(
        'Input',
        '输入框',
        { placeholder, value: options?.value ?? '' },
        options,
      ),
    select: (placeholder, optionsText, options) =>
      createNode(
        'Select',
        '下拉框',
        {
          placeholder,
          optionsText,
          value: options?.value ?? '',
        },
        options,
      ),
    datePicker: (placeholder, options) =>
      createNode(
        'DatePicker',
        '日期选择',
        { placeholder, value: options?.value ?? '' },
        options,
      ),
    switcher: (checkedText, uncheckedText, options) =>
      createNode(
        'Switch',
        '开关',
        {
          checkedText,
          uncheckedText,
          checked: options?.checked ?? false,
        },
        options,
      ),
    tag: (text, color, options) =>
      createNode('Tag', '标签', { text, color }, options),
    divider: (text, options) =>
      createNode(
        'Divider',
        '分割线',
        { text, orientation: options?.orientation ?? 'left' },
        options,
      ),
  };
}

function createPage(name: string, components: TemplateComponent[]): TemplatePage {
  return {
    id: 'page_main',
    name,
    components: clone(components),
  };
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createThumbnail(config: ThumbnailConfig): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${config.surface}" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="800" height="480" rx="32" fill="url(#bg)" />
      <rect x="40" y="36" width="720" height="408" rx="28" fill="#ffffff" opacity="0.92" />
      <rect x="64" y="62" width="180" height="26" rx="13" fill="${config.chip}" opacity="0.18" />
      <text x="64" y="137" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#111827">${config.title}</text>
      <text x="64" y="172" font-size="18" font-family="Arial, Helvetica, sans-serif" fill="#6b7280">${config.subtitle}</text>
      <rect x="64" y="210" width="312" height="140" rx="24" fill="${config.surface}" />
      <rect x="400" y="210" width="336" height="62" rx="18" fill="${config.accent}" opacity="0.14" />
      <rect x="400" y="288" width="336" height="20" rx="10" fill="#e5e7eb" />
      <rect x="400" y="320" width="254" height="20" rx="10" fill="#e5e7eb" />
      <rect x="64" y="374" width="672" height="18" rx="9" fill="#e5e7eb" />
      <rect x="64" y="404" width="420" height="18" rx="9" fill="#edf2f7" />
      <circle cx="704" cy="118" r="34" fill="${config.accent}" opacity="0.18" />
      <circle cx="738" cy="86" r="12" fill="${config.accent}" />
    </svg>
  `;

  return encodeSvg(svg);
}

function createTemplateDefinition(input: {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  themeId: string;
  sharedStyles: SharedStyleDefinition[];
  components: TemplateComponent[];
  thumbnail?: string | null;
  variables?: Record<string, unknown>;
}): BuiltInTemplateDefinition {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    category: input.category,
    thumbnail: input.thumbnail ?? null,
    builtIn: true,
    components: clone(input.components),
    pages: [createPage('页面 1', input.components)],
    dataSources: [],
    variables: input.variables ?? {},
    sharedStyles: clone(input.sharedStyles),
    themeId: input.themeId,
  };
}

const adminSharedStyles: SharedStyleDefinition[] = [
  {
    id: 'page-shell',
    name: '后台页面容器',
    styles: {
      background: '#f8fafc',
      minHeight: '100vh',
      padding: 24,
    },
  },
  {
    id: 'page-title',
    name: '后台页面标题',
    styles: {
      marginBottom: 8,
      color: '#0f172a',
    },
  },
  {
    id: 'section-title',
    name: '区块标题',
    styles: {
      fontSize: 18,
      fontWeight: 700,
      color: '#1e293b',
      marginBottom: 8,
    },
  },
  {
    id: 'muted-text',
    name: '说明文本',
    styles: {
      color: '#64748b',
      fontSize: 14,
    },
  },
  {
    id: 'metric-card',
    name: '指标卡片',
    styles: {
      borderRadius: 16,
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
      marginBottom: 16,
    },
  },
  {
    id: 'primary-button',
    name: '主按钮',
    styles: {
      borderRadius: 10,
      fontWeight: 600,
      marginRight: 12,
    },
  },
  {
    id: 'secondary-button',
    name: '次按钮',
    styles: {
      borderRadius: 10,
      fontWeight: 500,
      marginRight: 12,
    },
  },
];

const marketingSharedStyles: SharedStyleDefinition[] = [
  {
    id: 'page-shell',
    name: '营销页面容器',
    styles: {
      background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 45%)',
      minHeight: '100vh',
      padding: 28,
    },
  },
  {
    id: 'hero-title',
    name: 'Hero 标题',
    styles: {
      fontSize: 44,
      fontWeight: 800,
      lineHeight: 1.2,
      marginBottom: 12,
      color: '#7c2d12',
    },
  },
  {
    id: 'section-title',
    name: '营销区块标题',
    styles: {
      fontSize: 24,
      fontWeight: 700,
      color: '#9a3412',
      marginTop: 18,
      marginBottom: 10,
    },
  },
  {
    id: 'body-text',
    name: '营销正文',
    styles: {
      color: '#7c2d12',
      fontSize: 16,
    },
  },
  {
    id: 'promo-card',
    name: '营销卡片',
    styles: {
      borderRadius: 20,
      boxShadow: '0 20px 45px rgba(234, 88, 12, 0.15)',
      marginBottom: 18,
      background: '#ffffff',
    },
  },
  {
    id: 'primary-button',
    name: '营销主按钮',
    styles: {
      borderRadius: 999,
      fontWeight: 700,
      paddingInline: 22,
      marginRight: 12,
    },
  },
  {
    id: 'secondary-button',
    name: '营销次按钮',
    styles: {
      borderRadius: 999,
      fontWeight: 600,
    },
  },
];

const neutralSharedStyles: SharedStyleDefinition[] = [
  {
    id: 'page-shell',
    name: '通用页面容器',
    styles: {
      background: '#f8fafc',
      minHeight: '100vh',
      padding: 24,
    },
  },
  {
    id: 'page-title',
    name: '通用页面标题',
    styles: {
      marginBottom: 10,
      color: '#0f172a',
    },
  },
  {
    id: 'section-title',
    name: '通用区块标题',
    styles: {
      fontSize: 18,
      fontWeight: 700,
      color: '#1f2937',
      marginBottom: 6,
    },
  },
  {
    id: 'content-card',
    name: '内容卡片',
    styles: {
      borderRadius: 16,
      boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
      marginBottom: 16,
    },
  },
  {
    id: 'muted-text',
    name: '弱化文本',
    styles: {
      color: '#6b7280',
      fontSize: 14,
    },
  },
  {
    id: 'primary-button',
    name: '通用主按钮',
    styles: {
      borderRadius: 10,
      fontWeight: 600,
      marginRight: 12,
    },
  },
];

function buildDashboardTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('综合数据看板', { level: 2, sharedStyleId: 'page-title' }),
      nodes.text('今日核心指标与趋势概览', {
        sharedStyleId: 'muted-text',
        styles: { display: 'block', marginBottom: 20 },
      }),
      nodes.card('核心指标', [
        nodes.text('GMV 128,430', { styles: { display: 'block', fontSize: 28, fontWeight: 700 } }),
        nodes.text('较昨日 +12.4%', { styles: { color: '#16a34a', fontWeight: 600 } }),
      ], { sharedStyleId: 'metric-card' }),
      nodes.chart('近 7 日成交趋势', 'line', '周一,82\n周二,96\n周三,110\n周四,98\n周五,135\n周六,148\n周日,162', {
        styles: { marginBottom: 18, background: '#ffffff', padding: 16, borderRadius: 16 },
      }),
      nodes.table(
        '渠道,访客,转化率,成交额',
        '自然流量,12480,9.4%,48620\n投放广告,8560,7.2%,32780\n私域社群,2940,14.1%,47030',
        { styles: { background: '#ffffff', padding: 12, borderRadius: 16 } },
      ),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_dashboard',
    name: '综合数据看板',
    description: '适合业务后台首页，包含指标卡、趋势图和渠道表格。',
    category: 'dashboard',
    themeId: 'ocean',
    thumbnail: createThumbnail({
      title: '综合数据看板',
      subtitle: '指标卡 · 趋势图 · 渠道表',
      accent: '#2563eb',
      surface: '#eff6ff',
      chip: '#3b82f6',
    }),
    sharedStyles: adminSharedStyles,
    components,
  });
}

function buildSalesTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('销售分析', { level: 2, sharedStyleId: 'page-title' }),
      nodes.text('聚焦线索、商机与签单结果', {
        sharedStyleId: 'muted-text',
        styles: { display: 'block', marginBottom: 20 },
      }),
      nodes.card('销售漏斗', [
        nodes.chart('漏斗阶段分布', 'bar', '线索,320\n商机,180\n方案,96\n签约,42'),
      ], { sharedStyleId: 'metric-card' }),
      nodes.card('本月重点提醒', [
        nodes.tag('高优先级跟进', 'red'),
        nodes.tag('报价待确认', 'orange', { styles: { marginLeft: 8 } }),
      ], { sharedStyleId: 'metric-card' }),
      nodes.table(
        '销售,线索数,签单额,完成率',
        '陈晨,38,248000,112%\n李想,31,198000,98%\n赵宇,29,176000,91%',
        { styles: { background: '#ffffff', padding: 12, borderRadius: 16 } },
      ),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_sales_dashboard',
    name: '销售分析',
    description: '适合销售团队周会和经营复盘。',
    category: 'dashboard',
    themeId: 'forest',
    thumbnail: createThumbnail({
      title: '销售分析',
      subtitle: '漏斗分析 · 业绩榜 · 签单趋势',
      accent: '#15803d',
      surface: '#f0fdf4',
      chip: '#22c55e',
    }),
    sharedStyles: adminSharedStyles,
    components,
  });
}

function buildOrderManagementTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('订单管理', { level: 2, sharedStyleId: 'page-title' }),
      nodes.form('筛选条件', 'inline', [
        nodes.input('搜索订单号', { styles: { width: 220 } }),
        nodes.select('订单状态', '全部,待付款,待发货,已完成', { styles: { width: 180 } }),
        nodes.datePicker('下单日期', { styles: { width: 180 } }),
        nodes.button('查询', { sharedStyleId: 'primary-button' }),
        nodes.button('导出', { type: 'default', sharedStyleId: 'secondary-button' }),
      ], {
        styles: {
          background: '#ffffff',
          padding: 16,
          borderRadius: 16,
          marginBottom: 16,
        },
      }),
      nodes.table(
        '订单号,客户,状态,金额,下单时间',
        'SO-20260401,杭州木叶,待发货,1280,2026-04-01\nSO-20260402,上海成岳,已完成,3680,2026-04-02\nSO-20260403,深圳柏川,待付款,980,2026-04-03',
        { styles: { background: '#ffffff', padding: 12, borderRadius: 16 } },
      ),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_order_management',
    name: '订单管理',
    description: '包含筛选区和订单表，适合后台业务列表页。',
    category: 'layout',
    themeId: 'ocean',
    thumbnail: createThumbnail({
      title: '订单管理',
      subtitle: '筛选面板 · 列表表格 · 批量操作',
      accent: '#1d4ed8',
      surface: '#eff6ff',
      chip: '#60a5fa',
    }),
    sharedStyles: adminSharedStyles,
    components,
  });
}

function buildUserDetailTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('用户详情', { level: 2, sharedStyleId: 'page-title' }),
      nodes.card('基础信息', [
        nodes.text('姓名：林知夏', { styles: { display: 'block', marginBottom: 8 } }),
        nodes.text('手机号：138****1208', { styles: { display: 'block', marginBottom: 8 } }),
        nodes.text('最近活跃：今天 09:42', { sharedStyleId: 'muted-text' }),
      ], { sharedStyleId: 'metric-card' }),
      nodes.card('账户标签', [
        nodes.tag('高价值用户', 'blue'),
        nodes.tag('已实名', 'green', { styles: { marginLeft: 8 } }),
        nodes.tag('续费风险低', 'purple', { styles: { marginLeft: 8 } }),
      ], { sharedStyleId: 'metric-card' }),
      nodes.table(
        '时间,行为,结果',
        '2026-04-20,提交工单,已关闭\n2026-04-18,续费订单,支付成功\n2026-04-11,访问控制台,停留 22 分钟',
        { styles: { background: '#ffffff', padding: 12, borderRadius: 16 } },
      ),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_user_detail',
    name: '用户详情',
    description: '包含基础资料、标签和行为记录。',
    category: 'layout',
    themeId: 'ocean',
    thumbnail: createThumbnail({
      title: '用户详情',
      subtitle: '资料卡片 · 标签区 · 行为记录',
      accent: '#0f766e',
      surface: '#ecfeff',
      chip: '#14b8a6',
    }),
    sharedStyles: neutralSharedStyles,
    components,
  });
}

function buildApprovalFormTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('审批申请', { level: 2, sharedStyleId: 'page-title' }),
      nodes.text('请填写申请信息并提交审批流。', {
        sharedStyleId: 'muted-text',
        styles: { display: 'block', marginBottom: 18 },
      }),
      nodes.form('差旅报销', 'vertical', [
        nodes.input('申请人姓名', { styles: { width: 320 } }),
        nodes.select('所属部门', '产品部,运营部,销售部,财务部', { styles: { width: 320 } }),
        nodes.datePicker('出发日期', { styles: { width: 220 } }),
        nodes.input('报销金额', { styles: { width: 220 } }),
        nodes.button('提交审批', { sharedStyleId: 'primary-button' }),
      ], {
        styles: {
          background: '#ffffff',
          padding: 20,
          borderRadius: 16,
        },
      }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_approval_form',
    name: '审批表单',
    description: '适合请假、报销、采购等流程审批场景。',
    category: 'form',
    themeId: 'forest',
    thumbnail: createThumbnail({
      title: '审批表单',
      subtitle: '流程录入 · 条件选择 · 一键提交',
      accent: '#166534',
      surface: '#f0fdf4',
      chip: '#22c55e',
    }),
    sharedStyles: adminSharedStyles,
    components,
  });
}

function buildSystemSettingsTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('系统设置', { level: 2, sharedStyleId: 'page-title' }),
      nodes.card('站点配置', [
        nodes.form('基础配置', 'vertical', [
          nodes.input('站点名称', { value: 'LingoCode Console', styles: { width: 360 } }),
          nodes.input('通知邮箱', { value: 'ops@lingocode.dev', styles: { width: 360 } }),
          nodes.switcher('启用', '关闭', { checked: true, styles: { marginBottom: 12 } }),
          nodes.button('保存设置', { sharedStyleId: 'primary-button' }),
        ]),
      ], { sharedStyleId: 'metric-card' }),
      nodes.card('安全配置', [
        nodes.switcher('启用', '关闭', { checked: true, styles: { marginBottom: 12 } }),
        nodes.switcher('启用', '关闭', { checked: false, styles: { marginBottom: 12 } }),
        nodes.button('更新策略', { type: 'default', sharedStyleId: 'secondary-button' }),
      ], { sharedStyleId: 'metric-card' }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_system_settings',
    name: '系统设置',
    description: '适合配置中心、通知策略和安全开关等设置页。',
    category: 'layout',
    themeId: 'forest',
    thumbnail: createThumbnail({
      title: '系统设置',
      subtitle: '配置分组 · 开关项 · 策略保存',
      accent: '#166534',
      surface: '#f7fee7',
      chip: '#65a30d',
    }),
    sharedStyles: adminSharedStyles,
    components,
  });
}

function buildSaasLandingTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('把业务页面交给智能低代码', { level: 1, sharedStyleId: 'hero-title' }),
      nodes.text('从原型到上线，团队在一个工作台里完成搭建、协作与发布。', {
        sharedStyleId: 'body-text',
        styles: { display: 'block', marginBottom: 18 },
      }),
      nodes.button('立即试用', { sharedStyleId: 'primary-button' }),
      nodes.button('预约演示', { type: 'default', sharedStyleId: 'secondary-button' }),
      nodes.divider('核心价值', { sharedStyleId: 'section-title', styles: { marginTop: 28 } }),
      nodes.card('团队协作', [
        nodes.text('模板、组件、页面上下文保持一致，交付更快。', {
          sharedStyleId: 'body-text',
        }),
      ], { sharedStyleId: 'promo-card' }),
      nodes.card('发布闭环', [
        nodes.text('编辑、预览、发布、复盘在同一条工作流里完成。', {
          sharedStyleId: 'body-text',
        }),
      ], { sharedStyleId: 'promo-card' }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_saas_landing',
    name: 'SaaS 产品落地页',
    description: '适合软件产品官网首页和产品介绍页。',
    category: 'landing',
    themeId: 'sunset',
    thumbnail: createThumbnail({
      title: 'SaaS 产品落地页',
      subtitle: 'Hero 区 · 价值点 · CTA',
      accent: '#ea580c',
      surface: '#fff7ed',
      chip: '#fb923c',
    }),
    sharedStyles: marketingSharedStyles,
    components,
  });
}

function buildEventSignupTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('春季产品增长峰会', { level: 1, sharedStyleId: 'hero-title' }),
      nodes.text('4 月 28 日 · 上海前滩，席位有限，完成报名后将邮件发送参会二维码。', {
        sharedStyleId: 'body-text',
        styles: { display: 'block', marginBottom: 20 },
      }),
      nodes.form('立即报名', 'vertical', [
        nodes.input('姓名', { styles: { width: 320 } }),
        nodes.input('公司名称', { styles: { width: 320 } }),
        nodes.select('岗位角色', '产品负责人,运营负责人,增长负责人,创始人', { styles: { width: 320 } }),
        nodes.input('联系邮箱', { styles: { width: 320 } }),
        nodes.button('提交报名', { sharedStyleId: 'primary-button' }),
      ], {
        sharedStyleId: 'promo-card',
        styles: { padding: 20 },
      }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_form',
    name: '活动报名页',
    description: '适合线下峰会、公开课和发布会的报名收集。',
    category: 'landing',
    themeId: 'sunset',
    thumbnail: createThumbnail({
      title: '活动报名页',
      subtitle: '活动信息 · 表单收集 · 转化按钮',
      accent: '#c2410c',
      surface: '#fff7ed',
      chip: '#f97316',
    }),
    sharedStyles: marketingSharedStyles,
    components,
  });
}

function buildPricingTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('选择适合团队的方案', { level: 1, sharedStyleId: 'hero-title' }),
      nodes.text('按团队规模灵活升级，支持私有部署与企业支持。', {
        sharedStyleId: 'body-text',
        styles: { display: 'block', marginBottom: 22 },
      }),
      nodes.card('Starter', [
        nodes.text('¥299 / 月', { styles: { display: 'block', fontSize: 28, fontWeight: 700 } }),
        nodes.text('适合 5 人以内小团队', { sharedStyleId: 'body-text' }),
        nodes.button('开始使用', { sharedStyleId: 'primary-button', styles: { marginTop: 12 } }),
      ], { sharedStyleId: 'promo-card' }),
      nodes.card('Growth', [
        nodes.text('¥999 / 月', { styles: { display: 'block', fontSize: 28, fontWeight: 700 } }),
        nodes.text('适合增长型业务团队', { sharedStyleId: 'body-text' }),
        nodes.button('预约顾问', { type: 'default', sharedStyleId: 'secondary-button', styles: { marginTop: 12 } }),
      ], { sharedStyleId: 'promo-card' }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_pricing',
    name: '价格方案页',
    description: '适合展示套餐差异和转化 CTA。',
    category: 'landing',
    themeId: 'sunset',
    thumbnail: createThumbnail({
      title: '价格方案页',
      subtitle: '套餐卡片 · 对比信息 · 行动入口',
      accent: '#d97706',
      surface: '#fffbeb',
      chip: '#f59e0b',
    }),
    sharedStyles: marketingSharedStyles,
    components,
  });
}

function buildCourseEnrollmentTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('AI 产品实战营', { level: 1, sharedStyleId: 'hero-title' }),
      nodes.text('6 周直播 + 作业点评 + 项目共创，帮助团队构建真实可交付的 AI 产品。', {
        sharedStyleId: 'body-text',
        styles: { display: 'block', marginBottom: 18 },
      }),
      nodes.card('课程亮点', [
        nodes.tag('直播陪跑', 'orange'),
        nodes.tag('案例拆解', 'gold', { styles: { marginLeft: 8 } }),
        nodes.tag('结营答辩', 'red', { styles: { marginLeft: 8 } }),
      ], { sharedStyleId: 'promo-card' }),
      nodes.form('预约试听', 'vertical', [
        nodes.input('姓名', { styles: { width: 300 } }),
        nodes.input('手机号', { styles: { width: 300 } }),
        nodes.select('当前阶段', '产品经理,创业者,开发者,运营', { styles: { width: 300 } }),
        nodes.button('立即预约', { sharedStyleId: 'primary-button' }),
      ], { sharedStyleId: 'promo-card', styles: { padding: 20 } }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_course_enrollment',
    name: '课程招生页',
    description: '适合训练营、公开课和课程售卖活动。',
    category: 'landing',
    themeId: 'sunset',
    thumbnail: createThumbnail({
      title: '课程招生页',
      subtitle: '课程卖点 · 标签亮点 · 预约试听',
      accent: '#dc2626',
      surface: '#fff1f2',
      chip: '#fb7185',
    }),
    sharedStyles: marketingSharedStyles,
    components,
  });
}

function buildProfileCenterTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('个人中心', { level: 2, sharedStyleId: 'page-title' }),
      nodes.card('账户信息', [
        nodes.text('昵称：苏言', { styles: { display: 'block', marginBottom: 8 } }),
        nodes.text('邮箱：suyan@lingocode.dev', { styles: { display: 'block', marginBottom: 8 } }),
        nodes.text('最近登录：今天 08:16', { sharedStyleId: 'muted-text' }),
      ], { sharedStyleId: 'content-card' }),
      nodes.card('偏好设置', [
        nodes.switcher('开启', '关闭', { checked: true, styles: { marginBottom: 12 } }),
        nodes.switcher('开启', '关闭', { checked: false, styles: { marginBottom: 12 } }),
        nodes.button('保存偏好', { sharedStyleId: 'primary-button' }),
      ], { sharedStyleId: 'content-card' }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_profile_center',
    name: '个人中心',
    description: '适合用户资料、偏好与安全设置场景。',
    category: 'general',
    themeId: 'ocean',
    thumbnail: createThumbnail({
      title: '个人中心',
      subtitle: '资料信息 · 偏好设置 · 安全项',
      accent: '#0284c7',
      surface: '#f0f9ff',
      chip: '#38bdf8',
    }),
    sharedStyles: neutralSharedStyles,
    components,
  });
}

function buildNotificationCenterTemplate(): BuiltInTemplateDefinition {
  const nodes = createNodeFactory();
  const components = nodes.page(
    [
      nodes.title('通知中心', { level: 2, sharedStyleId: 'page-title' }),
      nodes.card('未读通知', [
        nodes.table(
          '标题,类型,时间',
          '新的协作邀请,系统通知,10:12\n表单提交成功,业务通知,09:48\n发布审核通过,运营通知,昨天 18:26',
        ),
      ], { sharedStyleId: 'content-card' }),
      nodes.card('快捷操作', [
        nodes.button('全部标记已读', { sharedStyleId: 'primary-button' }),
        nodes.button('通知设置', { type: 'default' }),
      ], { sharedStyleId: 'content-card' }),
    ],
    'page-shell',
  );

  return createTemplateDefinition({
    id: 'tpl_notification_center',
    name: '通知中心',
    description: '适合消息列表、系统提醒和协作通知场景。',
    category: 'general',
    themeId: 'ocean',
    thumbnail: createThumbnail({
      title: '通知中心',
      subtitle: '消息列表 · 快捷处理 · 已读管理',
      accent: '#7c3aed',
      surface: '#f5f3ff',
      chip: '#a78bfa',
    }),
    sharedStyles: neutralSharedStyles,
    components,
  });
}

export const builtInTemplates: BuiltInTemplateDefinition[] = [
  buildDashboardTemplate(),
  buildSalesTemplate(),
  buildOrderManagementTemplate(),
  buildUserDetailTemplate(),
  buildApprovalFormTemplate(),
  buildSystemSettingsTemplate(),
  buildSaasLandingTemplate(),
  buildEventSignupTemplate(),
  buildPricingTemplate(),
  buildCourseEnrollmentTemplate(),
  buildProfileCenterTemplate(),
  buildNotificationCenterTemplate(),
];
