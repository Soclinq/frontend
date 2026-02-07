export function createBatcher<T>(
    flush: (items: T[]) => void,
    delay = 300
  ) {
    let queue: T[] = [];
    let timer: any = null;
  
    return (item: T) => {
      queue.push(item);
      if (timer) return;
  
      timer = setTimeout(() => {
        flush(queue);
        queue = [];
        timer = null;
      }, delay);
    };
  }
  