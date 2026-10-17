export type DisplayableUser = {
  username: string;
  fullName?: string | null;
};

export function getUserDisplayName(user: DisplayableUser): string {
  return user.fullName?.trim() || user.username;
}

export function getUserInitials(user: DisplayableUser): string {
  const parts = getUserDisplayName(user).trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
  }
  return (parts[0] ?? user.username).slice(0, 2).toUpperCase();
}
