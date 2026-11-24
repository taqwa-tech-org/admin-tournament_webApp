// Every call goes to the Express API with the staff session cookie (httpOnly, set by the API).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export const WEB_URL = import.meta.env.VITE_WEB_URL || "http://localhost:5173";
export const apiUrl = (path: string) => `${BASE}/api/v1${path}`;
export const mediaUrl = (u?: string | null) => (!u ? null : /^https?:/.test(u) ? u : `${BASE}${u}`);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Opts = { method?: string; body?: unknown; form?: FormData; raw?: Blob; headers?: Record<string, string>; signal?: AbortSignal };

export async function api<T = { ok: true; message: string }>(path: string, o: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { "X-Requested-With": "fetch", ...o.headers };
  let body: BodyInit | undefined;
  if (o.form) body = o.form;
  else if (o.raw) body = o.raw;
  else if (o.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(o.body);
  }
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { method: o.method ?? (body ? "POST" : "GET"), headers, body, credentials: "include", signal: o.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Cannot reach the server. Check the internet connection or whether the API is running.");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event("auth:lost"));
    if (res.status === 403 && /change your password/i.test(data.error ?? "")) window.dispatchEvent(new Event("auth:refresh"));
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status}).`);
  }
  return data;
}

/** Upload with progress (used for large APK files). */
export function uploadWithProgress<T>(path: string, file: File, headers: Record<string, string>, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-Requested-With", "fetch");
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: (T & { error?: string }) | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, data?.error ?? `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new ApiError(0, "Upload failed: connection lost."));
    xhr.send(file);
  });
}
