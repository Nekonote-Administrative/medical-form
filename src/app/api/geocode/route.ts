import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "geocode", {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { address } = body;

    if (
      !address ||
      typeof address !== "string" ||
      address.trim() === "" ||
      address.length > 300
    ) {
      return NextResponse.json(
        { error: "住所を入力してください" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key is not configured" },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address.trim())}&key=${apiKey}&language=ja`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "住所から座標を取得できませんでした" },
        { status: 400 }
      );
    }

    const { lat, lng } = data.results[0].geometry.location;

    return NextResponse.json({ lat, lng });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json(
      { error: "ジオコーディング中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
