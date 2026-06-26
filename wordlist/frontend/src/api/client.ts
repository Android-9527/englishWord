export interface RelationItem {
  r_id: number;
  word: string;
  sentence: string;
  w_trans?: string | null;
  s_trans?: string | null;
}

export interface DashboardStats {
  users: number;
  relations: number;
  user_relations: number;
  my_relations: number;
  user_id: string;
}

export interface UserItem {
  u_id: string;
}

export interface SelectionResponse {
  selection_meaning: string;
  sentence_meaning: string;
}

interface ApiListResponse<T> {
  items: T[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload as T;
}

export function getDashboard(userId: string) {
  const query = new URLSearchParams({ u_id: userId }).toString();
  return request<DashboardStats>(`/dashboard?${query}`);
}

export function createUser(userId: string) {
  return request<{ item: UserItem; created: boolean; duplicate: boolean }>('/users', {
    method: 'POST',
    body: JSON.stringify({ u_id: userId })
  });
}

export function getRelations(userId: string) {
  const query = new URLSearchParams({ u_id: userId }).toString();
  return request<ApiListResponse<RelationItem>>(`/relations?${query}`);
}

export function processSelection(selectionText: string, sentence: string, source_url: string, userId: string) {
  return request<SelectionResponse>('/selection', {
    method: 'POST',
    body: JSON.stringify({ selectionText, sentence, source_url, u_id: userId })
  });
}
