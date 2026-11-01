import { useState } from 'react';
import type { FC } from 'react';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Download, Edit3,
  Eye, Key, Layers, MoreHorizontal, Plus, RefreshCw, Search,
  Shield, User, Users, XCircle,
} from 'lucide-react';

interface UserRow {
  userId: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Lab Analyst' | 'Field Operator' | 'Viewer';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  permissions: string[];
  createdAt: string;
}

const USERS: UserRow[] = [
  { userId: 'USR-0001', name: 'Admin User',   email: 'admin@wateralert.gov.in',  role: 'Administrator',  status: 'Active',   lastLogin: '01 Nov 2026,\n10:24 AM', createdAt: '01 Oct 2026, 09:00 AM', permissions: ['View Readings','Upload Evidence','Update Verification','View Alerts','Manage Users'] },
  { userId: 'USR-0002', name: 'Meera Sharma', email: 'meera@wateralert.gov.in',  role: 'Lab Analyst',    status: 'Active',   lastLogin: '01 Nov 2026,\n09:10 AM', createdAt: '10 Oct 2026, 04:20 PM', permissions: ['View Readings','Upload Evidence','Update Verification','View Alerts'] },
  { userId: 'USR-0003', name: 'Rohit Kumar',  email: 'rohit@wateralert.gov.in',  role: 'Field Operator', status: 'Active',   lastLogin: '31 Oct 2026,\n05:42 PM', createdAt: '12 Oct 2026, 11:00 AM', permissions: ['View Readings','Upload Evidence'] },
  { userId: 'USR-0004', name: 'Anita Patel',  email: 'anita@wateralert.gov.in',  role: 'Field Operator', status: 'Active',   lastLogin: '31 Oct 2026,\n03:15 PM', createdAt: '15 Oct 2026, 02:30 PM', permissions: ['View Readings','Upload Evidence'] },
  { userId: 'USR-0005', name: 'Vikash Tiwari',email: 'vikash@wateralert.gov.in', role: 'Viewer',         status: 'Inactive', lastLogin: '20 Oct 2026,\n11:08 AM', createdAt: '20 Oct 2026, 08:00 AM', permissions: ['View Alerts'] },
];

const ROLE_STYLES: Record<string, string> = {
  'Administrator':  'bg-purple-100 text-purple-700',
  'Lab Analyst':    'bg-blue-100 text-blue-700',
  'Field Operator': 'bg-amber-100 text-amber-800',
  'Viewer':         'bg-slate-100 text-slate-600',
};
const ROLE_ICONS: Record<string, string> = {
  'Administrator': '🛡',
  'Lab Analyst':   '🔬',
  'Field Operator':'⚙️',
  'Viewer':        '👁',
};

const ROLES = [
  { name: 'Administrator', count: 2, perms: ['Full system access', 'User management', 'All read/write'] },
  { name: 'Lab Analyst',   count: 5, perms: ['Upload evidence', 'Update verification', 'View all readings'] },
  { name: 'Field Operator',count: 7, perms: ['Submit readings', 'Upload evidence', 'View assigned sources'] },
  { name: 'Viewer',        count: 4, perms: ['View readings', 'View alerts (read only)'] },
];

type TabType = 'users' | 'roles' | 'permissions';

