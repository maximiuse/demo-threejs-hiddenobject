// HTML overlay: HUD, toasts, shop / pets / pause panels.
import { ANIMALS, RARITIES, UPG, SKINS } from './config.js';

const $ = (id) => document.getElementById(id);

export function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const units = ['K', 'M', 'B', 'T', 'Qa'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return `${n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)}${units[u]}`;
}

export class UI {
  constructor(game) {
    this.g = game;
    this.modal = null;
    this.shopTab = 'upgrades';
    this.html = '';
    this.refreshT = 0;
    this.last = {};
    this.el = {
      money: $('money'), income: $('income'), speed: $('speed'), training: $('training'),
      pillMoney: $('pillMoney'), pillSpeed: $('pillSpeed'),
      toasts: $('toasts'), hint: $('hint'), vignette: $('vignette'),
      modal: $('modal'), title: $('modalTitle'), body: $('modalBody'),
    };
    $('btnShop').addEventListener('click', () => this.toggle('shop'));
    $('btnPets').addEventListener('click', () => this.toggle('pets'));
    $('btnPause').addEventListener('click', () => this.toggle('pause'));
    $('modalClose').addEventListener('click', () => this.close());
    this.el.modal.addEventListener('pointerdown', (e) => { if (e.target === this.el.modal) this.close(); });
    this.el.body.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      if (b.dataset.act === 'tab') { this.shopTab = b.dataset.arg; this.render(); return; }
      if (b.dataset.act === 'admin') { this.open('admin'); return; }
      const arg = b.dataset.input ? $(b.dataset.input).value : b.dataset.arg;
      this.g.action(b.dataset.act, arg);
      if (this.modal) this.render(true);
    });
    this.el.body.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
      e.target.parentElement.querySelector('button[data-act]')?.click();
    });
    addEventListener('keydown', (e) => {
      if (!this.g.started) return;
      if (e.target instanceof HTMLInputElement && e.code !== 'Escape') return;
      if (e.code === 'Escape') this.modal ? this.close() : this.open('pause');
      if (e.code === 'KeyB') this.toggle('shop');
      if (e.code === 'KeyP') this.toggle('pets');
    });
  }

  toggle(name) { this.modal === name ? this.close() : this.open(name); }

  open(name) {
    this.modal = name;
    this.el.modal.classList.remove('hidden');
    this.render(true);
    this.g.onModal(name);
  }

  close() {
    this.modal = null;
    this.el.modal.classList.add('hidden');
    this.g.onModal(null);
  }

  toast(text, kind = '', ms = 2400) {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
  }

  bump(which) {
    const el = which === 'speed' ? this.el.pillSpeed : this.el.pillMoney;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  setText(key, el, text) {
    if (this.last[key] !== text) { this.last[key] = text; el.textContent = text; }
  }

  update(dt, hud) {
    const s = this.g.state;
    this.setText('money', this.el.money, fmt(s.money));
    this.setText('income', this.el.income, hud.income > 0 ? `+${fmt(hud.income)}/с` : '');
    this.setText('speed', this.el.speed, String(Math.floor(s.speed)));
    this.setText('training', this.el.training, hud.training ? `+${hud.training.toFixed(1)}/с` : '');
    this.setText('hint', this.el.hint, hud.hint || '');
    this.el.hint.classList.toggle('danger', !!hud.danger);
    const v = hud.vignette.toFixed(2);
    if (this.last.vig !== v) { this.last.vig = v; this.el.vignette.style.opacity = v; }
    if (this.modal === 'shop' || this.modal === 'pets') {
      this.refreshT -= dt;
      if (this.refreshT <= 0) { this.refreshT = 0.3; this.render(); }
    }
  }

  // force: rebuild even if the markup is unchanged (e.g. after a click, to clear focus).
  render(force = false) {
    const g = this.g, s = g.state;
    const body = { innerHTML: '' };
    if (this.modal === 'shop') {
      this.el.title.textContent = '🛒 Магазин';
      const tabs = `<div class="tabs">
        <button class="tab ${this.shopTab === 'upgrades' ? 'on' : ''}" data-act="tab" data-arg="upgrades">⬆️ Улучшения</button>
        <button class="tab ${this.shopTab === 'skins' ? 'on' : ''}" data-act="tab" data-arg="skins">👕 Скины</button></div>`;
      if (this.shopTab === 'skins') {
        const thumbs = g.skinThumbs();
        body.innerHTML = tabs + '<div class="skins">' + SKINS.map((k) => {
          const owned = s.skins[k.id], worn = s.skin === k.id;
          const btn = worn ? '<button class="buy" disabled>Надето ✓</button>'
            : owned ? `<button class="buy blue" data-act="skin" data-arg="${k.id}">Надеть</button>`
              : `<button class="buy" data-act="skin" data-arg="${k.id}" ${s.money < k.price ? 'disabled' : ''}>$${fmt(k.price)}</button>`;
          return `<div class="skin ${worn ? 'worn' : ''}">
            ${k.brainrot ? '<div class="tag">BRAINROT</div>' : ''}
            <img src="${thumbs[k.id]}" alt="">
            <div class="title">${k.name}</div>${btn}</div>`;
        }).join('') + '</div>';
      } else {
        const c1 = g.speedCost(1), c5 = g.speedCost(5);
        const tl = s.tread, tMax = tl >= UPG.treadmill.max, tc = g.treadmillCost();
        const sMax = s.slots >= UPG.slots.max, sc = g.slotCost();
        const next = ANIMALS.find(a => a.speed >= Math.floor(s.speed));
        body.innerHTML = `
          <div class="card"><div class="big-ico">👟</div><div class="info">
            <div class="title">Скорость: ${Math.floor(s.speed)}</div>
            <div class="desc">${next ? `Следующая цель: ${next.emoji} ${next.name} (скорость ${next.speed})` : 'Ты быстрее всех животных!'}</div>
          </div><div class="btns">
            <button class="buy" data-act="speed" data-arg="1" ${s.money < c1 ? 'disabled' : ''}>+${UPG.speed.step} · $${fmt(c1)}</button>
            <button class="buy" data-act="speed" data-arg="5" ${s.money < c5 ? 'disabled' : ''}>+${UPG.speed.step * 5} · $${fmt(c5)}</button>
          </div></div>
          <div class="card"><div class="big-ico">🏃</div><div class="info">
            <div class="title">Беговая дорожка · ур. ${tl}</div>
            <div class="desc">Тренировка: +${UPG.treadmill.gain(tl).toFixed(1)} скорости/с${tMax ? '' : ` → +${UPG.treadmill.gain(tl + 1).toFixed(1)}/с`}</div>
          </div><div class="btns">
            <button class="buy blue" data-act="tread" ${tMax || s.money < tc ? 'disabled' : ''}>${tMax ? 'Макс.' : `Улучшить · $${fmt(tc)}`}</button>
          </div></div>
          <div class="card"><div class="big-ico">🏠</div><div class="info">
            <div class="title">База: ${s.slots}/${UPG.slots.max} слотов</div>
            <div class="desc">Больше слотов — больше питомцев и денег</div>
          </div><div class="btns">
            <button class="buy blue" data-act="slot" ${sMax || s.money < sc ? 'disabled' : ''}>${sMax ? 'Макс.' : `+1 слот · $${fmt(sc)}`}</button>
          </div></div>
          <div class="help">💡 Встань на беговую дорожку на базе и не двигайся — скорость будет расти сама.</div>`;
        body.innerHTML = tabs + body.innerHTML;
      }
    } else if (this.modal === 'pets') {
      this.el.title.textContent = '🐣 Питомцы';
      let html = '';
      let any = false;
      for (let i = 0; i < s.slots; i++) {
        const p = s.pets[i];
        if (!p) continue;
        any = true;
        const a = ANIMALS[p.a];
        if (p.r < 0) {
          html += `<div class="card"><div class="big-ico">🥚</div><div class="info">
            <div class="title">Яйцо: ${a.name}</div><div class="desc">Вылупится через ${Math.ceil(p.t)} с</div></div></div>`;
        } else {
          const r = RARITIES[p.r];
          html += `<div class="card" style="border-color:${r.color}55"><div class="big-ico">${a.emoji}</div><div class="info">
            <div class="title">${a.name} <span style="color:${r.color}">· ${r.name}</span></div>
            <div class="desc">💰 +$${fmt(g.petIncome(p))}/с</div></div>
            <div class="btns"><button class="buy sell" data-act="sell" data-arg="${i}">Продать · $${fmt(g.sellPrice(p))}</button></div></div>`;
        }
      }
      if (!any) html += '<div class="empty">Пока пусто. Укради яйцо и принеси его на базу!</div>';
      const found = Object.keys(s.col).length;
      html += `<div class="section">📖 Коллекция ${found}/${ANIMALS.length * RARITIES.length}</div><div class="collection"><div></div>`;
      html += RARITIES.map(r => `<div class="hdr" style="color:${r.color}">${r.name}</div>`).join('');
      for (const a of ANIMALS) {
        html += `<div class="name">${a.emoji} ${a.name}</div>`;
        RARITIES.forEach((r, ri) => {
          const has = s.col[`${a.id}:${ri}`];
          html += `<div class="cell ${has ? '' : 'miss'}" style="${has ? `border-color:${r.color}` : ''}">${has ? a.emoji : '?'}</div>`;
        });
      }
      html += '</div>';
      body.innerHTML = html;
    } else if (this.modal === 'pause') {
      this.el.title.textContent = '⏸ Пауза';
      body.innerHTML = `
        <div class="menu-btns">
          <button class="buy" data-act="resume">▶ Продолжить</button>
          <button class="buy blue" data-act="sound">${s.sound ? '🔊 Звук: вкл' : '🔇 Звук: выкл'}</button>
          <button class="buy blue" data-act="home">🏠 Вернуться на базу</button>
          <button class="buy blue" data-act="admin">🔑 Админ-панель</button>
          <button class="buy danger" data-act="reset">${g.resetArmed ? '⚠️ Точно сбросить? Нажми ещё раз' : '🗑 Сбросить прогресс'}</button>
        </div>
        <div class="help">
          <b>Как играть:</b> подойди к гнезду и забери яйцо. Хозяин яйца погонится за тобой — беги на базу за голубой барьер.
          Яйцо положится в инкубатор и вылупится в питомца, который приносит деньги. Табличка у загона показывает
          скорость животного: <span style="color:#69f0ae">зелёная</span> — ты быстрее, <span style="color:#ff5252">красная</span> — тебя догонят.<br><br>
          <b>Клавиатура:</b> WASD/стрелки — бег, Пробел — прыжок, мышь/Q/E — камера, колесо — зум, B — магазин, P — питомцы, Esc — пауза.<br>
          <b>Сенсор:</b> джойстик слева, свайп — камера, щипок — зум, кнопка ⤒ — прыжок.
        </div>`;
    } else if (this.modal === 'admin') {
      this.el.title.textContent = '🔑 Админ-панель';
      body.innerHTML = s.admin ? this.adminHtml() : `
        <div class="help">Введи код администратора.</div>
        <div class="row"><input id="admCode" type="password" autocomplete="off" placeholder="Код">
          <button class="buy" data-act="adm-login" data-input="admCode">Войти</button></div>`;
    }
    if (force || body.innerHTML !== this.html) {
      this.html = body.innerHTML;
      this.el.body.innerHTML = body.innerHTML;
    }
  }

  adminHtml() {
    const s = this.g.state;
    const on = (v) => (v ? 'вкл ✓' : 'выкл');
    return `
      <div class="section">💰 Деньги: $${fmt(s.money)}</div>
      <div class="row"><input id="admMoney" type="number" inputmode="decimal" min="0" value="${Math.floor(s.money)}">
        <button class="buy" data-act="adm-money" data-input="admMoney">Установить</button></div>
      <div class="row">
        <button class="buy blue" data-act="adm-money-add" data-arg="1000">+1K</button>
        <button class="buy blue" data-act="adm-money-add" data-arg="1000000">+1M</button>
        <button class="buy blue" data-act="adm-money-add" data-arg="1000000000">+1B</button></div>
      <div class="section">👟 Скорость: ${Math.floor(s.speed)}</div>
      <div class="row"><input id="admSpeed" type="number" inputmode="decimal" min="1" max="${400}" value="${Math.floor(s.speed)}">
        <button class="buy" data-act="adm-speed" data-input="admSpeed">Установить</button></div>
      <div class="row">${[16, 50, 100, 150, 300].map(v => `<button class="buy blue" data-act="adm-speed" data-arg="${v}">${v}</button>`).join('')}</div>
      <div class="section">🏃 Дорожка: ур. ${s.tread} · 🏠 Слоты: ${s.slots}</div>
      <div class="row two">
        <button class="buy blue" data-act="adm-tread" data-arg="-1">Дорожка −</button>
        <button class="buy blue" data-act="adm-tread" data-arg="1">Дорожка +</button>
        <button class="buy blue" data-act="adm-slots" data-arg="-1">Слоты −</button>
        <button class="buy blue" data-act="adm-slots" data-arg="1">Слоты +</button></div>
      <div class="section">⚙️ Читы</div>
      <div class="menu-btns">
        <button class="buy ${s.god ? '' : 'blue'}" data-act="adm-god">🛡 Неуловимость: ${on(s.god)}</button>
        <button class="buy ${s.forceLeg ? '' : 'blue'}" data-act="adm-leg">⭐ Всегда легендарные: ${on(s.forceLeg)}</button>
        <button class="buy blue" data-act="adm-hatch">🐣 Вылупить все яйца сейчас</button>
        <button class="buy blue" data-act="adm-skins">👕 Открыть все скины</button>
        <button class="buy danger" data-act="adm-logout">🚪 Выйти из админки</button>
      </div>`;
  }
}
