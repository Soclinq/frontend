type UploadJob = {
    id: string;
    file: File;
    threadId: string;
  };
  
  const queue: UploadJob[] = [];
  let uploading = false;
  
  export async function enqueueUpload(job: UploadJob, uploadFn: any) {
    queue.push(job);
    if (!uploading) processQueue(uploadFn);
  }
  
  async function processQueue(uploadFn: any) {
    uploading = true;
  
    while (queue.length) {
      const job = queue.shift()!;
      try {
        await uploadFn(job);
      } catch {
        // requeue if needed
        queue.unshift(job);
        break;
      }
    }
  
    uploading = false;
  }
  