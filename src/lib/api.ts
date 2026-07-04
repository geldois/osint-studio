import type { GraphSchema, TokenResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  if (!res.ok) {
    const { detail } = (await res.json()) as { detail: string };
    throw new Error(detail);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function fetchGraph(cnpj: string, token: string): Promise<GraphSchema> {
  const res = await fetch(`${API_URL}/cnpj/${cnpj}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const { detail } = (await res.json()) as { detail: string };
    throw new Error(detail);
  }
  return res.json() as Promise<GraphSchema>;
}
