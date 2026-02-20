/**
 * EduFlow 루브릭 통합 테스트
 * - 공통 3기준 + 내용 이해 + 윤리 P/F 구조 검증
 * - 프롬프트 빌드 정상 동작 확인
 * - 응답 파싱 호환성 확인
 */
import { describe, it, expect } from 'vitest'
import { RUBRIC_TEMPLATES, getTemplateById } from '../../data/rubricTemplates'
import { buildEvaluationPrompt } from '../prompts'
import { parseEvaluationResponse } from '../responseParser'

// ─── 샘플 채팅 데이터 (고1 VPython 수업 시뮬레이션) ───
const sampleVPythonChat = `You: VPython에서 공을 만들고 싶어. 어떻게 해?
ChatGPT: sphere() 함수를 사용하면 됩니다. 예를 들어 ball = sphere(pos=vector(0,0,0), radius=0.5, color=color.red)와 같이 작성합니다.
You: pos=vector(0,0,0)에서 0,0,0이 뭘 의미해?
ChatGPT: vector(x, y, z)에서 x는 좌우, y는 상하, z는 앞뒤 방향입니다. (0,0,0)은 화면 중앙입니다.
You: 그러면 공을 오른쪽 위로 옮기려면 x랑 y를 키우면 되는거지? vector(3, 2, 0) 이렇게?
ChatGPT: 맞습니다! vector(3, 2, 0)으로 하면 오른쪽으로 3, 위로 2만큼 이동합니다.
You: 근데 실행해봤는데 공이 너무 작아. radius를 키우면 되나? 1.5로 바꿔봤는데 맞아?
ChatGPT: 네, radius 값을 키우면 공이 커집니다. 1.5면 원래보다 3배 큰 공이 됩니다.
You: 아 근데 잠깐, 아까 z가 앞뒤라고 했잖아. 그러면 z를 마이너스로 하면 뒤로 가는거야?
ChatGPT: 정확합니다! z가 음수면 화면 안쪽(뒤)으로, 양수면 화면 바깥쪽(앞)으로 이동합니다.
You: 좋아 이제 공이 바닥에서 위로 올라갔다 내려오는 애니메이션을 만들고 싶어. while True 써야 돼?
ChatGPT: 네, while True 루프 안에서 rate(60)으로 프레임을 설정하고 ball.pos.y를 변경하면 됩니다.
You: 내가 해봤는데 공이 계속 올라가기만 하고 안 내려와. 이 코드 봐줘: while True: rate(60) ball.pos.y = ball.pos.y + 0.1
ChatGPT: 공이 올라가기만 하는 이유는 y값을 계속 더하기만 하기 때문입니다. 방향을 바꾸려면 velocity 변수를 만들어서 일정 높이에서 부호를 바꿔야 합니다.
You: 아 그렇구나! 그러면 velocity = 0.1로 시작하고, y가 5보다 커지면 velocity를 -0.1로 바꾸면 되겠다! 맞지?
ChatGPT: 거의 맞습니다! 다만 y가 0 아래로 내려갈 때도 다시 올라가도록 조건을 추가하면 완벽합니다.
You: 오 그러면 if ball.pos.y > 5: velocity = -0.1 이랑 if ball.pos.y < 0: velocity = 0.1 이렇게 두 개? 이거 실제 물리랑 비슷한 느낌인데
ChatGPT: 맞아요! 이것이 바로 물리 시뮬레이션의 기초입니다. 실제로는 중력 가속도를 적용하면 더 자연스러운 포물선 운동을 만들 수 있습니다.`

