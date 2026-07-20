import { chmodSync } from "node:fs";

for (const path of ["dist/agent-log.js", "dist/trace-search.js", "dist/current-session.js"]) chmodSync(path, 0o755);
