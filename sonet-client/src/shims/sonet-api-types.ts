// Shim for missing @sonet/api/dist types
// These are referenced throughout the codebase but don't exist

export type NoteView = any
export type SavedFeed = any
export type GeneratorView = any
export type FilterablePreference = any

// Export from the main sonet-api file instead
export * from '../lib/api/sonet-api'