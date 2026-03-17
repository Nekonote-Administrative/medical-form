import { google } from "googleapis";

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const code = (error as { code?: string }).code;
      if (
        code !== "ECONNRESET" &&
        code !== "ETIMEDOUT" &&
        code !== "ECONNREFUSED"
      )
        throw error;
      console.warn(
        `[withRetry] attempt ${attempt + 1} failed with ${code}, retrying...`,
      );
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

export function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (privateKey && !privateKey.includes("-----BEGIN")) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
  }

  if (!email || !privateKey) {
    throw new Error("Google credentials are not configured");
  }

  return new google.auth.JWT(email, undefined, privateKey, [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ]);
}
