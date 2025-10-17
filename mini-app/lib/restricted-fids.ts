
export const RESTRICTED_FIDS: number[] = [
  1134276, 1134066, 1132989, 1134832, 1134926, 1137074, 1139971, 1134600,
  1134249, 1141750, 1132996
];

export function isFidRestricted(fid: number): boolean {
  return RESTRICTED_FIDS.includes(fid);
}
