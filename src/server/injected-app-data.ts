import { agentHost } from "./utils/config.js";

/** Values serialized into `window.APP_DATA` for the SPA shell (see client.router). */
export function buildInjectedAppData(): {
  apiUrl: string;
  refreshableToken: string;
  basePath: string;
} {
  const trimmedBase = (process.env.BASE_PATH || "/").trim();
  const basePath = trimmedBase.replace(/\/+$/, "") || "/";
  const apiBasePath = (process.env.API_BASE_PATH || "").trim();
  const apiUrl = apiBasePath || agentHost;
  return {
    apiUrl,
    refreshableToken: "",
    basePath,
  };
}
