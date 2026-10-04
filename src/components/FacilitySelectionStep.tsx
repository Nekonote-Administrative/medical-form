"use client";

import { useState } from "react";
import FacilitySearchSection from "@/components/FacilitySearchSection";
import { useFormContext } from "@/lib/form-context";
import { CATEGORIES, CATEGORY_LABELS, FacilityCategory } from "@/types";

export default function FacilitySelectionStep() {
  const { state, dispatch } = useFormContext();
  const [activeCategory, setActiveCategory] = useState<FacilityCategory>(CATEGORIES[0]);
  const [showReminder, setShowReminder] = useState(false);

  const completed = (category: FacilityCategory) =>
    state.facilityNotApplicable[category] || state.facilities[category].length > 0;
  const completedCount = CATEGORIES.filter(completed).length;

  const goNext = () => {
    const firstIncomplete = CATEGORIES.find((category) => !completed(category));
    if (firstIncomplete) {
      setActiveCategory(firstIncomplete);
      setShowReminder(firstIncomplete === activeCategory);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    dispatch({ type: "SET_STEP", payload: 4 });
  };

  return (
    <div>
      <div className="mb-3 overflow-hidden rounded-lg border border-gf-border bg-white">
        <div className="h-[10px] bg-gf-purple" />
        <div className="px-6 py-5">
          <h2 className="text-2xl font-normal text-gf-text">通院先情報</h2>
          <p className="mt-2 text-sm text-gf-text-secondary">
            3つの区分を確認してください。利用していない区分も選択してください。
          </p>
          <p className="mt-2 text-sm font-medium text-gf-purple">確認済み {completedCount} / 3</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2" role="group" aria-label="通院先の区分">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={activeCategory === category}
            onClick={() => { setActiveCategory(category); setShowReminder(false); }}
            className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
              activeCategory === category
                ? "border-gf-purple bg-gf-purple-light text-gf-purple"
                : "border-gf-border bg-white text-gf-text hover:border-gf-purple"
            }`}
          >
            <span className="block font-medium">{CATEGORY_LABELS[category]}</span>
            <span className="mt-1 block text-xs">
              {state.facilityNotApplicable[category]
                ? "通院なし"
                : state.facilities[category].length > 0
                  ? `登録済み ${state.facilities[category].length}件`
                  : "未回答"}
            </span>
          </button>
        ))}
      </div>

      {showReminder && !completed(activeCategory) && (
        <p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-gf-error">
          {CATEGORY_LABELS[activeCategory]}を追加するか「通院していません」を選んでください。
        </p>
      )}

      <FacilitySearchSection key={activeCategory} category={activeCategory} />

      <div className="flex items-center justify-between gap-3 py-2">
        <button type="button" onClick={() => dispatch({ type: "SET_STEP", payload: 2 })} className="rounded bg-white px-5 py-2.5 text-sm font-medium text-gf-purple shadow-sm ring-1 ring-gf-border">
          戻る
        </button>
        <button type="button" onClick={goNext} className="rounded bg-gf-purple px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gf-purple-dark">
          {completedCount === CATEGORIES.length
            ? "確認画面へ"
            : completed(activeCategory)
              ? "次の未回答へ"
              : "次へ"}
        </button>
      </div>
    </div>
  );
}
