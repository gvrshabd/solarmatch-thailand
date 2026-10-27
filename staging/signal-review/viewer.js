(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var catalog=window.SIGNAL_REVIEW_CATALOG;
  if(!catalog||!Array.isArray(catalog.cases)||!catalog.cases.length){$('status').textContent='The protected comparison is unavailable. Reload after signing in through Access.';return;}
  var params=new URLSearchParams(location.search),mode=['compare','prototype','implementation','overlay'].includes(params.get('mode'))?params.get('mode'):'compare';
  var pages=Array.from(new Set(catalog.cases.map(function(item){return item.page;})));
  function option(value,label){var element=document.createElement('option');element.value=value;element.textContent=label;return element;}
  function title(item){
    var route={landing:'Installer website',signin:'Sign in',inbox:'Enquiries',company:'Company',credits:'Credits',claims:'Credit claims',terms:'Installer terms'}[item.route]||'Enquiry '+item.route;
    var state={empty:'empty',paused:'company paused',platform:'platform paused',unverified:'unverified email',terms:'terms needed',nocredits:'no credits',debt:'credit debt',payment:'payment QR',pending:'under review',nocompany:'no company'}[item.state];
    return route+(state?' · '+state:'')+(item.menu?' · '+item.menu+' menu':'');
  }
  pages.forEach(function(page){$('page').append(option(page,title(catalog.cases.find(function(item){return item.page===page;}))));});
  ['page','lang','device','zoom'].forEach(function(key){if(Array.from($(key).options).some(function(item){return item.value===params.get(key);}))$(key).value=params.get(key);});
  catalog.notes.forEach(function(note){var li=document.createElement('li');li.textContent=note;$('notes').append(li);});
  $('capture-info').textContent='Fixed capture time: '+(catalog.fixedNow||'not recorded')+' · '+catalog.cases.length+' supplied reference cases · synthetic examples only.';
  function setImage(id,image,description){
    var element=$(id);element.src='images/'+image.file;element.width=image.width;element.height=image.height;element.alt=description;
    element.style.width=$('zoom').value==='fit'?'100%':Math.round(image.width*Number($('zoom').value))+'px';
    element.onerror=function(){$('status').textContent='A capture could not be loaded. This comparison is not represented as verified.';};
  }
  function companion(id,image){var link=$(id);link.hidden=!image;if(image)link.href='images/'+image.file;else link.removeAttribute('href');}
  function opacity(){var value=$('opacity').value;$('overlay-current').style.opacity=String(Number(value)/100);$('opacity-value').value=value+'%';$('opacity-value').textContent=value+'%';}
  function render(){
    var page=$('page').value,available=catalog.cases.filter(function(item){return item.page===page;});
    Array.from($('lang').options).forEach(function(item){item.disabled=!available.some(function(entry){return entry.lang===item.value;});});
    if(!available.some(function(item){return item.lang===$('lang').value;}))$('lang').value=available[0].lang;
    var locale=available.filter(function(item){return item.lang===$('lang').value;});
    Array.from($('device').options).forEach(function(item){item.disabled=!locale.some(function(entry){return entry.device===item.value;});});
    if(!locale.some(function(item){return item.device===$('device').value;}))$('device').value=locale[0].device;
    var item=locale.find(function(entry){return entry.device===$('device').value;}),reference=item.original,implemented=item.captures.implementation;
    setImage('prototype-img',reference,title(item)+' · original supplied prototype · '+item.lang+' · '+item.device);
    setImage('implementation-img',implemented,title(item)+' · implementation · '+item.lang+' · '+item.device);
    $('prototype-full').href='images/'+reference.file;$('implementation-full').href='images/'+implemented.file;
    $('rendered-prototype').href='images/'+item.captures.prototype.file;
    companion('prototype-companion',item.captures.prototype.fullPage);companion('implementation-companion',implemented.fullPage);
    $('implementation-caption').textContent=implemented.width+' × '+implemented.height+' pixels · synthetic capture';
    $('interactive').href=item.implementation;$('clickable').href=item.prototype;
    $('prototype-figure').hidden=mode==='implementation'||mode==='overlay';$('implementation-figure').hidden=mode==='prototype'||mode==='overlay';
    $('pair').hidden=mode==='overlay';$('pair').className=mode==='compare'?'pair':'pair single';$('overlay').hidden=mode!=='overlay';$('opacity-control').hidden=mode!=='overlay';
    if(mode==='overlay'){
      $('overlay-base').src='images/'+reference.file;$('overlay-current').src='images/'+implemented.file;
      var canvas=$('overlay-canvas');canvas.style.width=$('zoom').value==='fit'?'100%':Math.round(reference.width*Number($('zoom').value))+'px';canvas.style.aspectRatio='1 / '+Math.max(reference.height/reference.width,implemented.height/implemented.width);opacity();
    }
    document.querySelectorAll('[data-mode]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.mode===mode));});
    $('view-notes').replaceChildren();
    (item.notes.length?item.notes:['No additional view-specific exception is recorded. Shared capture and review limits still apply.']).forEach(function(note){var li=document.createElement('li');li.textContent=note;$('view-notes').append(li);});
    $('status').textContent=title(item)+' · '+(item.lang==='th'?'Thai':'English')+' · '+item.cssWidth+' CSS px · prototype '+reference.width+' × '+reference.height+' / implementation '+implemented.width+' × '+implemented.height+' pixels.';
    history.replaceState(null,'','?'+new URLSearchParams({page:page,lang:item.lang,device:item.device,mode:mode,zoom:$('zoom').value}));
  }
  ['page','lang','device','zoom'].forEach(function(key){$(key).addEventListener('change',render);});
  document.querySelectorAll('[data-mode]').forEach(function(button){button.addEventListener('click',function(){mode=button.dataset.mode;render();});});
  $('opacity').addEventListener('input',opacity);render();
})();
