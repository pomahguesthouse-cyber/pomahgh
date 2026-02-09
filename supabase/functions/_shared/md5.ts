// MD5 implementation for Deno edge functions
// Deno's crypto.subtle doesn't support MD5, so we use a pure implementation

export function md5(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  
  // Pre-processing: adding padding bits
  const originalLenBits = bytes.length * 8;
  // Append 0x80, then zeros until length ≡ 448 (mod 512) in bits = 56 (mod 64) in bytes
  const padLen = (bytes.length % 64 < 56) 
    ? 56 - (bytes.length % 64) 
    : 120 - (bytes.length % 64);
  
  const padded = new Uint8Array(bytes.length + padLen + 8);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  
  // Append original length in bits as 64-bit little-endian
  const lenView = new DataView(padded.buffer);
  lenView.setUint32(padded.length - 8, originalLenBits >>> 0, true);
  lenView.setUint32(padded.length - 4, 0, true); // high 32 bits (always 0 for strings < 512MB)
  
  // Initialize hash values
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  
  // Per-round shift amounts
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  
  // Pre-computed constants
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  }
  
  const view = new DataView(padded.buffer);
  
  // Process each 64-byte chunk
  for (let offset = 0; offset < padded.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }
    
    let A = a0, B = b0, C = c0, D = d0;
    
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      const rotated = ((F << S[i]) | (F >>> (32 - S[i]))) >>> 0;
      B = (B + rotated) >>> 0;
    }
    
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  
  // Convert to hex (little-endian)
  const toHex = (n: number) => {
    return [0, 8, 16, 24]
      .map(shift => ((n >>> shift) & 0xff).toString(16).padStart(2, "0"))
      .join("");
  };
  
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}
