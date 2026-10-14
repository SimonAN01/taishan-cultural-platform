import images from './image-assets.json';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export {images};
export const imageById = new Map(images.map(image => [image.id,image]));
export const artUrl = id => imageById.has(id) ? import.meta.env.BASE_URL + imageById.get(id).url : null;

export function openArtGallery(showDialog, openPlace) {
  showDialog(`<p class="dialog-eyebrow">LANDSCAPES IN INK</p><h2 id="detail-title">山水画卷</h2><p class="art-intro">从远山、云海到门阙与古道，在 ${images.length} 幅画境里读泰山。画面为艺术化概念演绎；实景照片可在完整导览中查看。</p><div class="art-filters" aria-label="画卷分类">${['全部','山水','建筑','点景'].map(category=>`<button data-art-filter="${category}" aria-pressed="${category==='全部'}">${category}</button>`).join('')}</div><div class="art-grid"></div>`, 'art');
  const host=document.querySelector('.dialog-content'), grid=host.querySelector('.art-grid');
  function render(category) {
    const selected=images.filter(image=>category==='全部'||image.category===category);
    grid.innerHTML=selected.map(image=>`<button class="art-card" data-art-id="${image.id}"><img src="${artUrl(image.id)}" alt="${escape(image.label)} · 艺术化画境" width="${image.width}" height="${image.height}" loading="lazy"><span>${escape(image.label)}</span><small>${image.spot_id?'走近此景 ↗':'展开画卷 ↗'}</small></button>`).join('');
    host.querySelectorAll('[data-art-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.artFilter===category)));
  }
  host.querySelector('.art-filters').onclick=event=>{const button=event.target.closest('[data-art-filter]');if(button)render(button.dataset.artFilter)};
  grid.onclick=event=>{
    const button=event.target.closest('[data-art-id]');if(!button)return;
    const image=imageById.get(button.dataset.artId);
    if(image.spot_id) { document.querySelector('.detail-dialog').close(); openPlace(image.spot_id); return; }
    showDialog(`<p class="dialog-eyebrow">LANDSCAPE STUDY</p><h2 id="detail-title">${escape(image.label)}</h2><img class="art-expanded" src="${artUrl(image.id)}" alt="${escape(image.label)} · 艺术化画境" width="${image.width}" height="${image.height}"><p class="art-intro">画卷以建筑、山石与云气表达景观意境，具体形制与位置为概念演绎。</p><button id="art-back">← 回到山水画卷</button>`, 'art');
    document.querySelector('#art-back').onclick=()=>openArtGallery(showDialog,openPlace);
  };
  render('全部');
}
