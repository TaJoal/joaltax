export interface ExpenseCategory {
  key: string;
  label: string;
  icon: string;
  /** Effective credit rate for this category (for hint display) */
  rate: number;
  note?: string;
}

export const MEDICAL_CATEGORIES: ExpenseCategory[] = [
  { key: 'clinic', label: '병원·의원 진료', icon: '🏥', rate: 0.15 },
  { key: 'hospital', label: '입원·수술', icon: '🏨', rate: 0.15 },
  { key: 'pharmacy', label: '약국', icon: '💊', rate: 0.15 },
  { key: 'dental', label: '치과', icon: '🦷', rate: 0.15 },
  { key: 'optical', label: '안경·콘택트', icon: '👓', rate: 0.15, note: '50만원 한도' },
  { key: 'oriental', label: '한방·한약', icon: '🌿', rate: 0.15 },
  { key: 'infertility', label: '난임시술', icon: '🤰', rate: 0.30, note: '공제율 30%' },
  { key: 'premature', label: '미숙아·선천성', icon: '👶', rate: 0.20, note: '공제율 20%' },
  { key: 'self', label: '본인·65세 이상·장애인', icon: '🧑', rate: 0.15, note: '한도 없음' },
  { key: 'etc', label: '기타', icon: '🩹', rate: 0.15 },
];

/**
 * 교육비: 누구를 위한 교육인지 + 어떤 단계인지로 명확하게 분류
 * 본인의 모든 교육비(대학·대학원·직업훈련·자격증)는 한도 없음.
 * 부양가족의 교육비는 단계에 따라 한도가 다름.
 */
export const EDUCATION_CATEGORIES: ExpenseCategory[] = [
  { key: 'self', label: '본인 교육비', icon: '🎓', rate: 0.15, note: '대학·대학원·직업훈련·자격증 모두 포함 · 한도 없음' },
  { key: 'preschool', label: '미취학 자녀', icon: '👶', rate: 0.15, note: '어린이집·유치원·취학전 학원·체육 · 1인 300만 한도' },
  { key: 'k12', label: '초·중·고 자녀', icon: '📚', rate: 0.15, note: '수업료·방과후·교복·현장학습 · 1인 300만 한도' },
  { key: 'college', label: '대학생 자녀', icon: '🏛️', rate: 0.15, note: '대학교·전문대 등록금 · 1인 900만 한도' },
  { key: 'special', label: '장애인 특수교육', icon: '♿', rate: 0.15, note: '한도 없음' },
  { key: 'studentLoan', label: '학자금 대출 상환 (본인)', icon: '💳', rate: 0.15, note: '대출 원리금 상환액 · 한도 없음' },
];

/**
 * 기부금: 고향사랑기부는 별도 계산식이 적용되어 분리.
 * 나머지는 모두 일반기부금으로 합산되어 동일한 공제율 적용 (1천만 이하 15%, 초과 30%).
 */
export const DONATION_CATEGORIES: ExpenseCategory[] = [
  { key: 'hometown', label: '고향사랑기부', icon: '🏛️', rate: 1.0, note: '10만원까지 100%, 초과분 15% (연 500만 한도)' },
  { key: 'religion', label: '종교단체', icon: '⛪', rate: 0.15, note: '1천만 이하 15%, 초과분 30%' },
  { key: 'welfare', label: '사회복지·공익', icon: '🤝', rate: 0.15, note: '1천만 이하 15%, 초과분 30%' },
  { key: 'culture', label: '교육·문화·예술', icon: '🎨', rate: 0.15, note: '1천만 이하 15%, 초과분 30%' },
  { key: 'general', label: '기타 일반기부', icon: '💝', rate: 0.15, note: '1천만 이하 15%, 초과분 30%' },
];

export function findCategory(list: ExpenseCategory[], key: string): ExpenseCategory {
  return list.find((c) => c.key === key) ?? list[list.length - 1];
}
