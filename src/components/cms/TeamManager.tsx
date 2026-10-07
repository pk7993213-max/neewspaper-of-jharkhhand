import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { StaffUser, UserRole } from '../../types';
import { formatDate } from '../../utils/format';
import { Users, Shield, Award, User, CheckCircle2, AlertCircle } from 'lucide-react';

export const TeamManager: React.FC = () => {
  const { staffUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<StaffUser, 'uid'>) }));
      setUsers(list);
    } catch (err: unknown) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangeRole = async (targetUid: string, nextRole: UserRole) => {
    if (!isAdmin) {
      setMessage('Only Root Administrators can reassign newsroom editorial roles.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', targetUid), { role: nextRole });
      setMessage('Role updated successfully.');
      await fetchUsers();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Role change failed');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-stone-200 pb-4">
        <h1
          className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          <Users className="w-7 h-7 text-[#800000]" />
          Newsroom Editorial Staff & RBAC Permissions
        </h1>
        <p className="text-xs text-stone-600 mt-1 font-serif">
          Role-Based Access Control enforcing zero-trust permissions at both Firestore and UI levels.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-stone-100 border border-stone-300 text-stone-800 text-xs rounded flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-stone-600">×</button>
        </div>
      )}

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded border border-red-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 mb-1">
            <Shield className="w-4 h-4 text-red-700" />
            <span>Root Admin</span>
          </div>
          <p className="text-[11px] text-red-800 leading-relaxed">
            Unrestricted access: full create/edit/delete across articles, videos, categories, and staff roles. Pre-seeded for duraj7547@gmail.com.
          </p>
        </div>

        <div className="bg-amber-50 p-4 rounded border border-amber-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
            <Award className="w-4 h-4 text-amber-700" />
            <span>Desk Editor</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Can review drafts, publish/unpublish all articles, manage multimedia dispatches, and edit categories.
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1">
            <User className="w-4 h-4 text-blue-700" />
            <span>Field Reporter</span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Can write and file drafts, upload field photography/video, and edit own authored dispatches.
          </p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 font-serif font-bold text-sm text-stone-900">
          Registered Staff Members ({users.length})
        </div>

        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-stone-100 rounded"></div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No registered staff yet.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {users.map(u => (
              <div key={u.uid} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-stone-800 text-white flex items-center justify-center font-bold text-xs">
                    {u.displayName?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">{u.displayName}</div>
                    <div className="text-[11px] text-stone-500 font-mono">{u.email}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-auto">
                  <div className="text-[11px] text-stone-400">
                    Joined: {formatDate(u.createdAt)}
                  </div>

                  {isAdmin ? (
                    <select
                      value={u.role || 'reporter'}
                      onChange={e => handleChangeRole(u.uid, e.target.value as UserRole)}
                      className="text-xs font-semibold px-2 py-1 bg-stone-100 border border-stone-300 rounded focus:outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="reporter">Reporter</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                      {u.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
