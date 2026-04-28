#!/usr/bin/env node
import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { JiraClient } from "./jira.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});



// Giữ danh sách các kết nối (transports) cho từng phiên (session)
const transports = new Map<string, SSEServerTransport>();

// Hàm tạo một instance Server MCP mới cho mỗi client kết nối
function createServer(jira: JiraClient) {
  const server = new Server(
    {
      name: "jira-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "search_issues",
          description: "Tìm kiếm các công việc (issues) trên Jira bằng ngôn ngữ truy vấn JQL.",
          inputSchema: {
            type: "object",
            properties: {
              jql: {
                type: "string",
                description: "Truy vấn JQL (ví dụ: 'project = PROJ AND status = \"To Do\"')",
              },
              maxResults: {
                type: "number",
                description: "Số lượng kết quả tối đa trả về (mặc định 50)",
              },
            },
            required: ["jql"],
          },
        },
        {
          name: "get_issue",
          description: "Lấy thông tin chi tiết của một mã công việc cụ thể.",
          inputSchema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Mã công việc (ví dụ: 'KAN-1')",
              },
            },
            required: ["issueKey"],
          },
        },
        {
          name: "create_issue",
          description: "Tạo một công việc mới trên Jira.",
          inputSchema: {
            type: "object",
            properties: {
              projectKey: {
                type: "string",
                description: "Mã dự án (ví dụ: 'KAN')",
              },
              summary: {
                type: "string",
                description: "Tiêu đề công việc",
              },
              description: {
                type: "string",
                description: "Mô tả chi tiết công việc",
              },
              issueType: {
                type: "string",
                description: "Loại công việc (ví dụ: 'Task', 'Bug', 'Story')",
              },
            },
            required: ["projectKey", "summary", "issueType"],
          },
        },
        {
          name: "add_comment",
          description: "Thêm bình luận vào một công việc.",
          inputSchema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Mã công việc",
              },
              comment: {
                type: "string",
                description: "Nội dung bình luận",
              },
            },
            required: ["issueKey", "comment"],
          },
        },
        {
          name: "transition_issue",
          description: "Thay đổi trạng thái của một công việc.",
          inputSchema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Mã công việc",
              },
              transitionId: {
                type: "string",
                description: "ID của bước chuyển (lấy từ list_transitions)",
              },
            },
            required: ["issueKey", "transitionId"],
          },
        },
        {
          name: "list_transitions",
          description: "Liệt kê các trạng thái có thể chuyển đổi cho một công việc.",
          inputSchema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Mã công việc",
              },
            },
            required: ["issueKey"],
          },
        },
        {
          name: "list_projects",
          description: "Liệt kê danh sách các dự án.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_boards",
          description: "Liệt kê các bảng Agile (Scrum/Kanban).",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "search_issues": {
          const { jql, maxResults } = z.object({
            jql: z.string(),
            maxResults: z.number().optional(),
          }).parse(args);
          const result = await jira.searchIssues(jql, maxResults);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "get_issue": {
          const { issueKey } = z.object({ issueKey: z.string() }).parse(args);
          const result = await jira.getIssue(issueKey);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "create_issue": {
          const { projectKey, summary, description, issueType } = z.object({
            projectKey: z.string(),
            summary: z.string(),
            description: z.string().optional(),
            issueType: z.string(),
          }).parse(args);
          
          const fields: any = {
            project: { key: projectKey },
            summary,
            issuetype: { name: issueType },
          };
          
          if (description) {
            fields.description = {
              version: 1,
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
            };
          }
          
          const result = await jira.createIssue(fields);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "add_comment": {
          const { issueKey, comment } = z.object({
            issueKey: z.string(),
            comment: z.string(),
          }).parse(args);
          const result = await jira.addComment(issueKey, comment);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "list_transitions": {
          const { issueKey } = z.object({ issueKey: z.string() }).parse(args);
          const result = await jira.listTransitions(issueKey);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "transition_issue": {
          const { issueKey, transitionId } = z.object({
            issueKey: z.string(),
            transitionId: z.string(),
          }).parse(args);
          const result = await jira.transitionIssue(issueKey, transitionId);
          return { content: [{ type: "text", text: "Chuyển trạng thái thành công" }] };
        }
        case "list_projects": {
          const result = await jira.listProjects();
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "list_boards": {
          const result = await jira.listBoards();
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        default:
          throw new Error(`Công cụ không tồn tại: ${name}`);
      }
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Lỗi khi thực thi công cụ ${name}: ${error.message}` }],
      };
    }
  });

  return server;
}

// Hàm xử lý logic SSE
async function handleSSERoute(req: express.Request, res: express.Response) {
  // Log mọi method để quan sát
  console.log(`[${new Date().toISOString()}] SSE Route - Method: ${req.method}, URL: ${req.url}`);

  if (req.method === "POST") {
    const sessionId = req.query.sessionId as string;
    if (sessionId) {
      const transport = transports.get(sessionId);
      if (transport) {
        await transport.handlePostMessage(req, res);
        return;
      }
    }
    res.status(200).send("OK");
    return;
  }
  
  // Trả về 200 OK cho các probe khác như DELETE, OPTIONS
  if (req.method !== "GET") {
    res.status(200).send("OK");
    return;
  }

  try {
    let domain = (req.headers["x-jira-domain"] || req.query.domain) as string | undefined;
    let email = (req.headers["x-jira-email"] || req.query.email) as string | undefined;
    let apiToken = (req.headers["x-jira-token"] || req.query.token) as string | undefined;

    // Xử lý trường hợp dấu + trong token bị biến thành khoảng trắng do query params
    if (apiToken && !req.headers["x-jira-token"]) {
      apiToken = apiToken.replace(/ /g, "+");
    }

    console.log(`Kết nối SSE mới: domain=${domain}, email=${email}`);

    const jira = new JiraClient({ domain, email, apiToken });
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers["host"];
    const messageEndpoint = `${protocol}://${host}/messages`;
    
    console.log(`Khởi tạo SSE với message endpoint: ${messageEndpoint}`);
    
    const transport = new SSEServerTransport(messageEndpoint, res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    const server = createServer(jira);
    await server.connect(transport);

    req.on("close", () => {
      console.log(`Kết nối SSE đóng: sessionId=${sessionId}`);
      transports.delete(sessionId);
    });
  } catch (error) {
    console.error("Lỗi khi tạo kết nối SSE:", error);
    res.status(500).send("Internal Server Error");
  }
}

// Hỗ trợ discovery probes và các endpoint SSE đặc biệt
app.all("/.well-known/oauth-protected-resource/sse", handleSSERoute);
app.get("/.well-known/*wildcard", (req, res) => {
  console.log(`[${new Date().toISOString()}] Discovery Probe: ${req.method} ${req.url}`);
  res.status(200).json({});
});

// Endpoint để khởi tạo kết nối SSE (Server-Sent Events)
app.all("/sse", handleSSERoute);

// Endpoint để nhận các messages từ client
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  console.log(`[${new Date().toISOString()}] Nhận POST /messages - sessionId: "${sessionId}"`);
  
  const transport = transports.get(sessionId);
  
  if (!transport) {
    console.log(`[${new Date().toISOString()}] LỖI: Không tìm thấy session cho ID: "${sessionId}". Các session hiện có:`, Array.from(transports.keys()));
    res.status(404).send("Session not found");
    return;
  }
  
  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Lỗi khi xử lý message:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Bắt các request không khớp với các route trên
app.use((req, res) => {
  console.log(`[${new Date().toISOString()}] 404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).send("Not Found");
});

const PORT = parseInt(process.env.PORT || "3000", 10);


if (process.argv.includes("--sse")) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jira MCP Server (SSE) đang chạy tại: http://0.0.0.0:${PORT}`);
    console.log(`SSE Endpoint: http://0.0.0.0:${PORT}/sse`);
    console.log(`Message Endpoint: http://0.0.0.0:${PORT}/messages`);
  });
} else {
  // Chạy bằng Stdio transport (Dùng cho IDE cục bộ)
  const jira = new JiraClient();
  const server = createServer(jira);
  const transport = new StdioServerTransport();
  server.connect(transport).catch(error => {
    console.error("Lỗi khi kết nối Stdio:", error);
    process.exit(1);
  });
}
