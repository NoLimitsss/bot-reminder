/* ============================================================
   TELEGRAM WEBAPP — EVENT REMINDER APP
   ============================================================
   Sections:
     1. Telegram WebApp setup
     2. Constants
     3. App state
     4. Screen navigation
     5. Splash screen
     6. Clock
     7. Event list rendering
     8. Event details modal (view / edit / delete)
     9. Time picker
    10. Date picker (mode switch: once / monthly / yearly)
    11. Date picker — "once" mode
    12. Date picker — "monthly" mode
    13. Date picker — "yearly" mode
    14. Save event
    15. Date helpers (shared)
    16. FAQ accordion
    17. Misc UI behavior (notes field auto-scroll)
    18. App init
   ============================================================ */


/* ============================================================
   1. TELEGRAM WEBAPP SETUP
   ============================================================ */
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Light theme: the white splash logo would vanish on a light background -> invert it
if (tg.colorScheme === 'light') document.body.classList.add('theme-light');

// Greeting for the header: adapts to the time of day and remembers the last
// visit. Same day + same time-slot as the previous visit -> "С возвращением";
// any other case (new day, new slot, first ever visit) -> a time-of-day
// greeting. The last visit (date + slot) is kept in localStorage.
function getGreeting(name) {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toDateString();

    let period, timeGreeting;
    if (hour >= 5 && hour < 12) {
        period = 'morning';
        timeGreeting = `Доброе утро, ${name}!`;
    } else if (hour >= 12 && hour < 18) {
        period = 'day';
        timeGreeting = `Добрый день, ${name}!`;
    } else if (hour >= 18 && hour < 23) {
        period = 'evening';
        timeGreeting = `Добрый вечер, ${name}!`;
    } else {
        period = 'night';
        timeGreeting = `Доброй ночи, ${name}!`;
    }

    const lastDate = localStorage.getItem('greeting_date');
    const lastPeriod = localStorage.getItem('greeting_period');

    localStorage.setItem('greeting_date', today);
    localStorage.setItem('greeting_period', period);

    if (lastDate === today && lastPeriod === period) {
        return `С возвращением, ${name}!`;
    }
    return timeGreeting;
}

// Show a personalized greeting in the header, if Telegram gave us a user.
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const name = tg.initDataUnsafe.user.first_name;
    document.getElementById('greeting').innerText = getGreeting(name);
}


/* ============================================================
   1.5 ENVIRONMENT
   ============================================================
   Access control now lives on the SERVER (it verifies Telegram's
   signed initData and checks ALLOWED_USER_IDS). The old frontend
   "доступ ограничен" stub is gone — the UI is harmless without
   data, and the data is protected server-side.
   ============================================================ */

// Local development / preview: opened from a file or localhost.
// Used to pick the API base (localhost vs production).
function isDevEnvironment() {
    const host = location.hostname;
    return location.protocol === 'file:'
        || host === 'localhost'
        || host === '127.0.0.1'
        || host === ''
        || host.endsWith('.local');
}


/* ============================================================
   2. CONSTANTS
   ============================================================ */
const MONTHS_FULL = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];


/* ============================================================
   2.5 EVENT STORE (data layer)
   ============================================================
   Every read/write to event data goes through this object, and
   nowhere else in the app. It talks to the backend API over
   fetch(); the rest of the app (rendering, forms, buttons) only
   knows these five methods, all of which now return Promises.

   API base + user id:
   - API_BASE points at the backend (localhost in dev, the real
     domain in production — auto-selected via isDevEnvironment()).
   - Every request carries an X-User-Id header so the backend
     returns/stores only THIS user's events. Outside Telegram
     (local browser testing) there's no Telegram user, so we fall
     back to DEV_USER_ID.

   Event shape (single source of truth for what an event is):
   {
     id:        number   — assigned by the backend
     name:      string
     type:      'once' | 'monthly' | 'yearly'
     day:       string   — '01'..'31'
     month:     string   — '01'..'12'
     year:      string|null  — only meaningful for 'once' / 'yearly'
     period:    string|null  — only meaningful for 'monthly' (repeat every N months)
     time:      string   — 'HH:MM' or '—'  (API uses null for "no time")
     important: boolean
     notes:     string
   }
   ============================================================ */
const API_BASE = isDevEnvironment()
    ? 'http://localhost:8000'
    : 'https://82.202.130.158.sslip.io';   // prod: API на VPS (фронт на GitHub Pages)

const DEV_USER_ID = 466153252;          // used only outside Telegram (local testing)

function getUserId() {
    const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
    return user ? user.id : DEV_USER_ID;
}

// Shared API call with the auth headers (used by settings; EventStore has its own copy)
async function apiRequest(path, options = {}) {
    const res = await fetch(API_BASE + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Init-Data': (tg.initData || ''),
            'X-User-Id': String(getUserId()),
            ...(options.headers || {})
        }
    });
    if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
    return res.status === 204 ? null : res.json();
}

const EventStore = (() => {
    async function request(path, options = {}) {
        const res = await fetch(API_BASE + path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                // Signed Telegram data — the server verifies this (can't be forged)
                'X-Init-Data': (tg.initData || ''),
                // Plain id — used only by a local dev server (ignored in production)
                'X-User-Id': String(getUserId()),
                ...(options.headers || {})
            }
        });
        if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
        return res.status === 204 ? null : res.json();
    }

    // Backend → app shape (API sends null for "no time"; the app uses '—')
    function fromApi(e) {
        return { ...e, time: e.time || '—', notes: e.notes || '', important: !!e.important };
    }

    // App → backend shape (drop the sentinel '—', send real null)
    function toApi(e) {
        return {
            name: e.name,
            type: e.type,
            day: e.day,
            month: e.month,
            year: e.year ?? null,
            period: e.period ?? null,
            time: (e.time && e.time !== '—') ? e.time : null,
            important: !!e.important,
            notes: e.notes || ''
        };
    }

    return {
        // Returns all events, sorted by next occurrence (soonest first)
        async getAll() {
            const events = (await request('/events')).map(fromApi);
            return events.sort((a, b) => getNextOccurrence(a) - getNextOccurrence(b));
        },

        // Returns a single event by id, or null
        async getById(id) {
            const all = await this.getAll();
            return all.find(e => e.id === id) || null;
        },

        // Adds a new event. Returns the saved event (with its backend id).
        async add(eventData) {
            return fromApi(await request('/events', {
                method: 'POST',
                body: JSON.stringify(toApi(eventData))
            }));
        },

        // Updates an existing event by id. Returns the updated event.
        async update(id, eventData) {
            return fromApi(await request(`/events/${id}`, {
                method: 'PUT',
                body: JSON.stringify(toApi(eventData))
            }));
        },

        // Deletes an event by id. Returns true on success.
        async delete(id) {
            await request(`/events/${id}`, { method: 'DELETE' });
            return true;
        }
    };
})();


/* ============================================================
   3. APP STATE
   ============================================================ */
let currentEvent = null;       // event currently shown in the details modal
let currentAddMode = 'once';   // 'once' | 'monthly' | 'yearly' — active mode in the add-event form
let editingEventId = null;     // id of the event being edited, or null when creating a new one


