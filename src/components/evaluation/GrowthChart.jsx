import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import '../EvaluationResult.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const CRITERIA_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
]

function getTrendMessage(scores) {
    if (!scores || scores.length < 2) return null

    const latest = scores[scores.length - 1]
    const previous = scores[scores.length - 2]
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const maxScore = Math.max(...scores)

    if (scores.length === 2) {
        if (latest > previous) return { icon: '📈', message: '다시 상승세예요! 이 흐름을 유지해보세요.', type: 'positive' }
        if (latest < previous) return { icon: '🌱', message: '점수가 내려갔지만 괜찮아요. 피드백을 확인하고 다시 도전해보세요!', type: 'neutral' }
        return { icon: '🎯', message: '안정적인 수준을 유지하고 있어요. 한 단계 도약을 시도해볼까요?', type: 'neutral' }
    }

    const last3 = scores.slice(-3)
    const isConsistentlyImproving = last3.every((s, i) => i === 0 || s >= last3[i - 1])
    const isFlat = last3.every((s, i) => i === 0 || Math.abs(s - last3[i - 1]) <= 2)

    if (isConsistentlyImproving && !isFlat) {
        return { icon: '🚀', message: '꾸준히 성장하고 있어요! 지금처럼 계속해보세요.', type: 'positive' }
    }
    if (latest === maxScore) {
        return { icon: '🏆', message: '최고 점수를 달성했어요! 대단한 발전입니다.', type: 'positive' }
    }
    if (latest > previous && !isConsistentlyImproving) {
        return { icon: '📈', message: '다시 상승세예요! 이 흐름을 유지해보세요.', type: 'positive' }
    }
    if (isFlat) {
        return { icon: '🎯', message: '안정적인 수준을 유지하고 있어요. 한 단계 도약을 시도해볼까요?', type: 'neutral' }
    }
    if (latest < previous && latest >= avg) {
        return { icon: '💪', message: '조금 주춤했지만 평균 이상이에요. 힘내세요!', type: 'neutral' }
    }
    if (latest < previous) {
        return { icon: '🌱', message: '점수가 내려갔지만 괜찮아요. 피드백을 확인하고 다시 도전해보세요!', type: 'neutral' }
    }
    return null
}

/**
 * 항목별 성장 인사이트 생성
 */
function getCriteriaGrowthInsight(chronological) {
    if (chronological.length < 2) return null

    const first = chronological[0]
    const last = chronological[chronological.length - 1]

    if (!first.criteriaScores || !last.criteriaScores) return null

    // 가장 많이 성장한 항목과 가장 정체된 항목 찾기
    let bestGrowth = { name: '', delta: -Infinity }
    let worstGrowth = { name: '', delta: Infinity }

    last.criteriaScores.forEach(lastCs => {
        const firstCs = first.criteriaScores.find(c => c.name === lastCs.name)
        if (!firstCs) return
        const delta = (lastCs.score / lastCs.maxScore) - (firstCs.score / firstCs.maxScore)
        if (delta > bestGrowth.delta) bestGrowth = { name: lastCs.name, delta }
        if (delta < worstGrowth.delta) worstGrowth = { name: lastCs.name, delta }
    })

    if (bestGrowth.delta === -Infinity) return null

    const parts = []
    if (bestGrowth.delta > 0) {
        parts.push(`'${bestGrowth.name}' 역량이 가장 크게 성장했어요 (+${Math.round(bestGrowth.delta * 100)}%p)`)
    }
    if (worstGrowth.delta < 0) {
        parts.push(`'${worstGrowth.name}'은 다시 집중해보면 좋겠어요`)
    } else if (worstGrowth.delta === 0 && bestGrowth.delta > 0) {
        parts.push(`'${worstGrowth.name}'도 함께 키워보세요`)
    }

    return parts.length > 0 ? parts.join('. ') + '.' : null
}

