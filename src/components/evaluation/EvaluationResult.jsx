/**
 * EvaluationResult - 평가 결과 오케스트레이터
 * 하위 컴포넌트를 조합하여 전체 평가 보고서를 렌더링합니다.
 */
import { useState, useRef } from 'react'
import html2pdf from 'html2pdf.js'
import { getGradeColor } from '../../constants'
import ScoreOverview from './ScoreOverview'
import RadarChart from './RadarChart'
import CriteriaDetail from './CriteriaDetail'
import '../EvaluationResult.css'

function EvaluationResult({ result, rubric, onReset, apiSettings, selfEvalScores }) {
    const [studentId, setStudentId] = useState('')
    const [studentName, setStudentName] = useState('')
    const resultsRef = useRef(null)

    if (!result) return null

    // 모델 표시명 생성
    const getModelDisplay = () => {
        if (!apiSettings) return 'N/A'
        const { provider, models = {} } = apiSettings
        if (provider === 'ensemble') return 'Ensemble (Triple AI)'
        const modelName = models[provider] || 'Default'
        return `${provider.toUpperCase()}: ${modelName}`
    }

    const {
        totalScore,
        grade,
        criteriaScores,
        qualitativeEvaluation,
        suggestions,
        studentRecordDraft,
        verificationSummary,
        conversationFlow,
        ethicsCheck
    } = result

    const gradeColors = getGradeColor(grade)

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        alert('클립보드에 복사되었습니다!')
    }

    const downloadReport = async () => {
        try {
            const element = resultsRef.current
            if (!element) {
                console.error('Evaluation result element not found for PDF generation.')
                return
            }

            document.body.classList.add('is-pdf-rendering')

            const fileNameParts = ['AI채팅평가']
            const firstId = studentId.split(/[,\s]/)[0]
            const firstName = studentName.split(/[,\s]/)[0]
            if (firstId) fileNameParts.push(firstId)
            if (firstName) fileNameParts.push(firstName)
            fileNameParts.push(new Date().toISOString().slice(0, 10))

            const opt = {
                margin: 10,
                filename: `${fileNameParts.join('_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    scrollY: 0,
                    windowWidth: 794,
                    width: 794,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            }

            await new Promise(resolve => setTimeout(resolve, 500))
            await html2pdf().set(opt).from(element).save()
        } catch (err) {
            console.error('PDF generation failed:', err)
            alert(`PDF 생성 실패: ${err.message}`)
        } finally {
            document.body.classList.remove('is-pdf-rendering')
        }
    }

    return (
        <div className="evaluation-result" ref={resultsRef}>
            {/* 1페이지: 요약 */}
            <div className="pdf-summary-page">
                {/* PDF 전용 헤더 (PDF 생성 시에만 표시) */}
                <div className="pdf-only-header">
                    <h1>AI 채팅 평가 보고서</h1>
                    <div className="pdf-info-row">
                        <div className="pdf-student-info">
                            <div className="pdf-info-group">
                                <span className="info-label">학번</span>
                                <span className="info-value">{studentId || '-'}</span>
                            </div>
                            <div className="pdf-info-group">
                                <span className="info-label">이름</span>
                                <span className="info-value">{studentName || '-'}</span>
                            </div>
                            <div className="pdf-info-group">
                                <span className="info-label">평가 도우미</span>
                                <span className="info-value">{getModelDisplay()}</span>
                            </div>
                        </div>
                        <div className="pdf-date">
                            발급일시: {new Date().toLocaleString('ko-KR')}
                        </div>
                    </div>
                </div>

                {/* 앙상블 부분 참여 안내 */}
                {result.ensembleInfo && result.ensembleInfo.succeeded < result.ensembleInfo.requested && (
                    <div className="ensemble-partial-notice">
                        ⚠️ 앙상블 평가: AI {result.ensembleInfo.requested}개 중 {result.ensembleInfo.succeeded}개만 참여했습니다
                        ({result.ensembleInfo.providers.join(', ')}). 일부 모델이 응답하지 않아 평가 신뢰도가 낮아질 수 있습니다.
                    </div>
                )}

                {/* 웹 전용 헤더 */}
                <div className="result-header">
                    <h2>📊 평가 결과</h2>
                    <div className="result-actions">
                        <button onClick={downloadReport} className="btn btn-secondary btn-sm">
                            📥 다운로드
                        </button>
                        <button onClick={onReset} className="btn btn-ghost btn-sm">
                            🔄 다시 평가
                        </button>
                    </div>
                </div>

                {/* 학생 정보 입력 (웹 전용) */}
                <div className="student-info-input card">
                    <h3>👤 학생 정보 (선택)</h3>
                    <p className="info-hint">
                        다운로드할 파일에 포함됩니다. 서버에 저장되지 않습니다.
                    </p>
                    <div className="student-info-fields">
                        <div className="form-group">
                            <label htmlFor="studentId">학번</label>
                            <input
                                type="text"
                                id="studentId"
                                className="input"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="예: 20101"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="studentName">이름</label>
                            <input
                                type="text"
                                id="studentName"
                                className="input"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="예: 홍길동"
                            />
                        </div>
                    </div>
                </div>

                {/* 점수 요약 + 특징 + 하이라이트 */}
                <ScoreOverview result={result} gradeColors={gradeColors} ethicsCheck={ethicsCheck} />

                {/* 레이더 차트 */}
                <RadarChart criteriaScores={criteriaScores} />
            </div>

            {/* PDF 페이지 구분선 */}
            <div className="html2pdf__page-break"></div>

            {/* 2페이지+: 상세 평가 */}
            <div className="pdf-details-page">
                <CriteriaDetail
                    criteriaScores={criteriaScores}
                    qualitativeEvaluation={qualitativeEvaluation}
                    suggestions={suggestions}
                    studentRecordDraft={studentRecordDraft}
                    copyToClipboard={copyToClipboard}
                    selfEvalScores={selfEvalScores}
                    verificationSummary={verificationSummary}
                    conversationFlow={conversationFlow}
                />
            </div>
        </div>
    )
}

export default EvaluationResult
