import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ExternalLink, Loader2, User, Phone, MapPin, Sparkles } from 'lucide-react';
import { ScoreCard } from '../components/ScoreCard';
import { CarCard } from '../components/CarCard';
import { getConversation, getScore, getCars } from '../services/api';
import { MOCK_SCORE, MOCK_CARS } from '../services/mockData';
import { useAuth } from '../hooks/useAuth';
import { Score, Car } from '../types';

export const ConversationSummary: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [score, setScore] = useState<Score>(MOCK_SCORE);
  const [cars, setCars] = useState<Car[]>(MOCK_CARS.slice(0, 2));

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      if (!sessionId || sessionId.startsWith('mock')) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getConversation(sessionId);
        if (isMounted && data) {
          setSummaryData(data);
        }
        
        const fetchedScore = await getScore(sessionId);
        if (isMounted && fetchedScore) {
          setScore(fetchedScore);
        }

        const allCars = await getCars();
        if (isMounted && allCars && allCars.length > 0) {
          setCars(allCars.slice(0, 2));
        }
      } catch (err) {
        console.warn('Backend summary lookup failed, rendering with fallback data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSummary();
    return () => { isMounted = false; };
  }, [sessionId]);

  const customerState = summaryData?.customer_profile || {};
  const lead = summaryData?.lead;
  const escalation = summaryData?.escalation;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">Session Summary</h1>
              {escalation && (
                <span className="bg-red-100 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Escalated
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              Session ID: <code className="bg-gray-200 px-1.5 py-0.5 rounded font-mono text-xs text-gray-800">{sessionId || 'mock-session-123'}</code> • {new Date().toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/assistant')} className="btn-secondary whitespace-nowrap">Start New Session</button>
            {isAuthenticated && (
              <button onClick={() => navigate('/crm/dashboard')} className="flex items-center gap-2 btn-primary bg-gray-900 hover:bg-black whitespace-nowrap">
                CRM Dashboard <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-hyundai-blue" />
            <span>Fetching session analysis...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Customer Profile & Requirements */}
              <div className="card">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <CheckCircle className="w-5 h-5 text-emerald-500" /> Extracted Customer Profile
                </h3>
                
                {lead && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex flex-wrap gap-4 text-xs text-blue-900">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> <strong>{lead.name}</strong></span>
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.phone}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Showroom: {lead.showroom_id}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Preferred Model</span>
                    <p className="font-bold text-gray-900 mt-1">{customerState.preferred_model || 'Creta'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Budget Range</span>
                    <p className="font-bold text-gray-900 mt-1">
                      {customerState.budget_max ? `Up to ₹${customerState.budget_max}L` : '12 - 18 Lakhs'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Fuel & Transmission</span>
                    <p className="font-bold text-gray-900 mt-1">
                      {customerState.fuel || 'Petrol'} / {customerState.transmission || 'Manual'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Timeline & Intent</span>
                    <p className="font-bold text-gray-900 mt-1">
                      {customerState.purchase_timeline || 'Within 30 days'}
                    </p>
                  </div>
                </div>

                {/* AI Summary Notes */}
                {lead?.notes && (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block mb-0.5">AI Executive Summary:</strong>
                      {lead.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommended Cars */}
              <div className="card">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Recommended Hyundai Vehicles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cars.map(car => (
                    <CarCard key={car.id} car={car} isRecommended />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Lead Score & Escalation */}
            <div className="flex flex-col gap-6">
              <ScoreCard score={score} />
              
              <div className="card bg-hyundai-blue text-white">
                <h3 className="text-lg font-bold mb-2">Showroom Actions</h3>
                <p className="text-sm text-gray-300 mb-6">
                  {escalation ? 'Human escalation has been logged in the CRM queue.' : 'Customer requirements logged and assigned to executive.'}
                </p>
                <button 
                  onClick={() => navigate('/crm/dashboard')} 
                  className="w-full bg-white text-hyundai-blue py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  Open CRM Lead Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
