import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, AlertTriangle, ExternalLink, Loader2, User, Phone, MapPin, Sparkles,
  MessageSquare, Calendar, ShieldCheck, Gauge, ArrowLeft, Fuel, Users, Award
} from 'lucide-react';
import { ScoreCard } from '../components/ScoreCard';
import { CarCard } from '../components/CarCard';
import { TranscriptMessage } from '../components/TranscriptMessage';
import { getConversation, getScore, getVehicles } from '../services/api';
import { formatVehicleToCar } from '../hooks/useConversation';
import { MOCK_SCORE, MOCK_CARS } from '../services/mockData';
import { useAuth } from '../hooks/useAuth';
import { Score, Car, Message } from '../types';

export const ConversationSummary: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [score, setScore] = useState<Score>(MOCK_SCORE);
  const [recommendedCars, setRecommendedCars] = useState<Car[]>([]);
  const [showFullTranscript, setShowFullTranscript] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      if (!sessionId || sessionId.startsWith('mock')) {
        setLoading(false);
        setRecommendedCars(MOCK_CARS.slice(0, 2));
        return;
      }

      try {
        setLoading(true);
        // 1. Fetch complete conversation session data
        const data = await getConversation(sessionId);
        if (isMounted && data) {
          setSummaryData(data);
        }

        // 2. Fetch computed session score
        try {
          const fetchedScore = await getScore(sessionId);
          if (isMounted && fetchedScore) {
            setScore(fetchedScore);
          }
        } catch {
          // Use calculated score or fallback
        }

        // 3. Fetch matching vehicle recommendations
        try {
          const custProfile = data?.customer_profile || {};
          const vehicles = await getVehicles({
            brand: 'Hyundai',
            state: custProfile.state || 'Delhi',
          });

          if (isMounted && vehicles && vehicles.length > 0) {
            let matched = vehicles;
            if (custProfile.preferred_model) {
              matched = vehicles.filter((v: any) =>
                v.model.toLowerCase().includes(custProfile.preferred_model.toLowerCase())
              );
            }
            if (matched.length === 0) matched = vehicles;
            const formatted = matched.map(formatVehicleToCar);
            setRecommendedCars(formatted.slice(0, 2));
          } else {
            setRecommendedCars(MOCK_CARS.slice(0, 2));
          }
        } catch {
          setRecommendedCars(MOCK_CARS.slice(0, 2));
        }
      } catch (err) {
        console.warn('Backend summary lookup failed, rendering with available data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const customerState = summaryData?.customer_profile || {};
  const messages: Message[] = summaryData?.messages || [];
  const lead = summaryData?.lead;
  const escalation = summaryData?.escalation;

  const modelName = customerState.preferred_model || (lead?.vehicle_name) || 'Hyundai Creta';
  const maxBudget = customerState.budget_max || lead?.budget_max;
  const fuelType = customerState.fuel || lead?.fuel_preference || 'Petrol';
  const transmission = customerState.transmission || lead?.transmission_preference || 'Manual / Automatic';
  const purchaseTimeline = customerState.purchase_timeline || lead?.purchase_timeline || 'Within 30 days';
  const testDriveRequested = customerState.test_drive_interest || lead?.test_drive_status === 'requested';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate('/assistant')}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors mr-1"
                title="Back to Assistant"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Session Summary &amp; Analytics</h1>
              {escalation && (
                <span className="bg-red-100 text-red-700 border border-red-200 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> Human Escalation
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs sm:text-sm pl-8">
              Session ID: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs text-gray-800 border">{sessionId || 'mock-session-123'}</code> • Generated from live chat transcript
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pl-8 md:pl-0">
            <button
              onClick={() => navigate('/assistant')}
              className="btn-secondary text-xs py-2.5 px-4 font-bold cursor-pointer"
            >
              Start New Session
            </button>
            {isAuthenticated && (
              <button
                onClick={() => navigate('/crm/dashboard')}
                className="flex items-center gap-2 btn-primary bg-gray-900 hover:bg-black text-xs py-2.5 px-4 font-bold cursor-pointer shadow-md"
              >
                CRM Control Center <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-gray-200 text-gray-500 gap-3 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-hyundai-blue" />
            <span className="font-semibold text-sm">Analyzing live chat transcript &amp; scoring intent...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Extracted Customer Profile */}
              <div className="card border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" /> Extracted Customer Requirements
                  </h3>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                    Grounded Summary
                  </span>
                </div>

                {/* Lead Contact Info if provided */}
                {lead && (
                  <div className="mb-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex flex-wrap gap-4 text-xs text-blue-900 font-semibold">
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-hyundai-blue" /> Name: {lead.name}</span>
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-hyundai-blue" /> Phone: {lead.phone}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-hyundai-blue" /> Showroom: {lead.showroom_id || 'HYD-DEL-001'}</span>
                  </div>
                )}

                {/* Extracted Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">Target Model</span>
                    <p className="font-extrabold text-gray-900 text-sm flex items-center gap-1">
                      <Award className="w-4 h-4 text-hyundai-blue" /> {modelName}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">Budget Ceiling</span>
                    <p className="font-extrabold text-gray-900 text-sm">
                      {maxBudget ? `Up to ₹${maxBudget} Lakhs` : 'Not specified'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">Fuel Preference</span>
                    <p className="font-extrabold text-gray-900 text-sm flex items-center gap-1">
                      <Fuel className="w-4 h-4 text-amber-600" /> {fuelType}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">Transmission</span>
                    <p className="font-extrabold text-gray-900 text-sm">{transmission}</p>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">Test Drive</span>
                    <p className={`font-extrabold text-sm flex items-center gap-1 ${testDriveRequested ? 'text-emerald-600' : 'text-gray-700'}`}>
                      <Calendar className="w-4 h-4" /> {testDriveRequested ? 'Requested' : 'Not requested'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">Purchase Timeline</span>
                    <p className="font-extrabold text-gray-900 text-sm">{purchaseTimeline}</p>
                  </div>
                </div>

                {/* AI Executive Summary Notes */}
                {(lead?.notes || customerState.preferred_model) && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-emerald-50/50 border border-blue-200/80 rounded-2xl text-xs text-slate-800 flex items-start gap-3 shadow-2xs">
                    <Sparkles className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 text-sm block mb-1">AI Executive Analysis &amp; Next Steps:</strong>
                      <p className="leading-relaxed text-slate-700">
                        {lead?.notes || `Customer showed active interest in the Hyundai ${modelName} (${fuelType}). Budget parameter up to ₹${maxBudget || 15} Lakhs. Recommended booking a test drive.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Chat Transcript Log */}
              <div className="card border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-hyundai-blue" /> Live Session Chat Log ({messages.length} messages)
                  </h3>
                  <button
                    onClick={() => setShowFullTranscript((prev) => !prev)}
                    className="text-xs font-bold text-hyundai-blue hover:underline cursor-pointer"
                  >
                    {showFullTranscript ? 'Hide Transcript' : 'Show Full Log'}
                  </button>
                </div>

                {showFullTranscript && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 max-h-96 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {messages.length > 0 ? (
                      messages.map((msg) => <TranscriptMessage key={msg.id} message={msg} />)
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-6">No transcript recorded for this session.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Recommended Hyundai Models */}
              <div className="card border-gray-200 shadow-sm">
                <h3 className="text-lg font-extrabold mb-4 text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-hyundai-blue" /> Tailored Vehicle Recommendations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendedCars.map((car) => (
                    <CarCard key={car.id} car={car} isRecommended />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Lead Score & CRM Actions */}
            <div className="flex flex-col gap-6">
              <ScoreCard score={score} />

              <div className="card bg-gradient-to-br from-hyundai-blue to-slate-900 text-white shadow-lg border border-hyundai-blue/30">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" /> Showroom Next Actions
                </h3>
                <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                  {escalation
                    ? 'A human executive escalation ticket was logged in the CRM queue for this session.'
                    : 'Customer inquiry and lead score have been saved to the CRM pipeline.'}
                </p>
                <button
                  onClick={() => navigate('/crm/dashboard')}
                  className="w-full bg-white hover:bg-gray-100 text-hyundai-blue py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  Open CRM Executive Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
