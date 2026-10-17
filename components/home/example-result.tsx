import {designExampleResult} from '@/config/design-example-result';
import {designText} from '@/config/design-v2-copy';
import {homeownerText} from '@/config/homeowner-v3-copy';
import type {Locale} from '@/config/i18n';
import {baht,payback} from '@/lib/design-v2/figures';
import {LifetimePlot} from '@/components/design-v2/lifetime-plot';

/** Final V3 composition backed by the current energy model. */
export function ExampleResult({locale}:{locale:Locale}) {
  const text=designText(locale),v3=homeownerText(locale),r=designExampleResult;
  return <div className="excard" data-testid="home-example">
    <div className="exnums">
      <div className="top"><span className="lbl">{v3.exampleBill}</span><span className="chip chip-dark">{text.exWhere}</span></div>
      <div className="ba"><span className="sr-only">{v3.today}</span><s className="was num">{baht(r.currentMonthlyBillThb)}</s><span className="sr-only">{v3.withSolar}</span><span className="now num">{baht(r.planningAfterSolarMonthlyBillThb)}</span></div>
      <p className="save">{locale==='en'?`${baht(r.planningMonthlySavingsThb)} less each month`:`ลดลง ${baht(r.planningMonthlySavingsThb)} ต่อเดือน`}</p>
      <div className="rstats"><div><b>{r.planningSystemKw} kWp</b><span>{text.rSystem}</span></div><div><b>{baht(r.planningInstalledCostThb)}</b><span>{text.rPrice}</span></div><div><b>{payback(r.planningPaybackYears)} {text.yrs}</b><span>{text.rPayback}</span></div></div>
    </div>
    <div className="chartbox"><LifetimePlot data={r.lifetimeCostSeries} net={r.planningTwentyFiveYearNetBenefitThb} locale={locale} compact/></div>
  </div>;
}
