/**
 * 채팅 구조 파싱 모듈
 *
 * 비정형 텍스트를 사용자/AI 턴으로 분리하여
 * 대화 흐름 분석의 기반을 제공한다.
 *
 * 지원 형식:
 *  - ChatGPT 복사 형식 (You / ChatGPT)
 *  - Claude 복사 형식 (Human / Assistant)
 *  - Gemini 복사 형식
 *  - 일반 "사용자:" / "AI:" 패턴
 *  - 줄 기반 대화 (빈 줄로 턴 구분)
 */

/**
 * 역할 매칭 패턴
 * 각 패턴은 [regex, role] 쌍으로 구성
 */
const ROLE_PATTERNS = [
    // ChatGPT
    [/^(?:You|나|사용자|User)\s*[:：]\s*/i, 'user'],
    [/^(?:ChatGPT|GPT|GPT-4|GPT-4o)\s*[:：]\s*/i, 'ai'],
    // Claude
    [/^(?:Human|H)\s*[:：]\s*/i, 'user'],
    [/^(?:Assistant|Claude|A)\s*[:：]\s*/i, 'ai'],
    // Gemini
    [/^(?:Gemini|Bard|Google AI)\s*[:：]\s*/i, 'ai'],
    // 한국어 일반
    [/^(?:질문|나의?\s*질문|내\s*질문)\s*[:：]\s*/i, 'user'],
    [/^(?:답변|AI\s*답변|응답)\s*[:：]\s*/i, 'ai'],
    // 영어 일반
    [/^(?:Me|My question|Prompt)\s*[:：]\s*/i, 'user'],
    [/^(?:AI|Response|Answer|Bot)\s*[:：]\s*/i, 'ai'],
]

/**
 * 텍스트 한 줄이 새로운 턴의 시작인지 판별
 * @returns {{ role: 'user'|'ai', content: string } | null}
 */
function detectTurnStart(line) {
    const trimmed = line.trim()
    if (!trimmed) return null

    for (const [pattern, role] of ROLE_PATTERNS) {
        const match = trimmed.match(pattern)
        if (match) {
            return {
                role,
                content: trimmed.slice(match[0].length).trim()
            }
        }
    }
    return null
}

/**
 * 비정형 채팅 텍스트를 턴 배열로 파싱
 *
 * @param {string} rawText - 원본 채팅 텍스트
 * @returns {{ turns: Array<{ role: string, content: string, turnIndex: number }>, parsed: boolean }}
 */
export function parseChatContent(rawText) {
    if (!rawText || !rawText.trim()) {
        return { turns: [], parsed: false }
    }

    const lines = rawText.split('\n')
    const turns = []
    let currentTurn = null

    for (const line of lines) {
        const turnStart = detectTurnStart(line)

        if (turnStart) {
            // 이전 턴 저장
            if (currentTurn && currentTurn.content.trim()) {
                turns.push(currentTurn)
            }
            currentTurn = {
                role: turnStart.role,
                content: turnStart.content,
                turnIndex: turns.length
            }
        } else if (currentTurn) {
            // 현재 턴에 내용 추가
            currentTurn.content += '\n' + line
        } else {
            // 아직 첫 턴 매칭 전 — 노이즈(사이드바 등)로 간주하고 스킵
            // 단, 충분히 긴 텍스트면 첫 user 턴으로 간주
            if (line.trim().length > 20 && turns.length === 0) {
                currentTurn = {
                    role: 'user',
                    content: line.trim(),
                    turnIndex: 0
                }
            }
        }
    }

    // 마지막 턴 저장
    if (currentTurn && currentTurn.content.trim()) {
        turns.push(currentTurn)
    }

    // 턴 인덱스 재정렬 및 내용 정리
    const cleanedTurns = turns.map((t, i) => ({
        ...t,
        turnIndex: i,
        content: t.content.trim()
    }))

    // 최소 2개 턴(user+ai)이 있어야 유효한 파싱
    const parsed = cleanedTurns.length >= 2
        && cleanedTurns.some(t => t.role === 'user')
        && cleanedTurns.some(t => t.role === 'ai')

    return { turns: cleanedTurns, parsed }
}

/**
 * 파싱된 턴 배열에서 대화 통계를 계산
 */
export function analyzeTurns(turns) {
    if (!turns || turns.length === 0) {
        return null
    }

    const userTurns = turns.filter(t => t.role === 'user')
    const aiTurns = turns.filter(t => t.role === 'ai')

    // 사용자 질문 평균 길이 (글자 수)
    const avgUserLength = userTurns.length > 0
        ? Math.round(userTurns.reduce((sum, t) => sum + t.content.length, 0) / userTurns.length)
        : 0

    // 후반부 사용자 질문 길이 (성장 지표)
    const halfIdx = Math.floor(userTurns.length / 2)
    const firstHalfAvg = halfIdx > 0
        ? Math.round(userTurns.slice(0, halfIdx).reduce((s, t) => s + t.content.length, 0) / halfIdx)
        : avgUserLength
    const secondHalfAvg = halfIdx > 0
        ? Math.round(userTurns.slice(halfIdx).reduce((s, t) => s + t.content.length, 0) / (userTurns.length - halfIdx))
        : avgUserLength

    const questionLengthGrowth = firstHalfAvg > 0
        ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
        : 0

    return {
        totalTurns: turns.length,
        userTurns: userTurns.length,
        aiTurns: aiTurns.length,
        avgUserLength,
        questionLengthGrowth,
        firstHalfAvg,
        secondHalfAvg
    }
}

/**
 * 파싱된 턴을 프롬프트용 구조화 텍스트로 변환
 */
export function turnsToStructuredText(turns) {
    return turns.map((t, i) => {
        const label = t.role === 'user' ? `[학생 턴 ${Math.ceil((i + 1) / 2)}]` : `[AI 응답 ${Math.ceil((i + 1) / 2)}]`
        return `${label}\n${t.content}`
    }).join('\n\n---\n\n')
}
