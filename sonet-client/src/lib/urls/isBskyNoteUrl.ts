// Shim for missing isBskyNoteUrl function
// This provides basic note URL validation functionality

export function isBskyNoteUrl(url: string): boolean {
  // Check if the URL is a valid Bluesky/Sonet note URL
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('bsky') || urlObj.hostname.includes('sonet') || urlObj.pathname.includes('/post/')
  } catch {
    return false
  }
}