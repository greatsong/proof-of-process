/**
 * 교과별 루브릭 템플릿
 *
 * 각 템플릿은 특정 교과/활동에 맞춘 AI 채팅 평가 기준을 제공합니다.
 */

// ─── 공통 윤리 체크 (P/F) — 모든 루브릭에서 사용 ───
const COMMON_ETHICS_CHECK = {
    type: 'pass_fail',
    defaultResult: 'pass',
    description: 'AI 활용의 윤리적 측면 확인 (특별한 이슈가 없으면 Pass). 감점이 아니라 교사와 함께 짚어볼 지점을 표시하는 용도입니다.',
    failCriteria: [
        'AI 생성물을 자기 것처럼 그대로 제출',
        '유해하거나 부적절한 콘텐츠 생성 시도',
        '타인의 과제를 대리 수행하기 위한 사용'
    ]
}

export const RUBRIC_TEMPLATES = [
    {
        id: 'template_general',
        name: '일반 AI 활용 역량 평가',
        description: '범교과적으로 사용할 수 있는 기본 AI 채팅 활용 평가 루브릭',
        icon: '🤖',
        ethicsCheck: COMMON_ETHICS_CHECK,
        criteria: [
            {
                id: 'clarity',
                name: '질문의 명확성',
                description: '프롬프트가 명확하고 구체적인가',
                weight: 20,
                levels: [
                    { score: 5, description: '매우 명확하고 구체적이며 맥락 정보가 충분함' },
                    { score: 4, description: '대체로 명확하고 이해 가능함' },
                    { score: 3, description: '기본적인 의도는 파악 가능하나 모호한 부분 있음' },
                    { score: 2, description: '불분명하여 해석이 필요함' },
                    { score: 1, description: '매우 모호하고 불분명함' }
                ]
            },
            {
                id: 'iteration',
                name: '반복적 개선',
                description: 'AI 응답을 바탕으로 질문을 개선하고 발전시켰는가',
                weight: 25,
                levels: [
                    { score: 5, description: '응답을 분석하고 체계적으로 질문을 발전시킴' },
                    { score: 4, description: '응답을 참고하여 후속 질문을 개선함' },
                    { score: 3, description: '일부 개선 시도가 있음' },
                    { score: 2, description: '개선 시도가 미흡함' },
                    { score: 1, description: '반복적 개선이 없음' }
                ]
            },
            {
                id: 'critical',
                name: '비판적 사고',
                description: 'AI 응답을 비판적으로 검토하고 검증했는가',
                weight: 25,
                levels: [
                    { score: 5, description: 'AI 응답의 한계를 인식하고 검증/수정함' },
                    { score: 4, description: '응답의 정확성을 확인하려는 시도가 있음' },
                    { score: 3, description: '일부 의문을 제기함' },
                    { score: 2, description: '대부분 무비판적으로 수용' },
                    { score: 1, description: 'AI 답을 확인·검증하는 시도가 아직 나타나지 않음' }
                ]
            },
            {
                id: 'application',
                name: '실제 적용',
                description: 'AI의 도움을 실제 문제 해결에 효과적으로 적용했는가',
                weight: 30,
                levels: [
                    { score: 5, description: 'AI 결과를 자기 맥락에 맞게 변형하여 문제를 해결함' },
                    { score: 4, description: 'AI 결과를 참고하여 문제 해결에 활용함' },
                    { score: 3, description: 'AI 결과를 일부 가져다 쓰지만 자기 상황에 맞추지 않음' },
                    { score: 2, description: 'AI에게 답만 구하고 적용 과정이 없음' },
                    { score: 1, description: '실제 문제와 연결하려는 시도가 없음' }
                ]
            }
        ]
    },
    {
        id: 'template_writing',
        name: '글쓰기/국어 AI 활용 평가',
        description: '국어, 영어, 사회 등 글쓰기 과제에서의 AI 활용 능력 평가',
        icon: '✍️',
        ethicsCheck: COMMON_ETHICS_CHECK,
        criteria: [
            {
                id: 'topic_development',
                name: '주제 탐색 및 발전',
                description: 'AI와의 대화를 통해 글의 주제를 탐색하고 발전시켰는가',
                weight: 25,
                levels: [
                    { score: 5, description: '다양한 각도에서 주제를 탐색하고, AI 응답을 바탕으로 독창적 관점을 도출함' },
                    { score: 4, description: '주제를 여러 방향으로 탐색하고 발전시킴' },
                    { score: 3, description: '기본적인 주제 탐색이 있으나 깊이가 부족함' },
                    { score: 2, description: '단순 질문에 그침, 주제 발전이 미흡함' },
                    { score: 1, description: '주제 탐색 없이 AI에게 글 작성을 직접 요청함' }
                ]
            },
            {
                id: 'own_voice',
                name: '자기 목소리 유지',
                description: 'AI 도움을 받되 자신만의 관점과 문체를 유지했는가',
                weight: 30,
                levels: [
                    { score: 5, description: 'AI를 참고 자료로 활용하면서 자신의 관점과 문체를 명확히 유지함' },
                    { score: 4, description: '자신의 관점이 드러나며, AI 내용을 재구성하여 사용함' },
                    { score: 3, description: '일부 자기 의견이 있으나 AI 의존도가 높음' },
                    { score: 2, description: 'AI가 쓴 문장을 거의 수정 없이 사용함(자기 관점·표현으로 바꾼 흔적은 아직 적음)' },
                    { score: 1, description: '완전히 AI에 의존하여 자기 목소리가 없음' }
                ]
            },
            {
                id: 'revision_process',
                name: '수정 및 개선 과정',
                description: 'AI 피드백을 활용하여 글을 수정하고 개선하는 과정이 있었는가',
                weight: 25,
                levels: [
                    { score: 5, description: 'AI에게 구체적 피드백을 요청하고, 이를 반영하여 체계적으로 수정함' },
                    { score: 4, description: 'AI 피드백을 참고하여 수정한 흔적이 있음' },
                    { score: 3, description: '일부 수정 시도가 있으나 체계적이지 않음' },
                    { score: 2, description: '수정 과정이 거의 없음' },
                    { score: 1, description: '한 번에 완성본을 요청함' }
                ]
            },
            {
                id: 'source_verification',
                name: '자료 검증 및 인용',
                description: 'AI가 제공한 정보나 자료를 검증하고 적절히 인용했는가',
                weight: 20,
                levels: [
                    { score: 5, description: 'AI 정보의 정확성을 검증하고, 출처를 확인하여 적절히 인용함' },
                    { score: 4, description: '주요 정보를 검증하려는 시도가 있음' },
                    { score: 3, description: '일부 확인하였으나 체계적이지 않음' },
                    { score: 2, description: 'AI 정보가 맞는지 의심하지 않고 그대로 사용함' },
                    { score: 1, description: 'AI 정보의 정확성을 확인하는 과정 없이 그대로 인용함' }
                ]
            }
        ]
    },
    {
        id: 'template_science',
        name: '과학 탐구 AI 활용 평가',
        description: '과학 실험 설계, 데이터 분석, 탐구 보고서 작성 시 AI 활용 평가',
        icon: '🔬',
        ethicsCheck: COMMON_ETHICS_CHECK,
        criteria: [
            {
                id: 'hypothesis',
                name: '가설 설정 및 실험 설계',
                description: 'AI를 활용하여 가설을 정교하게 다듬고 실험을 설계했는가',
                weight: 25,
                levels: [
                    { score: 5, description: 'AI와 대화하며 가설을 반복적으로 개선하고, 변인 통제를 포함한 실험 설계를 구체화함' },
                    { score: 4, description: '가설 개선과 실험 설계에 AI를 효과적으로 활용함' },
                    { score: 3, description: '기본적인 가설 설정에 AI를 활용하였으나 깊이가 부족함' },
                    { score: 2, description: 'AI에게 직접 가설과 실험을 요청함' },
                    { score: 1, description: '탐구 과정 없이 결론만 요청함' }
                ]
            },
            {
                id: 'data_analysis',
                name: '데이터 분석 활용',
                description: 'AI를 데이터 해석과 분석에 적절히 활용했는가',
                weight: 25,
                levels: [
                    { score: 5, description: '자신의 데이터를 AI에 제공하여 다양한 분석 방법을 탐색하고, 결과를 비판적으로 해석함' },
                    { score: 4, description: '데이터 분석에 AI를 활용하고 결과를 이해하여 설명함' },
                    { score: 3, description: '기본적 분석에 AI를 사용했으나 해석은 부족함' },
                    { score: 2, description: '분석을 AI에 전적으로 의존함' },
                    { score: 1, description: '데이터를 살펴보지 않고 결론만 요청함' }
                ]
            },
            {
                id: 'scientific_reasoning',
                name: '과학적 추론',
                description: 'AI 응답에 대해 과학적 근거를 바탕으로 평가하고 추론했는가',
                weight: 30,
                levels: [
                    { score: 5, description: 'AI 설명의 과학적 타당성을 검토하고, 추가 근거를 요청하며 논리적으로 추론함' },
                    { score: 4, description: 'AI 설명을 과학적으로 검토하려는 시도가 있음' },
                    { score: 3, description: '일부 과학적 질문을 하였으나 체계적이지 않음' },
                    { score: 2, description: '과학적 검증 없이 AI 설명을 수용함' },
                    { score: 1, description: 'AI 설명의 근거를 따져보는 질문이 아직 나타나지 않음' }
                ]
            },
            {
                id: 'report_quality',
                name: '보고서 작성 활용',
                description: '탐구 보고서 작성 시 AI를 보조 도구로 적절히 활용했는가',
                weight: 20,
                levels: [
                    { score: 5, description: 'AI를 구조화, 표현 개선, 용어 확인 등에 활용하면서 자신의 탐구 과정을 충실히 기록함' },
                    { score: 4, description: '보고서 개선에 AI를 활용하되 자기 탐구 내용이 중심임' },
                    { score: 3, description: '보고서 일부를 AI가 생성하였으나 자기 내용도 포함됨' },
                    { score: 2, description: '보고서 대부분을 AI가 작성함' },
                    { score: 1, description: '보고서 전체를 AI에게 작성 요청함' }
                ]
            }
        ]
    },
    {
        id: 'template_coding',
        name: '코딩/프로그래밍 AI 활용 평가',
        description: '프로그래밍 과제에서 AI를 학습 도구로 활용하는 능력 평가',
        icon: '💻',
        ethicsCheck: COMMON_ETHICS_CHECK,
        criteria: [
            {
                id: 'problem_decomposition',
                name: '문제 분해와 질문 전략',
                description: '문제를 단계별로 분해하여 AI에게 효과적으로 질문했는가',
                weight: 25,
                levels: [
                    { score: 5, description: '문제를 작은 단위로 분해하고, 각 단계에 맞는 구체적 질문을 순차적으로 함' },
                    { score: 4, description: '문제를 나누어 질문하며, 맥락을 제공함' },
                    { score: 3, description: '일부 분해하여 질문했으나 체계적이지 않음' },
                    { score: 2, description: '"이거 만들어줘" 식의 포괄적 요청' },
                    { score: 1, description: '전체 코드를 한 번에 요청함' }
                ]
            },
            {
                id: 'code_understanding',
                name: '코드 이해 및 학습',
                description: 'AI가 제공한 코드를 이해하고 학습하려는 노력이 있었는가',
                weight: 30,
                levels: [
                    { score: 5, description: 'AI 코드의 각 부분에 대해 질문하고, 이해한 내용을 자기 말로 설명하며, 변형을 시도함' },
                    { score: 4, description: '코드 설명을 요청하고 이해하려는 노력이 보임' },
                    { score: 3, description: '일부 질문이 있으나 깊은 이해 시도는 부족함' },
                    { score: 2, description: '코드의 동작을 묻는 질문 없이 받은 코드를 그대로 실행함' },
                    { score: 1, description: '코드 이해 없이 결과물만 가져감' }
                ]
            },
            {
                id: 'debugging',
                name: '디버깅 및 문제 해결',
                description: '오류 발생 시 AI를 디버깅 파트너로 효과적으로 활용했는가',
                weight: 25,
                levels: [
                    { score: 5, description: '에러 메시지와 시도한 내용을 구체적으로 공유하며, AI 제안을 검증 후 적용함' },
                    { score: 4, description: '에러 상황을 설명하고 AI 도움을 받아 해결함' },
                    { score: 3, description: '단순히 에러를 붙여넣고 해결을 요청함' },
                    { score: 2, description: '"안 돼요"처럼 상황 정보가 적은 요청이라, 무엇을 시도했는지 덧붙이면 도움받기 쉬움' },
                    { score: 1, description: '에러가 난 뒤 원인을 묻거나 다시 시도하는 대화가 이어지지 않음' }
                ]
            },
            {
                id: 'code_improvement',
                name: '코드 개선 및 최적화',
                description: 'AI를 활용하여 코드를 개선하고 더 나은 방법을 탐색했는가',
                weight: 20,
                levels: [
                    { score: 5, description: '리팩토링, 성능 개선, 가독성 향상 등 다양한 관점에서 AI와 코드를 개선함' },
                    { score: 4, description: '코드 개선을 위한 질문과 시도가 있음' },
                    { score: 3, description: '일부 개선 요청이 있으나 제한적임' },
                    { score: 2, description: '최초 작동 코드에 만족하고 개선하지 않음' },
                    { score: 1, description: '작동하는 코드를 얻은 뒤 개선·최적화를 묻는 대화가 나타나지 않음' }
                ]
            }
        ]
    }
]

/**
 * 템플릿 ID로 템플릿 찾기
 */
export function getTemplateById(id) {
    return RUBRIC_TEMPLATES.find(t => t.id === id)
}
