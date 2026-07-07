/**
 * CriteriaDetail - 항목별 평가 (점수 바 + 상세 피드백),
 *                  정성적 평가, 개선 제안
 */

function getScoreBarWidth(score, maxScore = 5) {
    return `${(score / maxScore) * 100}%`
}

function getScoreLevel(score, maxScore) {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return { label: '우수', className: 'level-excellent' }
    if (percentage >= 70) return { label: '양호', className: 'level-good' }
    if (percentage >= 50) return { label: '보통', className: 'level-average' }
    if (percentage >= 30) return { label: '미흡', className: 'level-poor' }
    return { label: '부족', className: 'level-low' }
}

/**
 * evidence 텍스트에서 「」 인용문을 검증 상태와 함께 렌더링
 */
function renderEvidence(text, verifications) {
    if (!text) return null
    const parts = text.split(/(「[^」]*」)/)

    return parts.map((part, i) => {
        if (part.startsWith('「') && part.endsWith('」')) {
            const quote = part.slice(1, -1)
            const v = verifications?.find(v => v.quote === quote)
            const status = v?.status || 'unknown'
            const statusLabel = {
                verified: '원문 확인됨',
                similar: '유사 표현 존재',
                unverified: '원문 미확인',
                unknown: ''
            }[status]

            return (
                <mark
                    key={i}
                    className={`evidence-quote evidence-${status}`}
                    title={statusLabel}
                >
                    {part}
                    {status !== 'unknown' && (
                        <span className={`evidence-badge evidence-badge-${status}`}>
                            {status === 'verified' ? ' ✓' : status === 'similar' ? ' ~' : ' ?'}
                        </span>
                    )}
                </mark>
            )
        }
        return <span key={i}>{part}</span>
    })
}

function CriteriaDetail({ criteriaScores, qualitativeEvaluation, suggestions, selfEvalScores, verificationSummary, conversationFlow }) {
    return (
        <>
            {/* 인용 검증 요약 */}
            {verificationSummary && verificationSummary.totalQuotes > 0 && (
                <div className={`verification-summary card verification-${verificationSummary.reliability >= 70 ? 'high' : verificationSummary.reliability >= 40 ? 'mid' : 'low'}`}>
                    <div className="verification-header">
                        <span className="verification-icon">
                            {verificationSummary.reliability >= 70 ? '🔒' : verificationSummary.reliability >= 40 ? '🔓' : '⚠️'}
                        </span>
                        <span className="verification-title">
                            근거 인용 신뢰도: {verificationSummary.reliability}%
                        </span>
                    </div>
                    <div className="verification-detail">
                        총 {verificationSummary.totalQuotes}개 인용 중{' '}
                        <span className="v-verified">{verificationSummary.verified}개 확인됨</span>,{' '}
                        <span className="v-similar">{verificationSummary.similar}개 유사</span>,{' '}
                        <span className="v-unverified">{verificationSummary.unverified}개 미확인</span>
                    </div>
                </div>
            )}

            {/* 항목별 평가 */}
            <div className="criteria-scores card">
                <h3>📋 항목별 평가</h3>
                <div className="score-bars">
                    {criteriaScores.map((cs, index) => {
                        const level = getScoreLevel(cs.score, cs.maxScore)
                        return (
                        <div key={index} className="score-bar-item">
                            <div className="score-bar-header">
                                <span className="score-bar-name">{cs.name}</span>
                                <div className="score-bar-meta">
                                    <span className="score-bar-value">
                                        {cs.score} / {cs.maxScore} ({cs.percentage}%)
                                    </span>
                                    <span className={`score-level-badge ${level.className}`}>
                                        {level.label}
                                    </span>
                                </div>
                            </div>
                            <div className="score-bar-track">
                                <div
                                    className={`score-bar-fill ${level.className}`}
                                    style={{ width: getScoreBarWidth(cs.score, cs.maxScore) }}
                                />
                            </div>

                            {/* 상세 피드백 */}
                            <div className="score-detail">
                                {cs.evidence && (
                                    <div className="detail-item evidence">
                                        <span className="detail-label">📌 평가 근거</span>
                                        <p>{renderEvidence(cs.evidence, cs.evidenceVerification)}</p>
                                    </div>
                                )}
                                {cs.strengths && (
                                    <div className="detail-item strengths">
                                        <span className="detail-label">✅ 잘한 점</span>
                                        <p>{cs.strengths}</p>
                                    </div>
                                )}
                                {cs.weaknesses && (
                                    <div className="detail-item weaknesses">
                                        <span className="detail-label">⚠️ 미흡한 점</span>
                                        <p>{cs.weaknesses}</p>
                                    </div>
                                )}
                                {cs.improvement && (
                                    <div className="detail-item improvement">
                                        <span className="detail-label">💡 개선 팁</span>
                                        <p>{cs.improvement}</p>
                                    </div>
                                )}
                                {cs.nextSteps && (
                                    <div className="detail-item next-steps">
                                        <span className="detail-label">🎯 다음 단계</span>
                                        <p>{cs.nextSteps}</p>
                                    </div>
                                )}
                                {/* 이전 feedback 필드 폴백 */}
                                {!cs.evidence && cs.feedback && (
                                    <p className="score-bar-feedback">{cs.feedback}</p>
                                )}
                                {selfEvalScores && (() => {
                                    const selfScore = selfEvalScores.find(s => s.criterionId === cs.criterionId || s.name === cs.name)
                                    if (!selfScore) return null
                                    const gap = cs.score - selfScore.score
                                    return (
                                        <div className="self-eval-comparison">
                                            <div className="comparison-row">
                                                <span className="comparison-label">자기 평가</span>
                                                <div className="comparison-bar">
                                                    <div className="comparison-bar-fill self" style={{ width: `${(selfScore.score / selfScore.maxScore) * 100}%` }} />
                                                </div>
                                                <span>{selfScore.score}/{selfScore.maxScore}</span>
                                            </div>
                                            <div className="comparison-row">
                                                <span className="comparison-label">AI 평가</span>
                                                <div className="comparison-bar">
                                                    <div className="comparison-bar-fill ai" style={{ width: `${(cs.score / cs.maxScore) * 100}%` }} />
                                                </div>
                                                <span>{cs.score}/{cs.maxScore}</span>
                                            </div>
                                            {gap !== 0 && (
                                                <p className="comparison-gap">
                                                    {gap > 0 ? `AI가 ${gap}점 더 높게 평가했어요` : `자기 평가가 ${Math.abs(gap)}점 더 높았어요 — 어떤 부분이 다른지 살펴보세요`}
                                                </p>
                                            )}
                                            {selfScore.reason && (
                                                <p className="comparison-gap">자기 평가 이유: {selfScore.reason}</p>
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            {/* 대화 흐름 분석 */}
            {conversationFlow && (
                <div className="conversation-flow card">
                    <h3>🔄 대화 흐름 분석</h3>
                    <div className="flow-content">
                        {conversationFlow}
                    </div>
                </div>
            )}

            {/* 정성적 평가 */}
            <div className="qualitative card">
                <h3>📝 정성적 평가</h3>
                <div className="qualitative-content">
                    {qualitativeEvaluation}
                </div>
            </div>

            {/* 개선 제안 */}
            <div className="suggestions card">
                <h3>💡 개선 제안</h3>
                <ul className="suggestion-list">
                    {suggestions.map((sugg, index) => (
                        <li key={index}>{sugg}</li>
                    ))}
                </ul>
            </div>

        </>
    )
}

export default CriteriaDetail
