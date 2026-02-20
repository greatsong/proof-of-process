import { describe, it, expect } from 'vitest'
import { parseChatContent, analyzeTurns, turnsToStructuredText } from '../chatParser'
import {
    chatGPTFormat,
    claudeFormat,
    geminiFormat,
    koreanFormat,
    unstructuredText,
    shortText,
    multilineTurn,
} from '../../test/fixtures/mockChatContent'

describe('parseChatContent', () => {
    it('빈 문자열 → { turns: [], parsed: false }', () => {
        const result = parseChatContent('')
        expect(result).toEqual({ turns: [], parsed: false })
    })

    it('null → { turns: [], parsed: false }', () => {
        expect(parseChatContent(null)).toEqual({ turns: [], parsed: false })
    })

    it('undefined → { turns: [], parsed: false }', () => {
        expect(parseChatContent(undefined)).toEqual({ turns: [], parsed: false })
    })

    it('ChatGPT 형식 ("You: ... ChatGPT: ...") 파싱', () => {
        const result = parseChatContent(chatGPTFormat)
        expect(result.parsed).toBe(true)
        expect(result.turns.length).toBeGreaterThanOrEqual(4)
        expect(result.turns[0].role).toBe('user')
        expect(result.turns[1].role).toBe('ai')
    })

    it('Claude 형식 ("Human: ... Assistant: ...") 파싱', () => {
        const result = parseChatContent(claudeFormat)
        expect(result.parsed).toBe(true)
        expect(result.turns.some(t => t.role === 'user')).toBe(true)
        expect(result.turns.some(t => t.role === 'ai')).toBe(true)
    })

    it('Gemini 형식 ("사용자: ... Gemini: ...") 파싱', () => {
        const result = parseChatContent(geminiFormat)
        expect(result.parsed).toBe(true)
        expect(result.turns.some(t => t.role === 'user')).toBe(true)
        expect(result.turns.some(t => t.role === 'ai')).toBe(true)
    })

    it('한국어 일반 형식 ("질문: ... 답변: ...") 파싱', () => {
        const result = parseChatContent(koreanFormat)
        expect(result.parsed).toBe(true)
        expect(result.turns.filter(t => t.role === 'user').length).toBeGreaterThanOrEqual(2)
    })

    it('역할 레이블에 전각 콜론(：) 사용 시 파싱', () => {
        const content = 'You：질문입니다\nChatGPT：답변입니다'
        const result = parseChatContent(content)
        expect(result.parsed).toBe(true)
    })

    it('멀티라인 content 올바르게 결합되는지', () => {
        const result = parseChatContent(multilineTurn)
        expect(result.parsed).toBe(true)
        // user 턴에 여러 줄 포함
        const userTurn = result.turns.find(t => t.role === 'user')
        expect(userTurn.content).toContain('이차방정식')
    })

    it('user+ai 최소 2턴 있으면 parsed: true', () => {
        const content = 'You: 질문\nChatGPT: 답변'
        const result = parseChatContent(content)
        expect(result.parsed).toBe(true)
    })

    it('user만 있고 ai 없으면 parsed: false', () => {
        const content = 'You: 질문1\nYou: 질문2'
        const result = parseChatContent(content)
        expect(result.parsed).toBe(false)
    })

    it('구조화되지 않은 텍스트는 parsed: false', () => {
        const result = parseChatContent(unstructuredText)
        expect(result.parsed).toBe(false)
    })

    it('turnIndex가 0부터 순차적으로 재정렬됨', () => {
        const result = parseChatContent(chatGPTFormat)
        result.turns.forEach((turn, index) => {
            expect(turn.turnIndex).toBe(index)
        })
    })

    it('content가 trim 처리됨', () => {
        const result = parseChatContent(chatGPTFormat)
        result.turns.forEach(turn => {
            expect(turn.content).toBe(turn.content.trim())
        })
    })

    it('영어 일반 형식 ("Me: ... AI: ...") 파싱', () => {
        const content = 'Me: What is AI?\nAI: Artificial Intelligence is...'
        const result = parseChatContent(content)
        expect(result.parsed).toBe(true)
    })

    it('첫 턴 매칭 전 20자 초과 텍스트 → user 턴 자동 추정', () => {
        const longUnmatchedLine = '이것은 스물한 글자가 넘는 아주 긴 텍스트입니다 이건 첫 줄입니다'
        const content = longUnmatchedLine + '\nChatGPT: 네 알겠습니다'
        const result = parseChatContent(content)
        expect(result.turns[0].role).toBe('user')
    })
})

