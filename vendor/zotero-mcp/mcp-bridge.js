import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// 这里内置 zotero-mcp 的核心工具定义
const server = new Server({ name: "zotero-mcp-bridge", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "search_literature", description: "高级语义搜索文献 (支持布尔运算)", inputSchema: { type: "object", properties: { query: { type: "string" } } } },
    { name: "extract_pdf_content", description: "提取 PDF 全文/批注", inputSchema: { type: "object", properties: { itemKey: { type: "string" } } } }
  ]
}));

// 后续逻辑：将 zotero-mcp 的实际库函数调用映射至此
const transport = new StdioServerTransport();
await server.connect(transport);
