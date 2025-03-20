import { BackendTest } from "./classes/backendTest";
import { Auth, GrantTypes, type GrantType } from "./utils/auth";
import { z } from "zod";

// Define CLI arguments schema
const ArgsSchema = z.object({
    grant_type: z.enum(Object.keys(GrantTypes) as [string, ...string[]]).default("exchange_code") as z.ZodType<GrantType>,
    exchange_code: z.string().optional(),
    base_url: z.string().default("http://localhost:8787"),
    // Add other auth-related fields as needed
    authorization_code: z.string().optional(),
    client_id: z.string(),
    client_secret: z.string(),
    username: z.string().optional(),
    password: z.string().optional(),
    refresh_token: z.string().optional(),
}).refine(data => {

    // Otherwise ensure required parameters are present based on grant_type
    switch (data.grant_type) {
        case "exchange_code": return !!data.exchange_code;
        case "password": return !!data.username && !!data.password;
        case "client_credentials": return !!data.client_id && !!data.client_secret;
        case "refresh_token": return !!data.refresh_token; // Add missing case
        // Add other cases as needed
        default: return false;
    }
}, {
    message: "Missing required parameters for the selected grant_type"
});

type Args = z.infer<typeof ArgsSchema>;

// Parse CLI arguments
function parseArgs(): Args {
    const args: Record<string, string> = {};
    const cliArgs = process.argv.slice(2);

    for (let i = 0; i < cliArgs.length; i++) {
        const arg = cliArgs[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = cliArgs[i + 1] && !cliArgs[i + 1].startsWith('--') ? cliArgs[i + 1] : 'true';
            args[key] = value;
            if (value !== 'true') i++;
        }
    }

    return ArgsSchema.parse(args);
}

// Export the backend
export let backend: ReturnType<typeof BackendTest.create>;

async function main() {
    try {
        const args = parseArgs();
        let accessToken: string;

        // Get access token via authentication
        const auth = new Auth(args.client_id, args.client_secret, args.grant_type, args.base_url);
        const authParams: Record<string, string> = {};

        // Add relevant parameters based on grant type
        switch (args.grant_type) {
            case "exchange_code":
                authParams.exchange_code = args.exchange_code!;
                break;
            case "password":
                authParams.username = args.username!;
                authParams.password = args.password!;
                break;
            case "client_credentials":
                // We dont need to do anything
                break;
            case "refresh_token":
                authParams.refresh_token = args.refresh_token!;
                break;
        }

        const authResponse = await auth.getAccessToken(args.grant_type, authParams);
        accessToken = authResponse.access_token;

        // Create and export backend
        backend = BackendTest.create(args.base_url, auth);

        console.log("Backend client initialized successfully");
    } catch (error) {
        console.error("Error initializing backend client:", error);
        process.exit(1);
    }
}

// Run the main function
main();