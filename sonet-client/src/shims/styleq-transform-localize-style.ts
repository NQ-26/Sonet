// Shim for styleq/transform-localize-style which is not available
// This is used for RTL text direction support in react-native-web

export function localizeStyle(style: any, isRTL: boolean): any {
  // On web, we don't need RTL transformation for now
  // Return the style as-is
  return style
}