import { validateProductionEnv } from "./production-env.mjs";
validateProductionEnv(process.env);
await import("../server.js");
