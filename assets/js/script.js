document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      nav.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false");
    }));
  }
  const form = document.querySelector("form[onsubmit]");
  if (form) window.sendWhatsApp = function(event) {
    event.preventDefault();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const program = document.getElementById("program").value;
    const message = document.getElementById("message").value.trim();
    const text = `Hello Makkala Mane,%0A%0AParent/Guardian: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0AProgram: ${encodeURIComponent(program)}%0AMessage: ${encodeURIComponent(message || "I would like to know more.")}`;
    window.open(`https://wa.me/919686940988?text=${text}`, "_blank", "noopener");
    return false;
  };
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  if (lightbox && lightboxImage) {
    const close = () => { lightbox.classList.remove("open"); lightbox.setAttribute("aria-hidden","true"); document.body.classList.remove("no-scroll"); lightboxImage.src=""; };
    document.querySelectorAll(".gallery-page-item").forEach(item => item.addEventListener("click", () => {
      lightboxImage.src=item.dataset.full; lightboxImage.alt=item.querySelector("img").alt; lightboxCaption.textContent=item.dataset.caption||""; lightbox.classList.add("open"); lightbox.setAttribute("aria-hidden","false"); document.body.classList.add("no-scroll");
    }));
    const closeBtn=document.querySelector(".lightbox-close"); if(closeBtn) closeBtn.addEventListener("click",close);
    lightbox.addEventListener("click",e=>{if(e.target===lightbox)close();}); document.addEventListener("keydown",e=>{if(e.key==="Escape"&&lightbox.classList.contains("open"))close();});
  }
});

// YouTube thumbnail: load the embedded player only after the visitor clicks.
// Only ONE embedded YouTube player is allowed to exist at a time.
var activeYouTubeFrame = null;

function restoreYouTubeThumbnail(frame) {
  if (!frame || !frame.parentNode) return;
  var id = frame.getAttribute('data-youtube-id');
  var title = frame.getAttribute('data-video-title') || frame.title || 'Makkala Mane YouTube video';

  var button = document.createElement('button');
  button.className = 'youtube-thumb';
  button.type = 'button';
  button.setAttribute('aria-label', title);
  button.setAttribute('data-youtube-id', id);
  button.innerHTML =
    '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg" alt="' +
    title.replace(/"/g, '&quot;') + ' video thumbnail">' +
    '<span class="youtube-play" aria-hidden="true">▶</span>';

  frame.replaceWith(button);
  attachYouTubeButton(button);
}

function stopActiveYouTube() {
  // Removing the iframe is intentional: it guarantees that the previous
  // YouTube player is destroyed and cannot continue playing in the background.
  if (activeYouTubeFrame) {
    var oldFrame = activeYouTubeFrame;
    activeYouTubeFrame = null;
    restoreYouTubeThumbnail(oldFrame);
  }

  // Safety cleanup in case more than one player was created previously.
  document.querySelectorAll('.youtube-player').forEach(function(frame) {
    if (frame !== activeYouTubeFrame) {
      frame.src = 'about:blank';
      if (frame.parentNode) restoreYouTubeThumbnail(frame);
    }
  });
}

function attachYouTubeButton(button) {
  if (!button || button.dataset.youtubeBound === 'true') return;
  button.dataset.youtubeBound = 'true';

  button.addEventListener('click', function() {
    var id = button.getAttribute('data-youtube-id');
    var title = button.getAttribute('aria-label') || 'Makkala Mane YouTube video';

    // Always stop/destroy the previous embedded player first.
    stopActiveYouTube();

    // A local file (file://) has no HTTP Referer, so YouTube blocks
    // embedded playback with Error 153. During local preview, open the
    // normal YouTube watch page. Once hosted on GitHub Pages,
    // the same click loads the video directly inside the website.
    if (window.location.protocol === 'file:') {
      window.open('https://www.youtube.com/watch?v=' + encodeURIComponent(id), '_blank', 'noopener');
      return;
    }

    var frame = document.createElement('iframe');
    frame.className = 'youtube-player';
    frame.setAttribute('data-youtube-id', id);
    frame.setAttribute('data-video-title', title);
    var origin = encodeURIComponent(window.location.origin);
    frame.src = 'https://www.youtube.com/embed/' + encodeURIComponent(id) +
      '?autoplay=1&rel=0&enablejsapi=1&origin=' + origin;
    frame.title = title;
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.allowFullscreen = true;

    activeYouTubeFrame = frame;
    button.replaceWith(frame);
  });
}

document.querySelectorAll('.youtube-thumb[data-youtube-id]').forEach(attachYouTubeButton);


// Team photographs: open the original supplied image at large size.
document.addEventListener('DOMContentLoaded', function(){
  var box=document.getElementById('teamPhotoLightbox');
  var image=document.getElementById('teamPhotoLightboxImage');
  var closeBtn=document.getElementById('teamPhotoClose');
  if(!box || !image) return;
  var photos=document.querySelectorAll('.principal-body img, .staff-body img');
  function close(){box.classList.remove('open');document.body.classList.remove('no-scroll');image.src='';}
  photos.forEach(function(photo){photo.addEventListener('click',function(){image.src=photo.currentSrc||photo.src;image.alt=photo.alt||'';box.classList.add('open');document.body.classList.add('no-scroll');if(closeBtn) closeBtn.focus();});});
  if(closeBtn) closeBtn.addEventListener('click',close);
  box.addEventListener('click',function(e){if(e.target===box) close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape' && box.classList.contains('open')) close();});
});
