# 배포용 (Cloudflare Pages)

이 폴더만 업로드하거나, Git 연결 시 **Root directory**를 `배포용`으로 설정하세요.

## 포함된 것

- `src/` — 프론트엔드
- `functions/` — `/api/search` API (루트에 유지)
- `index.html`, `package.json`, `package-lock.json`
- `vite.config.ts`, `tsconfig.json`, `wrangler.toml`, `.gitignore`
- `scripts/` — 로컬 API 서버 (로컬 테스트용)

## 로컬 테스트

```bash
cd 배포용
npm install
# .dev.vars 에 GEMINI_API_KEY=키 저장 (이 폴더 또는 상위에)
npm run dev:local
# → http://localhost:3000
```

## Cloudflare Pages 배포

**중요:** 반드시 **빌드 결과물(dist)** 이 배포되어야 합니다. 소스 폴더를 그대로 올리면 `main.tsx` MIME 타입 오류가 납니다.

### 방법 A: Git 연결 (권장)

1. **Root directory:** `배포용`
2. **Build command:** `npm run build`
3. **Build output directory:** `dist` ← 이렇게 해야 빌드된 index.html·assets 가 배포됨
4. **Settings → Environment variables** 에서 `GEMINI_API_KEY` 설정 후 재배포

### 방법 B: 직접 업로드

직접 업로드 시에는 **Functions(`/api/search`)를 함께 쓰려면 설정이 복잡**하므로, **Git 연결(방법 A)** 를 권장합니다.  
정말로 dist만 올리는 경우: `cd 배포용` → `npm run build` 후 **`배포용/dist` 안의 내용만** 업로드하세요. (이 경우 API 검색은 동작하지 않습니다.)
