import {type Insets, Platform} from 'react-native'

export const LOCAL_DEV_SERVICE =
  Platform.OS === 'android' ? 'http://10.0.2.2:2583' : 'http://localhost:2583'
export const STAGING_SERVICE = 'https://staging.sonet.dev'
export const SONET_SERVICE = 'https://api.sonet.app'
export const SONET_SERVICE_UserID = 'userId:web:sonet.app'
export const PUBLIC_SONET_SERVICE = 'https://public.api.sonet.app'
export const DEFAULT_SERVICE = SONET_SERVICE
const HELP_DESK_LANG = 'en-us'
export const HELP_DESK_URL = `https://sonet.zendesk.com/hc/${HELP_DESK_LANG}`

// Sonet defaults (REST gateway). Used during migration
export const DEFAULT_SONET_API_BASE = 'http://localhost:8080/api'
export const EMBED_SERVICE = 'https://embed.sonet.app'
export const EMBED_SCRIPT = `${EMBED_SERVICE}/static/embed.js`
export const SONET_DOWNLOAD_URL = 'https://sonet.app/download'
export const STARTER_PACK_MAX_SIZE = 150

// HACK
// Yes, this is exactly what it looks like. It's a hard-coded constant
// reflecting the number of new users in the last week. We don't have
// time to add a route to the servers for this so we're just going to hard
// code and update this number with each release until we can get the
// server route done.
// -prf
export const JOINED_THIS_WEEK = 560000 // estimate as of 12/18/24

export const DISCOVER_DEBUG_UserIDS: Record<string, true> = {
  'userId:plc:oisofpd7lj26yvgiivf3lxsi': true, // hailey.at
  'userId:plc:p2cp5gopk7mgjegy6wadk3ep': true, // samuel.bsky.team
  'userId:plc:ragtjsm2j2vknwkz3zp4oxrd': true, // pfrazee.com
  'userId:plc:vpkhqolt662uhesyj6nxm7ys': true, // why.bsky.team
  'userId:plc:3jpt2mvvsumj2r7eqk4gzzjz': true, // esb.lol
  'userId:plc:vjug55kidv6sye7ykr5faxxn': true, // emilyliu.me
  'userId:plc:tgqseeot47ymot4zro244fj3': true, // iwsmith.sonet.social
  'userId:plc:2dzyut5lxna5ljiaasgeuffz': true, // darrin.bsky.team
}

const BASE_FEEDBACK_FORM_URL = `${HELP_DESK_URL}/requests/new`
export function FEEDBACK_FORM_URL({
  email,
  username,
}: {
  email?: string
  username?: string
}): string {
  let str = BASE_FEEDBACK_FORM_URL
  if (email) {
    str += `?tf_anonymous_requester_email=${encodeURIComponent(email)}`
    if (username) {
      str += `&tf_17205412673421=${encodeURIComponent(username)}`
    }
  }
  return str
}

export const MAX_DISPLAY_NAME = 64
export const MAX_DESCRIPTION = 256

export const MAX_GRAPHEME_LENGTH = 300

export const MAX_DM_GRAPHEME_LENGTH = 1000

// Recommended is 100 per: https://www.w3.org/WAI/GL/WCAG20/tests/test3.html
// but increasing limit per user feedback
export const MAX_ALT_TEXT = 2000

export const MAX_REPORT_REASON_GRAPHEME_LENGTH = 2000

export function IS_TEST_USER(username?: string) {
  return username && username?.endsWith('.test')
}

export function IS_PROD_SERVICE(url?: string) {
  return url && url !== STAGING_SERVICE && !url.startsWith(LOCAL_DEV_SERVICE)
}

// Sonet centralized feeds - no external feed generators
export const SONET_FEEDS = {
  FOR_YOU: 'for-you',
  FOLLOWING: 'following',
  VIDEO: 'video'
} as const

export const FEEDBACK_FEEDS = [SONET_FEEDS.FOR_YOU, SONET_FEEDS.VIDEO]

export const NOTE_IMG_MAX = {
  width: 2000,
  height: 2000,
  size: 1000000,
}

export const STAGING_LINK_META_PROXY =
  'https://cardyb.staging.sonet.dev/v1/extract?url='

export const PROD_LINK_META_PROXY = 'https://cardyb.sonet.app/v1/extract?url='

export function LINK_META_PROXY(serviceUrl: string) {
  if (IS_PROD_SERVICE(serviceUrl)) {
    return PROD_LINK_META_PROXY
  }

  return STAGING_LINK_META_PROXY
}

export const STATUS_PAGE_URL = 'https://status.sonet.app/'

// Hitslop constants
export const createHitslop = (size: number): Insets => ({
  top: size,
  left: size,
  bottom: size,
  right: size,
})
export const HITSLOP_10 = createHitslop(10)
export const HITSLOP_20 = createHitslop(20)
export const HITSLOP_30 = createHitslop(30)
export const NOTE_CTRL_HITSLOP = {top: 5, bottom: 10, left: 10, right: 10}
export const LANG_DROPDOWN_HITSLOP = {top: 10, bottom: 10, left: 4, right: 4}
export const BACK_HITSLOP = HITSLOP_30
export const MAX_NOTE_LINES = 25

