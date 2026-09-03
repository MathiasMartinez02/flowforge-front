const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Wrapper mínimo sobre fetch hacia el backend: centraliza la base URL y el manejo de errores HTTP.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}
