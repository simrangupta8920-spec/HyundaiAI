import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowLeft, ExternalLink, Copy, Check, Sparkles, Building2, MapPin, User, Phone } from 'lucide-react';
import { getShowrooms } from '../services/api';
import { MOCK_SHOWROOMS } from '../services/mockData';
import { Showroom } from '../types';

export const QRGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [showrooms, setShowrooms] = useState<Showroom[]>(MOCK_SHOWROOMS);
  const [selectedShowroom, setSelectedShowroom] = useState<string>('HYD-DEL-001');
  const [customId, setCustomId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getShowrooms()
      .then(data => {
        if (data && data.length > 0) {
          setShowrooms(data);
        }
      })
      .catch(() => {
        console.warn('Backend unavailable, using mock showrooms');
      });
  }, []);

  const activeId = customId.trim() ? customId.trim().toUpperCase() : selectedShowroom;
  const baseUrl = window.location.origin;
  const qrTargetUrl = `${baseUrl}/showroom/${activeId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrTargetUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrTargetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenFlow = () => {
    navigate(`/showroom/${activeId}`);
  };

  const currentShowroomDetails = showrooms.find(s => s.id === activeId);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-hyundai-blue text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-cyan-300" /> Showroom QR Generator
            </h1>
            <span className="text-xs text-blue-200">Dev Tool • Showroom QR Flow Testing</span>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
          Exit to Customer App
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Control Panel */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-hyundai-blue">
              <Building2 className="w-5 h-5" /> Select or Enter Showroom ID
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Preset Showroom</label>
                <select
                  value={selectedShowroom}
                  onChange={(e) => { setSelectedShowroom(e.target.value); setCustomId(''); }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-hyundai-blue outline-none"
                >
                  {showrooms.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center justify-center my-2">
                <hr className="w-full border-gray-200" />
                <span className="absolute bg-white px-3 text-xs text-gray-400 font-medium">OR CUSTOM ID</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Enter Custom Showroom ID</label>
                <input
                  type="text"
                  placeholder="e.g. HYD-DEL-999"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 uppercase font-mono font-semibold focus:ring-2 focus:ring-hyundai-blue outline-none"
                />
              </div>
            </div>
          </div>

          {/* Active Showroom Info Box */}
          {currentShowroomDetails && (
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="font-bold text-hyundai-blue mb-2 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" /> Showroom Information
              </h3>
              <div className="space-y-1.5 text-xs text-gray-700">
                <p><strong className="text-gray-900">Name:</strong> {currentShowroomDetails.name}</p>
                <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-500" /> {currentShowroomDetails.address}, {currentShowroomDetails.city}</p>
                <p className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-gray-500" /> Lead Exec: {currentShowroomDetails.sales_executive}</p>
                <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-500" /> {currentShowroomDetails.phone}</p>
              </div>
            </div>
          )}

          {/* Presets List */}
          <div className="card">
            <h3 className="font-bold text-sm text-gray-700 mb-3">Available Showroom Presets</h3>
            <div className="space-y-2">
              {showrooms.map(s => (
                <div
                  key={s.id}
                  onClick={() => { setSelectedShowroom(s.id); setCustomId(''); }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex justify-between items-center ${activeId === s.id ? 'border-hyundai-blue bg-blue-50/50 ring-1 ring-hyundai-blue' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                >
                  <div>
                    <span className="font-bold font-mono text-hyundai-blue">{s.id}</span>
                    <p className="text-gray-900 font-semibold">{s.name}</p>
                    <p className="text-gray-500">{s.city}</p>
                  </div>
                  <button className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right QR Display Panel */}
        <div className="flex flex-col items-center justify-center card text-center p-8 bg-white border border-gray-200">
          <div className="inline-block bg-white p-4 rounded-3xl shadow-xl border border-gray-100 mb-6">
            <img
              src={qrImageUrl}
              alt={`QR Code for ${activeId}`}
              className="w-64 h-64 object-contain rounded-xl"
            />
          </div>

          <div className="bg-gray-100 px-4 py-2 rounded-xl text-xs font-mono text-gray-800 font-semibold mb-6 max-w-full break-all border">
            {qrTargetUrl}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={handleCopyUrl}
              className="flex-1 btn-secondary text-sm py-2.5 flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleOpenFlow}
              className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
            >
              <span>Test QR Flow</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Simulate a walk-in customer scanning the showroom QR code on their mobile device.
          </p>
        </div>

      </main>
    </div>
  );
};