/** Explicit opt-in only. Absent or false → never bootstrap demo data on API boot. */
export function isMiamiDemoBootstrapEnabled(raw = process.env.ENABLE_MIAMI_DEMO_BOOTSTRAP): boolean {
  const value = raw?.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}
