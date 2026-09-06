import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Car, MapPin, Mic, Phone, QrCode, User } from 'lucide-react';
import { getShowroomById, runDemoScenario } from '../services/api';
import { MOCK_SHOWROOM, MOCK_SHOWROOMS } from '../services/mockData';
import { Showroom } from '../types';

export const CustomerLanding: React.FC = () => {
  const navigate = useNavigate();
  const { showroomCode } = useParams<{ showroomCode?: string }>();
  const [searchParams] = useSearchParams();

  const activeCode = showroomCode || searchParams.get('showroom_id') || sessionStorage.getItem('showroom_id') || 'HYD-DEL-001';

  const [showroom, setShowroom] = useState<Showroom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchShowroom = async () => {
      try {
        setLoading(true);
        const data = await getShowroomById(activeCode);
        if (isMounted && data) {
          setShowroom(data);
          sessionStorage.setItem('showroom_id', data.id);
        }
      } catch (err) {
        console.warn('Backend lookup failed, using mock showroom');
        if (isMounted) {
          const match = MOCK_SHOWROOMS.find(s => s.id === activeCode) || MOCK_SHOWROOM;
          setShowroom(match);
          sessionStorage.setItem('showroom_id', match.id);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchShowroom();
    return () => {
      isMounted = false;
    };
  }, [activeCode]);

  const handleStartConversation = () => {
    if (showroom) {
      sessionStorage.setItem('showroom_id', showroom.id);
      navigate(`/assistant?showroom_id=${showroom.id}`);
    } else {
      navigate('/assistant');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hyundai-blue via-slate-900 to-black text-white flex flex-col relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-40 -left-40 w-72 h-72 bg-hyundai-blue-light rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center z-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-hyundai-blue font-bold text-xl shadow-lg">H</div>
          <div>
            <h1 className="font-extrabold text-xl tracking-widest uppercase">Hyundai</h1>
            <p className="text-xs text-blue-200">Authorized Showroom</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/qr-generator')}
            className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-cyan-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Generator (Dev)</span>
          </button>
          <button onClick={() => navigate('/crm/login')} className="text-sm text-gray-300 hover:text-white transition-colors">
            Staff Login
          </button>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-900/60 border border-blue-400/30 px-4 py-1.5 rounded-full text-xs text-blue-200 mb-6 backdrop-blur-md">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Showroom Code: <strong className="text-white">{showroom?.id || activeCode}</strong></span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold mb-3 tracking-tight">
          Welcome to Hyundai
        </h1>

        <h2 className="text-2xl md:text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-white">
          Talk to our AI Sales Executive
        </h2>

        {/* Resolved Showroom Information Card */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 mb-8 text-left shadow-2xl">
          {loading ? (
            <div className="py-4 text-center text-gray-300 animate-pulse">
              Resolving showroom details...
            </div>
          ) : showroom ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {showroom.name}
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Active Showroom
                  </span>
                </h3>
                <p className="text-sm text-blue-100 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  {showroom.address}, {showroom.city}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-300">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Lead Exec: <strong className="text-white">{showroom.sales_executive}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" /> {showroom.phone}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-amber-300">
              Showroom details initialized.
            </div>
          )}
        </div>

        <p className="text-base md:text-lg text-gray-300 mb-8 max-w-xl">
          Scan the showroom QR code, ask questions about models, explore pricing, and get expert recommendations instantly.
        </p>

        {/* Start Conversation CTA Button */}
        <button
          onClick={handleStartConversation}
          className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-lg text-white bg-gradient-to-r from-hyundai-blue-light to-blue-600 rounded-full shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 active:scale-95 border border-cyan-300/30 mb-10"
        >
          <Mic className="w-6 h-6 mr-3 text-cyan-200 group-hover:scale-110 transition-transform" />
          <span>Start Conversation</span>
          <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Interactive E2E Demo Mode Presets */}
        <div className="w-full bg-white/5 backdrop-blur-lg border border-cyan-500/20 rounded-2xl p-6 text-left shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
              ⚡ Instant E2E Demo Scenarios
            </h3>
            <span className="text-xs bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 px-2 py-0.5 rounded-full">
              Automated Simulation Mode
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await runDemoScenario('scenario_1', showroom?.id || activeCode);
                  navigate(`/summary/${res.session_id}`);
                } catch {
                  navigate('/summary/mock-scenario-1');
                } finally {
                  setLoading(false);
                }
              }}
              className="p-3 bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 rounded-xl text-left transition-all hover:scale-105"
            >
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Scenario 1</div>
              <div className="font-bold text-sm text-white">High-Intent → HOT Lead</div>
              <div className="text-xs text-gray-300 mt-1">Creta 18L, 30d timeline, test drive & EMI request.</div>
            </button>

            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await runDemoScenario('scenario_2', showroom?.id || activeCode);
                  navigate(`/summary/${res.session_id}`);
                } catch {
                  navigate('/summary/mock-scenario-2');
                } finally {
                  setLoading(false);
                }
              }}
              className="p-3 bg-gradient-to-br from-red-950/80 to-slate-900 border border-red-500/30 hover:border-red-400 rounded-xl text-left transition-all hover:scale-105"
            >
              <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Scenario 2</div>
              <div className="font-bold text-sm text-white">Excess Discount → Escalation</div>
              <div className="text-xs text-gray-300 mt-1">Demands 25% cash discount exceeding AI limit.</div>
            </button>

            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await runDemoScenario('scenario_3', showroom?.id || activeCode);
                  navigate(`/summary/${res.session_id}`);
                } catch {
                  navigate('/summary/mock-scenario-3');
                } finally {
                  setLoading(false);
                }
              }}
              className="p-3 bg-gradient-to-br from-amber-950/80 to-slate-900 border border-amber-500/30 hover:border-amber-400 rounded-xl text-left transition-all hover:scale-105"
            >
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Scenario 3</div>
              <div className="font-bold text-sm text-white">Low-Intent → LOW Lead</div>
              <div className="text-xs text-gray-300 mt-1">Casual visitor, vague budget & long timeline.</div>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-6 z-10 bg-black/40 backdrop-blur-md border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 md:gap-12 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-cyan-300" />
            <span>Voice AI Executive</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-cyan-300" />
            <span>Showroom Recommendations</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-300" />
            <span>Location Aware</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
