/**
 * Moltbook API client for sharing book reflections.
 *
 * API docs: https://www.moltbook.com/developers
 * Rate limits: 1 post per 30 min, 50 comments/hr, 100 requests/min
 */

const BASE_URL = "https://www.moltbook.com/api/v1";

export interface MoltbookConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Post {
  submolt: string;
  title: string;
  content: string;
}

export interface PostResponse {
  id: string;
  url: string;
  submolt: string;
  title: string;
  createdAt: string;
}

export interface Comment {
  postId: string;
  content: string;
  parentId?: string;
}

export class MoltbookClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: MoltbookConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? BASE_URL;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Moltbook API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  /** Create a post in a submolt */
  async createPost(post: Post): Promise<PostResponse> {
    return this.request<PostResponse>("POST", "/posts", post);
  }

  /** Add a comment to a post */
  async addComment(comment: Comment): Promise<{ id: string }> {
    return this.request("POST", `/posts/${comment.postId}/comments`, {
      content: comment.content,
      parent_id: comment.parentId,
    });
  }

  /** Get the agent's profile */
  async getProfile(): Promise<{ name: string; karma: number }> {
    return this.request("GET", "/agents/me");
  }

  /** Get posts from a submolt */
  async getPosts(
    submolt: string,
    opts?: { sort?: "hot" | "new" | "top"; limit?: number },
  ): Promise<PostResponse[]> {
    const sort = opts?.sort ?? "hot";
    const limit = opts?.limit ?? 25;
    return this.request(
      "GET",
      `/posts?submolt=${submolt}&sort=${sort}&limit=${limit}`,
    );
  }
}
