import { useState, useMemo } from 'react'
import { parseChatContent, analyzeTurns } from '../services/chatParser'
import './ChatInput.css'

function ChatInput({ onSubmit, isLoading, disabled, initialContent }) {
    const [inputMethod, setInputMethod] = useState('paste') // 'paste', 'file'
    // 외부(공유 링크 등)에서 전달된 내용을 초기값으로 사용.
    // Home 이 key 로 리마운트해 주므로, 새 내용이 오면 이 초기화가 다시 실행된다.
    const [chatContent, setChatContent] = useState(() => initialContent || '')
    const [reflection, setReflection] = useState('')

    // 실시간 파싱 미리보기 (입력이 충분할 때만)
    const parseResult = useMemo(() => {
        if (chatContent.trim().length < 50) return null
        return parseChatContent(chatContent)
    }, [chatContent])

    const turnStats = useMemo(() => {
        if (!parseResult?.parsed) return null
        return analyzeTurns(parseResult.turns)
    }, [parseResult])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (inputMethod === 'paste') {
            if (!chatContent.trim()) return
            onSubmit(chatContent, reflection)
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const text = await readFileContent(file)
            setChatContent(text)
            setInputMethod('paste')
        } catch (err) {
            console.error('File read error:', err)
            alert(`파일 읽기 실패: ${err.message}`)
        }
    }

    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                const content = e.target.result

                if (file.name.endsWith('.json')) {
                    try {
                        const json = JSON.parse(content)
                        if (Array.isArray(json)) {
                            resolve(JSON.stringify(json, null, 2))
                        } else {
                            resolve(JSON.stringify(json, null, 2))
                        }
                    } catch {
                        resolve(content)
                    }
                } else {
                    resolve(content)
                }
            }

            reader.onerror = () => reject(new Error('File reading failed'))
            reader.readAsText(file)
        })
    }

    return (
        <div className="chat-input-container">
            {/* Method Tabs */}
            <div className="method-tabs">
                <button
                    type="button"
                    className={`method-tab ${inputMethod === 'paste' ? 'active' : ''}`}
                    onClick={() => setInputMethod('paste')}
                >
                    📝 직접 붙여넣기
                </button>
                <button
                    type="button"
                    className={`method-tab ${inputMethod === 'file' ? 'active' : ''}`}
                    onClick={() => setInputMethod('file')}
                >
                    📁 파일 업로드
                </button>
            </div>

            <form onSubmit={handleSubmit} className="chat-input-form">
                {/* Paste Method */}
                {inputMethod === 'paste' && (
                    <div className="input-section">
                        <label htmlFor="chatContent" className="input-label">
                            AI 채팅 내용을 붙여넣으세요
                        </label>
                        <textarea
                            id="chatContent"
                            className="input textarea chat-textarea"
                            value={chatContent}
                            onChange={(e) => setChatContent(e.target.value)}
                            placeholder="ChatGPT, Claude, Gemini 등에서 대화 내용을 복사해서 여기에 붙여넣으세요.&#10;&#10;예시:&#10;사용자: 프롬프트 엔지니어링이란 무엇인가요?&#10;AI: 프롬프트 엔지니어링은..."
                            disabled={isLoading || disabled}
                        />

                        {/* 파싱 미리보기 */}
                        {parseResult && (
                            <div className={`parse-preview ${parseResult.parsed ? 'parse-success' : 'parse-fallback'}`}>
                                {parseResult.parsed ? (
                                    <>
                                        <span className="parse-icon">✓</span>
                                        <span className="parse-text">
                                            대화 구조 감지: 학생 {turnStats?.userTurns || 0}회, AI {turnStats?.aiTurns || 0}회 (총 {turnStats?.totalTurns || 0}턴)
                                            {turnStats?.questionLengthGrowth > 20 && (
                                                <span className="parse-growth"> — 후반부 질문이 {turnStats.questionLengthGrowth}% 더 길어짐</span>
                                            )}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="parse-icon">○</span>
                                        <span className="parse-text">
                                            대화 구조를 자동 감지하지 못했습니다. "사용자:" / "AI:" 형식으로 역할이 구분되면 더 정밀한 분석이 가능합니다.
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        <p className="input-hint">
                            💡 전체 대화를 복사하면 더 정확한 평가가 가능합니다
                        </p>
                    </div>
                )}

                {/* File Upload Method */}
                {inputMethod === 'file' && (
                    <div className="input-section">
                        <label className="input-label">
                            채팅 파일 업로드 (.txt, .json, .md, .html)
                        </label>
                        <div className="file-upload-area">
                            <input
                                type="file"
                                id="chatFile"
                                accept=".txt,.json,.md,.html,.csv"
                                onChange={handleFileUpload}
                                className="file-input"
                                disabled={isLoading}
                            />
                            <div className="file-upload-placeholder">
                                <span className="upload-icon">📂</span>
                                <p>클릭하여 파일을 선택하거나 이곳으로 드래그하세요</p>
                                <p className="upload-hint">지원 형식: txt, json, html, md</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reflection Input (Always Visible) */}
                <div className="input-section reflection-section">
                    <label htmlFor="reflection" className="input-label optional-label">
                        <span>추가 맥락 (선택사항)</span>
                        <span className="badge-optional">정성평가 반영</span>
                    </label>
                    <textarea
                        id="reflection"
                        className="input textarea reflection-textarea"
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="AI 채팅에는 없지만 평가에 반영하고 싶은 내용을 적어주세요.&#10;예: '직접 손으로 흐름도를 그려서 프로젝트를 기획했습니다.', '추가로 관련 논문을 찾아 읽어보았습니다.'&#10;(이 내용은 점수에는 반영되지 않고, 피드백에만 반영됩니다)"
                        disabled={isLoading || disabled}
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="btn btn-primary btn-lg submit-btn"
                    disabled={isLoading || disabled ||
                        (inputMethod === 'paste' && !chatContent.trim()) ||
                        (inputMethod === 'file' && !chatContent.trim())}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner"></span>
                            평가 시작 중...
                        </>
                    ) : (
                        <>
                            🚀 평가 시작
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}

export default ChatInput
