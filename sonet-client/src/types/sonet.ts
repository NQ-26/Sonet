// Sonet API Types - Replacing AT Protocol types

export interface SonetUser {
  id: string
  username: string
  displayName?: string
  bio?: string
  avatar?: string
  banner?: string
  followersCount: number
  followingCount: number
  notesCount: number
  createdAt: string
  updatedAt: string
}

export interface SonetNote {
  id: string
  content: string
  author: SonetUser
  createdAt: string
  updatedAt: string
  likesCount: number
  renotesCount: number
  repliesCount: number
  isLiked: boolean
  isRenoted: boolean
  isBookmarked: boolean
  replyTo?: string
  media?: SonetMedia[]
  mentions?: string[]
  hashtags?: string[]
}

export interface SonetProfile extends SonetUser {
  // Additional profile-specific fields
}

export interface SonetFeedGenerator {
  uri: string
  cid: string
  did: string
  creator: SonetUser
  displayName: string
  description?: string
  descriptionFacets?: any[]
  avatar?: string
  likeCount: number
  viewer?: any
  indexedAt: string
}

export interface SonetListView {
  uri: string
  cid: string
  did: string
  creator: SonetUser
  displayName: string
  description?: string
  descriptionFacets?: any[]
  avatar?: string
  likeCount: number
  viewer?: any
  indexedAt: string
  purpose: 'app.bsky.graph.defs#modlist' | 'app.bsky.graph.defs#curatelist'
}

export interface SonetNoteRecord {
  uri: string
  cid: string
  value: SonetNote
}

export interface SonetFeedViewNote {
  uri: string
  cid: string
  author: SonetUser
  record: SonetNoteRecord
  embed?: any
  replyCount: number
  renoteCount: number
  likeCount: number
  indexedAt: string
}

export interface SonetInteraction {
  id: string
  type: string
  data: any
}

export interface SonetSavedFeed {
  uri: string
  cid: string
  value: any
}

export interface SonetMedia {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  alt?: string
  width?: number
  height?: number
}

export interface SonetAuthResponse {
  accessToken: string
  refreshToken: string
  user: SonetUser
}

export interface SonetTimelineResponse {
  notes: SonetNote[]
  cursor?: string
  hasMore: boolean
}

export interface SonetSearchResponse {
  users: SonetUser[]
  notes: SonetNote[]
  cursor?: string
}

export interface SonetNotification {
  id: string
  type: 'like' | 'renote' | 'reply' | 'follow' | 'mention'
  actor: SonetUser
  target: SonetNote | SonetUser
  createdAt: string
  isRead: boolean
}

// API Error types
export class SonetError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'SonetError'
  }
}

export class SonetAuthError extends SonetError {
  constructor(message: string, statusCode: number = 401) {
    super(message, statusCode, 'AUTH_ERROR')
    this.name = 'SonetAuthError'
  }
}

export class SonetValidationError extends SonetError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, 'VALIDATION_ERROR')
    this.name = 'SonetValidationError'
  }
}

export interface SonetUsernameAvailability {
  available: boolean
  username: string
  suggestedUsernames?: string[]
}

// Rich Text and Facets
export class RichText {
  text: string
  facets?: SonetFacet[]

  constructor(options: {text: string; facets?: SonetFacet[]}) {
    this.text = options.text
    this.facets = options.facets
  }

  detectFacetsWithoutResolution(): void {
    // Implement facet detection logic
  }
}

export interface SonetFacet {
  index: {
    byteStart: number
    byteEnd: number
  }
  features: SonetFacetFeature[]
}

export type SonetFacetFeature = 
  | SonetMentionFeature
  | SonetLinkFeature
  | SonetTagFeature

export interface SonetMentionFeature {
  type: "sonet"
  userId: string
}

export interface SonetLinkFeature {
  type: "sonet"
  uri: string
}

export interface SonetTagFeature {
  type: "sonet"
  tag: string
}

