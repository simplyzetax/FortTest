import logger from './logger';

// Define parameter types for each grant type
type ClientCredentialsParams = Record<string, never>; // No additional params needed

interface ExchangeCodeParams {
    exchangeCode: string;
}

interface RefreshTokenParams {
    refreshToken: string;
}

interface PasswordParams {
    username: string;
    password: string;
}

export const GrantTypes = {
    client_credentials: 'client_credentials',
    exchange_code: 'exchange_code',
    refresh_token: 'refresh_token',
    password: 'password',
} as const;

// Create a mapped type for all grant types
export type GrantTypeParams = {
    'client_credentials': ClientCredentialsParams;
    'exchange_code': ExchangeCodeParams;
    'refresh_token': RefreshTokenParams;
    'password': PasswordParams;
}

export type GrantType = keyof typeof GrantTypes;

// Make ParamsForGrantType more type-safe by enforcing required parameters
export type ParamsForGrantType<G extends keyof GrantTypeParams | string> =
    G extends keyof GrantTypeParams
    ? GrantTypeParams[G]
    : Record<string, any>;

// Create a more restrictive version that requires parameters based on grant type
export type RequiredGrantParams<G extends keyof GrantTypeParams | string> =
    G extends 'client_credentials' ? {}
    : G extends 'exchange_code' ? { params: ExchangeCodeParams }
    : G extends 'refresh_token' ? { params: RefreshTokenParams }
    : G extends 'password' ? { params: PasswordParams }
    : { params?: Record<string, any> };

// Define the auth response structure
interface AuthResponse {
    access_token: string;
    expires_in: number;
    expires_at: string;
    refresh_token?: string;
    token_type: string;
    client_id: string;
    internal_client: string;
    client_service: string;
    account_id: string;
}

export class Auth {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly grantType: GrantType;
    private readonly authEndpoint: string;

    constructor(
        clientId: string,
        clientSecret: string,
        grantType: GrantType,
        baseUrl: string,
    ) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.grantType = grantType;
        this.authEndpoint = `${baseUrl}/auth/token`;

        logger.info(`Auth initialized with grant type: ${String(grantType)}`);
    }

    /**
     * Get an access token using client credentials (no additional parameters needed)
     */
    getAccessToken(grantType: 'client_credentials'): Promise<AuthResponse>;

    /**
     * Get an access token using a password
     * @param grantType Must be 'password'
     * @param params Must include username and password
     */
    getAccessToken(grantType: 'password', params: PasswordParams): Promise<AuthResponse>;

    /**
     * Get an access token using an exchange code
     * @param grantType Must be 'exchange_code'
     * @param params Must include exchangeCode
     */
    getAccessToken(grantType: 'exchange_code', params: ExchangeCodeParams): Promise<AuthResponse>;

    /**
     * Get an access token using a refresh token
     * @param grantType Must be 'refresh_token'
     * @param params Must include refreshToken
     */
    getAccessToken(grantType: 'refresh_token', params: RefreshTokenParams): Promise<AuthResponse>;

    /**
     * Get an access token using the default grant type from config
     * The required parameters are determined by the grant type
     */
    getAccessToken<G extends GrantType>(
        params: ParamsForGrantType<G>
    ): Promise<AuthResponse>;

    /**
     * Get an access token using a custom grant type
     * @param grantType The custom grant type
     * @param params Additional parameters for the custom grant type
     */
    getAccessToken(grantType: string, params?: Record<string, any>): Promise<AuthResponse>;

    /**
     * Implementation for all overloaded getAccessToken methods
     */
    async getAccessToken<G extends string>(
        grantTypeOrParams?: G | ParamsForGrantType<GrantType>,
        maybeParams?: ParamsForGrantType<G>
    ): Promise<AuthResponse> {
        // Determine if first parameter is grant type or params
        let actualGrantType: string;
        let params: Record<string, any> | undefined;

        if (typeof grantTypeOrParams === 'string') {
            // First parameter is the grant type
            actualGrantType = grantTypeOrParams;
            params = maybeParams;
        } else {
            // First parameter is params for default grant type
            actualGrantType = this.grantType;
            params = grantTypeOrParams as Record<string, any>;
        }

        logger.info(`Requesting access token with grant type: ${actualGrantType}`);

        // Validate required parameters based on grant type
        this.validateParams(actualGrantType as keyof GrantTypeParams, params);

        // Construct form data based on grant type and params
        const formData = new URLSearchParams();
        formData.append('grant_type', actualGrantType);

        // Add parameters based on grant type
        if (params) {
            switch (actualGrantType) {
                case 'password':
                    formData.append('username', params.username);
                    formData.append('password', params.password);
                    break;

                case 'refresh_token':
                    formData.append('refresh_token', params.refreshToken);
                    break;

                case 'exchange_code':
                    formData.append('exchange_code', params.exchangeCode);
                    break;

                default:
                    // For custom grant types, add all parameters
                    Object.entries(params).forEach(([key, value]) => {
                        formData.append(key, String(value));
                    });
            }
        }

        try {
            const response = await fetch(this.authEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({
                    message: `Failed to get access token: ${response.status}`,
                    status: response.status,
                    error: errorText
                });
                throw new Error(`Authentication failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            const authResponse: AuthResponse = {
                access_token: data.access_token,
                expires_in: data.expires_in,
                expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
                refresh_token: data.refresh_token,
                token_type: data.token_type,
                client_id: data.client_id,
                internal_client: data.internal_client,
                client_service: data.client_service,
                account_id: data.account_id
            };

            logger.info(`Successfully obtained access token, expires in ${authResponse.expires_in}s`);
            return authResponse;
        } catch (error) {
            logger.error({
                message: 'Failed to get access token',
                error
            });
            throw error;
        }
    }

    /**
     * Validate that required parameters are provided based on grant type
     */
    private validateParams(grantType: keyof GrantTypeParams | string, params?: Record<string, any>): void {
        switch (grantType) {
            case 'password':
                if (!params?.username || !params?.password) {
                    throw new Error('Username and password are required for password grant type');
                }
                break;

            case 'refresh_token':
                if (!params?.refreshToken) {
                    throw new Error('Refresh token is required for refresh_token grant type');
                }
                break;

            case 'exchange_code':
                if (!params?.exchangeCode) {
                    throw new Error('Exchange code is required for exchange_code grant type');
                }
                break;

            case 'client_credentials':
                // No additional parameters required
                break;

            default:
                // For custom grant types, no validation
                break;
        }
    }
}

// Type guard functions for better developer experience
export function isClientCredentialsGrantType(grantType: string): grantType is 'client_credentials' {
    return grantType === 'client_credentials';
}

export function isPasswordGrantType(grantType: string): grantType is 'password' {
    return grantType === 'password';
}

export function isRefreshTokenGrantType(grantType: string): grantType is 'refresh_token' {
    return grantType === 'refresh_token';
}

export function isExchangeCodeGrantType(grantType: string): grantType is 'exchange_code' {
    return grantType === 'exchange_code';
}

// Helper type to extract the params type needed based on config grant type
export type ConfigGrantParams = ParamsForGrantType<GrantType>;
