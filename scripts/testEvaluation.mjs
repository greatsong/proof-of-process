/**
 * EduFlow 루브릭 실제 API 테스트
 * 실행: node scripts/testEvaluation.mjs
 */

// ─── 루브릭 데이터 직접 정의 (ESM import 대신) ───
const COMMON_CRITERIA = [
    {
        id: 'self_direction', name: '자기주도성',
        description: '스스로 목표를 설정하고 AI와의 대화를 주도적으로 이끌었는가',
        weight: 25,
        levels: [
            { score: 5, description: '학습 목표를 설정하고, 맥락을 체계적으로 전달하며 대화를 주도함' },
            { score: 4, description: '자기 상황과 원하는 것을 설명하며 능동적으로 소통함' },
            { score: 3, description: '기본적인 질문은 하지만 AI 주도로 대화가 진행됨' },
            { score: 2, description: 'AI에게 결과물만 요청하고 수동적으로 따라감' },
            { score: 1, description: '"해줘" 수준의 요청만 하거나 복사-붙여넣기에 그침' }
        ]
    },
    {
        id: 'critical_verification', name: '비판적 검증',
        description: 'AI 응답을 그대로 받아들이지 않고 따져보고 확인했는가',
        weight: 25,
        levels: [
            { score: 5, description: 'AI 응답의 정확성과 한계를 따져보고, 의심스러운 부분을 질문하여 수정함' },
            { score: 4, description: 'AI 응답을 확인하려는 시도가 있고 일부 오류를 발견함' },
            { score: 3, description: '간헐적으로 의문을 제기하지만 대체로 수용함' },
            { score: 2, description: 'AI 응답을 거의 그대로 받아들임' },
            { score: 1, description: '전혀 검증하지 않고 복사하여 사용함' }
        ]
    },
    {
        id: 'iterative_improvement', name: '반복적 개선',
        description: 'AI 응답을 바탕으로 질문을 발전시키고 결과를 개선했는가',
        weight: 25,
        levels: [
            { score: 5, description: 'AI 응답을 분석하고 구체적 수정사항을 전달하며 여러 차례 개선함' },
            { score: 4, description: '응답을 참고하여 후속 질문을 발전시킴' },
            { score: 3, description: '일부 수정 요청이 있으나 구체성이 부족함' },
            { score: 2, description: '한두 번 주고받고 더 이상 개선하지 않음' },
            { score: 1, description: '첫 응답을 그대로 사용하고 대화가 발전하지 않음' }
        ]
    }
]

const vpythonRubric = {
    name: 'VPython / 컴퓨팅 사고력 평가',
    ethicsCheck: {
        type: 'pass_fail', defaultResult: 'pass',
        description: 'AI 활용의 윤리적 측면 확인',
        failCriteria: ['AI 생성물을 자기 것처럼 그대로 제출', '유해하거나 부적절한 콘텐츠 생성 시도', '타인의 과제를 대리 수행하기 위한 사용']
    },
    criteria: [
        ...COMMON_CRITERIA,
        {
            id: 'domain_understanding', name: '내용 이해',
            description: 'VPython 3D 프로그래밍의 핵심 개념을 AI와 대화하며 이해했는가',
            weight: 25,
            levels: [
                { score: 5, description: '좌표, 객체, 애니메이션 원리를 이해하고 AI에게 자기 말로 확인함' },
                { score: 4, description: '주요 개념을 AI에게 질문하고 이해하려 노력함' },
                { score: 3, description: '코드를 따라하지만 개념 이해가 표면적임' },
                { score: 2, description: '이해 없이 AI 코드를 그대로 사용함' },
                { score: 1, description: '개념 이해에 관심이 없음' }
            ]
        }
    ]
}

const vibeCodingRubric = {
    name: 'AI 협업 코딩 (바이브 코딩) 평가',
    ethicsCheck: vpythonRubric.ethicsCheck,
    criteria: [
        ...COMMON_CRITERIA,
        {
            id: 'domain_understanding', name: '내용 이해',
            description: 'AI가 만든 코드를 이해하고 자기 아이디어를 프로그램에 반영했는가',
            weight: 25,
            levels: [
                { score: 5, description: '코드 구조를 이해하고 자기 아이디어를 구체적으로 프로그램에 반영함' },
                { score: 4, description: '코드의 주요 부분을 이해하고 자기 의견을 수정사항으로 전달함' },
                { score: 3, description: '코드를 대략 이해하지만 자기 아이디어 반영은 부족함' },
                { score: 2, description: '코드를 읽지 않고 AI가 주는 대로 사용함' },
                { score: 1, description: '코드 이해나 아이디어 반영 시도가 없음' }
            ]
        }
    ]
}