// Threadgate and Notegate
export interface SonetThreadgate {
  allow: SonetThreadgateRule[]
}

export type SonetThreadgateRule = 
  | { type: "sonet"; mention: boolean }
  | { type: "sonet"; following: boolean }
  | { type: "sonet"; list: string }

export interface SonetNotegate {
  allow: SonetNotegateRule[]
}

export type SonetNotegateRule = 
  | { type: "sonet"; mention: boolean }
  | { type: "sonet"; following: boolean }
  | { type: "sonet"; list: string }

// Video and Media Types
export interface SonetVideoDefs {
  JobStatus: SonetJobStatus
}

export type SonetJobStatus = 
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'canceled'

export interface SonetBlobRef {
  $link: string
  mimeType: string
  size: number
}

export interface SonetAgent {
  // Basic agent interface for API calls
  api: {
    video: {
      getUploadLimits: (params: any) => Promise<any>
      uploadVideo: (params: any) => Promise<any>
    }
  }
}

// Regex constants for text processing
export const TAG_REGEX = /(^|\s)(#[a-zA-Z0-9\u0080-\uFFFF]+)/g
export const TRAILING_PUNCTUATION_REGEX = /[.,:;!?)]*$/
export const URL_REGEX = /https?:\/\/[^\s]+/g

// Label and Moderation Types
export interface SonetLabel {
  val: string
  uri: string
  cid: string
  neg?: boolean
  src: string
  cts: string
}

export interface SonetModerationCause {
  type: 'label' | 'block' | 'mute' | 'report'
  label?: SonetLabel
  reason?: string
}

export interface SonetModerationDecision {
  profile: {
    cause: SonetModerationCause | null
    filter: boolean
    label: boolean
    blur: boolean
    alert: boolean
    noOverride: boolean
  }
  content: {
    cause: SonetModerationCause | null
    filter: boolean
    label: boolean
    blur: boolean
    alert: boolean
    noOverride: boolean
  }
  user: {
    cause: SonetModerationCause | null
    filter: boolean
    label: boolean
    blur: boolean
    alert: boolean
    noOverride: boolean
  }
}

export class AtUri {
	public href: string
	public host: string
	public rkey: string

	constructor(uri: string) {
		this.href = uri || ''
		// Expected formats in code: `sonet://<host>/.../<rkey>` or `at://<host>/.../<rkey>` or `did:.../...`
		try {
			const u = new URL(uri.replace(/^at:\/\//, 'https://').replace(/^sonet:\/\//, 'https://'))
			this.host = u.hostname || ''
			const parts = u.pathname.split('/').filter(Boolean)
			this.rkey = parts.at(-1) || ''
		} catch {
			// Fall back to simple parsing
			const m = /^(?:[a-z]+:\/\/)?([^/]+).*\/([^/]+)$/.exec(uri || '')
			this.host = m?.[1] || ''
			this.rkey = m?.[2] || ''
		}
	}

	static make(host: string, nsid: string, rkey?: string): AtUri {
		// Minimal join that mirrors AT-style URIs but works for our app
		const path = rkey ? `${nsid}/${rkey}` : nsid
		return new AtUri(`sonet://${host}/${path}`)
	}

	toString(): string {
		return this.href || `sonet://${this.host}/${this.rkey ? this.rkey : ''}`
	}
}

// TID: simple timestamp-based sortable id utility used in a few places
export class TID {
	private value: bigint
	private constructor(value: bigint) {
		this.value = value
	}

	static next(prev?: TID): TID {
		const now = BigInt(Date.now())
		const inc = prev ? prev.value + 1n : 0n
		return new TID(now << 8n | (inc & 0xffn))
	}

	static nextStr(): string {
		return TID.next().toString()
	}

	static fromStr(s: string): TID {
		const n = BigInt(s)
		return new TID(n)
	}

	timestamp(): number {
		return Number(this.value >> 8n)
	}

	toString(): string {
		return this.value.toString()
	}
}