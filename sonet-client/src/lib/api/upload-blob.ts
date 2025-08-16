import {copyAsync} from 'expo-file-system'
import {SonetAppAgent, SonetRepoUploadBlob} from '@sonet/api'

import {safeDeleteAsync} from '#/lib/media/manip'
import {useSonetApi} from '#/state/session/sonet'

let sonetUploadBridge: null | ((file: Blob, filename: string, mime: string) => Promise<{media: any}>) = null

export function __setSonetUploadBridge(fn: typeof sonetUploadBridge) {
  sonetUploadBridge = fn
}

// Make sure the function is properly exported
export {__setSonetUploadBridge}

/**
 * @param encoding Allows overriding the blob's type
 */
export async function uploadBlob(
  agent: SonetAppAgent,
  input: string | Blob,
  encoding?: string,
): Promise<SonetRepoUploadBlob.Response> {
  // If a Sonet bridge is installed, route uploads through Sonet media API
  if (sonetUploadBridge) {
    const {blob, filename, mime} = await normalizeToBlob(input, encoding)
    const res = await sonetUploadBridge(blob, filename, mime)
    // Shim to the AT upload response shape for existing call sites
    return {
      success: true as any,
      headers: new Headers(),
      data: {blob: {ref: res.media?.id || res.media?.url || 'media', mimeType: mime, size: (blob as any).size}},
    } as any
  }

  if (typeof input === 'string' && input.startsWith('file:')) {
    const blob = await asBlob(input)
    return agent.uploadBlob(blob, {encoding})
  }

  if (typeof input === 'string' && input.startsWith('/')) {
    const blob = await asBlob(`file://${input}`)
    return agent.uploadBlob(blob, {encoding})
  }

  if (typeof input === 'string' && input.startsWith('data:')) {
    const blob = await fetch(input).then(r => r.blob())
    return agent.uploadBlob(blob, {encoding})
  }

  if (input instanceof Blob) {
    return agent.uploadBlob(input, {encoding})
  }

  throw new TypeError(`Invalid uploadBlob input: ${typeof input}`)
}

async function normalizeToBlob(input: string | Blob, encoding?: string): Promise<{blob: Blob; filename: string; mime: string}> {
  if (typeof input === 'string' && input.startsWith('file:')) {
    const blob = await asBlob(input)
    return {blob, filename: inferFilename(input, encoding), mime: encoding || blob.type || 'application/octet-stream'}
  }
  if (typeof input === 'string' && input.startsWith('/')) {
    const blob = await asBlob(`file://${input}`)
    return {blob, filename: inferFilename(input, encoding), mime: encoding || blob.type || 'application/octet-stream'}
  }
  if (typeof input === 'string' && input.startsWith('data:')) {
    const blob = await fetch(input).then(r => r.blob())
    return {blob, filename: inferFilename('upload.bin', encoding), mime: encoding || blob.type || 'application/octet-stream'}
  }
  if (input instanceof Blob) {
    return {blob: input, filename: inferFilename('upload.bin', encoding), mime: encoding || input.type || 'application/octet-stream'}
  }
  throw new TypeError(`Invalid uploadBlob input: ${typeof input}`)
}

function inferFilename(source: string, encoding?: string): string {
  if (encoding === 'text/vtt') return 'captions.vtt'
  const m = /([^/]+)$/.exec(source)
  return m?.[1] || 'upload.bin'
}

async function asBlob(uri: string): Promise<Blob> {
  return withSafeFile(uri, async safeUri => {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => resolve(xhr.response)
      xhr.onerror = () => reject(new Error('Failed to load blob'))
      xhr.responseType = 'blob'
      xhr.open('GET', safeUri, true)
      xhr.send(null)
    })
  })
}

// HACK
// React native has a bug that inflates the size of jpegs on upload
// we get around that by renaming the file ext to .bin
// see https://github.com/facebook/react-native/issues/27099
// -prf
async function withSafeFile<T>(
  uri: string,
  fn: (path: string) => Promise<T>,
): Promise<T> {
  if (uri.endsWith('.jpeg') || uri.endsWith('.jpg')) {
    const newPath = uri.replace(/\.jpe?g$/, '.bin')
    try {
      await copyAsync({from: uri, to: newPath})
    } catch {
      return await fn(uri)
    }
    try {
      return await fn(newPath)
    } finally {
      await safeDeleteAsync(newPath)
    }
  } else {
    return fn(uri)
  }
}
