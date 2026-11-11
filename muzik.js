// Müzik yönetimi (pilot): parçalar, müzik listeleri, mağaza cihazları ve zamanlama.
// Ana yönetim sayfasının (index.html) ortak yardımcılarını kullanır: sb, $, $$, esc, toast, chk, modal, closeModal, head, view, go, slug, ago, DAYS.
// Dosyalar 'signage' kovasında muzik/ altında durur. Oynatıcı: muzik/?c=KOD (dosyaları önbelleğe alır, internet kesilse de çalar).
const M_ONLINE = 3;
let MZ = { tracks:[], lists:[], items:[], players:[], sched:[] };
let mview = { list:null, q:'' };

ICON.mdash = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="14" r="3.5"/><circle cx="12" cy="7" r="1"/></svg>';
ICON.mtracks = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';
ICON.mlists = ICON.lists;
ICON.msched = ICON.sched;
PAGES.push(['mdash','Müzik cihazları'], ['mtracks','Parçalar'], ['mlists','Müzik listeleri'], ['msched','Müzik zamanlama']);
window.MUZIK_SAYFA = { mdash:pMDash, mtracks:pMTracks, mlists:pMLists, msched:pMSched };
window.MUZIK_SAYI = () => ({ mdash:`${MZ.players.filter(p=>mStatus(p)==='on').length}/${MZ.players.length}`, mtracks:MZ.tracks.length, mlists:MZ.lists.length, msched:MZ.sched.length });

window.muzikYukle = async function(){
  const [t,l,i,p,s] = await Promise.all([
    sb.from('music_tracks').select('*').order('created_at',{ascending:false}),
    sb.from('music_playlists').select('*').order('name'),
    sb.from('music_playlist_items').select('*').order('position'),
    sb.from('music_players').select('*').order('store').order('name'),
    sb.from('music_schedules').select('*').order('priority',{ascending:false}),
  ]);
  if (t.error) return;
  MZ = { tracks:t.data, lists:l.data, items:i.data, players:p.data, sched:s.data };
};

const mStatus = p => !p.last_seen ? 'never' : (Date.now() - new Date(p.last_seen)) / 60000 < M_ONLINE ? 'on' : 'off';
const mTag = p => { const k = mStatus(p); return `<span class="st ${k}">${k === 'off' ? 'Son bağlantı ' + ago(p.last_seen) : STATUS_TXT[k]}</span>`; };
const mItems = lid => MZ.items.filter(i => i.playlist_id === lid).sort((a,b) => a.position - b.position);
const mLname = id => (byId(MZ.lists, id) || {}).name || '—';
const mTrack = id => byId(MZ.tracks, id) || {};
const dk = s => s ? `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}` : '–';
const mb = b => b ? (b/1048576).toFixed(1) + ' MB' : '';
const mPlayerUrl = p => new URL('muzik/?c=' + p.code, location.href.split('#')[0].split('?')[0]).href;
const mStores = () => [...new Set([...MZ.players.map(p => p.store), ...S.screens.map(s => s.store)].filter(Boolean))].sort((a,b) => a.localeCompare(b,'tr'));

function mActive(p){
  const now = new Date(new Date().toLocaleString('en-US', { timeZone:'Europe/Istanbul' }));
  const dow = ((now.getDay() + 6) % 7) + 1, t = now.toTimeString().slice(0,8), d = now.toISOString().slice(0,10);
  return MZ.sched.filter(s => s.active && (s.player_id === p.id || (!s.player_id && (!s.store || s.store === p.store)))
      && s.days.includes(dow) && t >= s.start_time && t <= s.end_time
      && (!s.start_date || d >= s.start_date) && (!s.end_date || d <= s.end_date))
    .sort((a,b) => (!!b.player_id - !!a.player_id) || (!!b.store - !!a.store) || (b.priority - a.priority))[0];
}

