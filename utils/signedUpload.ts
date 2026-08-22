/**
 * Client-side helper to upload a File to a signed URL (e.g. Firebase Storage).
 * Used by gallery upload and convert-to-watermark flows.
 */
export async function putToSignedUrl(
  uploadUrl: string,
  file: File,
  signal?: AbortSignal | undefined
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}
