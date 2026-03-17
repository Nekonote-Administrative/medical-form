import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { getAuth, withRetry } from "@/lib/google-auth";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const folderId = formData.get("folderId");

    if (!folderId || typeof folderId !== "string") {
      return NextResponse.json(
        { error: "folderId が指定されていません" },
        { status: 400 },
      );
    }

    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `ファイルは最大${MAX_FILES}個までです` },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.name} が50MBを超えています` },
          { status: 400 },
        );
      }
    }

    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });

    const uploaded: { name: string; id: string }[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      const result = await withRetry(() =>
        drive.files.create({
          requestBody: {
            name: file.name,
            parents: [folderId],
          },
          media: {
            mimeType: file.type,
            body: stream,
          },
          fields: "id,name",
          supportsAllDrives: true,
        }),
      );

      if (result.data.id && result.data.name) {
        uploaded.push({ name: result.data.name, id: result.data.id });
      }
    }

    return NextResponse.json({ success: true, uploaded });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "ファイルのアップロード中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
