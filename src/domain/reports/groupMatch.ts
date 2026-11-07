export function groupMatchKey(groupName: string): string {
  return groupName.trim().replace(/\s+/gu, ' ').toLowerCase();
}