/* ============================================================
   4. SCREEN NAVIGATION
   ============================================================ */
function showScreen(screenName) {
    document.querySelectorAll('.screen, #main-screen').forEach(el => {
        el.style.display = 'none';
    });

    if (screenName === 'main') {
        const main = document.getElementById('main-screen');
        main.style.display = 'flex';
        main.offsetHeight; // force reflow so the transition replays
        return;
    }

    const target = document.getElementById(screenName + '-screen');
    if (!target) return;

    target.style.display = 'flex';
    if (screenName === 'all') renderAllEvents();
    if (screenName === 'upcoming') renderUpcoming();
    if (screenName === 'settings') renderSettings();
}

// Opens the add-event screen in "create new" mode (clears any leftover edit state / form values)
function showAddScreen() {
    editingEventId = null;
    resetAddForm();
    showScreen('add');
}


/* ============================================================
   5. SPLASH SCREEN
   ============================================================ */
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.style.visibility = 'hidden', 500);
    }, 2000);
});


/* ============================================================
   6. CLOCK
   ============================================================ */
function updateClock() {
    const now = new Date();
    document.getElementById('current-day').innerText = `Сегодня: ${WEEKDAYS[now.getDay()]}`;
    document.getElementById('current-time').innerText = now.toLocaleTimeString('ru-RU');
    document.getElementById('current-date').innerText =
        now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}


/* ============================================================
   7. EVENT LIST RENDERING
   ============================================================ */
// ----- "All events" screen: filter + sort/group, no per-card timer -----
async function renderAllEvents() {
    const container = document.getElementById('all-list');
    if (!container) return;

    const filter = document.getElementById('all-filter').value; // all | once | monthly | yearly
    const sort = document.getElementById('all-sort').value;      // date | month

    container.innerHTML = '<div class="empty-state">Загрузка…</div>';

    let events;
    try {
        events = await EventStore.getAll(); // sorted by next occurrence (soonest first)
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state">Не удалось загрузить события. Бэкенд недоступен.</div>';
        return;
    }

    if (filter !== 'all') events = events.filter(e => e.type === filter);

    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">Список событий пуст</div>';
        return;
    }

    if (sort === 'month') {
        renderGroupedByMonth(container, events);
    } else {
        events.forEach((event, index) => {
            container.appendChild(buildEventCard(event, index, { showTimer: false }));
        });
    }
}

// Groups events into "Январь", "Февраль", … blocks (sort + group in one).
// Within each month the events keep their soonest-first order.
function renderGroupedByMonth(container, events) {
    let counter = 0;
    for (let m = 1; m <= 12; m++) {
        const group = events.filter(e => parseInt(e.month, 10) === m);
        if (group.length === 0) continue;

        const wrap = document.createElement('div');
        wrap.className = 'month-group';

        const title = document.createElement('div');
        title.className = 'month-group-title';
        title.innerText = MONTHS_FULL[m - 1];
        wrap.appendChild(title);

        group.forEach(event => {
            wrap.appendChild(buildEventCard(event, counter++, { showTimer: false }));
        });

        container.appendChild(wrap);
    }
}

// ----- "Upcoming" screen: filter by type + time window, keep the timer -----
async function renderUpcoming() {
    const container = document.getElementById('upcoming-list');
    if (!container) return;

    const filter = document.getElementById('upcoming-filter').value;       // all | once | monthly | yearly
    const days = parseInt(document.getElementById('upcoming-range').value, 10); // 7 | 14 | 30 | 60

    container.innerHTML = '<div class="empty-state">Загрузка…</div>';

    let all;
    try {
        all = await EventStore.getAll(); // sorted soonest-first
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state">Не удалось загрузить события. Бэкенд недоступен.</div>';
        return;
    }

    const now = new Date();
    // Lower bound = start of today, so all-day (no-time) events dated today still
    // count as upcoming even though their time is 00:00 and is technically "past".
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const events = all
        .filter(e => filter === 'all' || e.type === filter)
        .filter(e => {
            const occ = getNextOccurrence(e);
            return occ >= startOfToday && occ <= limit;
        });

    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = `<div class="empty-state">Нет событий за выбранный период (${days} дн.)</div>`;
        return;
    }

    events.forEach((event, index) => {
        container.appendChild(buildEventCard(event, index, { showTimer: true }));
    });
}

// Builds one event card. The important badge sits under the number (so it
// never hides behind the timer). The side timer is shown only when asked
// (upcoming screen); "all events" cards have no timer.
function buildEventCard(event, index, options = {}) {
    const { showTimer = false } = options;
    const dateLabel = formatEventDate(event);
    // Time appended only when set — no trailing "· —" clutter
    const timeStr = (event.time && event.time !== '—') ? ` · ${event.time}` : '';

    const importanceBadge = event.important
        ? '<div class="event-important-badge">⚠️</div>'
        : '';

    let timerHtml = '';
    if (showTimer) {
        const t = getTimeRemaining(event);
        const cls = t === 'Уже наступило' ? 'event-timer event-timer--passed' : 'event-timer';
        timerHtml = `<div class="${cls}">${t}</div>`;
    }

    const card = document.createElement('div');
    // Type is encoded by the colored left border (see .event-card--*), not an icon
    card.className = `event-card event-card--${event.type}`;
    card.innerHTML = `
        <div class="event-card-row">
            <div class="event-card-left">
                <div class="event-number">#${index + 1}</div>
                ${importanceBadge}
            </div>
            <div class="event-card-body">
                <div class="event-name">${event.name}</div>
                <div class="event-meta">
                    <small class="event-date-line">${dateLabel}${timeStr}</small>
                    ${timerHtml}
                </div>
            </div>
        </div>`;
    card.onclick = () => openDetails(event);
    return card;
}

// Builds a human-readable date string from an event's day/month/year/period fields.
// Monthly uses the short "мес." form to save space: (Каждый мес.) / (Раз в X мес.)
function formatEventDate(event) {
    if (event.type === 'monthly') {
        const periodText = event.period === '1' ? 'Каждый мес.' : `Раз в ${event.period} мес.`;
        return `${event.day}.${event.month} (${periodText})`;
    }
    if (event.type === 'yearly' && !event.year) {
        return `${event.day}.${event.month}`;   // year is optional for yearly
    }
    return `${event.day}.${event.month}.${event.year}`;
}

