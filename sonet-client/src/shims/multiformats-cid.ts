// Shim for multiformats/cid which is not available on web
// This is used for AT Protocol CID creation, but on web we don't need it

export class CID {
  static createV1(codec: number, digest: any): CID {
    return new CID()
  }
  
  toString(): string {
    return 'bafybeihs2n66xlsniz6xqplttjtqeoqvnxoyw5dtw7itbdewfdcjplx6di'
  }
}