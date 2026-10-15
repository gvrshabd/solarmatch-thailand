const $=id=>document.getElementById(id);
const catalog=await fetch('catalog.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Review catalog unavailable');return r.json();}).catch(()=>null);
if(!catalog){$('state').textContent='The review could not load. Reload this page after signing into Cloudflare Access.';}else{
 const params=new URLSearchParams(location.search);let mode=['prototype','implementation','compare'].includes(params.get('mode'))?params.get('mode'):'compare';
 for(const item of catalog.pages){const option=document.createElement('option');option.value=item.id;option.textContent=item.title;$('page').append(option);}
 for(const key of ['page','lang','width','capture'])if([...$(key).options].some(o=>o.value===params.get(key)))$(key).value=params.get(key);
 for(const note of catalog.notes){const li=document.createElement('li');li.textContent=note;$('notes').append(li);}
 for(const photo of catalog.photos){const li=document.createElement('li'),source=document.createElement('a'),evidence=document.createElement('a');source.href=photo.source;source.textContent=photo.title;source.target=evidence.target='_blank';source.rel=evidence.rel='noopener noreferrer';evidence.href=photo.evidence;evidence.textContent='Source screenshot';li.append(source,' · ',evidence);$('photos').append(li);}
 $('build').textContent='Implementation source: '+catalog.commit+' · Review package: '+catalog.capturedAt+' · '+catalog.captureStatus;
 function render(){const page=catalog.pages.find(p=>p.id===$('page').value),lang=$('lang').value,width=$('width').value;const prefix=page.id.startsWith('question-')||page.fixedFull?'':$('capture').value;
  $('capture').parentElement.hidden=!!page.fixedFull||page.id.startsWith('question-');
  for(const side of ['prototype','implementation']){const name=prefix+side+'-'+page.id+'-'+lang+'-'+width+'.png';const image=$(side+'-img'),figure=image.closest('figure');figure.hidden=mode!==side&&mode!=='compare';image.src='images/'+name;$(side+'-full').href=image.src;const zoom=$('zoom').value;image.style.width=zoom==='native'?width+'px':zoom+'%';image.onerror=()=>{$('state').textContent='This capture is not available; use the interactive page. It has not been represented as verified.';};}
  $('pair').className=mode==='compare'?'pair':'pair single';for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  $('interactive').href=page.paths[lang];$('clickable').href='prototype/?lang='+lang+(page.prototypeBill?'&bill='+page.prototypeBill:'')+(page.prototypeStep!==undefined?'&step='+page.prototypeStep:'')+'#'+page.prototype;$('estimate').href='estimate-'+lang;
  $('state').textContent=page.fixedFull?'Full-page financial case. The prototype is unchanged; the implementation deliberately corrects the misleading financial verdict. Open the implementation link for these exact synthetic inputs.':page.id.startsWith('question-')?'Matched question crops; existing order and conditional controls are retained.':'Matched synthetic fixtures and viewport. The interactive portal uses its actual paused account state, not the reference fixture.';
  const state=new URLSearchParams({page:page.id,lang,width,capture:$('capture').value,mode});history.replaceState(null,'','?'+state);
 }
 for(const key of ['page','lang','width','capture','zoom'])$(key).addEventListener('change',render);for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{mode=button.dataset.mode;render();});render();
}
