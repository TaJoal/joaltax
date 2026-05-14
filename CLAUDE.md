# 💸 거지같은연말정산 (Hellish Year-End Tax Settlement)

## 🎯 컨셉

> **"올해도 토해낼 것 같다면?"**

월급쟁이가 **연봉 + 카드 평균 사용액 + 부양가족**만 입력하면, **내년 2월에 받을 환급액 또는 더 내야 할 추가납부액을 즉시 보여주는** 모바일 전용 절세 시뮬레이터.

### 타겟 사용자
**30대 후반 ~ 50대 직장인** — 가족·자녀·부모 부양으로 추가납부 케이스 많은 세대.
청년(만 19~34세)과 시니어(만 65세 이상)는 별도 추천 정책 자동 노출.

### 핵심 가치
1. **3분 안에 결과 확인** — 온보딩 2단계(나이 → 급여명세서)만 따라가면 결과 확인
2. **단순 뺄셈식 시각화** — 점수카드: "올해 내야 할 세금 − 미리 낸 세금 = 환급/추가납부" — 결정세액(어차피 낼 세금) 메인, 차액을 게임 점수처럼
3. **항상 보이는 카운터** — 어느 화면에서든 TopBar에 환급/추가납부 + 4단계 날씨 무드 표시 (storm/rain/sunny/bright). 값 변화 시 펄스 + 변동분 플로팅
4. **즉시 자동 저장** — 가족 추가, 공제 입력 변경 시 디바운스(500ms) 후 자동 저장. 별도 저장 버튼 없음
5. **공제 활용률 + 액션** — Result에 한도 대비 사용량 시각화, 행 클릭하면 입력 화면으로 즉시 이동
6. **프라이버시 우선** — 모든 데이터 localStorage에만, 외부 전송 없음
7. **참고용 추정치** — 실제 홈택스와 차이 있을 수 있음

