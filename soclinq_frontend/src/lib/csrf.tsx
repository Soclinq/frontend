// src/lib/csrf.ts
export const getCsrfToken = () => {
    if (typeof window === "undefined") return "";
    return (
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("csrftoken="))
        ?.split("=")[1] || ""
    );
  };
  