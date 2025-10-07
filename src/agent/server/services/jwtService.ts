import crypto from 'crypto';
import jwt from 'jsonwebtoken';

type KeyPair = {
  kid: string;
  privateKeyPem: string;
  publicKeyPem: string;
  createdAt: number;
};

class InMemoryKeyStore {
  private static current?: KeyPair;
  private static previous?: KeyPair;

  static getCurrent(): KeyPair {
    if (!this.current) {
      this.rotate();
    }
    return this.current!;
  }

  static getAll(): KeyPair[] {
    const list: KeyPair[] = [];
    if (this.current) list.push(this.current);
    if (this.previous) list.push(this.previous);
    return list;
  }

  static rotate() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const publicKeyPem = publicKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const kid = crypto.randomUUID();
    this.previous = this.current;
    this.current = { kid, privateKeyPem, publicKeyPem, createdAt: Date.now() };
  }

  static findByKid(kid: string): KeyPair | undefined {
    const all = this.getAll();
    return all.find(k => k.kid === kid);
  }
}

export const JwtService = {
  issueAccessToken(agentId: string, ttlMinutes = 15) {
    const kp = InMemoryKeyStore.getCurrent();
    const token = jwt.sign(
      { sub: agentId, typ: 'agent', iat: Math.floor(Date.now() / 1000) },
      kp.privateKeyPem,
      { algorithm: 'RS256', expiresIn: `${ttlMinutes}m`, keyid: kp.kid }
    );
    return token;
  },
  verifyAccessToken(token: string) {
    const decoded = jwt.decode(token, { complete: true }) as any;
    if (!decoded?.header?.kid) throw new Error('Missing kid');
    const kp = InMemoryKeyStore.findByKid(decoded.header.kid);
    if (!kp) throw new Error('Unknown kid');
    return jwt.verify(token, kp.publicKeyPem, { algorithms: ['RS256'] });
  },
  getJwks() {
    // Lightweight public representation; not a full JWKS (missing modulus/exponent breakdown)
    return {
      keys: InMemoryKeyStore.getAll().map(k => ({
        kid: k.kid,
        alg: 'RS256',
        use: 'sig',
        pem: k.publicKeyPem,
      }))
    } as any;
  },
  rotateKeys() {
    InMemoryKeyStore.rotate();
  }
};


