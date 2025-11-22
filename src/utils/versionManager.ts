const APP_VERSION_KEY = 'app_version';
const CURRENT_VERSION = 1;

/**
 * Checks the app version and resets local storage if the version has changed.
 * If no version is found in storage, assumes it was version 0.
 */
export function checkAndUpdateVersion(): void {
  try {
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    const previousVersion = storedVersion ? parseInt(storedVersion, 10) : 0;

    if (previousVersion !== CURRENT_VERSION) {
      console.log(`Version changed from ${previousVersion} to ${CURRENT_VERSION}. Clearing local storage...`);

      // Clear all local storage
      localStorage.clear();

      // Set the new version
      localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION.toString());

      console.log('Local storage cleared and version updated.');
    } else {
      console.log(`App version ${CURRENT_VERSION} - no changes needed.`);
    }
  } catch (error) {
    console.error('Error checking app version:', error);
  }
}

/**
 * Gets the current app version
 */
export function getCurrentVersion(): number {
  return CURRENT_VERSION;
}

/**
 * Gets the stored app version (returns 0 if not found)
 */
export function getStoredVersion(): number {
  try {
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    return storedVersion ? parseInt(storedVersion, 10) : 0;
  } catch (error) {
    console.error('Error getting stored version:', error);
    return 0;
  }
}
