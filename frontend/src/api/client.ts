export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("token", token);
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}
