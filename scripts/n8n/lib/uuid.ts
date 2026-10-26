/**
 * Gera UUID v4. Implementação própria, sem depender de `crypto` (bloqueado no
 * Code node do n8n em task runner). Usa Math.random — suficiente para IDs de nós.
 */
export function uuidV4(): string {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      s += '-';
    } else if (i === 14) {
      s += '4';
    } else if (i === 19) {
      s += hex[(Math.floor(Math.random() * 16) & 0x3) | 0x8];
    } else {
      s += hex[Math.floor(Math.random() * 16)];
    }
  }
  return s;
}