// Returns a Date object for the next time this event will occur.
// - once:    the exact date/time, regardless of whether it's already passed (caller decides what to do with a past date)
// - yearly:  the next upcoming day.month, this year or next
// - monthly: the next upcoming day-of-month that lands on the day/period cycle, starting from `year`/`month` as the anchor
function getNextOccurrence(event) {
    const now = new Date();
    const [h, min] = (event.time && event.time !== '—') ? event.time.split(':') : ['00', '00'];
    const day = parseInt(event.day, 10);
    const month = parseInt(event.month, 10);

    if (event.type === 'once') {
        return new Date(parseInt(event.year, 10), month - 1, day, h, min);
    }

    if (event.type === 'yearly') {
        let candidate = new Date(now.getFullYear(), month - 1, day, h, min);
        if (candidate < now) candidate = new Date(now.getFullYear() + 1, month - 1, day, h, min);
        return candidate;
    }

    if (event.type === 'monthly') {
        const period = parseInt(event.period, 10) || 1;
        // Anchor: the first occurrence, built from the event's stored year/month/day
        let candidate = new Date(parseInt(event.year, 10) || now.getFullYear(), month - 1, day, h, min);
        // Step forward by `period` months until we're in the future
        while (candidate < now) {
            candidate = new Date(candidate.getFullYear(), candidate.getMonth() + period, day, h, min);
        }
        return candidate;
    }

    return now; // fallback, shouldn't happen
}

function getTimeRemaining(event) {
    const now = new Date();
    const diff = getNextOccurrence(event) - now;
    if (diff <= 0) return 'Уже наступило';

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);

    // < 24h left → show hours + minutes; otherwise days + hours
    if (days > 0) return `${days} дн. ${hours} ч.`;
    return `${hours} ч. ${mins} мин.`;
}

// Russian plural helper: plural(2, 'день','дня','дней') -> 'дня'
function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

// Full countdown text for the modal: "До события: X дней, Y часов, Z минут".
// Minutes are shown only when the event has a specific time set.
function getCountdownText(event) {
    const now = new Date();
    let diff = getNextOccurrence(event) - now;
    if (diff <= 0) return 'Событие уже наступило';

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    diff -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    diff -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diff / (60 * 1000));

    const hasTime = event.time && event.time !== '—';

    const parts = [
        `${days} ${plural(days, 'день', 'дня', 'дней')}`,
        `${hours} ${plural(hours, 'час', 'часа', 'часов')}`
    ];
    if (hasTime) parts.push(`${minutes} ${plural(minutes, 'минута', 'минуты', 'минут')}`);

    return 'До события: ' + parts.join(', ');
}


/* ============================================================
   8. EVENT DETAILS MODAL (view / edit / delete)
   ============================================================ */
function openDetails(event) {
    currentEvent = event;
    // Important icon goes BEFORE the name: "⚠️ Название события"
    document.getElementById('modal-title').textContent =
        (event.important ? '⚠️ ' : '') + event.name;
    document.getElementById('modal-date').innerText = formatEventDate(event);
    document.getElementById('modal-time').innerText = event.time || '—';
    document.getElementById('modal-countdown').innerText = getCountdownText(event);
    document.getElementById('modal-notes-display').innerText = event.notes || 'Без примечаний';
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

function editEvent() {
    if (!currentEvent) return;

    closeModal();
    editingEventId = currentEvent.id;
    showScreen('add');

    document.getElementById('add-screen-title').innerText = 'Редактировать событие';
    document.getElementById('event-name').value = currentEvent.name;
    document.getElementById('event-notes').value = currentEvent.notes || '';
    document.getElementById('event-important').checked = !!currentEvent.important;

    // Activate the correct type button and rebuild the date pickers for that mode
    // BEFORE filling in values — initOnceMode/initMonthlyMode/initYearlyMode rebuild
    // <option> lists from scratch, so filling values first would just get wiped out.
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    const typeButtons = document.querySelectorAll('.type-option');
    const modeIndex = { once: 0, monthly: 1, yearly: 2 }[currentEvent.type];
    if (typeButtons[modeIndex]) typeButtons[modeIndex].classList.add('active');
    updatePickerMode(currentEvent.type);

    document.getElementById('day-select').value = currentEvent.day;
    document.getElementById('month-select').value = currentEvent.month;

    if (currentEvent.type === 'monthly') {
        document.getElementById('year-select').value = currentEvent.period;
    } else {
        document.getElementById('year-select').value = currentEvent.year || '';
    }
    setDateDisabled(false); // editing: a type is set, so the date is active
    updateDateButton();

    document.getElementById('real-time').value = currentEvent.time !== '—' ? currentEvent.time : '';
    if (currentEvent.time && currentEvent.time !== '—') {
        document.getElementById('time-btn').innerText = `⏰ ${currentEvent.time}`;
    } else {
        document.getElementById('time-btn').innerText = '⏰ Выбрать время';
    }
}

async function deleteEvent() {
    if (!currentEvent) return;
    if (!confirm('Удалить событие?')) return;

    try {
        await EventStore.delete(currentEvent.id);
    } catch (err) {
        console.error(err);
        alert('Не удалось удалить событие (бэкенд недоступен).');
        return;
    }

    closeModal();
    showScreen('all');
}


/* ============================================================
   9. TIME PICKER (custom scroll-wheel, iOS-style)
   ============================================================
   The hidden <input type="time" id="real-time"> stays in the DOM
   purely as the value store (saveEvent/editEvent read & write it).
   The visible UI is a custom two-column wheel (hours / minutes),
   so it looks right inside Telegram with no extra libraries.
   ============================================================ */
const TP_ITEM_HEIGHT = 40; // must match .tp-item height in CSS

// Opens the wheel picker, seeded from the current value (or "now")
function pickTime() {
    const overlay = document.getElementById('time-picker-overlay');
    const hoursCol = document.getElementById('tp-hours');
    const minsCol = document.getElementById('tp-minutes');

    const current = document.getElementById('real-time').value;
    let h, m;
    if (/^\d{2}:\d{2}$/.test(current)) {
        [h, m] = current.split(':').map(Number);
    } else {
        h = new Date().getHours();
        m = 0;
    }

    buildWheel(hoursCol, 24);
    buildWheel(minsCol, 60);

    overlay.style.display = 'flex';

    // Scroll to the seeded values once the sheet is laid out
    requestAnimationFrame(() => {
        setWheel(hoursCol, h);
        setWheel(minsCol, m);
        highlightCentered(hoursCol);
        highlightCentered(minsCol);
    });
}

// Confirms (confirmed=true) or cancels the picker
function closeTimePicker(confirmed) {
    const overlay = document.getElementById('time-picker-overlay');

    if (confirmed) {
        const h = wheelValue(document.getElementById('tp-hours'));
        const m = wheelValue(document.getElementById('tp-minutes'));
        const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        document.getElementById('real-time').value = value;
        document.getElementById('time-btn').innerText = `⏰ ${value}`;
    }

    overlay.style.display = 'none';
}

// Clears the chosen time (event is saved with no time)
function clearTime() {
    document.getElementById('real-time').value = '';
    document.getElementById('time-btn').innerText = '⏰ Выбрать время';
    closeTimePicker(false);
}

// Fills a column with padded numbers 0..count-1, wrapped in centering spacers
function buildWheel(columnEl, count) {
    columnEl.innerHTML = '<div class="tp-spacer"></div>';
    for (let i = 0; i < count; i++) {
        const item = document.createElement('div');
        item.className = 'tp-item';
        item.textContent = String(i).padStart(2, '0');
        item.addEventListener('click', () => {
            columnEl.scrollTo({ top: i * TP_ITEM_HEIGHT, behavior: 'smooth' });
        });
        columnEl.appendChild(item);
    }
    columnEl.insertAdjacentHTML('beforeend', '<div class="tp-spacer"></div>');
}

// The value currently centered in a column
function wheelValue(columnEl) {
    return Math.round(columnEl.scrollTop / TP_ITEM_HEIGHT);
}

// Scrolls a column so `value` sits in the center band
function setWheel(columnEl, value) {
    columnEl.scrollTop = value * TP_ITEM_HEIGHT;
}

// Visually emphasises the centered item as the wheel scrolls
function highlightCentered(columnEl) {
    const idx = wheelValue(columnEl);
    columnEl.querySelectorAll('.tp-item').forEach((el, i) => {
        el.classList.toggle('tp-item--active', i === idx);
    });
}

// Wires scroll highlighting + backdrop-tap-to-close (runs once at startup)
function initTimePicker() {
    const overlay = document.getElementById('time-picker-overlay');
    if (!overlay) return;

    ['tp-hours', 'tp-minutes'].forEach(id => {
        const col = document.getElementById(id);
        let ticking = false;
        col.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                highlightCentered(col);
                ticking = false;
            });
        });
    });

    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeTimePicker(false);
    });
}


