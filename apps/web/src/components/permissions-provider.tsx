'use client';
import { createContext, useContext } from 'react';
import { can, type MemberRole, type Permission } from '@wls/shared';
const RoleContext = createContext<MemberRole>('VIEWER');
export function PermissionsProvider({ role, children }: { role: MemberRole; children: React.ReactNode }) { return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>; }
export const usePermission = (permission: Permission) => can(useContext(RoleContext), permission);
