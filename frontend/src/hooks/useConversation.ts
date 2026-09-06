import { useState, useCallback } from 'react';
import { Message, ChatResponse, Car, CustomerState } from '../types';
import { startSession as apiStartSession, sendMessage as apiSendMessage, endSession as apiEndSession } from '../services/api';
import { MOCK_MESSAGES, MOCK_CARS } from '../services/mockData';

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
      setMessages([{ id: Date.now(), session_id: res.id, role: 'assistant', content: 'Hello! I am your AI Hyundai Sales Executive. How can I help you find your perfect car today?', timestamp: new Date().toISOString() }]);
      setCustomerState(null);
    } catch (e) {
      console.warn('Backend unavailable, using mock session');
      const mockId = 'sess-' + Date.now();
      setSessionId(mockId);
      sessionStorage.setItem('ai_session_id', mockId);
      setMessages([{ id: Date.now(), session_id: mockId, role: 'assistant', content: 'Hello! I am your AI Hyundai Sales Executive. How can I help you find your perfect car today?', timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId) return;
    
    const userMsg: Message = { id: Date.now(), session_id: sessionId, role: 'user', content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await apiSendMessage(sessionId, content);
      const aiMsg: Message = { id: Date.now() + 1, session_id: sessionId, role: 'assistant', content: res.reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
      setShouldCollectLead(res.should_collect_lead);
      setShouldEscalate(res.should_escalate);
      if (res.customer_state) {
        setCustomerState(res.customer_state);
      }
    } catch (e) {
      console.warn('Backend unavailable, sending mock reply');
      setTimeout(() => {
        const mockReply = content.toLowerCase().includes('price') ? 'The starting price is around 10 Lakhs. Would you like my help to narrow down options?' : 'That sounds great! I recommend checking out the Hyundai Creta.';
        const aiMsg: Message = { id: Date.now() + 1, session_id: sessionId, role: 'assistant', content: mockReply, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, aiMsg]);
        if (content.toLowerCase().includes('creta')) {
          setRecommendedCars([MOCK_CARS[0]]);
        }
        if (messages.length > 3) setShouldCollectLead(true);
        setIsLoading(false);
      }, 1000);
      return;
    }
    
    setIsLoading(false);
  }, [sessionId, messages]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiEndSession(sessionId);
    } catch (e) {
      console.warn('Backend unavailable, mock end session');
    }
    sessionStorage.removeItem('ai_session_id');
  }, [sessionId]);

  return { session: sessionId, messages, isLoading, recommendedCars, shouldCollectLead, shouldEscalate, customerState, startSession, sendMessage, endSession };
}
