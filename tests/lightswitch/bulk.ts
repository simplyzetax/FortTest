import { backend } from "../..";

// Test for bulk status endpoint
export const bulkStatusTest = (await backend.get(
    "Lightswitch bulk status test",
    "/lightswitch/api/service/bulk/status",
    {
        bearerAuth: true
    }
)).expects.toHaveStatus(200)
    .expects.toHaveData(data => Array.isArray(data) && data.length > 0)
    .expects.toHaveProperty("0.serviceInstanceId", "fortnite")
    .expects.toHaveProperty("0.status", "UP")
    .expects.toHaveProperty("0.banned", false);