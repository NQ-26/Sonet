// Shim for expo-screen-capture which is not available on web
// This is used for screenshot protection, but on web we don't need it

export const preventScreenCaptureAsync = async () => {
  // On web, we can't prevent screenshots
  return Promise.resolve()
}

export const allowScreenCaptureAsync = async () => {
  // On web, we can't prevent screenshots
  return Promise.resolve()
}

export const preventScreenRecordingAsync = async () => {
  // On web, we can't prevent screen recording
  return Promise.resolve()
}

export const allowScreenRecordingAsync = async () => {
  // On web, we can't prevent screen recording
  return Promise.resolve()
}