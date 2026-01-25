// src/lib/authFetch.ts
import { API_BASE_URL } from "./config";
import { getCsrfToken } from "./csrf";

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const url =
    typeof input === "string"
      ? `${API_BASE_URL}/api/v1${input}`
      : input;

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers || {}),
      "X-CSRFToken": getCsrfToken(),
    },
  });

  // Access token expired → try refresh
  if (res.status === 401) {
    const refreshed = await fetch(
      `${API_BASE_URL}/api/v1/auth/refresh/`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCsrfToken(),
        },
      }
    );

    if (!refreshed.ok) {
      throw new Error("Session expired");
    }

    // Retry original request ONCE
    return fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.headers || {}),
        "X-CSRFToken": getCsrfToken(),
      },
    });
  }

  return res;
}
