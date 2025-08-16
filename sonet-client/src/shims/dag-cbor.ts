// Shim for @ipld/dag-cbor which is not available on web
// This is used for AT Protocol record encoding, but on web we don't need it

export function encode(data: any): Uint8Array {
  // On web, we don't need to encode AT Protocol records
  // Return a dummy encoded value
  return new Uint8Array(0)
}