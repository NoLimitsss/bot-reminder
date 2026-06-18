const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let currentEvent = null;

// 1. Имя пользователя
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
        const card = document.createElement('div');
        card.className = 'event-card';
        // Добавлен класс .event-name для CSS-обрезки
        card.innerHTML = `
            <div style="margin-right: 15px; color: var(--tg-theme-hint-color);">#${index + 1}</div>
            <div style="flex-grow: 1; overflow: hidden;">
                <div class="event-name">${event.name}</div>
                <small style="color: var(--tg-theme-hint-color);">📅 ${event.date} | ⏰ ${event.time || '—'}</small>
            </div>
            <div class="event-timer">${timeLeft}</div>
        `;
        card.onclick = () => openDetails(event);
        container.appendChild(card);
    });
}

// 5. Модальное окно (обновлено)
function openDetails(event) {
    currentEvent = event;
    document.getElementById('modal-title').innerText = event.name;
    document.getElementById('modal-date').innerText = event.date;
    document.getElementById('modal-time').innerText = event.time || '—';
    
    // Новое поле типа
    document.getElementById('modal-type').innerText = event.type === 'recurring' ? 'Повторяющееся' : 'Одноразовое';
    
    // Вывод в div для чтения
    const notesDisplay = document.getElementById('modal-notes-display');
    notesDisplay.innerText = event.notes || 'Нет примечаний';
    
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// 6. Удаление и Редактирование
function editEvent() {
    if (!currentEvent) return;
    closeModal();
    showScreen('add');
    document.getElementById('event-name').value = currentEvent.name;
    document.getElementById('event-notes').value = currentEvent.notes || '';
}

function deleteEvent() {
    if (confirm('Удалить событие?')) {
        alert('Событие удалено');
        closeModal();
        showScreen('all');
    }
}

// 7. Сохранение события
function saveEvent() {
    const name = document.getElementById('event-name').value.trim();
    const activeType = document.querySelector('.type-option.active');
    const type = activeType ? activeType.innerText : 'Одноразовое';
    
    if (!name) {
        alert('Введите название события!');
        return;
    }
    alert(`✅ Сохранено: ${name} (${type})`);
    showScreen('main');
}

// --- Остальные функции (часы, таймеры, FAQ) ---
function getTimeRemaining(eventDate, eventTime) {
    const now = new Date();
    const [d, m, y] = eventDate.split('.');
    const target = new Date(`${y}-${m}-${d}T${eventTime || '00:00'}:00`);
    let diff = target - now;
    if (diff <= 0) return "Уже наступило";
    
    const minutes = Math.floor(diff / 60000);
    return minutes < 60 ? `${minutes} мин.` : `${Math.floor(minutes/60)} ч.`;
}

function updateClock() {
    const now = new Date();
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    document.getElementById('current-day').innerText = `Сегодня: ${days[now.getDay()]}`;
    document.getElementById('current-time').innerText = now.toLocaleTimeString('ru-RU');
}
setInterval(updateClock, 1000);
updateClock();

// --- Инициализация FAQ ---
document.addEventListener('DOMContentLoaded', () => {
    // Если есть faqData, рендерим
    if (typeof faqData !== 'undefined') renderFaq();
});