// ---------- cihazlar ----------
function pMDash(){
  head('Müzik cihazları', 'Mağazada müziği çalan tablet, telefon ya da mini bilgisayarlar', `<button class="btn primary" id="addP">Cihaz ekle</button>`);
  $('#addP').onclick = () => openPlayer(null);
  const on = MZ.players.filter(p => mStatus(p) === 'on').length;
  $('#page').innerHTML = `<p class="mute" style="margin-top:0">Pilot. Cihazda oynatıcı linkini açıp bir kez "Müziği başlat"a basmak yeterli; parçalar cihaza indirilir, internet kesilse de çalmaya devam eder. ${MZ.players.length ? `${on}/${MZ.players.length} cihaz çevrimiçi.` : ''}</p>
    ${MZ.players.length ? `<table><thead><tr><th>Cihaz</th><th>Mağaza</th><th>Şu an</th><th>Ses</th><th>Durum</th><th>Kod</th></tr></thead><tbody>
    ${MZ.players.map(p => { const a = mActive(p); const li = p.last_info || {}; return `<tr><td><a href="#" data-ep="${p.id}" style="color:inherit;font-weight:700">${esc(p.name)}</a></td><td>${esc(p.store || '—')}</td>
      <td>${a ? esc(mLname(a.playlist_id)) + (li.now ? `<div class="mute" style="font-size:12px">${esc(li.now)}</div>` : '') : '<span class="mute">Sessiz (zamanlama yok)</span>'}</td>
      <td>%${a && a.volume != null ? a.volume : p.volume}</td><td>${mTag(p)}</td><td><code>${esc(p.code)}</code></td></tr>`; }).join('')}</tbody></table>`
    : '<div class="empty">Henüz cihaz yok. "Cihaz ekle" ile mağazadaki cihazı tanımlayın, sonra linki o cihazda açın.</div>'}`;
  $$('[data-ep]').forEach(e => e.onclick = ev => { ev.preventDefault(); openPlayer(e.dataset.ep); });
}
function openPlayer(id){
  const p = id ? byId(MZ.players, id) : { name:'', store:'', volume:70 };
  const url = id ? mPlayerUrl(p) : '';
  modal(`<div class="mhead"><h2>${id ? esc(p.name) : 'Yeni müzik cihazı'}</h2><button class="btn sm" data-x>Kapat</button></div>
    <div class="mbody">
      <div class="two"><div class="field"><label for="pN">Cihaz adı</label><input type="text" id="pN" value="${esc(p.name)}" placeholder="Örn. Kasa tableti"></div>
      <div class="field"><label for="pS">Mağaza</label><input type="text" id="pS" value="${esc(p.store||'')}" list="mStoreList"></div></div>
      <datalist id="mStoreList">${mStores().map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
      <div class="field" style="max-width:260px"><label for="pV">Varsayılan ses: <b id="pVt">%${p.volume}</b></label><input type="range" id="pV" min="0" max="100" value="${p.volume}"></div>
      ${id ? `<div class="field"><label>Oynatıcı linki</label><div style="display:flex;gap:8px;align-items:center"><input type="text" readonly value="${esc(url)}" style="flex:1"><button class="btn sm" id="cpP">Kopyala</button></div>
        <span class="mute" style="font-size:12px">Linki mağazadaki cihazda Chrome ile açın, "Müziği başlat"a basın. Cihaz uykuya geçmesin ve ses kablosu/Bluetooth hoparlöre bağlı olsun.</span></div>
        <p class="mute" style="font-size:12px">Son bağlantı: ${p.last_seen ? ago(p.last_seen) : 'hiç'}${p.last_info && p.last_info.ua ? ' · ' + esc(p.last_info.ua) : ''}</p>` : ''}
    </div>
    <div class="mfoot">${id ? '<button class="btn danger" id="delP" style="margin-right:auto">Cihazı sil</button>' : ''}<button class="btn primary" id="saveP">${id ? 'Kaydet' : 'Cihaz ekle'}</button></div>`, true);
  $('[data-x]').onclick = closeModal;
  $('#pV').oninput = e => $('#pVt').textContent = '%' + e.target.value;
  if (id) $('#cpP').onclick = () => { navigator.clipboard.writeText(url); toast('Link kopyalandı'); };
  $('#saveP').onclick = async () => {
    const row = { name: $('#pN').value.trim(), store: $('#pS').value.trim() || null, volume: +$('#pV').value };
    if (!row.name) return toast('Cihaz adı yazın');
    const d = chk(id ? await sb.from('music_players').update(row).eq('id', id).select().single() : await sb.from('music_players').insert(row).select().single());
    toast(id ? 'Kaydedildi' : 'Cihaz eklendi. Linki cihazda açın.'); await loadAll(); if (!id) openPlayer(d.id); else closeModal();
  };
  if (id) $('#delP').onclick = async () => { if (!confirm(`${p.name} silinsin mi? Bu cihazdaki müzik durur.`)) return; chk(await sb.from('music_players').delete().eq('id', id)); toast('Cihaz silindi'); closeModal(); loadAll(); };
}

