import { and, eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'doctor' | 'receptionist';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export async function getClinicUsers(clinicId: string): Promise<UserListItem[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.clinicId, clinicId))
    .orderBy(desc(users.createdAt));

  return rows as UserListItem[];
}

export async function getUserById(
  clinicId: string,
  userId: string,
): Promise<UserListItem | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.clinicId, clinicId)))
    .limit(1);

  return (rows[0] as UserListItem) ?? null;
}
