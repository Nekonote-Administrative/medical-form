import crypto from "node:crypto";

interface UploadTokenPayload {
  folderId: string;
  exp: number;
}

const DEFAULT_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function getUploadTokenSecret() {
  const secret =
    process.env.UPLOAD_TOKEN_SECRET ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!secret) {
    throw new Error("Upload token secret is not configured");
  }

  return secret;
}

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", getUploadTokenSecret())
    .update(payload)
    .digest("base64url");
}

function timingSafeEqualText(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return (
    aBuffer.length === bBuffer.length &&
    crypto.timingSafeEqual(aBuffer, bBuffer)
  );
}

export function createUploadToken(
  folderId: string,
  ttlMs = DEFAULT_TOKEN_TTL_MS,
) {
  const payload = Buffer.from(
    JSON.stringify({ folderId, exp: Date.now() + ttlMs }),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyUploadToken(token: unknown): UploadTokenPayload | null {
  if (typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [payload, signature] = parts;
  const expectedSignature = signPayload(payload);
  if (!timingSafeEqualText(signature, expectedSignature)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<UploadTokenPayload>;

    if (
      typeof decoded.folderId !== "string" ||
      decoded.folderId.length === 0 ||
      typeof decoded.exp !== "number" ||
      decoded.exp < Date.now()
    ) {
      return null;
    }

    return { folderId: decoded.folderId, exp: decoded.exp };
  } catch {
    return null;
  }
}
