import { cookies } from "next/headers";

export async function getApiAuthToken(): Promise<string> {
    const cookie = await cookies();
    const token = cookie.get("jarvis-admin-token")?.value;

    if (!token) {
        throw new Error("Authentication token not found");
    }

    return token;
}
