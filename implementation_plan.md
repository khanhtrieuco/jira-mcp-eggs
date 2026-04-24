# Jira MCP Server Implementation Plan

This plan outlines the steps to build a Model Context Protocol (MCP) server that integrates with Jira. The server will provide AI-ready tools to manage tasks, sprints, and projects.

## User Review Required

> [!IMPORTANT]
> You will need to provide the following Jira credentials for the service to work:
> - **JIRA_DOMAIN**: e.g., `your-domain.atlassian.net`
> - **JIRA_EMAIL**: The email associated with your Atlassian account.
> - **JIRA_API_TOKEN**: An API token generated from [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens).

## Proposed Tools (Định nghĩa bằng tiếng Việt)

Các công cụ sẽ được mô tả chi tiết bằng tiếng Việt để AI có thể hiểu và hỗ trợ bạn tốt nhất trong ngữ cảnh công việc tại Việt Nam:

1.  **`search_issues`**: Tìm kiếm các vấn đề (vấn đề, nhiệm vụ) bằng truy vấn JQL.
2.  **`get_issue`**: Lấy thông tin chi tiết của một mã công việc cụ thể (ví dụ: PROJ-123).
3.  **`create_issue`**: Tạo mới một công việc (Task, Bug, Story, v.v.) với tiêu đề và mô tả bằng tiếng Việt.
4.  **`update_issue`**: Cập nhật thông tin các trường của một công việc hiện có.
5.  **`add_comment`**: Thêm bình luận vào một công việc.
6.  **`transition_issue`**: Chuyển trạng thái công việc (ví dụ: "Chưa làm" -> "Đang làm" -> "Hoàn thành").
7.  **`list_projects`**: Liệt kê tất cả các dự án bạn có quyền truy cập.
8.  **`list_boards`**: Liệt kê các bảng Agile (Scrum/Kanban).
9.  **`get_sprint_issues`**: Liệt kê danh sách các công việc trong một Sprint cụ thể.

## Proposed Architecture

### Jira MCP Server

#### [NEW] [package.json](file:///Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/package.json)
Contains dependencies: `@modelcontextprotocol/sdk`, `axios`, `dotenv`, `zod`.

#### [NEW] [tsconfig.json](file:///Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/tsconfig.json)
TypeScript configuration for ESM.

#### [NEW] [src/index.ts](file:///Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/src/index.ts)
Initializes the MCP server and registers tools.

#### [NEW] [src/jira.ts](file:///Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/src/jira.ts)
A thin wrapper around Jira REST API.

#### [NEW] [Dockerfile](file:///Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/Dockerfile)
Multi-stage build for a lightweight production image.

#### [NEW] [docker-compose.yml](file:///Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/docker-compose.yml)
To run the server easily with environment variables.

#### [NEW] [.env.example](file:///Users/khanhtrieu/Documents/GitHub/jira-mcp-eggs/.env.example)
Template for required environment variables.

## Verification Plan

### Automated Tests
- I will implement a basic health check and tool listing test.
- Since I don't have real Jira credentials, I will mock the Jira API for local verification during development if needed, or simply ensure the tool definitions and logic are correct.

### Manual Verification
- After deployment, you can test the tools by connecting the MCP server to your AI assistant (e.g., Claude Desktop, Cursor).
