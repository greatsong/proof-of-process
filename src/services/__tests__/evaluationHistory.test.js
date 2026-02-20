import { describe, it, expect, beforeEach } from 'vitest'
import { saveEvaluationToHistory, getEvaluationHistory, clearEvaluationHistory } from '../evaluationHistory'

describe('evaluationHistory', () => {
    const mockResult = {
        totalScore: 85,
        grade: 'B+',
        criteriaScores: [
            { name: '질문의 명확성', score: 4, maxScore: 5, percentage: 80 },
            { name: '반복적 개선', score: 3, maxScore: 5, percentage: 60 },
        ],
    }

    it('saveEvaluationToHistory — 새 항목이 배열 맨 앞에 추가됨', () => {
        saveEvaluationToHistory({ ...mockResult, totalScore: 70 }, '루브릭A')
        saveEvaluationToHistory({ ...mockResult, totalScore: 85 }, '루브릭B')

        const history = getEvaluationHistory()
        expect(history[0].totalScore).toBe(85)
        expect(history[1].totalScore).toBe(70)
    })

    it('entry에 id, date, rubricName, totalScore, grade 포함', () => {
        const entry = saveEvaluationToHistory(mockResult, '테스트 루브릭')
        expect(entry).toHaveProperty('id')
        expect(entry).toHaveProperty('date')
        expect(entry.rubricName).toBe('테스트 루브릭')
        expect(entry.totalScore).toBe(85)
        expect(entry.grade).toBe('B+')
    })

    it('50개 초과 시 오래된 항목 자동 삭제', () => {
        for (let i = 0; i < 55; i++) {
            saveEvaluationToHistory({ ...mockResult, totalScore: i }, `루브릭${i}`)
        }
        const history = getEvaluationHistory()
        expect(history.length).toBeLessThanOrEqual(50)
    })

    it('getEvaluationHistory — 비어있으면 빈 배열', () => {
        const history = getEvaluationHistory()
        expect(history).toEqual([])
    })

    it('clearEvaluationHistory — 히스토리 완전 초기화', () => {
        saveEvaluationToHistory(mockResult, '루브릭')
        expect(getEvaluationHistory().length).toBeGreaterThan(0)

        clearEvaluationHistory()
        expect(getEvaluationHistory()).toEqual([])
    })

    it('criteriaScores 필드 매핑 (name, score, maxScore, percentage)', () => {
        const entry = saveEvaluationToHistory(mockResult, '루브릭')
        expect(entry.criteriaScores[0]).toEqual({
            name: '질문의 명확성',
            score: 4,
            maxScore: 5,
            percentage: 80,
        })
    })

    it('연속 저장 후 순서 보장 (newest first)', () => {
        saveEvaluationToHistory({ ...mockResult, totalScore: 60 }, 'A')
        saveEvaluationToHistory({ ...mockResult, totalScore: 70 }, 'B')
        saveEvaluationToHistory({ ...mockResult, totalScore: 80 }, 'C')

        const history = getEvaluationHistory()
        expect(history[0].totalScore).toBe(80)
        expect(history[1].totalScore).toBe(70)
        expect(history[2].totalScore).toBe(60)
    })
})
