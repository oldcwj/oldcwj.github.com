function rotateLeft(value, count) {
  return (value << count) | (value >>> (32 - count));
}

function rotateRight(value, count) {
  return (value >>> count) | (value << (32 - count));
}

function hex32(value, littleEndian = false) {
  const bytes = littleEndian
    ? [value, value >>> 8, value >>> 16, value >>> 24]
    : [value >>> 24, value >>> 16, value >>> 8, value];
  return bytes.map((byte) => (byte & 0xff).toString(16).padStart(2, "0")).join("");
}

class BufferedHash {
  constructor() {
    this.buffer = new Uint8Array(64);
    this.bufferLength = 0;
    this.bytesHashed = 0;
    this.finished = false;
  }

  update(input) {
    if (this.finished) throw new Error("Hash instance is already finalized.");
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    this.bytesHashed += bytes.length;
    let position = 0;
    while (position < bytes.length) {
      const take = Math.min(64 - this.bufferLength, bytes.length - position);
      this.buffer.set(bytes.subarray(position, position + take), this.bufferLength);
      this.bufferLength += take;
      position += take;
      if (this.bufferLength === 64) {
        this.process(this.buffer);
        this.bufferLength = 0;
      }
    }
    return this;
  }
}

export class Sha256 extends BufferedHash {
  constructor() {
    super();
    this.state = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    this.words = new Uint32Array(64);
  }

  process(block) {
    const k = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const w = this.words;
    for (let i = 0; i < 16; i++) w[i] = ((block[i*4] << 24) | (block[i*4+1] << 16) | (block[i*4+2] << 8) | block[i*4+3]) >>> 0;
    for (let i = 16; i < 64; i++) {
      const s0 = rotateRight(w[i-15], 7) ^ rotateRight(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = rotateRight(w[i-2], 17) ^ rotateRight(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = this.state;
    for (let i = 0; i < 64; i++) {
      const s1 = rotateRight(e,6) ^ rotateRight(e,11) ^ rotateRight(e,25);
      const choice = (e & f) ^ (~e & g);
      const t1 = (h + s1 + choice + k[i] + w[i]) >>> 0;
      const s0 = rotateRight(a,2) ^ rotateRight(a,13) ^ rotateRight(a,22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + majority) >>> 0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    const values = [a,b,c,d,e,f,g,h];
    for (let i=0;i<8;i++) this.state[i] = (this.state[i] + values[i]) >>> 0;
  }

  digest() {
    if (!this.finished) {
      const length = this.bytesHashed;
      this.buffer[this.bufferLength++] = 0x80;
      if (this.bufferLength > 56) {
        this.buffer.fill(0, this.bufferLength);
        this.process(this.buffer);
        this.bufferLength = 0;
      }
      this.buffer.fill(0, this.bufferLength, 56);
      const high = Math.floor(length / 0x20000000);
      const low = (length << 3) >>> 0;
      const view = new DataView(this.buffer.buffer);
      view.setUint32(56, high, false); view.setUint32(60, low, false);
      this.process(this.buffer);
      this.finished = true;
    }
    return [...this.state].map((value) => hex32(value)).join("");
  }
}

export class Sha1 extends BufferedHash {
  constructor() {
    super();
    this.state = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
    this.words = new Uint32Array(80);
  }

  process(block) {
    const w = this.words;
    for (let i = 0; i < 16; i++) w[i] = ((block[i*4] << 24) | (block[i*4+1] << 16) | (block[i*4+2] << 8) | block[i*4+3]) >>> 0;
    for (let i = 16; i < 80; i++) w[i] = rotateLeft(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1) >>> 0;
    let [a,b,c,d,e] = this.state;
    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (rotateLeft(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotateLeft(b, 30) >>> 0; b = a; a = temp;
    }
    const values = [a,b,c,d,e];
    for (let i = 0; i < 5; i++) this.state[i] = (this.state[i] + values[i]) >>> 0;
  }

  digest() {
    if (!this.finished) {
      const length = this.bytesHashed;
      this.buffer[this.bufferLength++] = 0x80;
      if (this.bufferLength > 56) {
        this.buffer.fill(0, this.bufferLength); this.process(this.buffer); this.bufferLength = 0;
      }
      this.buffer.fill(0, this.bufferLength, 56);
      const view = new DataView(this.buffer.buffer);
      view.setUint32(56, Math.floor(length / 0x20000000), false);
      view.setUint32(60, (length << 3) >>> 0, false);
      this.process(this.buffer); this.finished = true;
    }
    return [...this.state].map((value) => hex32(value)).join("");
  }
}

export class Md5 extends BufferedHash {
  constructor() {
    super();
    this.state = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
    this.words = new Uint32Array(16);
  }

  process(block) {
    const shifts = [7,12,17,22, 5,9,14,20, 4,11,16,23, 6,10,15,21];
    const w = this.words;
    for (let i=0;i<16;i++) w[i] = (block[i*4] | (block[i*4+1]<<8) | (block[i*4+2]<<16) | (block[i*4+3]<<24)) >>> 0;
    let [a,b,c,d] = this.state;
    for (let i=0;i<64;i++) {
      let f, g, shift;
      if (i<16) { f=(b&c)|(~b&d);g=i;shift=shifts[i%4]; }
      else if (i<32) { f=(d&b)|(~d&c);g=(5*i+1)%16;shift=shifts[4+i%4]; }
      else if (i<48) { f=b^c^d;g=(3*i+5)%16;shift=shifts[8+i%4]; }
      else { f=c^(b|~d);g=(7*i)%16;shift=shifts[12+i%4]; }
      const constant = Math.floor(Math.abs(Math.sin(i+1)) * 0x100000000) >>> 0;
      const nextD = d;
      d=c;c=b;
      b=(b + rotateLeft((a + f + constant + w[g]) >>> 0, shift)) >>> 0;
      a=nextD;
    }
    this.state[0]=(this.state[0]+a)>>>0;this.state[1]=(this.state[1]+b)>>>0;this.state[2]=(this.state[2]+c)>>>0;this.state[3]=(this.state[3]+d)>>>0;
  }

  digest() {
    if (!this.finished) {
      const length = this.bytesHashed;
      this.buffer[this.bufferLength++] = 0x80;
      if (this.bufferLength > 56) {
        this.buffer.fill(0, this.bufferLength);
        this.process(this.buffer);
        this.bufferLength = 0;
      }
      this.buffer.fill(0, this.bufferLength, 56);
      const low = (length << 3) >>> 0;
      const high = Math.floor(length / 0x20000000);
      const view = new DataView(this.buffer.buffer);
      view.setUint32(56, low, true); view.setUint32(60, high, true);
      this.process(this.buffer);
      this.finished = true;
    }
    return [...this.state].map((value) => hex32(value, true)).join("");
  }
}

export function hashBytes(bytes) {
  return { sha256: new Sha256().update(bytes).digest(), sha1: new Sha1().update(bytes).digest(), md5: new Md5().update(bytes).digest() };
}
