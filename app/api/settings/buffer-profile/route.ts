import { NextResponse } from "next/server";
import { getProfiles } from "@/lib/buffer";

export async function GET() {
  try {
    const profileId = process.env.BUFFER_PROFILE_ID;
    const profiles = await getProfiles();

    // Find the matching profile
    const profile = Array.isArray(profiles)
      ? profiles.find((p: { id: string }) => p.id === profileId) || profiles[0]
      : null;

    if (!profile) {
      return NextResponse.json(
        { error: "No Buffer profile found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
