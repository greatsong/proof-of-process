/**
 * 실제 API 호출을 통한 EduFlow 루브릭 평가 테스트
 * 실행: npx vitest run src/services/__tests__/liveEvaluation.test.js
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { buildEvaluationPrompt } from '../prompts'
import { parseEvaluationResponse } from '../responseParser'
import { RUBRIC_TEMPLATES } from '../../data/rubricTemplates'

// API 키를 eduflow/.env에서 읽기
const envContent = readFileSync('/Users/greatsong/greatsong-project/eduflow/.env', 'utf-8')
const CLAUDE_API_KEY = envContent.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim() || ''

// ─── 고등학생 VPython 수업 샘플 채팅 (9턴) ───
const vpythonChat = `You: 선생님이 VPython으로 태양계를 만들라고 했는데 어떻게 시작해야 해?
ChatGPT: 태양계를 만들려면 먼저 VPython의 sphere 객체를 사용해서 태양과 행성을 만들면 됩니다. 기본 구조는 이렇습니다...

You: sphere로 태양을 만들었는데 너무 작아. pos는 뭐야?
ChatGPT: pos는 position의 약자로 3D 공간에서의 위치를 나타냅니다. vector(x, y, z) 형태로 지정합니다. 태양을 크게 하려면 radius를 조절하세요.

You: 아 그러면 pos=vector(0,0,0)이 원점이고 radius=2로 하면 반지름이 2인거지? 근데 지구는 어디에 놓아야 해?
ChatGPT: 맞습니다! 지구를 태양에서 떨어뜨리려면 pos=vector(10,0,0) 처럼 x축으로 이동시키면 됩니다.

You: 잠깐 근데 실제 태양계에서 태양-지구 거리가 엄청 먼데 이거 비율을 맞춰야 하는거 아니야? 그대로 하면 화면에 안 보일 것 같은데
ChatGPT: 좋은 지적입니다! 실제 비율로 하면 행성이 점처럼 보이므로, 교육용으로는 비율을 조절합니다. 거리는 5~15 단위, 크기는 0.5~2 단위 정도로 설정하면 보기 좋습니다.

You: 오케이 그러면 태양 radius=2, 지구 radius=0.5, pos=vector(10,0,0)으로 했어. 근데 이제 지구가 태양 주위를 돌게 하고 싶어. while문 쓰면 되나?
ChatGPT: 네! while True 루프 안에서 rate(100)으로 속도를 조절하고, 각도를 조금씩 증가시키며 cos, sin으로 위치를 업데이트하면 됩니다.

You: 음 코드를 봤는데 cos(theta)랑 sin(theta)가 왜 필요한지 모르겠어. 그냥 x좌표만 바꾸면 안돼?
ChatGPT: x좌표만 바꾸면 좌우로 왔다갔다만 합니다. 원운동을 하려면 x=r*cos(θ), y=r*sin(θ) 또는 z=r*sin(θ)로 두 축을 동시에 변화시켜야 합니다. 원의 매개변수 방정식이에요.

You: 아!! 수학시간에 배운 거다. x=rcos(θ), y=rsin(θ)면 원이 되는 거구나. 그러면 theta를 0.01씩 증가시키면 천천히 도는거지? 근데 GPT가 준 코드에서 rate(100)이 뭐야?
ChatGPT: rate(100)은 1초에 최대 100번 루프를 실행하라는 뜻입니다. 이걸 안 쓰면 너무 빨라서 애니메이션이 안 보여요. rate 값이 클수록 빠르게 움직입니다.

You: 지구가 도는건 됐는데 이제 달도 추가하고 싶어. 달은 지구 주위를 돌잖아. 근데 지구가 이미 움직이고 있으니까 달의 pos를 어떻게 계산해야 해? 지구 pos + 달의 회전 이렇게?
ChatGPT: 정확합니다! 달의 위치 = 지구의 현재 위치 + 달의 상대적 회전 위치입니다. moon.pos = earth.pos + vector(moon_r*cos(moon_theta), 0, moon_r*sin(moon_theta)) 이런 식으로요.

You: 와 진짜 되네!! 근데 달이 너무 빨라서 이상해. theta 증가량을 다르게 해야 하나? 실제로도 달은 지구보다 느리게 도나?
ChatGPT: 네, 실제로 지구는 1년에 태양을 한 바퀴 돌고, 달은 약 27일에 지구를 한 바퀴 돕니다. theta 증가량(각속도)을 다르게 해서 표현할 수 있습니다.`

// ─── 고등학생 바이브코딩 샘플 채팅 (7턴, 낮은 품질) ───
const vibeCodingChatLow = `You: 계산기 앱 만들어줘
ChatGPT: 네, HTML/CSS/JavaScript로 계산기를 만들어 드리겠습니다. [코드 제공]

You: 안 돼
ChatGPT: 어떤 부분이 안 되시나요? 에러 메시지가 있다면 알려주세요.

You: 그냥 안 돼. 다시 만들어줘
ChatGPT: 전체 코드를 수정해서 다시 보내드리겠습니다. [수정 코드]

You: 이번에는 됐어. 근데 버튼이 이상해. 예쁘게 해줘
ChatGPT: CSS를 수정해서 버튼을 예쁘게 만들었습니다. [CSS 코드]

You: 오 좋아. 이거 완성이야?
ChatGPT: 기본 사칙연산 계산기는 완성되었습니다. 추가 기능을 원하시면 말씀해주세요.

You: 다 됐어 고마워
ChatGPT: 천만에요! 계산기를 잘 활용하세요.

You: 아 맞다 이름 넣어줘. 김철수의 계산기로
ChatGPT: 제목을 "김철수의 계산기"로 변경했습니다.`

const reflection = '처음에는 어려웠지만 수학 시간에 배운 삼각함수가 여기서 쓰이는걸 알게 되어 신기했습니다.'

describe('실제 API 평가 테스트', () => {
    // VPython 루브릭 (고품질 채팅)
    it('VPython 루브릭 + 고품질 채팅 → 평가 보고서 생성', async () => {
        const rubric = RUBRIC_TEMPLATES.find(t => t.id === 'template_vpython')
        expect(rubric).toBeDefined()
        expect(rubric.criteria).toHaveLength(4) // 공통3 + 내용이해1
        expect(rubric.ethicsCheck).toBeDefined()

        const prompt = buildEvaluationPrompt(vpythonChat, rubric, reflection)

        // 프롬프트 구조 검증
        expect(prompt).toContain('자기주도성')
        expect(prompt).toContain('비판적 검증')
        expect(prompt).toContain('반복적 개선')
        expect(prompt).toContain('내용 이해')
        expect(prompt).toContain('윤리적 활용 확인')
        expect(prompt).toContain('가중치: 25%')

        // Claude API 호출
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            })
        })

        expect(response.ok).toBe(true)
        const data = await response.json()
        const rawText = data.content[0].text

        // 응답 파싱
        const result = parseEvaluationResponse(rawText, rubric)

        // ─── 구조 검증 ───
        expect(result.totalScore).toBeGreaterThan(0)
        expect(result.totalScore).toBeLessThanOrEqual(100)
        expect(result.grade).toBeTruthy()
        expect(result.criteriaScores).toHaveLength(4)
        expect(result.characteristics).toBeDefined()
        expect(result.qualitativeEvaluation).toBeTruthy()
        expect(result.studentRecordDraft).toBeTruthy()

        // ─── 기준별 검증 ───
        const criteriaNames = result.criteriaScores.map(c => c.name)
        expect(criteriaNames).toContain('자기주도성')
        expect(criteriaNames).toContain('비판적 검증')
        expect(criteriaNames).toContain('반복적 개선')
        expect(criteriaNames).toContain('내용 이해')

        for (const cs of result.criteriaScores) {
            expect(cs.score).toBeGreaterThanOrEqual(1)
            expect(cs.score).toBeLessThanOrEqual(5)
            expect(cs.evidence).toBeTruthy()
            expect(cs.evidence).not.toBe('근거가 제공되지 않았습니다.')
            expect(cs.strengths).toBeTruthy()
            expect(cs.improvement).toBeTruthy()
        }

        // ─── 점수 품질 검증 (고품질 채팅이므로 높은 점수 기대) ───
        expect(result.totalScore).toBeGreaterThanOrEqual(60)

        // ─── 원문 인용 포함 여부 ───
        const hasQuotation = result.criteriaScores.some(cs =>
            cs.evidence.includes('「') || cs.evidence.includes('」')
        )
        expect(hasQuotation).toBe(true)

        // ─── 보고서 출력 ───
        console.log('\n' + '='.repeat(60))
        console.log('📊 VPython 평가 보고서 (고품질 채팅)')
        console.log('='.repeat(60))
        console.log(`총점: ${result.totalScore}점 | 등급: ${result.grade}`)
        console.log(`특징: ${result.characteristics.join(', ')}`)
        console.log('-'.repeat(60))
        for (const cs of result.criteriaScores) {
            console.log(`\n📌 ${cs.name}: ${cs.score}/5 (${cs.percentage}%)`)
            console.log(`  근거: ${cs.evidence.substring(0, 100)}...`)
            console.log(`  강점: ${cs.strengths}`)
            console.log(`  개선: ${cs.improvement.substring(0, 80)}...`)
            if (cs.nextSteps) console.log(`  다음 단계: ${cs.nextSteps}`)
        }
        console.log('-'.repeat(60))
        console.log(`정성 평가: ${result.qualitativeEvaluation}`)
        console.log(`생기부 초안: ${result.studentRecordDraft}`)
        console.log('='.repeat(60))
    }, 60000)

    // 바이브코딩 루브릭 (저품질 채팅)
    it('바이브코딩 루브릭 + 저품질 채팅 → 낮은 점수 보고서', async () => {
        const rubric = RUBRIC_TEMPLATES.find(t => t.id === 'template_vibe_coding')
        expect(rubric).toBeDefined()

        const prompt = buildEvaluationPrompt(vibeCodingChatLow, rubric, '')

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            })
        })

        expect(response.ok).toBe(true)
        const data = await response.json()
        const result = parseEvaluationResponse(data.content[0].text, rubric)

        // 저품질 채팅이므로 낮은 점수 기대
        expect(result.totalScore).toBeLessThanOrEqual(50)
        expect(result.criteriaScores).toHaveLength(4)

        // nextSteps가 있어야 함 (3점 이하 항목)
        const lowScores = result.criteriaScores.filter(cs => cs.score <= 3)
        expect(lowScores.length).toBeGreaterThan(0)

        console.log('\n' + '='.repeat(60))
        console.log('📊 바이브코딩 평가 보고서 (저품질 채팅)')
        console.log('='.repeat(60))
        console.log(`총점: ${result.totalScore}점 | 등급: ${result.grade}`)
        console.log('-'.repeat(60))
        for (const cs of result.criteriaScores) {
            console.log(`📌 ${cs.name}: ${cs.score}/5`)
            console.log(`  근거: ${cs.evidence.substring(0, 100)}...`)
            if (cs.nextSteps) console.log(`  🎯 다음 단계: ${cs.nextSteps}`)
        }
        console.log(`\n정성 평가: ${result.qualitativeEvaluation}`)
        console.log('='.repeat(60))
    }, 60000)
})
