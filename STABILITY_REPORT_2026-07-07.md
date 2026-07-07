# Proof of Process — 시스템 안정성 점검 보고서

- **점검일**: 2026-07-07
- **대상**: proof-of-process (AI 채팅 평가 시스템, React + Vercel Edge Functions)
- **점검 항목**: 프로덕션 빌드, 테스트 스위트, 린트, 의존성 취약점, API 보안, 설정 파일

---

## 1. 종합 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 프로덕션 빌드 | ✅ 성공 | 번들 1.5MB — 코드 스플리팅 권장 |
| 테스트 (632개) | ⚠️ 10개 실패 | 실제 실패는 4개, 나머지는 worktree 잔재 중복 |
| ESLint | ❌ 763 에러 | 대부분 설정 문제(vitest/node globals 누락), 실코드 이슈는 소수 |
| 의존성 취약점 | ❌ 16건 (critical 2, high 8) | 전부 dev 의존성(vite/vitest), `npm audit fix`로 해결 가능 |
| API 보안 | ⚠️ 개선 필요 | `/api/evaluate` 무인증 — 서버 API 키 무제한 사용 가능 |

빌드와 핵심 기능은 정상 동작하나, **테스트/린트 인프라가 리팩터링을 따라오지 못했고**, **서버 API 키가 인증 없이 노출되는 구조적 위험**이 있습니다.

---

## 2. 상세 발견 사항

### 🔴 높음 — 즉시 조치 권장

#### 2-1. `/api/evaluate` 무인증 개방 (서버 API 키 도용 위험)
- `api/evaluate.js:84` — 클라이언트가 키를 안 보내면 `SERVER_KEYS`(Vercel 환경변수의 Gemini/Claude/OpenAI 키)로 폴백.
- PIN 잠금(`api/config.js`의 `unlock`)은 **UI 표시용일 뿐**, `/api/evaluate` 호출 자체를 막지 않음. URL만 알면 누구나 `POST /api/evaluate`로 서버 키의 API 비용을 소진시킬 수 있음.
- Rate limit 없음 → 악의적 반복 호출 시 비용 폭탄 가능.
- **권장**: PIN 검증 후 서명된 토큰(또는 HMAC)을 발급하고 `/api/evaluate`에서 검증. 최소한 Vercel KV 기반 IP별 rate limit 추가.

#### 2-2. 의존성 취약점 16건
- `vitest 4.0.x` — **critical**: UI 서버 활성 시 임의 파일 읽기/실행 (GHSA-5xrq-8626-4rwp)
- `vite 7.0~7.3.3` — **high**: path traversal, `server.fs.deny` 우회, dev 서버 임의 파일 읽기
- 모두 개발 서버 한정이지만, 학교/공용 네트워크에서 `npm run dev` 실행 시 실제 위험.
- **권장**: `npm audit fix` 실행 (semver 범위 내 수정 가능 확인됨).

### 🟡 중간 — 안정성 저해

#### 2-3. 리팩터링 이후 갱신 안 된 테스트 4건 (실질 실패 전부)
- `src/services/__tests__/providers.test.js` (2건): 커밋 `ac72e59`에서 Claude 호출이 직접 API → 서버 프록시(`/api/evaluate`, 응답 `data.text`)로 바뀌었으나 테스트는 옛 계약(`content[0].text`) 기준.
- `src/services/__tests__/liveEvaluation.test.js` (2건): **실제 Claude API를 호출**하는 테스트가 기본 `test:run`에 포함되어 있고, 다른 프로젝트의 절대경로(`/Users/greatsong/greatsong-project/eduflow/.env`)에서 API 키를 읽음. 키가 없거나 경로가 바뀌면 항상 실패하고, 있으면 테스트마다 API 비용 발생.
- **권장**: providers 테스트를 프록시 계약으로 재작성, liveEvaluation은 `describe.skipIf(!process.env.LIVE_TEST)` 등으로 opt-in 처리.

#### 2-4. `.claude/worktrees/` 잔재가 테스트·린트를 오염
- 잔재 worktree 2개(`angry-elgamal-1d4f9d`, `elated-almeida-98ffda`)가 남아 있어 vitest가 동일 테스트를 3벌 실행(632개 중 약 2/3가 중복), 린트 에러 763건 중 44건이 여기서 발생.
- **권장**: `git worktree prune` 후 디렉터리 삭제 + `vite.config.js` test에 `exclude: ['**/.claude/**', '**/node_modules/**']` 추가.

#### 2-5. 에러 메시지 손실 가능성
- `src/services/providers/claude.js:19` — 서버가 `{ error: {...객체} }`를 반환하면 사용자에게 `[object Object]` 표시 (테스트 실패로 실증됨).
- `api/config.js:22` — KV 조회 실패 시 **status 200**으로 `{error}` 반환 → 클라이언트가 에러를 정상 설정으로 오인할 수 있음.

#### 2-6. Anthropic API 버전 문자열 확인 필요
- `api/evaluate.js:154` — `anthropic-version: '2024-06-01'`. 표준 안정 버전은 `2023-06-01`이며, 유효하지 않은 버전은 400 에러가 날 수 있음. 프로덕션에서 Claude 단일 호출이 실제 성공하는지 확인 필요 (앙상블 모드에선 실패해도 다른 모델이 가려줌).

### 🟢 낮음 — 품질 개선

- **ESLint 설정 누락**: 테스트 파일에서 `vi`/`describe` 등 no-undef 700여 건 → `eslint.config.js`에 vitest globals 추가, `api/`·`scripts/`에 node globals 추가하면 대부분 해소. 실질 이슈는 미사용 변수 6건, `useEffect` 내 동기 setState 2건(AuthContext, EvaluationContext — 캐스케이딩 렌더 위험) 정도.
- **번들 크기**: 단일 청크 1.5MB(gzip 450KB). jspdf/html2pdf/chart.js를 dynamic import로 분리하면 초기 로딩 크게 개선.
- **API 키 localStorage 저장**: 학생이 개인 키 입력 시 브라우저에 평문 저장 — 학교 공용 PC 환경에서 세션 종료 시 삭제 옵션 고려.

---

## 3. 권장 조치 우선순위

| 순위 | 조치 | 예상 규모 |
|------|------|----------|
| 1 | `npm audit fix` (vite/vitest 패치) | 5분 |
| 2 | worktree 잔재 정리 + vitest/eslint exclude 설정 | 10분 |
| 3 | providers.test.js 프록시 계약으로 재작성, liveEvaluation opt-in 전환 | 30분 |
| 4 | `/api/evaluate` 인증(PIN 토큰) + rate limit | 반나절 |
| 5 | ESLint 설정 정비 (vitest/node globals) | 15분 |
| 6 | anthropic-version 검증, 에러 메시지 직렬화 수정 | 15분 |
| 7 | 코드 스플리팅 (PDF/차트 라이브러리 lazy load) | 1시간 |

1~3번만 처리해도 테스트 632개 전체 그린 + 린트 에러 대부분 해소가 가능합니다.
