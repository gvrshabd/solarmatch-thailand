/* Served prototype copy only. Original handoff files remain byte-for-byte unchanged. */
(function(){
  'use strict';
  var blocked=function(){throw new Error('Reference prototype: network operations are disabled.');};
  window.fetch=function(){return Promise.reject(new Error('Reference prototype: network operations are disabled.'));};
  if(window.XMLHttpRequest)window.XMLHttpRequest.prototype.open=blocked;
  window.WebSocket=blocked;window.EventSource=blocked;window.open=function(){return null;};
  try{navigator.sendBeacon=function(){return false;};}catch{}
  document.addEventListener('submit',function(event){event.preventDefault();},true);
  document.addEventListener('click',function(event){
    var link=event.target.closest&&event.target.closest('a[href]');if(!link)return;
    var url=new URL(link.getAttribute('href'),location.href);
    // Only mock hash navigation within this prototype is allowed.
    if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search)event.preventDefault();
  },true);
  document.addEventListener('DOMContentLoaded',function(){
    var params=new URLSearchParams(location.search),lang=params.get('lang'),state=params.get('state');
    if(!window.SM)return;
    if(['approved','empty','paused','platform','unverified','terms','nocredits','debt','payment','pending','nocompany'].includes(state))window.SM.state(state);
    if(['en','th'].includes(lang))window.SM.lang(lang);
  });
})();
