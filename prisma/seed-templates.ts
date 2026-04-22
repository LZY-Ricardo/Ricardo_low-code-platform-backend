import { Prisma, PrismaClient } from '@prisma/client';
import { builtInTemplates } from '../src/templates/built-in-templates';

const prisma = new PrismaClient();

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function main() {
  console.log('开始 seed 内置模板...');

  for (const template of builtInTemplates) {
    await prisma.template.upsert({
      where: { id: template.id },
      create: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        thumbnail: template.thumbnail,
        builtIn: true,
        useCount: 0,
        components: toJsonValue(template.components),
        pages: toJsonValue(template.pages),
        dataSources: toJsonValue(template.dataSources),
        variables: toJsonValue(template.variables),
        sharedStyles: toJsonValue(template.sharedStyles),
        themeId: template.themeId,
        userId: null,
      },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        thumbnail: template.thumbnail,
        builtIn: true,
        components: toJsonValue(template.components),
        pages: toJsonValue(template.pages),
        dataSources: toJsonValue(template.dataSources),
        variables: toJsonValue(template.variables),
        sharedStyles: toJsonValue(template.sharedStyles),
        themeId: template.themeId,
        userId: null,
      },
    });
    console.log(`模板 "${template.name}" 已同步`);
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
