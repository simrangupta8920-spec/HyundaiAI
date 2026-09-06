import React, { useState } from 'react';
import { Car as CarType } from '../types';
import {
  CheckCircle2, Info, Calculator, MessageSquare, Calendar, ChevronRight,
  Shield, Fuel, Zap, Users, Star, X, MapPin, Award
} from 'lucide-react';
import clsx from 'clsx';

interface CarCardProps {
  car: CarType;
  isRecommended?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: (car: CarType) => void;
  onAskAI?: (carModel: string) => void;
  onBookTestDrive?: (carModel: string) => void;
}

export const CarCard: React.FC<CarCardProps> = ({
  car,
  isRecommended,
  isSelectedForCompare,
  onToggleCompare,
  onAskAI,
  onBookTestDrive,
}) => {
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [showEmiModal, setShowEmiModal] = useState(false);

  // EMI Calculator State
  const defaultLoan = Math.round(car.price_max * 100000 * 0.85);
  const [downPaymentPct, setDownPaymentPct] = useState(15);
  const [tenureYears, setTenureYears] = useState(5);
  const [interestRate, setInterestRate] = useState(9.5);

  const priceInRupees = car.price_max * 100000;
  const downPaymentAmount = Math.round((priceInRupees * downPaymentPct) / 100);
  const loanAmount = priceInRupees - downPaymentAmount;

  // Monthly Interest Rate calculation
  const monthlyRate = interestRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  const emi =
    loanAmount > 0
      ? Math.round(
          (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1)
        )
      : 0;

  return (
    <>
      <div
        className={clsx(
          "bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border flex flex-col justify-between relative group overflow-hidden",
          isRecommended
            ? "border-hyundai-blue/60 ring-2 ring-hyundai-blue/40"
            : isSelectedForCompare
            ? "border-purple-500/60 ring-2 ring-purple-500/40"
            : "border-gray-200 hover:border-gray-300"
        )}
      >
        {/* Card Header Image */}
        <div className="relative h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
          <img
            src={car.image_url}
            alt={car.model_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(car.model_name)}/600/400`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

          {/* Recommended Badge */}
          {isRecommended && (
            <div className="absolute top-3 left-3 bg-hyundai-blue text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-white/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" /> AI Top Recommendation
            </div>
          )}

          {/* Compare Checkbox */}
          {onToggleCompare && (
            <button
              onClick={() => onToggleCompare(car)}
              className={clsx(
                "absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md transition-all flex items-center gap-1 shadow-md cursor-pointer",
                isSelectedForCompare
                  ? "bg-purple-600 text-white border border-purple-300"
                  : "bg-black/40 hover:bg-black/60 text-white border border-white/30"
              )}
            >
              <input
                type="checkbox"
                checked={!!isSelectedForCompare}
                onChange={() => {}}
                className="w-3 h-3 accent-purple-600 rounded cursor-pointer"
              />
              <span>{isSelectedForCompare ? "Comparing" : "Compare"}</span>
            </button>
          )}

          {/* Model Title Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black text-white drop-shadow-md">{car.model_name}</h3>
              <p className="text-xs text-slate-300 font-medium">{car.variant}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-300 block">Est. On-Road</span>
              <span className="text-sm font-black text-cyan-300 drop-shadow-sm">
                ₹{car.price_min.toFixed(1)}L – ₹{car.price_max.toFixed(1)}L
              </span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          {/* Key Attribute Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Fuel className="w-3 h-3 text-slate-500" /> {car.fuel_type}
            </span>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {car.body_type}
            </span>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {car.transmission}
            </span>
            <span className="text-[11px] font-bold bg-blue-50 text-hyundai-blue px-2 py-0.5 rounded-md flex items-center gap-1">
              <Users className="w-3 h-3" /> {car.seating_capacity} Seats
            </span>
          </div>

          {/* Feature Snippets */}
          <div className="text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Top Features & Spec:
            </p>
            <p className="text-slate-600 line-clamp-2 leading-relaxed">
              {Array.isArray(car.features) ? car.features.join(" • ") : car.features}
            </p>
          </div>

          {/* Interactive Actions Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowSpecModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-slate-600" /> Specs &amp; Price
            </button>

            <button
              onClick={() => setShowEmiModal(true)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-600" /> EMI Calc
            </button>

            {onAskAI && (
              <button
                onClick={() => onAskAI(car.model_name)}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-hyundai-blue text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-hyundai-blue" /> Ask AI
              </button>
            )}

            {onBookTestDrive && (
              <button
                onClick={() => onBookTestDrive(car.model_name)}
                className="px-3 py-2 bg-hyundai-blue hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" /> Book Drive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal 1: Detailed Specifications ────────────────────────────── */}
      {showSpecModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative border border-gray-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setShowSpecModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-hyundai-blue/10 text-hyundai-blue rounded-2xl flex items-center justify-center font-black text-xl">
                H
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{car.model_name} Specification Sheet</h3>
                <p className="text-xs text-gray-500">{car.variant} • Official Hyundai Data</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-gray-700">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500 block">Ex-Showroom Price</span>
                  <strong className="text-base text-gray-900 font-extrabold">₹{car.price_min.toFixed(2)} Lakhs</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Estimated On-Road</span>
                  <strong className="text-base text-hyundai-blue font-extrabold">₹{car.price_max.toFixed(2)} Lakhs</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500">Body Type</span>
                  <p className="font-bold text-gray-900">{car.body_type}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500">Fuel Type</span>
                  <p className="font-bold text-gray-900">{car.fuel_type}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500">Transmission</span>
                  <p className="font-bold text-gray-900">{car.transmission}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500">Seating Capacity</span>
                  <p className="font-bold text-gray-900">{car.seating_capacity} Persons</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                <h4 className="font-bold text-hyundai-blue mb-2 text-sm flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Feature Highlights &amp; Safety
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                  {(Array.isArray(car.features) ? car.features : [car.features]).map((f, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowSpecModal(false);
                  if (onAskAI) onAskAI(car.model_name);
                }}
                className="flex-1 btn-secondary text-xs py-2.5"
              >
                Ask AI Assistant
              </button>
              <button
                onClick={() => {
                  setShowSpecModal(false);
                  if (onBookTestDrive) onBookTestDrive(car.model_name);
                }}
                className="flex-1 btn-primary text-xs py-2.5"
              >
                Book Test Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: EMI & Finance Calculator ──────────────────────────── */}
      {showEmiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative border border-gray-200">
            <button
              onClick={() => setShowEmiModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">EMI &amp; Loan Calculator</h3>
                <p className="text-xs text-gray-500">Hyundai {car.model_name} • Est. ₹{car.price_max.toFixed(2)}L</p>
              </div>
            </div>

            <div className="bg-emerald-950 text-white p-5 rounded-2xl text-center mb-5 shadow-lg">
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">Estimated Monthly EMI</span>
              <span className="text-3xl font-black text-emerald-300">₹{emi.toLocaleString()}<span className="text-xs font-normal text-emerald-400">/mo</span></span>
              <span className="text-[11px] text-slate-400 block mt-1">Loan Amount: ₹{(loanAmount / 100000).toFixed(2)} Lakhs</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Down Payment ({downPaymentPct}%)</span>
                  <span>₹{(downPaymentAmount / 100000).toFixed(2)} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={downPaymentPct}
                  onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Loan Tenure</span>
                  <span>{tenureYears} Years ({tenureYears * 12} Months)</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 7].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setTenureYears(y)}
                      className={clsx(
                        "py-2 rounded-xl border text-xs font-bold transition-colors",
                        tenureYears === y
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                      )}
                    >
                      {y} Yrs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Interest Rate (p.a.)</span>
                  <span>{interestRate}%</span>
                </div>
                <input
                  type="range"
                  min="7.5"
                  max="14.0"
                  step="0.25"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowEmiModal(false);
                if (onBookTestDrive) onBookTestDrive(car.model_name);
              }}
              className="w-full mt-6 btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-3 font-bold"
            >
              Apply for Pre-Approved Finance Offer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
