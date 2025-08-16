import {
  type $Typed,
  type SonetEmbedExternal,
  type SonetEmbedImages,
  type SonetEmbedRecord,
  type SonetEmbedRecordWithMedia,
  type SonetEmbedVideo,
  type SonetFeedNote,
  AtUri,
  BlobRef,
  type SonetAppAgent,
  type SonetLabelDefs,
  type SonetRepoApplyWrites,
  type SonetRenoTerongRef,
  RichText,
} from '@sonet/api'
import {TID} from '@sonet/types'
import * as dcbor from '#/shims/dag-cbor'
import {t} from '@lingui/macro'
import {type QueryClient} from '@tanstack/react-query'
import {sha256} from 'js-sha256'
import {CID} from '#/shims/multiformats-cid'
import {Hasher} from '#/shims/multiformats-hasher'

import {isNetworkError} from '#/lib/strings/errors'
import {shortenLinks, stripInvalidMentions} from '#/lib/strings/rich-text-manip'
import {logger} from '#/logger'
import {compressImage} from '#/state/gallery'
import {
  fetchResolveGifQuery,
  fetchResolveLinkQuery,
} from '#/state/queries/resolve-link'
import {
  createThreadgateRecord,
  threadgateAllowUISettingToAllowRecordValue,
} from '#/state/queries/threadgate'
import {
  type EmbedDraft,
  type NoteDraft,
  type ThreadDraft,
} from '#/view/com/composer/state/composer'
import {createGIFDescription} from '../gif-alt-text'
import {uploadBlob} from './upload-blob'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'

export {uploadBlob}

interface NoteOpts {
  thread: ThreadDraft
  replyTo?: string
  onStateChange?: (state: string) => void
  langs?: string[]
}

export async function note(
  agent: SonetAppAgent,
  queryClient: QueryClient,
  opts: NoteOpts,
) {
  // Sonet path: simple create per top-level note for now (replies omitted for MVP)
  try {
    // Access hooks is not possible here, so we check if a Sonet upload bridge was installed by seeing if agent is missing session or through a global. Simpler: detect globalThis.__SONET_ACTIVE flag if we set it when session active.
    // Fallback to AT path below if anything fails.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any
    if (g && g.__SONET_ACTIVE && typeof g.__SONET_CREATE_NOTE === 'function') {
      const draft = opts.thread.notes[0]
      const rt = await resolveRT(agent, draft.richtext)
      const res = await g.__SONET_CREATE_NOTE({text: rt.text})
      return {uris: Array.isArray(res?.uris) ? res.uris : [res?.uri || `sonet://note/${res?.note?.id || 'new'}`]}
    }
  } catch {}
  const thread = opts.thread
  opts.onStateChange?.(t`Processing...`)

  let replyPromise:
    | Promise<SonetFeedNote.Record['reply']>
    | SonetFeedNote.Record['reply']
    | undefined
  if (opts.replyTo) {
    // Not awaited to avoid waterfalls.
    replyPromise = resolveReply(agent, opts.replyTo)
  }

  // add top 3 languages from user preferences if langs is provided
  let langs = opts.langs
  if (opts.langs) {
    langs = opts.langs.slice(0, 3)
  }

  const userId = agent.assertDid
  const writes: $Typed<SonetRepoApplyWrites.Create>[] = []
  const uris: string[] = []

  let now = new Date()
  let tid: TID | undefined

  for (let i = 0; i < thread.notes.length; i++) {
    const draft = thread.notes[i]

    // Not awaited to avoid waterfalls.
    const rtPromise = resolveRT(agent, draft.richtext)
    const embedPromise = resolveEmbed(
      agent,
      queryClient,
      draft,
      opts.onStateChange,
    )
    let labels: $Typed<SonetLabelDefs.SelfLabels> | undefined
    if (draft.labels.length) {
      labels = {
        type: "sonet",
        values: draft.labels.map(val => ({val})),
      }
    }

    // The sorting behavior for multiple notes sharing the same createdAt time is
    // undefined, so what we'll do here is increment the time by 1 for every note
    now.setMilliseconds(now.getMilliseconds() + 1)
    tid = TID.next(tid)
    const rkey = tid.toString()
    const uri = `sonet://${userId}/app.sonet.feed.note/${rkey}`
    uris.push(uri)

    const rt = await rtPromise
    const embed = await embedPromise
    const reply = await replyPromise
    const record: SonetFeedNote.Record = {
      // IMPORTANT: $type has to exist, CID is calculated with the `$type` field
      // present and will produce the wrong CID if you omit it.
      type: "sonet",
      createdAt: now.toISOString(),
      text: rt.text,
      facets: rt.facets,
      reply,
      embed,
      langs,
      labels,
    }
    writes.push({
      type: "sonet",
      collection: 'app.sonet.feed.note',
      rkey: rkey,
      value: record,
    })

    if (i === 0 && thread.threadgate.some(tg => tg.type !== 'everybody')) {
      writes.push({
        type: "sonet",
        collection: 'app.sonet.feed.threadgate',
        rkey: rkey,
        value: createThreadgateRecord({
          createdAt: now.toISOString(),
          note: uri,
          allow: threadgateAllowUISettingToAllowRecordValue(thread.threadgate),
        }),
      })
    }

    if (
      thread.notegate.embeddingRules?.length ||
      thread.notegate.detachedEmbeddingUris?.length
    ) {
      writes.push({
        type: "sonet",
        collection: 'app.sonet.feed.notegate',
        rkey: rkey,
        value: {
          ...thread.notegate,
          type: "sonet",
          createdAt: now.toISOString(),
          note: uri,
        },
      })
    }

    // Prepare a ref to the current note for the next note in the thread.
    const ref = {
      cid: await computeCid(record),
      uri,
    }
    replyPromise = {
      root: reply?.root ?? ref,
      parent: ref,
    }
  }

  try {
    await agent.com.sonet.repo.applyWrites({
      repo: agent.assertDid,
      writes: writes,
      validate: true,
    })
  } catch (e: any) {
    logger.error(`Failed to create note`, {
      safeMessage: e.message,
    })
    if (isNetworkError(e)) {
      throw new Error(
        t`Note failed to upload. Please check your Internet connection and try again.`,
      )
    } else {
      throw e
    }
  }

  return {uris}
}