/* ============================================================
   9.5 DATE WHEEL PICKER (day / month / year)
   ============================================================
   The three <select>s (day/month/year) stay the hidden data model —
   the mode functions populate them and validation runs on them. This
   wheel sheet MIRRORS their current options and writes the chosen
   values back, so it works for all modes (once/monthly/yearly) for free.
   ============================================================ */

// Reads {value,label} from a <select>'s options, skipping the empty placeholder.
function optionsFromSelect(select) {
    return Array.from(select.options)
        .filter(o => o.value !== '')
        .map(o => ({ value: o.value, label: o.textContent }));
}

// Fills a wheel column from a list of {value,label}; remembers values on the element.
function buildDateColumn(columnEl, items) {
    columnEl._values = items.map(it => it.value);
    columnEl.innerHTML = '<div class="tp-spacer"></div>';
    items.forEach((it, i) => {
        const el = document.createElement('div');
        el.className = 'tp-item' + (it.cls ? ' ' + it.cls : '');
        el.textContent = it.label;
        el.addEventListener('click', () => {
            columnEl.scrollTo({ top: i * TP_ITEM_HEIGHT, behavior: 'smooth' });
        });
        columnEl.appendChild(el);
    });
    columnEl.insertAdjacentHTML('beforeend', '<div class="tp-spacer"></div>');
}

// The selected value of a date column (maps centered index -> stored value).
function dateColumnValue(columnEl) {
    const idx = wheelValue(columnEl);
    return (columnEl._values && columnEl._values[idx]) || '';
}

// Scrolls a date column to the item whose value matches (or the first item).
function setDateColumn(columnEl, value) {
    const idx = columnEl._values ? columnEl._values.indexOf(value) : -1;
    setWheel(columnEl, idx >= 0 ? idx : 0);
}

// Month items for the wheel. In "once" mode, when the current year is selected
// the past months of this year are dropped (you can't schedule into the past).
function monthItemsForMode() {
    let start = 1;
    if (currentAddMode === 'once') {
        const now = new Date();
        const y = parseInt(dateColumnValue(document.getElementById('dp-years')), 10);
        if (y === now.getFullYear()) start = now.getMonth() + 1;
    }
    const items = [];
    for (let i = start; i <= 12; i++) {
        items.push({ value: String(i).padStart(2, '0'), label: MONTHS_FULL[i - 1] });
    }
    return items;
}

// Rebuilds the month column (used when the year changes in "once" mode, which can
// add/remove the past months). Keeps the chosen month if it's still available.
// Rebuilds the month column. Fades (no glide) ONLY when the set of months
// actually changes — i.e. moving between the current year (past months dropped)
// and any other year (all 12). Switching between two non-current years is silent,
// since every such year shows the same 12 months. `onDone` runs after it settles.
function rebuildMonthWheel(onDone) {
    const monthsCol = document.getElementById('dp-months');
    const items = monthItemsForMode();
    const sig = items[0].value; // first available month ('01', or curM for this year)

    // Same month set already shown -> nothing changed, no fade
    if (monthsCol._monthSig === sig) { if (onDone) onDone(); return; }

    const prev = dateColumnValue(monthsCol);
    const apply = () => {
        buildDateColumn(monthsCol, items);
        monthsCol._monthSig = sig;
        let idx = monthsCol._values.indexOf(prev);
        if (idx < 0) idx = 0; // chosen month now past -> first available (current month)
        setWheel(monthsCol, idx);
        highlightCentered(monthsCol);
    };

    // Month set changed -> fade out, rebuild hidden, fade in (no glide for months)
    monthsCol.style.transitionDuration = DP_ANIM.fadeMs + 'ms';
    monthsCol.classList.add('dp-fading');
    setTimeout(() => {
        apply();
        monthsCol.classList.remove('dp-fading');
        if (onDone) onDone();
    }, DP_ANIM.pauseMs);
}

// Tunable animation params for the day-wheel reveal. The dev slider panel edits
// these live; once you like the values, bake them in and drop the panel.
const DP_ANIM = {
    fadeMs: 450,     // opacity fade out/in duration
    pauseMs: 470,    // wait after fade-out before rebuild (≈ fadeMs)
    glideItems: 3,   // how many days above the target the reveal starts
    glideMs: 400,    // duration of the glide scroll onto the target day
};

// Smoothly scrolls the day column from fromIdx to toIdx with an ease-out glide.
// Scroll-snap is turned off during the glide (mandatory snap would kill it),
// then restored and re-snapped onto the target.
function glideDayWheel(daysCol, fromIdx, toIdx) {
    daysCol.style.scrollSnapType = 'none';
    const start = fromIdx * TP_ITEM_HEIGHT;
    const dist = (toIdx * TP_ITEM_HEIGHT) - start;
    const t0 = performance.now();

    function step(now) {
        const p = Math.min(1, (now - t0) / DP_ANIM.glideMs);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic (decelerates at the end)
        daysCol.scrollTop = start + dist * eased;
        highlightCentered(daysCol);
        if (p < 1) {
            requestAnimationFrame(step);
        } else {
            daysCol.style.scrollSnapType = '';
            setWheel(daysCol, toIdx);
            highlightCentered(daysCol);
        }
    }
    requestAnimationFrame(step);
}

