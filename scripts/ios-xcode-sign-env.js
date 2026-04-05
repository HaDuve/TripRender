/**
 * Environment for `tauri ios build` when signing with local Xcode / Keychain.
 * Strip App Store Connect API vars: if all three are set, Tauri uses CI-style skip_codesign +
 * dummy "Apple Distribution: Tauri (unset)" and App Store export fails.
 * API keys belong to upload (altool), not the archive step.
 * @param {NodeJS.ProcessEnv} [from]
 * @returns {NodeJS.ProcessEnv}
 */
function envForLocalXcodeSigning(from) {
  const env = { ...(from || process.env) };
  delete env.CI;
  delete env.APPLE_API_KEY;
  delete env.APPLE_API_KEY_ID;
  delete env.APPLE_API_ISSUER;
  delete env.APPLE_API_KEY_PATH;
  return env;
}

module.exports = { envForLocalXcodeSigning };
