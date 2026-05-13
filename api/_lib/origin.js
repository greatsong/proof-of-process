/**
 * Origin 헤더 화이트리스트.
 * 봇/스크립트 트래픽 1차 차단용 (위조 가능하므로 단독으론 부족, 다른 인증과 결합).
 */

function normalize(origin) {
    if (typeof origin !== 'string' || origin === '') return null
    try {
        const u = new URL(origin)
        // pathname/search/hash 제거 + 소문자
        return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}`
    } catch {
        return null
    }
}

/**
 * @param {string|null|undefined} origin
 * @param {Array<string|RegExp>} allowlist
 * @returns {boolean}
 */
export function isAllowedOrigin(origin, allowlist) {
    const norm = normalize(origin)
    if (!norm) return false
    if (!Array.isArray(allowlist) || allowlist.length === 0) return false

    for (const entry of allowlist) {
        if (typeof entry === 'string') {
            const allowedNorm = normalize(entry)
            if (allowedNorm && allowedNorm === norm) return true
        } else if (entry instanceof RegExp) {
            if (entry.test(norm)) return true
        }
    }
    return false
}

/**
 * 환경변수 + 디폴트로 allowlist 구성.
 * - ALLOWED_ORIGINS env (콤마 구분)에 추가 도메인 명시 가능
 * - 디폴트: pro-of-ai.vercel.app + proofai-*.vercel.app preview + localhost
 */
export function defaultAllowlist(env = process.env) {
    const list = [
        'https://pro-of-ai.vercel.app',
        /^https:\/\/proofai-[a-z0-9-]+(?:-greatsongs-projects)?\.vercel\.app$/,
        'http://localhost:5173',
        'http://localhost:3000',
    ]
    const extra = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
    return [...list, ...extra]
}
