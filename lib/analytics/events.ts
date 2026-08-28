export type AnalyticsEvents = {
  estimate_started: { source: 'home' | 'estimate' | 'resume' | 'edit' };
  estimate_step_completed: { stepId: string; stepNumber: number };
  estimate_result_viewed: { recommendation: 'strong-fit' | 'worth-comparing' | 'site-check-first'; systemKw: number };
  lead_form_started: { contactMethod: 'phone' | 'line' };
  lead_form_submitted: { contactMethod: 'phone' | 'line'; prototype: true; localOnly: true };
  line_placeholder_clicked: { location: 'contact' | 'results' };
};
