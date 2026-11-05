/**
 * 실패 횟수 제한 (PIN·관리자 비밀번호 추측 방지).
 * 비교하기 전에 시도를 예약해 병렬 요청이 한도 검사를 함께 통과하지 못하게 하고,
 * 성공하면 예약을 되돌린다. 성공한 요청은 남지 않으므로 학교 공용 IP에서 학급 전체가
 * 잠금 해제해도 걸리지 않는다.
 *
 * rateLimit.js와 달리 KV 장애 시 열어 두지 않고 인스턴스 메모리로 계속 센다.
 */
import { kv } from '@vercel/kv'

const memory = new Map()

function reserveInMemory(key, windowSec) {
    const now = Date.now()
    const entry = memory.get(key)
    if (!entry || entry.resetAt <= now) {
        memory.set(key, { count: 1, resetAt: now + windowSec * 1000 })
        return 1
    }
    entry.count += 1
    return entry.count
}

/** @returns {Promise<boolean>} 한도 안이면 true */
export async function reserveAttempt(key, limit, windowSec) {
    const local = reserveInMemory(key, windowSec)
    let shared = 0
    try {
        shared = await kv.incr(key)
        // 만료 설정이 실패해 영구 잠금이 되지 않도록 TTL이 없으면 다시 건다
        if (shared === 1 || (await kv.ttl(key)) < 0) await kv.expire(key, windowSec)
    } catch (e) {
        console.warn('Attempt limit store failed (memory only):', e?.message || e)
    }
    return Math.max(local, shared) <= limit
}

export async function releaseAttempt(key) {
    const entry = memory.get(key)
    if (entry && entry.count > 0) entry.count -= 1
    try {
        await kv.decr(key)
    } catch {
        // KV가 없으면 메모리 카운터만 되돌린다
    }
}

/** 테스트 전용 */
export function resetAttemptMemory() {
    memory.clear()
}