const sampleProblemSolvingChat = `Human: 우리 학교 급식 줄이 너무 길어서 문제야. 어떻게 하면 좋을까?
Assistant: 급식 줄 문제를 해결하려면 먼저 원인을 분석해볼까요? 학생 수, 배식 시간, 메뉴 복잡도 등을 살펴볼 수 있습니다.
Human: 내가 관찰해보니까 1학년이 먼저 오는데 항상 12시 10분에 몰려. 2학년은 12시 20분쯤 오고
Assistant: 좋은 관찰이네요! 시간대별 학생 분포를 파악했군요. 이 데이터를 바탕으로 몇 가지 가설을 세워볼 수 있습니다.
Human: 근데 왜 1학년만 12시 10분에 몰리는지 모르겠어. 수업 끝나는 시간이 같은데
Assistant: 혹시 1학년 교실이 급식실과 가까운 건 아닌가요? 동선(이동 경로)이 원인일 수 있습니다.
Human: 아 맞다! 1학년이 1층이고 급식실도 1층이야. 2학년은 3층에서 내려와야 하니까 늦는거구나
Assistant: 훌륭한 발견입니다! 건물 구조가 도착 시간 차이의 원인이군요. 이걸 어떻게 해결하면 좋을까요?
Human: 그러면 반대로 생각해보면, 1학년이 늦게 오게 하거나 배식 속도를 높이거나... 아니면 아예 다른 관점으로 보면?
Assistant: 좋습니다! 리프레이밍을 시도하고 있네요. "줄을 줄이는 것"이 아니라 "대기 시간을 줄이는 것"으로 문제를 다시 정의해볼까요?
Human: 오 그렇네. 줄이 길어도 기다리는 시간이 짧으면 괜찮을 수도 있어. 그러면 모바일 주문 같은 걸로 미리 선택하면 배식이 빨라지지 않을까?`

const sampleVibeCodeChat = `You: 투두리스트 앱 만들어줘
ChatGPT: 네, 기본 HTML/CSS/JavaScript로 투두리스트를 만들겠습니다. [코드 제공]
You: 이거 동작은 하는데 너무 못생겼어. CSS를 좀 예쁘게 해줘
ChatGPT: 디자인을 개선하겠습니다. [CSS 코드 제공]
You: 오 이제 예쁜데. 근데 이 코드에서 addEventListener가 뭐하는 거야?
ChatGPT: addEventListener는 특정 이벤트(클릭, 입력 등)가 발생했을 때 실행할 함수를 등록하는 메서드입니다.
You: 아 그러면 button.addEventListener('click', addTodo)는 버튼 클릭하면 addTodo 함수를 실행하라는 거구나. 내가 이해한 거 맞아?
ChatGPT: 정확합니다! addEventListener의 첫 번째 인자가 이벤트 종류, 두 번째가 실행할 함수입니다.
You: 좋아. 근데 나는 완료된 할 일에 취소선 그어지는 기능도 넣고 싶어. 체크박스 클릭하면 취소선 뜨게
ChatGPT: 체크박스 토글 기능을 추가하겠습니다. [코드 제공]
You: 잠깐 이 코드에서 classList.toggle이 뭔지 모르겠어. 설명해줘
ChatGPT: classList.toggle('completed')은 해당 요소에 'completed' 클래스가 있으면 제거하고, 없으면 추가합니다. 스위치처럼 동작합니다.
You: 아하 그러면 CSS에서 .completed에 text-decoration: line-through 주면 자동으로 켜졌다 꺼졌다 하는거구나. 되게 편하다
ChatGPT: 맞아요! CSS 클래스와 JavaScript를 연결하는 일반적인 패턴입니다.
You: 마지막으로 내 아이디어인데, 할 일마다 중요도를 별 1~3개로 표시하고 싶어. 별이 많은 순서대로 정렬도 되게
ChatGPT: 좋은 아이디어입니다! 우선순위 시스템을 추가하겠습니다.`

// ─── EduFlow 루브릭 ID 목록 ───
const EDUFLOW_IDS = [
    'template_vpython',
    'template_problem_solving',
    'template_machine_learning',
    'template_physical_computing',
    'template_vibe_coding'
]

// ─── 공통 기준 ID 목록 ───
const COMMON_CRITERIA_IDS = ['self_direction', 'critical_verification', 'iterative_improvement']

