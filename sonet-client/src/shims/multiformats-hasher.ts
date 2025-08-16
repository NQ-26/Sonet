// Shim for multiformats/hashes/hasher which is not available on web
// This is used for AT Protocol hashing, but on web we don't need it

export const Hasher = {
  from: (config: any) => ({
    digest: async (data: Uint8Array) => ({
      digest: new Uint8Array(32) // 32 bytes for SHA-256
    })
  })
}

export const from = Hasher.from