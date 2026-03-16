import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

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

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n",
    );
    // Wrap raw base64 key in PEM headers if missing
    if (privateKey && !privateKey.includes("-----BEGIN")) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
    }
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!email || !privateKey || !spreadsheetId) {
      return NextResponse.json(
        { error: "Google Sheets credentials are not configured" },
        { status: 500 },
      );
    }

    const auth = new google.auth.JWT(email, undefined, privateKey, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);

    const sheets = google.sheets({ version: "v4", auth });

    const rows: string[][] = [];
    for (const key of ["orthopedic", "pharmacy", "osteopathic"] as const) {
      const entries = (facilities[key] || []).slice(0, CATEGORY_ROW_COUNT[key] ?? 3);
      rows.push(...facilityRows(key, entries));
    }

    // Get sheetId for 通院先リスト
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const targetSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === "通院先リスト",
    );
    const sheetId = targetSheet?.properties?.sheetId ?? 0;

    // Clear existing data (keep header row 1-2, clear from row 3 onward)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "通院先リスト!A3:G",
    });

    // Write header label for G2
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "通院先リスト!G2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["プリント"]] },
    });

    // Write facility data (A3:G)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "通院先リスト!A3",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });

    // Set checkbox data validation on G3:G12
    const dataRowCount = rows.length; // 10 rows (3+3+4)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 2, // row 3 (0-indexed)
                endRowIndex: 2 + dataRowCount,
                startColumnIndex: 6, // column G (0-indexed)
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
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "送信中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
