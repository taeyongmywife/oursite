/**
 * 方案A：内联标记 [[llm:模型ID|按钮文字|原文]] 即时引用。
 *
 * 背景：Payload 自定义 Lexical 节点（llmResponse）在 CMS 编辑器中渲染失败
 * （client bundle 污染 → decorate JSX 崩溃 → 紫色空块），沙箱又无法做浏览器
 * 验证，故切换到纯文本标记方案：
 *  - CMS 富文本编辑器零改动，作者直接在正文段落里写 [[llm:...]] 字符串
 *  - 构建期扫描段落纯文本，标记替换为「查看原文」触发按钮（data-cite-id 序号）
 *  - 原文提取进页面级 JSON payload（#llm-citations），复用 LLMResponseCite 弹窗
 *  - 渲染顺序 = extract 顺序 = citeId 一一对应（DFS 先序遍历，两处保持一致）
 *
 * 标记格式：[[llm:modelId|viewText|body]]
 *  - 3 段必填（任何段可填空，但竖线分隔符不可省略）
 *  - 段内不含 `|`（分隔符）与 `]`（会截断 body 的贪婪匹配）
 *  - body 支持换行（\n 原样保留，弹窗 white-space: pre-wrap 显示）
 *  - viewText 留空 → fallback 「查看原文」
 */

export interface LLMMarker {
  /** 与正文触发按钮 data-cite-id 对应的序号（从 1 开始，按出现顺序） */
  citeId: number;
  modelId: string;
  /** 正文按钮文字（每条引用独立定制） */
  viewText: string;
  /** 弹窗内显示的模型原文 */
  body: string;
  /** 标记在原文本中的起始位置（含 [[llm:） */
  index: number;
  /** 标记总长度（含 ]]，供渲染端切片替换） */
  length: number;
}

/** 段内不含 `|` 与 `]`；`*` 可跨行匹配（原文支持换行） */
const MARKER_SOURCE = "\\[\\[llm:([^|\\]]*)\\|([^|\\]]*)\\|([^|\\]]*)\\]\\]";

/**
 * 扫描一段纯文本，解析其中所有 [[llm:...]] 标记。
 * @param startSeq 起始序号（多段连续扫描时传入上一段结束序号）
 * @returns markers 按出现顺序；endSeq 供下一段续接
 */
export function parseLLMMarkers(
  text: string,
  startSeq = 0
): { markers: LLMMarker[]; endSeq: number } {
  const markers: LLMMarker[] = [];
  let seq = startSeq;
  const re = new RegExp(MARKER_SOURCE, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    seq += 1;
    markers.push({
      citeId: seq,
      modelId: m[1].trim(),
      viewText: m[2].trim() || "查看原文",
      body: m[3].trim(),
      index: m.index,
      length: m[0].length,
    });
  }
  return { markers, endSeq: seq };
}

/** 判断一段文本是否含 LLM 标记（快速短路，避免无谓正则） */
export function containsLLMMarker(text: string): boolean {
  return text.includes("[[llm:");
}
