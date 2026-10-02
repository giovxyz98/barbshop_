// Funzioni condivise da tutte le pagine: API, sessione, date, finestre di dialogo, intestazione e navigazione.
// Il backend serve anche il front-end (http://localhost:3000), quindi di norma le API sono sulla stessa origine.
// Aprendo i file direttamente (file://) si usa il backend locale; per altri casi impostare window.BARBSHOP_API.
const API_BASE = window.BARBSHOP_API || (location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api');

const NOMI_GIORNO = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const NOMI_MESE = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// ---------- utilità ----------

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad = n => String(n).padStart(2, '0');

function debounce(fn, ms = 250) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ---------- date (sempre YYYY-MM-DD, ora locale) ----------

const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoDate(new Date());
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDaysISO = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoDate(d); };
const fmtDataBreve = s => { const d = parseISO(s); return `${NOMI_GIORNO[d.getDay()].slice(0, 3)} ${d.getDate()} ${NOMI_MESE[d.getMonth()].slice(0, 3).toLowerCase()}`; };
const fmtDataLunga = s => { const d = parseISO(s); return `${NOMI_GIORNO[d.getDay()]} ${d.getDate()} ${NOMI_MESE[d.getMonth()]} ${d.getFullYear()}`; };
const fmtEuro = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// ---------- sessione (login fittizio: l'utente vive in sessionStorage) ----------

function session() {
    try { return JSON.parse(sessionStorage.getItem('user')); } catch (e) { return null; }
}
function setSession(user) {
    try { sessionStorage.setItem('user', JSON.stringify(user)); } catch (e) { /* storage non disponibile */ }
}
function logout() {
    try { sessionStorage.removeItem('user'); } catch (e) { /* ignora */ }
    location.href = 'index.html';
}
// Restituisce l'utente se loggato con il ruolo richiesto, altrimenti reindirizza e restituisce null.
function guard(ruolo) {
    const u = session();
    if (!u) { location.replace('index.html'); return null; }
    if (ruolo && u.ruolo !== ruolo) { location.replace(u.ruolo === 'admin' ? 'admin.html' : 'home.html'); return null; }
    return u;
}

// ---------- API ----------

async function api(method, path, body) {
    try {
        const r = await fetch(API_BASE + path, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, data, error: r.ok ? null : (data && (data.error || data.message)) || 'Errore imprevisto' };
    } catch (e) {
        return { ok: false, status: 0, data: null, error: 'Server non raggiungibile. Controlla che sia avviato.' };
    }
}

// ---------- toast ----------

function toast(msg, type = 'ok') {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'err' ? ' err' : '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), type === 'err' ? 5000 : 3000);
}

// ---------- finestre di dialogo ----------

function openModal(html) {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(back);
    const prev = document.activeElement;
    const close = () => { document.removeEventListener('keydown', onKey); back.remove(); if (prev && prev.focus) prev.focus(); };
    const onKey = e => { if (e.key === 'Escape') { close(); back.dispatchEvent(new CustomEvent('dismiss')); } };
    document.addEventListener('keydown', onKey);
    const first = $('input, select, textarea, button', back);
    if (first) first.focus();
    return { el: $('.modal', back), back, close };
}

function confirmDialog({ title, message, confirmText = 'Conferma', cancelText = 'Annulla', danger = false }) {
    return new Promise(resolve => {
        const m = openModal(`
            <h2>${esc(title)}</h2>
            <p class="muted">${esc(message)}</p>
            <div class="buttons">
                <button type="button" class="btn-ghost" data-act="no">${esc(cancelText)}</button>
                <button type="button" class="${danger ? 'btn-danger solid' : ''}" data-act="si">${esc(confirmText)}</button>
            </div>`);
        const done = v => { m.close(); resolve(v); };
        $('[data-act="no"]', m.el).onclick = () => done(false);
        $('[data-act="si"]', m.el).onclick = () => done(true);
        m.back.addEventListener('dismiss', () => resolve(false));
    });
}

