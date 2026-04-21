import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const builtInTemplates = [
  {
    id: 'tpl_dashboard',
    name: '数据看板',
    description: '包含标题、图表和表格的看板模板',
    category: 'dashboard',
    builtIn: true,
    useCount: 0,
    components: {
      id: 1,
      name: 'Page',
      props: {},
      desc: '页面',
      children: [
        { id: 2, name: 'Title', props: { text: '运营数据看板', level: 2 }, desc: '标题' },
        { id: 3, name: 'Chart', props: { title: '近7日趋势', chartType: 'line', dataText: '周一,120\n周二,180\n周三,160' }, desc: '图表' },
        { id: 4, name: 'Table', props: { columnsText: '指标,数值', dataText: '访问量,1200\n转化率,15' }, desc: '表格' },
      ],
    },
    pages: [{ id: 'page_1', name: '页面 1', components: [] }],
    dataSources: {},
    variables: {},
    sharedStyles: [],
    themeId: 'ocean',
  },
  {
    id: 'tpl_form',
    name: '报名表单',
    description: '包含表单、输入框、日期和提交按钮的模板',
    category: 'form',
    builtIn: true,
    useCount: 0,
    components: {
      id: 1,
      name: 'Page',
      props: {},
      desc: '页面',
      children: [
        {
          id: 2,
          name: 'Form',
          props: { title: '活动报名', layout: 'vertical' },
          desc: '表单',
          children: [
            { id: 3, name: 'Input', props: { placeholder: '请输入姓名', value: '' }, desc: '输入框', parentId: 2 },
            { id: 4, name: 'DatePicker', props: { placeholder: '请选择日期', value: '' }, desc: '日期选择', parentId: 2 },
            { id: 5, name: 'Button', props: { type: 'primary', text: '提交' }, desc: '按钮', parentId: 2 },
          ],
        },
      ],
    },
    pages: [{ id: 'page_1', name: '页面 1', components: [] }],
    dataSources: {},
    variables: {},
    sharedStyles: [],
    themeId: 'ocean',
  },
];

async function main() {
  console.log('开始 seed 内置模板...');

  for (const template of builtInTemplates) {
    const existing = await prisma.template.findUnique({
      where: { id: template.id },
    });

    if (existing) {
      console.log(`模板 "${template.name}" 已存在，跳过`);
      continue;
    }

    await prisma.template.create({
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        builtIn: true,
        useCount: 0,
        components: template.components,
        pages: template.pages,
        dataSources: template.dataSources,
        variables: template.variables,
        sharedStyles: template.sharedStyles,
        themeId: template.themeId,
        userId: null,
      },
    });
    console.log(`模板 "${template.name}" 创建成功`);
  }

  console.log('Seed 完成!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