// ---------- parçalar ----------
function pMTracks(){
  const top = MZ.tracks.reduce((a,t) => a + (+t.size_bytes || 0), 0);
  head('Parçalar', `${MZ.tracks.length} parça, ${mb(top) || '0 MB'}`);
  const q = mview.q.toLowerCase();
  const list = MZ.tracks.filter(t => !q || (t.name + ' ' + (t.artist||'')).toLowerCase().includes(q));
  const used = id => MZ.items.filter(i => i.track_id === id).length;
  $('#page').innerHTML = `
    <label class="drop" id="mdrop"><input type="file" id="mup" multiple accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,.mp3,.m4a" hidden>
      <b>MP3 dosyalarını buraya sürükleyin</b> ya da seçmek için tıklayın<br><span class="mute">Ticari kullanım ve mağazada çalma izni olan parçalar yükleyin (lisansı kaynağına göre kontrol edin). 128–192 kbps MP3 yeterli.</span><div id="mupMsg" style="margin-top:8px;font-weight:600"></div></label>
    <div class="bar"><input type="search" class="grow" id="mtq" placeholder="Parça ya da sanatçı ara" value="${esc(mview.q)}"></div>
    ${list.length ? `<table><thead><tr><th style="width:44px"></th><th>Parça</th><th>Sanatçı</th><th>Süre</th><th>Kaynak / lisans</th><th>Listelerde</th><th></th></tr></thead><tbody>
    ${list.map(t => `<tr><td><button class="btn sm" data-pl="${t.id}" title="Dinle">▶</button></td><td><b>${esc(t.name)}</b><div class="mute" style="font-size:12px">${mb(t.size_bytes)}</div></td><td>${esc(t.artist||'—')}</td><td>${dk(t.duration_s)}</td>
      <td><a href="#" data-et="${t.id}" style="color:inherit">${esc(t.source || 'Ekle')}</a>${t.license_note ? `<div class="mute" style="font-size:12px">${esc(t.license_note)}</div>` : ''}</td>
      <td>${used(t.id) || '<span class="mute">Yok</span>'}</td><td><button class="btn sm danger" data-dt="${t.id}">Sil</button></td></tr>`).join('')}</tbody></table>
    <audio id="mpre" controls style="width:100%;margin-top:12px;display:none"></audio>` : '<div class="empty">Henüz parça yok.</div>'}`;
  const drop = $('#mdrop');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hot'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hot'); }));
  drop.addEventListener('drop', e => mUpload([...e.dataTransfer.files]));
  $('#mup').onchange = e => mUpload([...e.target.files]);
  $('#mtq').oninput = e => { mview.q = e.target.value; const p = e.target.selectionStart; pMTracks(); const n = $('#mtq'); n.focus(); n.setSelectionRange(p,p); };
  $$('[data-pl]').forEach(b => b.onclick = () => { const a = $('#mpre'); a.style.display = 'block'; a.src = pub(mTrack(b.dataset.pl).path); a.play(); });
  $$('[data-et]').forEach(e => e.onclick = async ev => { ev.preventDefault(); const t = mTrack(e.dataset.et);
    const source = prompt('Kaynak (ör. Pixabay, satın alındı, kendi kaydımız)', t.source || ''); if (source === null) return;
    const license_note = prompt('Lisans notu / link', t.license_note || ''); if (license_note === null) return;
    const artist = prompt('Sanatçı', t.artist || ''); if (artist === null) return;
    chk(await sb.from('music_tracks').update({ source: source || null, license_note: license_note || null, artist: artist || null }).eq('id', t.id)); toast('Kaydedildi'); loadAll(); });
  $$('[data-dt]').forEach(e => e.onclick = async () => { const t = mTrack(e.dataset.dt); const u = used(t.id);
    if (!confirm(`${t.name} silinsin mi?${u ? ` ${u} listeden de çıkarılacak.` : ''}`)) return;
    await sb.storage.from('signage').remove([t.path]); chk(await sb.from('music_tracks').delete().eq('id', t.id)); toast('Parça silindi'); loadAll(); });
}
const sureOku = f => new Promise(res => { const a = new Audio(); a.preload = 'metadata'; a.onloadedmetadata = () => { res(Math.round(a.duration) || null); URL.revokeObjectURL(a.src); }; a.onerror = () => res(null); a.src = URL.createObjectURL(f); });
async function mUpload(files){
  files = files.filter(f => /^audio\//.test(f.type) || /\.(mp3|m4a)$/i.test(f.name)); if (!files.length) return toast('Ses dosyası seçin (MP3)');
  for (let i = 0; i < files.length; i++) {
    const f = files[i]; $('#mupMsg').textContent = `${i+1}/${files.length} yükleniyor: ${f.name}`;
    if (f.size > 30 * 1048576) { toast(`${f.name} 30 MB'tan büyük, yüklenmedi`); continue; }
    const duration_s = await sureOku(f);
    const path = `muzik/${Date.now()}-${slug(f.name)}`;
    chk(await sb.storage.from('signage').upload(path, f, { contentType: f.type || 'audio/mpeg', cacheControl: '31536000' }));
    const ad = f.name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ');
    const [artist, name] = ad.includes(' - ') ? ad.split(' - ', 2) : [null, ad];
    chk(await sb.from('music_tracks').insert({ name: name.trim(), artist: artist && artist.trim(), path, duration_s, size_bytes: f.size }));
  }
  toast(`${files.length} parça yüklendi`); loadAll();
}

// ---------- müzik listeleri ----------
function pMLists(){
  if (mview.list && !byId(MZ.lists, mview.list)) mview.list = null;
  if (!mview.list && MZ.lists.length) mview.list = MZ.lists[0].id;
  head('Müzik listeleri', `${MZ.lists.length} liste`, `<button class="btn primary" id="newML">Liste oluştur</button>`);
  $('#newML').onclick = async () => { const name = prompt('Liste adı (ör. Sabah sakin, Akşam caz)'); if (!name) return; const d = chk(await sb.from('music_playlists').insert({ name }).select().single()); mview.list = d.id; toast('Liste oluşturuldu'); loadAll(); };
  const L = byId(MZ.lists, mview.list);
  const its = L ? mItems(L.id) : [];
  const total = its.reduce((a,i) => a + (mTrack(i.track_id).duration_s || 0), 0);
  const usedBy = L ? MZ.sched.filter(s => s.playlist_id === L.id) : [];
  $('#page').innerHTML = `<div class="split">
    <div class="plist">${MZ.lists.map(l => { const n = mItems(l.id); return `<button class="${l.id===mview.list?'on':''}" data-ml="${l.id}">${esc(l.name)}<small>${n.length} parça, ${Math.round(n.reduce((a,i)=>a+(mTrack(i.track_id).duration_s||0),0)/60)} dk</small></button>`; }).join('') || '<div class="in mute" style="padding:16px">Henüz liste yok</div>'}</div>
    <div>${L ? `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap"><h2 style="margin:0;font-size:20px;flex:1">${esc(L.name)}</h2>
        <label class="mute" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="shf" ${L.shuffle?'checked':''}> Karışık çal</label>
        <button class="btn" id="renML">Adını değiştir</button><button class="btn" id="addMI">Parça ekle</button><button class="btn danger" id="delML">Listeyi sil</button></div>
      <p class="mute" style="margin:0 0 10px">${its.length} parça, toplam ${Math.round(total/60)} dakika. ${usedBy.length ? 'Zamanlamada: ' + usedBy.map(s => esc(s.name || L.name)).join(', ') : 'Hiçbir zamanlamada kullanılmıyor.'}</p>
      <div class="seq" id="mseq">${its.map((i,k) => { const t = mTrack(i.track_id); return `<div class="it" draggable="true" data-mit="${i.id}">
        <span class="grip" title="Sürükleyerek sırala">⋮⋮</span><span class="n">${k+1}</span>
        <div style="grid-column:span 2"><b>${esc(t.name)}</b><div class="mute" style="font-size:12px">${esc(t.artist||'')}</div></div>
        <div class="dur">${dk(t.duration_s)}</div>
        <button class="btn sm danger" data-dmi="${i.id}">Çıkar</button></div>`; }).join('') || '<div class="empty">Liste boş. "Parça ekle" ile başlayın.</div>'}</div>` : '<div class="empty">Soldan bir liste seçin ya da yeni liste oluşturun.</div>'}</div></div>`;
  $$('[data-ml]').forEach(b => b.onclick = () => { mview.list = b.dataset.ml; pMLists(); });
  if (!L) return;
  $('#shf').onchange = async e => { chk(await sb.from('music_playlists').update({ shuffle: e.target.checked }).eq('id', L.id)); toast(e.target.checked ? 'Karışık çalacak' : 'Sırayla çalacak'); loadAll(); };
  $('#renML').onclick = async () => { const name = prompt('Yeni ad', L.name); if (!name) return; chk(await sb.from('music_playlists').update({ name }).eq('id', L.id)); loadAll(); };
  $('#delML').onclick = async () => { if (!confirm(`${L.name} silinsin mi?${usedBy.length ? ' Bu listeyi kullanan zamanlamalar da silinir.' : ''}`)) return; chk(await sb.from('music_playlists').delete().eq('id', L.id)); mview.list = null; toast('Liste silindi'); loadAll(); };
  $('#addMI').onclick = () => mPicker(L, its);
  $$('[data-dmi]').forEach(e => e.onclick = async () => { chk(await sb.from('music_playlist_items').delete().eq('id', e.dataset.dmi)); toast('Listeden çıkarıldı'); loadAll(); });
  let dragId = null;
  $$('#mseq .it').forEach(row => {
    row.ondragstart = e => { dragId = row.dataset.mit; row.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; };
    row.ondragend = () => row.classList.remove('drag');
    row.ondragover = e => { e.preventDefault(); row.classList.add('over'); };
    row.ondragleave = () => row.classList.remove('over');
    row.ondrop = async e => { e.preventDefault(); row.classList.remove('over'); if (!dragId || dragId === row.dataset.mit) return;
      const arr = its.map(i => i.id); const from = arr.indexOf(dragId), to = arr.indexOf(row.dataset.mit);
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      await Promise.all(arr.map((id, p) => sb.from('music_playlist_items').update({ position: p }).eq('id', id)));
      toast('Sıra kaydedildi'); loadAll(); };
  });
}
function mPicker(L, its){
  const var_ = new Set(its.map(i => i.track_id)); const sec = new Set();
  modal(`<div class="mhead"><h2>${esc(L.name)} listesine parça ekle</h2><input type="search" id="mpq" placeholder="Ara"><button class="btn sm" data-x>Kapat</button></div>
    <div class="mbody"><table><tbody id="mpg">${MZ.tracks.map(t => `<tr data-name="${esc((t.name+' '+(t.artist||'')).toLowerCase())}"><td style="width:36px"><input type="checkbox" data-mp="${t.id}" ${var_.has(t.id)?'disabled checked':''}></td><td><b>${esc(t.name)}</b> <span class="mute">${esc(t.artist||'')}</span></td><td>${dk(t.duration_s)}</td></tr>`).join('') || '<tr><td class="mute">Önce Parçalar sayfasından yükleyin.</td></tr>'}</tbody></table></div>
    <div class="mfoot"><button class="btn" id="mpAll" style="margin-right:auto">Görünenlerin hepsini seç</button><button class="btn primary" id="mpAdd" disabled>Ekle</button></div>`);
  $('[data-x]').onclick = closeModal;
  const say = () => { $('#mpAdd').disabled = !sec.size; $('#mpAdd').textContent = sec.size ? `${sec.size} parça ekle` : 'Ekle'; };
  $$('[data-mp]').forEach(c => c.onchange = () => { c.checked ? sec.add(c.dataset.mp) : sec.delete(c.dataset.mp); say(); });
  $('#mpq').oninput = e => { const q = e.target.value.toLowerCase(); $$('#mpg tr').forEach(r => r.style.display = !q || (r.dataset.name||'').includes(q) ? '' : 'none'); };
  $('#mpAll').onclick = () => { $$('#mpg tr').forEach(r => { const c = r.querySelector('[data-mp]'); if (c && !c.disabled && r.style.display !== 'none') { c.checked = true; sec.add(c.dataset.mp); } }); say(); };
  $('#mpAdd').onclick = async () => { let p = its.length;
    chk(await sb.from('music_playlist_items').insert([...sec].map(track_id => ({ playlist_id: L.id, track_id, position: p++ }))));
    toast(`${sec.size} parça eklendi`); closeModal(); loadAll(); };
}

// ---------- zamanlama ----------
function pMSched(){
  head('Müzik zamanlama', 'Hangi listenin hangi mağazada, hangi saatlerde çalacağı', `<button class="btn primary" id="newMS">Zamanlama ekle</button>`);
  $('#newMS').onclick = () => openMSched(null);
  const hedef = s => s.player_id ? 'Cihaz: ' + esc((byId(MZ.players, s.player_id)||{}).name) : s.store ? esc(s.store) : 'Tüm mağazalar';
  $('#page').innerHTML = MZ.sched.length ? `<p class="mute" style="margin-top:0">Aynı anda birden fazla zamanlama uyarsa önce cihaza özel olan, sonra mağazaya özel olan, sonra önceliği yüksek olan çalar. Zamanlama yoksa müzik susar.</p>
    <table><thead><tr><th>Zamanlama</th><th>Liste</th><th>Nerede</th><th>Günler</th><th>Saat</th><th>Ses</th><th>Öncelik</th><th>Yayında</th></tr></thead><tbody>
    ${MZ.sched.map(s => `<tr><td><a href="#" data-ems="${s.id}" style="color:inherit;font-weight:700">${esc(s.name || mLname(s.playlist_id))}</a></td><td>${esc(mLname(s.playlist_id))}</td><td>${hedef(s)}</td>
      <td>${s.days.length===7?'Her gün':s.days.map(d=>DAYS[d-1]).join(', ')}</td><td>${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)}</td>
      <td>${s.volume != null ? '%' + s.volume : '<span class="mute">Cihazın</span>'}</td><td>${s.priority}</td><td><input type="checkbox" data-mac="${s.id}" ${s.active?'checked':''} aria-label="Yayında"></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">Henüz zamanlama yok. Örn. "Hafta içi sabah 07:30–11:00 sakin liste, tüm mağazalar".</div>';
  $$('[data-ems]').forEach(e => e.onclick = ev => { ev.preventDefault(); openMSched(e.dataset.ems); });
  $$('[data-mac]').forEach(e => e.onchange = async () => { chk(await sb.from('music_schedules').update({ active: e.checked }).eq('id', e.dataset.mac)); toast(e.checked ? 'Yayına alındı' : 'Yayından kaldırıldı'); loadAll(); });
}
function openMSched(id){
  const s = id ? byId(MZ.sched, id) : { name:'', playlist_id:'', player_id:null, store:null, days:[1,2,3,4,5,6,7], start_time:'07:00:00', end_time:'23:00:00', start_date:'', end_date:'', priority:0, volume:null };
  const tgt = s.player_id ? 'p:' + s.player_id : s.store ? 's:' + s.store : 'all';
  if (!MZ.lists.length) return toast('Önce bir müzik listesi oluşturun');
  modal(`<div class="mhead"><h2>${id ? 'Zamanlamayı düzenle' : 'Yeni müzik zamanlaması'}</h2><button class="btn sm" data-x>Kapat</button></div>
    <div class="mbody">
      <div class="field"><label for="msN">Ad</label><input type="text" id="msN" value="${esc(s.name||'')}" placeholder="Örn. Hafta içi sabah"></div>
      <div class="two"><div class="field"><label for="msL">Liste</label><select id="msL">${MZ.lists.map(l=>`<option value="${l.id}" ${l.id===s.playlist_id?'selected':''}>${esc(l.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="msT">Nerede çalsın</label><select id="msT"><option value="all" ${tgt==='all'?'selected':''}>Tüm mağazalar</option>
        <optgroup label="Mağaza">${mStores().map(x=>`<option value="s:${esc(x)}" ${tgt==='s:'+x?'selected':''}>${esc(x)}</option>`).join('')}</optgroup>
        <optgroup label="Tek cihaz">${MZ.players.map(p=>`<option value="p:${p.id}" ${tgt==='p:'+p.id?'selected':''}>${esc(p.name)}${p.store?' · '+esc(p.store):''}</option>`).join('')}</optgroup></select></div></div>
      <div class="field"><label>Günler</label><div class="days">${DAYS.map((d,i)=>`<label><input type="checkbox" class="msDay" value="${i+1}" ${s.days.includes(i+1)?'checked':''}>${d}</label>`).join('')}</div></div>
      <div class="two"><div class="field"><label for="msF">Başlangıç saati</label><input type="time" id="msF" value="${s.start_time.slice(0,5)}"></div><div class="field"><label for="msTo">Bitiş saati</label><input type="time" id="msTo" value="${s.end_time.slice(0,5)}"></div></div>
      <div class="two"><div class="field"><label for="msD1">Başlangıç tarihi</label><input type="date" id="msD1" value="${s.start_date||''}"></div><div class="field"><label for="msD2">Bitiş tarihi (boşsa süresiz)</label><input type="date" id="msD2" value="${s.end_date||''}"></div></div>
      <div class="two"><div class="field"><label for="msV">Ses (boşsa cihazın ayarı)</label><input type="number" id="msV" min="0" max="100" value="${s.volume ?? ''}" placeholder="%"></div>
      <div class="field"><label for="msP">Öncelik</label><input type="number" id="msP" value="${s.priority}"></div></div>
    </div>
    <div class="mfoot">${id ? '<button class="btn danger" id="msDel" style="margin-right:auto">Zamanlamayı sil</button>' : ''}<button class="btn primary" id="msSave">${id ? 'Kaydet' : 'Yayınla'}</button></div>`, true);
  $('[data-x]').onclick = closeModal;
  $('#msSave').onclick = async () => {
    const t = $('#msT').value; const days = $$('.msDay:checked').map(e => +e.value);
    if (!days.length) return toast('En az bir gün seçin');
    const v = $('#msV').value;
    const row = { name: $('#msN').value.trim() || null, playlist_id: $('#msL').value,
      player_id: t.startsWith('p:') ? t.slice(2) : null, store: t.startsWith('s:') ? t.slice(2) : null,
      days, start_time: $('#msF').value, end_time: $('#msTo').value + ':59',
      start_date: $('#msD1').value || null, end_date: $('#msD2').value || null, priority: +$('#msP').value || 0,
      volume: v === '' ? null : Math.max(0, Math.min(100, +v)) };
    chk(id ? await sb.from('music_schedules').update(row).eq('id', id) : await sb.from('music_schedules').insert(row));
    toast('Kaydedildi. Cihazlar 1 dakika içinde güncellenir.'); closeModal(); loadAll();
  };
  if (id) $('#msDel').onclick = async () => { if (!confirm('Zamanlama silinsin mi?')) return; chk(await sb.from('music_schedules').delete().eq('id', id)); toast('Zamanlama silindi'); closeModal(); loadAll(); };
}
if (BOLUM === 'muzik') { const b = document.querySelector('.brand small'); if (b) b.textContent = 'Müzik yönetimi'; document.title = 'Kaffee Schütz · Müzik Yönetimi'; }