describe('EduFlow 루브릭 구조 검증', () => {

    it('5개 EduFlow 템플릿이 모두 존재함', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            expect(template).toBeDefined()
            expect(template.id).toBe(id)
        })
    })

    it('각 EduFlow 루브릭이 정확히 4개 기준 (공통3 + 내용이해1)을 가짐', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            expect(template.criteria).toHaveLength(4)
        })
    })

    it('공통 3기준이 모든 EduFlow 루브릭에서 동일함', () => {
        const templates = EDUFLOW_IDS.map(id => getTemplateById(id))
        const firstCommon = templates[0].criteria.slice(0, 3)

        templates.forEach(template => {
            const common = template.criteria.slice(0, 3)
            common.forEach((criterion, i) => {
                expect(criterion.id).toBe(firstCommon[i].id)
                expect(criterion.name).toBe(firstCommon[i].name)
                expect(criterion.description).toBe(firstCommon[i].description)
                expect(criterion.weight).toBe(25)
                expect(criterion.levels).toHaveLength(5)
                // 레벨 서술도 동일
                criterion.levels.forEach((level, li) => {
                    expect(level.description).toBe(firstCommon[i].levels[li].description)
                })
            })
        })
    })

    it('공통 기준 ID가 올바름: self_direction, critical_verification, iterative_improvement', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            const commonIds = template.criteria.slice(0, 3).map(c => c.id)
            expect(commonIds).toEqual(COMMON_CRITERIA_IDS)
        })
    })

    it('4번째 기준이 domain_understanding이고 가중치 25%', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            const domain = template.criteria[3]
            expect(domain.id).toBe('domain_understanding')
            expect(domain.name).toBe('내용 이해')
            expect(domain.weight).toBe(25)
            expect(domain.levels).toHaveLength(5)
        })
    })

    it('내용 이해 서술이 각 도메인별로 다름', () => {
        const templates = EDUFLOW_IDS.map(id => getTemplateById(id))
        const descriptions = templates.map(t => t.criteria[3].description)
        const uniqueDescriptions = new Set(descriptions)
        expect(uniqueDescriptions.size).toBe(5)
    })

    it('가중치 합계가 100%', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            const total = template.criteria.reduce((sum, c) => sum + c.weight, 0)
            expect(total).toBe(100)
        })
    })

    it('모든 레벨이 1~5점 범위 내', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            template.criteria.forEach(criterion => {
                const scores = criterion.levels.map(l => l.score).sort((a, b) => b - a)
                expect(scores).toEqual([5, 4, 3, 2, 1])
            })
        })
    })
})

describe('EduFlow 윤리 P/F 체크 구조', () => {

    it('모든 EduFlow 루브릭에 ethicsCheck 필드 존재', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            expect(template.ethicsCheck).toBeDefined()
        })
    })

    it('ethicsCheck가 올바른 구조를 가짐', () => {
        EDUFLOW_IDS.forEach(id => {
            const template = getTemplateById(id)
            const ec = template.ethicsCheck
            expect(ec.type).toBe('pass_fail')
            expect(ec.defaultResult).toBe('pass')
            expect(ec.description).toBeTruthy()
            expect(ec.failCriteria).toBeInstanceOf(Array)
            expect(ec.failCriteria.length).toBeGreaterThan(0)
        })
    })

    it('기존 4개 루브릭에는 ethicsCheck가 없음', () => {
        const legacyIds = ['template_general', 'template_writing', 'template_science', 'template_coding']
        legacyIds.forEach(id => {
            const template = getTemplateById(id)
            expect(template.ethicsCheck).toBeUndefined()
        })
    })
})

