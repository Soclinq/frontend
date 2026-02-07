export function saveThreadCache(threadId: string, messages: any[]) {
    try {
      localStorage.setItem(
        `chat-cache-${threadId}`,
        JSON.stringify(messages.slice(-200))
      );
    } catch {}
  }
  
  export function loadThreadCache(threadId: string) {
    try {
      const raw = localStorage.getItem(`chat-cache-${threadId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  