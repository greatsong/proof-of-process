import { describe, it, expect } from 'vitest'
import { buildEvaluationPrompt } from '../prompts'
import { mockRubric } from '../../test/fixtures/mockRubric'
import { chatGPTFormat, unstructuredText } from '../../test/fixtures/mockChatContent'

describe('buildEvaluationPrompt', () => {
    it('기본 루브릭으로 프롬프트 생성 → 루브릭 이름 포함', () => {
        const prompt = buildEvaluationPrompt('You: 질문\nChatGPT: 답변', mockRubric, '')
        expect(prompt).toContain(mockRubric.name)
    })

    it('각 criteria의 이름, 가중치 포함 확인', () => {
        const prompt = buildEvaluationPrompt('You: 질문\nChatGPT: 답변', mockRubric, '')
        mockRubric.criteria.forEach(c => {
            expect(prompt).toContain(c.name)
            expect(prompt).toContain(`가중치: ${c.weight}%`)
        })
    })

    it('reflection 있을 때 프롬프트에 포함', () => {
        const prompt = buildEvaluationPrompt('You: hi\nChatGPT: hello', mockRubric, '직접 논문도 읽었습니다')
        expect(prompt).toContain('직접 논문도 읽었습니다')
    })

    it('reflection 없을 때 "(없음)" 포함', () => {
        const prompt = buildEvaluationPrompt('You: hi\nChatGPT: hello', mockRubric, '')
        expect(prompt).toContain('(없음)')
    })

    it('파싱 가능한 채팅 → 구조화된 형식 + 시계열 분석 지침 포함', () => {
        const prompt = buildEvaluationPrompt(chatGPTFormat, mockRubric, '')
        expect(prompt).toContain('시계열 분석 지침')
        expect(prompt).toContain('[학생 턴')
        expect(prompt).toContain('대화 구조 분석 결과')
    })

    it('파싱 불가능한 채팅 → 노이즈 경고 포함', () => {
        const prompt = buildEvaluationPrompt(unstructuredText, mockRubric, '')
        expect(prompt).toContain('노이즈')
    })

    it('JSON 형식 지침 포함 (criteriaScores 개수 명시)', () => {
        const prompt = buildEvaluationPrompt('You: hi\nChatGPT: hello', mockRubric, '')
        expect(prompt).toContain(`${mockRubric.criteria.length}개`)
    })

    it('대화 통계(턴 수) 포함 확인', () => {
        const prompt = buildEvaluationPrompt(chatGPTFormat, mockRubric, '')
        expect(prompt).toMatch(/총\s*\*\*\d+턴\*\*/)
    })
})
