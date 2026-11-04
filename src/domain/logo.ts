export const avatarCount = 30;
export function randomLogo(current?: number, random: () => number = Math.random) {
  const next = Math.floor(random() * (current === undefined ? avatarCount : avatarCount - 1));
  return current !== undefined && next >= current ? next + 1 : next;
}