function GrowthChart({ history, onClear }) {
    const [viewMode, setViewMode] = useState('total') // 'total' | 'criteria'

    if (!history || history.length === 0) {
        return (
            <div className="growth-chart card">
                <h3>📈 성장 추적</h3>
                <p className="empty-state-text">아직 평가 기록이 없습니다. 평가를 완료하면 여기에 성장 그래프가 표시됩니다.</p>
            </div>
        )
    }

    const chronological = [...history].reverse()

    const labels = chronological.map(h => {
        const d = new Date(h.date)
        return `${d.getMonth() + 1}/${d.getDate()}`
    })

    const scores = chronological.map(h => h.totalScore)

    // Stats
    const maxScore = Math.max(...scores)
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const lastChange = scores.length >= 2
        ? scores[scores.length - 1] - scores[scores.length - 2]
        : 0

    const trendMessage = getTrendMessage(scores)

    // 항목별 데이터 추출
    const hasCriteriaData = chronological.some(h => h.criteriaScores && h.criteriaScores.length > 0)

    const criteriaNames = hasCriteriaData
        ? [...new Set(chronological.flatMap(h => (h.criteriaScores || []).map(c => c.name)))]
        : []

    // 종합 점수 차트 데이터
    const totalData = {
        labels,
        datasets: [{
            label: '종합 점수',
            data: scores,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#6366f1'
        }]
    }

    // 항목별 차트 데이터
    const criteriaData = {
        labels,
        datasets: criteriaNames.map((name, idx) => ({
            label: name,
            data: chronological.map(h => {
                const cs = (h.criteriaScores || []).find(c => c.name === name)
                return cs ? Math.round((cs.score / cs.maxScore) * 100) : null
            }),
            borderColor: CRITERIA_COLORS[idx % CRITERIA_COLORS.length],
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: CRITERIA_COLORS[idx % CRITERIA_COLORS.length],
            borderWidth: 2,
            spanGaps: true
        }))
    }

    const totalOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => chronological[items[0].dataIndex]?.rubricName,
                    label: (item) => `점수: ${item.raw}점`
                }
            }
        },
        scales: {
            y: { min: 0, max: 100, ticks: { stepSize: 20 } }
        }
    }

    const criteriaOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
            },
            tooltip: {
                callbacks: {
                    title: (items) => chronological[items[0].dataIndex]?.rubricName,
                    label: (item) => `${item.dataset.label}: ${item.raw}%`
                }
            }
        },
        scales: {
            y: { min: 0, max: 100, ticks: { stepSize: 20 }, title: { display: true, text: '달성률 (%)' } }
        }
    }

    const criteriaGrowthInsight = getCriteriaGrowthInsight(chronological)

    return (
        <div className="growth-chart card">
            <div className="growth-chart-header">
                <h3>📈 성장 추적</h3>
                <div className="growth-chart-actions">
                    {hasCriteriaData && history.length >= 2 && (
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'total' ? 'active' : ''}`}
                                onClick={() => setViewMode('total')}
                            >
                                종합
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'criteria' ? 'active' : ''}`}
                                onClick={() => setViewMode('criteria')}
                            >
                                항목별
                            </button>
                        </div>
                    )}
                    <span className="growth-count">{history.length}회 평가</span>
                    {onClear && (
                        <button onClick={onClear} className="btn btn-ghost btn-sm">
                            기록 삭제
                        </button>
                    )}
                </div>
            </div>

            {history.length === 1 ? (
                <div className="growth-single">
                    <p>첫 번째 평가: <strong>{history[0].totalScore}점</strong> ({history[0].grade})</p>
                    <p className="growth-hint">더 많이 평가하면 성장 그래프를 볼 수 있어요!</p>
                </div>
            ) : (
                <>
                    <div className="growth-chart-container">
                        {viewMode === 'total'
                            ? <Line data={totalData} options={totalOptions} />
                            : <Line data={criteriaData} options={criteriaOptions} />
                        }
                    </div>
                    <div className="growth-stats">
                        <div className="growth-stat">
                            <span className="stat-label">최고점</span>
                            <span className="stat-value">{maxScore}점</span>
                        </div>
                        <div className="growth-stat">
                            <span className="stat-label">평균</span>
                            <span className="stat-value">{avgScore}점</span>
                        </div>
                        <div className="growth-stat">
                            <span className="stat-label">최근 변화</span>
                            <span className={`stat-value ${lastChange > 0 ? 'positive' : lastChange < 0 ? 'negative' : ''}`}>
                                {lastChange > 0 ? '+' : ''}{lastChange}점
                            </span>
                        </div>
                    </div>
                    {viewMode === 'total' && trendMessage && (
                        <div className={`growth-insight ${trendMessage.type}`}>
                            <span className="insight-icon">{trendMessage.icon}</span>
                            <p className="insight-text">{trendMessage.message}</p>
                        </div>
                    )}
                    {viewMode === 'criteria' && criteriaGrowthInsight && (
                        <div className="growth-insight positive">
                            <span className="insight-icon">🔍</span>
                            <p className="insight-text">{criteriaGrowthInsight}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default GrowthChart
