const manifestUrl=new URL('data/manifest.json',document.baseURI);
const expected=['m5','m2','h8'];
function bytes(n){return (n/1000).toFixed(1)+' KB';}
function time(value){return value?new Date(value).toLocaleString('zh-CN',{hour12:false}):'未提供';}
function resource(value){if(typeof value!=='string'||!/^assets\/[a-z0-9/_\-.]+\.webp$/.test(value)||value.includes('..'))throw Error('快照路径无效');const u=new URL(value,document.baseURI);if(u.origin!==location.origin)throw Error('快照必须同源');return u.href;}
function validAsset(a,hd=false){if(!a||!Number.isInteger(a.bytes)||a.bytes<1||!Number.isInteger(a.width)||a.width<1||!Number.isInteger(a.height)||a.height<1||!/^[a-f0-9]{64}$/.test(a.sha256)||hd&&a.bytes>1000000)throw Error('图片数据校验失败');resource(a.path);}
function validate(data){if(data.schemaVersion!==1||!data.plans)throw Error('快照格式不支持');for(const key of expected){const p=data.plans[key];if(!p||!Number.isInteger(p.revision)||!p.capturedAt||!Array.isArray(p.steps)||!p.steps.length)throw Error('快照组不完整');p.steps.forEach((s,i)=>{if(s.step!==i+1)throw Error('快照步骤不连续');validAsset(s.preview);validAsset(s.highResolution,true);});if(!p.sourceUrl?.startsWith('https://raidplan.io/plan/'))throw Error('来源链接无效');}return data;}
function element(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
function planView(key,p){const box=element('article',null,'plan');box.append(element('h3',p.title+' 战术图'));
 const check=p.sourceCheck||{};const state=check.status==='current'?'检查时来源与快照一致':check.status==='update_available'?'来源已有变化，以下仍为最近完整快照':'暂未确认来源最新状态';
 box.append(element('p',`来源 revision ${p.revision} · ${p.steps.length} 个步骤`,'meta'));
 box.append(element('p',`快照生成时间：${time(p.capturedAt)} · 来源保存时间：${time(p.sourceSavedAt)}`,'meta muted'));
 box.append(element('p',`来源检查：${time(check.checkedAt)} · ${state}`,'meta muted'));
 const tabs=element('div',null,'steps');tabs.setAttribute('aria-label',p.title+' 战术步骤');const buttons=[];
 let image=element('img',null,'preview');
 const label=element('p',null,'meta');const status=element('p','预览等待加载…','status');status.setAttribute('aria-live','polite');
 const actions=element('div',null,'actions');const hd=element('a',null,'button');hd.target='_blank';hd.rel='noopener';const previewLink=element('a','放大预览','button');previewLink.target='_blank';previewLink.rel='noopener';const source=element('a','Raidplan 原图与全部步骤','button');source.href=p.sourceUrl;source.target='_blank';source.rel='noopener';const retry=element('button','重试预览');retry.type='button';let current,requestId=0,cancelImage=()=>{};
 function loadPreview(step,active=false,retryRequest=false){
  cancelImage();const id=++requestId;const next=element('img',null,'preview');
  next.alt=`${p.title} 战术图，步骤 ${step.step}`;next.width=step.preview.width;next.height=step.preview.height;
  next.loading=active||key==='m5'?'eager':'lazy';next.decoding='async';if(active||key==='m5')next.fetchPriority='high';
  next.dataset.loadState='loading';next.setAttribute('aria-busy','true');image.replaceWith(next);image=next;
  status.textContent=`正在加载步骤 ${step.step} 的预览…`;status.className='status';
  let slowTimer,timeoutTimer,observer,started=false,settled=false;
  const stillCurrent=()=>id===requestId&&!settled;
  function clearWaiting(){clearTimeout(slowTimer);clearTimeout(timeoutTimer);observer?.disconnect();}
  function fail(message){if(!stillCurrent())return;settled=true;clearWaiting();next.onload=null;next.onerror=null;next.removeAttribute('src');next.dataset.loadState='error';next.setAttribute('aria-busy','false');status.textContent=`步骤 ${step.step} ${message}，请重试预览或打开 Raidplan 原页。`;status.className='status error';}
  function startWaiting(){if(started||!stillCurrent())return;started=true;slowTimer=setTimeout(()=>{if(stillCurrent())status.textContent=`步骤 ${step.step} 加载较慢，可继续等待或重试预览。`;},8000);timeoutTimer=setTimeout(()=>fail('加载超时（45 秒）'),45000);}
  next.onload=async()=>{if(!stillCurrent())return;try{await next.decode();}catch{fail('图片解码失败');return;}if(!stillCurrent())return;settled=true;clearWaiting();next.dataset.loadState='loaded';next.setAttribute('aria-busy','false');status.textContent=`步骤 ${step.step} 预览已加载，可放大查看；高清仅在点击后请求。`;status.className='status';};
  next.onerror=()=>fail('预览加载失败');
  cancelImage=()=>{settled=true;clearWaiting();next.onload=null;next.onerror=null;next.removeAttribute('src');};
  if(active||key==='m5')startWaiting();else{observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))startWaiting();},{rootMargin:'200px'});observer.observe(next);}
  next.src=resource(step.preview.path)+(retryRequest?'?retry='+Date.now():'');
 }
 function select(step,active=true){current=step;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===step.step-1)));label.textContent=`步骤 ${step.step} · 预览 ${bytes(step.preview.bytes)}（${step.preview.width}×${step.preview.height}） · 高清 ${bytes(step.highResolution.bytes)}（${step.highResolution.width}×${step.highResolution.height}）`;hd.textContent=`查看高清 · ${bytes(step.highResolution.bytes)}`;hd.href=resource(step.highResolution.path);previewLink.href=resource(step.preview.path);loadPreview(step,active);}
 retry.addEventListener('click',()=>loadPreview(current,true,true));
 p.steps.forEach(s=>{const b=element('button','步骤 '+s.step);b.type='button';b.addEventListener('click',()=>select(s));buttons.push(b);tabs.append(b);});
 actions.append(previewLink,hd,source,retry);box.append(tabs,label,status,image,actions);select(p.steps[0],false);return box;}
let busy=false;async function refresh(){if(busy)return;busy=true;const button=document.getElementById('refresh');const status=document.getElementById('snapshot-status');button.disabled=true;status.textContent='正在读取已同步快照…';status.className='status';try{const u=new URL(manifestUrl);u.searchParams.set('v',Date.now());const response=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);const data=validate(await response.json());const views={};for(const key of expected)views[key]=planView(key,data.plans[key]);for(const key of expected)document.getElementById('plan-'+key).replaceChildren(views[key]);status.textContent='已读取网站当前发布的完整快照。此按钮不会触发重新截图。';}catch(error){status.textContent='读取失败，已显示的快照继续保留。请稍后重试；也可使用 Raidplan 原页。';status.className='status error';}finally{button.disabled=false;busy=false;}}
document.getElementById('refresh').addEventListener('click',refresh);refresh();
document.getElementById('copy-kook').addEventListener('click',async()=>{const s=document.getElementById('copy-status');try{await navigator.clipboard.writeText('63441611');s.textContent='已复制 KOOK 号码。';}catch{s.textContent='复制失败，请手动复制：63441611。';}});
