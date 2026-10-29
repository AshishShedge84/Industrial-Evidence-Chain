import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SEEDED_USERS } from '@/data/authoritativeSeed';
import type { User } from '@type-defs/auth';

// UUID/UID pattern detector: 20+ chars of hex/alphanumeric with optional hyphens
const ID_PATTERN = /^[0-9a-fA-F-]{20,}$|^[a-zA-Z0-9_-]{20,}$/;

class UserLookupService {
  private cache = new Map<string, string>();
  private pendingPromises = new Map<string, Promise<string>>();

  constructor() {
    this.seedCache();
  }

  private seedCache() {
    // Populate cache with known seeded users
    for (const u of SEEDED_USERS) {
      const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.email;
      if (u.id) this.cache.set(u.id, name);
      if (u.email) this.cache.set(u.email, name);
      if (u.username) this.cache.set(u.username, name);
    }
    // Well-known system actors
    this.cache.set('system', 'System Automation');
    this.cache.set('System', 'System Automation');
    this.cache.set('admin', 'Admin User');
    this.cache.set('manager', 'Sarah Connor');
    this.cache.set('auditor', 'Michael Chen');
    this.cache.set('tech', 'Bablu Electrician');
  }

  /**
   * Determine if an identifier is a raw ID (UUID or Firebase UID) rather than a human name
   */
  public isRawId(id?: string | null): boolean {
    if (!id || typeof id !== 'string') return false;
    const trimmed = id.trim();
    if (!trimmed) return false;
    // Names usually have spaces
    if (trimmed.includes(' ')) return false;
    // Check against UUID / UID length & format
    return ID_PATTERN.test(trimmed);
  }

  /**
   * Synchronous resolver that checks in-memory cache and returns a human-readable name or fallback
   */
  public resolveUserNameSync(id?: string | null, fallback = 'Unknown user'): string {
    if (!id || typeof id !== 'string') return fallback;
    const trimmed = id.trim();
    if (!trimmed) return fallback;

    // Check cache
    if (this.cache.has(trimmed)) {
      return this.cache.get(trimmed)!;
    }

    // If it doesn't look like a raw UUID or UID, it's likely already a human-readable name or role
    if (!this.isRawId(trimmed)) {
      return trimmed;
    }

    // Trigger async background resolution for next time
    this.resolveUserName(trimmed).catch(() => {});

    return fallback;
  }

  /**
   * Asynchronous resolver that checks cache and queries Firestore users collection
   */
  public async resolveUserName(id?: string | null, fallback = 'Unknown user'): Promise<string> {
    if (!id || typeof id !== 'string') return fallback;
    const trimmed = id.trim();
    if (!trimmed) return fallback;

    if (this.cache.has(trimmed)) {
      return this.cache.get(trimmed)!;
    }

    // If it's already a readable name, cache and return
    if (!this.isRawId(trimmed)) {
      this.cache.set(trimmed, trimmed);
      return trimmed;
    }

    // Avoid duplicate network calls
    if (this.pendingPromises.has(trimmed)) {
      return this.pendingPromises.get(trimmed)!;
    }

    const promise = (async (): Promise<string> => {
      try {
        // 1. Direct doc lookup in Firestore
        const userDocRef = doc(db, 'users', trimmed);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const resolvedName =
            data.fullName ||
            (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : null) ||
            data.displayName ||
            data.username ||
            data.email ||
            fallback;

          this.cache.set(trimmed, resolvedName);
          return resolvedName;
        }

        // 2. Query by 'id' or 'userId' field in case doc ID differs from internal user id
        const usersRef = collection(db, 'users');
        const qById = query(usersRef, where('id', '==', trimmed));
        const snapById = await getDocs(qById);

        if (!snapById.empty) {
          const data = snapById.docs[0].data();
          const resolvedName =
            data.fullName ||
            (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : null) ||
            data.displayName ||
            data.username ||
            data.email ||
            fallback;

          this.cache.set(trimmed, resolvedName);
          return resolvedName;
        }

        const qByUserId = query(usersRef, where('userId', '==', trimmed));
        const snapByUserId = await getDocs(qByUserId);

        if (!snapByUserId.empty) {
          const data = snapByUserId.docs[0].data();
          const resolvedName =
            data.fullName ||
            (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : null) ||
            data.displayName ||
            data.username ||
            data.email ||
            fallback;

          this.cache.set(trimmed, resolvedName);
          return resolvedName;
        }
      } catch (err) {
        // Safe read-only error handling
      }

      // If cannot be resolved, return fallback rather than raw UUID
      this.cache.set(trimmed, fallback);
      return fallback;
    })();

    this.pendingPromises.set(trimmed, promise);
    const result = await promise;
    this.pendingPromises.delete(trimmed);
    return result;
  }

  /**
   * Register a user into the lookup cache
   */
  public registerUser(user: Partial<User> & { id?: string; email?: string; fullName?: string }) {
    const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email;
    if (name) {
      if (user.id) this.cache.set(user.id, name);
      if (user.email) this.cache.set(user.email, name);
      if (user.username) this.cache.set(user.username, name);
    }
  }
}

export const userLookupService = new UserLookupService();

/**
 * React hook to reactively resolve user IDs to human readable names
 */
export function useUserLookup(id?: string | null, fallback = 'Unknown user'): { name: string; loading: boolean } {
  const [name, setName] = useState<string>(() => userLookupService.resolveUserNameSync(id, fallback));
  const [loading, setLoading] = useState<boolean>(() => userLookupService.isRawId(id));

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setName(fallback);
      setLoading(false);
      return;
    }

    const syncName = userLookupService.resolveUserNameSync(id, fallback);
    if (syncName !== fallback) {
      setName(syncName);
      setLoading(false);
      return;
    }

    setLoading(true);
    userLookupService.resolveUserName(id, fallback).then((resolved) => {
      if (isMounted) {
        setName(resolved);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id, fallback]);

  return { name, loading };
}

/**
 * Reusable React component for displaying human-readable user names
 */
export const UserDisplayName: React.FC<{
  userId?: string | null;
  fallback?: string;
  className?: string;
}> = ({ userId, fallback = 'Unknown user', className = '' }) => {
  const { name } = useUserLookup(userId, fallback);
  return <span className={className}>{name}</span>;
};
