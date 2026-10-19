import { QuotationComparison } from '@/components/pages/quotation-comparison';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ตารางเปรียบเทียบใบเสนอราคาโซลาร์', '/quotation-comparison');

export default function QuotationComparisonPage() {
  return <QuotationComparison locale="th" />;
}
