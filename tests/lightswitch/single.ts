import { backend } from "../..";

// Basic status test
export default (await backend.get("Lightswitch single test", "/lightswitch/api/service/Fortnite/status", {
    bearerAuth: true
})).expects.toHaveStatus(200)
    .expects.toHaveProperty("serviceInstanceId", "fortnite")
    .expects.toHaveProperty("status", "UP")
    .expects.toHaveProperty("message")
    .expects.toHaveProperty("allowedActions")
    .expects.toHaveProperty("banned", false);

// Test with missing authorization header
export const missingAuthTest = (await backend.get(
    "Lightswitch test with missing auth",
    "/lightswitch/api/service/Fortnite/status",
    {
        bearerAuth: false,
        headers: {} // Explicitly omit auth header
    }
)).expects.toHaveStatus(401);