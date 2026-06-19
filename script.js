/* ============================================================
   TELEGRAM WEBAPP — EVENT REMINDER APP
   ============================================================
   Sections:
     1. Telegram WebApp setup
     2. Constants & test data
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

// Show the user's first name in the header, if available
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}


/* ============================================================
   2. CONSTANTS & TEST DATA
   ============================================================ */
const MONTHS_FULL = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

// Generates placeholder events for local UI testing
function generateTestEvents() {
    const subjects = ['Встреча', 'Звонок', 'Дедлайн', 'План', 'Покупка', 'Визит', 'Обед', 'Тренировка', 'Презентация', 'Конференция'];

    function generateRandomText(length) {
        let text = '';
        while (text.length < length) {
            text += 'Это описание события, которое занимает много места. ';
        }
        return text.substring(0, length);
    }

    const events = [];
    for (let i = 1; i <= 20; i++) {
        events.push({
            name: `${subjects[i % subjects.length]} №${i}`,
            date: `20.06.2026`,
            time: `${(i % 24).toString().padStart(2, '0')}:00`,
            type: i % 3 === 0 ? 'recurring' : 'once',
            importance: i % 4 === 0 ? 'high' : 'normal',
            notes: generateRandomText(450)
        });
    }
    return events;
}

const testEvents = generateTestEvents();


/* ============================================================
   3. APP STATE
   ============================================================ */
let currentEvent = null;       // event currently shown in the details modal
let currentAddMode = 'once';   // 'once' | 'monthly' | 'yearly' — active mode in the add-event form


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
    if (screenName === 'all') renderEvents('all-list', testEvents);
    if (screenName === 'upcoming') renderEvents('upcoming-list', testEvents.slice(0, 3));
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
}


/* ============================================================
   7. EVENT LIST RENDERING
   ============================================================ */
function renderEvents(listId, eventArray) {
    const container = document.getElementById(listId);
    if (!container) return;

    container.innerHTML = '';

    if (eventArray.length === 0) {
        container.innerHTML = '<div class="empty-state">Список событий пуст</div>';
        return;
    }

    eventArray.forEach((event, index) => {
        container.appendChild(buildEventCard(event, index));
    });
}

