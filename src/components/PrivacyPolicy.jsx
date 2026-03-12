import { useEffect } from 'react'
import { clearAllStorage } from '../services/storage'
import './PrivacyPolicy.css'

function PrivacyPolicy({ onClose }) {
    // ESC 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [onClose])

    const handleClearData = () => {
        if (confirm('모든 앱 데이터(평가 기록, 설정 등)를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
            clearAllStorage()
            alert('모든 데이터가 삭제되었습니다.')
        }
    }

    return (
        <div className="privacy-modal-overlay" onClick={onClose}>
            <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
                <div className="privacy-modal-header">
                    <h2>개인정보 처리방침</h2>
                    <button className="privacy-modal-close" onClick={onClose} aria-label="닫기">
                        &times;
                    </button>
                </div>

                <div className="privacy-modal-body">
                    <section className="privacy-section">
                        <h3>1. 수집 목적</h3>
                        <ul>
                            <li>PDF 리포트 생성 (교사 제출용)</li>
                            <li>AI 채팅 활용 능력 평가</li>
                        </ul>
                    </section>

                    <section className="privacy-section">
                        <h3>2. 수집 항목</h3>
                        <ul>
                            <li><strong>이름</strong> (선택) — 브라우저 localStorage에만 저장, 서버 미전송</li>
                            <li><strong>학번</strong> (선택) — 브라우저 localStorage에만 저장, 서버 미전송</li>
                        </ul>
                        <p className="privacy-note">
                            입력된 정보는 사용자의 브라우저에만 저장되며, 외부 서버로 전송되지 않습니다.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h3>3. 보유 기간</h3>
                        <ul>
                            <li>사용자가 직접 삭제할 때까지 브라우저에 보관</li>
                            <li>평가 기록은 최대 50건까지 자동 관리 (초과 시 오래된 기록부터 삭제)</li>
                        </ul>
                    </section>

                    <section className="privacy-section">
                        <h3>4. AI API 사용 안내</h3>
                        <p>
                            채팅 로그는 평가를 위해 AI API(Gemini, OpenAI, Claude)를 통해 처리됩니다.
                            이 과정에서 <strong>개인 식별 정보(이름, 학번)는 API로 전송되지 않으며</strong>,
                            채팅 내용만 평가 목적으로 전달됩니다.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h3>5. 개인정보 보호책임자</h3>
                        <p>석리송 (당곡고등학교 정보과 교사)</p>
                    </section>

                    <section className="privacy-section">
                        <h3>6. 열람 및 삭제</h3>
                        <ul>
                            <li>브라우저 localStorage에서 직접 삭제 가능</li>
                            <li>담당 교사에게 삭제 요청 가능</li>
                        </ul>
                    </section>

                    <section className="privacy-section privacy-section-data">
                        <h3>7. 데이터 관리</h3>
                        <p>저장된 데이터를 삭제하는 방법:</p>
                        <div className="privacy-data-methods">
                            <div className="privacy-data-method">
                                <strong>방법 1: 앱 내 삭제</strong>
                                <p>아래 버튼을 클릭하면 이 앱에서 저장한 모든 데이터가 삭제됩니다.</p>
                                <button className="btn btn-secondary btn-sm" onClick={handleClearData}>
                                    모든 앱 데이터 삭제
                                </button>
                            </div>
                            <div className="privacy-data-method">
                                <strong>방법 2: 브라우저 설정</strong>
                                <p>브라우저 설정 &gt; 개인정보 및 보안 &gt; 사이트 데이터 삭제에서 해당 사이트의 데이터를 삭제할 수 있습니다.</p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="privacy-modal-footer">
                    <p className="privacy-date">시행일: 2026년 3월 1일</p>
                    <button className="btn btn-primary" onClick={onClose}>확인</button>
                </div>
            </div>
        </div>
    )
}

export default PrivacyPolicy
