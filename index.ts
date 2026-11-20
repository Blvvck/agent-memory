export const packageName = "@daimones/agent-memory";

export {
  ProtectedLogError,
  canonicalProtectedLogPath,
  policyForPath,
  repairBackwardTrace,
  repairBulletTraceMarkers,
  repairEntryHeader,
  retagEntry,
  validateDocument,
  writeEntry,
} from "./protected-log";
export { resolveCurrentSession, updateCurrentSession } from "./common";
