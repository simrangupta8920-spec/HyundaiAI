import React from 'react';
import { Car as CarType } from '../types';
import { Info, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface CarCardProps {
  car: CarType;
  isRecommended?: boolean;
  onClick?: () => void;
}

export const CarCard: React.FC<CarCardProps> = ({ car, isRecommended, onClick }) => {
  return (
    <div 
      className={clsx(
        "bg-white rounded-2xl shadow-md overflow-hidden border transition-all duration-300 hover:shadow-lg",
        isRecommended ? "border-hyundai-blue ring-2 ring-hyundai-blue ring-opacity-50" : "border-gray-100",
        onClick ? "cursor-pointer" : ""
      )}
      onClick={onClick}
    >
      <div className="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
        {isRecommended && (
          <div className="absolute top-2 right-2 bg-hyundai-blue text-white text-xs font-bold px-3 py-1 rounded-full z-10 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Recommended
          </div>
        )}
        <img 
          src={car.image_url} 
          alt={car.model_name} 
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Hyundai+'+car.model_name; }}
        />
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{car.model_name}</h3>
            <p className="text-sm text-gray-500">{car.variant}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-hyundai-blue">₹{car.price_min.toFixed(1)}L – ₹{car.price_max.toFixed(1)}L</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{car.body_type}</span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{car.fuel_type}</span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{car.transmission}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 mb-4 border-t pt-4 border-gray-100">
          <div><span className="font-medium">Mileage:</span> {car.mileage}</div>
          <div><span className="font-medium">Engine:</span> {car.engine_cc}cc</div>
          <div><span className="font-medium">Seating:</span> {car.seating_capacity}</div>
        </div>

        <div className="flex items-start gap-1 text-xs text-gray-500 mt-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="line-clamp-2">{car.features.join(' • ')}</p>
        </div>
      </div>
    </div>
  );
};
