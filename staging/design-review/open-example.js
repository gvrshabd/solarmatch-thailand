const link=document.getElementById('example-link');
if(link instanceof HTMLAnchorElement){const target=new URL(link.href);if(target.origin===location.origin&&/^\/(en\/)?estimate\/results$/.test(target.pathname)&&target.hash.startsWith('#sm-estimate='))location.replace(target.href);}