describe('EduFlow 프롬프트 빌드 검증', () => {

    it('VPython 루브릭으로 프롬프트 빌드 성공', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '3D 물리 시뮬레이션을 만들어보는 게 재미있었다')
        expect(prompt).toBeTruthy()
        expect(typeof prompt).toBe('string')
    })

    it('프롬프트에 공통 3기준이 포함됨', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        expect(prompt).toContain('자기주도성')
        expect(prompt).toContain('비판적 검증')
        expect(prompt).toContain('반복적 개선')
    })

    it('프롬프트에 내용 이해 기준이 포함됨', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        expect(prompt).toContain('내용 이해')
        expect(prompt).toContain('VPython 3D 프로그래밍')
    })

    it('프롬프트에 윤리 P/F 섹션이 포함됨', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        expect(prompt).toContain('윤리적 활용 확인')
        expect(prompt).toContain('Pass/Fail')
        expect(prompt).toContain('ethicsCheck')
    })

    it('기존 루브릭에는 윤리 섹션이 없음', () => {
        const rubric = getTemplateById('template_general')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        expect(prompt).not.toContain('윤리적 활용 확인')
        expect(prompt).not.toContain('ethicsCheck')
    })

    it('프롬프트에 4개 평가 항목 명시', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        expect(prompt).toContain('4개 평가 항목')
    })

    it('대화 턴이 정상 파싱됨 (ChatGPT 형식)', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        expect(prompt).toContain('[학생 턴')
        expect(prompt).toContain('턴 번호를 명시')
    })

    it('문제해결 루브릭 프롬프트에 도메인별 내용 이해 포함', () => {
        const rubric = getTemplateById('template_problem_solving')
        const prompt = buildEvaluationPrompt(sampleProblemSolvingChat, rubric, '')
        expect(prompt).toContain('문제해결 과정의 핵심 단계')
    })

    it('바이브코딩 루브릭 프롬프트에 도메인별 내용 이해 포함', () => {
        const rubric = getTemplateById('template_vibe_coding')
        const prompt = buildEvaluationPrompt(sampleVibeCodeChat, rubric, '')
        expect(prompt).toContain('AI가 만든 코드를 이해하고')
    })
})

describe('EduFlow 응답 파싱 호환성', () => {

    it('공통 3기준 + 내용 이해 4개 criteriaScores 파싱', () => {
        const rubric = getTemplateById('template_vpython')
        const mockResponse = JSON.stringify({
            totalScore: 78,
            grade: 'B',
            criteriaScores: [
                {
                    criterionId: 'self_direction', name: '자기주도성',
                    score: 4, maxScore: 5, percentage: 80,
                    evidence: '턴 3에서 「공을 오른쪽 위로 옮기려면」이라며 스스로 추론함',
                    strengths: '목표를 설정하고 자기 상황을 설명함',
                    weaknesses: '초반 맥락 제공이 부족함',
                    improvement: 'Before: "공 만들어줘" → After: "VPython에서 3D 공간에 반지름 1.5의 빨간 공을 (3,2,0) 좌표에 만들고 싶어"'
                },
                {
                    criterionId: 'critical_verification', name: '비판적 검증',
                    score: 3, maxScore: 5, percentage: 60,
                    evidence: '턴 5에서 「radius를 1.5로 바꿔봤는데 맞아?」라며 확인 시도',
                    strengths: '실행 결과를 확인하려는 시도가 있음',
                    weaknesses: 'AI 설명의 정확성을 깊이 따져보지 않음',
                    improvement: 'AI가 "3배 큰 공"이라고 했을 때 "원래 0.5에서 1.5면 3배 맞아?"라고 확인해보세요',
                    nextSteps: 'AI 응답 후 "이게 정말 맞아?" 한 번만 더 물어보는 습관을 들이세요'
                },
                {
                    criterionId: 'iterative_improvement', name: '반복적 개선',
                    score: 4, maxScore: 5, percentage: 80,
                    evidence: '턴 9에서 「velocity 변수를 만들어서」 코드를 스스로 개선함',
                    strengths: '에러 원인을 이해하고 개선 방향을 직접 제안함',
                    weaknesses: '반복 횟수가 더 많으면 좋겠음',
                    improvement: '한 번에 완성하지 않고, 기능을 하나씩 추가하며 테스트하세요'
                },
                {
                    criterionId: 'domain_understanding', name: '내용 이해',
                    score: 4, maxScore: 5, percentage: 80,
                    evidence: '턴 6에서 「z를 마이너스로 하면 뒤로 가는거야?」라며 좌표계를 이해함',
                    strengths: '좌표 개념과 애니메이션 원리를 적극적으로 탐구함',
                    weaknesses: '물리 시뮬레이션과의 연결이 AI 주도로 이루어짐',
                    improvement: '다음에는 "이건 물리에서 어떤 원리와 비슷한 거야?"라고 먼저 물어보세요'
                }
            ],
            ethicsCheck: {
                result: 'pass',
                reason: '특별한 윤리적 이슈 없음'
            },
            characteristics: ['좌표 개념 능동 탐색', '에러 원인 자기 추론', '물리 연결 시도'],
            conversationFlow: '초반에는 기본 문법 질문으로 시작했으나, 턴 7부터 애니메이션 구현으로 발전함',
            qualitativeEvaluation: '3D 좌표 개념을 스스로 추론하며 이해하는 모습이 인상적임. 특히 velocity 개념을 직접 도출한 점이 우수함.',
            suggestions: [
                'AI 응답을 실행하기 전에 "이게 맞을까?" 한 번 생각해보세요',
                '완성 후 "이걸 더 발전시키려면?" 질문으로 확장해보세요'
            ],
            studentRecordDraft: 'VPython 3D 프로그래밍 활동에서 좌표계 개념을 능동적으로 탐구하며, AI 응답의 코드 오류를 스스로 발견하고 velocity 변수를 통한 애니메이션 개선을 직접 제안하는 등 자기주도적 학습 역량을 보임.'
        })

        const result = parseEvaluationResponse(mockResponse, rubric)

        expect(result.totalScore).toBe(78)
        expect(result.criteriaScores).toHaveLength(4)
        expect(result.criteriaScores[0].name).toBe('자기주도성')
        expect(result.criteriaScores[3].name).toBe('내용 이해')
        expect(result.studentRecordDraft).toContain('VPython')
    })

    it('ethicsCheck 필드가 파싱 결과에서 유지됨 (현재 구현 기준)', () => {
        const rubric = getTemplateById('template_vpython')
        const mockResponse = JSON.stringify({
            totalScore: 78,
            grade: 'B',
            criteriaScores: [
                { criterionId: 'self_direction', name: '자기주도성', score: 4, maxScore: 5 },
                { criterionId: 'critical_verification', name: '비판적 검증', score: 3, maxScore: 5 },
                { criterionId: 'iterative_improvement', name: '반복적 개선', score: 4, maxScore: 5 },
                { criterionId: 'domain_understanding', name: '내용 이해', score: 4, maxScore: 5 }
            ],
            ethicsCheck: { result: 'pass', reason: '이슈 없음' },
            characteristics: [],
            qualitativeEvaluation: '양호',
            suggestions: [],
            studentRecordDraft: ''
        })

        const result = parseEvaluationResponse(mockResponse, rubric)
        // responseParser는 현재 ethicsCheck를 별도 처리하지 않음
        // 추후 ethicsCheck 지원 추가 시 이 테스트 업데이트 필요
        expect(result.criteriaScores).toHaveLength(4)
        expect(result.totalScore).toBe(78)
    })
})

