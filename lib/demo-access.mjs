/** @param {Record<string, string | undefined>} env */
export function demoLoginAllowed(env = process.env) {
  return env.NODE_ENV === 'development' || env.ENABLE_DEMO_ACCOUNTS === 'true';
}
