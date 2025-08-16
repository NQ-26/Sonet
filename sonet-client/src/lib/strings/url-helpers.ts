import psl from 'psl'
import TLDs from 'tlds'

import {SONET_SERVICE} from '#/lib/constants'
import {isInvalidUsername} from '#/lib/strings/usernames'
import {startUriToStarterPackUri} from '#/lib/strings/starter-pack'
import {logger} from '#/logger'

export const SONET_APP_HOST = 'https://sonet.app'
const SONET_TRUSTED_HOSTS = [
  'sonet\\.app',
  'sonet\\.social',
  'sonetweb\\.xyz',
  'sonetweb\\.zendesk\\.com',
  ...(__DEV__ ? ['localhost:19006', 'localhost:8100'] : []),
]

/*
 * This will allow any BSKY_TRUSTED_HOSTS value by itself or with a subdomain.
 * It will also allow relative paths like /profile as well as #.
 */
const TRUSTED_REGEX = new RegExp(
  `^(http(s)?://(([\\w-]+\\.)?${SONET_TRUSTED_HOSTS.join(
    '|([\\w-]+\\.)?',
  )})|/|#)`,
)

export function isValidDomain(str: string): boolean {
  return !!TLDs.find(tld => {
    let i = str.lastIndexOf(tld)
    if (i === -1) {
      return false
    }
    return str.charAt(i - 1) === '.' && i === str.length - tld.length
  })
}

export function makeRecordUri(
  userIdOrName: string,
  collection: string,
  rkey: string,
) {
  // Sonet uses simplified URI format
  return `sonet://${collection}/${userIdOrName}/${rkey}`
}

export function toNiceDomain(url: string): string {
  try {
    const urlp = new URL(url)
    if (`https://${urlp.host}` === SONET_SERVICE) {
      return 'Sonet Social'
    }
    return urlp.host ? urlp.host : url
  } catch (e) {
    return url
  }
}

export function toShortUrl(url: string): string {
  try {
    const urlp = new URL(url)
    if (urlp.protocol !== 'http:' && urlp.protocol !== 'https:') {
      return url
    }
    const path =
      (urlp.pathname === '/' ? '' : urlp.pathname) + urlp.search + urlp.hash
    if (path.length > 15) {
      return urlp.host + path.slice(0, 13) + '...'
    }
    return urlp.host + path
  } catch (e) {
    return url
  }
}

export function toShareUrl(url: string): string {
  if (!url.startsWith('https')) {
    const urlp = new URL('https://sonet.app')
    urlp.pathname = url
    url = urlp.toString()
  }
  return url
}

export function toSonetAppUrl(url: string): string {
  return new URL(url, SONET_APP_HOST).toString()
}

export function isSonetAppUrl(url: string): boolean {
  return url.startsWith('https://sonet.app/')
}

export function isRelativeUrl(url: string): boolean {
  return /^\/[^/]/.test(url)
}

export function isBskyRSSUrl(url: string): boolean {
  return (
    (url.startsWith('https://sonet.app/') || isRelativeUrl(url)) &&
    /\/rss\/?$/.test(url)
  )
}

export function isBskyAppUrl(url: string): boolean {
  return url.startsWith('https://sonet.app/') || isRelativeUrl(url)
}

export function isExternalUrl(url: string): boolean {
  const external = !isBskyAppUrl(url) && url.startsWith('http')
  const rss = isBskyRSSUrl(url)
  return external || rss
}

export function isTrustedUrl(url: string): boolean {
  return TRUSTED_REGEX.test(url)
}

export function isBskyNoteUrl(url: string): boolean {
  if (isBskyAppUrl(url)) {
    try {
      const urlp = new URL(url)
      return /profile\/(?<name>[^/]+)\/note\/(?<rkey>[^/]+)/i.test(
        urlp.pathname,
      )
    } catch {}
  }
  return false
}

export function isBskyCustomFeedUrl(url: string): boolean {
  if (isBskyAppUrl(url)) {
    try {
      const urlp = new URL(url)
      return /profile\/(?<name>[^/]+)\/feed\/(?<rkey>[^/]+)/i.test(
        urlp.pathname,
      )
    } catch {}
  }
  return false
}

export function isBskyListUrl(url: string): boolean {
  if (isBskyAppUrl(url)) {
    try {
      const urlp = new URL(url)
      return /profile\/(?<name>[^/]+)\/lists\/(?<rkey>[^/]+)/i.test(
        urlp.pathname,
      )
    } catch {
      console.error('Unexpected error in isBskyListUrl()', url)
    }
  }
  return false
}

export function isBskyStartUrl(url: string): boolean {
  if (isBskyAppUrl(url)) {
    try {
      const urlp = new URL(url)
      return /start\/(?<name>[^/]+)\/(?<rkey>[^/]+)/i.test(urlp.pathname)
    } catch {
      console.error('Unexpected error in isBskyStartUrl()', url)
    }
  }
  return false
}

export function isBskyStarterPackUrl(url: string): boolean {
  if (isBskyAppUrl(url)) {
    try {
      const urlp = new URL(url)
      return /starter-pack\/(?<name>[^/]+)\/(?<rkey>[^/]+)/i.test(urlp.pathname)
    } catch {
      console.error('Unexpected error in isBskyStartUrl()', url)
    }
  }
  return false
}

export function isBskyDownloadUrl(url: string): boolean {
  if (isExternalUrl(url)) {
    return false
  }
  return url === '/download' || url.startsWith('/download?')
}

