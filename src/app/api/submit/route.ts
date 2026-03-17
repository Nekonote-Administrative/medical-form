import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuth, withRetry } from "@/lib/google-auth";

interface FacilityEntry {
  id: string;
  facilityName: string;
  facilityAddress: string;
  facilityPostalCode: string;
  facilityPhoneNumber: string;
  selectionMethod: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

interface SubmitBody {
  basicInfo: {
    name: string;
    nameKana: string;
    gender: string;
    birthDate: string;
    postalCode: string;
    address: string;
    phoneNumber: string;
    occupation: string;
    accidentDate: string;
    accidentLocation: string;
    yourVehicle: string;
    otherVehicle: string;
    accidentType: string;
    accidentDescription: string;
    faultRatioNotified: string;
    faultRatio: string;
    treatmentPaymentStatus: string[];
    otherInsuranceCompany: string;
    otherInsuranceContact: string;
    myInsuranceCompany: string;
    lawyerSpecialClause: string;
    personalInjuryClause: string;
    accidentCertificateType: string;
    hasAccidentPhotos: string;
    remarks: string;
  };
  facilities: {
    orthopedic: FacilityEntry[];
    osteopathic: FacilityEntry[];
    pharmacy: FacilityEntry[];
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  orthopedic: "整形外科",
  osteopathic: "接骨院",
  pharmacy: "薬局",
};

const CATEGORY_ROW_COUNT: Record<string, number> = {
  orthopedic: 3,
  osteopathic: 4,
  pharmacy: 3,
};

function facilityRows(
  categoryKey: string,
  entries: FacilityEntry[],
): string[][] {
  const rowCount = CATEGORY_ROW_COUNT[categoryKey] ?? 3;
  const rows: string[][] = [];
  for (let i = 0; i < rowCount; i++) {
    const entry = entries[i];
    rows.push([
      i === 0 ? CATEGORY_LABELS[categoryKey] ?? categoryKey : "",
      entry?.facilityName ?? "",
      entry?.facilityPostalCode ?? "",
      entry?.facilityAddress ?? "",
      entry?.facilityPhoneNumber ?? "",
      "", // 備考
      "TRUE", // プリント（チェックボックス）
    ]);
  }
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json();
    const { basicInfo, facilities } = body;

    if (!basicInfo || !facilities) {
      return NextResponse.json(
        { error: "必要なデータが不足しています" },
        { status: 400 },
      );
    }

    const auth = getAuth();
    const templateId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    if (!templateId || !parentFolderId) {
      return NextResponse.json(
        { error: "Google Drive/Sheets の設定が不足しています" },
        { status: 500 },
      );
    }

    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    // -------------------------------------------------------
    // 1. Google Drive に依頼者名（カタカナ）フォルダを作成
    // -------------------------------------------------------
    const folderName = basicInfo.nameKana;
    const folder = await withRetry(
      () =>
        drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentFolderId],
          },
          fields: "id",
          supportsAllDrives: true,
        }),
      1,
    );
    const folderId = folder.data.id;
    if (!folderId) {
      throw new Error("フォルダの作成に失敗しました");
    }

    // -------------------------------------------------------
    // 2. テンプレート Spreadsheet をフォルダにコピー
    // -------------------------------------------------------
    const copiedFile = await withRetry(() =>
      drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: `${folderName}_ヒアリングシート`,
          parents: [folderId],
        },
        fields: "id",
        supportsAllDrives: true,
      }),
    );
    const spreadsheetId = copiedFile.data.id;
    if (!spreadsheetId) {
      throw new Error("テンプレートのコピーに失敗しました");
    }

    // -------------------------------------------------------
    // 3. 「印刷用顧客データ」タブにフォーム回答を書き込み
    // -------------------------------------------------------
    const treatmentPaymentText =
      basicInfo.treatmentPaymentStatus?.join("、") || "";

    // B1:Z1 の列順に対応するデータ配列
    // B=氏名, C=フリガナ, D=性別, E=生年月日, F=郵便番号, G=住所,
    // H=電話番号, I=職業, J=事故日, K=事故場所, L=自車両, M=相手車両,
    // N=事故状況の説明, O=事故形態, P=過失割合通知, Q=過失割合,
    // R=治療費支払状況, S=相手保険会社(固定), T=相手保険会社の連絡先(固定),
    // U=自分の保険会社, V=弁護士特約(固定), W=人身傷害特約,
    // X=事故証明書種類, Y=事故写真有無, Z=備考
    const customerDataRow = [
      basicInfo.name,
      basicInfo.nameKana,
      basicInfo.gender,
      basicInfo.birthDate,
      basicInfo.postalCode,
      basicInfo.address,
      basicInfo.phoneNumber,
      basicInfo.occupation,
      basicInfo.accidentDate,
      basicInfo.accidentLocation,
      basicInfo.yourVehicle,
      basicInfo.otherVehicle,
      basicInfo.accidentDescription,
      basicInfo.accidentType,
      basicInfo.faultRatioNotified,
      basicInfo.faultRatio,
      treatmentPaymentText,
      basicInfo.otherInsuranceCompany,
      basicInfo.otherInsuranceContact,
      basicInfo.myInsuranceCompany,
      basicInfo.lawyerSpecialClause,
      basicInfo.personalInjuryClause,
      basicInfo.accidentCertificateType,
      basicInfo.hasAccidentPhotos,
      basicInfo.remarks,
    ];

    // データを1行目に書き込み（B1:Z1）
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "印刷用顧客データ!B1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [customerDataRow],
        },
      }),
    );

    // -------------------------------------------------------
    // 4. 「通院先リスト」タブに施設データを書き込み
    // -------------------------------------------------------
    const rows: string[][] = [];
    for (const key of ["orthopedic", "pharmacy", "osteopathic"] as const) {
      const entries = (facilities[key] || []).slice(
        0,
        CATEGORY_ROW_COUNT[key] ?? 3,
      );
      rows.push(...facilityRows(key, entries));
    }

    const spreadsheet = await withRetry(() =>
      sheets.spreadsheets.get({ spreadsheetId }),
    );
    const targetSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === "通院先リスト",
    );
    const sheetId = targetSheet?.properties?.sheetId ?? 0;

    await withRetry(() =>
      sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "通院先リスト!A3:G",
      }),
    );

    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "通院先リスト!G2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["プリント"]] },
      }),
    );

    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "通院先リスト!A3",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
      }),
    );

    const dataRowCount = rows.length;
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              setDataValidation: {
                range: {
                  sheetId,
                  startRowIndex: 2,
                  endRowIndex: 2 + dataRowCount,
                  startColumnIndex: 6,
                  endColumnIndex: 7,
                },
                rule: {
                  condition: { type: "BOOLEAN" },
                  showCustomUi: true,
                },
              },
            },
          ],
        },
      }),
    );

    return NextResponse.json({
      success: true,
      spreadsheetId,
      folderId,
    });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "送信中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
