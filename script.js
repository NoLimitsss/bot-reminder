const tg = window.Telegram.WebApp;
tg.ready();

// Глобальная переменная для текущего редактируемого события
let currentEvent = null;

// 1. Подставляем имя
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// 2. Логика переключения экранов
function showScreen(screenName) {
    const screens = ['main', 'add', 'upcoming', 'all'];
    screens.forEach(name => {
        const el = document.getElementById(name + '-screen');
        if (el) {
            el.style.display = (name === screenName) ? (screenName === 'add' ? 'flex' : 'block') : 'none';
            // Рендер списков при переходе
            if (screenName === 'all') renderEvents('all-list', testEvents);
            if (screenName === 'upcoming') renderEvents('upcoming-list', testEvents.slice(0, 3));
        }
    });
}

// 3. Заставка
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
    }, 2000);
});

// 4. Логика списка
function renderEvents(listId, eventArray) {
    const container = document.getElementById(listId);
    if (!container) return;
    container.innerHTML = '';

    if (eventArray.length === 0) {
        container.innerHTML = '<div class="empty-state">Список событий пуст</div>';
        return;
    }

    eventArray.forEach((event, index) => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div style="margin-right: 15px; color: var(--tg-theme-hint-color);">#${index + 1}</div>
            <div style="flex-grow: 1;">
                <strong>${event.name}</strong><br>
                <small>📅 ${event.date} | ⏰ ${event.time}</small>
            </div>
        `;
        card.onclick = () => openDetails(event);
        container.appendChild(card);
    });
}

// 5. Модальное окно и действия
function openDetails(event) {
    currentEvent = event;
    document.getElementById('modal-title').innerText = event.name;
    document.getElementById('modal-date').innerText = event.date;
    document.getElementById('modal-time').innerText = event.time || '—';
    document.getElementById('modal-notes').innerText = event.notes || 'Без примечаний';
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
    console.log("Редактирование:", currentEvent.name);
}

function deleteEvent() {
    if (confirm('Удалить событие?')) {
        alert('Удалено');
        closeModal();
        showScreen('all');
    }
}

// 6. Тестовые данные
const testEvents = [];
for (let i = 1; i <= 20; i++) {
    testEvents.push({
        name: `Событие #${i}`,
        date: `20.06.2026`,
        time: `${i}:00`,
        notes: `Детали события ${i}`
    });
}

// 7. Обработка даты/времени
document.getElementById('real-date').addEventListener('change', function() {
    const btn = document.querySelector('.custom-date-btn[onclick*="real-date"]');
    if (this.value) btn.innerText = '📅 ' + this.value.split('-').reverse().join('.');
});

document.getElementById('real-time').addEventListener('change', function() {
    const btn = document.querySelector('.custom-date-btn[onclick*="real-time"]');
    if (this.value) btn.innerText = '⏰ ' + this.value;
});