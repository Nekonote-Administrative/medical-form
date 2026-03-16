import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const categoryLabels: Record<string, string> = {
  orthopedic: "整形外科",
  osteopathic: "整骨院",
  pharmacy: "薬局",
};

async function refineQuery(
  query: string,
  categoryLabel: string
): Promise<string> {
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system:
        `あなたは医療機関検索のアシスタントです。ユーザーの曖昧な入力を、Google Places APIで検索するのに適したクエリに変換してください。カテゴリ: ${categoryLabel}。ユーザー入力をそのまま使える場合はそのまま返してください。日本語で返答してください。検索クエリのみを返してください。`,
      messages: [{ role: "user", content: query }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (textBlock && textBlock.type === "text") {
      return textBlock.text.trim();
    }
    return query;
  } catch (error) {
    console.error("Claude API error, falling back to raw query:", error);
    return query;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, category, lat, lng } = body;

    if (!query || !category || lat == null || lng == null) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    const categoryLabel = categoryLabels[category];
    if (!categoryLabel) {
      return NextResponse.json(
        { error: "無効なカテゴリです" },
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

    // Step 1: Refine query with Claude
    const refinedQuery = await refineQuery(query, categoryLabel);

    // Step 2: Search with Google Places API (New)
    const placesResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.addressComponents",
        },
        body: JSON.stringify({
          textQuery: `${refinedQuery} ${categoryLabel}`,
          locationBias: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng,
              },
              radius: 10000.0,
            },
          },
          languageCode: "ja",
          maxResultCount: 8,
        }),
      }
    );

    const placesData = await placesResponse.json();

    if (!placesData.places || placesData.places.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Step 3: Map results
    const results = placesData.places.map(
      (place: {
        id: string;
        displayName: { text: string };
        formattedAddress: string;
        location: { latitude: number; longitude: number };
        nationalPhoneNumber?: string;
        addressComponents?: Array<{ types: string[]; longText: string }>;
      }) => {
        const postalCode =
          place.addressComponents
            ?.find((c) => c.types.includes("postal_code"))
            ?.longText ?? "";
        return {
          placeId: place.id,
          name: place.displayName.text,
          address: place.formattedAddress,
          postalCode,
          phoneNumber: place.nationalPhoneNumber ?? "",
          lat: place.location.latitude,
          lng: place.location.longitude,
        };
      }
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "検索中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
