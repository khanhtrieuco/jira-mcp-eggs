import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';

// dotenv.config(); // Vô hiệu hóa để tránh dotenv in log "injected env..." ra stdout làm hỏng MCP

export class JiraClient {
  private client: AxiosInstance;
  private agileClient: AxiosInstance;
  private isCloud: boolean;

  constructor(options?: { domain?: string; email?: string; apiToken?: string }) {
    const domain = options?.domain || process.env.JIRA_DOMAIN;
    const email = options?.email || process.env.JIRA_EMAIL;
    const apiToken = options?.apiToken || process.env.JIRA_API_TOKEN;

    if (!domain || !apiToken) {
      console.warn('Cảnh báo: Thiếu biến môi trường JIRA_DOMAIN hoặc JIRA_API_TOKEN. Các công cụ sẽ bị lỗi khi thực thi.');
    }

    let baseURL = '';
    let agileBaseURL = '';
    
    const safeDomain = domain || '';
    if (safeDomain.startsWith('http://') || safeDomain.startsWith('https://')) {
      this.isCloud = false;
      baseURL = `${safeDomain}/rest/api/2`; // Jira Server thường dùng v2
      agileBaseURL = `${safeDomain}/rest/agile/1.0`;
    } else {
      this.isCloud = true;
      const host = safeDomain.includes('.atlassian.net') ? safeDomain : `${safeDomain}.atlassian.net`;
      baseURL = `https://${host}/rest/api/3`; // Jira Cloud dùng v3
      agileBaseURL = `https://${host}/rest/agile/1.0`;
    }

    const headers: any = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (email) {
      // Basic Auth
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else {
      // Personal Access Token (Bearer)
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    this.client = axios.create({ baseURL, headers });
    this.agileClient = axios.create({ baseURL: agileBaseURL, headers });
  }

  async searchIssues(jql: string, maxResults = 50) {
    const response = await this.client.get('/search', {
      params: { jql, maxResults },
    });
    return response.data;
  }

  async getIssue(issueKey: string) {
    const response = await this.client.get(`/issue/${issueKey}`);
    return response.data;
  }

  async createIssue(fields: any) {
    const response = await this.client.post('/issue', { fields });
    return response.data;
  }

  async updateIssue(issueKey: string, fields: any) {
    const response = await this.client.put(`/issue/${issueKey}`, { fields });
    return response.data;
  }

  async addComment(issueKey: string, body: string) {
    // Jira Cloud (v3) uses Atlassian Document Format (ADF)
    // Jira Server (v2) uses plain text string
    let payload;
    if (this.isCloud) {
      payload = {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: body }],
          },
        ],
      };
    } else {
      payload = body;
    }
    const response = await this.client.post(`/issue/${issueKey}/comment`, { body: payload });
    return response.data;
  }

  async listTransitions(issueKey: string) {
    const response = await this.client.get(`/issue/${issueKey}/transitions`);
    return response.data;
  }

  async transitionIssue(issueKey: string, transitionId: string) {
    const response = await this.client.post(`/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
    return response.data;
  }

  async listProjects() {
    const response = await this.client.get('/project');
    return response.data;
  }

  async listBoards() {
    const response = await this.agileClient.get('/board');
    return response.data;
  }

  async getSprintIssues(sprintId: string) {
    const response = await this.agileClient.get(`/sprint/${sprintId}/issue`);
    return response.data;
  }

  async createSubtask(parentKey: string, projectKey: string, summary: string, description?: string, issueType = 'Sub-task') {
    const fields: any = {
      project: { key: projectKey },
      parent: { key: parentKey },
      summary,
      issuetype: { name: issueType },
    };

    if (description) {
      if (this.isCloud) {
        fields.description = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description }],
            },
          ],
        };
      } else {
        fields.description = description;
      }
    }

    const response = await this.client.post('/issue', { fields });
    return response.data;
  }

  async addWorklog(issueKey: string, timeSpent: string, comment?: string, started?: string) {
    const body: any = {
      timeSpent,
    };

    if (comment) {
      if (this.isCloud) {
        body.comment = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: comment }],
            },
          ],
        };
      } else {
        body.comment = comment;
      }
    }

    if (started) {
      body.started = started;
    }

    const response = await this.client.post(`/issue/${issueKey}/worklog`, body);
    return response.data;
  }
  
  async addAttachment(issueKey: string, filePath: string) {
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    form.append('file', fileStream);

    const response = await this.client.post(`/issue/${issueKey}/attachments`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Atlassian-Token': 'no-check',
      },
    });
    return response.data;
  }
}
