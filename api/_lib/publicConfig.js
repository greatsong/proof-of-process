/**
 * /api/config가 저장하고 공개로 돌려주는 값의 허용 목록.
 * API 키·서버 토큰 등 나머지 필드는 저장하지도 내보내지도 않는다.
 */
import { ALLOWED_PROVIDERS } from './validation.js'

const MAX_MODEL_LENGTH = 100

function cleanModel(value) {
    return typeof value === 'string' && value.length <= MAX_MODEL_LENGTH ? value : undefined
}

export function sanitizeConfig(settings) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {}
    const clean = {}
    if (ALLOWED_PROVIDERS.includes(settings.provider)) clean.provider = settings.provider
    const model = cleanModel(settings.model)
    if (model !== undefined) clean.model = model
    if (typeof settings.allowEnsemble === 'boolean') clean.allowEnsemble = settings.allowEnsemble
    if (settings.ensembleModels && typeof settings.ensembleModels === 'object' && !Array.isArray(settings.ensembleModels)) {
        const models = {}
        for (const provider of ALLOWED_PROVIDERS) {
            const value = cleanModel(settings.ensembleModels[provider])
            if (value !== undefined) models[provider] = value
        }
        clean.ensembleModels = models
    }
    return clean
}
