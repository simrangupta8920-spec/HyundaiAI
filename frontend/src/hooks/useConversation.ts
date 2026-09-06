import { useState, useCallback } from 'react';
import { Message, ChatResponse, Car, CustomerState } from '../types';
import {
  startSession as apiStartSession,
  sendMessage as apiSendMessage,
  endSession as apiEndSession,
  getVehicles,
} from '../services/api';
import { MOCK_MESSAGES, MOCK_CARS } from '../services/mockData';

export function formatVehicleToCar(v: any): Car {
  return {
    id: typeof v.id === 'number' ? v.id : Math.floor(Math.random() * 100000),
    model_name: v.brand && v.brand !== 'Hyundai' ? `${v.brand} ${v.model}` : (v.model || v.model_name || 'Hyundai Model'),
    variant: v.variant || `${v.car_type || 'SUV'} (${v.fuel_type || 'Petrol'})`,
    body_type: v.car_type || v.body_type || 'SUV',
    fuel_type: v.fuel_type || 'Petrol',
    transmission: v.transmission || 'Manual / Automatic',
    price_min: v.showroom_price || v.price_min || 8.0,
    price_max: v.on_road_price || v.price_max || 12.0,
    mileage: v.mileage || '17.4 kmpl',
    engine_cc: v.engine_cc || 1497,
    seating_capacity: v.seating_capacity || 5,
    colors: v.colors || ['Atlas White', 'Phantom Black', 'Titan Grey', 'Fiery Red'],
    features: v.features || [
      `Customer Rating: ${v.rating || 4.5}/5`,
      `State: ${v.state || 'Delhi'}`,
      `On-Road Price: ₹${v.on_road_price || 12.0} Lakhs`,
    ],
    image_url: v.image_url || `https://picsum.photos/seed/${encodeURIComponent(v.model || 'hyundai')}/600/400`,
    is_available: true,
  };
}

export function useConversation() {
  const [sessionId, setSessionId] = useState<string | null>(sessionStorage.getItem('ai_session_id'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedCars, setRecommendedCars] = useState<Car[]>([]);
  const [shouldCollectLead, setShouldCollectLead] = useState(false);
  const [shouldEscalate, setShouldEscalate] = useState(false);
  const [customerState, setCustomerState] = useState<CustomerState | null>(null);

  const startSession = useCallback(async (showroomId?: string, customerName?: string) => {
    const activeShowroomId = showroomId || sessionStorage.getItem('showroom_id') || 'HYD-DEL-001';
    sessionStorage.setItem('showroom_id', activeShowroomId);

    try {
      setIsLoading(true);
      const res = await apiStartSession(activeShowroomId, customerName || 'Guest');
      setSessionId(res.id);
      sessionStorage.setItem('ai_session_id', res.id);
      setMessages([
        {
          id: Date.now(),
          session_id: res.id,
          role: 'assistant',
          content: 'Hello! I am your AI Hyundai Sales Executive. How can I help you find your perfect car today?',
          timestamp: new Date().toISOString(),
        },
      ]);
      setCustomerState(null);

      // Load initial top Hyundai recommendations
      try {
        const initialVehicles = await getVehicles({ state: 'Delhi', limit: 4 });
        if (initialVehicles && initialVehicles.length > 0) {
          const formatted = initialVehicles.filter((v: any) => v.brand === 'Hyundai').map(formatVehicleToCar);
          setRecommendedCars(formatted.slice(0, 4));
        } else {
          setRecommendedCars(MOCK_CARS.slice(0, 4));
        }
      } catch {
        setRecommendedCars(MOCK_CARS.slice(0, 4));
      }
    } catch (e) {
      console.warn('Backend unavailable, using mock session');
      const mockId = 'sess-' + Date.now();
      setSessionId(mockId);
      sessionStorage.setItem('ai_session_id', mockId);
      setMessages([
        {
          id: Date.now(),
          session_id: mockId,
          role: 'assistant',
          content: 'Hello! I am your AI Hyundai Sales Executive. How can I help you find your perfect car today?',
          timestamp: new Date().toISOString(),
        },
      ]);
      setRecommendedCars(MOCK_CARS.slice(0, 4));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId) return;

      const userMsg: Message = {
        id: Date.now(),
        session_id: sessionId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await apiSendMessage(sessionId, content);
        const aiMsg: Message = {
          id: Date.now() + 1,
          session_id: sessionId,
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setShouldCollectLead(res.should_collect_lead);
        setShouldEscalate(res.should_escalate);

        if (res.customer_state) {
          setCustomerState(res.customer_state);
        }

        // Update recommended cars dynamically based on backend IDs or search
        if (res.recommended_car_ids && res.recommended_car_ids.length > 0) {
          try {
            const allVehicles = await getVehicles();
            const matched = allVehicles
              .filter((v: any) => res.recommended_car_ids.includes(v.id) || res.recommended_car_ids.includes(v.model?.toLowerCase()))
              .map(formatVehicleToCar);

            if (matched.length > 0) {
              setRecommendedCars(matched);
            }
          } catch {
            // Keep existing recommendations
          }
        }
      } catch (e) {
        console.warn('Backend error, fallback mock reply');
        setTimeout(() => {
          const mockReply = content.toLowerCase().includes('price')
            ? 'The Hyundai range starts with the Grand i10 Nios (₹5.6 Lakhs ex-showroom) up to the Ioniq 5 EV. Would you like to narrow down options by your budget?'
            : 'That sounds great! I recommend checking out the Hyundai Creta (Rating 4.6/5).';
          const aiMsg: Message = {
            id: Date.now() + 1,
            session_id: sessionId,
            role: 'assistant',
            content: mockReply,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          if (content.toLowerCase().includes('creta')) {
            setRecommendedCars([MOCK_CARS[0]]);
          }
          if (messages.length > 3) setShouldCollectLead(true);
          setIsLoading(false);
        }, 800);
        return;
      }

      setIsLoading(false);
    },
    [sessionId, messages]
  );

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiEndSession(sessionId);
    } catch (e) {
      console.warn('Backend unavailable, mock end session');
    }
    sessionStorage.removeItem('ai_session_id');
  }, [sessionId]);

  return {
    session: sessionId,
    messages,
    isLoading,
    recommendedCars,
    setRecommendedCars,
    shouldCollectLead,
    shouldEscalate,
    customerState,
    startSession,
    sendMessage,
    endSession,
  };
}
