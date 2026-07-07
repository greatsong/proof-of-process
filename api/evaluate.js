
// GoogleGenerativeAI import removed to support Edge Runtime
import { verifyToken, extractBearerToken } from './_lib/auth.js';
import { validateEvaluateRequest } from './_lib/validation.js';
import { isAllowedOrigin, defaultAllowlist } from './_lib/origin.js';
import { checkRateLimit } from './_lib/rateLimit.js';

const SERVER_KEYS = {
    gemini: process.env.GEMINI_API_KEY || '',
    claude: process.env.CLAUDE_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || ''
};

export const config = {
    runtime: 'edge',
};

const RATE_LIMIT_PER_TOKEN = 60;
const RATE_LIMIT_WINDOW_SEC = 60 * 60;

// 사용자 메시지(클라이언트가 이미 완성한 루브릭 기반 평가 프롬프트)의 스키마를
// 절대 재정의하지 않고, interactionMode 분류만 얹는 추가(additive) 지침.
// 과거에는 이 시스템 프롬프트가 자체 JSON 스키마(고정 3개 기준, totalScore 등)를
// 강제해 사용자 메시지의 루브릭별 스키마와 충돌했다 — evidence/weaknesses/nextSteps
// 등 필드가 통째로 사라지고, 채점 기준 개수까지 달라지는 문제가 있었다.
const INTERACTION_MODE_SYSTEM_PROMPT = `당신은 AI 교육 평가 전문가입니다. 사용자 메시지에 포함된 평가 루브릭, 채점 기준, JSON 출력 형식을 그대로 따르십시오. 항목 수나 필드를 임의로 바꾸거나 생략하지 마십시오.

추가로, 학습자의 상호작용 패턴을 아래 4가지 중 하나로 분류하여 최상위 필드 "interactionMode"에 포함하십시오 (사용자 메시지의 JSON 예시에 없는 필드이지만 반드시 추가하십시오):
1. Delegation - AI에게 결과물만 요청하고 이해하려 하지 않음
2. Iterative Debugging - 에러 해결을 AI에게 수동적으로 반복 요청함
3. Generation-then-Comprehension - 생성된 결과를 검토하고 질문함
4. Conceptual Inquiry - 원리를 먼저 질문하거나 힌트를 요청함

interactionMode 필드 추가를 제외한 나머지 모든 사항은 사용자 메시지의 지침을 우선하십시오.`;

function jsonResponse(status, body, extraHeaders) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) }
    });
}

