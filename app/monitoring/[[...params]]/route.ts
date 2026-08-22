import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const envelope = await request.text();
  const pieces = envelope.split("\n");

  let header: { dsn?: string };
  try {
    header = JSON.parse(pieces[0]);
  } catch {
    return NextResponse.json({ error: "invalid envelope" }, { status: 400 });
  }

  if (!header.dsn) {
    return NextResponse.json({ error: "missing dsn" }, { status: 400 });
  }

  const dsn = new URL(header.dsn);
  const projectId = dsn.pathname.replace("/", "");
  const sentryIngestUrl = `${dsn.protocol}//${dsn.host}/api/${projectId}/envelope/`;

  try {
    const response = await fetch(sentryIngestUrl, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "application/x-sentry-envelope" },
    });

    return new NextResponse(response.body, { status: response.status });
  } catch {
    return NextResponse.json({ error: "failed to forward to sentry" }, { status: 500 });
  }
}