// ─── 샘플 채팅 데이터 ───
const vpythonChat = `You: 선생님이 VPython으로 태양계를 만들라고 했는데 어떻게 시작해야 해?
ChatGPT: 태양계를 만들려면 먼저 VPython의 sphere 객체를 사용해서 태양과 행성을 만들면 됩니다.

You: sphere로 태양을 만들었는데 너무 작아. pos는 뭐야?
ChatGPT: pos는 position의 약자로 3D 공간에서의 위치를 나타냅니다. vector(x, y, z) 형태로 지정합니다.

You: 아 그러면 pos=vector(0,0,0)이 원점이고 radius=2로 하면 반지름이 2인거지? 근데 지구는 어디에 놓아야 해?
ChatGPT: 맞습니다! 지구를 태양에서 떨어뜨리려면 pos=vector(10,0,0) 처럼 x축으로 이동시키면 됩니다.

You: 잠깐 근데 실제 태양계에서 태양-지구 거리가 엄청 먼데 이거 비율을 맞춰야 하는거 아니야? 그대로 하면 화면에 안 보일 것 같은데
ChatGPT: 좋은 지적입니다! 실제 비율로 하면 행성이 점처럼 보이므로, 교육용으로는 비율을 조절합니다.

You: 오케이 그러면 태양 radius=2, 지구 radius=0.5, pos=vector(10,0,0)으로 했어. 근데 이제 지구가 태양 주위를 돌게 하고 싶어. while문 쓰면 되나?
ChatGPT: 네! while True 루프 안에서 rate(100)으로 속도를 조절하고, 각도를 증가시키며 cos, sin으로 위치를 업데이트하면 됩니다.

You: 음 코드를 봤는데 cos(theta)랑 sin(theta)가 왜 필요한지 모르겠어. 그냥 x좌표만 바꾸면 안돼?
ChatGPT: x좌표만 바꾸면 좌우로 왔다갔다만 합니다. 원운동을 하려면 x=r*cos(θ), z=r*sin(θ)로 두 축을 동시에 변화시켜야 합니다.

You: 아!! 수학시간에 배운 거다. x=rcos(θ), y=rsin(θ)면 원이 되는 거구나. 그러면 theta를 0.01씩 증가시키면 천천히 도는거지? 근데 GPT가 준 코드에서 rate(100)이 뭐야?
ChatGPT: rate(100)은 1초에 최대 100번 루프를 실행하라는 뜻입니다.

You: 지구가 도는건 됐는데 이제 달도 추가하고 싶어. 달은 지구 주위를 돌잖아. 근데 지구가 이미 움직이고 있으니까 달의 pos를 어떻게 계산해야 해?
ChatGPT: 달의 위치 = 지구의 현재 위치 + 달의 상대적 회전 위치입니다.

You: 와 진짜 되네!! 근데 달이 너무 빨라서 이상해. theta 증가량을 다르게 해야 하나? 실제로도 달은 지구보다 느리게 도나?
ChatGPT: 네, 실제로 지구는 1년에 태양을 한 바퀴 돌고, 달은 약 27일에 지구를 한 바퀴 돕니다.`

const vibeCodingChatLow = `You: 계산기 앱 만들어줘
ChatGPT: 네, HTML/CSS/JavaScript로 계산기를 만들어 드리겠습니다.

You: 안 돼
ChatGPT: 어떤 부분이 안 되시나요? 에러 메시지가 있다면 알려주세요.

You: 그냥 안 돼. 다시 만들어줘
ChatGPT: 전체 코드를 수정해서 다시 보내드리겠습니다.

You: 이번에는 됐어. 근데 버튼이 이상해. 예쁘게 해줘
ChatGPT: CSS를 수정해서 버튼을 예쁘게 만들었습니다.

You: 오 좋아. 이거 완성이야?
ChatGPT: 기본 사칙연산 계산기는 완성되었습니다.

You: 다 됐어 고마워
ChatGPT: 천만에요!

You: 아 맞다 이름 넣어줘. 김철수의 계산기로
ChatGPT: 제목을 "김철수의 계산기"로 변경했습니다.`

const reflection = '처음에는 어려웠지만 수학 시간에 배운 삼각함수가 여기서 쓰이는걸 알게 되어 신기했습니다.'

