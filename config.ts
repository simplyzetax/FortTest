import type { Config } from "./types/config";

export default {
    BACKEND_URL: "http://localhost:3000",
    MATCHMAKER_URL: "ws://localhost:3000/services/matchmaker",
    XMPP_URL: "ws://localhost:3000/services/xmpp",
    CLIENT_ID: "fortnite-client-simulator",
    CLIENT_SECRET: "secret123",
    GRANT_TYPE: "exchange_code" as const
} satisfies Config;