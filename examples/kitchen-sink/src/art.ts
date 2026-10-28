// Placeholder artwork. Seeds keep images stable between runs.
export const poster = (seed: string | number) => `https://picsum.photos/seed/ks${seed}/400/600`;
export const wide = (seed: string | number) => `https://picsum.photos/seed/ks${seed}/800/450`;
export const square = (seed: string | number) => `https://picsum.photos/seed/ks${seed}/400/400`;
export const hero = (seed: string | number) => `https://picsum.photos/seed/ks${seed}/1920/1080`;

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);
