// Sonet API Module - Comprehensive exports for the codebase

// Core shim types and guards used by the app. These are intentionally
// lightweight to keep the migration unblocked.

export namespace SonetFeedNote {
	export type Record = any
	export function isRecord(v: unknown): v is Record {
		return !!v
	}
}

export namespace SonetFeedThreadgate {
	export type Record = any
	export function isRecord(v: unknown): v is Record {
		return !!v
	}
}

export namespace SonetEmbedRecord {
	export type View = any
	export type ViewRecord = any
	export type ViewDetached = any
	export type Main = any
	export function isView(_: unknown): _ is View { return true }
	export function isViewRecord(_: unknown): _ is ViewRecord { return true }
	export function isViewDetached(_: unknown): _ is ViewDetached { return true }
}

export namespace SonetEmbedRecordWithMedia {
	export type View = any
	export type ViewRecord = any
	export type Main = any
	export function isView(_: unknown): _ is View { return true }
}

export namespace SonetEmbedImages {
  export type View = any
  export type Image = any
  export type Main = any
  export type ViewImage = any
  export function isView(_: unknown): _ is View { return true }
}

export namespace SonetEmbedVideo {
	export type View = any
	export type Main = any
	export function isView(_: unknown): _ is View { return true }
}

export namespace SonetFeedDefs {
  export type NoteView = any
  export type GeneratorView = any
  export function isNoteView(_: unknown): _ is NoteView { return true }
}

export namespace SonetGraphDefs {
	export type ListView = any
	export type ListViewBasic = any
	export type StarterPackView = any
	export type StarterPackViewBasic = any
	export const CURATELIST = 'curatelist' as const
}

export namespace SonetGraphStarterpack {
	export type Record = any
	export function isRecord(v: unknown): v is Record { return !!v }
}

export namespace SonetActorDefs {
  export type ProfileViewBasic = any
  export type ProfileView = any
  export type ProfileViewDetailed = any
  export type SavedFeed = any
  export type KnownFollowers = any
}

export namespace SonetUnspeccedDefs {
	export type ThreadItemNote = any
	export type ThreadItemNotFound = any
	export type ThreadItemBlocked = any
	export type ThreadItemNoUnauthenticated = any

	export function isThreadItemNote(v: unknown): v is ThreadItemNote {
		return !!v && typeof v === 'object' && 'note' in (v as any)
	}
	export function isThreadItemNotFound(v: unknown): v is ThreadItemNotFound {
		return !!v && (v as any).reason === 'not-found'
	}
	export function isThreadItemBlocked(v: unknown): v is ThreadItemBlocked {
		return !!v && (v as any).reason === 'blocked'
	}
	export function isThreadItemNoUnauthenticated(v: unknown): v is ThreadItemNoUnauthenticated {
		return !!v && (v as any).reason === 'no-unauthenticated'
	}
}

export namespace SonetUnspeccedGetNoteThreadV2 {
  export type ThreadItem = any
  export type OutputSchema = any
}

export namespace SonetFeedGetNoteThread {
  export type OutputSchema = any
}

export namespace SonetRepoUploadBlob {
	export type Response = {
		success: boolean
		headers: Headers
		data: { blob: BlobRef }
	}
}

export namespace SonetRichtextFacet {
	export type Main = any
}

export namespace SonetLabelDefs {
	export type SelfLabels = { type: 'sonet'; values: {val: string}[] }
}

export namespace SonetServerDefs {
	export type AppPassword = any
}

export namespace SonetNotificationDefs {
	export type Settings = any
	export type ActivitySubscription = { note: boolean; reply: boolean }
}

export namespace SonetRepoPutRecord {
	export class InvalidSwapError extends Error {}
}

export type ModerationOpts = { userDid: string }

export function moderateNote(_: any, __: ModerationOpts) {
	return {
		ui: (_context: string) => ({
			blur: false,
			filter: false,
			blurs: [],
			filters: [],
		}),
	}
}

// Simple mute-word helper used by a few queries
export function hasMutedWord({
	mutedWords = [],
	text = '',
	facets,
	outlineTags,
	languages,
	actor,
}: {
	mutedWords?: Array<{word: string} | string>
	text?: string
	facets?: unknown
	outlineTags?: string[]
	languages?: string[]
	actor?: unknown
}): boolean {
	const words = (mutedWords || []).map(w =>
		typeof w === 'string' ? w.toLowerCase() : String((w as any).word || '').toLowerCase(),
	)
	const hay = (text || '').toLowerCase()
	return words.some(w => w && hay.includes(w))
}

export class AtUri {
  href: string
  host: string
  hostname: string
  rkey: string

