const manifestUrl=new URL('data/manifest.json',document.baseURI);
const expected=['m5','m2','h8'];
function bytes(n){return (n/1000).toFixed(1)+' KB';}
function time(value){return value?new Date(value).toLocaleString('zh-CN',{hour12:false}):'未提供';}
function resource(value){if(typeof value!=='string'||!/^assets\/[a-z0-9/_\-.]+\.webp$/.test(value)||value.includes('..'))throw Error('快照路径无效');const u=new URL(value,document.baseURI);if(u.origin!==location.origin)throw Error('快照必须同源');return u.href;}
function validAsset(a,hd=false){if(!a||!Number.isInteger(a.bytes)||a.bytes<1||!Number.isInteger(a.width)||a.width<1||!Number.isInteger(a.height)||a.height<1||!/^[a-f0-9]{64}$/.test(a.sha256)||hd&&a.bytes>1000000)throw Error('图片数据校验失败');resource(a.path);}
function validate(data){if(data.schemaVersion!==1||!data.plans)throw Error('快照格式不支持');for(const key of expected){const p=data.plans[key];if(!p||!Number.isInteger(p.revision)||!p.capturedAt||!Array.isArray(p.steps)||!p.steps.length)throw Error('快照组不完整');p.steps.forEach((s,i)=>{if(s.step!==i+1)throw Error('快照步骤不连续');validAsset(s.preview);validAsset(s.highResolution,true);});if(!p.sourceUrl?.startsWith('https://raidplan.io/plan/'))throw Error('来源链接无效');}return data;}
function element(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
const planControllers=new Map();
function planView(key,p){const box=element('article',null,'plan');const heading=element('div',null,'plan-heading');heading.append(element('h3',p.title+' 战术图'));box.append(heading);
 const countText=element('p',`${p.steps.length} 张战术图`,'meta');box.append(countText);
 const captureText=element('p',`图片更新时间：${time(p.capturedAt)}`,'meta muted');box.append(captureText);
 const sourceNotice=element('p','原网页已有更新，可打开 Raidplan 查看。','meta');sourceNotice.hidden=p.sourceCheck?.status!=='update_available';box.append(sourceNotice);
 const tabs=element('div',null,'steps');tabs.setAttribute('aria-label',p.title+' 战术图切换');const buttons=[];
 let image=element('img',null,'preview');
 const label=element('p',null,'meta');const status=element('p','图片加载中…','status');status.setAttribute('aria-live','polite');
 const actions=element('div',null,'actions');const hd=element('a',null,'button');hd.target='_blank';hd.rel='noopener';const previewLink=element('a','放大','button');previewLink.target='_blank';previewLink.rel='noopener';const source=element('a','打开原页','plan-original button original-button');source.href=p.sourceUrl;source.target='_blank';source.rel='noopener';heading.append(source);const retry=element('button','刷新');retry.type='button';let current,requestId=0,cancelImage=()=>{};
 function loadPreview(step,active=false,retryRequest=false){
  cancelImage();const id=++requestId;const next=element('img',null,'preview');
  next.alt=`${p.title} 战术图，第${step.step}张图`;next.width=step.preview.width;next.height=step.preview.height;
  next.loading=active||key==='m5'?'eager':'lazy';next.decoding='async';if(active||key==='m5')next.fetchPriority='high';
  next.dataset.loadState='loading';next.setAttribute('aria-busy','true');image.replaceWith(next);image=next;
  status.textContent=`第${step.step}张图加载中…`;status.className='status';
  let slowTimer,timeoutTimer,observer,started=false,settled=false;
  const stillCurrent=()=>id===requestId&&!settled;
  function clearWaiting(){clearTimeout(slowTimer);clearTimeout(timeoutTimer);observer?.disconnect();}
  function fail(message){if(!stillCurrent())return;settled=true;clearWaiting();next.onload=null;next.onerror=null;next.removeAttribute('src');next.dataset.loadState='error';next.setAttribute('aria-busy','false');status.textContent=`第${step.step}张图${message}，请重新加载，或打开 Raidplan 查看。`;status.className='status error';}
  function startWaiting(){if(started||!stillCurrent())return;started=true;slowTimer=setTimeout(()=>{if(stillCurrent())status.textContent=`第${step.step}张图加载较慢，可继续等待或重新加载。`;},8000);timeoutTimer=setTimeout(()=>fail('加载超时'),45000);}
  next.onload=async()=>{if(!stillCurrent())return;try{await next.decode();}catch{fail('加载失败');return;}if(!stillCurrent())return;settled=true;clearWaiting();next.dataset.loadState='loaded';next.setAttribute('aria-busy','false');status.textContent=`第${step.step}张图已加载。`;status.className='status';};
  next.onerror=()=>fail('加载失败');
  cancelImage=()=>{settled=true;clearWaiting();next.onload=null;next.onerror=null;next.removeAttribute('src');};
  if(active||key==='m5')startWaiting();else{observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))startWaiting();},{rootMargin:'200px'});observer.observe(next);}
  next.src=resource(step.preview.path)+(retryRequest?'?retry='+Date.now():'');
 }
 function select(step,active=true,prepared=null){current=step;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===step.step-1)));label.textContent=`第${step.step}张图`;hd.textContent='原图';hd.href=resource(step.highResolution.path);previewLink.href=resource(step.preview.path);if(prepared){cancelImage();++requestId;prepared.alt=`${p.title} 战术图，第${step.step}张图`;prepared.className='preview';prepared.width=step.preview.width;prepared.height=step.preview.height;prepared.dataset.loadState='loaded';prepared.setAttribute('aria-busy','false');image.replaceWith(prepared);image=prepared;status.textContent=`第${step.step}张图已加载。`;status.className='status';}else loadPreview(step,active);}
 retry.addEventListener('click',()=>loadPreview(current,true,true));
 function buildTabs(){buttons.length=0;tabs.replaceChildren();p.steps.forEach(s=>{const b=element('button',String(s.step));b.type='button';b.setAttribute('aria-label',`第${s.step}张图`);b.addEventListener('click',()=>select(s));buttons.push(b);tabs.append(b);});}
 buildTabs();
 previewLink.addEventListener("click",event=>{event.preventDefault();openViewer(previewLink.href,`${p.title} · 第${current.step}张图`);});hd.addEventListener("click",event=>{event.preventDefault();openViewer(hd.href,`${p.title} · 第${current.step}张图 · 原图`);});
 actions.append(previewLink,hd,retry);box.append(tabs,label,status,image,actions);select(p.steps[0],false);
 planControllers.set(key,{
  selection:()=>current,
  apply(next,step,prepared){p=next;heading.querySelector('h3').textContent=p.title+' 战术图';source.href=p.sourceUrl;countText.textContent=`${p.steps.length} 张战术图`;captureText.textContent=`图片更新时间：${time(p.capturedAt)}`;sourceNotice.hidden=p.sourceCheck?.status!=='update_available';buildTabs();select(step,false,prepared);}
 });return box;}
