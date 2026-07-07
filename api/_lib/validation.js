/**
 * /api/evaluate 요청 스키마 검증.
 * LLM 호출 전 비용 발생 가능 입력은 모두 여기서 차단.
 */

export const MIN_PROMPT_LEN = 50
export const MAX_PROMPT_LEN = 200_000

export const MODEL_ALLOWLIST = {
    gemini: [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-pro-exp-02-05',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
    ],
    openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'o1-preview',
        'o3-mini',
    ],
    claude: [
        'claude-opus-4-8',
        'claude-opus-4-7',
        'claude-sonnet-4-6',
        'claude-haiku-4-5-20251001',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
    ],
    ensemble: [],
}

export const ALLOWED_PROVIDERS = Object.keys(MODEL_ALLOWLIST)

function fail(status, error) {
    return { ok: false, status, error }
}

/**
 * @param {unknown} body
 * @returns {{ok:true,data:{prompt:string,provider:string,model:string|undefined,apiKeys:object|undefined,apiKey:string|undefined}}|{ok:false,status:number,error:string}}
 */
export function validateEvaluateRequest(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return fail(400, '요청 본문이 올바른 JSON 객체가 아닙니다.')
    }

    const { prompt, provider, model, apiKey, apiKeys } = body

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
        return fail(400, 'prompt는 비어있지 않은 문자열이어야 합니다.')
    }
    if (prompt.length < MIN_PROMPT_LEN) {
        return fail(400, `prompt가 너무 짧습니다. (최소 ${MIN_PROMPT_LEN}자, 현재 ${prompt.length}자)`)
    }
    if (prompt.length > MAX_PROMPT_LEN) {
        return fail(400, `prompt가 너무 깁니다. (최대 ${MAX_PROMPT_LEN}자, 현재 ${prompt.length}자)`)
    }

    const resolvedProvider = provider ?? 'gemini'
    if (!ALLOWED_PROVIDERS.includes(resolvedProvider)) {
        return fail(400, `허용되지 않는 provider입니다: ${resolvedProvider}. 허용: ${ALLOWED_PROVIDERS.join(', ')}`)
    }

    // ensemble은 모델 미지정 OK
    if (resolvedProvider !== 'ensemble' && model !== undefined && model !== null && model !== '') {
        const allowedModels = MODEL_ALLOWLIST[resolvedProvider]
        if (!allowedModels.includes(model)) {
            return fail(400, `${resolvedProvider} provider에서 허용되지 않는 model입니다: ${model}`)
        }
    }

    return {
        ok: true,
        data: {
            prompt,
            provider: resolvedProvider,
            model: model || undefined,
            apiKey: typeof apiKey === 'string' ? apiKey : undefined,
            apiKeys: apiKeys && typeof apiKeys === 'object' ? apiKeys : undefined,
        },
    }
}
