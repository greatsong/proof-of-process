/**
 * 실패 횟수 제한 (PIN·관리자 비밀번호 추측 방지).
 * 성공한 요청은 세지 않으므로 학교 공용 IP에서 학급 전체가 잠금 해제해도 걸리지 않는다.
 *
 * rateLimit.js와 달리 KV 장애 시 열어 두지 않고 인스턴스 메모리로 계속 센다.
 */
import { kv } from '@vercel/kv'

const memory = new Map()

function memoryCount(key) {
    const entry = memory.get(key)
    if (!entry || entry.resetAt <= Date.now()) return 0
    return entry.count
}

export async function failureCount(key) {
    try {
        const stored = Number(await kv.get(key)) || 0
        return Math.max(stored, memoryCount(key))
    } catch {
        return memoryCount(key)
    }
}

export async function recordFailure(key, windowSec) {
    const now = Date.now()
    const entry = memory.get(key)
    if (!entry || entry.resetAt <= now) memory.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    else entry.count += 1
    try {
        const count = await kv.incr(key)
        if (count === 1) await kv.expire(key, windowSec)
    } catch (e) {
        console.warn('Attempt limit store failed (memory only):', e?.message || e)
    }
}

/** 테스트 전용 */
export function resetAttemptMemory() {
    memory.clear()
}
