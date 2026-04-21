import { Injectable } from '@nestjs/common';
import type { BindDataDto } from './dto/bind-data.dto';
import type { EditSelectionDto } from './dto/edit-selection.dto';
import type { GenerateActionDto } from './dto/generate-action.dto';
import type { GeneratePageDto } from './dto/generate-page.dto';

@Injectable()
export class PromptBuilderService {
  buildGeneratePagePrompt(dto: GeneratePageDto): string {
    const themeText = dto.currentThemeId
      ? `当前主题：${dto.currentThemeId}`
      : '当前主题：未指定';
    const componentCount = Array.isArray(dto.components) ? dto.components.length : 0;

    return [
      '你是低代码编辑器的页面骨架生成助手。',
      '严格返回一个合法 JSON 对象，不要输出 markdown，不要输出解释。',
      '目标：根据用户描述生成合法的组件树 JSON。',
      '必须完全匹配这个结构：',
      '{"taskType":"generate-page","summary":"string","patches":[{"id":1,"name":"Page","props":{},"desc":"页面","children":[]}],"warnings":["string"],"confidence":0.8}',
      '组件 name 只能使用这些值：Page, Title, Text, Button, Form, Input, Select, DatePicker, Chart, Table。',
      '每个节点必须有 id:number name:string props:object desc:string。',
      '可以有 children:[]，不要使用 type 字段，不要省略 id，不要输出多余字段。',
      '根节点必须是 Page。',
      themeText,
      `当前页面组件数量：${componentCount}`,
      `用户需求：${dto.prompt}`,
    ].join('\n');
  }

  buildEditSelectionPrompt(dto: EditSelectionDto): string {
    return [
      '你是低代码编辑器的局部改造助手。',
      '严格返回一个合法 JSON 对象，不要输出 markdown，不要输出解释。',
      '必须完全匹配这个结构：',
      '{"taskType":"edit-selection","summary":"string","targetComponentId":2,"operation":"replace","patch":{"id":1,"name":"Form","props":{},"desc":"表单","children":[]},"warnings":["string"],"confidence":0.8}',
      'patch 表示要替换当前选中区块的新组件树。',
      'patch 必须使用这些 name：Page, Title, Text, Button, Form, Input, Select, DatePicker, Chart, Table, Container。',
      '每个节点必须有 id:number name:string props:object desc:string。',
      '不要使用 type 字段，不要输出多余字段。',
      `选中组件 ID：${dto.selectedComponentId}`,
      `选区摘要：${dto.selectionSummary || '无'}`,
      `历史摘要：${dto.conversationSummary || '无'}`,
      `用户需求：${dto.prompt}`,
    ].join('\n');
  }

  buildBindDataPrompt(
    dto: BindDataDto,
    dataSourceSummary: string,
    componentSummary: string,
  ): string {
    return [
      '你是低代码编辑器的数据绑定建议助手。',
      '严格返回一个合法 JSON 对象，不要输出 markdown，不要输出解释。',
      '必须完全匹配这个结构：',
      '{"taskType":"bind-data","summary":"string","suggestions":[{"componentId":2,"componentName":"Table","bindings":{"dataSource":"requestResults.userList"},"dataSourceId":"ds_1","resultKey":"userList","stateSuggestions":["加载态建议"]}],"warnings":["string"],"confidence":0.8}',
      '只为适合绑定数据的组件输出建议，例如 Table、Chart、Title、Text。',
      `可用组件摘要：\n${componentSummary}`,
      `数据源摘要：\n${dataSourceSummary}`,
      `用户需求：${dto.prompt || '为当前页面生成数据绑定建议'}`,
      `历史摘要：${dto.conversationSummary || '无'}`,
    ].join('\n');
  }

  buildGenerateActionPrompt(
    dto: GenerateActionDto,
    dataSourceSummary: string,
    componentSummary: string,
  ): string {
    return [
      '你是低代码编辑器的动作链建议助手。',
      '严格返回一个合法 JSON 对象，不要输出 markdown，不要输出解释。',
      '必须完全匹配这个结构：',
      '{"taskType":"generate-action","summary":"string","suggestions":[{"componentId":6,"eventType":"onClick","actionType":"callAPI","actionConfig":{"dataSourceId":"ds_1","resultKey":"userList"},"reason":"string"}],"warnings":["string"],"confidence":0.8}',
      'actionType 只能使用这些值：showMessage, navigate, setState, callAPI, customScript。',
      'componentId 必须从可用组件摘要中选择真实存在的组件 ID。',
      `可用组件摘要：\n${componentSummary}`,
      `数据源摘要：\n${dataSourceSummary}`,
      `用户需求：${dto.prompt || '为当前页面生成动作链建议'}`,
      `历史摘要：${dto.conversationSummary || '无'}`,
    ].join('\n');
  }
}