### 톤 & 보이스
- 친근하고 솔직한 어조 ("이번엔 당하지 말자", "또 토해낼 거 같아요")
- **AI 시대 차별화** — Claude 따뜻한 크림(#faf9f5) + 코랄(#cc785c) 톤 (차가운 슬레이트 의도적 회피)
- 데코 이모지 최소화 (기능 아이콘만), 좌측 컬러 바 패턴
- 절대 가르치려 들지 않음. 사용자를 "당하는 입장"에서 함께 편들기

---

## 📱 플랫폼 컨셉

- **모바일 전용 하이브리드 앱** — UI는 모두 웹(React), 추후 Capacitor 등으로 iOS/Android 래핑
- **480px 최대폭 컨테이너** — 데스크톱에서 봐도 모바일 폼팩터 유지
- **PWA 매니페스트 포함** — `public/manifest.webmanifest`, 홈 화면 추가 가능
- **iOS safe-area-inset 지원** — `--sat/--sab/--sal/--sar` CSS 변수
- **Pretendard Variable** — 한국어 가독성 최적화

---

## 🛠 기술 스택

### Frontend
- **React 18 + Vite 5 + TypeScript** (strict)
- **Zustand v5** — 가벼운 상태 관리 (authStore, yearStore, dataStore)
- **React Router v6** — 라우팅 + `useSearchParams`로 탭 동기화
- **Ant Design 5** — 폼, Drawer, Modal, message 등 (모바일에 맞게 토큰/테마 커스텀)
- **Recharts** — 월별 차트, 비교 차트, 컬러 stacked bar
- **dayjs** — 날짜 포맷팅 (`relativeTime` 플러그인)
- **Pretendard Variable** — CDN 로드 (한국 폰트)

### 데이터 저장
- **localStorage 전용** — 외부 서버 전송 없음, 모든 데이터는 사용자 기기에만
- Repository 패턴 적용 → 추후 native storage로 교체 용이

### 세법 데이터
- **JSON 파일로 관리** — `/src/data/tax-rules/{year}.json` (현재 2024/2025/2026)
- `getTaxRules(year)`로 조회, 없는 연도는 가장 가까운 이전 연도로 fallback

---

## 📁 프로젝트 구조

```
src/
├── components/
│   ├── common/
│   │   ├── MoneyInput.tsx          # 금액 입력 (천단위 자동 포맷, iOS 줌 방지)
│   │   └── Segmented.tsx           # 모바일 pill 토글
│   ├── layout/
│   │   ├── TopBar.tsx              # 상단 sticky — 연도pill + TaxCounter + 프로필 메뉴
│   │   ├── TaxCounter.tsx          # 항상 보이는 환급/추가납부 + 날씨 애니메이션 + 변동분 팝업
│   │   └── BottomNav.tsx           # 하단 5탭 (홈/공제/급여/계산/비교)
│   ├── dashboard/
│   │   ├── TaxFlowCard.tsx         # "세금이 이렇게 줄었어요" — 캐스케이드 시각화
│   │   └── RefundTips.tsx          # "환급 더 받는 방법" / "이번엔 당하지 말자" 팁
│   ├── deduction/
│   │   ├── DeductionExplainer.tsx  # "공제? 소득공제? 세액공제?" 접이식 설명
│   │   ├── CardLimitsPanel.tsx     # 신용/체크/현금 분리 + 별도 한도 시각화
│   │   ├── MonthlyCardEditor.tsx   # 월별 카드 사용 입력 (chip-based 월 선택)
│   │   ├── FamilyEditor.tsx        # 부양가족 추가/편집
│   │   ├── ExpenseSheet.tsx        # 의료비/교육비/기부금 항목별 입력 바텀 시트
│   │   └── expenseCategories.ts    # 카테고리 정의 (MEDICAL/EDUCATION/DONATION)
│   └── salary/
│       └── BonusEditor.tsx         # 상여금 추가/편집
├── pages/
│   ├── Login.tsx                   # "거지같은연말정산" 로그인 (프로필 선택 + privacy/disclaimer)
│   ├── Onboarding.tsx              # 2단계 (나이 → 급여명세서) — 급여+식대 두 개만 입력
│   ├── Dashboard.tsx               # 점수카드(뺄셈식 + 무드) + 청년 카드 + 추천 체크리스트
│   ├── SalaryInput.tsx             # 빠른 입력 / 상여 / 월별 보기
│   ├── DeductionInput.tsx          # [소득공제] [세액공제] [가족] 탭 구조
│   ├── Result.tsx                  # 단계별 계산 + 공제 활용률(클릭→입력) + 카드 공제 단계 차트
│   └── Comparison.tsx              # 연도 비교 (historical/whatif 2모드)
├── repositories/
│   ├── interfaces/                 # IProfileRepository, IYearDataRepository
│   ├── localStorage/               # LocalStorageProfileRepository, LocalStorageYearDataRepository, keys.ts
│   └── index.ts                    # 팩토리 (앱 전환 시 교체 지점)
├── services/
│   ├── taxCalculator.ts            # 세금 계산 (단계별 lines + grossTaxIfNoDeductions 등)
│   ├── deductionService.ts         # 카드 공제 분해 (신용/체크/현금 sources + 별도 한도)
│   ├── cardForecast.ts             # 월별 평균 → 연말까지 예측 + 체크카드 시나리오
│   ├── salaryService.ts            # 월 급여 자동 계산 (4대보험·소득세)
│   ├── recommendations.ts          # 사용자 상황별 액션 추천 (청년/시니어 정책 자동 포함)
│   └── backupService.ts            # JSON 내보내기/가져오기
├── store/
│   ├── authStore.ts                # 현재 프로필
│   ├── yearStore.ts                # 선택된 기준 연도
│   └── dataStore.ts                # 급여/공제/카드/가족 데이터
├── data/
│   └── tax-rules/
│       ├── 2024.json
│       ├── 2025.json
│       ├── 2026.json
│       └── index.ts                # getTaxRules, availableYears
├── hooks/
│   └── useCalculation.ts           # 계산 결과 + 카드 예측 + 가이드 통합 훅
├── types/
│   └── index.ts                    # Profile, MonthlySalary, Deductions, TaxCalculationResult, ExpenseItem 등
├── utils/
│   ├── format.ts                   # won, wonCompact (만원 단위 표시)
│   ├── age.ts                      # 출생연도 → 청년/중장년/시니어 판별
│   └── onboarding.ts               # hasCompletedOnboarding, markOnboardingCompleted
├── styles/
│   └── global.css                  # 디자인 토큰 + 컴포넌트 스타일 (mobile-first)
├── App.tsx                         # 라우팅 + ProtectedShell / OnboardingShell
└── main.tsx                        # ConfigProvider (한국어 + 모바일 테마)
```

---

## ✅ 구현된 핵심 기능

### 🚪 온보딩 위저드 (2단계)
신규 프로필 생성 시 자동으로 `/onboarding`으로 리디렉트. 완료 또는 건너뛰기 시 `localStorage`에 플래그 저장.

| 단계 | 내용 | 처리 |
|---|---|---|
| 1/2 · 나이 | 20대~60대 chip 또는 출생연도 직접 입력. 청년/시니어 안내 | `updateCurrent({ birthYear })` |
| 2/2 · 급여명세서 | 월급 + 식대 (만원 단위), 소득세 직접 입력 토글, 1년치 세금 미리보기(뺄셈식) | `applyRaiseFrom(1, salary)`로 12개월 적용 |

미리보기에 **공제 0원 가정 결정세액** + **연봉/과세구간/과세표준** 노출.
사용자가 카드/가족/공제는 첫 진입 후 대시보드의 추천 체크리스트에서 채워나감.

### 💼 급여 입력
- **빠른 입력**: 1개월 → 12개월 자동 적용
- **소득세 직접 입력 토글** — 명세서 그대로 옮길 수 있음. 비워두면 자동 계산. 지방세는 소득세×10% 자동
- **4대보험 직접 입력 토글** — 국민연금/건강보험/장기요양/고용보험 각각 직접 입력 가능 (산재 미가입 등 회사별 차이 대응)
- 저장 데이터가 자동 계산값과 다르면 진입 시 직접 입력 토글 자동 펼침
- **상여금**: 정기/성과/명절/기타 구분, 특정 월 지정
- **월별 보기**: 각 월 개별 수정

### 🧾 공제 입력
탭 구조: **[📉 소득공제] [🎯 세액공제] [👨‍👩‍👧 가족]**

#### 📉 소득공제 탭
- **💳 카드 / 현금영수증**:
  - **CardLimitsPanel** — 신용 + 체크 + 현금 합산 공제 (300만 한도 등), 가로 stacked bar로 신용/체크/현금 각자 기여 분리 시각화
  - **유도 메시지** — 신용카드 비중 ≥ 50%면 "체크카드/현금영수증으로 X만 더 쓰면 Y만 더 절세" 자동 노출
  - **별도 한도**: 전통시장/대중교통/도서공연 각각 100만 한도
  - **월평균 일괄** ↔ **월별 입력** 토글 (월별: 12개월 chip 선택, "이전 월 값 복사" 가능)
  - **연말까지 예측**: N개월 입력 시 나머지 (12-N)개월을 평균값으로 추정
- **🏠 그 외 소득공제**: 주택청약

#### 🎯 세액공제 탭
- **의료비 / 교육비 / 기부금**: 항목별 바텀 시트 (ExpenseSheet)
  - 각 카테고리는 한도와 공제율 명시
  - 항목 추가 시 카테고리 + 금액 + 메모 입력
  - 메인 화면에는 합계 + N건 표시
- **연금저축 / IRP / 월세 / 보장성보험**: 직접 입력 + 한도 progress bar

**카테고리 (expenseCategories.ts)**

| 영역 | 카테고리 |
|---|---|
| 의료비 (10) | 병원·의원 진료 / 입원·수술 / 약국 / 치과 / 안경·콘택트(50만) / 한방 / 난임시술(30%) / 미숙아·선천성(20%) / 본인·65+·장애인(한도없음) / 기타 |
| 교육비 (6) | 본인 교육비(대학·대학원·직업훈련·자격증) / 미취학 자녀(1인 300만) / 초·중·고 자녀(1인 300만) / 대학생 자녀(1인 900만) / 장애인 특수교육 / 학자금 대출 상환 |
| 기부금 (5) | 고향사랑기부(특수 공식) / 종교단체 / 사회복지·공익 / 교육·문화·예술 / 기타 일반기부 |

#### 👨‍👩‍👧 가족 탭
- +배우자/+자녀/+부모/+형제자매 chip으로 추가 (이름·관계 select 없음 — 아이콘+라벨만)
- 같은 관계 여러 명이면 자동 `#1`, `#2` 인덱싱
- 경로(70+)/장애/소득있음 toggle, 한부모 공제 toggle — 변경 즉시 자동 저장 (디바운스 500ms)

### 📊 대시보드 — 게임형 점수 카드
1. **점수 카드 (Hero)** — 다크 카드에 **뺄셈식 + 무드 이모지**:
   - 위: `올해 내야 할 세금 [결정세액]` (작게)
   - `매달 미리 낸 세금 [기납부] (− 부호)`
   - 구분선
   - 메인 큰 글씨: `더 내야 할 돈 [차액]` (빨강) 또는 `돌려받을 돈 [차액]` (초록)
   - 무드 이모지: ⛈️😱(폭우) / 🌧️😟(비) / ⛅🙂(흐림) / 🌤️😊(맑음) / ☀️😄(쨍쨍) / 🌈🤩(무지개)
   - 글로우 색상도 무드 톤 따라 자동 변환
2. **청년 카드** (만 19~34세만 노출) — 청년형 장기펀드, 청년도약계좌, 중기청 감면 등 별도 강조
3. **추천 체크리스트** — `services/recommendations.ts` 기반 우선순위 정렬:
   - 미입력 항목 = `□` 빈 체크 + 절세액 뱃지 + 클릭하면 입력 화면
   - 입력 완료 항목 = `✓ N개` 접이식
4. **자세히 보기** — 월별 급여/항목/계산/비교 entry

### 🎯 결과 페이지 (계산 탭)
- **상단 ⚠️ disclaimer**: "이 결과는 추정치입니다"
- **Hero**: 환급/추가납부 큰 수치 (부호 없음, 컬러로만 구분)
- **단계별 계산**: 소득 → 과세표준 → 산출세액 → 세액공제 → 결정세액 → 환급
- **공제 활용률 카드** — 핵심 신규 기능:
  - 각 항목 한도 대비 % + 진행바 + 절세 여지 + 클릭하면 입력 화면 이동
  - 신용카드 행 펼치면 **카드 공제 단계 차트**: 가로 막대(빗금=공제 안 됨/초록=공제 영역) + 임계값/체크한도/신용한도 마커 + 현재 위치 ▼
  - "한도 가득 채우려면" 신용/체크 종류별 추가 사용액 시뮬 ("체크는 절반만 써도 됨" 안내)
- **하단 disclaimer-card**: 따뜻한 크림 톤, 작은 disc 마커

### 🔄 연도 비교 — 2가지 모드
- **세법 비교 (whatif, 기본)** — 현재 데이터로 다른 해 세법 시뮬. "같은 조건 X년 vs Y년" 정부 정책 변화 비교
- **내 데이터 비교 (historical)** — 실제 입력한 연도별 데이터 비교 (≥2개 연도 데이터 있을 때만 활성)
- 차이 0이면 "변화 없음" 표시 + "세법이 사실상 동일해요"

### 🍞 토스트 위치
AntD `message`를 글로벌 CSS로 **하단(BottomNav 위)에 표시** — 상단 TaxCounter의 펄스/변동분 애니메이션 가림 방지

### 💾 데이터 내보내기/가져오기
- 프로필 메뉴에서 JSON 백업 다운로드
- 다른 기기에서 가져오기

---

## 🎨 디자인 시스템

### 컬러 토큰 (`global.css`) — Claude AI 따뜻한 크림 톤
의도적으로 차가운 슬레이트(토스/뱅크샐러드 류) 회피. Anthropic Claude 시그니처 톤 차용.

```css
--bg: #faf9f5;           --ink: #1f1e1c;          --ink-muted: #57534e;
--surface: #ffffff;      --line: rgba(31,30,28,0.08);
--brand-soft: #ece9e2;   /* warm tinted (강조 표면) */
--accent: #cc785c;       --accent-soft: #f5e8e1;  /* Claude coral */
--success: #047857;      --success-soft: #d1fae5;
--warn: #b45309;         --warn-soft: #fef3c7;
--danger: #b91c1c;
--radius-sm: 12px;       --radius: 18px;           --radius-lg: 24px;
```

### 핵심 패턴
- **다크 hero** — `#1c1b18 → #2a2825` warm dark + 코랄 글로우 (`.hero`, `.score-card`)
- **Pill segmented** — 모바일 탭 토글 (`.segmented .segmented-item`)
- **Year chips** — 가로 스크롤 가능한 선택 칩 (`.year-chip`)
- **Callout** — 좌측 컬러 바 + 따뜻한 크림 배경 (`.callout`)
- **stat-row.result / disclaimer-card** — 화이트 + 좌측 3px 컬러 바 (모던 핀테크 패턴)
- **Money input** — 만원 단위 입력. placeholder는 흐린 회색, suffix "만원" 고정 (`.input.amount`)
- **TaxCounter 4단계 날씨 애니메이션** — storm/rain/sunny/bright 키프레임 + 빗방울 div 4개 (CSS only)
- **Score card 무드 글로우** — 추가납부 폭/환급 폭에 따라 글로우 컬러 자동 변환
- **Glass topbar** — `backdrop-filter: saturate(180%) blur(20px)` + 따뜻한 크림 베이스

### 폰트
- **Pretendard Variable** — `font-feature-settings: 'tnum' 1` (숫자 등폭) + `'ss05' 1`
- **금액**: `font-variant-numeric: tabular-nums`로 자릿수 정렬

---

## 🔐 프로필 시스템 (이름 기반 간이 분리)

### 컨셉
- **실제 인증 없음** — 단순히 데이터를 분리하기 위한 프로필 구분자
- 하나의 기기에서 본인/배우자/부모 등 여러 사람의 데이터를 따로 관리
- "로그인"이 아닌 "프로필 선택" 개념
- `Profile.birthYear` (선택 입력) — 청년·시니어 정책 자동 추천에 사용
- `authStore.updateCurrent(patch)` — 온보딩에서 birthYear 업데이트

### 로그인 페이지
- 😩 hero "거지같은 연말정산" — "올해도 토해낼 것 같다면? 연봉·카드·가족만 넣어봐요."
- 🔒 **초록 박스**: "어떤 경우에도 입력하신 정보를 외부로 전송하거나 수집하지 않습니다."
- ⚠️ **노란 박스**: "본 결과는 추정치예요. 실제 홈택스 결과와 차이가 있을 수 있습니다."
- 기존 프로필 카드 리스트 + "이어서 사용하기"
- 새 프로필 입력 칸: "아무 이름이나 (가족 구분용)"
- 하단 안내: "실명을 쓰지 않아도 됩니다"

### localStorage 키 구조
```
app:profiles                                → 프로필 목록
app:currentProfile                          → 현재 활성 프로필 key
app:selectedYear                            → 기준 연도
app:onboarding-completed:{profileKey}       → 온보딩 완료 플래그

profile:{key}:meta                          → 프로필 메타
profile:{key}:salaries:{year}               → 월 급여 (12개)
profile:{key}:bonuses:{year}                → 상여
profile:{key}:cards:{year}                  → 월 카드 사용
profile:{key}:deductions:{year}             → 공제 항목 (medicalItems/educationItems/donationItems 포함)
profile:{key}:family:{year}                 → 부양가족
```

### 이름 정규화
- 입력 이름을 공백 제거 + 소문자로 정규화하여 key로 사용
- 표시명은 별도 저장 (예: key=`kimcheolsu`, name=`김철수`)

---

## 📊 세금 계산 로직

### 흐름 (`services/taxCalculator.ts`)
```
1.  총급여 (월급 합 + 상여 합)
2. − 비과세 (월 식대 20만 한도)
3. = 과세대상 총급여
4. − 근로소득공제 (formula evaluation)
5. = 근로소득금액
6. − 인적공제 (본인 + 부양가족 + 경로/장애 추가)
7. − 4대보험 공제 (월별 합산)
8. − 신용카드 등 사용공제 (computeCardDeduction)
9. − 주택청약 공제 (40% × min(납입액, 300만), 총급여 7천만 이하만)
10. = 과세표준
11. × 세율 적용 + 누진공제 = 산출세액
12. − 근로소득 세액공제 (tiered)
13. − 자녀 세액공제 (1/2/3+)
14. − 연금계좌 세액공제 (총급여 5500만 기준 15%/12%)
15. − 의료비 세액공제 (총급여 3% 초과분 15%)
16. − 교육비 세액공제 (15%)
17. − 기부금 세액공제 (1천만 이하 15%, 초과 30%)
18. − 보장성 보험료 세액공제 (12%, 100만 한도)
19. − 월세 세액공제 (총급여 5500만 기준 17%/15%, 8천만 이하만)
20. = 결정세액
21. − 기납부 소득세
22. = 환급액 (음수면 추가납부)
```

### 추가 노출 필드
- `grossTaxIfNoDeductions` — 소득공제를 받지 않았다면 내야 했을 산출세액 (누진세율 다시 적용)
- `incomeDeductionSaving = grossTaxIfNoDeductions - calculatedTax`
- `taxCreditSaving = min(totalTaxCredits, calculatedTax)`
- `totalSaving = incomeDeductionSaving + taxCreditSaving`

### 카드 공제 분해 (`services/deductionService.ts`)
`computeCardDeduction()` 반환:
- `sources.creditCard / checkCard / cashReceipt` — 각자 spending, contributingSpend(25% 초과분), rawDeduction
- 합산 한도: `baseLimit` (총급여 따라 200~300만)
- 별도 한도: `additional.traditionalMarket / publicTransport / books` (각 100만)
- threshold 소비 순서: 신용 → 체크 → 현금 (이후 각자의 공제율로 적립)

### 알려진 한계 (단순화·누락)
정확도에 직접 영향 — 사용자 disclaimer로 보완 중:
- **의료비 700만 한도 cap 누락** — 일반 케이스에서 의료비 많이 입력 시 과대 공제
- **근로소득세액공제 한도 차등 누락** — 총급여 7천 초과 시 50~66만으로 줄어들어야 하는데 max 74만 cap만 적용 (고소득자 영향)
- **고향사랑기부 100% 공제 (10만 이하) 누락** — 일반 기부와 같이 15% 처리
- **교육비 자녀 연령별 한도 차등 누락** — 미취학·초중고 300만, 대학 900만 미반영
- **의료비 차등 공제율 누락** — 난임 30%, 미숙아 20%, 본인·65+·장애인 한도없음 미반영
- **근로소득공제 2,000만 cap 누락** — 10억+ 소득자 영향 (일반 사용자 무관)
- 정확도 권장 보강 우선순위: 의료비 700만 cap > 근로소득세액공제 차등

---

## 🧭 사용자 흐름

```
[새 프로필] 로그인 → /onboarding 자동 리디렉트
                       ↓
                  2단계 위저드 (나이 → 급여명세서)
                  공제 0원 가정 1년치 세금 미리보기
                       ↓
                  대시보드 진입 — 점수카드 + 추천 체크리스트
                       
[기존 프로필] 로그인 → 대시보드 직행
                       ↓
                  점수카드에서 환급/추가납부 + 무드 확인
                       ↓
                  추천 체크리스트에서 액션 클릭
                       ↓
                  공제 입력 화면 → 자동 저장 (디바운스)
                       ↓
                  TopBar 카운터 즉시 갱신 + 변동분 팝업
                       ↓
                  계산 탭에서 공제 활용률·카드 단계 차트로 액션 확인
```

---

## 📅 기준 연도 관리

- 헤더 우측 연도 셀렉터 (예: `[2026년 ▼]`)
- 연도별 데이터 완전 독립
- 자녀 출생/사망 등 가족 변동도 연도별 따로 관리
- 연도 비교 페이지에서 여러 연도 동시 선택 가능

---

## 📌 주의사항 / 면책

- 본 시뮬레이터는 **참고용**이며 실제 연말정산 결과와 차이가 있을 수 있음
- **모든 데이터는 사용자 기기의 localStorage에만 저장** — 외부 서버 전송 없음, 수집 없음
- 브라우저 캐시 삭제 시 데이터 손실 → 데이터 내보내기 기능 활용 안내
- 로그인 페이지와 결과 페이지에 상단/하단 disclaimer 명시

---

## 🚀 시작 명령어

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 프로덕션 빌드
npm run typecheck    # tsc --noEmit
```

---

## 🔮 추후 작업 후보

- **Capacitor 래핑** — iOS/Android 앱 빌드
- **결과 PDF 출력** — html2pdf 등으로 결과 페이지 PDF 다운로드
- **자녀 연령별 교육비 한도 정밀화** — 미취학/초중고/대학 한도 자동 적용
- **의료비 차등 공제율** — 난임 30% / 미숙아 20% / 본인·65+·장애인 한도없음 계산기 반영
- **앱 아이콘 PWA 디자인** — 현재는 SVG 이모지, 정식 아이콘 필요
- **푸시 알림** — 연말정산 시즌 알림 (네이티브 래핑 후)
- **공제 안되는 항목 안내** — ExpenseSheet 안에 "공제 안 되는 항목" 미니 박스 (사교육 학원비, 미용·성형, 단순 후원 등)

---

## 📝 컴포넌트 작성 원칙

1. **모바일 우선** — 480px 컨테이너에서 작동, safe-area-inset 고려
2. **숫자는 tabular-nums** — `font-variant-numeric: tabular-nums`로 자릿수 정렬
3. **iOS 줌 방지** — 모든 입력은 `font-size: 16px` 이상
4. **즉각적 피드백** — 입력 시 환급액 즉시 갱신 (saveDeductions 후 refresh)
5. **공제 유형 시각화** — 소득공제(초록)/세액공제(인디고) 컬러로 일관성
6. **친근한 톤** — "당하지 말자", "토해내", "얼마쯤" 같은 일상 어휘 적절히 사용
7. **컨텍스트 액션** — 팁 카드, TaxFlowCard 등에서 클릭 시 관련 입력 화면으로 자동 이동 (`?tab=income/credit/family`)

---

## 🤝 Git 커밋 컨벤션

- 커밋 메시지 본문 마지막 줄에 항상 다음 trailer를 포함:

```
Co-Authored-By: Joal <joal.dev@gmail.com>
```

- Claude의 기본 `Co-Authored-By: Claude ...` trailer는 **사용하지 않음**.
- 커밋 메시지는 한국어로 작성 (이 프로젝트 도메인이 전부 한국어).
