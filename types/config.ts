export interface Config {
    /**
     * The URL of the backend server. This is used to connect to the backend for API requests.
     */
    BACKEND_URL: string;
    /**
     * The URL of the game server. This is used to connect to the game server for game-related operations.
     */
    XMPP_URL: string;
    /**
     * The URL of the matchmaker server. This is used to connect to the matchmaker server for matchmaking.
     */
    MATCHMAKER_URL: string;

    /**
     * The client ID for authentication. This is used to identify the client when making requests to the backend.
     * It is typically a unique identifier for the client application.
     */
    CLIENT_ID: string;

    /**
     * The client secret for authentication. This is used to authenticate the client when making requests to the backend.
     * It is typically a secret key that should be kept confidential.
     */
    CLIENT_SECRET: string;

    GRANT_TYPE: "client_credentials" | "exchange_code" | "refresh_token" | "password";
}