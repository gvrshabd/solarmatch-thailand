export type AnalyticsEvents = {
  estimate_started: { source: 'home' | 'estimate' | 'resume' | 'edit' };
  estimate_step_completed: { stepId: string; stepNumber: number };
  estimate_result_viewed: { recommendation: 'strong-fit' | 'worth-comparing' | 'site-check-first'; systemKw: number };
  lead_form_started: { contactMethod: 'phone' | 'line' };
  lead_form_submitted: { contactMethod: 'phone' | 'line' };
  line_placeholder_clicked: { location: 'contact' | 'results' };
  contact_interest_question_viewed: { mode: 'validation_interest' | 'named_installer_handoff'; language: 'en' | 'th' };
  contact_interest_yes: { mode: 'validation_interest' | 'named_installer_handoff'; language: 'en' | 'th' };
  contact_interest_no: { mode: 'validation_interest' | 'named_installer_handoff'; language: 'en' | 'th' };
  contact_form_started: { mode: 'validation_interest' | 'named_installer_handoff'; language: 'en' | 'th' };
  contact_form_completed: { mode: 'validation_interest' | 'named_installer_handoff'; language: 'en' | 'th'; contactMethod: 'phone' | 'line' };
  contact_form_skipped: { mode: 'validation_interest' | 'named_installer_handoff'; language: 'en' | 'th' };
  calculation_loading_started: { language: 'en' | 'th'; durationMs: number };
  calculation_fact_shown: { factId: string; language: 'en' | 'th'; durationMs: number };
  calculation_loading_completed: { language: 'en' | 'th'; durationMs: number };
  results_viewed: { language: 'en' | 'th'; recommendation: 'strong-fit' | 'worth-comparing' | 'site-check-first' };
};