// Rebuilds the day column to match the month/year currently centered.
// Does NOTHING when the exact same day set is already shown (no flicker on
// same-length months). Fades + glides only when the day count actually changes.
function rebuildDayWheel(animate = true) {
    const daysCol = document.getElementById('dp-days');
    const m = parseInt(dateColumnValue(document.getElementById('dp-months')), 10);
    if (!m) return;

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curD = now.getDate();

    const yearVal = dateColumnValue(document.getElementById('dp-years'));
    // Recurring events (monthly/yearly) use a leap year so Feb 29 stays selectable;
    // only "once" needs the real year (its February length must be exact).
    const y = (currentAddMode === 'once') ? (parseInt(yearVal, 10) || curY) : 2024;
    const count = getDaysInMonth(y, m);

    // Hard past-prevention for "once": in the current month+year days start at today
    const startDay = (currentAddMode === 'once' && y === curY && m === curM) ? curD : 1;

    // Same exact day set already shown -> do nothing (no rebuild, no flicker)
    const sig = startDay + '_' + count;
    if (daysCol._daySig === sig) return;

    const items = [];
    for (let i = startDay; i <= count; i++) {
        items.push({ value: String(i).padStart(2, '0'), label: String(i) });
    }

    const prev = dateColumnValue(daysCol);   // remember the chosen day
    const prevCount = daysCol._dayCount;

    // Rebuild items, return the index to land on (keep the day, else the last one)
    const apply = () => {
        buildDateColumn(daysCol, items);
        daysCol._dayCount = items.length;
        daysCol._daySig = sig;
        let idx = daysCol._values.indexOf(prev);
        if (idx < 0) idx = items.length - 1; // chosen day vanished -> last valid day
        return idx;
    };

    // Silent rebuild: first build, no animation, or the day count didn't change
    if (!animate || prevCount === undefined || prevCount === items.length) {
        const idx = apply();
        requestAnimationFrame(() => { setWheel(daysCol, idx); highlightCentered(daysCol); });
        return;
    }

    // Count changed -> fade out, rebuild hidden, fade in + glide onto the new day
    daysCol.style.transitionDuration = DP_ANIM.fadeMs + 'ms';
    daysCol.classList.add('dp-fading');
    setTimeout(() => {
        const idx = apply();
        const startIdx = Math.max(0, idx - DP_ANIM.glideItems);
        setWheel(daysCol, startIdx);
        highlightCentered(daysCol);
        daysCol.classList.remove('dp-fading');
        requestAnimationFrame(() => glideDayWheel(daysCol, startIdx, idx));
    }, DP_ANIM.pauseMs);
}

// Dev-only floating panel: sliders to tune the reveal animation live.
function initDpTuner() {
    if (!isDevEnvironment()) return; // only locally, never for real users
    const panel = document.createElement('div');
    panel.id = 'dp-tuner';
    panel.innerHTML = `
        <div><b>День-анимация</b></div>
        <label>fade <input type="range" min="50" max="900" step="10" data-k="fadeMs"><span></span>мс</label>
        <label>pause <input type="range" min="50" max="900" step="10" data-k="pauseMs"><span></span>мс</label>
        <label>glide дни <input type="range" min="0" max="25" step="1" data-k="glideItems"><span></span></label>
        <label>glide <input type="range" min="100" max="1400" step="20" data-k="glideMs"><span></span>мс</label>
    `;
    document.body.appendChild(panel);
    panel.querySelectorAll('input').forEach(inp => {
        inp.value = DP_ANIM[inp.dataset.k];
        const upd = () => {
            DP_ANIM[inp.dataset.k] = Number(inp.value);
            inp.nextElementSibling.textContent = inp.value;
        };
        inp.addEventListener('input', upd);
        upd();
    });
}

// Opens the date sheet, seeded from the current select values.
function openDatePicker() {
    const btn = document.getElementById('date-btn');
    if (btn && btn.classList.contains('dp-disabled')) return; // type not chosen yet

    const daySel = document.getElementById('day-select');
    const monthSel = document.getElementById('month-select');
    const yearSel = document.getElementById('year-select');

    const daysCol = document.getElementById('dp-days');
    const monthsCol = document.getElementById('dp-months');
    const yearsCol = document.getElementById('dp-years');

    // Third column mirrors the select (years or, in monthly mode, periods).
    // Yearly keeps the optional empty "Без года" option at the top.
    const thirdItems = optionsFromSelect(yearSel);
    if (currentAddMode === 'yearly') {
        thirdItems.unshift({ value: '', label: 'Без года', cls: 'tp-item-sm' });
    }
    buildDateColumn(yearsCol, thirdItems);

    const isMonthly = currentAddMode === 'monthly';
    const thirdLabel = document.getElementById('dp-third-label');
    thirdLabel.innerText = isMonthly ? 'Период (раз в)' : 'Год';
    thirdLabel.classList.toggle('dp-period', isMonthly); // match the wider period column
    yearsCol.classList.toggle('dp-period', isMonthly);
    // Keep the three columns symmetric in monthly mode (widens the day column)
    document.getElementById('date-picker-overlay').classList.toggle('dp-monthly', isMonthly);

    // Seed: keep an existing choice, otherwise default to TODAY (so "once" opens
    // on today's date and the past isn't offered).
    const today = new Date();
    const seedMonth = monthSel.value || String(today.getMonth() + 1).padStart(2, '0');
    const seedThird = yearSel.value || (currentAddMode === 'once' ? String(today.getFullYear()) : '');
    const seedDay = daySel.value || String(today.getDate()).padStart(2, '0');

    document.getElementById('date-picker-overlay').style.display = 'flex';

    requestAnimationFrame(() => {
        // Year first — the month list can depend on it (once mode drops past months)
        setDateColumn(yearsCol, seedThird);
        highlightCentered(yearsCol);
        buildDateColumn(monthsCol, monthItemsForMode());
        monthsCol._monthSig = monthsCol._values[0]; // baseline for the fade logic
        setDateColumn(monthsCol, seedMonth);
        highlightCentered(monthsCol);
        rebuildDayWheel(false); // build days from the seeded month/year, no fade on open
        requestAnimationFrame(() => {
            setDateColumn(daysCol, seedDay);
            highlightCentered(daysCol);
        });
    });
}

// Confirms (writes back to the selects) or cancels the date sheet.
function closeDatePicker(confirmed) {
    const overlay = document.getElementById('date-picker-overlay');

    if (confirmed) {
        const d = dateColumnValue(document.getElementById('dp-days'));
        const m = dateColumnValue(document.getElementById('dp-months'));
        const third = dateColumnValue(document.getElementById('dp-years'));

        const daySel = document.getElementById('day-select');
        const monthSel = document.getElementById('month-select');
        const yearSel = document.getElementById('year-select');

        // Write back and trigger the existing validation/status logic
        monthSel.value = m; monthSel.dispatchEvent(new Event('change'));
        yearSel.value = third; yearSel.dispatchEvent(new Event('change'));
        daySel.value = d; daySel.dispatchEvent(new Event('change'));

        updateDateButton();
    }

    overlay.style.display = 'none';
}

// Greys out (no type chosen) or activates the date button with a quick glow.
function setDateDisabled(disabled) {
    const btn = document.getElementById('date-btn');
    if (!btn) return;
    if (disabled) {
        btn.classList.add('dp-disabled');
        btn.classList.remove('dp-activate');
        btn.innerText = 'Выберите тип события';
    } else {
        btn.classList.remove('dp-disabled');
        // Tint the activation glow with the chosen type's colour
        const glow = { once: '#8e8e93', monthly: '#2ea6ff', yearly: '#34c759' }[currentAddMode];
        btn.style.setProperty('--dp-glow', glow || '#3390ec');
        btn.classList.remove('dp-activate');
        void btn.offsetWidth; // reflow so the glow animation restarts
        btn.classList.add('dp-activate');
        updateDateButton();
    }
}

