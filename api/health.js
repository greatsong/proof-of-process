export const config = {
    runtime: 'edge',
};

const REQUIRED_VARS = ['GEMINI_API_KEY', 'CLAUDE_API_KEY', 'OPENAI_API_KEY', 'SECRET_API_PIN'];

export default async function handler() {
    const envStatus = {};
    let allSet = true;

    for (const name of REQUIRED_VARS) {
        const value = process.env[name];
        const isSet = !!value && value.trim() !== '';
        envStatus[name] = isSet ? '설정됨' : '미설정';
        if (!isSet) allSet = false;
    }

    const result = {
        status: allSet ? 'ok' : 'warning',
        message: allSet ? '모든 환경변수가 정상 설정되어 있습니다.' : '일부 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 확인 후 재배포하세요.',
        env: envStatus,
        timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
