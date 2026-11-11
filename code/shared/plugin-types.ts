// ---- plugin:skincare_order_parser_1 ----
// ============================================================
// 插件 skincare_order_parser_1 (护肤品订单结构化解析) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export type SkincareOrderParserOneInput = {
  /** 电商订单/交易快照文本内容，包含产品、套装、赠品、规格数量价格等信息 */
  order_text: string;
};

/**
 * const input: SkincareOrderParserOneInput = { order_text };
 * capabilityClient.load('skincare_order_parser_1').call<SkincareOrderParserOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { usage, brand, category, ... } = result;
 * 返回值形如：
 *   {"usage":"示例文本","brand":"示例文本","category":"示例文本","specification":"示例文本","quantity":0,"purchase_date":"示例文本","is_gift":false,"is_opened":false,"product_name":"示例文本","price":0,"belongs_to_set":"示例文本","remark":"示例文本"}
 */
export type SkincareOrderParserOneOutput = {
  /** 产品主要用途/功效描述 */
  usage: string;
  /** 产品品牌名称 */
  brand: string;
  /** 产品分类：洁面/爽肤水/精华/乳液/面霜/眼霜/面膜/防晒/彩妆/其他 */
  category: string;
  /** 产品规格容量，如100ml、50g、30ml*2等 */
  specification: string;
  /** 购买数量，数字类型 */
  quantity: number;
  /** 购买日期，格式YYYY-MM-DD */
  purchase_date: string;
  /** 是否为赠品，布尔类型：true是/false否 */
  is_gift: boolean;
  /** 是否已开封，布尔类型：true是/false否，未明确则填false */
  is_opened: boolean;
  /** 产品全称，包含系列、型号等完整信息 */
  product_name: string;
  /** 产品单价，单位为元，数字类型 */
  price: number;
  /** 所属套装名称，非套装产品填空字符串 */
  belongs_to_set: string;
  /** 其他需要补充的备注信息 */
  remark: string;
};
// ---- end:skincare_order_parser_1 ----

// ---- plugin:skincare_text_generation_channel_1 ----
// ============================================================
// 插件 skincare_text_generation_channel_1 (护肤品录入通用文本生成通道) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export type SkincareTextGenerationChannelOneInput = {
  /** 完整的提示词，包含订单原文和JSON输出要求 */
  prompt: string;
};

/**
 * const input: SkincareTextGenerationChannelOneInput = { prompt };
 * capabilityClient.load('skincare_text_generation_channel_1').callStream<SkincareTextGenerationChannelOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 SkincareTextGenerationChannelOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export type SkincareTextGenerationChannelOneOutput = {
  content: string;
  response?: string;
};
// ---- end:skincare_text_generation_channel_1 ----