const publishedPlans=new Map();
function assetSignature(a){return [a.path,a.sha256,a.bytes,a.width,a.height];}
function planSignature(p){return JSON.stringify([p.revision,p.version,p.title,p.sourceUrl,p.capturedAt,p.sourceCheck?.status==='update_available',p.steps.map(s=>[s.step,s.id,assetSignature(s.preview),assetSignature(s.highResolution)])]);}
function matchingStep(next,previous){return next.steps.find(s=>previous.id!=null&&s.id===previous.id)||next.steps.find(s=>s.preview.sha256===previous.preview.sha256)||next.steps[Math.min(previous.step-1,next.steps.length-1)];}
function preparePreview(step,signal){return new Promise((resolve,reject)=>{
 if(signal.aborted){reject(Error('检查已暂停'));return;}
 const img=new Image();let settled=false;const timer=setTimeout(()=>finish(Error('图片加载超时')),20000);
 function finish(error){if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',aborted);img.onload=null;img.onerror=null;if(error){img.removeAttribute('src');reject(error);}else resolve(img);}
 function aborted(){finish(Error('检查已暂停'));}signal.addEventListener('abort',aborted,{once:true});
 img.onload=async()=>{try{await img.decode();finish();}catch{finish(Error('图片解码失败'));}};img.onerror=()=>finish(Error('图片加载失败'));img.src=resource(step.preview.path);
});}
let busy=false,pollTimer,activeCheck,failures=0,resumeRequested=false;
function scheduleCheck(){clearTimeout(pollTimer);if(!document.hidden)pollTimer=setTimeout(refresh,Math.min(60000*2**failures,600000));}
async function refresh(){if(busy||document.hidden)return;clearTimeout(pollTimer);busy=true;activeCheck=new AbortController();const check=activeCheck,timeout=setTimeout(()=>check.abort(),20000);
 try{
  const u=new URL(manifestUrl);u.searchParams.set('v',Date.now());const response=await fetch(u,{cache:'no-store',signal:check.signal});if(!response.ok)throw Error('HTTP '+response.status);const data=validate(await response.json());
  const changes=expected.filter(key=>publishedPlans.get(key)!==planSignature(data.plans[key]));
  const prepared=await Promise.all(changes.map(async key=>{const controller=planControllers.get(key);if(!controller)return {key};const previous=controller.selection(),step=matchingStep(data.plans[key],previous),image=await preparePreview(step,check.signal);return {key,previous,step,image};}));
  if(document.hidden||check.signal.aborted)throw Error('检查已暂停');
  // A user selecting another image during a download takes priority; retry later.
  if(prepared.some(item=>item.previous&&planControllers.get(item.key).selection()!==item.previous))return;
  for(const item of prepared){const p=data.plans[item.key];if(item.image)planControllers.get(item.key).apply(p,item.step,item.image);else document.getElementById('plan-'+item.key).replaceChildren(planView(item.key,p));publishedPlans.set(item.key,planSignature(p));}
  failures=0;
 }catch(error){
  check.abort();
  if(!document.hidden){failures=Math.min(failures+1,4);for(const key of expected){if(planControllers.has(key))continue;const card=document.querySelector('#plan-'+key+' .plan'),status=card.querySelector('.status');status.textContent='战术图加载失败，请刷新重试或打开原页查看。';status.className='status error';if(!card.querySelector('.manifest-retry')){const actions=element('div',null,'actions'),retry=element('button','刷新','manifest-retry');retry.type='button';retry.addEventListener('click',refresh);actions.append(retry);card.append(actions);}}}
 }finally{clearTimeout(timeout);if(activeCheck===check)activeCheck=null;busy=false;if(resumeRequested&&!document.hidden){resumeRequested=false;queueMicrotask(refresh);}else scheduleCheck();}
}
document.addEventListener('visibilitychange',()=>{clearTimeout(pollTimer);if(document.hidden)activeCheck?.abort();else if(busy)resumeRequested=true;else refresh();});
refresh();
const farmDetails=document.getElementById('farm-details'),farmSummary=farmDetails.querySelector('summary');function updateFarmState(){farmSummary.setAttribute('aria-expanded',String(farmDetails.open));farmSummary.querySelector('.farm-indicator').textContent=farmDetails.open?'收起资料 ↑':'展开资料 ↓';}farmDetails.addEventListener('toggle',updateFarmState);updateFarmState();

const number=document.getElementById('kook-number');
number.addEventListener('click',()=>number.select());
document.getElementById('copy-kook').addEventListener('click',async()=>{const status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(number.value);status.textContent='已复制 63441611，快来加入 KOOK！';}catch{number.focus({preventScroll:true});number.select();status.textContent='自动复制未成功，号码已选中，可长按或手动复制。';}});
const viewer=document.getElementById('image-viewer'),viewerStatus=document.getElementById('viewer-status'),zoom=document.getElementById('viewer-zoom');let viewerId=0,viewerTimer,previousOverflow='';
function openViewer(url,title){
 const id=++viewerId;clearTimeout(viewerTimer);const old=document.getElementById('viewer-image');old.removeAttribute('src');const img=document.createElement('img');img.id='viewer-image';img.alt=title;img.setAttribute('aria-busy','true');old.replaceWith(img);
 document.getElementById('viewer-title').textContent=title;document.getElementById('viewer-original').href=url;viewerStatus.textContent='正在加载放大图…';zoom.disabled=true;zoom.setAttribute('aria-pressed','false');zoom.textContent='原尺寸放大';
 if(!viewer.open){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';viewer.showModal();}document.querySelector('.viewer-scroll').scrollTo(0,0);
 img.onload=async()=>{try{await img.decode();}catch{return;}if(id!==viewerId||!viewer.open)return;clearTimeout(viewerTimer);zoom.disabled=false;img.setAttribute('aria-busy','false');viewerStatus.textContent='图片已加载，可放大并在图内滚动。';};
 img.onerror=()=>{if(id===viewerId&&viewer.open){clearTimeout(viewerTimer);viewerStatus.textContent='图片加载失败，可关闭重试或单独打开图片。';}};
 viewerTimer=setTimeout(()=>{if(id===viewerId&&viewer.open){img.onerror=null;img.removeAttribute('src');viewerStatus.textContent='图片加载超时，可关闭重试或单独打开图片。';}},45000);img.src=url;
}
zoom.addEventListener('click',()=>{const img=document.getElementById('viewer-image');const native=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(native));zoom.textContent=native?'适应屏幕':'原尺寸放大';img.style.width=native?img.naturalWidth+'px':'100%';img.style.maxWidth=native?'none':'';});
document.getElementById('viewer-close').addEventListener('click',()=>viewer.close());
viewer.addEventListener('close',()=>{++viewerId;clearTimeout(viewerTimer);document.getElementById('viewer-image').removeAttribute('src');document.body.style.overflow=previousOverflow;});
viewer.addEventListener('click',event=>{const r=viewer.getBoundingClientRect();if(event.target===viewer&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))viewer.close();});
const navigation=[...document.querySelectorAll('.sidebar nav a')];
const sectionObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){navigation.forEach(a=>{const active=a.hash==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-10% 0px -65% 0px'});for(const section of document.querySelectorAll('main > .section'))sectionObserver.observe(section);
for(const link of document.querySelectorAll('a[href^="#"]'))link.addEventListener('click',()=>{const h=document.querySelector(link.hash+' h2');if(h){h.tabIndex=-1;requestAnimationFrame(()=>h.focus({preventScroll:true}));}});

// A new document always starts closed and without a Tencent iframe.
for(const details of document.querySelectorAll('.document-details')){
 const summary=details.querySelector('summary'),slot=details.querySelector('.doc-slot'),label=details.querySelector('.document-toggle-label');let allowedOpen=false;
 details.open=false;
 summary.addEventListener('click',event=>{allowedOpen=event.isTrusted&&!details.open;});
 details.addEventListener('toggle',()=>{
  let frame=slot.querySelector('iframe');
  if(details.open&&!frame){
   if(!allowedOpen){details.open=false;return;}
   frame=document.createElement('iframe');frame.className='doc';frame.title=slot.dataset.title;frame.loading='eager';frame.src=slot.dataset.url;slot.append(frame);
  }
  allowedOpen=false;summary.setAttribute('aria-expanded',String(details.open));label.textContent=details.open?'收起 ↑':'展开查看 ↓';
 });
}