async function resolveRT(agent: SonetAppAgent, richtext: RichText) {
  const trimmedText = richtext.text
    // Trim leading whitespace-only lines (but don't break ASCII art).
    .replace(/^(\s*\n)+/, '')
    // Trim any trailing whitespace.
    .trimEnd()
  let rt = new RichText({text: trimmedText}, {cleanNewlines: true})
  await rt.detectFacets(agent)

  rt = shortenLinks(rt)
  rt = stripInvalidMentions(rt)
  return rt
}

async function resolveReply(agent: SonetAppAgent, replyTo: string) {
  const replyToUrip = new AtUri(replyTo)
  const parentNote = await agent.getNote({
    repo: replyToUrip.host,
    rkey: replyToUrip.rkey,
  })
  if (parentNote) {
    const parentRef = {
      uri: parentNote.uri,
      cid: parentNote.cid,
    }
    return {
      root: parentNote.value.reply?.root || parentRef,
      parent: parentRef,
    }
  }
}

async function resolveEmbed(
  agent: SonetAppAgent,
  queryClient: QueryClient,
  draft: NoteDraft,
  onStateChange: ((state: string) => void) | undefined,
): Promise<
  | $Typed<SonetEmbedImages.Main>
  | $Typed<SonetEmbedVideo.Main>
  | $Typed<SonetEmbedExternal.Main>
  | $Typed<SonetEmbedRecord.Main>
  | $Typed<SonetEmbedRecordWithMedia.Main>
  | undefined
> {
  if (draft.embed.quote) {
    const [resolvedMedia, resolvedQuote] = await Promise.all([
      resolveMedia(agent, queryClient, draft.embed, onStateChange),
      resolveRecord(agent, queryClient, draft.embed.quote.uri),
    ])
    if (resolvedMedia) {
      return {
        type: "sonet",
        record: {
          type: "sonet",
          record: resolvedQuote,
        },
        media: resolvedMedia,
      }
    }
    return {
      type: "sonet",
      record: resolvedQuote,
    }
  }
  const resolvedMedia = await resolveMedia(
    agent,
    queryClient,
    draft.embed,
    onStateChange,
  )
  if (resolvedMedia) {
    return resolvedMedia
  }
  if (draft.embed.link) {
    const resolvedLink = await fetchResolveLinkQuery(
      queryClient,
      agent,
      draft.embed.link.uri,
    )
    if (resolvedLink.type === 'record') {
      return {
        type: "sonet",
        record: resolvedLink.record,
      }
    }
  }
  return undefined
}

async function resolveMedia(
  agent: SonetAppAgent,
  queryClient: QueryClient,
  embedDraft: EmbedDraft,
  onStateChange: ((state: string) => void) | undefined,
): Promise<
  | $Typed<SonetEmbedExternal.Main>
  | $Typed<SonetEmbedImages.Main>
  | $Typed<SonetEmbedVideo.Main>
  | undefined
