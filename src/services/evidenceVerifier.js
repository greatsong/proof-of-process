/**
 * 인용 검증 모듈
 *
 * AI가 생성한 「」 인용문이 원본 채팅 텍스트에 실제로 존재하는지
 * 클라이언트 사이드에서 검증한다.
 *
 * 검증 수준:
 *  - verified:   원문에서 정확히 또는 거의 일치하는 텍스트를 찾음
 *  - similar:    유사한 표현이 존재함 (편집 거리 기반)
 *  - unverified: 원문에서 대응하는 텍스트를 찾지 못함 (할루시네이션 가능성)
 */

/**
 * evidence 텍스트에서 「」 인용문을 모두 추출
 */
export function extractQuotes(evidenceText) {
    if (!evidenceText) return []
    const regex = /「([^」]+)」/g
    const quotes = []
    let match
    while ((match = regex.exec(evidenceText)) !== null) {
        quotes.push(match[1])
    }
    return quotes
}

/**
 * 공백/줄바꿈을 정규화하여 비교 정확도를 높인다
 */
function normalize(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/[.,!?;:'""\-–—…·]/g, '')
        .trim()
        .toLowerCase()
}

/**
 * 두 문자열의 유사도를 계산 (0~1)
 * 짧은 인용문에 최적화된 부분 문자열 매칭
 */
function similarity(quote, source) {
    const nq = normalize(quote)
    const ns = normalize(source)

    if (!nq || !ns) return 0

    // 정확히 포함되면 1.0
    if (ns.includes(nq)) return 1.0

    // 인용문을 단어 단위로 쪼개어 연속 매칭 비율 계산
    const words = nq.split(' ').filter(w => w.length > 1)
    if (words.length === 0) return 0

    let maxConsecutive = 0
    let current = 0

    for (const word of words) {
        if (ns.includes(word)) {
            current++
            maxConsecutive = Math.max(maxConsecutive, current)
        } else {
            current = 0
        }
    }

    // 전체 단어 중 원문에 존재하는 비율
    const wordHits = words.filter(w => ns.includes(w)).length
    const hitRatio = wordHits / words.length

    // 연속 매칭 비율과 전체 매칭 비율을 결합
    const consecutiveRatio = maxConsecutive / words.length

    return consecutiveRatio * 0.6 + hitRatio * 0.4
}

/**
 * 인용문 하나를 원본 채팅에서 검증
 */
function verifyOneQuote(quote, chatContent) {
    const sim = similarity(quote, chatContent)

    if (sim >= 0.85) {
        return { quote, status: 'verified', similarity: sim }
    }
    if (sim >= 0.5) {
        return { quote, status: 'similar', similarity: sim }
    }
    return { quote, status: 'unverified', similarity: sim }
}

/**
 * 평가 결과 전체의 인용을 검증
 *
 * @param {object} evaluationResult - parseEvaluationResponse의 결과
 * @param {string} chatContent - 학생이 입력한 원본 채팅 텍스트
 * @returns {object} 검증 결과가 추가된 evaluationResult
 */
export function verifyEvidence(evaluationResult, chatContent) {
    if (!evaluationResult?.criteriaScores || !chatContent) {
        return evaluationResult
    }

    let totalQuotes = 0
    let verifiedCount = 0
    let similarCount = 0
    let unverifiedCount = 0

    const verifiedCriteriaScores = evaluationResult.criteriaScores.map(cs => {
        const quotes = extractQuotes(cs.evidence)
        const verifications = quotes.map(q => verifyOneQuote(q, chatContent))

        totalQuotes += verifications.length
        verifiedCount += verifications.filter(v => v.status === 'verified').length
        similarCount += verifications.filter(v => v.status === 'similar').length
        unverifiedCount += verifications.filter(v => v.status === 'unverified').length

        return {
            ...cs,
            evidenceVerification: verifications
        }
    })

    return {
        ...evaluationResult,
        criteriaScores: verifiedCriteriaScores,
        verificationSummary: {
            totalQuotes,
            verified: verifiedCount,
            similar: similarCount,
            unverified: unverifiedCount,
            reliability: totalQuotes > 0
                ? Math.round(((verifiedCount + similarCount * 0.5) / totalQuotes) * 100)
                : null
        }
    }
}
