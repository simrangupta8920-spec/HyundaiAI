import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { Lead, Showroom, Escalation } from '../types';
import { MOCK_LEADS, MOCK_SHOWROOMS } from '../services/mockData';
import {
  Search, Filter, ChevronRight, Users, Flame, AlertTriangle,
  CheckCircle2, Gauge, Car, Calendar, ArrowUpRight, Clock, MapPin,
  TrendingUp, Phone, Mail, ShieldAlert, UserCheck, PhoneCall, Radio,
  Volume2, Check, X
} from 'lucide-react';
import { LeadStatusBadge } from '../components/LeadStatusBadge';

export const CRMDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showroomFilter, setShowroomFilter] = useState<string>('all');
  const [testDriveFilter, setTestDriveFilter] = useState<string>('all');

  const [escalations, setEscalations] = useState<Escalation[]>([
    {
      id: 1,
      session_id: 'sess-rohan-01',
      lead_id: 1,
      showroom_id: 'HYD-DEL-001',
      reason: 'Customer cash discount request of ₹50,000 exceeds automated limit (max ₹40,000).',
      priority: 'high',
      status: 'pending',
      assigned_executive: 'Rajesh Kumar',
      triggered_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 2,
      session_id: 'sess-kavita-04',
      lead_id: 4,
      showroom_id: 'HYD-DEL-001',
      reason: 'High-value Ioniq 5 EV luxury policy requires human manager consultation.',
      priority: 'urgent',
      status: 'pending',
      assigned_executive: 'Rajesh Kumar',
      triggered_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ]);

  const [showSimAlert, setShowSimAlert] = useState(true);
  const [simConnected, setSimConnected] = useState(false);
  const [resolveModalEsc, setResolveModalEsc] = useState<Escalation | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setLeads(MOCK_LEADS);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(query) ||
      lead.phone.includes(query) ||
      (lead.vehicle_name && lead.vehicle_name.toLowerCase().includes(query)) ||
      (lead.email && lead.email.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesShowroom = showroomFilter === 'all' || lead.showroom_id === showroomFilter;
    const matchesTestDrive = testDriveFilter === 'all' || lead.test_drive_status === testDriveFilter;

    return matchesSearch && matchesStatus && matchesShowroom && matchesTestDrive;
  });

  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.classification === 'HOT' || l.status === 'hot').length;
  const warmLeads = leads.filter((l) => l.classification === 'WARM' || l.status === 'warm').length;
  const activeEscalationsCount = escalations.filter((e) => e.status !== 'resolved').length;
  const convertedLeads = leads.filter((l) => l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  const validScores = leads.map((l) => l.lead_score || l.score?.overall_score || 0).filter((s) => s > 0);
  const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '0.0';

  const handleAcceptEscalation = (escId: number) => {
    setEscalations((prev) =>
      prev.map((e) => (e.id === escId ? { ...e, status: 'in_progress', assigned_executive: 'Rajesh Kumar' } : e))
    );
    showToast('Escalation accepted! Executive assigned & status set to In-Progress.');
  };

  const handleResolveEscalationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalEsc) return;
    setEscalations((prev) =>
      prev.map((esc) =>
        esc.id === resolveModalEsc.id
          ? {
              ...esc,
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              resolved_by: 'Rajesh Kumar',
              notes: resolutionNotes,
            }
          : esc
      )
    );
    setResolveModalEsc(null);
    setResolutionNotes('');
    showToast('Escalation marked as RESOLVED!');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans relative pb-24">
      <Navbar userEmail="admin@showroom.com" onLogout={logout} />

      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" /> {toastMessage}
        </div>
      )}

      {showSimAlert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-gradient-to-r from-red-950/90 via-slate-800 to-orange-950/90 border-2 border-red-500/60 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse-slow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/40 relative">
                <Radio className="w-6 h-6 animate-ping absolute opacity-75" />
                <PhoneCall className="w-6 h-6 relative z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                    LIVE ESCALATION ALERT
                  </span>
                  <span className="text-xs text-slate-300 font-mono">Showroom: HYD-DEL-001</span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  Incoming Executive Escalation: <span className="text-red-300">Kavita Reddy (Ioniq 5 EV)</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Reason: High-value EV luxury policy requires human manager consultation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!simConnected ? (
                <button
                  onClick={() => {
                    setSimConnected(true);
                    showToast('Connected to customer voice session in HYD-DEL-001!');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" /> Accept Call & Connect Room
                </button>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span> Live Audio Connected
                </span>
              )}
              <button
                onClick={() => handleAcceptEscalation(2)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors"
              >
                Assign to Me
              </button>
              <button
                onClick={() => setShowSimAlert(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-slate-800 to-slate-800/60 p-6 rounded-3xl border border-slate-700/60 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-hyundai-blue-light text-xs font-bold uppercase tracking-wider mb-1">
              <Car className="w-4 h-4" /> Hyundai Showroom Executive CRM
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Sales Executive Control Center</h1>
            <p className="text-slate-400 text-sm mt-1">Real-time AI lead intelligence, test drive bookings, and escalation queue.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-hyundai-blue-light" />
              <select
                value={showroomFilter}
                onChange={(e) => setShowroomFilter(e.target.value)}
                className="bg-transparent text-sm font-semibold text-white outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-800">All Showrooms</option>
                {MOCK_SHOWROOMS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white">{totalLeads}</div>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5 mt-0.5">
                <TrendingUp className="w-3 h-3" /> Active pipeline
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-red-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Hot Leads</span>
              <Flame className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-red-400">{hotLeads}</div>
              <span className="text-[10px] text-red-300 font-medium">Immediate purchase</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Warm Leads</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-400">{warmLeads}</div>
              <span className="text-[10px] text-amber-300 font-medium">30-day timeline</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-orange-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-orange-500/50 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Escalations</span>
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-orange-400">{activeEscalationsCount}</div>
              <span className="text-[10px] text-orange-300 font-medium">Active Queue</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Avg Score</span>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-cyan-300">{avgScore} <span className="text-xs font-normal text-slate-400">/100</span></div>
              <span className="text-[10px] text-cyan-400 font-medium">AI Qualified</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Conversion</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-400">{conversionRate}%</div>
              <span className="text-[10px] text-emerald-300 font-medium">{convertedLeads} booked</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-orange-500/40 rounded-3xl shadow-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-slate-700/80 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-400" /> Active Human Escalation Queue
              <span className="bg-orange-500/20 text-orange-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {activeEscalationsCount} Pending Review
              </span>
            </h2>
            <span className="text-xs text-slate-400">Automated triggers: discount limits, explicit requests, EV policies</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {escalations.map((esc) => {
              const leadObj = leads.find((l) => l.id === esc.lead_id || l.session_id === esc.session_id);
              const isResolved = esc.status === 'resolved';

              return (
                <div
                  key={esc.id}
                  className={`bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between gap-3 transition-all ${
                    isResolved
                      ? 'border-slate-700 opacity-60'
                      : esc.priority === 'urgent'
                      ? 'border-red-500/50 shadow-lg shadow-red-500/5'
                      : 'border-orange-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-base">
                          {leadObj?.name || 'Customer Lead'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            esc.priority === 'urgent'
                              ? 'bg-red-500 text-white'
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          }`}
                        >
                          {esc.priority}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{esc.showroom_id || 'HYD-DEL-001'}</span>
                    </div>

                    <p className="text-slate-200 text-xs leading-relaxed bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                      {esc.reason}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
                      <span>Status: <strong className="text-white capitalize">{esc.status}</strong></span>
                      <span>Assigned: <strong className="text-emerald-400">{esc.assigned_executive || 'Unassigned'}</strong></span>
                    </div>
                  </div>

                  {!isResolved && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleAcceptEscalation(esc.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Accept Escalation
                      </button>
                      <button
                        onClick={() => setResolveModalEsc(esc)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-800/50">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Showroom Lead Pipeline
                <span className="bg-slate-700 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  {filteredLeads.length} leads
                </span>
              </h2>
              <p className="text-xs text-slate-400">Click any row to open complete customer transcript and lead analysis.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer, phone, car..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-hyundai-blue-light focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-200 focus:ring-2 focus:ring-hyundai-blue-light outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="contacted">Contacted</option>
                  <option value="new">New</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div className="relative">
                <select
                  value={testDriveFilter}
                  onChange={(e) => setTestDriveFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-200 focus:ring-2 focus:ring-hyundai-blue-light outline-none cursor-pointer"
                >
                  <option value="all">Test Drive: All</option>
                  <option value="requested">Requested</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-700/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-5 py-4">Showroom</th>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Budget</th>
                  <th className="px-5 py-4 text-center">Lead Score</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Test Drive</th>
                  <th className="px-5 py-4">Timeline</th>
                  <th className="px-5 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => {
                    const scoreVal = lead.lead_score || lead.score?.overall_score || 0;
                    const isHot = lead.classification === 'HOT' || scoreVal >= 80;
                    const isWarm = lead.classification === 'WARM' || (scoreVal >= 60 && scoreVal < 80);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/crm/leads/${lead.id}`)}
                        className="hover:bg-slate-700/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white text-sm group-hover:text-hyundai-blue-light transition-colors">
                            {lead.name}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" /> {lead.phone}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300">
                            <MapPin className="w-3 h-3 text-hyundai-blue-light" />
                            {lead.showroom_id || 'HYD-DEL-001'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold text-white">
                            {lead.vehicle_name || 'Hyundai Creta'}
                          </div>
                          {lead.fuel_preference && (
                            <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              {lead.fuel_preference} {lead.transmission_preference || ''}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-200">
                          {lead.budget_max
                            ? `₹${lead.budget_min ? lead.budget_min.toFixed(1) : '0'}L - ${lead.budget_max.toFixed(1)}L`
                            : lead.budget_min
                            ? `₹${lead.budget_min.toFixed(1)}L+`
                            : 'N/A'}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border ${
                                isHot
                                  ? 'bg-red-500/10 border-red-500/40 text-red-400'
                                  : isWarm
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
                              }`}
                            >
                              {scoreVal}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isHot
                                  ? 'bg-red-500/20 text-red-300'
                                  : isWarm
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {lead.classification || (isHot ? 'HOT' : isWarm ? 'WARM' : 'LOW')}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <LeadStatusBadge status={lead.status} />
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              lead.test_drive_status === 'scheduled' || lead.test_drive_status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : lead.test_drive_status === 'requested'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {lead.test_drive_status ? lead.test_drive_status.charAt(0).toUpperCase() + lead.test_drive_status.slice(1) : 'None'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs font-medium text-slate-300">
                          {lead.purchase_timeline || 'N/A'}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-400">
                          {new Date(lead.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/crm/leads/${lead.id}`);
                            }}
                            className="inline-flex items-center gap-1 bg-hyundai-blue hover:bg-blue-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            View Details <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500 text-sm">
                      No customer leads found matching your active filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {resolveModalEsc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Resolve Escalation
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Reason: <span className="text-slate-200">{resolveModalEsc.reason}</span>
            </p>

            <form onSubmit={handleResolveEscalationSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Resolution Notes & Approval Details</label>
                <textarea
                  required
                  placeholder="e.g., Approved ₹40,000 corporate discount + complimentary basic accessory kit. Customer satisfied."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-hyundai-blue-light min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalEsc(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                >
                  Mark Escalation Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
