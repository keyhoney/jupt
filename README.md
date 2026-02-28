# 배포용 (Cloudflare Pages)

Git 저장소는 **이 폴더(배포용)** 를 루트로 초기화되어 있습니다. 이 폴더를 GitHub에 푸시한 뒤 Cloudflare Pages에서 해당 저장소를 연결하면 됩니다.

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

## GitHub에 올리기

1. GitHub에서 **새 저장소** 생성 (이름 예: `gemini-search-engine`) — README 추가 없이 빈 저장소로 생성.
2. 터미널에서 이 폴더(`배포용`)로 이동한 뒤:
   ```bash
   cd C:\dev\chatbot\gemini-search-engine\배포용
   git remote add origin https://github.com/내계정/저장소이름.git
   git push -u origin main
   ```
3. GitHub에 코드가 올라가면, Cloudflare Pages에서 이 저장소를 연결합니다.

## Cloudflare Pages 배포

**중요:** 반드시 **빌드 결과물(dist)** 이 배포되어야 합니다. 소스 폴더를 그대로 올리면 `main.tsx` MIME 타입 오류가 납니다.

### Git 연결 (권장)

1. **Root directory:** 비워 두기 (이 저장소 루트가 곧 배포용 폴더임)
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`
4. **Settings → Environment variables** 에서 `GEMINI_API_KEY` 설정 후 재배포

### 방법 B: 직접 업로드

직접 업로드 시에는 **Functions(`/api/search`)를 함께 쓰려면 설정이 복잡**하므로, **Git 연결(방법 A)** 를 권장합니다.  
정말로 dist만 올리는 경우: `cd 배포용` → `npm run build` 후 **`배포용/dist` 안의 내용만** 업로드하세요. (이 경우 API 검색은 동작하지 않습니다.)
