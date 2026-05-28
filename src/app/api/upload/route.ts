import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { getAuth, withRetry } from "@/lib/google-auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { verifyUploadToken } from "@/lib/upload-token";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TOTAL_FILE_SIZE = 150 * 1024 * 1024; // 150MB
const MAX_REQUEST_SIZE = MAX_TOTAL_FILE_SIZE + 5 * 1024 * 1024;
const MAX_FILES = 10;
const FALLBACK_ALLOWED_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|heic|heif|mp4|mov|m4v|avi|webm)$/i;

function isAllowedUploadFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    ((file.type === "" || file.type === "application/octet-stream") &&
      FALLBACK_ALLOWED_EXTENSIONS.test(file.name))
  );
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "upload", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json(
      { error: "アップロード容量が大きすぎます" },
      { status: 413 },
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "アップロード形式が正しくありません" },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const uploadToken = formData.get("uploadToken");
    const tokenPayload = verifyUploadToken(uploadToken);

    if (!tokenPayload) {
      return NextResponse.json(
        { error: "アップロードの有効期限が切れています" },
        { status: 403 },
      );
    }

    const folderId = tokenPayload.folderId;

    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File);

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

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_FILE_SIZE) {
      return NextResponse.json(
        { error: "アップロードできる合計容量は150MBまでです" },
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

      if (!isAllowedUploadFile(file)) {
        return NextResponse.json(
          { error: `${file.name} はアップロードできない形式です` },
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
