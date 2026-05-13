/**
 * Vercel KV 기반 sliding-counter rate limit.
 * KV 미설정/장애 시 fail-open (정상 사용자 차단 방지).
 */

import { kv } from '@vercel/kv'

/**
 * @param {string} key       카운터 키 (예: "rl:eval:pin-user")
 * @param {number} limit     윈도우 내 허용 횟수
 * @param {number} windowSec 윈도우 (초)
 * @returns {Promise<{allowed:boolean, remaining:number, resetAt:number, degraded?:boolean}>}
 */
export async function checkRateLimit(key, limit, windowSec) {
    try {
        const count = await kv.incr(key)
        // 첫 호출이면 TTL 설정
        if (count === 1) {
            await kv.expire(key, windowSec)
        }

        const remaining = Math.max(0, limit - count)
        const allowed = count <= limit
        const resetAt = Math.floor(Date.now() / 1000) + windowSec

        return { allowed, remaining, resetAt }
    } catch (e) {
        console.warn('Rate limit check failed (fail-open):', e?.message || e)
        return { allowed: true, remaining: limit, resetAt: 0, degraded: true }
    }
}