// ─── 간이 프롬프트 빌더 ───
function buildPrompt(chatContent, rubric, reflection) {
    const criteriaDesc = rubric.criteria.map(c => {
        const levels = c.levels.map(l => `  - ${l.score}점: ${l.description}`).join('\n')
        return `### ${c.name} (가중치: ${c.weight}%)\n설명: ${c.description}\n평가 수준:\n${levels}`
    }).join('\n\n')

    const criteriaNames = rubric.criteria.map((c, i) => `${i + 1}. ${c.name}`).join('\n')

    const ethicsSection = rubric.ethicsCheck
        ? '\n## 윤리적 활용 확인 (Pass/Fail)\n이 루브릭에는 윤리적 활용 확인이 포함됩니다. 다음에 해당하면 Fail입니다:\n' +
          rubric.ethicsCheck.failCriteria.map(c => `- ${c}`).join('\n') + '\n\n특별한 윤리적 이슈가 없으면 Pass로 판정하세요.\n'
        : ''

    const ethicsJson = rubric.ethicsCheck
        ? `  "ethicsCheck": {\n    "result": "pass",\n    "reason": "특별한 윤리적 이슈 없음"\n  },\n`
        : ''

    return `당신은 AI 채팅 활용 능력을 평가하는 교육 전문가입니다.

# 평가 루브릭: ${rubric.name}

${criteriaDesc}
${ethicsSection}
# 학생 자기평가
${reflection || '(없음)'}

⚠️ 주의: 위 '학생 자기평가'는 정성 평가에만 반영하고, 점수 산정에는 반영하지 마세요.

# 평가할 채팅 기록
---
${chatContent}
---

# 평가 결과 형식

⚠️ 중요: 아래 ${rubric.criteria.length}개 평가 항목을 모두 평가해야 합니다:
${criteriaNames}

반드시 다음 JSON 형식으로만 응답해주세요.

\`\`\`json
{
  "totalScore": 85,
  "grade": "B+",
  "criteriaScores": [
    {
      "criterionId": "criterion_1",
      "name": "항목명",
      "score": 4,
      "maxScore": 5,
      "percentage": 80,
      "evidence": "채팅에서 직접 인용: 「학생이 입력한 문장」",
      "strengths": "잘한 점",
      "weaknesses": "부족한 점",
      "improvement": "Before → After 형식",
      "nextSteps": "3점 이하일 때만 작성"
    }
  ],
  "characteristics": ["특징1", "특징2"],
  "qualitativeEvaluation": "정성 평가",
  "suggestions": ["실천 방안1", "실천 방안2"],
${ethicsJson}  "studentRecordDraft": "생활기록부 초안"
}
\`\`\`

# 필수 지침
1. criteriaScores는 반드시 ${rubric.criteria.length}개
2. evidence에 반드시 학생 채팅 원문을 「」로 직접 인용
3. improvement는 Before → After 형식
4. nextSteps는 3점 이하일 때만 작성, 4점 이상이면 빈 문자열
5. totalScore는 가중치 적용 100점 만점
6. evidence, strengths, weaknesses, improvement 필드는 비어있으면 안 됨
7. 반드시 유효한 JSON 형식으로 응답
${rubric.ethicsCheck ? '8. 윤리적 활용 확인: 특별한 이슈 없으면 "pass"로 판정' : ''}`
}

// ─── API 호출 ───
async function callClaude(prompt, apiKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }]
        })
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`API Error ${res.status}: ${JSON.stringify(err)}`)
    }
    const data = await res.json()
    return data.content[0].text
}

function parseResponse(text) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = match ? match[1].trim() : text.trim()
    return JSON.parse(jsonStr)
}

// ─── 메인 실행 ───
import { readFileSync } from 'fs'
const envContent = readFileSync(new URL('../../eduflow/.env', import.meta.url), 'utf-8')
const API_KEY = envContent.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim() || ''
if (!API_KEY) { console.error('ANTHROPIC_API_KEY not found'); process.exit(1) }

