export const MAX_README_BYTES = 2 * 1024 * 1024;

export class ReadmeTooLargeError extends Error {
  constructor() {
    super("The GitHub README exceeds 2 MiB. Paste a smaller section of Markdown instead.");
    this.name = "ReadmeTooLargeError";
  }
}

export async function readReadmeBody(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_README_BYTES) {
        // Stop the download even when Content-Length is missing or inaccurate.
        await reader.cancel().catch(() => {});
        throw new ReadmeTooLargeError();
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } finally {
    reader.releaseLock();
  }
}