describe('analyzeTurns', () => {
    it('빈 배열 → null', () => {
        expect(analyzeTurns([])).toBeNull()
    })

    it('null → null', () => {
        expect(analyzeTurns(null)).toBeNull()
    })

    it('user/ai 턴 수 정확히 카운트', () => {
        const turns = [
            { role: 'user', content: 'hello', turnIndex: 0 },
            { role: 'ai', content: 'hi', turnIndex: 1 },
            { role: 'user', content: 'bye', turnIndex: 2 },
            { role: 'ai', content: 'goodbye', turnIndex: 3 },
        ]
        const stats = analyzeTurns(turns)
        expect(stats.userTurns).toBe(2)
        expect(stats.aiTurns).toBe(2)
        expect(stats.totalTurns).toBe(4)
    })

    it('평균 사용자 질문 길이 계산 정확성', () => {
        const turns = [
            { role: 'user', content: 'ab', turnIndex: 0 },       // 2
            { role: 'ai', content: 'x', turnIndex: 1 },
            { role: 'user', content: 'abcdef', turnIndex: 2 },   // 6
        ]
        const stats = analyzeTurns(turns)
        expect(stats.avgUserLength).toBe(4) // (2 + 6) / 2 = 4
    })

    it('questionLengthGrowth: 후반부 > 전반부 → 양수', () => {
        const turns = [
            { role: 'user', content: 'ab', turnIndex: 0 },       // 2 (전반)
            { role: 'ai', content: 'x', turnIndex: 1 },
            { role: 'user', content: 'abcdefghij', turnIndex: 2 }, // 10 (후반)
            { role: 'ai', content: 'y', turnIndex: 3 },
        ]
        const stats = analyzeTurns(turns)
        expect(stats.questionLengthGrowth).toBeGreaterThan(0)
    })

    it('questionLengthGrowth: 후반부 < 전반부 → 음수', () => {
        const turns = [
            { role: 'user', content: 'abcdefghij', turnIndex: 0 }, // 10 (전반)
            { role: 'ai', content: 'x', turnIndex: 1 },
            { role: 'user', content: 'ab', turnIndex: 2 },         // 2 (후반)
            { role: 'ai', content: 'y', turnIndex: 3 },
        ]
        const stats = analyzeTurns(turns)
        expect(stats.questionLengthGrowth).toBeLessThan(0)
    })

    it('user 턴이 1개뿐일 때 growth=0', () => {
        const turns = [
            { role: 'user', content: 'hello', turnIndex: 0 },
            { role: 'ai', content: 'hi', turnIndex: 1 },
        ]
        const stats = analyzeTurns(turns)
        expect(stats.questionLengthGrowth).toBe(0)
    })
})

describe('turnsToStructuredText', () => {
    it('올바른 [학생 턴 N] / [AI 응답 N] 레이블 생성', () => {
        const turns = [
            { role: 'user', content: '질문1', turnIndex: 0 },
            { role: 'ai', content: '답변1', turnIndex: 1 },
        ]
        const text = turnsToStructuredText(turns)
        expect(text).toContain('[학생 턴 1]')
        expect(text).toContain('[AI 응답 1]')
    })

    it('턴 사이에 "---" 구분자 포함', () => {
        const turns = [
            { role: 'user', content: '질문', turnIndex: 0 },
            { role: 'ai', content: '답변', turnIndex: 1 },
        ]
        const text = turnsToStructuredText(turns)
        expect(text).toContain('---')
    })

    it('빈 배열 → 빈 문자열', () => {
        expect(turnsToStructuredText([])).toBe('')
    })
})
