"use client";

import { useState, useRef, useCallback, FormEvent, ReactNode } from "react";
import { useFormContext } from "@/lib/form-context";
import {
  BasicInfo,
  VEHICLE_OPTIONS,
  ACCIDENT_TYPE_OPTIONS,
  INSURANCE_COMPANY_OPTIONS,
  TREATMENT_PAYMENT_OPTIONS,
} from "@/types";

interface GeoLocation {
  lat: number;
  lng: number;
}

/* ── Google-Forms-style building blocks ── */

function Card({ children, topBar }: { children: ReactNode; topBar?: boolean }) {
  return (
    <div
      className={`mb-3 rounded-lg border border-gf-border bg-white ${
        topBar ? "overflow-hidden border-t-0" : ""
      }`}
    >
      {topBar && <div className="h-[10px] bg-gf-purple" />}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Card topBar>
        <h3 className="text-base font-medium text-gf-text">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gf-text-secondary">{description}</p>
        )}
      </Card>
      {children}
    </>
  );
}

function FieldCard({
  label,
  required,
  error,
  description,
  aiResult,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  aiResult?: { status: "idle" | "loading" | "ok" | "ng"; message: string };
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-1 text-sm leading-5 text-gf-text">
        {label}
        {required && <span className="ml-1 text-gf-error">*</span>}
      </div>
      {description && (
        <p className="mb-3 text-xs text-gf-text-secondary">{description}</p>
      )}
      {!description && <div className="mb-3" />}
      {children}
      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-gf-error">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </p>
      )}
      {aiResult && aiResult.status === "loading" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gf-text-secondary">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gf-purple border-t-transparent" />
          AI が入力内容を確認中...
        </p>
      )}
      {aiResult && aiResult.status === "ok" && (
        <p className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <span className="text-base">&#x2705;</span>
          入力内容は適切です
        </p>
      )}
      {aiResult && aiResult.status === "ng" && (
        <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          {aiResult.message}
        </p>
      )}
    </Card>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border-b border-gf-border bg-transparent py-2 text-sm text-gf-text outline-none transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-gf-input-focus"
    />
  );
}

function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none border-b border-gf-border bg-transparent py-2 text-sm text-gf-text outline-none transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-gf-input-focus"
    />
  );
}

function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder = "選択してください",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-gf-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-gf-input-focus focus:ring-1 focus:ring-gf-input-focus ${
        value ? "text-gf-text" : "text-gray-400"
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

function RadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-3">
      {options.map((v) => (
        <label key={v} className="flex cursor-pointer items-center gap-3">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              value === v ? "border-gf-purple" : "border-gray-400"
            }`}
          >
            {value === v && (
              <span className="h-2.5 w-2.5 rounded-full bg-gf-purple" />
            )}
          </span>
          <span className="text-sm text-gf-text">{v}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((v) => {
        const checked = selected.includes(v);
        return (
          <label key={v} className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={checked} onChange={() => onToggle(v)} className="sr-only" />
            <span
              className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border-2 transition-colors ${
                checked
                  ? "border-gf-purple bg-gf-purple"
                  : "border-gray-400 bg-white"
              }`}
            >
              {checked && (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </span>
            <span className="text-sm leading-5 text-gf-text">{v}</span>
          </label>
        );
      })}
    </div>
  );
}

