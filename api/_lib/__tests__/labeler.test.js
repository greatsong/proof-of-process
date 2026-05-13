import { describe, it, expect } from 'vitest'
import { labelChatTranscript } from '../labeler.js'

describe('labelChatTranscript', () => {
    it('이미 [학생]/[AI] 라벨된 텍스트는 그대로 보존', () => {
        const input = '[학생] 안녕하세요\n[AI] 반갑습니다'
        expect(labelChatTranscript(input)).toBe(input)
    })

    it('User:/AI: 마커를 [학생]/[AI]로 정규화', () => {
        const input = 'User: 안녕\nAI: 반가워'
        const out = labelChatTranscript(input)
        expect(out).toContain('[학생] 안녕')
        expect(out).toContain('[AI] 반가워')
    })

    it('사용자:/Claude: 마커도 인식', () => {
        const input = '사용자: 질문이요\nClaude: 답변입니다'
        const out = labelChatTranscript(input)
        expect(out).toContain('[학생] 질문이요')
        expect(out).toContain('[AI] 답변입니다')
    })

    it('학생:/Assistant: 마커도 인식', () => {
        const input = '학생: 모르겠어\nAssistant: 도와드릴게요'
        const out = labelChatTranscript(input)
        expect(out).toContain('[학생] 모르겠어')
        expect(out).toContain('[AI] 도와드릴게요')
    })

    it('ChatGPT:/Gemini:/Bot: 마커 인식', () => {
        expect(labelChatTranscript('ChatGPT: hi')).toContain('[AI] hi')
        expect(labelChatTranscript('Gemini: yo')).toContain('[AI] yo')
        expect(labelChatTranscript('Bot: msg')).toContain('[AI] msg')
    })

    it('"You:" 도 학생으로 인식 (ChatGPT export 표기)', () => {
        const input = 'You: 어떻게 해?\nChatGPT: 이렇게 하시면 됩니다'
        const out = labelChatTranscript(input)
        expect(out).toContain('[학생] 어떻게 해?')
        expect(out).toContain('[AI] 이렇게 하시면 됩니다')
    })

    it('마커 없는 평문이지만 AI 특유 어조 → [AI?] 힌트', () => {
        // 정중·제안조: AI 시그니처
        const input = '작업 범위를 어디까지 진행할까요?'
        const out = labelChatTranscript(input)
        // 휴리스틱은 100% 보장 안 되므로 [AI?] 또는 [AI] 둘 다 허용
        expect(out).toMatch(/\[(AI|AI\?)\]/)
    })

    it('빈 입력 → 빈 출력', () => {
        expect(labelChatTranscript('')).toBe('')
        expect(labelChatTranscript('   \n  ')).toMatch(/^\s*$/)
    })

    it('한 줄에 마커 두 개 있어도 첫 번째 기준', () => {
        const input = 'User: User: 중복'
        const out = labelChatTranscript(input)
        expect(out).toContain('[학생]')
        // 안쪽 "User:"는 보존되든 제거되든 OK, 핵심은 라벨링이 일어났다는 것
    })

    it('여러 줄 혼합 — 각 줄 독립 라벨링', () => {
        const input = [
            'User: 첫 질문',
            'AI: 첫 답',
            '사용자: 추가 질문',
            'Claude: 답변'
        ].join('\n')
        const out = labelChatTranscript(input)
        const labeled = out.split('\n')
        expect(labeled[0]).toMatch(/^\[학생\]/)
        expect(labeled[1]).toMatch(/^\[AI\]/)
        expect(labeled[2]).toMatch(/^\[학생\]/)
        expect(labeled[3]).toMatch(/^\[AI\]/)
    })

    it('마커 없는 평범한 텍스트는 그대로 + 헤더 주석 추가', () => {
        // 화자 식별 못한 경우 명시적 경고/표시
        const input = '이것은 그냥 텍스트입니다.\n또 다른 줄.'
        const out = labelChatTranscript(input)
        // 어떻게든 원문은 보존
        expect(out).toContain('이것은 그냥 텍스트입니다.')
        expect(out).toContain('또 다른 줄.')
    })
})
