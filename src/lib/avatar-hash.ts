export interface AvatarTheme {
  name: string;
  bgStyle: string;
  borderStyle: string;
  textClass: string;
  hashHex: string;
  initial: string;
}

const AVATAR_PALETTES: Omit<AvatarTheme, 'hashHex' | 'initial'>[] = [
  {
    name: 'Rose Ember',
    bgStyle: 'linear-gradient(135deg, rgba(244, 63, 94, 0.24), rgba(251, 113, 133, 0.08))',
    borderStyle: 'rgba(244, 63, 94, 0.38)',
    textClass: 'text-rose-600 dark:text-rose-300',
  },
  {
    name: 'Indigo Twilight',
    bgStyle: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(129, 140, 248, 0.09))',
    borderStyle: 'rgba(99, 102, 241, 0.38)',
    textClass: 'text-indigo-600 dark:text-indigo-300',
  },
  {
    name: 'Amber Glow',
    bgStyle: 'linear-gradient(135deg, rgba(245, 158, 11, 0.24), rgba(251, 191, 36, 0.08))',
    borderStyle: 'rgba(245, 158, 11, 0.38)',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    name: 'Emerald Moss',
    bgStyle: 'linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(52, 211, 153, 0.08))',
    borderStyle: 'rgba(16, 185, 129, 0.38)',
    textClass: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    name: 'Sky Mist',
    bgStyle: 'linear-gradient(135deg, rgba(14, 165, 233, 0.24), rgba(56, 189, 248, 0.08))',
    borderStyle: 'rgba(14, 165, 233, 0.38)',
    textClass: 'text-sky-700 dark:text-sky-300',
  },
  {
    name: 'Violet Dusk',
    bgStyle: 'linear-gradient(135deg, rgba(139, 92, 246, 0.24), rgba(167, 139, 250, 0.08))',
    borderStyle: 'rgba(139, 92, 246, 0.38)',
    textClass: 'text-violet-700 dark:text-violet-300',
  },
  {
    name: 'Teal Horizon',
    bgStyle: 'linear-gradient(135deg, rgba(20, 184, 166, 0.24), rgba(45, 212, 191, 0.08))',
    borderStyle: 'rgba(20, 184, 166, 0.38)',
    textClass: 'text-teal-700 dark:text-teal-300',
  },
  {
    name: 'Fuchsia Bloom',
    bgStyle: 'linear-gradient(135deg, rgba(217, 70, 239, 0.24), rgba(232, 121, 249, 0.08))',
    borderStyle: 'rgba(217, 70, 239, 0.38)',
    textClass: 'text-fuchsia-700 dark:text-fuchsia-300',
  },
];

/**
 * Hàm băm DJB2 tất định (Deterministic Hash):
 * Sinh bảng màu Aura đại diện cố định dựa trên @handle hoặc tên định danh của người dùng.
 */
export function getAvatarThemeFromIdentity(identityKey: string): AvatarTheme {
  const normalized = (identityKey || 'vibenest').trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
  }
  const unsignedHash = Math.abs(hash >>> 0);
  const palette = AVATAR_PALETTES[unsignedHash % AVATAR_PALETTES.length];
  const shortHex = unsignedHash.toString(16).toUpperCase().slice(0, 4).padStart(4, '0');

  const cleanInitial = (identityKey || 'V').replace(/^@/, '').trim().charAt(0).toUpperCase() || 'V';

  return {
    ...palette,
    hashHex: `#${shortHex}`,
    initial: cleanInitial,
  };
}


/** Backward-compatible alias for older account-linking UI callers. */
export function getAvatarThemeFromAlias(alias: string): AvatarTheme {
  return getAvatarThemeFromIdentity(alias);
}
