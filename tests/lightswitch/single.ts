import { backend } from "../..";

export default backend.get("Lightswitch single test", "/lightswitch/api/service/Fortnite/status", {
    bearerAuth: true,
})