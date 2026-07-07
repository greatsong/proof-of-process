/**
 * 평가 응답 파싱 모듈
 */
import { calculateGrade } from '../constants'

/**
 * 루브릭 가중치 기반 총점 계산.
 *
 * LLM은 "각 항목 점수에 가중치를 적용해 100점 환산"하라는 지시를 받지만
 * 실측 결과 이 가중합 계산을 종종 틀린다 (예: 4개 항목이 각각 40/40/20/60%인데
 * totalScore를 62로 응답 — 정답은 41). 총점은 결정적으로 계산 가능하므로
 * AI의 산술에 의존하지 않고 코드에서 직접 구한다.
 */
function computeWeightedTotal(criteriaScores, rubric) {
    if (!rubric?.criteria?.length || criteriaScores.length === 0) return null

    let weightedSum = 0
    let totalWeight = 0
    for (const criterion of rubric.criteria) {
        const cs = criteriaScores.find(c => c.criterionId === criterion.id)
        if (!cs || !criterion.weight) continue
        weightedSum += cs.percentage * criterion.weight
        totalWeight += criterion.weight
    }

    if (totalWeight === 0) return null
    return Math.round(weightedSum / totalWeight)
}

/**
 * 평가 응답 파싱
 */
export function parseEvaluationResponse(response, rubric) {
    // JSON 추출 (마크다운 코드 블록 제거)
    let jsonStr = response

    // ```json ... ``` 형식 처리
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
        jsonStr = jsonMatch[1]
    }

    // 앞뒤 공백 제거
    jsonStr = jsonStr.trim()

    try {
        if (!jsonStr) throw new Error('Empty JSON string')
        const result = JSON.parse(jsonStr)

        const criteriaScores = (result.criteriaScores || []).map((cs) => {
            // Percentage 자동 계산 (AI가 누락할 경우 대비)
            const safeScore = cs.score || 0
            const safeMax = cs.maxScore || 5
            const calculatedPercentage = Math.round((safeScore / safeMax) * 100)

            return {
                criterionId: cs.criterionId || '',
                name: cs.name || '',
                score: safeScore,
                maxScore: safeMax,
                percentage: cs.percentage !== undefined ? cs.percentage : calculatedPercentage,
                evidence: cs.evidence || cs.feedback || '근거가 제공되지 않았습니다.',
                strengths: cs.strengths || '',
                weaknesses: cs.weaknesses || '',
                improvement: cs.improvement || '추가적인 개선 제안이 없습니다.',
                nextSteps: cs.nextSteps || '',
                feedback: cs.feedback || ''
            }
        })

        // AI가 계산한 totalScore 대신, 항목별 점수와 루브릭 가중치로 직접 재계산한다.
        // 가중치 매칭이 불가능한 경우(커스텀 루브릭 등)에만 AI 값으로 폴백.
        const weightedTotal = computeWeightedTotal(criteriaScores, rubric)
        const totalScore = weightedTotal !== null ? weightedTotal : (result.totalScore || 0)

        // 필수 필드 검증 및 기본값 설정
        return {
            totalScore,
            grade: calculateGrade(totalScore) || result.grade || 'N/A',
            criteriaScores,
            characteristics: result.characteristics || [],
            conversationFlow: result.conversationFlow || '',
            qualitativeEvaluation: result.qualitativeEvaluation || '',
            suggestions: result.suggestions || [],
            studentRecordDraft: result.studentRecordDraft || '',
            ethicsCheck: result.ethicsCheck || null
        }
    } catch (error) {
        console.error('JSON 파싱 오류:', error)

        // 파싱 실패 시 기본 응답 생성
        return {
            totalScore: 0,
            grade: 'N/A',
            criteriaScores: rubric.criteria.map(c => ({
                criterionId: c.id,
                name: c.name,
                score: 0,
                maxScore: 5,
                percentage: 0,
                feedback: '평가 결과를 파싱할 수 없습니다.'
            })),
            characteristics: ['평가 결과 파싱 오류'],
            qualitativeEvaluation: `AI 응답을 파싱하는 중 오류가 발생했습니다.\n\n원본 응답:\n${response.substring(0, 500)}...`,
            suggestions: ['다시 평가를 시도해 주세요.'],
            studentRecordDraft: ''
        }
    }
}