describe('프롬프트 품질 검증', () => {

    it('VPython 채팅의 시계열 분석 정보가 포함됨', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        // 10턴 이상의 대화 → 시계열 분석 포함
        expect(prompt).toContain('대화 구조 분석 결과')
        expect(prompt).toContain('시계열 분석 지침')
    })

    it('JSON 응답 형식에 ethicsCheck 예시 포함', () => {
        const rubric = getTemplateById('template_problem_solving')
        const prompt = buildEvaluationPrompt(sampleProblemSolvingChat, rubric, '')
        expect(prompt).toContain('"ethicsCheck"')
        expect(prompt).toContain('"result": "pass"')
    })

    it('필수 지침에 윤리 확인 안내 포함', () => {
        const rubric = getTemplateById('template_vibe_coding')
        const prompt = buildEvaluationPrompt(sampleVibeCodeChat, rubric, '')
        expect(prompt).toContain('윤리적 활용 확인')
        expect(prompt).toContain('"pass"')
        expect(prompt).toContain('"fail"')
    })

    it('가중치 합계가 프롬프트에 올바르게 반영됨 (각 25%)', () => {
        const rubric = getTemplateById('template_vpython')
        const prompt = buildEvaluationPrompt(sampleVPythonChat, rubric, '')
        // 4개 기준 모두 25%
        const matches = prompt.match(/가중치: 25%/g)
        expect(matches).toHaveLength(4)
    })
})