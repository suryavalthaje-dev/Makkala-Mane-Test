const $=id=>document.getElementById(id);
const TAB={celebrations:'Celebrations','fun-learning':'Fun & Learning',birthdays:'Birthdays','little-performers':'Little Performers',videos:'Videos'};
const TABLES={
  'activities-photos':'activities','activities-videos':'activities',
  'gallery-photos':'gallery_photos','feedback-reviews':'parent_reviews','feedback-videos':'parent_story_videos'
};
const isActivity=t=>t==='activities-photos'||t==='activities-videos';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(id,t,e=false){const el=$(id);if(!el)return;el.textContent=t;el.classList.remove('hidden');el.classList.toggle('error',e)}
function yid(u){const m=String(u||'').match(/(?:[?&]v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/);return m?m[1]:null}
function ytThumb(id){return id?'https://i.ytimg.com/vi/'+encodeURIComponent(id)+'/mqdefault.jpg':''}
function sorted(rows){return [...(rows||[])].sort((a,b)=>(a.display_order??0)-(b.display_order??0));}
async function queryTable(table, columns='*'){
  const {data,error}=await window.mmSupabase.from(table).select(columns).order('display_order',{ascending:true});
  if(error) throw error; return data||[];
}
async function reorder(table, filter, movingId, mode='last', afterId=null){
  let rows=await queryTable(table);
  if(filter) rows=rows.filter(filter);
  const moving=rows.find(x=>x.id===movingId);
  if(!moving) return;
  rows=rows.filter(x=>x.id!==movingId);
  let idx=rows.length;
  if(mode==='first') idx=0;
  else if(mode==='after' && afterId){const i=rows.findIndex(x=>x.id===afterId);if(i>=0)idx=i+1;}
  rows.splice(idx,0,moving);
  for(let i=0;i<rows.length;i++){
    const {error}=await window.mmSupabase.from(table).update({display_order:i,updated_at:new Date().toISOString()}).eq('id',rows[i].id);
    if(error) throw error;
  }
}
async function normalize(table, filter){
  let rows=await queryTable(table); if(filter) rows=rows.filter(filter);
  for(let i=0;i<rows.length;i++){
    if(rows[i].display_order!==i){const {error}=await window.mmSupabase.from(table).update({display_order:i,updated_at:new Date().toISOString()}).eq('id',rows[i].id);if(error)throw error;}
  }
}
async function uploadImage(file,folder){
  if(!file) throw new Error('Please choose a photo.');
  if(!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=folder+'/'+crypto.randomUUID()+'.'+ext;
  const {error}=await window.mmSupabase.storage.from(window.MM_STORAGE_BUCKET).upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
  if(error) throw error; return path;
}
async function removePath(path){if(!path)return;const {error}=await window.mmSupabase.storage.from(window.MM_STORAGE_BUCKET).remove([path]);if(error)console.warn('Storage cleanup failed:',error.message||error);}
function requireAdminSession(){return window.mmSupabase.auth.getSession();}
function item(type,x){
  const el=document.createElement('div');el.className='admin-item';
  const title=x.title||x.parent_name||'';
  let img;
  if(type==='activities-videos'||type==='feedback-videos') img='<img class="admin-thumb" src="'+ytThumb(x.youtube_id)+'" alt="">';
  else if(type==='feedback-reviews') img='<div class="admin-thumb" style="display:grid;place-items:center">💬</div>';
  else { const path=type==='gallery-photos'?x.storage_path:x.image_path; img='<img class="admin-thumb" src="'+esc(window.mmPublicUrl(path))+'?v='+encodeURIComponent(path||x.id)+'" alt="">'; }
  let meta='Order: '+((x.display_order??0)+1)+' · '+(
    type==='activities-photos'?'Photo · Section: '+(TAB[x.tab]||x.tab):
    type==='activities-videos'?'Video · Section: '+(TAB[x.tab]||x.tab):
    type==='gallery-photos'?'Gallery Photo':
    type==='feedback-videos'?'Parent Story Video':'Parent: '+x.parent_name
  );
  const extra=type==='feedback-reviews'?'<div class="feedback-preview">'+esc(x.review_text)+'</div>':'';
  el.innerHTML=img+'<div><div class="admin-title">'+esc(title)+'</div><div class="admin-meta">'+esc(meta)+'</div>'+extra+'</div>';
  const ac=document.createElement('div');ac.className='admin-item-actions';
  const eb=document.createElement('button');eb.className='admin-btn admin-secondary';eb.textContent='Edit';
  const db=document.createElement('button');db.className='admin-btn admin-danger';db.textContent='Delete';ac.append(eb,db);el.append(ac);
  eb.onclick=()=>edit(el,type,x); db.onclick=()=>deleteItem(type,x);
  return el;
}
async function deleteItem(type,x){
  if(!confirm('Delete this item?'))return;
  try{
    const table=TABLES[type]; const {error}=await window.mmSupabase.from(table).delete().eq('id',x.id); if(error)throw error;
    if(type==='activities-photos'||type==='gallery-photos') await removePath(type==='gallery-photos'?x.storage_path:x.image_path);
    const filter=isActivity(type)?(r=>r.tab===x.tab):null;
    await normalize(table,filter); await load();
  }catch(e){alert(e.message||String(e));}
}
function getItemsFor(type,tab){
  const d=window._adminData||{};
  if(type==='gallery-photos')return d.gallery||[];
  if(type==='feedback-reviews')return d.reviews||[];
  if(type==='feedback-videos')return d.feedbackVideos||[];
  if(type==='activities-photos')return (d.activities||[]).filter(x=>x.media_type==='photo'&&x.tab===tab);
  return (d.activities||[]).filter(x=>x.media_type==='video'&&x.tab===tab);
}
function makeAfter(select,wrap,items,excludeId){
  const arr=(items||[]).filter(x=>x.id!==excludeId);select.innerHTML=arr.length?arr.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title||x.parent_name||'Untitled')+'</option>').join(''):'<option value="">No existing items</option>';
  const form=select.closest('form');
  const modeEl=form?.elements?.orderMode || form?.querySelector('select[id$=\"OrderMode\"]');
  wrap.classList.toggle('hidden',(modeEl?.value || 'last')!=='after');
}
function setupOrder(modeId,afterId,wrapId,kind,tab){
  const mode=$(modeId),after=$(afterId),wrap=$(wrapId); if(!mode)return;
  const fill=()=>makeAfter(after,wrap,getItemsFor(kind,tab)); mode.onchange=fill;fill();
}
function refreshOrderSelectors(){
  setupOrder('photoOrderMode','photoAfter','photoAfterWrap','activities-photos',$('photoTab').value);
  setupOrder('videoOrderMode','videoAfter','videoAfterWrap','activities-videos',$('videoTab').value);
  setupOrder('galleryOrderMode','galleryAfter','galleryAfterWrap','gallery-photos');
  setupOrder('feedbackOrderMode','feedbackAfter','feedbackAfterWrap','feedback-reviews');
  setupOrder('feedbackVideoOrderMode','feedbackVideoAfter','feedbackVideoAfterWrap','feedback-videos');
}
function orderPayload(form){
  const modeEl=form?.elements?.orderMode || form?.querySelector('select[id$="OrderMode"]');
  const afterEl=form?.elements?.afterId || form?.querySelector('select[id$="After"]');
  return {mode:modeEl?.value || 'last', afterId:afterEl?.value || null};
}
async function addActivityPhoto(){const f=$('photoFile').files[0];const tab=$('photoTab').value,title=$('photoTitle').value.trim();if(!title||!f)throw new Error('Section, title and photo are required');const path=await uploadImage(f,'activities');const {data,error}=await window.mmSupabase.from('activities').insert({title,media_type:'photo',image_path:path,tab,display_order:999999}).select().single();if(error){await removePath(path);throw error;}await reorder('activities',x=>x.media_type==='photo'&&x.tab===tab,data.id,orderPayload($('photoForm')).mode,orderPayload($('photoForm')).afterId);}
async function addActivityVideo(){const title=$('videoTitle').value.trim(),url=$('videoUrl').value.trim(),tab=$('videoTab').value,vid=yid(url);if(!title||!vid)throw new Error('Title and valid YouTube URL are required');const {data,error}=await window.mmSupabase.from('activities').insert({title,media_type:'video',youtube_id:vid,youtube_url:url,tab,display_order:999999}).select().single();if(error)throw error;await reorder('activities',x=>x.media_type==='video'&&x.tab===tab,data.id,orderPayload($('videoForm')).mode,orderPayload($('videoForm')).afterId);}
async function addGallery(){const f=$('galleryFile').files[0],title=$('galleryTitle').value.trim();if(!title||!f)throw new Error('Title and photo are required');const path=await uploadImage(f,'gallery');const {data,error}=await window.mmSupabase.from('gallery_photos').insert({title,storage_path:path,display_order:999999}).select().single();if(error){await removePath(path);throw error;}await reorder('gallery_photos',null,data.id,orderPayload($('galleryForm')).mode,orderPayload($('galleryForm')).afterId);}
async function addReview(){const name=$('feedbackName').value.trim(),review=$('feedbackText').value.trim();if(!name||!review)throw new Error('Parent name and review are required');const {data,error}=await window.mmSupabase.from('parent_reviews').insert({parent_name:name,review_text:review,display_order:999999}).select().single();if(error)throw error;await reorder('parent_reviews',null,data.id,orderPayload($('feedbackForm')).mode,orderPayload($('feedbackForm')).afterId);}
async function addFeedbackVideo(){const title=$('feedbackVideoTitle').value.trim(),url=$('feedbackVideoUrl').value.trim(),vid=yid(url);if(!title||!vid)throw new Error('Video title and valid YouTube URL are required');const {data,error}=await window.mmSupabase.from('parent_story_videos').insert({title,youtube_url:url,youtube_id:vid,display_order:999999}).select().single();if(error)throw error;await reorder('parent_story_videos',null,data.id,orderPayload($('feedbackVideoForm')).mode,orderPayload($('feedbackVideoForm')).afterId);}
function edit(el,type,x){
 if(el.querySelector('.admin-edit'))return; const f=document.createElement('form');f.className='admin-edit admin-form';
 if(type==='activities-photos')f.innerHTML='<label>Section<select name="tab">'+Object.entries(TAB).filter(a=>a[0]!=='videos').map(a=>'<option value="'+a[0]+'" '+(a[0]===x.tab?'selected':'')+'>'+a[1]+'</option>').join('')+'</select></label><label>Title<input name="title" value="'+esc(x.title)+'" required></label><label>Replace Photo (optional)<input name="file" type="file" accept="image/*"></label>';
 else if(type==='activities-videos')f.innerHTML='<label>Section<select name="tab">'+Object.entries(TAB).map(a=>'<option value="'+a[0]+'" '+(a[0]===x.tab?'selected':'')+'>'+a[1]+'</option>').join('')+'</select></label><label>Title<input name="title" value="'+esc(x.title)+'" required></label><label>YouTube URL<input name="url" value="'+esc(x.youtube_url)+'" required></label>';
 else if(type==='gallery-photos')f.innerHTML='<label>Title<input name="title" value="'+esc(x.title)+'" required></label><label>Replace Photo (optional)<input name="file" type="file" accept="image/*"></label>';
 else if(type==='feedback-reviews')f.innerHTML='<label>Parent / Name<input name="name" value="'+esc(x.parent_name)+'" required maxlength="100"></label><label>Complete Review<textarea name="review" required maxlength="3000">'+esc(x.review_text)+'</textarea></label>';
 else f.innerHTML='<label>Video Title<input name="title" value="'+esc(x.title)+'" required maxlength="150"></label><label>YouTube URL<input name="url" value="'+esc(x.youtube_url)+'" required></label>';
 f.innerHTML+='<label>Display Order<select name="orderMode"><option value="first">First</option><option value="last" selected>Last</option><option value="after">After Specific Existing Title</option></select></label><label class="edit-after-wrap hidden">After<select name="afterId"></select></label><div class="admin-actions"><button class="admin-btn admin-primary">Save Changes</button><button type="button" class="admin-btn admin-secondary cancel-edit">Cancel</button></div>';
 el.append(f); const mode=f.elements.orderMode,after=f.elements.afterId,wrap=f.querySelector('.edit-after-wrap');
 const fill=()=>{let tab=f.elements.tab?f.elements.tab.value:null;makeAfter(after,wrap,getItemsFor(type,tab),x.id);}; fill(); mode.onchange=()=>makeAfter(after,wrap,getItemsFor(type,f.elements.tab?f.elements.tab.value:null),x.id); if(f.elements.tab)f.elements.tab.onchange=()=>makeAfter(after,wrap,getItemsFor(type,f.elements.tab.value),x.id);
 f.querySelector('.cancel-edit').onclick=()=>f.remove();
 f.onsubmit=async e=>{e.preventDefault();try{
   const table=TABLES[type], oldTab=x.tab, newTab=f.elements.tab?f.elements.tab.value:null; let update={};
   if(type==='feedback-reviews'){update={parent_name:f.elements.name.value.trim(),review_text:f.elements.review.value.trim()};if(!update.parent_name||!update.review_text)throw new Error('Parent name and review are required');}
   else if(type==='feedback-videos'){const url=f.elements.url.value.trim(),vid=yid(url);if(!f.elements.title.value.trim()||!vid)throw new Error('Video title and valid YouTube URL are required');update={title:f.elements.title.value.trim(),youtube_url:url,youtube_id:vid};}
   else if(type==='activities-videos'){const url=f.elements.url.value.trim(),vid=yid(url);if(!f.elements.title.value.trim()||!vid)throw new Error('Title and valid YouTube URL are required');update={title:f.elements.title.value.trim(),tab:newTab,youtube_url:url,youtube_id:vid};}
   else if(type==='activities-photos'){update={title:f.elements.title.value.trim(),tab:newTab};}
   else update={title:f.elements.title.value.trim()};
   let newPath=null,oldPath=(type==='gallery-photos'?x.storage_path:x.image_path)||null;
   if(type==='activities-photos'||type==='gallery-photos'){const file=f.elements.file.files[0];if(file){newPath=await uploadImage(file,type==='gallery-photos'?'gallery':'activities');if(type==='gallery-photos')update.storage_path=newPath; else update.image_path=newPath;}}
   update.updated_at=new Date().toISOString(); const {error}=await window.mmSupabase.from(table).update(update).eq('id',x.id);if(error){if(newPath)await removePath(newPath);throw error;}
   if(newPath&&oldPath)await removePath(oldPath);
   const modeVal=mode.value,afterVal=after.value||null;
   if(type==='activities-photos'||type==='activities-videos'){
     await reorder('activities',r=>r.media_type===(type==='activities-photos'?'photo':'video')&&r.tab===newTab,x.id,modeVal,afterVal);
     if(oldTab!==newTab)await normalize('activities',r=>r.media_type===(type==='activities-photos'?'photo':'video')&&r.tab===oldTab);
   }else await reorder(table,null,x.id,modeVal,afterVal);
   await load();
 }catch(e){alert(e.message||String(e));}};
}
function section(list,title,desc,items){const s=document.createElement('section');s.className='admin-section';s.innerHTML='<div class="admin-section-head"><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p></div>';const b=document.createElement('div');items.forEach(x=>b.append(item(x[0],x[1])));if(!items.length)b.innerHTML='<div class="admin-empty">No content in this section.</div>';s.append(b);list.append(s);}
function render(d){
 window._adminData=d; const l=$('activityList');l.innerHTML=''; const photos=(d.activities||[]).filter(x=>x.media_type==='photo'),videos=(d.activities||[]).filter(x=>x.media_type==='video');
 [['celebrations','Celebrations',photos],['fun-learning','Fun & Learning',photos],['birthdays','Birthdays',photos],['little-performers','Little Performers',photos],['videos','Videos',videos]].forEach(g=>section(l,g[1],'Activities & Events → '+g[1],g[2].filter(x=>x.tab===g[0]).map(x=>[g[0]==='videos'?'activities-videos':'activities-photos',x])));
 const c=document.createElement('div');c.className='admin-meta';c.textContent=(photos.length+videos.length)+' Activities & Events item'+(photos.length+videos.length===1?'':'s')+' published';l.prepend(c);
 const gl=$('galleryList');gl.innerHTML='';(d.gallery||[]).forEach(x=>gl.append(item('gallery-photos',x)));if(!(d.gallery||[]).length)gl.innerHTML='<div class="admin-empty">No Gallery photos.</div>';
 const fl=$('feedbackList'),fvl=$('feedbackVideoList');fl.innerHTML='';fvl.innerHTML='';(d.reviews||[]).forEach(x=>fl.append(item('feedback-reviews',x)));(d.feedbackVideos||[]).forEach(x=>fvl.append(item('feedback-videos',x)));if(!(d.reviews||[]).length)fl.innerHTML='<div class="admin-empty">No text reviews.</div>';if(!(d.feedbackVideos||[]).length)fvl.innerHTML='<div class="admin-empty">No parent story videos.</div>';
}
async function load(){
 try{
   const [a,g,r,v,w]=await Promise.all([
     queryTable('activities'),queryTable('gallery_photos'),queryTable('parent_reviews'),queryTable('parent_story_videos'),window.mmSupabase.from('website_photos').select('*')
   ]);
   if(w.error)throw w.error;
   render({activities:a,gallery:g,reviews:r,feedbackVideos:v,websitePhotos:w.data||[]});refreshOrderSelectors();
 }catch(e){alert('Could not load Supabase content: '+(e.message||e));}
}
async function getImageDimensions(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve({width:img.naturalWidth,height:img.naturalHeight});};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read the selected image.'));};
    img.src=url;
  });
}
async function confirmWebsiteImageRatio(kind,file,label){
  if(kind!=='home'&&kind!=='latest_update') return true;
  const {width,height}=await getImageDimensions(file);
  const ratio=width/height;
  const target=16/10;
  const matches=Math.abs(ratio-target)<=0.015;
  if(matches) return true;
  const actual=(width/height).toFixed(2);
  return confirm(
    label+' has a different aspect ratio.\n\n'+
    'Selected image: '+width+' × '+height+' px (ratio '+actual+':1)\n'+
    'Recommended for the Home page: 1600 × 1000 px (16:10).\n\n'+
    'If you continue, the image may be cropped when displayed.\n\n'+
    'Click OK to use this image anyway, or Cancel to keep the current image.'
  );
}
async function replaceWebsitePhoto(kind,file,msgId,previewId,label){
  try{
    if(!file)throw new Error('Please choose a photo.');
    const ratioConfirmed=await confirmWebsiteImageRatio(kind,file,label);
    if(!ratioConfirmed)return;
    if(!confirm('Replace the current '+label+'? The new photo will become the permanent website version stored in Supabase.'))return;
    const path=await uploadImage(file,'website');
    const old=window._websitePhotoMap?.[kind]?.storage_path||null;
    const {error}=await window.mmSupabase.from('website_photos').upsert({photo_key:kind,storage_path:path,alt_text:label,updated_at:new Date().toISOString()});
    if(error){await removePath(path);throw error;}
    if(old&&old!==path)await removePath(old);
    const img=$(previewId);if(img)img.src=window.mmPublicUrl(path)+'?v='+Date.now();
    msg(msgId,label+' changed successfully.');
    await refreshWebsiteMap();
  }catch(e){msg(msgId,e.message||String(e),true)}
}
async function replaceTeamPhoto(kind,file,msgId,previewId){return replaceWebsitePhoto(kind,file,msgId,previewId,kind==='principal'?'Principal photo':'Staff photo');}
async function refreshWebsiteMap(){const {data,error}=await window.mmSupabase.from('website_photos').select('photo_key,storage_path,alt_text');if(error)throw error;window._websitePhotoMap={};(data||[]).forEach(x=>window._websitePhotoMap[x.photo_key]=x);}
async function init(){
  const {data:{session}}=await window.mmSupabase.auth.getSession();
  if(session){$('loginView').classList.add('hidden');$('dashboard').classList.remove('hidden');await refreshWebsiteMap();load();}
  window.mmSupabase.auth.onAuthStateChange((event,session)=>{if(session){$('loginView').classList.add('hidden');$('dashboard').classList.remove('hidden');refreshWebsiteMap().then(load);}else{$('dashboard').classList.add('hidden');$('loginView').classList.remove('hidden');}});
}
$('loginForm').onsubmit=async e=>{e.preventDefault();try{const email=$('email').value.trim(),password=$('password').value;const {error}=await window.mmSupabase.auth.signInWithPassword({email,password});if(error)throw error;}catch(e){msg('loginMsg',e.message||String(e),true)}};
$('logout').onclick=async()=>{await window.mmSupabase.auth.signOut()};
$('refreshA').onclick=load;$('refreshG').onclick=load;$('refreshF').onclick=load;
$('photoTab').onchange=refreshOrderSelectors;$('videoTab').onchange=refreshOrderSelectors;
document.querySelectorAll('.admin-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const panel=btn.dataset.panel;
    document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('.admin-panel').forEach(p=>p.classList.toggle('active',p.id===panel));
    if(panel==='teamPhotos'||panel==='websitePhotos') refreshWebsiteMap().catch(e=>console.warn(e));
  });
});
$('photoForm').onsubmit=async e=>{e.preventDefault();try{await addActivityPhoto();msg('photoMsg','Photo published successfully.');e.target.reset();await load();}catch(e){msg('photoMsg',e.message||String(e),true)}};
$('videoForm').onsubmit=async e=>{e.preventDefault();try{await addActivityVideo();msg('videoMsg','Video published successfully.');e.target.reset();await load();}catch(e){msg('videoMsg',e.message||String(e),true)}};
$('galleryForm').onsubmit=async e=>{e.preventDefault();try{await addGallery();msg('galleryMsg','Gallery photo published successfully.');e.target.reset();await load();}catch(e){msg('galleryMsg',e.message||String(e),true)}};
$('feedbackForm').onsubmit=async e=>{e.preventDefault();try{await addReview();msg('feedbackMsg','Text review published successfully.');e.target.reset();await load();}catch(e){msg('feedbackMsg',e.message||String(e),true)}};
$('feedbackVideoForm').onsubmit=async e=>{e.preventDefault();try{await addFeedbackVideo();msg('feedbackVideoMsg','Parent story video published successfully.');e.target.reset();await load();}catch(e){msg('feedbackVideoMsg',e.message||String(e),true)}};
$('principalPhotoForm').onsubmit=async e=>{e.preventDefault();await replaceTeamPhoto('principal',$('principalPhotoFile').files[0],'principalPhotoMsg','principalPhotoPreview');e.target.reset()};
$('staffPhotoForm').onsubmit=async e=>{e.preventDefault();await replaceTeamPhoto('staff',$('staffPhotoFile').files[0],'staffPhotoMsg','staffPhotoPreview');e.target.reset()};
$('websiteLogoForm').onsubmit=async e=>{e.preventDefault();await replaceWebsitePhoto('logo',$('websiteLogoFile').files[0],'websiteLogoMsg','websiteLogoPreview','Website logo');e.target.reset()};
$('homePhotoForm').onsubmit=async e=>{e.preventDefault();await replaceWebsitePhoto('home',$('homePhotoFile').files[0],'homePhotoMsg','homePhotoPreview','Home Page photo');e.target.reset()};
$('aboutPhotoForm').onsubmit=async e=>{e.preventDefault();await replaceWebsitePhoto('about',$('aboutPhotoFile').files[0],'aboutPhotoMsg','aboutPhotoPreview','About Us photo');e.target.reset()};
$('latestUpdateForm').onsubmit=async e=>{e.preventDefault();await replaceWebsitePhoto('latest_update',$('latestUpdateFile').files[0],'latestUpdateMsg','latestUpdatePreview','Latest Updates image');e.target.reset()};
$('principalPhotoPreview').src='../assets/images/principal-actual.png';$('staffPhotoPreview').src='../assets/images/staff-actual.png';
init();
