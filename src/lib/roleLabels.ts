const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  employee: 'Employee',
  warden: 'Social Worker',
  donor: 'Donor',
  finance: 'Finance',
};

/** User-facing role label (backend role value `warden` → "Social Worker"). */
export function formatUserRole(role: string | null | undefined): string {
  if (!role) return '';
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Legacy seed/display names that still contain "warden" (e.g. "Home Warden"). */
export function formatUserDisplayName(name: string | null | undefined): string {
  if (!name) return '';
  return name.replace(/\bWarden\b/gi, 'Social Worker');
}

/** Strip legacy "warden" wording from any user-facing string. */
export function sanitizeWardenLabel(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\bhome warden\b/gi, 'project social worker')
    .replace(/\bhome social worker\b/gi, 'project social worker')
    .replace(/\bthe warden\b/gi, 'the social worker')
    .replace(/\bwardens\b/gi, 'social workers')
    .replace(/\bWarden\b/g, 'Social Worker')
    .replace(/\bwarden\b/g, 'social worker');
}
