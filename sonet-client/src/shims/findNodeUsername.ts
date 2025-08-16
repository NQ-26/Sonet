// Shim for findNodeUsername which is not available in react-native-web
// This function is used to get native tags for iOS, but on web we don't need it

export function findNodeUsername(node: any): number | null {
  // On web, we don't have native tags, so return null
  // This is safe since the function is only used for iOS-specific functionality
  return null
}