// Updates the trigger button text from the current select values.
function updateDateButton() {
    const btn = document.getElementById('date-btn');
    if (!btn || btn.classList.contains('dp-disabled')) return;
    const d = document.getElementById('day-select').value;
    const m = document.getElementById('month-select').value;
    const third = document.getElementById('year-select').value;

    if (!d || !m) { btn.innerText = '📅 Выбрать дату'; return; }

    const monthName = MONTHS_FULL[parseInt(m, 10) - 1];
    let text = `📅 ${parseInt(d, 10)}, ${monthName}`;
    if (currentAddMode === 'monthly') {
        if (third) text += `, раз в ${third} мес.`;
    } else if (third) {
        text += ` ${third}`;
    }
    btn.innerText = text;
}

// Wires scroll highlighting + day-rebuild on month/year change (runs once at startup).
function initDatePicker() {
    const overlay = document.getElementById('date-picker-overlay');
    if (!overlay) return;

    ['dp-days', 'dp-months', 'dp-years'].forEach(id => {
        const col = document.getElementById(id);
        let ticking = false;
        col.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => { highlightCentered(col); ticking = false; });
        });
    });

    // When the month settles, rebuild the day wheel
    const monthsCol = document.getElementById('dp-months');
    let mSettle;
    monthsCol.addEventListener('scroll', () => {
        clearTimeout(mSettle);
        mSettle = setTimeout(() => rebuildDayWheel(), 160);
    });

    // When the year settles, the available months can change (once mode drops past
    // months of the current year) -> rebuild months first, then the day wheel
    const yearsCol = document.getElementById('dp-years');
    let ySettle;
    yearsCol.addEventListener('scroll', () => {
        clearTimeout(ySettle);
        ySettle = setTimeout(() => {
            // In once mode rebuild the month wheel first (it may fade), THEN the day
            // wheel — the callback keeps them in the right order.
            if (currentAddMode === 'once') {
                rebuildMonthWheel(() => rebuildDayWheel());
            } else {
                rebuildDayWheel();
            }
        }, 160);
    });

    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeDatePicker(false);
    });
}


/* ============================================================
   10. DATE PICKER — MODE SWITCH (once / monthly / yearly)
   ============================================================ */
function selectType(el, type) {
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    updatePickerMode(type);
    setDateDisabled(false); // type chosen -> activate the date button (with glow)
}

function updatePickerMode(mode) {
    currentAddMode = mode;

    if (mode === 'once') initOnceMode();
    else if (mode === 'monthly') initMonthlyMode();
    else if (mode === 'yearly') initYearlyMode();

    updateDateButton();
}

// Clears the add/edit form back to a blank "create new event" state
function resetAddForm() {
    document.getElementById('add-screen-title').innerText = 'Добавить событие';
    document.getElementById('event-name').value = '';
    document.getElementById('event-notes').value = '';
    document.getElementById('event-important').checked = false;
    document.getElementById('real-time').value = '';
    document.getElementById('time-btn').innerText = '⏰ Выбрать время';

    // No type is pre-selected: the user must pick one, which then activates
    // the date button (kept greyed-out until then).
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    currentAddMode = null;
    setDateDisabled(true);
}


/* ============================================================
   11. DATE PICKER — "ONCE" MODE
   ============================================================
   Single date in the future. Year + month + day, with the month
   list excluding months that have already passed in the current
   year, and day count clamped to the selected month's length.
   ============================================================ */
function initOnceMode() {
    const daySelect = document.getElementById('day-select');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    if (!daySelect || !monthSelect || !yearSelect) return;

    document.getElementById('date-picker-label').innerText = 'Укажите дату события:';
    yearSelect.style.display = 'block';

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;

    // Reset all three selects
    [daySelect, monthSelect, yearSelect].forEach(el => {
        el.innerHTML = '';
        el.className = 'custom-select';
    });

    // Populate years: current year onward
    yearSelect.innerHTML = '<option value="">Год</option>';
    for (let y = curY; y <= 2100; y++) yearSelect.add(new Option(y, y));

    // Visual status helper (filled / error)
    const setStatus = (el, isError) => {
        requestAnimationFrame(() => {
            if (isError) {
                el.classList.add('error');
                el.classList.remove('filled');
            } else if (el.value !== '') {
                el.classList.remove('error');
                el.classList.add('filled');
            } else {
                el.classList.remove('error', 'filled');
            }
        });
    };

    // Rebuilds the month list — only future months if the selected year is this year
    function updateMonthList() {
        const y = parseInt(yearSelect.value);
        const savedM = monthSelect.value;

        monthSelect.innerHTML = '<option value="">Месяц</option>';
        const startMonth = (y === curY) ? curM : 1;
        for (let i = startMonth; i <= 12; i++) {
            monthSelect.add(new Option(MONTHS_FULL[i - 1], i.toString().padStart(2, '0')));
        }
        if (savedM && parseInt(savedM) >= startMonth) monthSelect.value = savedM;
    }

    // Validates the day against the selected month/year and refreshes UI status
    function validate() {
        const m = parseInt(monthSelect.value, 10);
        const y = parseInt(yearSelect.value, 10);
        const d = parseInt(daySelect.value, 10);

        // Flag past months within the current year
        if (y === curY && !isNaN(m) && m < curM) {
            setStatus(monthSelect, true);
            setStatus(daySelect, true);
        }

        // Rebuild day list to match the selected month's length
        if (m) {
            const checkYear = y || curY;
            const daysInMonth = getDaysInMonth(checkYear, m);

            if (d > daysInMonth) {
                daySelect.value = '';
                setStatus(daySelect, true);
            } else {
                setStatus(daySelect, false);
            }

            const savedD = daySelect.value;
            daySelect.innerHTML = '<option value="">День</option>';
            for (let i = 1; i <= daysInMonth; i++) {
                daySelect.add(new Option(i, i.toString().padStart(2, '0')));
            }
            if (savedD && parseInt(savedD) <= daysInMonth) daySelect.value = savedD;
        }

        // Final pass: mark filled fields, but don't clear an existing error
        [daySelect, monthSelect, yearSelect].forEach(el => {
            if (el.classList.contains('error')) return;
            el.classList.toggle('filled', el.value !== '');
        });
    }

    yearSelect.addEventListener('change', () => { updateMonthList(); validate(); });
    monthSelect.addEventListener('change', validate);
    daySelect.addEventListener('change', validate);

    // Initial population: days, then months, then validate
    daySelect.innerHTML = '<option value="">День</option>';
    for (let i = 1; i <= 31; i++) daySelect.add(new Option(i, i.toString().padStart(2, '0')));

    updateMonthList();
    validate();
}


/* ============================================================
   12. DATE PICKER — "MONTHLY" MODE
   ============================================================
   Recurring event: day + month (the starting point) plus a
   repeat period of 1–11 months. The "year" select is repurposed
   to hold the period.
   ============================================================ */