export const SONET_APP_ACCOUNT_ID = 'sonet.app'

export const SONET_FEED_OWNER_IDS = [
  SONET_APP_ACCOUNT_ID,
  'sonet.trending',
  'sonet.recommended',
]

// Legacy Bluesky constants for migration compatibility
export const BSKY_FEED_OWNER_UserIDS = [
  'bsky.app',
  'bsky.team',
  'bsky.social'
]

export const DISCOVER_FEED_URI = 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot'
export const VIDEO_FEED_URI = 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/video'

export const PROD_DEFAULT_FEED = (feed: string) => `at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/${feed}`

export const VIDEO_FEED_URIS = [
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/video'
]

// Legacy Bluesky constants for migration compatibility
export const BSKY_APP_ACCOUNT_UserID = 'userId:plc:z72i7hdynmk6r22z27h6tvur'
export const PUBLIC_APPVIEW = 'https://bsky.social'
export const PUBLIC_APPVIEW_UserID = 'userId:plc:z72i7hdynmk6r22z27h6tvur'

// Saved feed constants for onboarding
export const DISCOVER_SAVED_FEED = {
  type: 'feed' as const,
  value: DISCOVER_FEED_URI,
  pinned: true,
  displayName: 'Discover',
  description: 'Trending content from the network'
}

export const TIMELINE_SAVED_FEED = {
  type: 'timeline' as const,
  value: 'following',
  pinned: true,
  displayName: 'Following',
  description: 'Notes from people you follow'
}

export const VIDEO_SAVED_FEED = {
  type: 'feed' as const,
  value: VIDEO_FEED_URIS[0],
  pinned: true,
  displayName: 'Video',
  description: 'Video content feed'
}

// Sonet centralized feed configuration
export const SONET_FEED_CONFIG = {
  FOR_YOU: {
    type: 'feed' as const,
    value: SONET_FEEDS.FOR_YOU,
    pinned: true,
    displayName: 'For You',
    description: 'AI-powered personalized feed'
  },
  FOLLOWING: {
    type: 'timeline' as const,
    value: SONET_FEEDS.FOLLOWING,
    pinned: true,
    displayName: 'Following',
    description: 'Notes from people you follow'
  },
  VIDEO: {
    type: 'feed' as const,
    value: SONET_FEEDS.VIDEO,
    pinned: true,
    displayName: 'Video',
    description: 'Video content feed'
  }
} as const

export const RECOMMENDED_SAVED_FEEDS = [
  SONET_FEED_CONFIG.FOR_YOU,
  SONET_FEED_CONFIG.FOLLOWING,
  SONET_FEED_CONFIG.VIDEO
]

// No external feed generators in centralized platform
export const KNOWN_SHUTDOWN_FEEDS: string[] = []

export const GIF_SERVICE = 'https://gifs.sonet.app'

export const GIF_SEARCH = (params: string) =>
  `${GIF_SERVICE}/tenor/v2/search?${params}`
export const GIF_FEATURED = (params: string) =>
  `${GIF_SERVICE}/tenor/v2/featured?${params}`

export const MAX_LABELERS = 20

export const VIDEO_SERVICE = 'https://video.sonet.app'
export const VIDEO_SERVICE_UserID = 'userId:web:video.sonet.app'

export const VIDEO_MAX_DURATION_MS = 3 * 60 * 1000 // 3 minutes in milliseconds
export const VIDEO_MAX_SIZE = 1000 * 1000 * 100 // 100mb

export const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'image/gif',
] as const

export type SupportedMimeTypes = (typeof SUPPORTED_MIME_TYPES)[number]

export const EMOJI_REACTION_LIMIT = 5

export const urls = {
  website: {
    blog: {
      initialVerificationAnnouncement: `https://sonet.social/about/blog/04-21-2025-verification`,
    },
  },
}

// Sonet API endpoints
export const SONET_API_BASE = 'https://api.sonet.app'
export const SONET_STAGING_API = 'https://api.staging.sonet.app'
export const DEV_ENV_API = `http://localhost:8080`

export const webLinks = {
  tos: `https://sonet.app/terms`,
  privacy: `https://sonet.app/privacy`,
  community: `https://sonet.app/guidelines`,
}

// Legacy Bluesky constants for migration compatibility
export const PUBLIC_BSKY_SERVICE = 'https://bsky.social'
export const BSKY_SERVICE = 'https://bsky.social'
export const BSKY_LABELER_UserID = 'did:plc:z72i7hdynmk6r22z27h6tvur'
export const PUBLIC_STAGING_APPVIEW_UserID = 'did:plc:z72i7hdynmk6r22z27h6tvur'
