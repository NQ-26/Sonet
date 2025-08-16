export type Any = any

// Lightweight shim for legacy bsky helpers used across the app during the migration
// - dangerousIsType<T>(value, predicate): narrows value using a predicate
// - validate(value, validator): runs a boolean validator function
export function dangerousIsType<T>(value: unknown, predicate?: (v: unknown) => boolean): value is T {
	try {
		return predicate ? !!predicate(value) : !!value
	} catch {
		return false
	}
}

export function validate<T>(value: unknown, validator?: (v: unknown) => boolean): value is T {
	try {
		return validator ? !!validator(value) : !!value
	} catch {
		return false
	}
}

// Add missing note namespace
export namespace note {
  export function parseEmbed(embed: any): any {
    return embed
  }
}

// Default export kept for existing imports like `import * as bsky from '#/types/bsky'`
const bsky = { dangerousIsType, validate, note }
export default bsky