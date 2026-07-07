import { useState, useEffect } from 'react'
import { useEvaluation } from '../context/EvaluationContext'
import { useAPI } from '../context/APIContext'
import ChatInput from '../components/ChatInput'
import EvaluationResult from '../components/EvaluationResult'
import RubricSelector from '../components/RubricSelector'
import StudentGuide from '../components/StudentGuide'
import PrivacyPolicy from '../components/PrivacyPolicy'
import PinUnlockModal from '../components/PinUnlockModal'
import { evaluateChat } from '../services/evaluator'
import { verifyEvidence } from '../services/evidenceVerifier'
import { getEvaluationHistory, saveEvaluationToHistory, clearEvaluationHistory } from '../services/evaluationHistory'
import GrowthChart from '../components/evaluation/GrowthChart'
import SelfEvaluation from '../components/SelfEvaluation'
import { fetchSharedChat } from '../services/importChat'
import './Home.css'

// 공유 대화 캐시 키 (sessionStorage — 탭을 닫으면 사라짐, 새로고침엔 유지)
const IMPORT_CACHE_KEY = 'ai-chat-eval-imported-chat'
// StrictMode 이중 마운트/새로고침에도 일회용 토큰을 두 번 소비하지 않도록 하는 모듈 가드
let importAttempted = false

