import vocabJson from '../data/vocab.json';
import strandsJson from '../data/strands.json';
import { canonicalMap } from './session.js';

export const VOCAB = vocabJson;
export const STRANDS = strandsJson;
export const BY_ID = Object.fromEntries(VOCAB.map((v) => [v.id, v]));
export const CANON = canonicalMap(VOCAB);
export const STRAND_BY_ID = Object.fromEntries(STRANDS.map((s) => [s.id, s]));
export const UNIQUE_TOTAL = CANON.size;

export const itemsOf = (strandId) => VOCAB.filter((v) => v.s === strandId);
