"use client";

import { useEffect, useRef } from "react";
import { useFormContext } from "@/lib/form-context";
import { FacilityCategory } from "@/types";

const CATEGORIES: FacilityCategory[] = ["orthopedic", "osteopathic", "pharmacy"];

const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  orthopedic: "整形外科",
  osteopathic: "整骨院",
  pharmacy: "薬局",
};

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="text-sm text-gf-text-secondary sm:w-44 shrink-0">{label}</dt>
      <dd className="text-sm text-gf-text whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatJapaneseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${year}年${month}月${day}日`;
}

export default function ConfirmationView() {
  const { state, dispatch, accidentFilesRef } = useFormContext();
  const accidentFiles = accidentFilesRef.current;
  const playerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YT.Player | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (typeof window === "undefined") return;

    const initPlayer = () => {
      if (!playerRef.current || ytPlayerRef.current) return;
      ytPlayerRef.current = new window.YT.Player(playerRef.current, {
        videoId: "6pRMxwYCfnc",
        width: "100%",
        height: "100%",
        playerVars: { rel: 0 },
        events: {
          onStateChange: (event: YT.OnStateChangeEvent) => {
            // 再生開始時(state=1)に全画面表示をリクエスト
            if (event.data === 1) {
              try {
                const iframe = event.target.getIframe();
                if (iframe.requestFullscreen) {
                  iframe.requestFullscreen();
                } else if ((iframe as unknown as Record<string, () => void>).webkitRequestFullscreen) {
                  (iframe as unknown as Record<string, () => void>).webkitRequestFullscreen();
                }
              } catch {
                // 全画面表示に失敗しても動画再生は継続
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }
  }, []);

  const handleBack = () => dispatch({ type: "SET_STEP", payload: 3 });
  const handleNext = () => dispatch({ type: "SET_STEP", payload: 5 });

  const bi = state.basicInfo;

  return (
    <div>
      {/* Title card */}
      <div className="mb-3 overflow-hidden rounded-lg border border-gf-border bg-white">
        <div className="h-[10px] bg-gf-purple" />
        <div className="px-6 py-5">
          <h2 className="text-2xl font-normal text-gf-text">入力内容の確認</h2>
          <p className="mt-2 text-sm text-gf-text-secondary">
            以下の内容をご確認ください。問題がなければ「次へ」を押して、カウンセリング日程の選択に進んでください。
          </p>
        </div>
      </div>

      {/* 個人情報 */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <h3 className="mb-2 text-base font-medium text-gf-text">個人情報</h3>
        <dl className="divide-y divide-gray-100">
          <InfoRow label="氏名" value={bi.name} />
          <InfoRow label="フリガナ" value={bi.nameKana} />
          <InfoRow label="性別" value={bi.gender} />
          <InfoRow label="生年月日" value={formatJapaneseDate(bi.birthDate)} />
          <InfoRow label="郵便番号" value={bi.postalCode} />
          <InfoRow label="住所" value={bi.address} />
          <InfoRow label="電話番号" value={bi.phoneNumber} />
          <InfoRow label="職業" value={bi.occupation} />
        </dl>
      </div>

      {/* 事故情報 */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <h3 className="mb-2 text-base font-medium text-gf-text">事故情報</h3>
        <dl className="divide-y divide-gray-100">
          <InfoRow label="事故日" value={formatJapaneseDate(bi.accidentDate)} />
          <InfoRow label="事故場所" value={bi.accidentLocation} />
          <InfoRow label="あなたの乗り物" value={bi.yourVehicle} />
          <InfoRow label="相手の乗り物" value={bi.otherVehicle} />
          <InfoRow label="事故種別" value={bi.accidentType} />
          <InfoRow label="事故状況説明" value={bi.accidentDescription} />
          <InfoRow label="過失割合通知" value={bi.faultRatioNotified} />
          {bi.faultRatioNotified === "はい" && <InfoRow label="過失割合" value={bi.faultRatio} />}
        </dl>
      </div>

      {/* 治療情報 */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <h3 className="mb-2 text-base font-medium text-gf-text">治療情報</h3>
        <dl className="divide-y divide-gray-100">
          {bi.treatmentPaymentStatus.length > 0 && (
            <InfoRow label="治療費支払状況" value={bi.treatmentPaymentStatus.join("、")} />
          )}
        </dl>
      </div>

      {/* 保険情報 */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <h3 className="mb-2 text-base font-medium text-gf-text">保険情報</h3>
        <dl className="divide-y divide-gray-100">
          <InfoRow label="相手の保険会社" value={bi.otherInsuranceCompany} />
          <InfoRow label="相手保険担当者連絡先" value={bi.otherInsuranceContact} />
          <InfoRow label="ご自身の保険会社" value={bi.myInsuranceCompany} />
          <InfoRow label="弁護士特約" value={bi.lawyerSpecialClause} />
          <InfoRow label="人身傷害特約" value={bi.personalInjuryClause} />
        </dl>
      </div>

      {/* その他 */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <h3 className="mb-2 text-base font-medium text-gf-text">その他</h3>
        <dl className="divide-y divide-gray-100">
          <InfoRow label="交通事故証明書区分" value={bi.accidentCertificateType} />
          <InfoRow label="事故車両写真・映像" value={bi.hasAccidentPhotos} />
          {accidentFiles.length > 0 && (
            <div className="py-2">
              <dt className="text-sm text-gf-text-secondary mb-2">アップロード予定ファイル</dt>
              <dd>
                <ul className="space-y-1.5">
                  {accidentFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-3 rounded-lg border border-gf-border bg-gf-purple-light/20 px-3 py-2"
                    >
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-500">
                          動画
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-gf-text">
                        {file.name}
                      </span>
                      <span className="shrink-0 text-xs text-gf-text-secondary">
                        {formatFileSize(file.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          <InfoRow label="備考" value={bi.remarks} />
        </dl>
      </div>

      {/* 通院先情報 */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <h3 className="mb-3 text-base font-medium text-gf-text">通院先情報</h3>
        <div className="space-y-4">
          {CATEGORIES.map((category) => {
            const facilities = state.facilities[category];
            return (
              <div key={category}>
                <h4 className="text-sm font-medium text-gf-text-secondary mb-1.5">
                  {CATEGORY_LABELS[category]}
                </h4>
                {facilities.length === 0 ? (
                  <p className="text-sm text-gray-400">通院なし</p>
                ) : (
                  <ul className="space-y-1.5">
                    {facilities.map((facility) => (
                      <li
                        key={facility.id}
                        className="rounded-lg border border-gf-border bg-gf-purple-light/30 px-4 py-3"
                      >
                        <span className="text-sm font-medium text-gf-text">
                          {facility.facilityName}
                        </span>
                        {facility.facilityAddress && (
                          <span className="block text-xs text-gf-text-secondary mt-0.5">
                            {facility.facilityPostalCode && `〒${facility.facilityPostalCode} `}
                            {facility.facilityAddress}
                          </span>
                        )}
                        {facility.facilityPhoneNumber && (
                          <span className="block text-xs text-gray-400 mt-0.5">
                            TEL: {facility.facilityPhoneNumber}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* YouTube video */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <p className="mb-3 text-sm text-gf-text">
          以下の動画もご確認ください。
        </p>
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <div ref={playerRef} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={handleBack}
          className="rounded bg-white px-5 py-2.5 text-sm font-medium text-gf-purple shadow-sm ring-1 ring-gf-border transition-colors hover:bg-gray-50"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="rounded bg-gf-purple px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gf-purple-dark"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
