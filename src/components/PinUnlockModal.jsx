/**
 * PIN 잠금 해제 모달
 * 서버 API 사용 권한이 없을 때(401) 홈 화면에서 바로 PIN을 입력할 수 있게 합니다.
 */
import { useState } from 'react'
import './PinUnlockModal.css'

function PinUnlockModal({ onUnlock, onClose }) {
    const [pin, setPin] = useState('')
    const [failMessage, setFailMessage] = useState('')
    const [isChecking, setIsChecking] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!pin.trim() || isChecking) return

        setIsChecking(true)
        setFailMessage('')
        const unlocked = await onUnlock(pin.trim())
        setIsChecking(false)

        if (!unlocked) {
            setFailMessage('PIN이 올바르지 않습니다. 선생님께 확인해주세요.')
            setPin('')
        }
    }

    return (
        <div className="pin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pin-modal-title">
            <div className="pin-modal">
                <h3 id="pin-modal-title">🔑 평가 잠금 해제</h3>
                <p className="pin-modal-desc">
                    평가를 시작하려면 선생님께 안내받은 PIN을 입력해주세요.
                    한 번 입력하면 4시간 동안 다시 입력하지 않아도 됩니다.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        className="input pin-modal-input"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="PIN 입력"
                        autoFocus
                        inputMode="numeric"
                        autoComplete="off"
                    />
                    {failMessage && <p className="pin-modal-error">{failMessage}</p>}
                    <div className="pin-modal-actions">
                        <button type="submit" className="btn btn-primary" disabled={!pin.trim() || isChecking}>
                            {isChecking ? '확인 중...' : '잠금 해제'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            취소
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default PinUnlockModal
