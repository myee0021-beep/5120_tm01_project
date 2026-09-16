(function(){
'use strict';
function currentPage(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
function applyHomeRedesign(){
  if(currentPage()!=='index')return;
  var page=document.getElementById('index__page-home');
  if(!page||page.dataset.upload0916==='1')return;
  var hero=page.querySelector(':scope > section');
  if(!hero)return;
  var content=hero.querySelector('.relative.z-20.max-w-5xl.mx-auto.px-6.text-left')||hero.querySelector('.relative.z-20');
  if(content){
    content.innerHTML='<p class="reveal in-view text-xs font-bold tracking-[0.16em] uppercase text-emerald-200"><span data-en>Coexistence planning for Malaysian homes</span><span data-bm>Perancangan kewujudan bersama untuk rumah di Malaysia</span></p>'+
      '<h1 class="reveal in-view font-display mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl"><span data-en>Wild animals visit Malaysian homes. Which situation is yours?</span><span data-bm>Haiwan liar mengunjungi rumah di Malaysia. Situasi yang manakah milik anda?</span></h1>'+
      '<p class="reveal in-view mt-6 text-lg text-slate-200 max-w-2xl leading-relaxed"><span data-en>Clear, practical next steps for people and wildlife to share space safely.</span><span data-bm>Langkah seterusnya yang jelas dan praktikal agar manusia serta hidupan liar dapat berkongsi ruang dengan selamat.</span></p>';
  }
  Array.from(page.children).forEach(function(child){if(child!==hero)child.remove();});
  var section=document.createElement('section');
  section.className='bg-[#f8faf8] py-12 md:py-16';
  section.id='i2-home-three-doors';
  section.innerHTML='<div class="max-w-6xl mx-auto px-6">'+
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-5">'+
      '<a href="emergency.html" class="group rounded-2xl border border-rose-200 bg-rose-50 p-7 transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-900/10"><p class="text-sm font-bold text-rose-600"><span data-en>An animal is here now</span><span data-bm>Haiwan berada di sini sekarang</span></p><p class="mt-3 text-sm leading-relaxed text-slate-600"><span data-en>Safety steps first, then keep it findable and know who to call.</span><span data-bm>Utamakan langkah keselamatan, kemudian pastikan ia mudah ditemui dan ketahui siapa perlu dihubungi.</span></p><span class="mt-7 inline-flex items-center gap-2 text-sm font-bold text-rose-600"><span data-en>Open Emergency</span><span data-bm>Buka Kecemasan</span><span aria-hidden="true">→</span></span></a>'+
      '<a href="plan.html" class="group rounded-2xl border border-emerald-300 bg-emerald-300 p-7 transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/10"><p class="text-sm font-bold text-[#0b130e]"><span data-en>One keeps coming back</span><span data-bm>Seekor haiwan terus kembali</span></p><p class="mt-3 text-sm leading-relaxed text-[#1b4332]"><span data-en>A few questions about your home, then a practical plan with a source on every line.</span><span data-bm>Beberapa soalan tentang rumah anda, kemudian pelan praktikal dengan sumber pada setiap baris.</span></p><span class="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0b130e]"><span data-en>Start my plan</span><span data-bm>Mulakan pelan saya</span><span aria-hidden="true">→</span></span></a>'+
      '<a href="ecosystem.html" class="group rounded-2xl border border-blue-100 bg-blue-50 p-7 transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-950/10"><p class="text-sm font-bold text-blue-700"><span data-en>I am moving somewhere new</span><span data-bm>Saya berpindah ke tempat baharu</span></p><p class="mt-3 text-sm leading-relaxed text-slate-600"><span data-en>Explore the ecosystem map, then choose a state to see what is recorded there.</span><span data-bm>Terokai peta ekosistem, kemudian pilih negeri untuk melihat rekod di sana.</span></p><span class="mt-7 inline-flex items-center gap-2 text-sm font-bold text-blue-700"><span data-en>See the ecosystem map</span><span data-bm>Lihat peta ekosistem</span><span aria-hidden="true">→</span></span></a>'+
    '</div>'+
    '<nav class="mt-6 flex flex-wrap gap-2.5" aria-label="Home links">'+
      '<a href="ecosystem.html" class="rounded-full border border-[#1b4332]/20 bg-white px-4 py-2 text-xs font-semibold text-[#1b4332] transition-colors hover:bg-[#1b4332] hover:text-white"><span data-en>Map</span><span data-bm>Peta</span></a>'+
      '<a href="ecosystem-redlist.html" class="rounded-full border border-[#1b4332]/20 bg-white px-4 py-2 text-xs font-semibold text-[#1b4332] transition-colors hover:bg-[#1b4332] hover:text-white"><span data-en>Red List and status</span><span data-bm>Senarai Merah dan status</span></a>'+
      '<a href="community-how-review-works.html" class="rounded-full border border-[#1b4332]/20 bg-white px-4 py-2 text-xs font-semibold text-[#1b4332] transition-colors hover:bg-[#1b4332] hover:text-white"><span data-en>Community</span><span data-bm>Komuniti</span></a>'+
      '<a href="about-the-data.html" class="rounded-full border border-[#1b4332]/20 bg-white px-4 py-2 text-xs font-semibold text-[#1b4332] transition-colors hover:bg-[#1b4332] hover:text-white"><span data-en>About the data</span><span data-bm>Tentang data</span></a>'+
    '</nav>'+
    '<aside class="mt-6 rounded-xl bg-emerald-50 px-5 py-4 text-sm leading-relaxed text-[#1b4332]" aria-label="Privacy statement"><span data-en>No account. No location detection. You choose a state inside the plan. Your answers are never stored.</span><span data-bm>Tiada akaun. Tiada pengesanan lokasi. Anda memilih negeri di dalam pelan. Jawapan anda tidak pernah disimpan.</span></aside>'+
  '</div>';
  page.appendChild(section);
  page.dataset.upload0916='1';
  try{if(typeof window.applyLanguage==='function')window.applyLanguage();}catch(e){}
  document.dispatchEvent(new Event('roomforboth:pageshow'));
}
function run(){setTimeout(applyHomeRedesign,0);setTimeout(applyHomeRedesign,80);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
window.addEventListener('hashchange',run);
document.addEventListener('roomforboth:pageshow',function(){if(currentPage()==='index')setTimeout(applyHomeRedesign,0);});
})();