/**
 * 채팅 앱(ai-chat-for-students) 공유 링크로부터 대화를 불러오는 모듈
 *
 * 흐름: 채팅 앱이 발급한 일회용 토큰으로 공유 API 를 호출 →
 *       구조화된 턴 배열을 받아 chatParser 가 100% 인식하는
 *       '사용자:/AI:' 정규 텍스트로 변환한다.
 *
 * 학교망 SNI 차단 회피: 채팅 앱의 Railway 백엔드를 직접 호출하지 않고
 * Vercel 도메인(danggok-ai.vercel.app/api/share)을 호출한다. Vercel 이
 * 서버-서버로 Railway 에 프록시하므로 학생 브라우저는 차단 도메인에 닿지 않는다.
 */

// 채팅 앱 공유 엔드포인트 베이스. 임의 URL 을 받지 않고 env(없으면 프로덕션 기본값)로 고정 — SSRF/피싱 차단.
const CHAT_API_BASE =
  import.meta.env.VITE_CHAT_API_URL || 'https://danggok-ai.vercel.app/api/share';

/**
 * 턴 본문에서 이어지는 줄이 역할 라벨(사용자:/AI: 등)로 오인되지 않게 무력화한다.
 *
 * 서버는 신뢰된 role 을 가진 구조화 턴을 보내지만, 이를 평탄화한 텍스트를
 * chatParser 가 줄 단위로 재파싱하면서 본문 안의 "AI:"/"사용자:" 로 시작하는 줄을
 * 새 턴 경계로 오인할 수 있다. 이를 악용하면 학생이 자기 메시지 안에 가짜 AI 턴을
 * 심어 평가를 조작할 수 있다. 이어지는 각 줄 앞에 제로폭 공백(U+200B)을 붙이면
 * 줄 시작(^)이 라벨 정규식과 일치하지 않아 위조가 차단된다. (사람 눈엔 보이지 않음)
 */
const ZWSP = '​'; // 제로폭 공백 — 사람 눈엔 보이지 않지만 줄 시작이 라벨 정규식과 일치하지 않게 함

function neutralizeBody(content) {
  const text = (content || '').trim();
  if (!text.includes('\n')) return text;
  const lines = text.split('\n');
  return [lines[0], ...lines.slice(1).map((line) => ZWSP + line)].join('\n');
}

/**
 * 공유 턴 배열 → chatParser 가 인식하는 정규 텍스트
 * user → "사용자:", ai → "AI:" (한 턴당 한 블록, 빈 줄로 구분)
 * 서버가 정한 role 경계가 본문 내용으로 위조되지 않도록 이어지는 줄을 무력화한다.
 * @param {Array<{role:'user'|'ai', content:string}>} turns
 * @returns {string}
 */
export function turnsToCanonicalText(turns) {
  if (!Array.isArray(turns)) return '';
  return turns
    .filter((t) => t && (t.role === 'user' || t.role === 'ai'))
    .map((t) => `${t.role === 'user' ? '사용자' : 'AI'}: ${neutralizeBody(t.content)}`)
    .join('\n\n');
}

/**
 * 토큰으로 공유된 대화를 가져온다.
 * 토큰은 URL 경로가 아니라 POST 본문으로 전송한다 — 경로 기반 접근 로그(Vercel/Railway)에
 * 원문 토큰이 남지 않도록. 또한 redeem 은 토큰을 소비(상태 변경)하므로 POST 가 의미상 맞다.
 * @param {string} token - 64자리 hex 일회용 토큰
 * @returns {Promise<{ text: string, conversation: object }>}
 * @throws {Error} 네트워크 실패 또는 유효하지 않은/만료된 토큰
 */
export async function fetchSharedChat(token) {
  if (!token) throw new Error('공유 토큰이 없습니다.');

  const res = await fetch(`${CHAT_API_BASE}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '공유된 대화를 불러오지 못했습니다.');
  }

  const data = await res.json();
  return {
    text: turnsToCanonicalText(data.turns),
    conversation: data.conversation || {},
  };
}
