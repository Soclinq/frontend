import { API_BASE_URL } from "./config";
import { getCsrfToken } from "./csrf";

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const url =
    typeof input === "string" ? `${API_BASE_URL}/api/v1${input}` : input;

  const method = (init.method || "GET").toUpperCase();

  const headers: Record<string, string> = {
    ...(init.headers as any),
  };

  // ✅ only send CSRF for write methods
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    headers["X-CSRFToken"] = getCsrfToken();
  }

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  // refresh logic...
  if (res.status === 401) {
    const refreshed = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    });

    if (!refreshed.ok) throw new Error("Session expired");

    return fetch(url, {
      ...init,
      credentials: "include",
      headers,
    });
  }

  return res;
}
