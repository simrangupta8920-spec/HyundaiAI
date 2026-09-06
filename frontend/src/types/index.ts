export interface Showroom { id: string; name: string; city: string; address: string; sales_executive: string; phone: string; active: boolean; created_at?: string; }
export interface Car { id: number; model_name: string; variant: string; body_type: string; fuel_type: string; transmission: string; price_min: number; price_max: number; mileage: string; engine_cc: number; seating_capacity: number; colors: string[]; features: string[]; image_url: string; is_available: boolean; }
export interface Message { id: number; session_id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string; }
export interface Session { id: string; showroom_id?: string; customer_name?: string; started_at: string; ended_at?: string; status: 'active' | 'ended' | 'escalated'; }
export interface Lead {
  id: number;
  session_id: string;
  showroom_id?: string;
  showroom_name?: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_name?: string;
  budget_min?: number;
  budget_max?: number;
  fuel_preference?: string;
  transmission_preference?: string;
  body_type_preference?: string;
  family_size?: number;
  use_case?: string;
  interested_car_ids: (number | string)[];
  lead_score?: number;
  classification?: 'HOT' | 'WARM' | 'LOW';
  status: 'new' | 'contacted' | 'warm' | 'hot' | 'converted' | 'lost';
  test_drive_status?: 'requested' | 'scheduled' | 'completed' | 'none';
  purchase_timeline?: 'Immediate' | '1 month' | '3 months' | 'Just exploring';
  assigned_executive?: string;
  ai_summary?: string;
  reasons?: string[];
  negotiation_history?: NegotiationOffer[];
  escalation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  score?: Score;
}
export interface Score { id: number; session_id: string; lead_id?: number; intent_score: number; satisfaction_score: number; engagement_score: number; overall_score: number; breakdown: Record<string, unknown>; computed_at: string; }
export interface NegotiationOffer { id: number; session_id: string; car_id?: number; round_number: number; customer_offer?: number; ai_counter?: number; discount_offered?: number; status: string; notes?: string; timestamp: string; }
export interface Escalation {
  id: number;
  session_id: string;
  lead_id?: number;
  showroom_id?: string;
  reason: string;
  priority: string;
  status: string;
  assigned_executive?: string;
  triggered_at: string;
  resolved_at?: string;
  resolved_by?: string;
  notes?: string;
}
export interface CustomerState {
  customer_name?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_model?: string;
  preferred_variant?: string;
  car_type?: string;
  fuel?: string;
  transmission?: string;
  family_size?: number;
  usage?: string;
  state?: string;
  purchase_timeline?: string;
  finance_interest?: boolean;
  test_drive_interest?: boolean;
  objections?: string[];
  negotiation_requested?: boolean;
  escalation_requested?: boolean;
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  recommended_car_ids: (string | number)[];
  should_escalate: boolean;
  should_collect_lead: boolean;
  customer_state?: CustomerState;
}
export interface AuthToken { access_token: string; token_type: string; }
