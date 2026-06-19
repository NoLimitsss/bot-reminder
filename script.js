const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let currentEvent = null;

// 1. Подставляем имя пользователя
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// 2. Переключение экранов
function showScreen(screenName) {
    document.querySelectorAll('.screen, #main-screen').forEach(el => {
        el.style.display = 'none';
    });

    if (screenName === 'main') {
        const main = document.getElementById('main-screen');
        main.style.display = 'flex';
        main.offsetHeight;
        return;
    }

    const target = document.getElementById(screenName + '-screen');
    if (target) {
        target.style.display = 'flex';
        if (screenName === 'all') renderEvents('all-list', testEvents);
        if (screenName === 'upcoming') renderEvents('upcoming-list', testEvents.slice(0, 3));
    }
}

// 3. Заставка
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.style.visibility = 'hidden', 500);
    }, 2000);
});

// 4. Рендер событий
function renderEvents(listId, eventArray) {
    const container = document.getElementById(listId);
    if (!container) return;
    container.innerHTML = '';

    if (eventArray.length === 0) {
        container.innerHTML = '<div class="empty-state">Список событий пуст</div>';
        return;
    }

    eventArray.forEach((event, index) => {
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
        container.appendChild(card);
    });
}

// 5. Модальное окно
function openDetails(event) {
    currentEvent = event;
    document.getElementById('modal-title').innerText = event.name;
    document.getElementById('modal-date').innerText = event.date;
    document.getElementById('modal-time').innerText = event.time || '—';
    const notesBox = document.getElementById('modal-notes-display');
    notesBox.innerText = event.notes || 'Без примечаний';
    document.getElementById('modal-overlay').style.display = 'flex';
}
function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// Редактирование события
function editEvent() {
    if (!currentEvent) return;
    closeModal();
    showScreen('add');
    
    document.getElementById('event-name').value = currentEvent.name;
    document.getElementById('event-notes').value = currentEvent.notes || '';
    
    // Работаем с новыми селекторами
    const [d, m, y] = currentEvent.date.split('.');
    document.getElementById('day-select').value = d;
    document.getElementById('month-select').value = m;
    document.getElementById('year-select').value = y;
    
    document.getElementById('real-time').value = currentEvent.time || '';
    document.getElementById('time-btn').innerText = '⏰ ' + (currentEvent.time || 'Выбрать время');
}

// Удаление
function deleteEvent() {
    if (confirm('Удалить событие?')) {
        alert('Событие удалено');
        closeModal();
        showScreen('all');
    }
}

// ВЫБОР ВРЕМЕНИ
function pickTime() {
    const input = document.getElementById('real-time');
    input.focus();
    if (input.showPicker) {
        input.showPicker();
    } else {
        input.click();
    }
}

document.getElementById('real-time').addEventListener('change', function() {
    if (this.value) {
        document.getElementById('time-btn').innerText = `⏰ ${this.value}`;
    }
});

// Сохранение события
function saveEvent() {
    const name = document.getElementById('event-name').value.trim();
    const d = document.getElementById('day-select').value;
    const m = document.getElementById('month-select').value;
    const y = document.getElementById('year-select').value;
    const time = document.getElementById('real-time').value || '—';
    
    if (!name) {
        alert('Введите название события!');
        return;
    }
    
    // Проверка, что выбрано ВСЁ
    if (!d || !m || !y) {
        alert('Пожалуйста, выберите полную дату!');
        return;
    }
    
    alert(`✅ Событие сохранено!\n\nНазвание: ${name}\nДата: ${d}.${m}.${y}\nВремя: ${time}`);
}

// ГЕНЕРАТОР ТЕСТОВЫХ ДАННЫХ
const testEvents = [];
const subjects = ["Встреча", "Звонок", "Дедлайн", "План", "Покупка", "Визит", "Обед", "Тренировка", "Презентация", "Конференция"];

function generateRandomText(length) {
    let text = "";
    while (text.length < length) text += "Это описание события, которое занимает много места. ";
    return text.substring(0, length);
}

for (let i = 1; i <= 20; i++) {
    testEvents.push({
        name: `${subjects[i % subjects.length]} №${i}`,
        date: `20.06.2026`,
        time: `${(i % 24).toString().padStart(2, '0')}:00`,
        type: i % 3 === 0 ? 'recurring' : 'once',
        importance: i % 4 === 0 ? 'high' : 'normal',
        notes: generateRandomText(450)
    });
}