  constructor(uri: string) {
    this.href = uri || ''
    try {
      const u = new URL(uri.replace(/^at:\/\//, 'https://').replace(/^sonet:\/\//, 'https://'))
      this.host = u.hostname || ''
      this.hostname = u.hostname || ''
      const parts = u.pathname.split('/').filter(Boolean)
      this.rkey = parts.at(-1) || ''
    } catch {
      const m = /^(?:[a-z]+:\/\/)?([^/]+).*\/([^/]+)$/.exec(uri || '')
      this.host = m?.[1] || ''
      this.hostname = m?.[1] || ''
      this.rkey = m?.[2] || ''
    }
  }
	static make(host: string, nsid: string, rkey?: string) {
		const path = rkey ? `${nsid}/${rkey}` : nsid
		return new AtUri(`sonet://${host}/${path}`)
	}
	toString() {
		return this.href || `sonet://${this.host}/${this.rkey ? this.rkey : ''}`
	}
}

export class BlobRef {
	constructor(public ref: string, public mimeType: string, public size: number) {}
	ipld() {
		return { $link: this.ref }
	}
}

export class RichText {
	text: string
	facets?: any[]
	constructor(opts: {text: string; facets?: any[]}, _cfg?: {cleanNewlines?: boolean}) {
		this.text = opts.text
		this.facets = opts.facets
	}
	async detectFacets(_agent: any) {}
	detectFacetsWithoutResolution() {}
}

export class TID {
	private value: bigint
	private constructor(value: bigint) { this.value = value }
	static next(prev?: TID): TID {
		const now = BigInt(Date.now())
		const inc = prev ? prev.value + 1n : 0n
		return new TID((now << 8n) | (inc & 0xffn))
	}
	static nextStr(): string { return TID.next().toString() }
	static fromStr(s: string): TID { return new TID(BigInt(s)) }
	timestamp(): number { return Number(this.value >> 8n) }
	toString(): string { return this.value.toString() }
}

// Re-export SonetClient and helpers for convenience
export { SonetClient, sonetClient } from '../../api/sonet-client'
export * from '../../types/sonet'

// parseEmbed function for parsing embed data
export function parseEmbed(embed: any) {
  // Basic embed parsing - expand as needed
  if (embed && typeof embed === 'object') {
    return {
      type: embed.type || 'unknown',
      data: embed,
    }
  }
  return embed
}

// Mock utilities for testing and development
export const mock = {
  note: (data: any) => ({
    text: data.text || '',
    ...data,
  }),
  noteView: (data: any) => ({
    record: data.record || {},
    author: data.author || {},
    labels: data.labels || [],
    embed: data.embed || null,
    ...data,
  }),
  profileViewBasic: (data: any) => ({
    did: data.did || '',
    handle: data.handle || '',
    displayName: data.displayName || '',
    avatar: data.avatar || '',
    ...data,
  }),
  label: (data: any) => ({
    src: data.src || '',
    val: data.val || '',
    uri: data.uri || '',
    ...data,
  }),
  actorViewerState: (data: any) => ({
    muted: data.muted || false,
    blockedBy: data.blockedBy || false,
    ...data,
  }),
  embedRecordView: (data: any) => ({
    record: data.record || {},
    author: data.author || {},
    labels: data.labels || [],
    ...data,
  }),
  replyNotification: (data: any) => ({
    record: data.record || {},
    author: data.author || {},
    labels: data.labels || [],
    ...data,
  }),
  followNotification: (data: any) => ({
    author: data.author || {},
    subjectDid: data.subjectDid || '',
    ...data,
  }),
}

export type $Typed<T> = T
export type Un$Typed<T> = T

export namespace SonetRepoApplyWrites {
	export type Create = any
	export type Update = any
	export type Delete = { type: 'sonet'; collection: string; rkey: string }
}

export namespace SonetActorStatus {
  export type Record = {
    createdAt: string
    durationMinutes: number
    status: string
    embed?: any
  }
  export function isRecord(v: unknown): v is Record {
    return !!v && typeof v === 'object' && 'status' in (v as any)
  }
  export function validateRecord(v: unknown): {success: boolean; value?: Record} {
    return isRecord(v) ? {success: true, value: v} : {success: false}
  }
}

// Additional exports needed by DebugMod.tsx
export namespace SonetLabelDefs {
  export interface LabelValueDefinition {
    identifier: string
    blurs: string
    severity: string
    defaultSetting: string
    locales: Array<{
      lang: string
      name: string
      description: string
    }>
  }
}

export namespace SonetLabelerDefs {
  export type ProfileView = any
}

export const LABELS: Record<string, any> = {
  // Add label definitions as needed
}

export function interpretLabelValueDefinition(def: any): any {
  return def
}

export function interpretLabelValueDefinitions(defs: any[]): any[] {
  return defs.map(def => interpretLabelValueDefinition(def))
}

export type LabelPreference = 'ignore' | 'warn' | 'hide'

export type ModerationBehavior = 'warn' | 'hide' | 'blur'

export type ModerationDecision = {
  ui: (context: string) => {
    blur: boolean
    filter: boolean
    blurs: string[]
    filters: string[]
    alert?: boolean
    inform?: boolean
    noOverride?: boolean
  }
}



export function moderateProfile(profile: any, moderationOpts: any): ModerationDecision {
  return {
    ui: (context: string) => ({
      blur: false,
      filter: false,
      blurs: [],
      filters: [],
    }),
  }
}

export type ModerationUI = {
  blur: boolean
  filter: boolean
  blurs: string[]
  filters: string[]
}

export namespace SonetActorGetProfile {
  export type OutputSchema = any
}

export namespace SonetFeedGetAuthorFeed {
  export class BlockedActorError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'BlockedActorError'
    }
  }
  
