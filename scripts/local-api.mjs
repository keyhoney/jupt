/**
 * 로컬 전용 /api/search 서버. .dev.vars 에서 GEMINI_API_KEY 를 읽습니다.
 * 배포 시에는 사용하지 않고 Cloudflare Pages Function 이 대신 동작합니다.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// .dev.vars 로드 (KEY=value 형식, # 주석 허용)
function loadDevVars() {
  try {
    const path = resolve(root, ".dev.vars");
    const content = readFileSync(path, "utf8");
    const env = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        env[key] = value;
      }
    }
    return env;
  } catch {
    return {};
  }
}

const devVars = loadDevVars();
Object.entries(devVars).forEach(([k, v]) => {
  if (!process.env[k]) process.env[k] = v;
});

const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/api/search", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured.",
      hint: "프로젝트 루트에 .dev.vars 파일을 만들고 GEMINI_API_KEY=키 를 넣으세요.",
    });
  }

  const { query, useWebSearch, history = [] } = req.body || {};
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) {
    return res.status(400).json({ error: "Missing or empty 'query'." });
  }

  const contents = history
    .filter((m) => (m.role === "user" || m.role === "model") && typeof m.content === "string")
    .map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
  contents.push({ role: "user", parts: [{ text: q }] });

  const requestBody = { contents };
  if (useWebSearch) requestBody.tools = [{ google_search: {} }];

  try {
    const r = await fetch(GEMINI_URL(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || r.statusText });
    }

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "죄송합니다. 답변을 생성하는 중에 문제가 발생했습니다.";
    const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .filter((c) => c.web)
      .map((c) => ({ title: c.web.title || "출처", uri: c.web.uri }));
    const unique = sources.filter((s, i, a) => a.findIndex((t) => t.uri === s.uri) === i);

    return res.json({ answer: text, sources: unique });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
});

const PORT = Number(process.env.LOCAL_API_PORT) || 8789;
const server = app.listen(PORT, () => {
  console.log(`[local-api] /api/search → http://127.0.0.1:${PORT} (GEMINI_API_KEY from .dev.vars)`);
});

// Vite를 자식 프로세스로 실행 (dev:local 시)
if (process.argv.includes("--with-vite")) {
  const { spawn } = await import("child_process");
  const vite = spawn("npx", ["vite", "--port", "3000", "--host", "0.0.0.0"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  vite.on("exit", (code) => {
    server.close();
    process.exit(code ?? 0);
  });
  process.on("SIGINT", () => {
    vite.kill("SIGINT");
    server.close();
  });
}
