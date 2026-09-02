/* Makkala Mane - Supabase client configuration */
(function(){
  const SUPABASE_URL = "https://siexwfxaudlhdvvnysym.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KIA3MvymT4UATI3upUvUvg_-jA7XLPn";
  const BUCKET = "website-images";
  window.MM_SUPABASE_URL = SUPABASE_URL;
  window.MM_STORAGE_BUCKET = BUCKET;
  window.mmSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  function publicUrl(path){
    if(!path) return "";
    return window.mmSupabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  window.mmPublicUrl = publicUrl;

  async function loadWebsitePhotos(){
    const {data,error}=await window.mmSupabase.from('website_photos').select('photo_key,storage_path,alt_text');
    if(error) throw error;
    const map={};
    (data||[]).forEach(x=>map[x.photo_key]={url:publicUrl(x.storage_path),alt:x.alt_text||''});
    document.querySelectorAll('[data-mm-photo]').forEach(img=>{
      const key=img.getAttribute('data-mm-photo');
      const x=map[key];
      if(x && x.url){img.src=x.url+'?v='+encodeURIComponent(x.storage_path);if(x.alt)img.alt=x.alt;}
    });
    return map;
  }
  document.addEventListener('DOMContentLoaded',function(){
    loadWebsitePhotos().catch(function(e){console.warn('Supabase website photos could not be loaded:',e.message||e);});
  });
})();
