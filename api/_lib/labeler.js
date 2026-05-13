/**
 * 채팅 로그 화자 정규화.
 * 흔한 export 포맷의 화자 마커를 [학생]/[AI]로 통일하여
 * 평가 LLM이 화자를 추측하지 않도록 한다.
 *
 * 100% 정확하진 않지만, AI 발화가 학생으로 오인되는 흔한 오류를 크게 줄인다.
 */

// 마커 → 캐노니컬 라벨
const STUDENT_MARKERS = [
    /^\s*(?:user|사용자|학생|student|you|나|me|q)\s*[:：>]/i,
    /^\s*\[\s*(?:user|사용자|학생|student|you)\s*\]/i,
    /^\s*>\s+/,
]
const AI_MARKERS = [
    /^\s*(?:ai|assistant|claude|chatgpt|gpt|gemini|bot|모델|답변|봇|tinkervis|팅커비스)\s*[:：>]/i,
    /^\s*\[\s*(?:ai|assistant|claude|chatgpt|gemini|bot|모델)\s*\]/i,
]
const PRELABELED_STUDENT = /^\s*\[\s*학생\s*\]/i
const PRELABELED_AI = /^\s*\[\s*ai\??\s*\]/i

// AI 시그니처 어조 (정중·제안조 + 도움말 패턴)
const AI_TONE_HINTS = [
    /(?:할까요|드릴게요|드립니다|드릴까요|하시면 됩니다|제안드립니다|도와드리겠|어떠세요|어떠신가요)[?!.\s]*$/,
    /(?:다음과 같이|아래와 같이|먼저,|우선,)/,
]

function stripLeadingMarker(line) {
    return line
        .replace(/^\s*(?:user|사용자|학생|student|you|나|me|q|ai|assistant|claude|chatgpt|gpt|gemini|bot|모델|답변|봇|tinkervis|팅커비스)\s*[:：>]\s*/i, '')
        .replace(/^\s*\[\s*(?:user|사용자|학생|student|you|ai|assistant|claude|chatgpt|gemini|bot|모델)\s*\]\s*[:：]?\s*/i, '')
        .replace(/^\s*>\s+/, '')
}

function classifyLine(line) {
    if (PRELABELED_STUDENT.test(line)) return 'student-pre'
    if (PRELABELED_AI.test(line)) return 'ai-pre'

    for (const re of STUDENT_MARKERS) if (re.test(line)) return 'student'
    for (const re of AI_MARKERS) if (re.test(line)) return 'ai'

    for (const re of AI_TONE_HINTS) if (re.test(line)) return 'ai-guess'

    return 'unknown'
}

/**
 * @param {string} text
 * @returns {string} 라벨 정규화된 텍스트
 */
export function labelChatTranscript(text) {
    if (typeof text !== 'string' || text.trim() === '') return text ?? ''

    const lines = text.split(/\r?\n/)
    let lastLabel = null  // 마지막 명시 라벨 — 미라벨 줄 라벨 추론에 쓰임
    const out = []

    for (const raw of lines) {
        const trimmed = raw.trim()
        if (trimmed === '') {
            out.push(raw)
            continue
        }

        const kind = classifyLine(raw)
        let label
        let body

        switch (kind) {
            case 'student-pre':
            case 'ai-pre':
                // 이미 우리 형식으로 라벨된 줄 — 그대로 두기
                out.push(raw)
                lastLabel = kind === 'student-pre' ? '[학생]' : '[AI]'
                continue
            case 'student':
                label = '[학생]'
                body = stripLeadingMarker(raw)
                lastLabel = label
                break
            case 'ai':
                label = '[AI]'
                body = stripLeadingMarker(raw)
                lastLabel = label
                break
            case 'ai-guess':
                label = '[AI?]'
                body = raw.trim()
                // lastLabel은 갱신하지 않음 (확신 없음)
                break
            case 'unknown':
            default:
                // 직전 라벨이 있으면 그 화자의 연속 줄로 본다 (인용/멀티라인 처리)
                if (lastLabel) {
                    out.push(`${lastLabel} ${raw.trim()}`)
                } else {
                    out.push(`[?] ${raw.trim()}`)
                }
                continue
        }

        out.push(`${label} ${body}`.trim())
    }

    return out.join('\n')
}