/* ── Main Component ── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface BirthDateParts {
  year: string;
  month: string;
  day: string;
}

function parseBirthDate(value: string): BirthDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: "", month: "", day: "" };
  return {
    year: match[1],
    month: String(Number(match[2])),
    day: String(Number(match[3])),
  };
}

function getDaysInMonth(year: string, month: string) {
  const yearNum = Number(year);
  const monthNum = Number(month);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) return 31;
  if (!Number.isInteger(yearNum) || year.length !== 4) {
    return new Date(2024, monthNum, 0).getDate();
  }
  return new Date(yearNum, monthNum, 0).getDate();
}

function composeBirthDate(parts: BirthDateParts): string | null {
  if (!/^\d{4}$/.test(parts.year) || !parts.month || !parts.day) return null;
  const month = Number(parts.month);
  const day = Number(parts.day);
  const maxDay = getDaysInMonth(parts.year, parts.month);
  if (month < 1 || month > 12 || day < 1 || day > maxDay) return null;
  return `${parts.year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

function validateBirthDateParts(parts: BirthDateParts): string | null {
  const hasAnyPart = Boolean(parts.year.trim() || parts.month || parts.day);
  if (!hasAnyPart) return null;

  if (!parts.year.trim()) return "年を入力してください";
  if (!/^\d{4}$/.test(parts.year)) return "西暦4桁で入力してください";
  if (!parts.month) return "月を選択してください";
  if (!parts.day) return "日を選択してください";

  const iso = composeBirthDate(parts);
  if (!iso) return "存在する日付を選択してください";

  const birthDate = new Date(`${iso}T00:00:00+09:00`);
  const today = new Date();
  if (birthDate.getTime() > today.getTime()) return "未来日は入力できません";

  const age = calculateAge(iso);
  if (age > 120) return "生年月日を確認してください";
  return null;
}

function calculateAge(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

function formatJapaneseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${year}年${month}月${day}日`;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_COUNT = 10;

export default function BasicInfoForm() {
  const { state, dispatch, accidentFilesRef } = useFormContext();

  const [form, setForm] = useState<BasicInfo>({
    name: state.basicInfo.name || "",
    nameKana: state.basicInfo.nameKana || "",
    gender: state.basicInfo.gender || "",
    birthDate: state.basicInfo.birthDate || "",
    postalCode: state.basicInfo.postalCode || "",
    address: state.basicInfo.address || "",
    phoneNumber: state.basicInfo.phoneNumber || "",
    occupation: state.basicInfo.occupation || "",
    accidentDate: state.basicInfo.accidentDate || "",
    accidentLocation: state.basicInfo.accidentLocation || "",
    yourVehicle: state.basicInfo.yourVehicle || "",
    otherVehicle: state.basicInfo.otherVehicle || "",
    accidentType: state.basicInfo.accidentType || "",
    accidentDescription: state.basicInfo.accidentDescription || "",
    faultRatioNotified: state.basicInfo.faultRatioNotified || "",
    faultRatio: state.basicInfo.faultRatio || "",

    treatmentPaymentStatus: state.basicInfo.treatmentPaymentStatus || [],
    otherInsuranceCompany: state.basicInfo.otherInsuranceCompany || "",
    otherInsuranceContact: state.basicInfo.otherInsuranceContact || "",
    myInsuranceCompany: state.basicInfo.myInsuranceCompany || "",
    lawyerSpecialClause: state.basicInfo.lawyerSpecialClause || "",
    personalInjuryClause: state.basicInfo.personalInjuryClause || "",
    accidentCertificateType: state.basicInfo.accidentCertificateType || "",
    hasAccidentPhotos: state.basicInfo.hasAccidentPhotos || "",
    remarks: state.basicInfo.remarks || "",
  });
  const [birthDateParts, setBirthDateParts] = useState<BirthDateParts>(() =>
    parseBirthDate(state.basicInfo.birthDate || ""),
  );

  // 「その他」自由入力用のローカルstate
  const OTHER_PREFIX = "その他: ";
  const isOtherValue = (v: string) =>
    v === "その他" || v.startsWith(OTHER_PREFIX);

  const initOtherText = (v: string) =>
    v.startsWith(OTHER_PREFIX) ? v.slice(OTHER_PREFIX.length) : "";

  const [otherInsuranceCompanyText, setOtherInsuranceCompanyText] = useState(
    initOtherText(state.basicInfo.otherInsuranceCompany || ""),
  );
  const [myInsuranceCompanyText, setMyInsuranceCompanyText] = useState(
    initOtherText(state.basicInfo.myInsuranceCompany || ""),
  );

  const [accidentFiles, setAccidentFiles] = useState<File[]>(
    () => accidentFilesRef.current,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [geoWarning, setGeoWarning] = useState("");

  type AiStatus = { status: "idle" | "loading" | "ok" | "ng"; message: string };
  const [aiLocation, setAiLocation] = useState<AiStatus>({ status: "idle", message: "" });
  const [aiDescription, setAiDescription] = useState<AiStatus>({ status: "idle", message: "" });
  const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateWithAi = useCallback(
    async (field: string, value: string, setter: (v: AiStatus) => void) => {
      if (!value.trim()) {
        setter({ status: "idle", message: "" });
        return;
      }
      setter({ status: "loading", message: "" });
      try {
        const res = await fetch("/api/validate-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value }),
        });
        const data = await res.json();
        setter(data.ok ? { status: "ok", message: "" } : { status: "ng", message: data.message });
      } catch {
        setter({ status: "idle", message: "" });
      }
    },
    []
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const validFiles: File[] = [];
    const rejected: string[] = [];

    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} (50MB超)`);
      } else {
        validFiles.push(file);
      }
    }

    const combined = [...accidentFiles, ...validFiles].slice(0, MAX_FILE_COUNT);
    setAccidentFiles(combined);

    if (rejected.length > 0) {
      setErrors((prev) => ({
        ...prev,
        accidentFiles: `以下のファイルはサイズ制限を超えています: ${rejected.join(", ")}`,
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.accidentFiles;
        return next;
      });
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setAccidentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(field: keyof BasicInfo, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "accidentLocation" && typeof value === "string") {
      if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
      if (!value.trim()) {
        setAiLocation({ status: "idle", message: "" });
      } else {
        locationTimerRef.current = setTimeout(() => {
          validateWithAi("accidentLocation", value, setAiLocation);
        }, 1000);
      }
    }

    if (field === "accidentDescription" && typeof value === "string") {
      if (descriptionTimerRef.current) clearTimeout(descriptionTimerRef.current);
      if (!value.trim()) {
        setAiDescription({ status: "idle", message: "" });
      } else {
        descriptionTimerRef.current = setTimeout(() => {
          validateWithAi("accidentDescription", value, setAiDescription);
        }, 1500);
      }
    }
  }

  function togglePaymentStatus(option: string) {
    setForm((prev) => {
      const current = prev.treatmentPaymentStatus;
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, treatmentPaymentStatus: next };
    });
  }

  async function lookupPostalCode(code: string) {
    const normalized = code.replace(/[－ー\-]/g, "");
    if (!/^\d{7}$/.test(normalized)) return;
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${normalized}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const addr = `${r.address1}${r.address2}${r.address3}`;
        setForm((prev) => ({ ...prev, address: addr }));
      }
    } catch {
      // ignore lookup failure
    }
  }

  function handlePostalCodeChange(value: string) {
    updateField("postalCode", value);
    lookupPostalCode(value);
  }

  function updateBirthDatePart(field: keyof BirthDateParts, value: string) {
    const normalizedValue =
      field === "year" ? value.replace(/\D/g, "").slice(0, 4) : value;
    const next = { ...birthDateParts, [field]: normalizedValue };
    const maxDay = getDaysInMonth(next.year, next.month);
    if (next.day && Number(next.day) > maxDay) {
      next.day = "";
    }

    const isoDate = composeBirthDate(next);
    setBirthDateParts(next);
    setForm((current) => ({ ...current, birthDate: isoDate ?? "" }));
    setErrors((current) => {
      if (!current.birthDate) return current;
      const nextErrors = { ...current };
      delete nextErrors.birthDate;
      return nextErrors;
    });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "この質問は必須です";
    if (!form.nameKana.trim()) newErrors.nameKana = "この質問は必須です";
    if (!form.gender) newErrors.gender = "この質問は必須です";
    const birthDateError = validateBirthDateParts(birthDateParts);
    if (birthDateError) newErrors.birthDate = birthDateError;
    if (!form.postalCode.trim()) newErrors.postalCode = "この質問は必須です";
    if (!form.address.trim()) newErrors.address = "この質問は必須です";
    if (!form.phoneNumber.trim()) newErrors.phoneNumber = "この質問は必須です";
    if (!form.accidentDate) newErrors.accidentDate = "この質問は必須です";
    if (!form.accidentLocation.trim())
      newErrors.accidentLocation = "この質問は必須です";
    if (!form.yourVehicle) newErrors.yourVehicle = "この質問は必須です";
    if (!form.otherVehicle) newErrors.otherVehicle = "この質問は必須です";
    if (!form.accidentType) newErrors.accidentType = "この質問は必須です";
    if (!form.accidentDescription.trim())
      newErrors.accidentDescription = "この質問は必須です";
    if (!form.hasAccidentPhotos)
      newErrors.hasAccidentPhotos = "この質問は必須です";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function geocode(addr: string): Promise<GeoLocation | null> {
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (data.error) return null;
      return { lat: data.lat, lng: data.lng };
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeoWarning("");

    if (!validate()) return;

    const normalizedBirthDate = composeBirthDate(birthDateParts) ?? form.birthDate;
    const trimmed: BasicInfo = {
      ...form,
      name: form.name.trim(),
      nameKana: form.nameKana.trim(),
      birthDate: normalizedBirthDate,
      postalCode: form.postalCode.trim(),
      address: form.address.trim(),
      phoneNumber: form.phoneNumber.trim(),
      occupation: form.occupation.trim(),
      accidentLocation: form.accidentLocation.trim(),
      accidentDescription: form.accidentDescription.trim(),
      otherInsuranceContact: form.otherInsuranceContact.trim(),
      remarks: form.remarks.trim(),
    };

    dispatch({ type: "SET_BASIC_INFO", payload: trimmed });

    // Sync files to ref for access from other components
    accidentFilesRef.current =
      trimmed.hasAccidentPhotos === "はい" ? accidentFiles : [];

    setLoading(true);

    try {
      const [addressGeo, accidentGeo] = await Promise.all([
        geocode(trimmed.address),
        geocode(trimmed.accidentLocation),
      ]);

      if (!addressGeo || !accidentGeo) {
        setGeoWarning(
          "住所または事故現場の位置情報を取得できませんでした。後で再試行できます。"
        );
      }

      dispatch({
        type: "SET_GEO_LOCATIONS",
        payload: {
          addressGeoLocation: addressGeo ?? null,
          accidentGeoLocation: accidentGeo ?? null,
        },
      });
    } catch {
      setGeoWarning(
        "位置情報の取得中にエラーが発生しました。後で再試行できます。"
      );
    } finally {
      setLoading(false);
    }

    dispatch({ type: "SET_STEP", payload: 1 });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Title Card ── */}
      <Card topBar>
        <h2 className="text-2xl font-normal text-gf-text">
          被害者請求ヒアリングシート
        </h2>
        <div className="mt-4 border-t border-gf-border pt-3">
          <span className="text-xs text-gf-error">* は必須項目です</span>
        </div>
      </Card>

      {/* ===== 個人情報 ===== */}
      <SectionCard title="個人情報">
        <FieldCard label="氏名" required error={errors.name}>
          <TextInput id="name" value={form.name} onChange={(v) => updateField("name", v)} placeholder="回答を入力" />
        </FieldCard>

        <FieldCard label="フリガナ" required error={errors.nameKana}>
          <TextInput id="nameKana" value={form.nameKana} onChange={(v) => updateField("nameKana", v)} placeholder="回答を入力" />
        </FieldCard>

        <FieldCard label="性別" required error={errors.gender}>
          <RadioGroup name="gender" value={form.gender} onChange={(v) => updateField("gender", v)} options={["男", "女"]} />
        </FieldCard>

        <FieldCard label="生年月日" error={errors.birthDate}>
          <div className="grid grid-cols-[1fr_88px_88px] gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-gf-text-secondary">
                年
              </span>
              <input
                id="birthYear"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={birthDateParts.year}
                onChange={(e) => updateBirthDatePart("year", e.target.value)}
                placeholder="1985"
                className="w-full rounded border border-gf-border bg-white px-3 py-2 text-sm text-gf-text outline-none transition-colors placeholder:text-gray-400 focus:border-gf-input-focus focus:ring-1 focus:ring-gf-input-focus"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gf-text-secondary">
                月
              </span>
              <select
                id="birthMonth"
                value={birthDateParts.month}
                onChange={(e) => updateBirthDatePart("month", e.target.value)}
                className={`w-full rounded border border-gf-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-gf-input-focus focus:ring-1 focus:ring-gf-input-focus ${
                  birthDateParts.month ? "text-gf-text" : "text-gray-400"
                }`}
              >
                <option value="">月</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(
                  (month) => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gf-text-secondary">
                日
              </span>
              <select
                id="birthDay"
                value={birthDateParts.day}
                onChange={(e) => updateBirthDatePart("day", e.target.value)}
                className={`w-full rounded border border-gf-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-gf-input-focus focus:ring-1 focus:ring-gf-input-focus ${
                  birthDateParts.day ? "text-gf-text" : "text-gray-400"
                }`}
              >
                <option value="">日</option>
                {Array.from(
                  { length: getDaysInMonth(birthDateParts.year, birthDateParts.month) },
                  (_, i) => String(i + 1),
                ).map((day) => (
                  <option key={day} value={day}>
                    {day}日
                  </option>
                ))}
              </select>
            </label>
          </div>
          {form.birthDate && !validateBirthDateParts(birthDateParts) && (
            <p className="mt-3 text-xs text-gf-text-secondary">
              {formatJapaneseDate(form.birthDate)} 生まれ（現在
              {calculateAge(form.birthDate)}歳）
            </p>
          )}
        </FieldCard>

        <FieldCard label="郵便番号" required error={errors.postalCode}>
          <TextInput id="postalCode" value={form.postalCode} onChange={handlePostalCodeChange} placeholder="000-0000" />
        </FieldCard>

        <FieldCard label="住所" required error={errors.address}>
          <TextInput id="address" value={form.address} onChange={(v) => updateField("address", v)} placeholder="回答を入力" />
        </FieldCard>

        <FieldCard label="電話番号" required error={errors.phoneNumber}>
          <TextInput id="phoneNumber" value={form.phoneNumber} onChange={(v) => updateField("phoneNumber", v)} type="tel" placeholder="回答を入力" />
        </FieldCard>

        <FieldCard label="職業">
          <TextInput id="occupation" value={form.occupation} onChange={(v) => updateField("occupation", v)} placeholder="回答を入力" />
        </FieldCard>
      </SectionCard>

      {/* ===== 事故情報 ===== */}
      <SectionCard title="事故情報">
        <FieldCard label="事故日" required error={errors.accidentDate}>
          <input
            id="accidentDate"
            type="date"
            value={form.accidentDate}
            onChange={(e) => updateField("accidentDate", e.target.value)}
            className="border-b border-gf-border bg-transparent py-2 text-sm text-gf-text outline-none transition-colors focus:border-b-2 focus:border-gf-input-focus"
          />
        </FieldCard>

        <FieldCard
          label="事故場所"
          required
          error={errors.accidentLocation}
          description="◯◯県◯◯市◯◯ くらいの粒度でご記入ください（例：東京都新宿区西新宿、大阪府大阪市北区梅田）"
          aiResult={aiLocation}
        >
          <TextInput id="accidentLocation" value={form.accidentLocation} onChange={(v) => updateField("accidentLocation", v)} placeholder="例：東京都新宿区西新宿" />
        </FieldCard>

        <FieldCard label="あなたの乗り物" required error={errors.yourVehicle}>
          <SelectInput id="yourVehicle" value={form.yourVehicle} onChange={(v) => updateField("yourVehicle", v)} options={VEHICLE_OPTIONS} />
        </FieldCard>

        <FieldCard label="相手の乗り物" required error={errors.otherVehicle}>
          <SelectInput id="otherVehicle" value={form.otherVehicle} onChange={(v) => updateField("otherVehicle", v)} options={VEHICLE_OPTIONS} />
        </FieldCard>

        <FieldCard label="事故種別" required error={errors.accidentType}>
          <SelectInput id="accidentType" value={form.accidentType} onChange={(v) => updateField("accidentType", v)} options={ACCIDENT_TYPE_OPTIONS} />
        </FieldCard>

        <FieldCard
          label="事故状況説明"
          required
          error={errors.accidentDescription}
          description="この情報を元に作図をするので、信号の色、一時停止の有無、同乗者の有無、道路の状況（車線数・見通し・天候）等も含め、できるだけ具体的にご記入ください。"
          aiResult={aiDescription}
        >
          <TextArea id="accidentDescription" value={form.accidentDescription} onChange={(v) => updateField("accidentDescription", v)} rows={5} placeholder="例：片側2車線の直線道路を北向きに走行中、信号が青で交差点に進入したところ…" />
        </FieldCard>

        <FieldCard label="過失割合の通知を受けましたか？">
          <RadioGroup name="faultRatioNotified" value={form.faultRatioNotified} onChange={(v) => updateField("faultRatioNotified", v)} options={["はい", "いいえ"]} />
        </FieldCard>

        {form.faultRatioNotified === "はい" && (
          <FieldCard label="過失割合（あなた）">
            <SelectInput
              id="faultRatio"
              value={form.faultRatio}
              onChange={(v) => updateField("faultRatio", v)}
              options={Array.from({ length: 11 }, (_, i) => String(i))}
            />
          </FieldCard>
        )}
      </SectionCard>

      {/* ===== 治療情報 ===== */}
      <SectionCard title="治療情報">
        <FieldCard label="治療費支払状況（該当するものを全て選択）">
          <CheckboxGroup options={TREATMENT_PAYMENT_OPTIONS} selected={form.treatmentPaymentStatus} onToggle={togglePaymentStatus} />
        </FieldCard>
      </SectionCard>

      {/* ===== 保険情報 ===== */}
      <SectionCard title="保険情報">
        <FieldCard label="相手の保険会社">
          <SelectInput
            id="otherInsuranceCompany"
            value={isOtherValue(form.otherInsuranceCompany) ? "その他" : form.otherInsuranceCompany}
            onChange={(v) => {
              if (v === "その他") {
                updateField("otherInsuranceCompany", otherInsuranceCompanyText ? OTHER_PREFIX + otherInsuranceCompanyText : "その他");
              } else {
                setOtherInsuranceCompanyText("");
                updateField("otherInsuranceCompany", v);
              }
            }}
            options={INSURANCE_COMPANY_OPTIONS}
          />
          {isOtherValue(form.otherInsuranceCompany) && (
            <TextInput
              id="otherInsuranceCompanyText"
              value={otherInsuranceCompanyText}
              onChange={(v) => {
                setOtherInsuranceCompanyText(v);
                updateField("otherInsuranceCompany", v ? OTHER_PREFIX + v : "その他");
              }}
              placeholder="保険会社名を入力"
            />
          )}
        </FieldCard>

        <FieldCard label="相手の保険担当者連絡先">
          <TextInput id="otherInsuranceContact" value={form.otherInsuranceContact} onChange={(v) => updateField("otherInsuranceContact", v)} placeholder="回答を入力" />
        </FieldCard>

        <FieldCard label="ご自身の任意保険会社">
          <SelectInput
            id="myInsuranceCompany"
            value={isOtherValue(form.myInsuranceCompany) ? "その他" : form.myInsuranceCompany}
            onChange={(v) => {
              if (v === "その他") {
                updateField("myInsuranceCompany", myInsuranceCompanyText ? OTHER_PREFIX + myInsuranceCompanyText : "その他");
              } else {
                setMyInsuranceCompanyText("");
                updateField("myInsuranceCompany", v);
              }
            }}
            options={INSURANCE_COMPANY_OPTIONS}
          />
          {isOtherValue(form.myInsuranceCompany) && (
            <TextInput
              id="myInsuranceCompanyText"
              value={myInsuranceCompanyText}
              onChange={(v) => {
                setMyInsuranceCompanyText(v);
                updateField("myInsuranceCompany", v ? OTHER_PREFIX + v : "その他");
              }}
              placeholder="保険会社名を入力"
            />
          )}
        </FieldCard>

        <FieldCard label="弁護士特約">
          <RadioGroup name="lawyerSpecialClause" value={form.lawyerSpecialClause} onChange={(v) => updateField("lawyerSpecialClause", v)} options={["有", "無", "不明"]} />
        </FieldCard>

        <FieldCard label="人身傷害特約">
          <RadioGroup name="personalInjuryClause" value={form.personalInjuryClause} onChange={(v) => updateField("personalInjuryClause", v)} options={["有", "無", "不明"]} />
        </FieldCard>
      </SectionCard>

      {/* ===== その他 ===== */}
      <SectionCard title="その他">
        <FieldCard label="交通事故証明書の区分">
          <RadioGroup name="accidentCertificateType" value={form.accidentCertificateType} onChange={(v) => updateField("accidentCertificateType", v)} options={["人身事故", "物損事故", "不明"]} />
        </FieldCard>

        <FieldCard label="事故車両の写真・映像はありますか？" required error={errors.hasAccidentPhotos}>
          <RadioGroup
            name="hasAccidentPhotos"
            value={form.hasAccidentPhotos}
            onChange={(v) => {
              updateField("hasAccidentPhotos", v);
              if (v === "いいえ") {
                setAccidentFiles([]);
              }
            }}
            options={["はい", "いいえ"]}
          />
        </FieldCard>

        {form.hasAccidentPhotos === "はい" && (
          <FieldCard
            label="写真・映像のアップロード"
            description={`画像または動画ファイルを選択してください（1ファイル50MB以下、最大${MAX_FILE_COUNT}ファイル）`}
            error={errors.accidentFiles}
          >
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={accidentFiles.length >= MAX_FILE_COUNT}
                className="rounded border border-gf-border bg-white px-4 py-2 text-sm text-gf-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ファイルを選択
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {accidentFiles.length > 0 && (
                <ul className="space-y-2">
                  {accidentFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-3 rounded-lg border border-gf-border bg-gf-purple-light/20 px-4 py-2.5"
                    >
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-10 w-10 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-200 text-xs text-gray-500">
                          動画
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gf-text">
                          {file.name}
                        </p>
                        <p className="text-xs text-gf-text-secondary">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="shrink-0 text-sm text-gf-error hover:underline"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FieldCard>
        )}

        <FieldCard label="備考欄">
          <TextArea id="remarks" value={form.remarks} onChange={(v) => updateField("remarks", v)} placeholder="回答を入力" />
        </FieldCard>
      </SectionCard>

      {/* Geo warning */}
      {geoWarning && (
        <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-6 py-4 text-sm text-yellow-800">
          {geoWarning}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between py-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-gf-purple px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gf-purple-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "処理中..." : "次へ"}
        </button>
        <button
          type="reset"
          onClick={() => {
            setBirthDateParts({ year: "", month: "", day: "" });
            setForm({
              name: "", nameKana: "", gender: "", birthDate: "", postalCode: "",
              address: "", phoneNumber: "", occupation: "", accidentDate: "",
              accidentLocation: "", yourVehicle: "", otherVehicle: "",
              accidentType: "", accidentDescription: "", faultRatioNotified: "",
              faultRatio: "", treatmentPaymentStatus: [],
              otherInsuranceCompany: "", otherInsuranceContact: "",
              myInsuranceCompany: "", lawyerSpecialClause: "",
              personalInjuryClause: "", accidentCertificateType: "",
              hasAccidentPhotos: "", remarks: "",
            });
          }}
          className="text-sm font-medium text-gf-purple hover:underline"
        >
          フォームをクリア
        </button>
      </div>
    </form>
  );
}
