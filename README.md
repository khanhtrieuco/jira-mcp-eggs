# Jira MCP Server

Đây là một Model Context Protocol (MCP) server cho phép các công cụ AI (như Claude, Cursor) tương tác trực tiếp với Jira của bạn để quản lý công việc, nhiệm vụ và dự án.

## Tính năng

- Tìm kiếm issues bằng JQL.
- Xem chi tiết công việc.
- Tạo mới công việc (Task, Bug, Story).
- Thêm bình luận.
- Chuyển trạng thái công việc (To Do -> In Progress -> Done).
- Liệt kê dự án và bảng điều khiển.

## Cài đặt

### 1. Chuẩn bị thông tin Jira

Bạn cần có:
- **JIRA_DOMAIN**: ví dụ `my-team.atlassian.net`.
- **JIRA_EMAIL**: Email đăng nhập Jira.
- **JIRA_API_TOKEN**: Tạo tại [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens).

### 2. Cấu hình môi trường

Tạo file `.env` từ mẫu `.env.example`:
```bash
cp .env.example .env
```
Sau đó điền thông tin của bạn vào file `.env`.

### 3. Triển khai với Docker

```bash
docker-compose up -d --build
```

### 4. Kết nối với AI Client (Ví dụ: Cursor, Windsurf, Claude Desktop)

Nếu IDE hoặc ứng dụng của bạn cho phép cấu hình qua file JSON (như `claude_desktop_config.json` hoặc cấu hình MCP của Cursor), bạn có thể truyền trực tiếp biến môi trường vào config thay vì dùng file `.env`.

**Cách 1: Chạy trực tiếp bằng Node.js (Khuyên dùng cho IDE)**
```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": [
        "/Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/dist/index.js"
      ],
      "env": {
        "JIRA_DOMAIN": "your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-jira-api-token"
      }
    }
  }
}
```

**Cách 2: Chạy qua Docker (Nếu bạn đã build image `jira-mcp-eggs`)**
```json
{
  "mcpServers": {
    "jira-mcp-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e", "JIRA_DOMAIN=your-domain.atlassian.net",
        "-e", "JIRA_EMAIL=your-email@example.com",
        "-e", "JIRA_API_TOKEN=your-jira-api-token",
        "jira-mcp-eggs"
      ]
    }
  }
}
```


## Phát triển

Nếu muốn chạy trực tiếp không qua Docker:

1. Cài đặt dependencies: `npm install`
2. Build code: `npm run build`
3. Chạy server: `npm start`
4. Chạy chế độ development: `npm run dev`
