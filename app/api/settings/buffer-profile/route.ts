import { NextResponse } from "next/server";
import { getOrganizations, getChannels } from "@/lib/buffer";

export async function GET() {
  try {
    const channelId = process.env.BUFFER_PROFILE_ID;

    // Get org ID first
    const orgs = await getOrganizations();
    if (!orgs || orgs.length === 0) {
      return NextResponse.json(
        { error: "No Buffer organization found" },
        { status: 404 }
      );
    }

    const orgId = orgs[0].id;
    const channels = await getChannels(orgId);

    // Find the matching channel
    const channel = channels.find((c) => c.id === channelId) || channels.find((c) => c.name === "herdailyfreedom") || channels[0];

    if (!channel) {
      return NextResponse.json(
        { error: "No Buffer channel found" },
        { status: 404 }
      );
    }

    // Return in a format the settings page expects
    return NextResponse.json({
      profile: {
        id: channel.id,
        service: channel.service,
        service_username: channel.name,
        formatted_username: `@${channel.displayName}`,
        avatar: channel.avatar,
        avatar_https: channel.avatar,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
