# Fortnite Test Suite

<p align="center">
  <b>A powerful testing tool for Fortnite backend API endpoints</b>
</p>

## 📋 Overview

Fortnite Client Simulator is a robust testing framework designed to validate Fortnite backend API implementations. It simulates client requests with proper authentication, allowing you to verify endpoint functionality, response structures, and error handling.

## ✨ Features

- 🔐 **Multiple Auth Methods** - Support for exchange_code, password, client_credentials, and refresh_token
- 🧪 **Fluent Testing API** - Simple, chainable assertions for validating responses
- 🗂️ **Automatic Test Discovery** - Automatically finds and runs all test files

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/simplyzetax/FortTest.git
cd FortTest

# Install dependencies
bun install
```

## 🔧 Usage

Run the client simulator with your desired authentication method:

```bash
# Using exchange code
bun run index.ts --grant_type exchange_code --exchange_code YOUR_CODE --client_id YOUR_CLIENT_ID --client_secret YOUR_CLIENT_SECRET --base_url http://localhost:8787

# Using password auth
bun run index.ts --grant_type password --username YOUR_USERNAME --password YOUR_PASSWORD --client_id YOUR_CLIENT_ID --client_secret YOUR_CLIENT_SECRET

# Using client credentials
bun run index.ts --grant_type client_credentials --client_id YOUR_CLIENT_ID --client_secret YOUR_CLIENT_SECRET

# Using refresh token
bun run index.ts --grant_type refresh_token --refresh_token YOUR_REFRESH_TOKEN --client_id YOUR_CLIENT_ID --client_secret YOUR_CLIENT_SECRET
```

## 📝 Writing Tests

Tests are easy to create using the fluent API. Here's a simple example:

```typescript
// tests/lightswitch/single.ts
import { backend } from "../..";

// Basic status test with chained assertions
export default (await backend.get("Lightswitch single test", "/lightswitch/api/service/Fortnite/status", {
    bearerAuth: true
})).expects.toHaveStatus(200)
    .expects.toHaveProperty("serviceInstanceId", "fortnite")
    .expects.toHaveProperty("status", "UP");

// Error test
export const missingAuthTest = (await backend.get(
    "Test with missing auth",
    "/lightswitch/api/service/Fortnite/status",
    {
        bearerAuth: false,
        headers: {}
    }
)).expects.toHaveStatus(401);
```

### Available Assertions

- `toHaveStatus(code)` - Verify HTTP status code
- `toHaveProperty(path, value?)` - Check for property existence/value
- `toHaveData(predicate)` - Run custom validation on response data
- `toMatchData(expected)` - Compare entire response data
- `toHaveHeader(header, value?)` - Check response headers

## 📚 Test Organization

Organize tests by endpoint category:

```
/tests
  /lightswitch
    /single.ts       # Tests for single status endpoint
    /bulk.ts         # Tests for bulk status endpoint
  /timeline.ts       # Tests for timeline endpoint
  /account.ts        # Tests for account endpoints
```

## 🧩 Advanced Features

### Custom Headers

```typescript
await backend.get("Custom header test", "/some/endpoint", {
    bearerAuth: true,
    headers: {
        "User-Agent": "Fortnite/++Fortnite+Release-19.40-CL-19215531 Windows/10"
    }
});
```

### Request Body

```typescript
await backend.post("Post request test", "/some/endpoint", {
    bearerAuth: true,
    body: {
        key: "value"
    }
});
```

## 🔍 Debugging

Set detailed logging by adding this before your test runs:

```typescript
import logger from "../utils/logger";
logger.level = "debug";
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