  export class BlockedByActorError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'BlockedByActorError'
    }
  }
}

export namespace SonetGraphFollow {
  export type Record = {
    createdAt: string
    subject: string
  }
  
  export function isRecord(v: unknown): v is Record {
    return !!v && typeof v === 'object' && 'createdAt' in (v as any) && 'subject' in (v as any)
  }
}

export namespace SonetFeedRenote {
  export type Record = {
    createdAt: string
    subject: string
  }
  
  export function isRecord(v: unknown): v is Record {
    return !!v && typeof v === 'object' && 'createdAt' in (v as any) && 'subject' in (v as any)
  }
}

export namespace SonetFeedLike {
  export type Record = {
    createdAt: string
    subject: string
  }
  
  export function isRecord(v: unknown): v is Record {
    return !!v && typeof v === 'object' && 'createdAt' in (v as any) && 'subject' in (v as any)
  }
}

export namespace SonetFeedNotegate {
  export type Record = {
    createdAt: string
    subject: string
  }
  
  export function isRecord(v: unknown): v is Record {
    return !!v && typeof v === 'object' && 'createdAt' in (v as any) && 'subject' in (v as any)
  }
  
  export function validateRecord(v: unknown): {success: boolean; value?: Record} {
    return isRecord(v) ? {success: true, value: v} : {success: false}
  }
}

export namespace SonetModerationDefs {
  export const REASONAPPEAL = 'com.atproto.moderation.defs#reasonAppeal'
}

export class AtpAgent {
  sessionManager: {
    session: any
  }
  
  constructor(config: {service: string}) {
    this.sessionManager = {session: null}
  }
}

export const nuxSchema = {
  safeParse: (data: any) => ({success: true, data}),
  parse: (data: any) => data,
}

export const DEFAULT_LABEL_SETTINGS = {
  // Default label settings for moderation
  'porn': 'hide',
  'sexual': 'hide',
  'violence': 'warn',
  'hate': 'hide',
  'spam': 'warn',
  'impersonation': 'hide',
}

export class UnicodeString {
  private _text: string
  
  constructor(text: string) {
    this._text = text
  }
  
  get utf16(): string {
    return this._text
  }
  
  slice(start: number, end: number): UnicodeString {
    return new UnicodeString(this._text.slice(start, end))
  }
}

export namespace SonetServerCreateSession {
  export class AuthFactorTokenRequiredError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AuthFactorTokenRequiredError'
    }
  }
}

export function jsonStringToLex(jsonString: string): any {
  try {
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

// Add missing SonetEmbedExternal namespace
export namespace SonetEmbedExternal {
  export function isView(embed: any): boolean {
    return embed && embed.type === 'external'
  }
}

// Re-export SonetAppAgent from sonet-agent
export {SonetAppAgent} from '../state/session/sonet-agent'

export function moderateUserList(list: any, moderationOpts: any): ModerationDecision {
  return {
    ui: (context: string) => ({
      blur: false,
      filter: false,
      blurs: [],
      filters: [],
    }),
  }
}

export function moderateFeedGenerator(feedGenerator: any, moderationOpts: any): ModerationDecision {
  return {
    ui: (context: string) => ({
      blur: false,
      filter: false,
      blurs: [],
      filters: [],
    }),
  }
}

export function moderateNotification(notification: any, moderationOpts: any): ModerationDecision {
  return {
    ui: (context: string) => ({
      blur: false,
      filter: false,
      blurs: [],
      filters: [],
    }),
  }
}