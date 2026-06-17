const tg = window.Telegram.WebApp;
tg.ready();

// Глобальная переменная для текущего редактируемого события
let currentEvent = null;

// 1. Подставляем имя пользователя
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

// Функция перехода в режим редактирования
function editEvent() {
    if (!currentEvent) return;
    closeModal();
    showScreen('add');
    
    document.getElementById('event-name').value = currentEvent.name;
    document.getElementById('event-notes').value = currentEvent.notes || '';
    
    // Преобразование даты
    const [d, m, y] = currentEvent.date.split('.');
    document.getElementById('real-date').value = `${y}-${m}-${d}`;
    document.getElementById('real-time').value = currentEvent.time;
    
    // Обновляем текст кнопок через ID
    document.getElementById('date-btn').innerText = '📅 ' + currentEvent.date;
    document.getElementById('time-btn').innerText = '⏰ ' + currentEvent.time;
}

function deleteEvent() {
    if (confirm('Удалить событие?')) {
        alert('Удалено');
        closeModal();
        showScreen('all');
    }
}

// 6. Нативный выбор даты (Telegram DatePicker)
// Нативный выбор даты (самое надёжное решение)
function pickDate() {
    const dateInput = document.getElementById('real-date');
    
    // Открываем нативный picker
    dateInput.showPicker ? dateInput.showPicker() : dateInput.focus();
    
    // Обработчик изменения (на случай, если showPicker не сработает)
    const handler = function() {
        if (this.value) {
            const [y, m, d] = this.value.split('-');
            const formattedDate = `${d}.${m}.${y}`;
            
            document.getElementById('date-btn').innerText = '📅 ' + formattedDate;
            // убираем обработчик после первого срабатывания
            this.removeEventListener('change', handler);
        }
    };
    
    dateInput.addEventListener('change', handler, { once: true });
}

// Обработка выбора времени
document.getElementById('real-time').addEventListener('change', function() {
    if (this.value) {
        // Четкое обращение по ID
        document.getElementById('time-btn').innerText = '⏰ ' + this.value;
    }
});

// 7. Обработка времени
document.getElementById('real-time').addEventListener('change', function() {
    if (this.value) {
        document.getElementById('time-btn').innerText = '⏰ ' + this.value;
    }
});

// Заглушка для сохранения
function saveEvent() {
    alert('Событие сохранено!');
}

// 8. Тестовые данные
const testEvents = [];
for (let i = 1; i <= 20; i++) {
    testEvents.push({
        name: `Событие #${i}`,
        date: `20.06.2026`,
        time: `${i}:00`,
        notes: `Детали события ${i}`
    });
}