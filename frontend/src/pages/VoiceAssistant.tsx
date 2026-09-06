import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Send, AlertTriangle, Mic, MicOff,
  Car as CarIcon, MapPin, Wifi, WifiOff, Loader2, X, CheckCircle, Activity, ChevronDown, ChevronUp,
  Sparkles, Filter, SlidersHorizontal, Layers, Zap, Award, HelpCircle, CheckCircle2, User, Phone, Mail, FileText,
} from 'lucide-react';
import { useConversation } from '../hooks/useConversation';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { TranscriptMessage } from '../components/TranscriptMessage';
import { CarCard } from '../components/CarCard';
import { createLead, compareVehicles } from '../services/api';
import { useAgoraVoice } from '../services/agora/useAgoraVoice';
import { Car } from '../types';


export const VoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeShowroomId =
    searchParams.get('showroom_id') ||
    sessionStorage.getItem('showroom_id') ||
    'HYD-DEL-001';

  const {
    session, messages, isLoading, recommendedCars,
    shouldCollectLead, shouldEscalate, customerState,
    startSession, sendMessage, endSession,
  } = useConversation();

  // ── Agora voice hook (real or mock depending on MOCK_VOICE env) ──────────────
  const { voiceState, joinChannel, leaveChannel, toggleMute } = useAgoraVoice(
    activeShowroomId,
    session || '',
  );

  const isConnected = voiceState.connectionState === 'connected';
  const isConnecting = voiceState.connectionState === 'connecting';
  const hasVoiceError = voiceState.connectionState === 'error';

  const [textInput, setTextInput] = useState('');
  const [waveformState, setWaveformState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'cars'>('chat');

  // Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSaved, setLeadSaved] = useState(false);
  const [isLeadFormDismissed, setIsLeadFormDismissed] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const showLeadModal = shouldCollectLead && !isLeadFormDismissed;


  // Filter state for Recommendations tab
  const [filterBodyType, setFilterBodyType] = useState<string>('all');
  const [filterFuelType, setFilterFuelType] = useState<string>('all');
  const [filterMaxBudget, setFilterMaxBudget] = useState<number>(50);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high'>('recommended');

  // Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState<Car[]>([]);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [compareData, setCompareData] = useState<any>(null);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);

  const quickPrompts = [
    { label: '🚗 Best SUV under ₹15L', text: 'Recommend the best Hyundai SUV under 15 Lakhs for family use.' },
    { label: '⚡ EV Options & Range', text: 'What electric vehicle options does Hyundai have and what is their range?' },
    { label: '📊 Creta vs Nexon', text: 'Compare the Hyundai Creta with Tata Nexon on safety, pricing, and features.' },
    { label: '💰 EMI & Finance', text: 'What are the EMI options and finance offers for a 12 Lakh car?' },
    { label: '🗓️ Book Test Drive', text: 'I would like to schedule a test drive at the showroom.' },
  ];

  const handleToggleCompare = (car: Car) => {
    setSelectedForCompare((prev) => {
      const exists = prev.some((c) => c.model_name === car.model_name || c.id === car.id);
      if (exists) {
        return prev.filter((c) => c.model_name !== car.model_name && c.id !== car.id);
      } else {
        if (prev.length >= 3) {
          alert('You can compare up to 3 cars at a time.');
          return prev;
        }
        return [...prev, car];
      }
    });
  };

  const handleRunComparison = async () => {
    if (selectedForCompare.length < 2) {
      alert('Please select at least 2 cars to compare.');
      return;
    }
    setShowCompareModal(true);
    setLoadingCompare(true);
    try {
      const ids = selectedForCompare.map((c) => {
        const slug = c.model_name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        return `hyundai_${slug}_delhi`;
      });
      const data = await compareVehicles(ids);
      setCompareData(data);
    } catch {
      setCompareData(null);
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleAskAIAboutCar = (carModel: string) => {
    setActiveTab('chat');
    sendMessage(`Tell me more about the Hyundai ${carModel} features, on-road price in Delhi, and available variants.`);
  };

  const handleBookDriveForCar = (carModel: string) => {
    setIsLeadFormDismissed(false);
    setLeadSaved(false);
  };


  // ── Start text session on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!session) {
      startSession(activeShowroomId);
    }
  }, [session, startSession, activeShowroomId]);

  // ── Sync waveform with speaking / loading state ──────────────────────────────
  useEffect(() => {
    if (isLoading) {
      setWaveformState('speaking');
    } else if (voiceState.speakingState === 'user_speaking') {
      setWaveformState('listening');
    } else if (isConnected) {
      setWaveformState('listening');
    } else {
      setWaveformState('idle');
    }
  }, [isLoading, voiceState.speakingState, isConnected]);

  // ── Auto-scroll chat transcript to bottom ──────────────────────────────────
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom(true);
    }
  }, [messages, isLoading, activeTab]);


  // ── Auto-switch to cars tab when recommendations arrive ──────────────────────
  useEffect(() => {
    if (recommendedCars.length > 0) {
      setActiveTab('cars');
    }
  }, [recommendedCars]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isLoading) {
      sendMessage(textInput.trim());
      setTextInput('');
    }
  };

  const handleMicClick = async () => {
    if (isConnected) {
      toggleMute();
    } else if (!isConnecting) {
      await joinChannel();
    }
  };

  const handleEndSession = async () => {
    await leaveChannel();
    await endSession();
    navigate(`/summary/${session || 'mock'}`);
  };

  // ── Connection status badge helper ───────────────────────────────────────────
  const ConnectionBadge = () => {
    if (isConnecting) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Connecting
        </span>
      );
    }
    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
          <Wifi className="w-3 h-3" />
          {voiceState.isMockMode ? 'Connected (Demo)' : 'Connected'}
        </span>
      );
    }
    if (hasVoiceError) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
          <WifiOff className="w-3 h-3" />
          Error
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden relative">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2 flex-wrap">
              AI Sales Executive
              <span className="text-xs font-normal bg-blue-100 text-hyundai-blue border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {activeShowroomId}
              </span>
              <ConnectionBadge />
            </h1>
            <span className="text-xs text-gray-500">Session: {session?.slice(0, 8) || 'Starting...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Demo Scenario Dropdown / Buttons */}
          <div className="hidden md:flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs">
            <span className="text-gray-500 font-semibold px-2">Demo:</span>
            <button
              onClick={() => sendMessage("Hi, I want a Petrol Creta for my family under 18 Lakhs. I want to buy in 30 days and take a test drive.")}
              className="bg-white hover:bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded border shadow-sm"
              title="Inject High Intent message"
            >
              HOT Lead
            </button>
            <button
              onClick={() => sendMessage("I want a 25% cash discount on Creta SX Petrol right now or I buy Tata Harrier.")}
              className="bg-white hover:bg-red-50 text-red-700 font-semibold px-2 py-1 rounded border shadow-sm"
              title="Inject Excessive Discount request"
            >
              Escalation
            </button>
            <button
              onClick={() => sendMessage("Just browsing car options, no rush, maybe next year under 6 Lakhs.")}
              className="bg-white hover:bg-amber-50 text-amber-700 font-semibold px-2 py-1 rounded border shadow-sm"
              title="Inject Low Intent message"
            >
              LOW Lead
            </button>
          </div>

          <button
            onClick={() => alert('Escalation triggered. Connecting to human...')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Escalate to Human</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">

        {/* Left Panel: Voice Control & Input */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-between p-6 bg-white border-b lg:border-b-0 lg:border-r overflow-y-auto custom-scrollbar min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md py-4">
            <VoiceWaveform state={waveformState} />

            {/* Mic status label */}
            <p className="mt-4 text-sm text-gray-500 h-5">
              {isConnecting && 'Requesting microphone access...'}
              {isConnected && !voiceState.isMuted && 'Tap mic to mute'}
              {isConnected && voiceState.isMuted && 'Microphone muted'}
              {hasVoiceError && (voiceState.errorMessage || 'Voice connection failed')}
              {!isConnected && !isConnecting && !hasVoiceError && 'Tap mic to start voice'}
            </p>

            {/* Mic button */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleMicClick}
                disabled={isConnecting}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isConnecting
                    ? 'bg-yellow-400 text-white animate-pulse'
                    : voiceState.isMuted
                    ? 'bg-gray-400 text-white'
                    : isConnected
                    ? 'bg-green-500 text-white'
                    : 'bg-hyundai-blue text-white'
                }`}
                title={isConnected ? (voiceState.isMuted ? 'Unmute' : 'Mute') : 'Start voice'}
              >
                {isConnecting ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : voiceState.isMuted ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            {/* Quick Prompts Chips */}
            <div className="w-full mt-8 mb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2">Quick AI Prompts</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTextInput(p.text);
                      sendMessage(p.text);
                    }}
                    disabled={isLoading}
                    className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-hyundai-blue hover:border-blue-200 border border-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-full transition-all duration-200 shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            <div className="w-full mt-2">
              <form onSubmit={handleSendText} className="relative">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type your message here..."
                  className="w-full bg-gray-100 border-none rounded-xl py-4 pl-5 pr-14 focus:ring-2 focus:ring-hyundai-blue outline-none transition-shadow text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-hyundai-blue text-white rounded-lg disabled:opacity-50 hover:bg-blue-900 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            <button onClick={handleEndSession} className="mt-6 text-sm text-gray-500 hover:text-gray-900 underline">
              End Session &amp; View Summary
            </button>

            {/* ── Debug / Status Panel ─────────────────────────────────────── */}
            <div className="mt-6 w-full max-w-md">
              <button
                onClick={() => setShowDebug((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mx-auto transition-colors"
              >
                <Activity className="w-3.5 h-3.5" />
                Voice Diagnostics
                {showDebug ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDebug && (
                <div className="mt-3 bg-gray-900 text-gray-300 rounded-xl p-4 text-xs font-mono space-y-1.5 text-left shadow-lg">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Agora Voice Diagnostics</p>

                  {/* RTC Status */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">RTC Status</span>
                    <span className={
                      voiceState.connectionState === 'connected' ? 'text-green-400' :
                      voiceState.connectionState === 'connecting' ? 'text-yellow-400' :
                      voiceState.connectionState === 'error' ? 'text-red-400' : 'text-gray-500'
                    }>{voiceState.connectionState.toUpperCase()}</span>
                  </div>

                  {/* Microphone */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Microphone</span>
                    <span className={
                      voiceState.micStatus === 'active' ? 'text-green-400' :
                      voiceState.micStatus === 'muted' ? 'text-yellow-400' :
                      voiceState.micStatus === 'permission_denied' ? 'text-red-400' : 'text-gray-500'
                    }>{voiceState.micStatus.toUpperCase()}</span>
                  </div>

                  {/* AI Agent */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">AI Agent</span>
                    <span className={
                      voiceState.agentStatus === 'active' ? 'text-green-400' :
                      voiceState.agentStatus === 'starting' ? 'text-yellow-400' :
                      voiceState.agentStatus === 'error' ? 'text-red-400' :
                      voiceState.agentStatus === 'not_configured' ? 'text-orange-400' :
                      voiceState.agentStatus === 'stopped' ? 'text-gray-500' : 'text-gray-600'
                    }>{voiceState.agentStatus.toUpperCase().replace('_', ' ')}</span>
                  </div>

                  {/* AI Audio */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">AI Audio</span>
                    <span className={voiceState.speakingState === 'ai_speaking' ? 'text-green-400 animate-pulse' : 'text-gray-600'}>
                      {voiceState.speakingState === 'ai_speaking' ? 'SPEAKING ▶' : voiceState.speakingState.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  {/* Remote participants */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Remote Participants</span>
                    <span className={voiceState.remoteParticipants > 0 ? 'text-green-400' : 'text-gray-600'}>
                      {voiceState.remoteParticipants}
                    </span>
                  </div>

                  {/* Channel */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Channel</span>
                    <span className="text-blue-400 truncate max-w-[160px]" title={voiceState.channelName || '—'}>
                      {voiceState.channelName || '—'}
                    </span>
                  </div>

                  {/* Agent ID */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Agent ID</span>
                    <span className="text-purple-400 truncate max-w-[160px]" title={voiceState.agentId || '—'}>
                      {voiceState.agentId ? voiceState.agentId.slice(0, 16) + '…' : '—'}
                    </span>
                  </div>

                  {/* Mode */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mode</span>
                    <span className={voiceState.isMockMode ? 'text-orange-400' : 'text-cyan-400'}>
                      {voiceState.isMockMode ? 'DEMO / MOCK' : 'LIVE AGORA'}
                    </span>
                  </div>

                  {/* Error */}
                  {voiceState.errorMessage && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <p className="text-red-400 text-[10px] break-words">{voiceState.errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Chat & Recommendations tabs */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-gray-50 h-[500px] lg:h-auto flex-1">
          <div className="flex border-b bg-white px-2 pt-2 shrink-0 justify-between items-center pr-4">
            <div className="flex">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'chat' ? 'border-hyundai-blue text-hyundai-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Conversation
              </button>
              <button
                onClick={() => setActiveTab('cars')}
                className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cars' ? 'border-hyundai-blue text-hyundai-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Recommendations
                {recommendedCars.length > 0 && (
                  <span className="bg-hyundai-blue text-white text-xs px-1.5 py-0.5 rounded-full">{recommendedCars.length}</span>
                )}
              </button>
            </div>

            {/* Compare Badge Shortcut */}
            {selectedForCompare.length > 0 && (
              <button
                onClick={handleRunComparison}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer animate-pulse"
              >
                <Layers className="w-3.5 h-3.5" /> Compare ({selectedForCompare.length})
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-6 relative">
            {activeTab === 'chat' && (
              <div className="flex flex-col min-h-full">
                {/* Live Customer Knowledge Card */}
                {customerState && (customerState.budget_max || customerState.customer_name || customerState.car_type || customerState.fuel) && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 mb-4 text-xs text-slate-700 shadow-xs animate-in fade-in duration-300">
                    <div className="flex items-center justify-between font-bold text-hyundai-blue mb-1">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-600" /> Live AI Customer Profile
                      </span>
                      <span className="text-[10px] bg-blue-100 text-hyundai-blue px-2 py-0.5 rounded-full font-mono">Grounded Knowledge</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 mt-2">
                      {customerState.customer_name && <span className="bg-white px-2 py-0.5 rounded border border-blue-100 font-medium">👤 Name: {customerState.customer_name}</span>}
                      {customerState.budget_max && <span className="bg-white px-2 py-0.5 rounded border border-blue-100 font-medium">💰 Budget: ≤ ₹{customerState.budget_max}L</span>}
                      {customerState.car_type && <span className="bg-white px-2 py-0.5 rounded border border-blue-100 font-medium">🚗 Type: {customerState.car_type}</span>}
                      {customerState.fuel && <span className="bg-white px-2 py-0.5 rounded border border-blue-100 font-medium">⚡ Fuel: {customerState.fuel}</span>}
                      {customerState.family_size && <span className="bg-white px-2 py-0.5 rounded border border-blue-100 font-medium">👥 Seats: {customerState.family_size}</span>}
                    </div>
                  </div>
                )}

                <div className="flex-1" />
                {messages.map((msg) => (
                  <TranscriptMessage key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex gap-2 items-center shadow-sm">
                      <span className="text-xs text-gray-400 font-medium">AI Sales Executive is replying</span>
                      <div className="w-1.5 h-1.5 bg-hyundai-blue rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-hyundai-blue rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-hyundai-blue rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-px" />
              </div>
            )}

            {activeTab === 'cars' && (
              <div className="flex flex-col gap-4">
                {/* Filter & Search Bar */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-hyundai-blue" /> Filter Models
                    </span>
                    {selectedForCompare.length > 0 && (
                      <button
                        onClick={handleRunComparison}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" /> Compare ({selectedForCompare.length}) →
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select
                      value={filterBodyType}
                      onChange={(e) => setFilterBodyType(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none"
                    >
                      <option value="all">Body: All</option>
                      <option value="SUV">SUV</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="Sedan">Sedan</option>
                      <option value="MPV">MPV</option>
                    </select>

                    <select
                      value={filterFuelType}
                      onChange={(e) => setFilterFuelType(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none"
                    >
                      <option value="all">Fuel: All</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="Electric">Electric / EV</option>
                    </select>

                    <select
                      value={filterMaxBudget}
                      onChange={(e) => setFilterMaxBudget(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none"
                    >
                      <option value={50}>Budget: All</option>
                      <option value={8}>Under ₹8 Lakhs</option>
                      <option value={15}>Under ₹15 Lakhs</option>
                      <option value={25}>Under ₹25 Lakhs</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none"
                    >
                      <option value="recommended">Sort: AI Match</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                    </select>
                  </div>
                </div>

                {/* Filtered Grid */}
                {recommendedCars
                  .filter((car) => {
                    if (filterBodyType !== 'all' && car.body_type.toLowerCase() !== filterBodyType.toLowerCase()) return false;
                    if (filterFuelType !== 'all' && !car.fuel_type.toLowerCase().includes(filterFuelType.toLowerCase())) return false;
                    if (filterMaxBudget < 50 && car.price_min > filterMaxBudget) return false;
                    return true;
                  })
                  .sort((a, b) => {
                    if (sortBy === 'price_low') return a.price_min - b.price_min;
                    if (sortBy === 'price_high') return b.price_min - a.price_min;
                    return 0;
                  }).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedCars
                      .filter((car) => {
                        if (filterBodyType !== 'all' && car.body_type.toLowerCase() !== filterBodyType.toLowerCase()) return false;
                        if (filterFuelType !== 'all' && !car.fuel_type.toLowerCase().includes(filterFuelType.toLowerCase())) return false;
                        if (filterMaxBudget < 50 && car.price_min > filterMaxBudget) return false;
                        return true;
                      })
                      .sort((a, b) => {
                        if (sortBy === 'price_low') return a.price_min - b.price_min;
                        if (sortBy === 'price_high') return b.price_min - a.price_min;
                        return 0;
                      })
                      .map((car) => (
                        <CarCard
                          key={car.id}
                          car={car}
                          isRecommended
                          isSelectedForCompare={selectedForCompare.some((c) => c.model_name === car.model_name || c.id === car.id)}
                          onToggleCompare={handleToggleCompare}
                          onAskAI={handleAskAIAboutCar}
                          onBookTestDrive={handleBookDriveForCar}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                    <CarIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-semibold">No models matched your filter criteria.</p>
                    <button
                      onClick={() => {
                        setFilterBodyType('all');
                        setFilterFuelType('all');
                        setFilterMaxBudget(50);
                      }}
                      className="mt-2 text-xs text-hyundai-blue underline font-bold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Comparison Modal ────────────────────────────── */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl relative border border-gray-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setShowCompareModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" /> Side-by-Side Vehicle Comparison
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Comparing {selectedForCompare.length} models across specs, ratings, and pricing.
            </p>

            {loadingCompare ? (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span>Generating comparison matrix from vehicle dataset...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="p-3 font-bold text-gray-700">Specification</th>
                      {selectedForCompare.map((c) => (
                        <th key={c.id} className="p-3 font-extrabold text-hyundai-blue text-sm">
                          {c.model_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-700">
                    <tr>
                      <td className="p-3 font-semibold text-gray-500">Body Type</td>
                      {selectedForCompare.map((c) => (
                        <td key={c.id} className="p-3 font-bold">{c.body_type}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-gray-500">Fuel Type</td>
                      {selectedForCompare.map((c) => (
                        <td key={c.id} className="p-3 font-bold">{c.fuel_type}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-gray-500">Transmission</td>
                      {selectedForCompare.map((c) => (
                        <td key={c.id} className="p-3 font-bold">{c.transmission}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-gray-500">Ex-Showroom Price</td>
                      {selectedForCompare.map((c) => (
                        <td key={c.id} className="p-3 font-extrabold text-gray-900">₹{c.price_min.toFixed(2)} Lakhs</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-gray-500">Est. On-Road Price</td>
                      {selectedForCompare.map((c) => (
                        <td key={c.id} className="p-3 font-extrabold text-hyundai-blue">₹{c.price_max.toFixed(2)} Lakhs</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-gray-500">Seating Capacity</td>
                      {selectedForCompare.map((c) => (
                        <td key={c.id} className="p-3 font-bold">{c.seating_capacity} Seats</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-gray-500">Features &amp; Highlights</td>
                      {selectedForCompare.map((c) => (
                        <td key={c.id} className="p-3 leading-relaxed">
                          {Array.isArray(c.features) ? c.features.join(" • ") : c.features}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowCompareModal(false)} className="btn-primary text-xs py-2.5 px-6">
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Escalation Modal */}
      {shouldEscalate && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Human Assistance Needed</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Our AI detected that you might need specialized assistance. A human executive has been notified and will be with you shortly.
            </p>
            <button onClick={() => handleEndSession()} className="btn-primary w-full">Got it</button>
          </div>
        </div>
      )}

      {/* Lead Collection Pop-out Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setIsLeadFormDismissed(true)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-blue-50 text-hyundai-blue rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CarIcon className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold mb-1 text-center text-gray-900">Save Your Preferences</h3>
            <p className="text-xs text-gray-500 text-center mb-6">
              Share your details so our Hyundai Sales Executive at {activeShowroomId} can prepare your quote.
            </p>

            {leadSaved ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center text-sm font-semibold flex flex-col items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-600 animate-bounce" />
                <span>Thank you! Your requirements have been saved for {activeShowroomId}.</span>
                <span className="text-xs text-emerald-600 font-normal">Closing window...</span>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (session) {
                      await createLead({
                        session_id: session,
                        showroom_id: activeShowroomId,
                        name: leadName,
                        phone: leadPhone,
                        email: leadEmail || undefined,
                      });
                    }
                    setLeadSaved(true);
                    setTimeout(() => {
                      setIsLeadFormDismissed(true);
                    }, 1500);
                  } catch {
                    console.warn('Backend unavailable, mock lead saved');
                    setLeadSaved(true);
                    setTimeout(() => {
                      setIsLeadFormDismissed(true);
                    }, 1500);
                  }
                }}
                className="flex flex-col gap-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={leadName}
                    onChange={e => setLeadName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-hyundai-blue focus:bg-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={leadPhone}
                    onChange={e => setLeadPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-hyundai-blue focus:bg-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={leadEmail}
                    onChange={e => setLeadEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-hyundai-blue focus:bg-white outline-none transition-all"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsLeadFormDismissed(true)}
                    className="w-1/3 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                  >
                    Skip
                  </button>
                  <button type="submit" className="w-2/3 btn-primary text-sm">
                    Save Details
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};