async function runTest(label, rubric, chat, refl) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 ${label}`)
    console.log('='.repeat(60))

    const prompt = buildPrompt(chat, rubric, refl)
    console.log(`프롬프트 길이: ${prompt.length}자`)

    console.log('API 호출 중...')
    const raw = await callClaude(prompt, API_KEY)
    const result = parseResponse(raw)

    console.log(`\n총점: ${result.totalScore}점 | 등급: ${result.grade}`)
    if (result.ethicsCheck) {
        console.log(`윤리 체크: ${result.ethicsCheck.result} (${result.ethicsCheck.reason})`)
    }
    console.log(`특징: ${(result.characteristics || []).join(', ')}`)
    console.log('-'.repeat(60))

    for (const cs of result.criteriaScores) {
        console.log(`\n📌 ${cs.name}: ${cs.score}/5 (${cs.percentage}%)`)
        console.log(`  근거: ${cs.evidence}`)
        console.log(`  강점: ${cs.strengths}`)
        console.log(`  약점: ${cs.weaknesses}`)
        console.log(`  개선: ${cs.improvement}`)
        if (cs.nextSteps) console.log(`  🎯 다음 단계: ${cs.nextSteps}`)
    }

    console.log(`\n${'─'.repeat(60)}`)
    console.log(`정성 평가: ${result.qualitativeEvaluation}`)
    console.log(`\n제안: ${(result.suggestions || []).join(' / ')}`)
    console.log(`\n생기부 초안: ${result.studentRecordDraft}`)
    console.log('='.repeat(60))

    return result
}

async function main() {
    try {
        console.log('🚀 EduFlow 루브릭 실제 API 평가 테스트 시작\n')

        const [r1, r2] = await Promise.all([
            runTest('테스트 1: VPython 고품질 채팅', vpythonRubric, vpythonChat, reflection),
            runTest('테스트 2: 바이브코딩 저품질 채팅', vibeCodingRubric, vibeCodingChatLow, '')
        ])

        // ─── 품질 평가 ───
        console.log('\n\n' + '█'.repeat(60))
        console.log('📋 결과 품질 평가')
        console.log('█'.repeat(60))

        const checks = []

        // 1. 점수 변별력
        const scoreDiff = r1.totalScore - r2.totalScore
        checks.push({ name: '점수 변별력 (고-저 차이)', pass: scoreDiff >= 20, value: `${scoreDiff}점 차이 (고:${r1.totalScore} / 저:${r2.totalScore})` })

        // 2. 기준 수 정확성
        checks.push({ name: 'VPython 기준 수 (4개)', pass: r1.criteriaScores.length === 4, value: r1.criteriaScores.length })
        checks.push({ name: '바이브코딩 기준 수 (4개)', pass: r2.criteriaScores.length === 4, value: r2.criteriaScores.length })

        // 3. 공통 기준 포함
        const r1Names = r1.criteriaScores.map(c => c.name)
        checks.push({ name: '공통 기준 "자기주도성" 포함', pass: r1Names.some(n => n.includes('자기주도')), value: r1Names.join(', ') })
        checks.push({ name: '공통 기준 "비판적 검증" 포함', pass: r1Names.some(n => n.includes('비판적')), value: '' })
        checks.push({ name: '공통 기준 "반복적 개선" 포함', pass: r1Names.some(n => n.includes('반복적')), value: '' })

        // 4. 원문 인용 여부
        const hasQuote1 = r1.criteriaScores.some(cs => cs.evidence.includes('「'))
        const hasQuote2 = r2.criteriaScores.some(cs => cs.evidence.includes('「'))
        checks.push({ name: 'VPython 원문 인용 (「」)', pass: hasQuote1, value: hasQuote1 ? '있음' : '없음' })
        checks.push({ name: '바이브코딩 원문 인용 (「」)', pass: hasQuote2, value: hasQuote2 ? '있음' : '없음' })

        // 5. 윤리 체크
        checks.push({ name: '윤리 체크 결과 포함', pass: !!r1.ethicsCheck, value: r1.ethicsCheck?.result || '없음' })

        // 6. 저품질에 nextSteps 있는지
        const lowScoreItems = r2.criteriaScores.filter(cs => cs.score <= 3)
        const hasNextSteps = lowScoreItems.some(cs => cs.nextSteps && cs.nextSteps.trim())
        checks.push({ name: '저품질 채팅에 nextSteps 제공', pass: hasNextSteps, value: `${lowScoreItems.length}개 항목 3점 이하` })

        // 7. 생기부 초안
        checks.push({ name: '생기부 초안 작성됨', pass: r1.studentRecordDraft.length > 20, value: `${r1.studentRecordDraft.length}자` })

        // 결과 출력
        let passCount = 0
        for (const c of checks) {
            const icon = c.pass ? '✅' : '❌'
            passCount += c.pass ? 1 : 0
            console.log(`${icon} ${c.name}: ${c.value}`)
        }
        console.log(`\n총 ${checks.length}개 항목 중 ${passCount}개 통과 (${Math.round(passCount/checks.length*100)}%)`)
        console.log('█'.repeat(60))

    } catch (err) {
        console.error('❌ 테스트 실패:', err.message)
        if (err.message.includes('401')) console.error('→ API 키가 만료되었거나 올바르지 않습니다.')
    }
}

main()