export default async function handler(req) {
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    // === 보안 게이트 ===

    // 1. Origin 화이트리스트 (봇 1차 차단)
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    if (!isAllowedOrigin(origin, defaultAllowlist(process.env))) {
        return jsonResponse(403, { error: '허용되지 않은 Origin입니다.' });
    }

    // 2. Bearer JWT 인증
    const jwtSecret = process.env.JWT_SECRET || '';
    if (!jwtSecret) {
        return jsonResponse(503, { error: '서버 인증 설정이 누락되었습니다. (JWT_SECRET 미설정)' });
    }
    const token = extractBearerToken(req);
    if (!token) {
        return jsonResponse(401, { error: '인증 토큰이 없습니다. PIN으로 잠금 해제 후 다시 시도하세요.' });
    }
    let claims;
    try {
        claims = await verifyToken(token, jwtSecret);
    } catch (e) {
        return jsonResponse(401, { error: `인증 토큰이 유효하지 않습니다: ${e.message}` });
    }

    // 3. Body 파싱 + 스키마 검증 (LLM 호출 전)
    let rawBody;
    try {
        rawBody = await req.json();
    } catch {
        return jsonResponse(400, { error: '요청 본문이 올바른 JSON이 아닙니다.' });
    }
    const v = validateEvaluateRequest(rawBody);
    if (!v.ok) {
        return jsonResponse(v.status, { error: v.error });
    }

    // 4. Rate limit (토큰별 시간당 한도)
    const rlKey = `rl:eval:${claims.sub || 'anon'}`;
    const rl = await checkRateLimit(rlKey, RATE_LIMIT_PER_TOKEN, RATE_LIMIT_WINDOW_SEC);
    if (!rl.allowed) {
        const retryAfter = Math.max(1, rl.resetAt - Math.floor(Date.now() / 1000));
        return jsonResponse(429, {
            error: `요청 한도 초과 (시간당 ${RATE_LIMIT_PER_TOKEN}회). 잠시 후 다시 시도하세요.`
        }, { 'Retry-After': String(retryAfter) });
    }

    try {
        const { provider, model, apiKey: singleApiKey, apiKeys: clientApiKeys = {} } = v.data;
        const prompt = v.data.prompt;

        // Helper for handling timeouts - return null instead of throwing to allow partial success
        const withTimeout = (promise, ms) => Promise.race([
            promise,
            new Promise((resolve) => setTimeout(() => resolve(null), ms))
        ]);

        // Vercel Edge는 25초 내 최초 응답이 필수 — 내부 타임아웃은 여유를 두고 20초
        const TIMEOUT_MS = 20000;

        // === Ensemble Mode ===
        if (provider === 'ensemble') {
            const ENSEMBLE_PROVIDERS = ['gemini', 'openai', 'claude'];
            const results = await Promise.allSettled([
                withTimeout(callProvider('gemini', prompt, clientApiKeys.gemini || SERVER_KEYS.gemini, 'gemini-3.5-flash'), TIMEOUT_MS),
                withTimeout(callProvider('openai', prompt, clientApiKeys.openai || SERVER_KEYS.openai, 'gpt-4o-mini'), TIMEOUT_MS),
                withTimeout(callProvider('claude', prompt, clientApiKeys.claude || SERVER_KEYS.claude, 'claude-haiku-4-5-20251001'), TIMEOUT_MS)
            ]);

            const succeededProviders = ENSEMBLE_PROVIDERS
                .filter((_, i) => results[i].status === 'fulfilled' && results[i].value !== null);
            const successfulResults = results
                .filter(r => r.status === 'fulfilled' && r.value !== null)
                .map(r => r.value);

            if (successfulResults.length === 0) {
                throw new Error(`서버 평가 중 오류: 제한 시간 내에 응답한 AI 모델이 없습니다.`);
            }

            const synthesizedText = synthesizeResults(successfulResults);

            return jsonResponse(200, {
                text: synthesizedText,
                ensembleInfo: {
                    requested: ENSEMBLE_PROVIDERS.length,
                    succeeded: succeededProviders.length,
                    providers: succeededProviders
                }
            });
        }

        // === Single Provider Mode ===
        const effectiveApiKey = singleApiKey || clientApiKeys[provider] || SERVER_KEYS[provider];

        if (!effectiveApiKey) {
            return jsonResponse(500, {
                error: `서버에 ${provider} API 키가 설정되지 않았습니다. Vercel 대시보드에서 환경변수를 설정한 후 재배포하세요. (필요한 변수: ${provider === 'gemini' ? 'GEMINI_API_KEY' : provider === 'claude' ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY'})`
            });
        }

        const resultText = await withTimeout(
            callProvider(provider, prompt, effectiveApiKey, model),
            TIMEOUT_MS
        );

        if (resultText === null) {
            return jsonResponse(504, { error: 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도하거나 다른 모델을 선택해주세요.' });
        }

        return jsonResponse(200, { text: resultText });

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse(500, { error: error.message });
    }
}

/**
 * Call individual provider API
 */
async function callProvider(provider, prompt, apiKey, model) {
    if (!apiKey) throw new Error(`서버에 ${provider} API 키가 없습니다. Vercel 환경변수 설정 후 재배포 필요.`);

    let url, options, targetModel;

    if (provider === 'gemini') {
        targetModel = model || 'gemini-3.5-flash';
        url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
        options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: INTERACTION_MODE_SYSTEM_PROMPT + "\n\n" + prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
            })
        };
    } else if (provider === 'openai') {
        targetModel = model || 'gpt-4o';
        url = 'https://api.openai.com/v1/chat/completions';
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: targetModel,
                messages: [
                    { role: 'system', content: INTERACTION_MODE_SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 8192
            })
        };
    } else if (provider === 'claude') {
        targetModel = model || 'claude-haiku-4-5-20251001';
        url = 'https://api.anthropic.com/v1/messages';
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: targetModel,
                max_tokens: 8192,
                system: INTERACTION_MODE_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: prompt }]
            })
        };
    } else {
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Gemini 3.5는 과부하 시 503 또는 무기한 지연이 발생할 수 있다.
    // 순차 폴백은 Edge 25초 한도 안에 끝나지 않으므로, 3.5와 2.5-flash를
    // 동시에 호출해 먼저 성공한 결과를 사용한다 (3.5 정상화 시 3.5가 우선 도착).
    if (provider === 'gemini' && targetModel !== 'gemini-2.5-flash') {
        const attempts = [
            fetchProviderText('gemini', url, options),
            callProvider('gemini', prompt, apiKey, 'gemini-2.5-flash')
        ];
        try {
            return await Promise.any(attempts);
        } catch (aggregate) {
            throw aggregate.errors?.[0] || new Error('gemini Error: 모든 모델 호출이 실패했습니다.');
        }
    }

    return fetchProviderText(provider, url, options);
}

