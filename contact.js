const footerMotion=document.querySelector('#footer-motion');
const primaryMotion=document.querySelector('#motion-toggle');
function syncFooterMotion(){const active=!document.body.classList.contains('motion-paused');footerMotion.textContent=active?'Motion on ◉':'Motion off ○';footerMotion.setAttribute('aria-pressed',String(active))}
footerMotion.addEventListener('click',()=>primaryMotion.click());
new MutationObserver(syncFooterMotion).observe(document.body,{attributes:true,attributeFilter:['class']});
syncFooterMotion();
