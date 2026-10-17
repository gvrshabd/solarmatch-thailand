const $=id=>document.getElementById(id);
try{
 const catalog=await fetch('catalog.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error();return r.json();});
 const params=new URLSearchParams(location.search);let mode=['prototype','implementation','compare'].includes(params.get('mode'))?params.get('mode'):'compare';
 for(const page of catalog.pages){const option=document.createElement('option');option.value=page.id;option.textContent=page.title;$('page').append(option);}
 for(const key of ['page','lang'])if([...$(key).options].some(o=>o.value===params.get(key)))$(key).value=params.get(key);
 for(const note of catalog.notes){const li=document.createElement('li');li.textContent=note;$('notes').append(li);}
 $('build').textContent='Source commit: '+catalog.commit+' · Captured '+catalog.capturedAt;
 function render(){
  const page=catalog.pages.find(p=>p.id===$('page').value),lang=$('lang').value,previous=Number($('width').value||params.get('width')||390);
  $('width').replaceChildren();for(const width of page.widths){const option=document.createElement('option');option.value=String(width);option.textContent=width+'px';$('width').append(option);}if(page.widths.includes(previous))$('width').value=String(previous);
  const width=$('width').value;
  if(!page.hasPrototype)mode='implementation';
  for(const side of ['prototype','implementation']){const image=$(side+'-img');image.closest('figure').hidden=mode!=='compare'&&mode!==side;if(side==='prototype'&&!page.hasPrototype){image.removeAttribute('src');continue;}image.src='images/'+side+'-'+page.id+'-'+lang+'-'+width+'.png';$(side+'-full').href=image.src;image.style.width=$('zoom').value==='native'?width+'px':$('zoom').value+'%';image.onerror=()=>{$('status').textContent='Capture unavailable. This view is not represented as verified.';};}
  $('pair').className=mode==='compare'?'pair':'pair single';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=!page.hasPrototype&&b.dataset.mode!=='implementation');
  $('interactive').href=page.paths[lang];$('clickable').href='prototype/?lang='+lang+(page.prototypeStep===undefined?'':'&step='+page.prototypeStep)+'#'+page.prototype;$('clickable').hidden=!page.hasPrototype;
  $('status').textContent=page.hasPrototype?'Same locale and viewport. Calculator values and additional controls intentionally differ; see the review limits below.':'Calculator extension without a corresponding prototype screen. Shown honestly as implementation only.';
  history.replaceState(null,'','?'+new URLSearchParams({page:page.id,lang,width,mode}));
 }
 for(const key of ['page','lang','width','zoom'])$(key).addEventListener('change',render);
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();}));render();
}catch{$('status').textContent='Unable to load the protected review. Sign in through Cloudflare Access and reload.';}
