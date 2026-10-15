import { siteConfig } from '@/config/site';
import type { Locale } from '@/config/i18n';
/** Brand facts only: unknown legal entity/address/contact facts are not invented. */
export function PublicSchema({locale,faq}:{locale:Locale;faq:readonly (readonly [string,string])[]}) {
 const data={'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':siteConfig.url+'/#brand',name:siteConfig.name,url:siteConfig.url,logo:siteConfig.url+'/favicon.svg'},
  {'@type':'WebSite','@id':siteConfig.url+'/#website',name:siteConfig.name,url:siteConfig.url,inLanguage:['th','en'],publisher:{'@id':siteConfig.url+'/#brand'}},
  {'@type':'FAQPage',inLanguage:locale,mainEntity:faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},
 ]};
 return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replaceAll('<','\\u003c')}}/>;
}
