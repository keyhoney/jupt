/**
 * Cloudflare Pages Function: API 키는 서버(env)에서만 사용되며 클라이언트에 노출되지 않습니다.
 * Cloudflare 대시보드에서 GEMINI_API_KEY를 환경 변수(암호)로 설정하세요.
 */

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

export interface Env {
  GEMINI_API_KEY: string;
}

type Context = { request: Request; env: Env };

export const onRequestPost = async (context: Context) => {
  const request = context.request;
  const env = (context as { env?: Record<string, string> }).env ?? {};
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    const envKeys = Object.keys(env).length ? Object.keys(env).join(", ") : "(env 비어 있음)";
    return new Response(
      JSON.stringify({
        error: "GEMINI_API_KEY is not configured.",
        hint: "로컬: 프로젝트 루트에 .dev.vars 파일에 GEMINI_API_KEY=키 입력. wrangler.toml 과 같은 폴더에 두세요.",
        envKeys,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  type HistoryItem = { role?: "user" | "model"; content?: string };
  let body: { query?: string; useWebSearch?: boolean; history?: HistoryItem[] };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const useWebSearch = Boolean(body?.useWebSearch);
  const history = Array.isArray(body?.history) ? body.history : [];

  if (!query) {
    return new Response(
      JSON.stringify({ error: "Missing or empty 'query'." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = history
    .filter((m): m is { role: "user" | "model"; content: string } => 
      (m.role === "user" || m.role === "model") && typeof m.content === "string"
    )
    .map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
  contents.push({ role: "user", parts: [{ text: query }] });

  const requestBody: Record<string, unknown> = {
    contents,
  };
  if (useWebSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  try {
    const res = await fetch(GEMINI_URL(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { uri: string; title?: string } }>;
        };
      }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const message = data?.error?.message || res.statusText;
      return new Response(
        JSON.stringify({ error: message }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "죄송합니다. 답변을 생성하는 중에 문제가 발생했습니다.";

    const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .filter((chunk): chunk is { web: { uri: string; title?: string } } => Boolean(chunk.web))
      .map((chunk) => ({
        title: chunk.web.title || "출처",
        uri: chunk.web.uri,
      }));

    const uniqueSources = sources.filter(
      (s, i, arr) => arr.findIndex((t) => t.uri === s.uri) === i
    );

    return new Response(
      JSON.stringify({
        answer: text,
        sources: uniqueSources,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
