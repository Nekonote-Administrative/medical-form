export interface BasicInfo {
  // 個人情報
  name: string;
  nameKana: string;
  gender: string;
  birthDate: string;
  postalCode: string;
  address: string;
  phoneNumber: string;
  occupation: string;
  // 事故情報
  accidentDate: string;
  accidentLocation: string;
  yourVehicle: string;
  otherVehicle: string;
  accidentType: string;
  accidentDescription: string;
  faultRatioNotified: string;
  faultRatio: string;
  // 治療情報
  treatmentPaymentStatus: string[];
  // 保険情報
  otherInsuranceCompany: string;
  otherInsuranceContact: string;
  myInsuranceCompany: string;
  lawyerSpecialClause: string;
  personalInjuryClause: string;
  // その他
  accidentCertificateType: string;
  hasAccidentPhotos: string;
  remarks: string;
}

export const VEHICLE_OPTIONS = ["車", "バイク", "自転車", "徒歩", "その他"] as const;

export const ACCIDENT_TYPE_OPTIONS = ["追突", "出会い頭", "側面衝突", "正面衝突", "その他"] as const;

export const INSURANCE_COMPANY_OPTIONS = [
  "あいおいニッセイ同和損害保険株式会社",
  "三井住友海上火災保険株式会社",
  "東京海上日動火災保険株式会社",
  "大同火災海上保険株式会社",
  "損害保険ジャパン株式会社",
  "SBI損害保険株式会社",
  "三井ダイレクト損害保険株式会社",
  "アクサ損害保険株式会社",
  "ソニー損害保険株式会社",
  "AIG損害保険株式会社",
  "その他",
] as const;

export const TREATMENT_PAYMENT_OPTIONS = [
  "加害者保険会社支払い中",
  "被害者保険会社支払い中",
  "労災",
  "健康保険",
  "打ち切り・症状固定の話が出ている",
  "打ち切りされた（いつごろ？）",
  "打ち切りされたので健康保険（労災）で通院中",
  "打ち切りされたので通院していない",
  "その他",
] as const;

export type FacilityCategory = "orthopedic" | "osteopathic" | "pharmacy";

export const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  orthopedic: "整形外科",
  osteopathic: "整骨院",
  pharmacy: "薬局",
};

export const CATEGORIES: FacilityCategory[] = [
  "orthopedic",
  "osteopathic",
  "pharmacy",
];

export const CATEGORY_MAX: Record<FacilityCategory, number> = {
  orthopedic: 3,
  osteopathic: 4,
  pharmacy: 3,
};

export interface FacilityEntry {
  id: string;
  facilityName: string;
  facilityAddress: string;
  facilityPostalCode: string;
  facilityPhoneNumber: string;
  selectionMethod: "search" | "manual";
  placeId?: string;
  lat?: number;
  lng?: number;
}

export interface FacilitySearchResult {
  placeId: string;
  name: string;
  address: string;
  postalCode: string;
  phoneNumber: string;
  lat: number;
  lng: number;
}

export interface FormData {
  basicInfo: BasicInfo;
  facilities: Record<FacilityCategory, FacilityEntry[]>;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}
