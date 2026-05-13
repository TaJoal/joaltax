import type {
  AgeBracket,
  TaxCalculationResult,
  YearData,
} from '@/types';

export interface Recommendation {
  id: string;
  /** Visual emoji */
  icon: string;
  /** Short title shown in card */
  title: string;
  /** One-line description */
  description: string;
  /** Approx. won savings if user acts on it. 0 = unknown / general */
  estimatedSavings: number;
  /** Whether the user has already done this (for checklist UX) */
  done: boolean;
  /** Where to send the user. Path with optional ?tab=... */
  href: string;
  /** Optional badge label (e.g. "청년") */
  badge?: string;
  /** Sort hint — bigger = more impactful */
  weight: number;
}

function sumMonthlyCard(data: YearData) {
  return data.cards.reduce(
    (s, c) =>
      s +
      c.creditCard +
      c.checkCard +
      c.cashReceipt +
      c.traditionalMarket +
      c.publicTransport +
      c.books,
    0,
  );
}

/**
 * 사용자가 다음에 무얼 입력하면 환급액이 늘어나는지 추천한다.
 * 게임처럼 "체크리스트" UX에 사용 — done 항목과 to-do 항목을 함께 반환.
 */
export function buildRecommendations(args: {
  data: YearData;
  result: TaxCalculationResult;
  ageBracket: AgeBracket | null;
}): Recommendation[] {
  const { data, result, ageBracket } = args;
  const out: Recommendation[] = [];

  // 1) 가족 (인적공제) — 1인당 약 22.5만원 절세
  const hasFamily = data.family.length > 0;
  out.push({
    id: 'family',
    icon: '👨‍👩‍👧',
    title: '함께 사는 가족 추가하기',
    description: hasFamily
      ? `${data.family.length}명 등록됨`
      : '배우자·자녀·부모님 한 명당 약 22만원 돌려받기',
    estimatedSavings: hasFamily ? 0 : 225_000,
    done: hasFamily,
    href: '/deduction?tab=family',
    weight: hasFamily ? 30 : 90,
  });

  // 2) 카드/현금영수증 — 입력 자체가 액션
  const cardTotal = sumMonthlyCard(data);
  const hasCard = cardTotal > 0;
  out.push({
    id: 'card',
    icon: '💳',
    title: '카드·현금영수증 입력',
    description: hasCard
      ? '입력 완료'
      : '월 평균만 적으면 자동으로 계산돼요',
    estimatedSavings: hasCard ? 0 : 150_000,
    done: hasCard,
    href: '/deduction?tab=income',
    weight: hasCard ? 20 : 80,
  });

  // 3) 연금저축/IRP — 가장 큰 효과 (총급여 5500↓ 15%, 5500↑ 12%)
  const pensionIn = data.deductions.pensionSaving + data.deductions.irp;
  const pensionRoom = Math.max(0, 9_000_000 - pensionIn);
  const pensionRate = result.totalGrossPay <= 55_000_000 ? 0.15 : 0.12;
  const pensionDone = pensionIn > 0;
  if (pensionRoom > 0) {
    out.push({
      id: 'pension',
      icon: '💰',
      title: '연금저축 / IRP 납입',
      description: pensionDone
        ? `한도까지 ${Math.round(pensionRoom / 10_000)}만원 더 가능`
        : '연 900만원까지 12~15% 그대로 환급',
      estimatedSavings: Math.round(pensionRoom * pensionRate),
      done: false, // 한도까지 여유 있으면 항상 추천
      href: '/deduction?tab=credit',
      weight: 100,
    });
  }

  // 4) 의료비 — 총급여 3% 초과분 15% 환급
  const medicalIn = data.deductions.medical;
  const medicalDone = medicalIn > 0;
  out.push({
    id: 'medical',
    icon: '🏥',
    title: '의료비 영수증 모으기',
    description: medicalDone
      ? `${Math.round(medicalIn / 10_000)}만원 입력됨`
      : '병원·약국 영수증 — 총급여 3% 넘는 만큼 환급',
    estimatedSavings: medicalDone ? 0 : 75_000,
    done: medicalDone,
    href: '/deduction?tab=credit',
    weight: medicalDone ? 15 : 50,
  });

  // 5) 기부금 — 1천만 이하 15%
  const donationIn =
    data.deductions.donationGeneral +
    data.deductions.donationHometown +
    data.deductions.donationPolitical;
  const donationDone = donationIn > 0;
  out.push({
    id: 'donation',
    icon: '🎁',
    title: '기부금 입력',
    description: donationDone
      ? `${Math.round(donationIn / 10_000)}만원 입력됨`
      : '교회·구호단체·고향사랑기부 모두 가능',
    estimatedSavings: donationDone ? 0 : 60_000,
    done: donationDone,
    href: '/deduction?tab=credit',
    weight: donationDone ? 10 : 40,
  });

  // 6) 주택청약 — 총급여 7천 이하 (40% × min(납입, 300만))
  if (result.totalGrossPay > 0 && result.totalGrossPay <= 70_000_000) {
    const housingIn = data.deductions.housingSaving;
    const housingDone = housingIn > 0;
    out.push({
      id: 'housing',
      icon: '🏠',
      title: '주택청약 납입',
      description: housingDone
        ? '납입 완료'
        : '월 25만원만 넣어도 약 18만원 절세',
      estimatedSavings: housingDone ? 0 : 180_000,
      done: housingDone,
      href: '/deduction?tab=income',
      weight: housingDone ? 5 : 55,
    });
  }

  // 7) 월세 (총급여 8천 이하)
  if (result.totalGrossPay > 0 && result.totalGrossPay <= 80_000_000) {
    const rentIn = data.deductions.monthlyRent;
    const rentDone = rentIn > 0;
    const rentRate = result.totalGrossPay <= 55_000_000 ? 0.17 : 0.15;
    out.push({
      id: 'rent',
      icon: '🏘️',
      title: '월세 입력',
      description: rentDone
        ? '월세 입력됨'
        : `월세 50만원이면 약 ${Math.round((6_000_000 * rentRate) / 10_000)}만원 환급`,
      estimatedSavings: rentDone ? 0 : Math.round(6_000_000 * rentRate),
      done: rentDone,
      href: '/deduction?tab=credit',
      weight: rentDone ? 5 : 45,
      badge: ageBracket === 'youth' ? '청년 우대' : undefined,
    });
  }

  // ================== 청년 우대 정책 ==================
  if (ageBracket === 'youth') {
    out.push({
      id: 'youth-fund',
      icon: '📈',
      title: '청년형 장기펀드',
      description: '연 600만원까지 40% 소득공제 (만 19~34세)',
      estimatedSavings: 360_000,
      done: false,
      href: '/deduction?tab=income',
      weight: 70,
      badge: '청년',
    });
    out.push({
      id: 'youth-leap',
      icon: '🚀',
      title: '청년도약계좌',
      description: '월 70만원 5년 — 정부 매칭 + 비과세',
      estimatedSavings: 0,
      done: false,
      href: '/deduction?tab=income',
      weight: 35,
      badge: '청년',
    });
    if (result.totalGrossPay > 0 && result.totalGrossPay <= 30_000_000) {
      out.push({
        id: 'youth-smb',
        icon: '🏢',
        title: '중소기업 취업 청년 소득세 감면',
        description: '5년간 소득세 90% 감면 (한도 200만/년)',
        estimatedSavings: 0,
        done: false,
        href: '/result',
        weight: 75,
        badge: '청년',
      });
    }
  }

  // ================== 시니어 (경로우대) ==================
  if (ageBracket === 'senior') {
    out.push({
      id: 'senior-medical',
      icon: '💊',
      title: '본인 의료비 (한도 없음)',
      description: '만 65세 이상 본인 의료비는 전액 한도 없이 공제',
      estimatedSavings: 0,
      done: false,
      href: '/deduction?tab=credit',
      weight: 60,
      badge: '시니어',
    });
  }

  // 가중치 + 미완료 우선 정렬
  return out.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.weight - a.weight;
  });
}