// Finestra con un modulo. fields: [{name,label,type,value,required,options,hint,attrs}].
// onSubmit(valori) può restituire un testo d'errore (la finestra resta aperta) oppure niente (si chiude).
function formModal({ title, intro, fields, submitText = 'Salva', danger = false, onSubmit }) {
    return new Promise(resolve => {
        const campi = fields.map(f => {
            const id = `f_${f.name}`;
            const attrs = Object.entries(f.attrs || {}).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
            if (f.type === 'checkbox') {
                return `<div class="check"><input type="checkbox" id="${id}" name="${f.name}" ${f.value ? 'checked' : ''}><label class="lbl" for="${id}">${esc(f.label)}</label></div>`;
            }
            let ctrl;
            if (f.type === 'select') {
                ctrl = `<select id="${id}" name="${f.name}">${(f.options || []).map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(f.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
            } else if (f.type === 'textarea') {
                ctrl = `<textarea id="${id}" name="${f.name}" ${f.required ? 'required' : ''} ${attrs}>${esc(f.value ?? '')}</textarea>`;
            } else {
                ctrl = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" ${f.required ? 'required' : ''} ${attrs} ${f.list ? `list="${f.list.id}"` : ''}>`;
            }
            const lista = f.list ? `<datalist id="${f.list.id}">${f.list.values.map(v => `<option value="${esc(v)}">`).join('')}</datalist>` : '';
            return `<div class="field"><label for="${id}">${esc(f.label)}</label>${ctrl}${lista}${f.hint ? `<span class="muted" style="font-size:.75rem">${esc(f.hint)}</span>` : ''}</div>`;
        }).join('');

        const m = openModal(`
            <h2>${esc(title)}</h2>
            ${intro ? `<p class="muted">${esc(intro)}</p>` : ''}
            <form novalidate>${campi}
                <div class="form-error" role="alert"></div>
                <div class="buttons">
                    <button type="button" class="btn-ghost" data-act="no">Annulla</button>
                    <button type="submit" class="${danger ? 'btn-danger solid' : ''}">${esc(submitText)}</button>
                </div>
            </form>`);
        const form = $('form', m.el);
        const err = $('.form-error', m.el);
        const submit = $('[type="submit"]', m.el);
        $('[data-act="no"]', m.el).onclick = () => { m.close(); resolve(false); };
        m.back.addEventListener('dismiss', () => resolve(false));

        form.addEventListener('submit', async e => {
            e.preventDefault();
            err.textContent = '';
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const valori = {};
            fields.forEach(f => {
                const el = form.elements[f.name];
                valori[f.name] = f.type === 'checkbox' ? el.checked : el.value;
            });
            submit.disabled = true;
            const problema = onSubmit ? await onSubmit(valori) : undefined;
            submit.disabled = false;
            if (typeof problema === 'string' && problema) { err.textContent = problema; return; }
            m.close();
            resolve(true);
        });
    });
}

// ---------- intestazione e navigazione ----------

const NAV = {
    cliente: [
        { id: 'home', href: 'home.html', icon: 'fa-house', label: 'Home' },
        { id: 'prenota', href: 'prenota.html', icon: 'fa-calendar-check', label: 'Prenota' },
        { id: 'shop', href: 'shop.html', icon: 'fa-bag-shopping', label: 'Shop' },
        { id: 'profilo', href: 'profilo.html', icon: 'fa-user', label: 'Profilo' },
    ],
    admin: [
        { id: 'agenda', href: 'admin.html', icon: 'fa-calendar-days', label: 'Agenda' },
        { id: 'servizi', href: 'admin_servizi.html', icon: 'fa-scissors', label: 'Servizi' },
        { id: 'prodotti', href: 'admin_prodotti.html', icon: 'fa-bag-shopping', label: 'Prodotti' },
        { id: 'orari', href: 'admin_orari.html', icon: 'fa-clock', label: 'Orari' },
        { id: 'utenti', href: 'admin_utenti.html', icon: 'fa-users', label: 'Utenti' },
        { id: 'profilo', href: 'profilo.html', icon: 'fa-user', label: 'Profilo' },
    ],
};

function renderHeader(user) {
    const el = $('#header');
    if (!el) return;
    el.innerHTML = `<header class="hero"><div class="overlay">
        <img data-brand-logo class="logo" alt="">
        <p data-brand="completo"></p>
        ${user && user.ruolo === 'admin' ? '<span class="ruolo">Admin</span>' : ''}
    </div></header>`;
    if (window.applyBrand) window.applyBrand();
}

function renderNav(user, active) {
    const el = $('#nav');
    if (!el) return;
    el.className = 'bottom-nav';
    el.setAttribute('aria-label', 'Navigazione principale');
    el.innerHTML = NAV[user.ruolo].map(v =>
        `<a href="${v.href}" id="nav-${v.id}" ${v.id === active ? 'class="active" aria-current="page"' : ''}><i class="fa ${v.icon}"></i><span>${v.label}</span></a>`).join('');
}

function setNavBadge(id, count) {
    const a = $(`#nav-${id}`);
    if (!a) return;
    const old = $('.dot', a);
    if (old) old.remove();
    if (count > 0) a.insertAdjacentHTML('afterbegin', `<b class="dot">${count}</b>`);
}

// Prepara una pagina protetta: controlla la sessione e disegna intestazione e navigazione.
function initPage(ruolo, active) {
    const user = guard(ruolo);
    if (!user) return null;
    renderHeader(user);
    renderNav(user, active);
    return user;
}

// ---------- pezzi di interfaccia ----------

const loadingHtml = (t = 'Caricamento…') => `<div class="loading">${esc(t)}</div>`;
const emptyHtml = (icon, text) => `<div class="empty"><i class="fa ${icon}"></i>${esc(text)}</div>`;

// Aggiorna il numero di richieste di registrazione sul badge "Utenti" (solo admin).
async function aggiornaBadgeRichieste() {
    const r = await api('GET', '/registrazioni');
    if (r.ok) setNavBadge('utenti', r.data.richieste.length);
    return r.ok ? r.data.richieste.length : 0;
}
