/**
 * API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || response.statusText,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const api = {
  // Recipes
  recipes: {
    list: (userId?: string) =>
      request<any>(`/api/recipes${userId ? `?user_id=${userId}` : ''}`),
    get: (id: string) => request<any>(`/api/recipes/${id}`),
    create: (data: { prompt: string; user_id?: string }) =>
      request<any>('/api/recipes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    execute: (id: string, userId?: string) =>
      request<any>(`/api/recipes/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId || 'default_user' }),
      }),
  },

  // Executions
  executions: {
    list: (recipeId?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (recipeId) params.append('recipe_id', recipeId);
      if (limit) params.append('limit', String(limit));
      return request<any>(`/api/executions${params.toString() ? `?${params}` : ''}`);
    },
    get: (id: string) => request<any>(`/api/executions/${id}`),
    create: (data: { recipe_id: string; user_id?: string }) =>
      request<any>('/api/executions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Datasets
  datasets: {
    list: (recipeId?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (recipeId) params.append('recipe_id', recipeId);
      if (limit) params.append('limit', String(limit));
      return request<any>(`/api/datasets${params.toString() ? `?${params}` : ''}`);
    },
    get: (id: string, includeItems = true, limit = 50, offset = 0) =>
      request<any>(
        `/api/datasets/${id}?include_items=${includeItems}&limit=${limit}&offset=${offset}`
      ),
    getItems: (id: string, limit = 50, offset = 0) =>
      request<any>(`/api/datasets/${id}/items?limit=${limit}&offset=${offset}`),
  },

  // Sources
  sources: {
    list: () => request<any>('/api/sources'),
    get: (id: string) => request<any>(`/api/sources/${id}`),
  },
};

export { ApiError };
