import axios from 'axios';
import { Car, Lead, ChatResponse, Score, Showroom, Message, NegotiationOffer, Escalation } from '../types';

const api = axios.create({
  baseURL: '/api',
});

// CRM Authentication — calls the real /api/auth/login endpoint
export const crmLogin = async (email: string, password: string) => {
  try {
    const res = await api.post('/auth/login', { email, password });
    return res.data; // { access_token, token_type, user }
  } catch (error: any) {
    const detail = error?.response?.data?.detail;
    throw new Error(detail || 'Invalid credentials. Please check your email and password.');
  }
};

export const getShowroomInfo = async () => (await api.get<Showroom>('/showroom/info')).data;
export const getShowroomById = async (id: string) => (await api.get<Showroom>(`/showroom/${id}`)).data;
export const getShowrooms = async () => (await api.get<Showroom[]>('/showroom/list')).data;

export const getCars = async (filters?: any) => (await api.get<Car[]>('/cars', { params: filters })).data;
export const getCarById = async (id: number) => (await api.get<Car>(`/cars/${id}`)).data;
export const recommendCars = async (req: any) => (await api.post<Car[]>('/cars/recommend', req)).data;

// Rich Vehicle API endpoints backed by Excel dataset
export const getVehicles = async (params?: any) => (await api.get<any[]>('/vehicles', { params })).data;
export const getVehicleById = async (id: string) => (await api.get<any>(`/vehicles/${id}`)).data;
export const searchVehicles = async (params?: any) => (await api.get<any[]>('/vehicles/search', { params })).data;
export const compareVehicles = async (ids: string[]) => (await api.get<any>(`/vehicles/compare`, { params: { ids: ids.join(',') } })).data;

export const startSession = async (showroomId?: string, customerName?: string) => (await api.post<{ id: string; showroom_id: string; status: string; started_at: string }>('/conversation/start', { showroom_id: showroomId || 'HYD-DEL-001', customer_name: customerName })).data;
export const sendMessage = async (sessionId: string, message: string) => (await api.post<ChatResponse>('/conversation/message', { session_id: sessionId, message })).data;
export const getConversation = async (sessionId: string) => (await api.get<any>(`/conversation/${sessionId}`)).data;
export const endSession = async (sessionId: string) => (await api.post(`/conversation/${sessionId}/end`)).data;



export const createLead = async (data: Partial<Lead>) => (await api.post<Lead>('/leads', data)).data;
export const getLeads = async (token: string, filters?: any) => (await api.get<Lead[]>('/leads', { headers: { Authorization: `Bearer ${token}` }, params: filters })).data;
export const getLeadById = async (token: string, id: number) => (await api.get<Lead>(`/leads/${id}`, { headers: { Authorization: `Bearer ${token}` } })).data;
export const updateLead = async (token: string, id: number, data: Partial<Lead>) => (await api.patch<Lead>(`/leads/${id}`, data, { headers: { Authorization: `Bearer ${token}` } })).data;

export const computeScore = async (sessionId: string) => (await api.post<Score>(`/scoring/${sessionId}`)).data;
export const getScore = async (sessionId: string) => (await api.get<Score>(`/scoring/${sessionId}`)).data;

export const submitNegotiationOffer = async (data: any) => (await api.post<NegotiationOffer>('/negotiation/offer', data)).data;
export const getNegotiationHistory = async (sessionId: string) => (await api.get<NegotiationOffer[]>(`/negotiation/${sessionId}`)).data;

export const triggerEscalation = async (data: any) => (await api.post<Escalation>('/escalation/trigger', data)).data;
export const getEscalationQueue = async (token: string) => (await api.get<Escalation[]>('/escalation/queue', { headers: { Authorization: `Bearer ${token}` } })).data;
export const updateEscalation = async (token: string, id: number, data: any) => (await api.patch<Escalation>(`/escalation/${id}`, data, { headers: { Authorization: `Bearer ${token}` } })).data;

export const getDemoScenarios = async () => (await api.get('/demo/scenarios')).data;
export const runDemoScenario = async (scenarioId: string, showroomId: string = 'HYD-DEL-001') => (await api.post(`/demo/run/${scenarioId}?showroom_id=${showroomId}`)).data;

