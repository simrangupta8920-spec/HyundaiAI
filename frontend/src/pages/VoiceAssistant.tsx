import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Send, AlertTriangle, Mic, MicOff,
  Car as CarIcon, MapPin, Wifi, WifiOff, Loader2, X, CheckCircle,
} from 'lucide-react';
import { useConversation } from '../hooks/useConversation';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { TranscriptMessage } from '../components/TranscriptMessage';
import { CarCard } from '../components/CarCard';
import { createLead } from '../services/api';
import { useAgoraVoice } from '../services/agora/useAgoraVoice';

export const VoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeShowroomId =
    searchParams.get('showroom_id') ||
    sessionStorage.getItem('showroom_id') ||
    'HYD-DEL-001';

  const {
    session, messages, isLoading, recommendedCars,
    shouldCollectLead, shouldEscalate,
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

  const showLeadModal = shouldCollectLead && !isLeadFormDismissed;

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isLoading, voiceState.speakingState, isConnected, messages]);

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
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

        {/* Left Panel: Voice Control & Input */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 bg-white border-r relative shrink-0">
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
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

            {/* Text input */}
            <div className="w-full mt-12">
              <form onSubmit={handleSendText} className="relative">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type your message here..."
                  className="w-full bg-gray-100 border-none rounded-xl py-4 pl-5 pr-14 focus:ring-2 focus:ring-hyundai-blue outline-none transition-shadow"
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

            <button onClick={handleEndSession} className="mt-8 text-sm text-gray-500 hover:text-gray-900 underline">
              End Session & View Summary
            </button>
          </div>
        </div>

        {/* Right Panel: Chat & Recommendations tabs */}
        <div className="w-full lg:w-1/2 flex flex-col h-[50vh] lg:h-full bg-gray-50 shrink-0">
          <div className="flex border-b bg-white px-2 pt-2">
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

          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6 relative">
            {activeTab === 'chat' && (
              <div className="flex flex-col gap-2">
                {messages.map((msg) => (
                  <TranscriptMessage key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex gap-1 items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {activeTab === 'cars' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedCars.length > 0 ? (
                  recommendedCars.map((car) => (
                    <CarCard key={car.id} car={car} isRecommended />
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                    <CarIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p>No recommendations yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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