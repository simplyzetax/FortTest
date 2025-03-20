import { backend } from "..";

// Basic timeline test with authentication
export default (await backend.get("Timeline test", "/fortnite/api/calendar/v1/timeline", {
    bearerAuth: true
})).expects.toHaveStatus(200)
    .expects.toHaveProperty("channels")
    .expects.toHaveProperty("channels.client-events")
    .expects.toHaveProperty("channels.client-matchmaking")
    .expects.toHaveProperty("eventsTimeOffsetHrs")
    .expects.toHaveProperty("cacheIntervalMins")
    .expects.toHaveProperty("currentTime");

// Test active events
export const activeEventsTest = (await backend.get("Timeline active events test", "/fortnite/api/calendar/v1/timeline", {
    bearerAuth: true
})).expects.toHaveStatus(200)
    .expects.toHaveData(data => {
        const activeEvents = data.channels["client-events"].states[0].activeEvents;
        return Array.isArray(activeEvents) && activeEvents.length > 0;
    });