export function convertBskyAppUrlIfNeeded(url: string): string {
  if (isBskyAppUrl(url)) {
    try {
      const urlp = new URL(url)

      if (isBskyStartUrl(url)) {
        return startUriToStarterPackUri(urlp.pathname)
      }

      // special-case search links
      if (urlp.pathname === '/search') {
        return `/search?q=${urlp.searchParams.get('q')}`
      }

      return urlp.pathname
    } catch (e) {
      console.error('Unexpected error in convertBskyAppUrlIfNeeded()', e)
    }
  } else if (isShortLink(url)) {
    // We only want to do this on native, web usernames the 301 for us
    return shortLinkToHref(url)
  }
  return url
}

export function listUriToHref(url: string): string {
  try {
    const {hostname, rkey} = new AtUri(url)
    return `/profile/${hostname}/lists/${rkey}`
  } catch {
    return ''
  }
}

export function feedUriToHref(url: string): string {
  try {
    const {hostname, rkey} = new AtUri(url)
    return `/profile/${hostname}/feed/${rkey}`
  } catch {
    return ''
  }
}

export function noteUriToRelativePath(
  uri: string,
  options?: {username?: string},
): string | undefined {
  try {
    const {hostname, rkey} = new AtUri(uri)
    const usernameOrDid =
      options?.username && !isInvalidUsername(options.username)
        ? options.username
        : hostname
    return `/profile/${usernameOrDid}/note/${rkey}`
  } catch {
    return undefined
  }
}

/**
 * Checks if the label in the note text matches the host of the link facet.
 *
 * Hosts are case-insensitive, so should be lowercase for comparison.
 * @see https://www.rfc-editor.org/rfc/rfc3986#section-3.2.2
 */
export function linkRequiresWarning(uri: string, label: string) {
  const labelDomain = labelToDomain(label)

  // We should trust any relative URL or a # since we know it links to internal content
  if (isRelativeUrl(uri) || uri === '#') {
    return false
  }

  let urip
  try {
    urip = new URL(uri)
  } catch {
    return true
  }

  const host = urip.hostname.toLowerCase()
  if (isTrustedUrl(uri)) {
    // if this is a link to internal content, warn if it represents itself as a URL to another app
    return !!labelDomain && labelDomain !== host && isPossiblyAUrl(labelDomain)
  } else {
    // if this is a link to external content, warn if the label doesnt match the target
    if (!labelDomain) {
      return true
    }
    return labelDomain !== host
  }
}

/**
 * Returns a lowercase domain hostname if the label is a valid URL.
 *
 * Hosts are case-insensitive, so should be lowercase for comparison.
 * @see https://www.rfc-editor.org/rfc/rfc3986#section-3.2.2
 */
export function labelToDomain(label: string): string | undefined {
  // any spaces just immediately consider the label a non-url
  if (/\s/.test(label)) {
    return undefined
  }
  try {
    return new URL(label).hostname.toLowerCase()
  } catch {}
  try {
    return new URL('https://' + label).hostname.toLowerCase()
  } catch {}
  return undefined
}

export function isPossiblyAUrl(str: string): boolean {
  str = str.trim()
  if (str.startsWith('http://')) {
    return true
  }
  if (str.startsWith('https://')) {
    return true
  }
  const [firstWord] = str.split(/[\s\/]/)
  return isValidDomain(firstWord)
}

export function splitApexDomain(hostname: string): [string, string] {
  const hostnamep = psl.parse(hostname)
  if (hostnamep.error || !hostnamep.listed || !hostnamep.domain) {
    return ['', hostname]
  }
  return [
    hostnamep.subdomain ? `${hostnamep.subdomain}.` : '',
    hostnamep.domain,
  ]
}

export function createBskyAppAbsoluteUrl(path: string): string {
  const sanitizedPath = path.replace(BSKY_APP_HOST, '').replace(/^\/+/, '')
  return `${BSKY_APP_HOST.replace(/\/$/, '')}/${sanitizedPath}`
}

export function createProxiedUrl(url: string): string {
  let u
  try {
    u = new URL(url)
  } catch {
    return url
  }

  if (u?.protocol !== 'http:' && u?.protocol !== 'https:') {
    return url
  }

  return `https://go.sonet.app/redirect?u=${encodeURIComponent(url)}`
}

export function isShortLink(url: string): boolean {
  return url.startsWith('https://go.sonet.app/')
}

export function shortLinkToHref(url: string): string {
  try {
    const urlp = new URL(url)

    // For now we only support starter packs, but in the future we should add additional paths to this check
    const parts = urlp.pathname.split('/').filter(Boolean)
    if (parts.length === 1) {
      return `/starter-pack-short/${parts[0]}`
    }
    return url
  } catch (e) {
    logger.error('Failed to parse possible short link', {safeMessage: e})
    return url
  }
}

export function getHostnameFromUrl(url: string | URL): string | null {
  let urlp
  try {
    urlp = new URL(url)
  } catch (e) {
    return null
  }
  return urlp.hostname
}

export function getServiceAuthAudFromUrl(url: string | URL): string | null {
  const hostname = getHostnameFromUrl(url)
  if (!hostname) {
    return null
  }
  return `userId:web:${hostname}`
}

// passes URL.parse, and has a TLD etc
export function definitelyUrl(maybeUrl: string) {
  try {
    if (maybeUrl.endsWith('.')) return null

    // Prepend 'https://' if the input doesn't start with a protocol
    if (!maybeUrl.startsWith('https://') && !maybeUrl.startsWith('http://')) {
      maybeUrl = 'https://' + maybeUrl
    }

    const url = new URL(maybeUrl)

    // Extract the hostname and split it into labels
    const hostname = url.hostname
    const labels = hostname.split('.')

    // Ensure there are at least two labels (e.g., 'example' and 'com')
    if (labels.length < 2) return null

    const tld = labels[labels.length - 1]

    // Check that the TLD is at least two characters long and contains only letters
    if (!/^[a-z]{2,}$/i.test(tld)) return null

    return url.toString()
  } catch {
    return null
  }
}
