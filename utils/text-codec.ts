export type Base64Alphabet = 'base64' | 'base64url';
export const MAX_CODEC_INPUT_LENGTH = 4_000_000;

function checkLength(value: string, maximum = MAX_CODEC_INPUT_LENGTH) {
  if (value.length > maximum) {
    throw new RangeError('Codec input limit exceeded.');
  }
}

export function encodeBase64Text(
  value: string,
  alphabet: Base64Alphabet = 'base64',
) {
  checkLength(value, 1_000_000);
  // TextEncoder replaces lone surrogates; reject them rather than corrupting text.
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new TypeError('Invalid Unicode.');
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError('Invalid Unicode.');
    }
  }
  let binary = '';
  for (const byte of new TextEncoder().encode(value))
    binary += String.fromCharCode(byte);
  const encoded = btoa(binary);
  return alphabet === 'base64url'
    ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    : encoded;
}

// Standard Base64 requires canonical padding; base64url is strictly unpadded.
// Neither format accepts whitespace or nonzero unused padding bits.
export function decodeBase64Bytes(
  value: string,
  alphabet: Base64Alphabet = 'base64',
) {
  checkLength(value);
  if (/\s/.test(value))
    throw new TypeError('Base64 whitespace is not allowed.');
  const valid =
    alphabet === 'base64'
      ? value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value)
      : /^[A-Za-z0-9_-]*$/.test(value) && value.length % 4 !== 1;
  if (!valid) throw new TypeError('Invalid Base64 alphabet or padding.');
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(
    normalized + '='.repeat((4 - (normalized.length % 4)) % 4),
  );
  const canonical =
    alphabet === 'base64url'
      ? btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      : btoa(binary);
  if (canonical !== value)
    throw new TypeError('Noncanonical Base64 padding bits.');
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function decodeBase64Text(
  value: string,
  alphabet: Base64Alphabet = 'base64',
) {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
    decodeBase64Bytes(value, alphabet),
  );
}
