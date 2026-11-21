import { createHash, randomBytes } from 'node:crypto';

export const sha256Hex = (text: string) =>
  createHash('sha256').update(text).digest('hex');

export const randomHex = (bytes: number) => randomBytes(bytes).toString('hex');