function buildEventCard(event, index) {
    const timeLeft = getTimeRemaining(event.date, event.time);

    const typeIcon = event.type === 'recurring'
        ? '<span style="color: #4cc9f0; font-size: 18px; line-height: 1; vertical-align: middle;">↻</span>'
        : '<span style="color: var(--tg-theme-hint-color); font-size: 18px; line-height: 1; vertical-align: middle;">•</span>';

    const importanceIcon = event.importance === 'high'
        ? '<span style="color: #ff9500; font-size: 16px; margin-right: 8px;">⚠️</span>'
        : '';

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
        <div style="display: flex; width: 100%; gap: 10px;">
            <div style="color: var(--tg-theme-hint-color); font-weight: 600; min-width: 22px; flex-shrink: 0; padding-top: 2px;">#${index + 1}</div>
            <div style="flex-grow: 1; min-width: 0;">
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    ${typeIcon}
                    <div class="event-name" style="margin-left: 4px;">${event.name}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; color: var(--tg-theme-hint-color); font-size: 14px;">
                    <small style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📅 ${event.date} | ⏰ ${event.time || '—'}</small>
                    <div style="display: flex; align-items: center; flex-shrink: 0;">
                        ${importanceIcon}
                        <div class="event-timer">${timeLeft}</div>
                    </div>
                </div>
            </div>
        </div>`;
    card.onclick = () => openDetails(event);
    return card;
}

function getTimeRemaining(eventDate, eventTime) {
    const now = new Date();
    const [d, m, y] = eventDate.split('.');
    const target = new Date(`${y}-${m}-${d}T${eventTime || '00:00'}:00`);

    const diff = target - now;
    if (diff <= 0) return 'Уже наступило';

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return `${days > 0 ? days + ' дн. ' : ''}${hours} ч.`;
}


/* ============================================================
   8. EVENT DETAILS MODAL (view / edit / delete)
   ============================================================ */
function openDetails(event) {
    currentEvent = event;
    document.getElementById('modal-title').innerText = event.name;
    document.getElementById('modal-date').innerText = event.date;
    document.getElementById('modal-time').innerText = event.time || '—';
    document.getElementById('modal-notes-display').innerText = event.notes || 'Без примечаний';
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

function editEvent() {
    if (!currentEvent) return;

    closeModal();
    showScreen('add');

    document.getElementById('event-name').value = currentEvent.name;
    document.getElementById('event-notes').value = currentEvent.notes || '';

    const [d, m, y] = currentEvent.date.split('.');
    document.getElementById('day-select').value = d;
    document.getElementById('month-select').value = m;
    document.getElementById('year-select').value = y;

    document.getElementById('real-time').value = currentEvent.time || '';
}

function deleteEvent() {
    if (!confirm('Удалить событие?')) return;
    alert('Событие удалено');
    closeModal();
    showScreen('all');
}


/* ============================================================
   9. TIME PICKER
   ============================================================ */
function pickTime() {
    const input = document.getElementById('real-time');
    input.focus();
    if (input.showPicker) input.showPicker();
    else input.click();
}

function initTimePicker() {
    const input = document.getElementById('real-time');
    if (!input) return;
    input.addEventListener('change', function () {
        if (this.value) {
            document.getElementById('time-btn').innerText = `⏰ ${this.value}`;
        }
    });
}


/* ============================================================
   10. DATE PICKER — MODE SWITCH (once / monthly / yearly)
   ============================================================ */
function selectType(el, type) {
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    updatePickerMode(type);
}

function updatePickerMode(mode) {
    currentAddMode = mode;

    if (mode === 'once') initOnceMode();
    else if (mode === 'monthly') initMonthlyMode();
    else if (mode === 'yearly') initYearlyMode();
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

    document.getElementById('date-picker-label').innerText = 'Разовое событие. Укажите дату события:';
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
            monthSelect.add(new Option(MONTHS_SHORT[i - 1], i.toString().padStart(2, '0')));
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
    document.getElementById('date-picker-label').innerText = 'Циклическое событие. Укажите дату и период:';

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

    // Repeat period: every 1–11 months
    periodSelect.innerHTML = '<option value="">Период</option>';
    for (let i = 1; i <= 11; i++) {
        const text = i === 1 ? 'Раз в 1 месяц' : `Раз в ${i} месяцев`;
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
    document.getElementById('date-picker-label').innerText = 'Ежегодное событие. Укажите дату события:';

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

    // Year: 1900–2100, defaulting to 2000
    yearSelect.innerHTML = '<option value="">Год</option>';
    for (let y = 1900; y <= 2100; y++) yearSelect.add(new Option(y, y));
    yearSelect.value = '2000';

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
function saveEvent() {
    const name = document.getElementById('event-name').value.trim();
    const day = document.getElementById('day-select').value;
    const month = document.getElementById('month-select').value;
    const yearOrPeriod = document.getElementById('year-select').value;
    const time = document.getElementById('real-time').value || '—';

    if (!name) {
        alert('Введите название события!');
        return;
    }

    if (!day || !month || !yearOrPeriod) {
        const missingFieldMsg = currentAddMode === 'monthly'
            ? 'Пожалуйста, заполните День, Месяц и Период!'
            : 'Пожалуйста, выберите полную дату!';
        alert(missingFieldMsg);
        return;
    }

    if (currentAddMode === 'once') {
        alert(`✅ Разовое событие сохранено!\n\nНазвание: ${name}\nДата: ${day}.${month}.${yearOrPeriod}\nВремя: ${time}`);
    } else if (currentAddMode === 'monthly') {
        alert(`✅ Циклическое событие сохранено!\n\nНазвание: ${name}\nДень: ${day}\nМесяц: ${month}\nПериод: раз в ${yearOrPeriod} месяц(а)\nВремя: ${time}`);
    } else if (currentAddMode === 'yearly') {
        alert(`✅ Ежегодное событие сохранено!\n\nНазвание: ${name}\nДата: ${day}.${month}.${yearOrPeriod}\nВремя: ${time}`);
    }
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


/* ============================================================
   18. APP INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    renderFaq();
    initTimePicker();
    initNotesFieldScrolling();

    updateClock();
    setInterval(updateClock, 1000);

    const firstOption = document.querySelector('.type-option');
    if (firstOption) {
        firstOption.classList.add('active');
        updatePickerMode('once');
    }
});
