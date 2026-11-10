export const memberRoles = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const;
export type MemberRole = typeof memberRoles[number];
export type Permission = 'read' | 'edit' | 'delete' | 'members' | 'settings';
export const roleLabels: Record<MemberRole, string> = { OWNER: 'Responsável', ADMIN: 'Administrador', EDITOR: 'Editor', VIEWER: 'Leitor' };
export function can(role: MemberRole, permission: Permission): boolean {
  return permission === 'read' || role === 'OWNER' || role === 'ADMIN' || (role === 'EDITOR' && permission === 'edit');
}
export function canManageRole(actor: MemberRole, target: MemberRole): boolean {
  return actor === 'OWNER' || (actor === 'ADMIN' && (target === 'EDITOR' || target === 'VIEWER'));
}