export const UsersRolesView: FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [selectedId, setSelectedId] = useState('USR-0002');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All States');
  const [search, setSearch] = useState('');

  const selected = USERS.find(u => u.userId === selectedId) ?? USERS[1];

  const filtered = USERS.filter(u => {
    const q = search.toLowerCase();
    return (
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q)) &&
      (roleFilter === 'All Roles' || u.role === roleFilter) &&
      (statusFilter === 'All States' || u.status === statusFilter)
    );
  });

  return (
    <div className="space-y-4 font-sans">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Users className="w-5 h-5"/>,     bg: 'bg-blue-50',   iconBg: 'bg-blue-100 text-blue-600',   label: 'Total Users',     value: '18',  sub: '▲ +3', subC: 'text-emerald-600', desc: 'Active accounts' },
          { icon: <CheckCircle2 className="w-5 h-5 fill-current"/>, bg: 'bg-emerald-50', iconBg: 'bg-emerald-100 text-emerald-600', label: 'Active Users', value: '16', sub: '(88.9%)', subC: 'text-emerald-600', desc: '' },
          { icon: <Layers className="w-5 h-5"/>,    bg: 'bg-amber-50',  iconBg: 'bg-amber-100 text-amber-600', label: 'Roles',           value: '4',   sub: '', subC: '', desc: '(Admin, Operator, Lab, Viewer)' },
          { icon: <Key className="w-5 h-5"/>,       bg: 'bg-purple-50', iconBg: 'bg-purple-100 text-purple-600',label: 'Permission Sets', value: '12',  sub: '', subC: '', desc: '(Configured)' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border border-slate-100 rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${c.iconBg} flex items-center justify-center shrink-0`}>{c.icon}</div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600">{c.label}</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{c.value}</span>
                  {c.sub && <span className={`text-[11px] font-bold ${c.subC}`}>{c.sub}</span>}
                </div>
                {c.desc && <div className="text-[10px] text-slate-500">{c.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-slate-200 gap-1">
        {([['users', `Users (${USERS.length})`, <User className="w-3.5 h-3.5"/>], ['roles', 'Roles (4)', <Layers className="w-3.5 h-3.5"/>], ['permissions', 'Permissions', <Shield className="w-3.5 h-3.5"/>]] as [TabType, string, JSX.Element][]).map(([t, label, icon]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <>
          {/* ── FILTERS ── */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Search by name, email, or user ID…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
            </div>
            {[
              { label: 'Role',   val: roleFilter,   set: setRoleFilter,   opts: ['All Roles','Administrator','Lab Analyst','Field Operator','Viewer'] },
              { label: 'Status', val: statusFilter, set: setStatusFilter, opts: ['All States','Active','Inactive'] },
            ].map(f => (
              <div key={f.label} className="flex flex-col">
                <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">{f.label}</span>
                <select value={f.val} onChange={e => f.set(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer">
                  {f.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <button className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg mt-4 transition">
              <Download className="w-3.5 h-3.5" /> Export (CSV)
            </button>
            <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg mt-4 transition">
              <Plus className="w-3.5 h-3.5" /> Add User
            </button>
          </div>

          {/* ── TWO-COLUMN LAYOUT ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT: Users Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">System Users ({filtered.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                      <th className="py-2.5 px-3"><input type="checkbox" className="rounded" /></th>
                      <th className="py-2.5 px-3">User ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Last Login</th>
                      <th className="py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(u => (
                      <tr key={u.userId} onClick={() => setSelectedId(u.userId)}
                        className={`cursor-pointer transition ${selectedId === u.userId ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="py-2.5 px-3"><input type="checkbox" className="rounded" onClick={e => e.stopPropagation()} /></td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{u.userId}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{u.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_STYLES[u.role]}`}>
                            {ROLE_ICONS[u.role]} {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-pre-line text-[11px]">{u.lastLogin}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"><Eye className="w-3.5 h-3.5" /></button>
                            <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">Showing 1 – 5 of 18 users</span>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                  {[1,2,3,4].map(n => (
                    <button key={n} className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center ${n===1?'bg-blue-600 text-white':'text-slate-500 hover:bg-slate-100'}`}>{n}</button>
                  ))}
                  <button className="p-1 rounded text-slate-400"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* RIGHT: User Detail */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">User Details</h3>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{selected.status}</span>
              </div>

              <div className="p-4 space-y-4 flex-1">
                {/* Avatar */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center text-xl shrink-0">
                    👤
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selected.name}</h4>
                    <p className="text-[11px] text-slate-500">{selected.userId}</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-2.5 text-xs">
                  {[
                    { icon: '📧', label: 'Email',      value: selected.email },
                    { icon: '🔐', label: 'Role',       value: null, badge: selected.role },
                    { icon: '📅', label: 'Created At', value: selected.createdAt },
                    { icon: '🕐', label: 'Last Login', value: selected.lastLogin.replace('\n', ' ') },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-slate-400 font-medium">{f.icon} {f.label}</span>
                      {f.badge
                        ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_STYLES[f.badge]}`}>{ROLE_ICONS[f.badge]} {f.badge}</span>
                        : <span className="text-slate-800 font-medium">{f.value}</span>
                      }
                    </div>
                  ))}
                  {/* Permissions */}
                  <div className="flex items-start gap-3">
                    <span className="w-16 shrink-0 text-slate-400 font-medium mt-0.5">🛡 Permissions</span>
                    <div className="flex flex-wrap gap-1">
                      {selected.permissions.map(p => (
                        <span key={p} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                <button className="flex items-center gap-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
                  <Edit3 className="w-3.5 h-3.5" /> Edit User
                </button>
                <button className="flex items-center gap-1.5 text-[11px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">
                  <RefreshCw className="w-3.5 h-3.5" /> Change Role
                </button>
                <button className="flex items-center gap-1.5 text-[11px] font-bold border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-700 px-3 py-1.5 rounded-lg transition">
                  <XCircle className="w-3.5 h-3.5" /> Disable
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROLES.map(r => (
            <div key={r.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_STYLES[r.name]}`}>{ROLE_ICONS[r.name]} {r.name}</span>
                <span className="text-[11px] font-bold text-slate-600">{r.count} users</span>
              </div>
              <ul className="space-y-1">
                {r.perms.map(p => (
                  <li key={p} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-2">
          <Key className="w-8 h-8 text-blue-400 mx-auto" />
          <h3 className="font-bold text-slate-800">Permission Matrix</h3>
          <p className="text-xs text-slate-500">Granular RBAC permissions are managed per-role and scoped to AWS IAM groups.</p>
        </div>
      )}
    </div>
  );
};
