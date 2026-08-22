import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const projectId = process.env.POSTHOG_PROJECT_ID;
    const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

    if (!projectId || !apiKey) {
        return NextResponse.json(
            { error: "PostHog environment variables missing" },
            { status: 500 }
        );
    }

    const url = `https://eu.posthog.com/api/projects/${projectId}/query/`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                query: {
                    kind: "TrendsQuery",
                    series: [
                        {
                            kind: "EventsNode",
                            event: "$pageview",
                            math: "dau"
                        }
                    ],
                    dateRange: {
                        date_from: "-7d"
                    },
                    interval: "day"
                }
            }),
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("PostHog API error (Route Handler):", response.status, errorText);
            return NextResponse.json(
                { error: "Failed to fetch data from PostHog" },
                { status: response.status }
            );
        }

        const data = await response.json();
        let chartData = [];

        // Parse HogQL response
        if (data.results && data.results[0]) {
            const result = data.results[0];
            const dates = result.days;
            const counts = result.data;

            if (dates && counts && dates.length === counts.length) {
                chartData = dates.map((date: string, index: number) => ({
                    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    count: counts[index],
                    fullDate: date
                }));
            }
        }

        return NextResponse.json(chartData);
    } catch (error) {
        console.error("Traffic API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