// ЧАСЫ
function updateClock() {
    const now = new Date();
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    document.getElementById('current-day').innerText = `Сегодня: ${days[now.getDay()]}`;
    document.getElementById('current-time').innerText = now.toLocaleTimeString('ru-RU');
}
setInterval(updateClock, 1000);
updateClock();

// FAQ
function renderFaq() {
    const faqList = document.getElementById('faq-list');
    if (!faqList) return;
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
document.addEventListener('DOMContentLoaded', renderFaq);

function selectType(el, type) {
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
}

const notesField = document.getElementById('event-notes');
if (notesField) {
    notesField.addEventListener('focus', function() {
        setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    });
    notesField.addEventListener('blur', function() {
        setTimeout(() => { const s = document.getElementById('add-screen'); if(s) s.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
    });
}

function getTimeRemaining(eventDate, eventTime) {
    const now = new Date();
    const [d, m, y] = eventDate.split('.');
    const target = new Date(`${y}-${m}-${d}T${eventTime || '00:00'}:00`);
    let diff = target - now;
    if (diff <= 0) return "Уже наступило";
    const msInMinute = 60 * 1000;
    const msInHour = 60 * msInMinute;
    const msInDay = 24 * msInHour;
    const days = Math.floor(diff / msInDay);
    diff %= msInDay;
    const hours = Math.floor(diff / msInHour);
    return `${days > 0 ? days + ' дн. ' : ''}${hours} ч.`;
}


// Полностью замени твою текущую initDatePickers на эту:
// 1. Пульт управления (Диспетчер)
function updatePickerMode(mode) {
    currentAddMode = mode;
    
    // Очищаем селекторы перед каждым переключением
    const daySelect = document.getElementById('day-select');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    
    daySelect.innerHTML = '<option value="">День</option>';
    monthSelect.innerHTML = '<option value="">Мес.</option>';
    yearSelect.innerHTML = '<option value="">Год</option>';

    // Переключаем "моторчики"
    if (mode === 'once')    initOnceMode();
    if (mode === 'monthly') initMonthlyMode();
    if (mode === 'yearly')  initYearlyMode();
}

// 2. Моторчик для "Разового" (Весь код ОДНОГО режима)
function initOnceMode() {
  const daySelect = document.getElementById('day-select');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const label = document.getElementById('date-picker-label');

    label.innerText = 'Выберите дату:';

    // 1. Заполнение селекторов
    for (let i = 1; i <= 31; i++) daySelect.add(new Option(i, i.toString().padStart(2, '0')));
    
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    months.forEach((m, idx) => monthSelect.add(new Option(m, (idx + 1).toString().padStart(2, '0'))));
    
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i <= 2100; i++) yearSelect.add(new Option(i, i));

    // 2. Логика проверки (валидатор)
    const validate = () => {
        let y = parseInt(yearSelect.value);
        let m = parseInt(monthSelect.value);
        let d = parseInt(daySelect.value);
        if (!y || !m || !d) return;

        // А) Коррекция дней (защита от 31-го числа в коротких месяцах)
        const daysInMonth = new Date(y, m, 0).getDate();
        if (d > daysInMonth) {
            d = daysInMonth;
            daySelect.value = d.toString().padStart(2, '0');
        }

        // Б) Валидация прошлого
        const now = new Date();
        const yNow = now.getFullYear();
        const mNow = now.getMonth() + 1;
        const dNow = now.getDate();

        if (y < yNow || (y === yNow && m < mNow) || (y === yNow && m === mNow && d < dNow)) {
            alert("Дата уже прошла! Выберите будущую дату.");
            yearSelect.value = ""; // Сбрасываем год, чтобы вынудить перевыбор
        }
    };

    // 3. Подключение событий
    [daySelect, monthSelect, yearSelect].forEach(el => el.addEventListener('change', validate));
}

// 3. Моторчик для "Месячного"
function initMonthlyMode() {
    // Тут только логика для МЕСЯЧНОГО:
    // - Заполнение "Пер." вместо года
    // - Своя логика
}

// 4. Моторчик для "Ежегодного"
function initYearlyMode() {
    // Тут только логика для ЕЖЕГОДНОГО:
    // - Заполнение годов с 2000
    // - Валидация дней
}

// Привязываем к кнопкам переключения
function selectType(el, type) {
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    updatePickerMode(type);
}

// Инициализация при старте
document.addEventListener('DOMContentLoaded', () => {
    updatePickerMode('once');
    // Установим класс active для первой кнопки вручную (если нужно)
    const firstBtn = document.querySelector('.type-option');
    if (firstBtn) firstBtn.classList.add('active');
});