function initMonthlyMode() {
    document.getElementById('date-picker-label').innerText = 'Укажите начало и цикличность события:';

    const daySelect = document.getElementById('day-select');
    const monthSelect = document.getElementById('month-select');
    const periodSelect = document.getElementById('year-select'); // repurposed as "period"
    if (!daySelect || !monthSelect || !periodSelect) return;

    periodSelect.style.display = 'block';
    [daySelect, monthSelect, periodSelect].forEach(el => el.innerHTML = '');

    // Day of month
    daySelect.innerHTML = '<option value="">День</option>';
    for (let i = 1; i <= 31; i++) daySelect.add(new Option(i, i.toString().padStart(2, '0')));

    // Month (full names)
    monthSelect.innerHTML = '<option value="">Месяц</option>';
    MONTHS_FULL.forEach((name, i) => {
        monthSelect.add(new Option(name, (i + 1).toString().padStart(2, '0')));
    });

    // Repeat period: every 1–11 months. Labels are short ("месяц", "2 месяца")
    // because the wheel header already says "Период (раз в)".
    periodSelect.innerHTML = '<option value="">Период</option>';
    for (let i = 1; i <= 11; i++) {
        const text = i === 1 ? 'месяц' : `${i} ${plural(i, 'месяц', 'месяца', 'месяцев')}`;
        periodSelect.add(new Option(text, i.toString()));
    }

    function validateDayMonth() {
        const d = parseInt(daySelect.value);
        const m = parseInt(monthSelect.value);
        if (!m || !d) return;

        // Use a leap year so Feb 29 stays selectable for recurring events
        const daysInMonth = getDaysInMonth(2024, m);

        if (d > daysInMonth) {
            daySelect.value = '';
            daySelect.style.borderColor = '#ff3b30';
            alert(`В ${MONTHS_FULL[m - 1]} только ${daysInMonth} дней! День сброшен.`);
        } else {
            daySelect.style.borderColor = '';
        }
    }

    monthSelect.addEventListener('change', validateDayMonth);
    daySelect.addEventListener('change', validateDayMonth);
}


/* ============================================================
   13. DATE PICKER — "YEARLY" MODE
   ============================================================
   Recurring event: full day + month + year (year acts as a
   reference / start year, defaulting to 2000).
   ============================================================ */
function initYearlyMode() {
    document.getElementById('date-picker-label').innerText = 'Укажите дату события (год — по желанию):';

    const daySelect = document.getElementById('day-select');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    if (!daySelect || !monthSelect || !yearSelect) return;

    yearSelect.style.display = 'block';
    [daySelect, monthSelect, yearSelect].forEach(el => el.innerHTML = '');

    // Day
    daySelect.innerHTML = '<option value="">День</option>';
    for (let i = 1; i <= 31; i++) daySelect.add(new Option(i, i.toString().padStart(2, '0')));

    // Month (full names)
    monthSelect.innerHTML = '<option value="">Месяц</option>';
    MONTHS_FULL.forEach((name, i) => {
        monthSelect.add(new Option(name, (i + 1).toString().padStart(2, '0')));
    });

    // Year is OPTIONAL for yearly events — it's only informational (the recurrence
    // ignores it). Default "—". Range: 1920..current year.
    yearSelect.innerHTML = '<option value="">Без года</option>';
    const curY = new Date().getFullYear();
    for (let y = curY; y >= 1930; y--) yearSelect.add(new Option(y, y));
    yearSelect.value = '';

    function validateDayMonth() {
        const d = parseInt(daySelect.value);
        const m = parseInt(monthSelect.value);
        if (!m || !d) return;

        // Use a non-leap year for validation (worst case for Feb)
        const daysInMonth = getDaysInMonth(2024, m);

        if (d > daysInMonth) {
            daySelect.value = '';
            daySelect.style.borderColor = '#ff3b30';
            alert(`В ${MONTHS_FULL[m - 1]} только ${daysInMonth} дней! День сброшен.`);
        } else {
            daySelect.style.borderColor = '';
        }
    }

    monthSelect.addEventListener('change', validateDayMonth);
    daySelect.addEventListener('change', validateDayMonth);
}


/* ============================================================
   14. SAVE EVENT
   ============================================================ */
async function saveEvent() {
    const name = document.getElementById('event-name').value.trim();
    const day = document.getElementById('day-select').value;
    const month = document.getElementById('month-select').value;
    const yearOrPeriod = document.getElementById('year-select').value;
    const time = document.getElementById('real-time').value || '—';
    const notes = document.getElementById('event-notes').value.trim();
    const important = document.getElementById('event-important').checked;

    if (!name) {
        alert('Введите название события!');
        return;
    }

    // Year is optional for 'yearly' (only day+month required); 'monthly' needs a
    // period; 'once' needs the full date.
    const requiresYearOrPeriod = currentAddMode !== 'yearly';
    if (!day || !month || (requiresYearOrPeriod && !yearOrPeriod)) {
        const missingFieldMsg = currentAddMode === 'monthly'
            ? 'Пожалуйста, заполните День, Месяц и Период!'
            : (currentAddMode === 'yearly'
                ? 'Пожалуйста, выберите день и месяц!'
                : 'Пожалуйста, выберите полную дату!');
        alert(missingFieldMsg);
        return;
    }

    // Build the event object using the explicit shape described in EventStore's
    // header comment — year and period are never reused for double duty here.
    const eventData = {
        name,
        type: currentAddMode,
        day,
        month,
        year: currentAddMode === 'monthly' ? null : (yearOrPeriod || null),
        period: currentAddMode === 'monthly' ? yearOrPeriod : null,
        time,
        important,
        notes
    };

    // Editing an existing event: save and go back to the list (no repeated entry here).
    if (editingEventId) {
        try {
            await EventStore.update(editingEventId, eventData);
        } catch (err) {
            console.error(err);
            alert('Не удалось сохранить изменения (бэкенд недоступен).');
            return;
        }
        editingEventId = null;
        showScreen('all');
        return;
    }

    // New event: stay on the add screen so the user can enter several in a row.
    // No alert, no redirect — just a brief "saved" confirmation and a cleared form.
    try {
        await EventStore.add(eventData);
    } catch (err) {
        console.error(err);
        alert('Не удалось сохранить событие (бэкенд недоступен).');
        return;
    }
    showSavedFeedback();
}

// Briefly turns the save button into a disabled "Сохранено ✓" state and clears
// the form, then restores the button after ~1.5s.
function showSavedFeedback() {
    const btn = document.getElementById('save-btn');

    resetAddForm();

    if (!btn) return;
    btn.disabled = true;
    btn.classList.add('saved');
    btn.innerText = '✓ Сохранено';

    setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('saved');
        btn.innerText = 'Сохранить';
    }, 1500);
}


/* ============================================================
   15. DATE HELPERS (shared)
   ============================================================ */
function getDaysInMonth(year, month) {
    const y = year || new Date().getFullYear();
    return new Date(y, month, 0).getDate();
}

