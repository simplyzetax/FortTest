import { BackendTest } from "./classes/backendTest";
import config from "./config";
import { Auth } from "./utils/auth";

const auth = new Auth();
const authResponse = await auth.getAccessToken("exchange_code", {
    username: "",
    password: ""
});

export const backend = BackendTest.create(config.BACKEND_URL, authResponse.access_token);