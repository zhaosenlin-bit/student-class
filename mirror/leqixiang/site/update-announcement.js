// Historical entries are immutable snapshots. Add new notices ahead of them.
export const updateNotices = [
  {
    "id": "junior-20261024",
    "title": "网站更新公告",
    "date": "2026年10月24日",
    "dateISO": "2026-10-24",
    "summary": "实验课件更新与全科永久版",
    "intro": "本次课件更新已上线，整合版与独立版同步更新，方便老师按课堂需要选择使用。",
    "items": [
      {
        "title": "氧气制取与性质课件上新",
        "text": "上线整合版及 6 个独立版，涵盖高锰酸钾制氧气、过氧化氢制氧气、催化作用、木炭和铁丝在氧气中燃烧，以及相关原理与证据。"
      },
      {
        "title": "热学实验内容补充",
        "text": "新增温度计的使用、熔化和凝固、水的沸腾独立课件，并在物态变化整合版中加入对应入口。"
      },
      {
        "title": "光学课件更新",
        "text": "优化透镜成像演示，补充 F 形光源、焦距显示和高度调整；更新光的反射定律，新增折叠光屏、镜面反射与漫反射独立课件。"
      },
      {
        "title": "化学方程式内容完善",
        "text": "补充红磷、镁、铁与氧气反应等内容，同步更新配平和质量关系演示。"
      },
      {
        "title": "全科永久版 · 合计 85 折",
        "text": "一次购买当前全部科目的永久版，合计享 85 折。已购科目后续新增课件继续包含；未来新增科目需另购，继续享受 85 折。"
      }
    ],
    "note": "已购买对应科目永久版的老师，可直接下载本次更新课件。此前保存的离线文件请重新下载，以使用新版内容。",
    "thanks": "感谢老师们的反馈与建议！"
  },
  {
    "id": "physics-20261022",
    "title": "网站更新公告",
    "date": "2026年10月22日",
    "items": [
      "物理二维互动课件上线：新增整合版24份、独立版139份。",
      "优化“测量平均速度”：消除刻度尺遮挡，增加车头对齐虚线与实时路程显示。",
      "将相关停表演示改为机械停表，完善计时和读数练习。",
      "统一移除课件左上角制作者信息。"
    ],
    "thanks": "感谢老师们的反馈与建议！",
    "dateISO": "2026-10-22",
    "summary": "物理二维课件上线与计时演示优化",
    "excerpt": "24 份整合版、139 份独立版，以及测量平均速度和机械停表更新。"
  }
];
export const updateNotice = updateNotices[0];
export const announcementActive = (schedule, now) => Number.isSafeInteger(schedule?.startsAt) && Number.isSafeInteger(schedule?.endsAt) && schedule.endsAt - schedule.startsAt === 72 * 3600000 && now >= schedule.startsAt && now < schedule.endsAt;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createUpdateAnnouncement({getUser, now, canShow = () => true, load = () => Promise.resolve(null)}) {
 let schedule, loading, pending = false, dialog, expiryTimer, openKey, manual = false;
 const seen = new Set();
 const key = () => getUser()?.id ? 'update-notice:' + updateNotice.id + ':' + getUser().id : null;
 function dismissed(k) { try { return seen.has(k) || sessionStorage.getItem(k) === 'seen'; } catch { return seen.has(k); } }
 function mark() { if (!openKey) return; seen.add(openKey); try { sessionStorage.setItem(openKey, 'seen'); } catch {} }
 function render(id = updateNotice.id) {
  const history = id === 'history', notice = updateNotices.find(n => n.id === id) || updateNotice;
  const archived = !history && notice.id !== updateNotice.id;
  const title = history ? '往期公告' : notice.title;
  const date = history ? '<span class="update-eyebrow">每一次更新，都在这里</span>' : `<time datetime="${esc(notice.dateISO)}">${esc(notice.date)}</time>`;
  const body = history ? `<p class="update-intro">按日期查看之前的更新内容。</p><div class="update-archive">${updateNotices.slice(1).map(n => `<button type="button" class="update-archive-item" data-notice-id="${esc(n.id)}"><span class="update-archive-date">${esc(n.date)}</span><strong>${esc(n.summary || n.title)}</strong><span class="update-archive-excerpt">${esc(n.excerpt || '')}</span><span class="update-archive-arrow" aria-hidden="true">↗</span><span class="update-archive-read">查看完整公告</span></button>`).join('') || '<p class="update-intro">暂无往期公告。</p>'}</div>` : `${archived ? '<p class="update-archive-note">往期记录 · 以下为当期公告内容</p>' : `<p class="update-intro">${esc(notice.intro || '')}</p>`}<ol>${notice.items.map(item => `<li>${typeof item === 'string' ? esc(item) : `<strong>${esc(item.title)}</strong><span>${esc(item.text)}</span>`}</li>`).join('')}</ol>${notice.note ? `<p class="update-note">${esc(notice.note)}</p>` : ''}<p class="update-thanks">${esc(notice.thanks)}</p>`;
  const navId = history ? updateNotice.id : 'history', navText = history ? '返回最新公告' : archived ? '返回往期列表' : '往期公告';
  dialog.innerHTML = `<div class="update-layout"><header class="update-heading">${date}<h2 id="update-notice-title" tabindex="-1" autofocus>${esc(title)}</h2></header><button type="button" class="update-close" aria-label="关闭更新公告" data-notice-close>×</button><div class="update-content" id="update-notice-body">${body}</div><footer class="update-footer"><button type="button" class="update-history-link" data-notice-id="${navId}"><span aria-hidden="true">${history || archived ? '←' : '◷'}</span>${navText}</button><button type="button" class="update-confirm" data-notice-close>我知道了</button></footer></div>`;
  dialog.dataset.view = history ? 'history' : notice.id;
  if (dialog.open) dialog.querySelector('h2').focus({preventScroll:true});
 }
 function build() {
  dialog = document.createElement('dialog'); dialog.id = 'update-announcement';
  dialog.setAttribute('aria-labelledby','update-notice-title'); dialog.setAttribute('aria-describedby','update-notice-body');
  dialog.addEventListener('click', event => {
   if (event.target.closest('[data-notice-close]')) { dialog.close(); return; }
   const button = event.target.closest('[data-notice-id]');
   if (button) { manual = true; clearTimeout(expiryTimer); render(button.dataset.noticeId); }
  });
  dialog.addEventListener('close', () => { mark(); clearTimeout(expiryTimer); });
  document.body.append(dialog);
 }
 function available() { return canShow() && !document.querySelector('dialog[open]:not(#update-announcement)'); }
 function attempt() {
  const k = key();
  if (!pending || !k || dismissed(k) || schedule?.id !== updateNotice.id || !announcementActive(schedule,now()) || !available() || dialog?.open) return;
  if (!dialog) build(); openKey = k; pending = false; manual = false; render(); dialog.showModal();
  clearTimeout(expiryTimer); expiryTimer = setTimeout(() => { if (dialog.open && !manual) dialog.close(); },Math.max(0,schedule.endsAt-now()));
 }
 async function show() {
  if (!key()) return; pending = true;
  try { if (schedule === undefined) { loading ??= load(); schedule = await loading; } attempt(); } catch { pending = false; loading = undefined; }
 }
 function open() {
  if (!available()) return false;
  if (!dialog) build(); pending = false; manual = true; openKey = key(); clearTimeout(expiryTimer); render();
  if (!dialog.open) dialog.showModal(); return true;
 }
 document.addEventListener('click', event => { if (event.target.closest('[data-announcement-open]')) { event.preventDefault(); open(); } });
 document.addEventListener('close', () => { if (pending) setTimeout(attempt,0); },true);
 window.addEventListener('hashchange', () => { if (pending) setTimeout(attempt,0); });
 document.addEventListener('visibilitychange', () => { if (document.hidden) return; if (dialog?.open && !manual && !announcementActive(schedule,now())) dialog.close(); else attempt(); });
 return {show,open};
}
