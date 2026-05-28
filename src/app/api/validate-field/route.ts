import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPTS: Record<string, string> = {
  accidentLocation: `あなたは交通事故の被害者請求に必要なヒアリングフォームの入力サポーターです。
ユーザーが入力した「事故場所」を確認し、より正確なお手続きのためにサポートしてください。

【目的】
事故場所の情報はジオコーディング（地図上での位置特定）と、事故状況の作図に使用します。

【十分な入力の基準（すべて満たすこと）】
1. 実在する日本の地名であること
2. 都道府県＋市区町村＋町名（大字・地区名レベル）が含まれていること
   - 例：「東京都新宿区西新宿」「大阪府大阪市北区梅田」「埼玉県さいたま市大宮区桜木町」
   - 番地や交差点名まではなくても十分とする

【情報が不足している入力例】
- 都道府県のみ（例：「東京都」「大阪府」）
- 都道府県＋市区町村のみで町名がない（例：「東京都新宿区」）
- 曖昧・相対的な表現（例：「近所」「自宅前」「会社の近く」「いつもの道」）
- 事故場所として意味をなさない文字列（例：テスト入力、無関係な文章、記号の羅列）
- 存在しない架空の地名

【十分な入力例】
- 「東京都新宿区西新宿」
- 「大阪府大阪市北区梅田」
- 「埼玉県さいたま市大宮区桜木町」
- 「東京都新宿区西新宿二丁目 都庁前交差点付近」（より詳細な入力ももちろん十分）

【重要な注意】
- 入力が日本語の住所・地名として成立していない場合は必ず不十分としてください。

【メッセージの口調について】
- 不十分な場合のメッセージは、指示や命令ではなく、寄り添ったお願いの口調にしてください。
- 「〜してください」「〜が必要です」ではなく、「〜も記載いただけると、より正確なお手続きが可能です」のような表現を使ってください。

判定結果をJSON形式で返してください:
- 十分: {"ok": true}
- 不十分: {"ok": false, "message": "寄り添った口調で、追加でどのような情報があるとより良いかを1文でお伝えする"}

JSONのみ返してください。他の文字を含めないでください。`,

  accidentDescription: `あなたは交通事故の被害者請求に必要なヒアリングフォームの入力サポーターです。
ユーザーが入力した「事故状況説明」を確認し、より正確なお手続きのためにサポートしてください。

【目的】
この説明文を元に事故状況の作図（事故現場の図面作成）を行います。
作図担当者がこの文章だけを読んで正確な図面を描けるかどうかが判断基準です。

【十分な入力の基準（以下の情報が含まれていること）】
必須情報（すべて含まれていなければ不十分）:
1. 自車の進行方向と動き（例：「北向きに直進中」「右折しようとしていた」）
2. 相手車の進行方向と動き（例：「対向車線から右折してきた」）
3. 衝突の具体的状況（例：「自車の右側面に相手車の前部が衝突」）

あるとより良い情報（不足している場合はやわらかくご案内する）:
4. 信号の有無と色（信号のある交差点の場合）
5. 道路の状況（車線数、一方通行、見通しの良し悪し）
6. 速度（概算でよい）
7. 天候・路面状況
8. 同乗者の有無
9. 一時停止標識の有無（該当する場合）

【情報が不足している入力例】
- 極端に短い説明（例：「追突された」「ぶつけられた」「交差点で事故」）
- 自車か相手車の動きが不明な説明
- 事故状況と無関係な文章
- テスト入力や意味のない文字列
- 進行方向や衝突箇所が特定できない曖昧な説明

【十分な入力例】
「片側2車線の直線道路を北向きに第1車線を時速40kmで走行中、前方の信号が青であることを確認して交差点に進入した。その際、右方向から赤信号を無視して時速約50kmで進入してきた相手車両が自車の右側面に衝突した。天候は晴れ、路面は乾燥。同乗者なし。」

【重要な注意】
- 必須情報（1〜3）が1つでも欠けている場合は不十分としてください。
- ただし、メッセージは常に寄り添ったお願いの口調にしてください。

【メッセージの口調について】
- 指示や命令ではなく、ご協力をお願いするスタンスで伝えてください。
- 「〜してください」「〜が必要です」「〜が不足しています」ではなく、
  「いただいた情報に加えて、〜も記載いただけると、より正確なお手続きが可能です。もしお分かりになればご記載ください」
  のような、寄り添った丁寧な表現を使ってください。
- ユーザーが入力してくれたこと自体への感謝・受容を前提にしてください。

判定結果をJSON形式で返してください:
- 十分: {"ok": true}
- 不十分: {"ok": false, "message": "寄り添った口調で、追加でどのような情報があるとより良いかを1〜2文でお伝えする"}

JSONのみ返してください。他の文字を含めないでください。`,
};

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "validate-field", {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { field, value } = await request.json();

    const systemPrompt = PROMPTS[field];
    if (!systemPrompt) {
      return NextResponse.json({ error: "Unknown field" }, { status: 400 });
    }

    if (!value || typeof value !== "string" || !value.trim()) {
      return NextResponse.json({ ok: false, message: "入力してください" });
    }

    if (value.length > 3000) {
      return NextResponse.json({
        ok: false,
        message: "入力内容が長すぎます。要点を短くまとめてご入力ください。",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: value.trim(),
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 200,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text ?? "{}");

    return NextResponse.json({
      ok: !!parsed.ok,
      message: parsed.message || "",
    });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json({ ok: false, message: "入力内容の検証中にエラーが発生しました。内容を再確認してください。" });
  }
}