function getMonthName(num) {
    return MONTHS_FULL[parseInt(num) - 1] || num;
}


/* ============================================================
   16. FAQ ACCORDION
   ============================================================ */
function renderFaq() {
    const faqList = document.getElementById('faq-list');
    if (!faqList || typeof faqData === 'undefined') return;

    faqList.innerHTML = faqData.map((item, index) => `
        <div class="faq-item">
            <button class="faq-question" onclick="toggleFaq(${index})">${item.question} <span id="icon-${index}" style="font-size: 10px;">▼</span></button>
            <div id="ans-${index}" class="faq-answer">${item.answer}</div>
        </div>
    `).join('');
}

function toggleFaq(index) {
    const answer = document.getElementById(`ans-${index}`);
    const icon = document.getElementById(`icon-${index}`);
    const isVisible = answer.style.display === 'block';
    answer.style.display = isVisible ? 'none' : 'block';
    icon.innerText = isVisible ? '▼' : '▲';

    // On open, bring the question to the top so the answer is in view (no extra scroll)
    if (!isVisible) {
        const item = answer.closest('.faq-item');
        setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
}


/* ============================================================
   16.5 SETTINGS SCREEN
   ============================================================ */
let settingsMode = 'daily';

async function renderSettings() {
    populateMorningHours();

    let s;
    try {
        s = await apiRequest('/settings');
    } catch (err) {
        console.error(err);
        s = { reminder_mode: 'daily', daily_days: 5, checkpoints: [7, 1, 0], morning_hour: 8, detailed: true };
    }

    setReminderMode(s.reminder_mode);
    document.getElementById('daily-days-select').value = String(s.daily_days);

    document.querySelectorAll('.checkpoint-chip').forEach(chip => {
        const off = parseInt(chip.dataset.offset, 10);
        chip.classList.toggle('active', s.checkpoints.includes(off));
    });

    document.getElementById('morning-hour-select').value = String(s.morning_hour);
    document.getElementById('detailed-toggle').checked = !!s.detailed;
}

// Fills the morning-hour <select> with 00:00..23:00 (once)
function populateMorningHours() {
    const sel = document.getElementById('morning-hour-select');
    if (sel.options.length) return;
    for (let h = 0; h <= 23; h++) {
        sel.add(new Option(`${String(h).padStart(2, '0')}:00`, h));
    }
}

// Switches between "daily" and "checkpoints", showing the matching sub-control
function setReminderMode(mode) {
    settingsMode = mode;
    const options = document.querySelectorAll('#settings-screen .type-option');
    options.forEach(o => o.classList.remove('active'));
    const idx = mode === 'checkpoints' ? 1 : 0;
    if (options[idx]) options[idx].classList.add('active');

    document.getElementById('daily-days-row').style.display = mode === 'daily' ? 'flex' : 'none';
    document.getElementById('checkpoints-row').style.display = mode === 'checkpoints' ? 'flex' : 'none';
}

function selectReminderMode(mode) {
    setReminderMode(mode);
}

function toggleChip(el) {
    el.classList.toggle('active');
}

async function saveSettings() {
    const checkpoints = Array.from(document.querySelectorAll('.checkpoint-chip.active'))
        .map(c => parseInt(c.dataset.offset, 10));

    if (settingsMode === 'checkpoints' && checkpoints.length === 0) {
        alert('Выберите хотя бы один момент для напоминаний.');
        return;
    }

    const payload = {
        reminder_mode: settingsMode,
        daily_days: parseInt(document.getElementById('daily-days-select').value, 10),
        checkpoints: checkpoints,
        morning_hour: parseInt(document.getElementById('morning-hour-select').value, 10),
        detailed: document.getElementById('detailed-toggle').checked
    };

    try {
        await apiRequest('/settings', { method: 'PUT', body: JSON.stringify(payload) });
    } catch (err) {
        console.error(err);
        alert('Не удалось сохранить настройки (бэкенд недоступен).');
        return;
    }

    const btn = document.getElementById('settings-save-btn');
    btn.disabled = true;
    btn.classList.add('saved');
    btn.innerText = '✓ Сохранено';
    setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('saved');
        btn.innerText = 'Сохранить';
    }, 1500);
}

async function clearAllEvents() {
    try {
        const r = await apiRequest('/events', { method: 'DELETE' });
        alert(`Удалено событий: ${r.deleted}`);
    } catch (err) {
        console.error(err);
        alert('Не удалось удалить (бэкенд недоступен).');
    }
}

// "Hold for 5 seconds" delete button — a progress bar fills while held, then
// asks for a final confirmation before wiping everything.
function initHoldToDelete() {
    const btn = document.getElementById('delete-all-btn');
    if (!btn) return;
    let timer = null;

    const start = (e) => {
        e.preventDefault();
        btn.classList.add('holding');
        timer = setTimeout(async () => {
            btn.classList.remove('holding');
            timer = null;
            if (confirm('Вы точно хотите удалить ВСЕ события? Это нельзя отменить.')) {
                await clearAllEvents();
            }
        }, 5000);
    };
    const cancel = () => {
        btn.classList.remove('holding');
        if (timer) { clearTimeout(timer); timer = null; }
    };

    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', cancel);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
}


/* ============================================================
   17. MISC UI BEHAVIOR
   ============================================================ */
function initNotesFieldScrolling() {
    const notesField = document.getElementById('event-notes');
    if (!notesField) return;

    notesField.addEventListener('focus', function () {
        setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    });

    notesField.addEventListener('blur', function () {
        setTimeout(() => {
            const s = document.getElementById('add-screen');
            if (s) s.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    });
}

// Onboarding: shown once on first launch (a flag in localStorage remembers it)
function maybeShowOnboarding() {
    if (localStorage.getItem('onboarding_seen')) return;
    const nameEl = document.getElementById('onboarding-name');
    if (nameEl) {
        const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
        nameEl.innerText = (u && u.first_name) ? u.first_name : 'гость';
    }
    document.getElementById('onboarding-overlay').style.display = 'block';
}

function closeOnboarding() {
    localStorage.setItem('onboarding_seen', '1');
    document.getElementById('onboarding-overlay').style.display = 'none';
}


/* ============================================================
   18. APP INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    renderFaq();
    initTimePicker();
    initDatePicker();
    initDpTuner();
    initNotesFieldScrolling();
    initHoldToDelete();
    maybeShowOnboarding();

    updateClock();
    setInterval(updateClock, 1000);

    // Live timers: refresh visible countdowns every 60s so they tick in real time
    setInterval(refreshLiveTimers, 60 * 1000);

    resetAddForm();
});

// Re-renders any visible countdowns (upcoming list cards + open modal) so the
// timers stay current without reloading the screen.
function refreshLiveTimers() {
    const upcomingScreen = document.getElementById('upcoming-screen');
    if (upcomingScreen && upcomingScreen.style.display !== 'none') {
        renderUpcoming();
    }

    const modal = document.getElementById('modal-overlay');
    if (modal && modal.style.display !== 'none' && currentEvent) {
        document.getElementById('modal-countdown').innerText = getCountdownText(currentEvent);
    }
}