> {
  if (embedDraft.media?.type === 'images') {
    const imagesDraft = embedDraft.media.images
    logger.debug(`Uploading images`, {
      count: imagesDraft.length,
    })
    onStateChange?.(t`Uploading images...`)
    const images: SonetEmbedImages.Image[] = await Promise.all(
      imagesDraft.map(async (image, i) => {
        logger.debug(`Compressing image #${i}`)
        const {path, width, height, mime} = await compressImage(image)
        logger.debug(`Uploading image #${i}`)
        const res = await uploadBlob(agent, path, mime)
        return {
          image: res.data.blob,
          alt: image.alt,
          aspectRatio: {width, height},
        }
      }),
    )
    return {
      type: "sonet",
      images,
    }
  }
  if (
    embedDraft.media?.type === 'video' &&
    embedDraft.media.video.status === 'done'
  ) {
    const videoDraft = embedDraft.media.video
    const captions = await Promise.all(
      videoDraft.captions
        .filter(caption => caption.lang !== '')
        .map(async caption => {
          const {data} = await agent.uploadBlob(caption.file, {
            encoding: 'text/vtt',
          })
          return {lang: caption.lang, file: data.blob}
        }),
    )

    // lexicon numbers must be floats
    const width = Math.round(videoDraft.asset.width)
    const height = Math.round(videoDraft.asset.height)

    // aspect ratio values must be >0 - better to leave as unset otherwise
    // noteing will fail if aspect ratio is set to 0
    const aspectRatio = width > 0 && height > 0 ? {width, height} : undefined

    if (!aspectRatio) {
      logger.error(
        `Invalid aspect ratio - got { width: ${videoDraft.asset.width}, height: ${videoDraft.asset.height} }`,
      )
    }

    return {
      type: "sonet",
      video: videoDraft.pendingPublish.blobRef,
      alt: videoDraft.altText || undefined,
      captions: captions.length === 0 ? undefined : captions,
      aspectRatio,
    }
  }
  if (embedDraft.media?.type === 'gif') {
    const gifDraft = embedDraft.media
    const resolvedGif = await fetchResolveGifQuery(
      queryClient,
      agent,
      gifDraft.gif,
    )
    let blob: BlobRef | undefined
    if (resolvedGif.thumb) {
      onStateChange?.(t`Uploading link thumbnail...`)
      const {path, mime} = resolvedGif.thumb.source
      const response = await uploadBlob(agent, path, mime)
      blob = response.data.blob
    }
    return {
      type: "sonet",
      external: {
        uri: resolvedGif.uri,
        title: resolvedGif.title,
        description: createGIFDescription(resolvedGif.title, gifDraft.alt),
        thumb: blob,
      },
    }
  }
  if (embedDraft.link) {
    const resolvedLink = await fetchResolveLinkQuery(
      queryClient,
      agent,
      embedDraft.link.uri,
    )
    if (resolvedLink.type === 'external') {
      let blob: BlobRef | undefined
      if (resolvedLink.thumb) {
        onStateChange?.(t`Uploading link thumbnail...`)
        const {path, mime} = resolvedLink.thumb.source
        const response = await uploadBlob(agent, path, mime)
        blob = response.data.blob
      }
      return {
        type: "sonet",
        external: {
          uri: resolvedLink.uri,
          title: resolvedLink.title,
          description: resolvedLink.description,
          thumb: blob,
        },
      }
    }
  }
  return undefined
}

async function resolveRecord(
  agent: SonetAppAgent,
  queryClient: QueryClient,
  uri: string,
): Promise<SonetRenoTerongRef.Main> {
  const resolvedLink = await fetchResolveLinkQuery(queryClient, agent, uri)
  if (resolvedLink.type !== 'record') {
    throw Error(t`Expected uri to resolve to a record`)
  }
  return resolvedLink.record
}

// The built-in hashing functions from multiformats (`multiformats/hashes/sha2`)
// are meant for Node.js, this is the cross-platform equivalent.
const mf_sha256 = Hasher.from({
  name: 'sha2-256',
  code: 0x12,
  encode: input => {
    const digest = sha256.arrayBuffer(input)
    return new Uint8Array(digest)
  },
})

async function computeCid(record: SonetFeedNote.Record): Promise<string> {
  // IMPORTANT: `prepareObject` prepares the record to be hashed by removing
  // fields with undefined value, and converting BlobRef instances to the
  // right IPLD representation.
  const prepared = prepareForHashing(record)
  // 1. Encode the record into DAG-CBOR format
  const encoded = dcbor.encode(prepared)
  // 2. Hash the record in SHA-256 (code 0x12)
  const digest = await mf_sha256.digest(encoded)
  // 3. Create a CIDv1, specifying DAG-CBOR as content (code 0x71)
  const cid = CID.createV1(0x71, digest)
  // 4. Get the Base32 representation of the CID (`b` prefix)
  return cid.toString()
}

// Returns a transformed version of the object for use in DAG-CBOR.
function prepareForHashing(v: any): any {
  // IMPORTANT: BlobRef#ipld() returns the correct object we need for hashing,
  // the API client will convert this for you but we're hashing in the client,
  // so we need it *now*.
  if (v instanceof BlobRef) {
    return v.ipld()
  }

  // Walk through arrays
  if (Array.isArray(v)) {
    let pure = true
    const mapped = v.map(value => {
      if (value !== (value = prepareForHashing(value))) {
        pure = false
      }
      return value
    })
    return pure ? v : mapped
  }

  // Walk through plain objects
  if (isPlainObject(v)) {
    const obj: any = {}
    let pure = true
    for (const key in v) {
      let value = v[key]
      // `value` is undefined
      if (value === undefined) {
        pure = false
        continue
      }
      // `prepareObject` returned a value that's different from what we had before
      if (value !== (value = prepareForHashing(value))) {
        pure = false
      }
      obj[key] = value
    }
    // Return as is if we haven't needed to tamper with anything
    return pure ? v : obj
  }
  return v
}

function isPlainObject(v: any): boolean {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}