function Home() {
    const {
        currentRubric,
        evaluationResult,
        setEvaluationResult,
        isLoading,
        setIsLoading,
        rubrics
    } = useEvaluation()
    const { apiSettings, unlockApiWithPin } = useAPI()

    const [, setChatContent] = useState('')
    const [error, setError] = useState('')
    const [step, setStep] = useState(1) // 1: 입력, 2: 결과
    const [loadingMessage, setLoadingMessage] = useState('')
    const [evalHistory, setEvalHistory] = useState(() => getEvaluationHistory())
    const [selfEvalScores, setSelfEvalScores] = useState(null)
    const [showSelfEval, setShowSelfEval] = useState(false)
    const [pendingContent, setPendingContent] = useState('')
    const [pendingReflection, setPendingReflection] = useState('')
    const [showPrivacy, setShowPrivacy] = useState(false)
    const [showPinUnlock, setShowPinUnlock] = useState(false)
    const [importedChat, setImportedChat] = useState('')
    const [importNotice, setImportNotice] = useState(null) // { type: 'success'|'error', message }

    // 공유 링크(#import=<토큰>)로 진입한 경우 채팅 앱에서 대화를 불러와 입력창을 채운다.
    useEffect(() => {
        // 이미 시도했으면(StrictMode 이중 마운트 등) 캐시만 복원하고 종료
        if (importAttempted) {
            const cached = sessionStorage.getItem(IMPORT_CACHE_KEY)
            if (cached) setImportedChat(cached)
            return
        }
        importAttempted = true

        const match = window.location.hash.match(/^#import=([a-f0-9]{64})$/i)
        if (!match) {
            // 토큰 없음 — 새로고침 시 이전에 불러온 대화가 있으면 복원
            const cached = sessionStorage.getItem(IMPORT_CACHE_KEY)
            if (cached) setImportedChat(cached)
            return
        }

        const token = match[1]
        // 토큰을 즉시 주소창에서 제거 — fetch 를 기다리기 전에 제거해야, 요청 도중 새로고침해도
        // 일회용 토큰을 다시 소비하려다 404 가 나는 것을 막는다. (새로고침 시엔 sessionStorage 캐시로 복원)
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        ;(async () => {
            try {
                const { text, conversation } = await fetchSharedChat(token)
                if (text && text.trim()) {
                    setImportedChat(text)
                    sessionStorage.setItem(IMPORT_CACHE_KEY, text)
                    const who = conversation.studentName ? `${conversation.studentName} 님의 ` : ''
                    setImportNotice({
                        type: 'success',
                        message: `${who}채팅 대화를 불러왔습니다. 루브릭을 선택하고 평가를 진행하세요.`,
                    })
                } else {
                    setImportNotice({ type: 'error', message: '불러온 대화에 평가할 내용이 없습니다.' })
                }
            } catch (err) {
                setImportNotice({
                    type: 'error',
                    message: err.message || '공유된 대화를 불러오지 못했습니다.',
                })
            }
        })()
    }, [])

    // Cycle loading messages
    useEffect(() => {
        if (!isLoading) return

        setLoadingMessage('채팅 기록을 읽어오는 중입니다... (Reading)')

        const timers = []

        timers.push(setTimeout(() => {
            setLoadingMessage('AI가 내용을 심층 분석 중입니다... (Analyzing)')
        }, 2000))

        timers.push(setTimeout(() => {
            setLoadingMessage('평가 보고서를 작성하고 있습니다... (Writing)')
        }, 8000))

        timers.push(setTimeout(() => {
            setLoadingMessage('마무리 정리 중입니다... (Finalizing)')
        }, 20000))

        timers.push(setTimeout(() => {
            setLoadingMessage('조금만 더 기다려주세요, 꼼꼼히 평가하고 있어요... (Almost done)')
        }, 35000))

        return () => timers.forEach(clearTimeout)
    }, [isLoading])

    const handleChatSubmit = async (content, reflection) => {
        setChatContent(content)
        setError('')

        // Validate requirements
        if (!content.trim()) {
            setError('채팅 내용을 입력해주세요.')
            return
        }

        if (!currentRubric) {
            setError('평가 루브릭을 선택해주세요.')
            return
        }

        // Show self-evaluation step
        setPendingContent(content)
        setPendingReflection(reflection)
        setShowSelfEval(true)
    }

    const handleSelfEvalComplete = async (scores) => {
        setSelfEvalScores(scores)
        setShowSelfEval(false)
        await runEvaluation(pendingContent, pendingReflection)
    }

    const handleSelfEvalSkip = async () => {
        setSelfEvalScores(null)
        setShowSelfEval(false)
        await runEvaluation(pendingContent, pendingReflection)
    }

    const runEvaluation = async (content, reflection, settingsOverride) => {
        setIsLoading(true)
        const settings = settingsOverride || apiSettings

        try {
            const rawResult = await evaluateChat({
                chatContent: content,
                reflection,
                rubric: currentRubric,
                apiSettings: {
                    ...settings,
                    useServerSide: !settings.apiKey
                }
            })

            // 클라이언트 사이드 인용 검증
            const result = verifyEvidence(rawResult, content)
            setEvaluationResult(result)
            setStep(2)

            // Save to history
            const entry = saveEvaluationToHistory(result, currentRubric.name)
            setEvalHistory(prev => [entry, ...prev])
        } catch (err) {
            console.error('Evaluation error:', err)
            // 인증 문제(토큰 없음/만료)면 PIN 입력 모달로 안내
            if (/인증 토큰|잠금 해제|401/.test(err.message || '')) {
                setError('평가를 시작하려면 PIN 잠금 해제가 필요합니다.')
                setShowPinUnlock(true)
            } else {
                setError(err.message || '평가 중 오류가 발생했습니다.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    // PIN 잠금 해제 성공 시 최신 토큰으로 곧바로 재평가
    const handlePinUnlock = async (pin) => {
        const newSettings = await unlockApiWithPin(pin)
        if (!newSettings) return false

        setShowPinUnlock(false)
        setError('')
        await runEvaluation(pendingContent, pendingReflection, newSettings)
        return true
    }

    const handleReset = () => {
        setChatContent('')
        setEvaluationResult(null)
        setError('')
        setStep(1)
        setSelfEvalScores(null)
        setShowSelfEval(false)
        setPendingContent('')
        setPendingReflection('')
    }

    const handleClearHistory = () => {
        if (confirm('평가 기록을 모두 삭제하시겠습니까?')) {
            clearEvaluationHistory()
            setEvalHistory([])
        }
    }

    const isReady = !!currentRubric

    return (
        <div className="home">
            <div className="container">
                {/* Hero Section */}
                <section className="hero">
                    <h1 className="hero-title">
                        <span className="gradient-text">AI 채팅 기록</span>을 평가하세요
                    </h1>
                    <p className="hero-subtitle">
                        ChatGPT, Claude, Gemini 등 AI 채팅 기록을 루브릭 기반으로 분석하여{' '}
                        <br />정량/정성적 피드백을 제공합니다.
                    </p>
                </section>

                {/* Growth Chart */}
                <GrowthChart history={evalHistory} onClear={handleClearHistory} />

                {/* Status Indicators */}
                <div className="status-bar">
                    <div className={`status-item ${currentRubric ? 'active' : ''}`}>
                        <span className="status-icon">{currentRubric ? '✓' : '○'}</span>
                        <span className="status-text">
                            {currentRubric ? `루브릭: ${currentRubric.name}` : '루브릭 미선택'}
                        </span>
                    </div>
                    <div className="status-item active">
                        <span className="status-icon">✓</span>
                        <span className="status-text">
                            {apiSettings.apiKey
                                ? `API: ${apiSettings.provider.toUpperCase()} (사용자 지정)`
                                : `API: ${apiSettings.provider.toUpperCase()} (기본 내장)`}
                        </span>
                    </div>
                </div>

                {/* Student Guide */}
                <StudentGuide />

                {/* Rubric Selector */}
                {rubrics.length > 0 && (
                    <RubricSelector />
                )}

                {/* Error Display */}
                {error && (
                    <div className="error-message animate-slideUp">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}


                {/* Self Evaluation Step */}
                {showSelfEval && currentRubric && (
                    <div className="self-eval-section animate-fadeIn">
                        <SelfEvaluation
                            rubric={currentRubric}
                            onComplete={handleSelfEvalComplete}
                            onSkip={handleSelfEvalSkip}
                        />
                    </div>
                )}

                {/* Main Content */}
                {step === 1 && !showSelfEval && (
                    <div className="input-section animate-fadeIn">
                        {importNotice && (
                            <div
                                role="status"
                                style={{
                                    marginBottom: '1rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    border: '1px solid',
                                    borderColor: importNotice.type === 'success' ? '#a7f3d0' : '#fecaca',
                                    background: importNotice.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                    color: importNotice.type === 'success' ? '#065f46' : '#991b1b',
                                }}
                            >
                                {importNotice.type === 'success' ? '✅ ' : '⚠️ '}
                                {importNotice.message}
                            </div>
                        )}
                        <ChatInput
                            key={importedChat ? 'imported' : 'blank'}
                            onSubmit={handleChatSubmit}
                            isLoading={isLoading}
                            disabled={!isReady}
                            initialContent={importedChat}
                        />

                        {!isReady && (
                            <div className="setup-notice">
                                <p>평가를 시작하려면 먼저 설정이 필요합니다:</p>
                                <ul>
                                    {!currentRubric && <li>평가에 사용할 루브릭을 선택해주세요</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && evaluationResult && (
                    <div className="result-section animate-slideUp">
                        <EvaluationResult
                            result={evaluationResult}
                            rubric={currentRubric}
                            onReset={handleReset}
                            apiSettings={{
                                provider: apiSettings.provider === 'ensemble' ? 'ensemble' : apiSettings.provider,
                                models: apiSettings.models
                            }}
                            selfEvalScores={selfEvalScores}
                        />
                    </div>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="loading-overlay" role="alert" aria-live="polite">
                        <div className="loading-content">
                            <div className="spinner"></div>
                            <p className="loading-text">{loadingMessage}</p>
                            <p className="loading-hint">약 15~50초 정도 소요됩니다</p>
                        </div>
                    </div>
                )}

                {/* Privacy Notice */}
                <section className="privacy-notice">
                    <div className="privacy-icon">🔒</div>
                    <div className="privacy-content">
                        <strong>개인정보 보호</strong>
                        <p>
                            입력하신 채팅 내용은 서버에 저장되지 않습니다. 평가는 실시간으로 처리되며, 페이지를 닫으면 모든 데이터가 삭제됩니다.
                            {' '}<button className="privacy-link-inline" onClick={() => setShowPrivacy(true)}>개인정보 처리방침 보기</button>
                        </p>
                    </div>
                </section>

                {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

                {showPinUnlock && (
                    <PinUnlockModal
                        onUnlock={handlePinUnlock}
                        onClose={() => setShowPinUnlock(false)}
                    />
                )}
            </div>
        </div>
    )
}

export default Home