/**
 * fetch 실행 후 프로바이더별 텍스트 추출
 */
async function fetchProviderText(provider, url, options) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || String(response.status);
        throw new Error(`${provider} Error: ${errMsg}`);
    }

    const data = await response.json();

    // Extract text based on provider
    if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (provider === 'openai') return data.choices?.[0]?.message?.content || '';
    if (provider === 'claude') return data.content?.[0]?.text || '';

    return '';
}

/**
 * Synthesize multiple JSON results into one
 */
function synthesizeResults(texts) {
    const validResults = [];

    // Parse each result
    texts.forEach(text => {
        try {
            // Extract JSON from markdown blocks if present
            const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
            const jsonStr = match[1].trim();
            const obj = JSON.parse(jsonStr);
            if (obj.totalScore !== undefined) {
                validResults.push(obj);
            }
        } catch (e) {
            console.warn('Failed to parse result in ensemble:', e);
        }
    });

    if (validResults.length === 0) {
        return texts[0] || "{}"; // Fallback if all parsing fails
    }

    // Average Scores
    const count = validResults.length;
    const base = validResults[0];

    // criteriaScores는 이제 사용자가 선택한 루브릭에 따라 개수·criterionId가 달라진다.
    // 배열 인덱스가 아니라 criterionId(없으면 name)로 매칭해 evidence/weaknesses/nextSteps 등
    // 루브릭 고유 필드가 유실되지 않도록 병합한다.
    const matchResults = (criterion) => {
        const key = criterion.criterionId || criterion.name;
        return validResults
            .map(r => (r.criteriaScores || []).find(c => (c.criterionId || c.name) === key))
            .filter(Boolean);
    };
    const joinField = (matches, field, separator) =>
        matches.map(m => m[field]).filter(Boolean).join(separator);

    const finalResult = {
        ...base,
        totalScore: Math.round(validResults.reduce((acc, r) => acc + (r.totalScore || 0), 0) / count),
        // 다수결로 채택, 동률이면 첫 결과의 판정을 우선한다.
        interactionMode: mostFrequent(validResults.map(r => r.interactionMode).filter(Boolean)) || base.interactionMode,
        qualitativeEvaluation: validResults.map((r, i) => `[의견 ${i + 1}]\n${r.qualitativeEvaluation}`).join('\n\n---\n\n'),
        characteristics: [...new Set(validResults.flatMap(r => r.characteristics || []))],
        suggestions: [...new Set(validResults.flatMap(r => r.suggestions || []))],
        criteriaScores: (base.criteriaScores || []).map((criterion) => {
            const matches = matchResults(criterion)
            const avgScore = matches.length
                ? Math.round(matches.reduce((acc, c) => acc + (c.score || 0), 0) / matches.length)
                : (criterion.score || 0)

            return {
                ...criterion,
                score: avgScore,
                evidence: joinField(matches, 'evidence', '\n') || criterion.evidence,
                strengths: joinField(matches, 'strengths', ' / ') || criterion.strengths,
                weaknesses: joinField(matches, 'weaknesses', ' / ') || criterion.weaknesses,
                improvement: joinField(matches, 'improvement', '\n') || criterion.improvement,
                nextSteps: joinField(matches, 'nextSteps', ' / ') || criterion.nextSteps
            };
        })
    };

    return JSON.stringify(finalResult, null, 2);
}

/**
 * 최빈값 (동률이면 배열에서 먼저 등장한 값)
 */
function mostFrequent(values) {
    if (values.length === 0) return null
    const counts = new Map()
    for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
    let best = values[0], bestCount = 0
    for (const [v, c] of counts) {
        if (c > bestCount) { best = v; bestCount = c }
    }
    return best
}
