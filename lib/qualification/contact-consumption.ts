import {calculateResidentialBill, resolveResidentialTariff} from '@/config/electricity-tariffs';
import {consumptionMonths} from '@/lib/calculator/residential-estimator';
import type {EstimateAnswers} from '@/lib/calculator/types';
import {calculateLeadAssessment, type ScoringConfiguration} from './scoring';

import {CONTACT_CONSUMPTION_VERSION, type ContactConsumptionSnapshot} from './consumption-snapshot';

/** Qualification preprocessing only; never changes the homeowner's answers or estimate. */
export function contactConsumption(answers: EstimateAnswers): ContactConsumptionSnapshot {
  if(answers.consumptionInput!=='kwh') {
    if(!Number.isFinite(answers.monthlyBillThb)||Math.round(answers.monthlyBillThb)<=0)throw Error('contact_consumption_input_not_supported');
    return {version:CONTACT_CONSUMPTION_VERSION,input:'bill',reportedBillThb:answers.monthlyBillThb,reportedKwh:null,billingPeriodDays:answers.billingPeriodDays??null,periodAssumed:false,monthlyKwh:null,qualificationBillThb:answers.monthlyBillThb,tariff:null};
  }
  if(answers.estimateModelVersion!=='energy-v3'||!answers.calculationReferenceDate
    ||!Number.isFinite(answers.monthlyConsumptionKwh)||!(answers.monthlyConsumptionKwh!>0)
    ||(answers.projectType==='expand-existing')
    ||(answers.projectType==='solar-with-battery'&&!answers.solarOnlyIllustration))throw Error('contact_consumption_input_not_supported');
  const resolved=resolveResidentialTariff({province:answers.province,utility:answers.utility,category:answers.tariffCategory,
    billingDate:answers.calculationReferenceDate,referenceDate:answers.calculationReferenceDate,purpose:'future-reference'});
  if(!resolved.tariff)throw Error('contact_consumption_input_not_supported');
  const months=consumptionMonths(answers);
  if(months.some(n=>!Number.isFinite(n)||n<0||n>6000))throw Error('contact_consumption_input_not_supported');
  // Same calendar-day normalization and optional measured monthly records as the
  // estimator, without future loads, PV output, export, tax or financing benefits.
  const monthlyKwh=months.reduce((sum,n)=>sum+n,0)/12;
  if(monthlyKwh<=0)throw Error('contact_consumption_input_not_supported');
  const tariff=resolved.tariff;
  const qualificationBillThb=calculateResidentialBill(monthlyKwh,tariff);
  if(!Number.isFinite(qualificationBillThb)||qualificationBillThb<=0)throw Error('contact_consumption_input_not_supported');
  return {version:CONTACT_CONSUMPTION_VERSION,input:'kwh',reportedBillThb:null,reportedKwh:answers.monthlyConsumptionKwh!,
    billingPeriodDays:answers.billingPeriodDays??365/12,periodAssumed:answers.billingPeriodDays===undefined,monthlyKwh,qualificationBillThb,
    tariff:{id:tariff.id,authority:tariff.authority,category:tariff.category??'ordinary-1.2',referenceDate:answers.calculationReferenceDate,
      ft:tariff.ftThbPerKwh,vat:tariff.vatRate,service:tariff.serviceChargeThb,tiers:tariff.tiers,source:tariff.source,warnings:resolved.warnings}};
}

export function calculateContactAssessment(answers:EstimateAnswers,rules:ScoringConfiguration) {
  const consumption=contactConsumption(answers);
  const assessment=calculateLeadAssessment({...answers,monthlyBillThb:consumption.qualificationBillThb},rules);
  if(consumption.input==='kwh') {
    const factor=assessment.factors.find(f=>f.key==='monthly-bill');
    if(factor){factor.explanationEn='Calculated bill equivalent for qualification; no bill supplied';factor.explanationTh='ค่าไฟเทียบเท่าที่คำนวณเพื่อคัดกรอง ไม่ใช่ค่าไฟที่ผู้ใช้กรอก';}
  }
  return {assessment,consumption};
}
