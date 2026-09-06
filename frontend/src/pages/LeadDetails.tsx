import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { Lead, Message, Score, Showroom } from '../types';
import { MOCK_LEADS, MOCK_MESSAGES, MOCK_SCORE, MOCK_SHOWROOMS } from '../services/mockData';
import { LeadStatusBadge } from '../components/LeadStatusBadge';
import { TranscriptMessage } from '../components/TranscriptMessage';
import {
  ArrowLeft, Phone, Mail, FileText, CheckCircle2, XCircle,
  Flame, Calendar, UserCheck, ShieldAlert, Car, MapPin, Gauge,
  Award, RefreshCw, MessageSquare, DollarSign, ChevronRight, Check
} from 'lucide-react';

export const LeadDetails: React.FC = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showroom, setShowroom] = useState<Showroom | null>(null);
  const [notes, setNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals / Dropdowns
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedExec, setSelectedExec] = useState('');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    const found = MOCK_LEADS.find((l) => l.id === Number(leadId)) || MOCK_LEADS[0];
    if (found) {
      setLead(found);
      setMessages(MOCK_MESSAGES);
      setNotes(found.notes || '');
      setSelectedExec(found.assigned_executive || 'Rajesh Kumar');

      const sr = MOCK_SHOWROOMS.find((s) => s.id === found.showroom_id) || MOCK_SHOWROOMS[0];
      setShowroom(sr);
    }
  }, [leadId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStatus = (newStatus: Lead['status']) => {
    if (!lead) return;
    setLead({ ...lead, status: newStatus });
    showToast(`Lead status updated to "${newStatus.toUpperCase()}"`);
  };

  const handleAssignExecutive = (execName: string) => {
    if (!lead) return;
    setLead({ ...lead, assigned_executive: execName });
    setSelectedExec(execName);
    setShowAssignModal(false);
    showToast(`Assigned lead to Executive: ${execName}`);
  };

  const handleScheduleFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    const noteEntry = `[Follow-up Scheduled for ${followUpDate}]: ${followUpNotes}`;
    setNotes((prev) => (prev ? `${prev}\n${noteEntry}` : noteEntry));
    setShowFollowUpModal(false);
    setFollowUpNotes('');
    showToast(`Follow-up scheduled for ${followUpDate}`);
  };

  const scrollToTranscript = () => {
    const el = document.getElementById('transcript-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (!lead) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-hyundai-blue-light border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Lead Details...</span>
        </div>
      </div>
    );
  }

  const scoreVal = lead.lead_score || lead.score?.overall_score || 75;
  const isHot = lead.classification === 'HOT' || scoreVal >= 80;
  const isWarm = lead.classification === 'WARM' || (scoreVal >= 60 && scoreVal < 80);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24 relative">
      <Navbar userEmail="admin@showroom.com" onLogout={logout} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" /> {toastMessage}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/crm/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to CRM Dashboard
        </button>

        {/* Top Header Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 mb-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-white">{lead.name}</h1>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  isHot
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : isWarm
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {lead.classification || (isHot ? 'HOT' : isWarm ? 'WARM' : 'LOW')}
              </span>
              <LeadStatusBadge status={lead.status} />
              {lead.showroom_id && (
                <span className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-hyundai-blue-light" /> {lead.showroom_id}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Session ID: <span className="text-slate-300 font-mono">{lead.session_id}</span> • Created:{' '}
              {new Date(lead.created_at).toLocaleString()}
            </p>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={scrollToTranscript}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-hyundai-blue-light" /> View Transcript
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors"
            >
              <UserCheck className="w-4 h-4 text-blue-400" /> Assign Executive
            </button>
            <button
              onClick={() => setShowFollowUpModal(true)}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors"
            >
              <Calendar className="w-4 h-4 text-purple-400" /> Schedule Follow-up
            </button>
            <button
              onClick={() => handleUpdateStatus('contacted')}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors shadow-md"
            >
              Mark Contacted
            </button>
            <button
              onClick={() => handleUpdateStatus('converted')}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark Converted
            </button>
            <button
              onClick={() => handleUpdateStatus('lost')}
              className="flex items-center gap-1.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/50 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors"
            >
              <XCircle className="w-4 h-4" /> Mark Lost
            </button>
          </div>
        </div>

        {/* Escalation Warning Banner (if present) */}
        {lead.escalation_reason && (
          <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-5 mb-8 flex items-start gap-4 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-orange-300 text-sm uppercase tracking-wider flex items-center gap-2">
                  Human Escalation Flagged
                  <span className="bg-orange-500/20 text-orange-200 text-[10px] px-2 py-0.5 rounded-full font-bold">URGENT</span>
                </h3>
              </div>
              <p className="text-slate-200 text-sm mt-1">{lead.escalation_reason}</p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Customer Info, Requirements, Score, Showroom) */}
          <div className="flex flex-col gap-6">
            
            {/* Customer Contact Card */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white border-b border-slate-700/80 pb-3 mb-4 flex items-center justify-between">
                Customer Information
                <UserCheck className="w-4 h-4 text-hyundai-blue-light" />
              </h3>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" /> Phone
                  </span>
                  <a href={`tel:${lead.phone}`} className="font-bold text-hyundai-blue-light hover:underline">
                    {lead.phone}
                  </a>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" /> Email
                  </span>
                  <a href={`mailto:${lead.email || ''}`} className="font-medium text-slate-200 hover:underline">
                    {lead.email || 'Not provided'}
                  </a>
                </div>
                {lead.family_size && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Family Size</span>
                    <span className="font-semibold text-white">{lead.family_size} members</span>
                  </div>
                )}
                {lead.use_case && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Primary Usage</span>
                    <span className="font-semibold text-white">{lead.use_case}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Assigned Exec</span>
                  <span className="font-bold text-emerald-400">{lead.assigned_executive || selectedExec}</span>
                </div>
              </div>
            </div>

            {/* Vehicle Requirements Card */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white border-b border-slate-700/80 pb-3 mb-4 flex items-center justify-between">
                Vehicle Preferences
                <Car className="w-4 h-4 text-hyundai-blue-light" />
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Target Model</span>
                  <span className="font-bold text-white text-base">{lead.vehicle_name || 'Hyundai Creta'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Budget Range</span>
                  <span className="font-bold text-emerald-400 text-base">
                    {lead.budget_max ? `₹${lead.budget_min ? lead.budget_min.toFixed(1) : '0'}L - ${lead.budget_max.toFixed(1)}L` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Fuel & Transmission</span>
                  <span className="font-semibold text-slate-200">
                    {lead.fuel_preference || 'Petrol'} {lead.transmission_preference || 'Automatic'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Purchase Timeline</span>
                  <span className="font-semibold text-amber-300">{lead.purchase_timeline || 'Immediate'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Test Drive Status</span>
                  <span className="font-semibold text-purple-300 capitalize">{lead.test_drive_status || 'Requested'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Body Type</span>
                  <span className="font-semibold text-slate-200">{lead.body_type_preference || 'SUV'}</span>
                </div>
              </div>
            </div>

            {/* AI Lead Score & Reasons Card */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white border-b border-slate-700/80 pb-3 mb-4 flex items-center justify-between">
                AI Lead Qualification Score
                <Gauge className="w-4 h-4 text-cyan-400" />
              </h3>

              <div className="flex items-center gap-4 mb-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${
                    isHot
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : isWarm
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-slate-700/50 border-slate-600 text-slate-400'
                  }`}
                >
                  {scoreVal}
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Overall Score</div>
                  <div className="text-base font-extrabold text-white flex items-center gap-2">
                    {lead.classification || (isHot ? 'HOT LEAD' : isWarm ? 'WARM LEAD' : 'LOW LEAD')}
                  </div>
                  <div className="text-[11px] text-slate-400">Based on 7 weighted conversion criteria</div>
                </div>
              </div>

              {/* Reasons list */}
              {lead.reasons && lead.reasons.length > 0 ? (
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Score Breakdown Reasons</span>
                  <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
                    {lead.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded-lg border border-slate-700/40">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Showroom Information Card */}
            {showroom && (
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white border-b border-slate-700/80 pb-3 mb-4 flex items-center justify-between">
                  Assigned Showroom
                  <MapPin className="w-4 h-4 text-hyundai-blue-light" />
                </h3>
                <div className="text-sm flex flex-col gap-2">
                  <div className="font-bold text-white text-base">{showroom.name}</div>
                  <div className="text-slate-400 text-xs">{showroom.address}</div>
                  <div className="text-slate-300 text-xs flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-slate-500" /> {showroom.phone}
                  </div>
                </div>
              </div>
            )}

            {/* Private Executive Notes */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white border-b border-slate-700/80 pb-3 mb-4 flex items-center justify-between">
                Executive Private Notes
                <FileText className="w-4 h-4 text-slate-400" />
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type internal notes, customer comments, test drive logs..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-hyundai-blue-light outline-none transition-shadow min-h-[100px] mb-3"
              />
              <button
                onClick={() => showToast('Executive notes saved successfully!')}
                className="w-full bg-hyundai-blue hover:bg-blue-900 text-white font-semibold py-2 rounded-xl text-xs transition-colors"
              >
                Save Notes
              </button>
            </div>

          </div>

          {/* Right Column (AI Summary, Negotiation History, Transcript) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* AI Summary Card */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white border-b border-slate-700/80 pb-3 mb-4 flex items-center justify-between">
                AI Executive Summary
                <Award className="w-4 h-4 text-hyundai-blue-light" />
              </h3>
              <p className="text-slate-200 text-sm leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                {lead.ai_summary || 'Customer interacted with AI Sales Executive. Qualified high intent for Hyundai vehicles.'}
              </p>
            </div>

            {/* Negotiation History Card */}
            {lead.negotiation_history && lead.negotiation_history.length > 0 && (
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white border-b border-slate-700/80 pb-3 mb-4 flex items-center justify-between">
                  Automated Negotiation History
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-3">Round</th>
                        <th className="p-3">Customer Offer</th>
                        <th className="p-3">AI Counter Offer</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Notes & Accessories</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40">
                      {lead.negotiation_history.map((neg) => (
                        <tr key={neg.id} className="hover:bg-slate-700/30">
                          <td className="p-3 font-bold text-white">Round {neg.round_number}</td>
                          <td className="p-3 font-semibold text-slate-200">
                            {neg.customer_offer ? `₹${neg.customer_offer.toFixed(2)} Lakhs` : 'N/A'}
                          </td>
                          <td className="p-3 font-bold text-emerald-400">
                            {neg.ai_counter ? `₹${neg.ai_counter.toFixed(2)} Lakhs` : 'N/A'}
                          </td>
                          <td className="p-3">
                            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold uppercase text-[10px]">
                              {neg.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">{neg.notes || 'Automated discount applied.'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Conversation Transcript Panel */}
            <div id="transcript-section" className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-xl flex flex-col h-[650px] overflow-hidden">
              <div className="p-5 border-b border-slate-700/80 bg-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-hyundai-blue-light" /> AI Conversation Transcript
                </h3>
                <span className="text-xs text-slate-400">{messages.length} messages logged</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-900/70 space-y-4">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <TranscriptMessage key={msg.id} message={msg} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                    <p>No conversation transcript available for this session.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Assign Executive Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Assign Sales Executive</h3>
            <p className="text-xs text-slate-400 mb-4">Select showroom executive responsible for following up on this lead:</p>
            
            <div className="flex flex-col gap-2 mb-6">
              {['Rajesh Kumar', 'Priya Sharma', 'Amit Singh', 'Vikramaditya'].map((exec) => (
                <button
                  key={exec}
                  onClick={() => handleAssignExecutive(exec)}
                  className={`p-3 rounded-xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${
                    selectedExec === exec
                      ? 'bg-hyundai-blue border-hyundai-blue-light text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span>{exec}</span>
                  {selectedExec === exec && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Schedule Customer Follow-up</h3>
            <p className="text-xs text-slate-400 mb-4">Set a scheduled date and notes for executive callback:</p>
            
            <form onSubmit={handleScheduleFollowUp} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Follow-up Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-hyundai-blue-light"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Callback Objective / Agenda</label>
                <textarea
                  required
                  placeholder="e.g., Confirm 3:00 PM test drive appointment and present final pricing quotation."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-hyundai-blue-light min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-hyundai-blue hover:bg-blue-900 text-white rounded-xl text-xs font-semibold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};