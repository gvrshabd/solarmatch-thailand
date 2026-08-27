export type AnalyticsEvents = {
  estimate_started: { source: 'home' | 'estimate' | 'resume' | 'edit' };
  estimate_step_completed: { stepId: string; stepNumber: number };
  estimate_result_viewed: { confidence: 'low' | 'medium' | 'high' };
  lead_form_started: { contactMethod: 'phone' | 'line' };
  lead_form_submitted: { contactMethod: 'phone' | 'line'; prototype: true };
  line_placeholder_clicked: { location: 'contact' | 'results' };
};
