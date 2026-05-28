"use client";

import { useState, useCallback } from "react";
import { useFormContext } from "@/lib/form-context";
import MapView from "@/components/MapView";
import {
  FacilityCategory,
  CATEGORY_LABELS,
  CATEGORY_MAX,
  FacilityEntry,
  FacilitySearchResult,
} from "@/types";

interface FacilitySearchSectionProps {
  category: FacilityCategory;
}

export default function FacilitySearchSection({ category }: FacilitySearchSectionProps) {
  const { state, dispatch } = useFormContext();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FacilitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState("");
  const [hoveredResultIndex, setHoveredResultIndex] = useState<number | null>(null);

  const facilities = state.facilities[category] ?? [];
  const notApplicable = state.facilityNotApplicable[category] ?? false;

  const getSearchCenter = useCallback((): { lat: number; lng: number } | null => {
    const addr = state.addressGeoLocation;
    const acc = state.accidentGeoLocation;
    if (addr && acc) return { lat: (addr.lat + acc.lat) / 2, lng: (addr.lng + acc.lng) / 2 };
    if (addr) return { lat: addr.lat, lng: addr.lng };
    if (acc) return { lat: acc.lat, lng: acc.lng };
    return null;
  }, [state.addressGeoLocation, state.accidentGeoLocation]);

  const mapCenter = getSearchCenter() ?? { lat: 35.6812, lng: 139.7671 };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const center = getSearchCenter();
    if (!center) {
      setSearchError("住所または事故場所の位置情報が設定されていません。");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, category, lat: center.lat, lng: center.lng }),
      });

      if (!res.ok) throw new Error("検索に失敗しました");

      const data: { results: FacilitySearchResult[] } = await res.json();
      setSearchResults(data.results);

      if (data.results.length === 0) {
        setSearchError("検索結果が見つかりませんでした。キーワードを変えてお試しください。");
      }
    } catch {
      setSearchError("検索中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setSearching(false);
    }
  };

  const maxFacilities = CATEGORY_MAX[category];
  const isAtLimit = facilities.length >= maxFacilities;

  const addFromSearch = (result: FacilitySearchResult) => {
    if (isAtLimit) return;
    const entry: FacilityEntry = {
      id: crypto.randomUUID(),
      facilityName: result.name,
      facilityAddress: result.address,
      facilityPostalCode: result.postalCode,
      facilityPhoneNumber: result.phoneNumber,
      selectionMethod: "search",
      placeId: result.placeId,
      lat: result.lat,
      lng: result.lng,
    };
    dispatch({ type: "ADD_FACILITY", payload: { category, entry } });
    setSearchResults((prev) => prev.filter((r) => r.placeId !== result.placeId));
  };

  const addManual = () => {
    if (isAtLimit) return;
    const trimmed = manualName.trim();
    if (!trimmed) return;
    const entry: FacilityEntry = {
      id: crypto.randomUUID(),
      facilityName: trimmed,
      facilityAddress: "",
      facilityPostalCode: "",
      facilityPhoneNumber: "",
      selectionMethod: "manual",
    };
    dispatch({ type: "ADD_FACILITY", payload: { category, entry } });
    setManualName("");
    setShowManualInput(false);
  };

  const removeFacility = (id: string) => {
    dispatch({ type: "REMOVE_FACILITY", payload: { category, id } });
  };

  const setNotApplicable = (value: boolean) => {
    dispatch({
      type: "SET_FACILITY_NOT_APPLICABLE",
      payload: { category, value },
    });
  };

  const canProceed = notApplicable || facilities.length > 0;

  const goBack = () => dispatch({ type: "SET_STEP", payload: state.currentStep - 1 });
  const goNext = () => {
    if (!canProceed) return;
    setQuery("");
    setSearchResults([]);
    setSearchError(null);
    setShowManualInput(false);
    setManualName("");
    dispatch({ type: "SET_STEP", payload: state.currentStep + 1 });
  };

  const mapMarkers = searchResults.map((r) => ({ lat: r.lat, lng: r.lng, name: r.name }));

  return (
    <div>
      {/* Title card */}
      <div className="mb-3 overflow-hidden rounded-lg border border-gf-border bg-white">
        <div className="h-[10px] bg-gf-purple" />
        <div className="px-6 py-5">
          <h2 className="text-2xl font-normal text-gf-text">
            {CATEGORY_LABELS[category]}の検索
          </h2>
          <p className="mt-2 text-sm text-gf-text-secondary">
            通院している{CATEGORY_LABELS[category]}を検索して追加してください。
          </p>
        </div>
      </div>

      {/* Added facilities */}
      {facilities.length > 0 && (
        <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
          <p className="mb-3 text-sm font-medium text-gf-text">
            追加済みの施設（{facilities.length}件）
          </p>
          <ul className="space-y-2">
            {facilities.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-gf-border bg-gf-purple-light/30 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gf-text">{f.facilityName}</p>
                  {f.facilityAddress && (
                    <p className="truncate text-xs text-gf-text-secondary">{f.facilityAddress}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFacility(f.id)}
                  className="ml-3 shrink-0 text-sm text-gf-error hover:underline"
                  aria-label={`${f.facilityName}を削除`}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Not applicable */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={notApplicable}
            onChange={() => setNotApplicable(!notApplicable)}
            className="sr-only"
          />
          <span
            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border-2 transition-colors ${
              notApplicable ? "border-gf-purple bg-gf-purple" : "border-gray-400 bg-white"
            }`}
          >
            {notApplicable && (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </span>
          <span className="text-sm text-gf-text">このカテゴリには通院していません</span>
        </label>
      </div>

      {/* Limit message */}
      {isAtLimit && !notApplicable && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-6 py-4 text-sm text-blue-700">
          上限（{maxFacilities}件）に達しました。不要な施設を削除すると追加できます。
        </div>
      )}

      {/* Search */}
      {!notApplicable && !isAtLimit && (
        <>
          <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
            <p className="mb-3 text-sm text-gf-text">施設を検索</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="施設名や特徴を入力（例：「駅前のたなか」「大通り沿い」）"
                className="w-full border-b border-gf-border bg-transparent py-2 text-sm text-gf-text outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-gf-input-focus"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="shrink-0 rounded bg-gf-purple px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gf-purple-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "検索"
                )}
              </button>
            </div>

            {searchError && (
              <p className="mt-3 flex items-center gap-1 text-xs text-gf-error">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {searchError}
              </p>
            )}

            {/* Loading */}
            {searching && (
              <div className="mt-4 flex items-center justify-center py-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gf-purple border-t-transparent" />
                  <p className="text-sm text-gf-text-secondary">検索中...</p>
                </div>
              </div>
            )}

            {/* Results */}
            {!searching && searchResults.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-gf-text">
                  検索結果（{searchResults.length}件）
                </p>
                <ul className="space-y-2">
                  {searchResults.map((result, index) => (
                    <li
                      key={result.placeId ?? index}
                      className={`cursor-pointer rounded-lg border px-4 py-3 transition-colors ${
                        hoveredResultIndex === index
                          ? "border-gf-purple bg-gf-purple-light"
                          : "border-gf-border hover:border-gf-purple hover:bg-gf-purple-light/50"
                      }`}
                      onClick={() => addFromSearch(result)}
                      onMouseEnter={() => setHoveredResultIndex(index)}
                      onMouseLeave={() => setHoveredResultIndex(null)}
                      onFocus={() => setHoveredResultIndex(index)}
                      onBlur={() => setHoveredResultIndex(null)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          addFromSearch(result);
                        }
                      }}
                    >
                      <p className="text-sm font-medium text-gf-text">{result.name}</p>
                      <p className="mt-0.5 text-xs text-gf-text-secondary">
                        {result.postalCode && `〒${result.postalCode} `}
                        {result.address}
                      </p>
                      {result.phoneNumber && (
                        <p className="mt-0.5 text-xs text-gray-400">TEL: {result.phoneNumber}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Map */}
            {(searchResults.length > 0 || getSearchCenter()) && (
              <div className="mt-4">
                <MapView center={mapCenter} markers={mapMarkers} highlightedIndex={hoveredResultIndex} />
              </div>
            )}

            {/* Manual input */}
            <div className="mt-4">
              {!showManualInput ? (
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="text-sm text-gf-purple hover:underline"
                >
                  見つからない場合は手入力
                </button>
              ) : (
                <div className="rounded-lg border border-gf-border bg-gray-50 p-4">
                  <p className="mb-2 text-sm text-gf-text">施設名を手入力</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          addManual();
                        }
                      }}
                      placeholder="施設名を入力"
                      className="w-full border-b border-gf-border bg-transparent py-2 text-sm text-gf-text outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-gf-input-focus"
                    />
                    <button
                      type="button"
                      onClick={addManual}
                      disabled={!manualName.trim()}
                      className="shrink-0 rounded bg-gf-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gf-purple-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      追加
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowManualInput(false); setManualName(""); }}
                    className="mt-2 text-xs text-gf-text-secondary hover:underline"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex items-start justify-between py-2">
        <button
          type="button"
          onClick={goBack}
          className="shrink-0 rounded bg-white px-5 py-2.5 text-sm font-medium text-gf-purple shadow-sm ring-1 ring-gf-border transition-colors hover:bg-gray-50"
        >
          戻る
        </button>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="rounded bg-gf-purple px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gf-purple-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            次へ
          </button>
          {!canProceed && (
            <p className="text-xs text-gf-text-secondary">
              施設を追加するか「通院していません」にチェック
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
