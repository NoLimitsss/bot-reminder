const tg = window.Telegram.WebApp;
tg.ready();

// Подставляем имя
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// Логика переключения экранов
function showScreen(screenName) {
    document.getElementById('main-screen').style.display = (screenName === 'main') ? 'block' : 'none';
    document.getElementById('add-screen').style.display = (screenName === 'add') ? 'flex' : 'none';
}

// Заставка: исчезает через 1 секунду после полной загрузки
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
    }, 2000);
});
// Обработка выбора даты и времени
document.getElementById('real-date').addEventListener('change', function() {
    const btn = document.querySelector('.custom-date-btn[onclick*="real-date"]');
    if (this.value) {
        btn.innerText = '📅 ' + this.value.split('-').reverse().join('.'); // Формат ДД.ММ.ГГГГ
    }
});

document.getElementById('real-time').addEventListener('change', function() {
    const btn = document.querySelector('.custom-date-btn[onclick*="real-time"]');
    if (this.value) {
        btn.innerText = '⏰ ' + this.value;
    }
});




// --- 1. Функция отрисовки списка (добавь в конец файла) ---
function renderEvents(listId, eventArray) {
    const container = document.getElementById(listId);
    if (!container) return;

    container.innerHTML = ''; // Очищаем список перед отрисовкой

    if (eventArray.length === 0) {
        container.innerHTML = '<div class="empty-state">Список событий пуст</div>';
        return;
    }

    eventArray.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div>
                <strong>${event.name}</strong><br>
                <small>📅 ${event.date} | ⏰ ${event.time}</small>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- 2. Генератор тестовых данных ---
const testEvents = [];
for (let i = 1; i <= 20; i++) {
    testEvents.push({
        name: `Событие #${i}`,
        date: `20.06.2026`,
        time: `${i}:00`
    });
}

// --- 3. Обновляем твою функцию showScreen ---
// Замени свою существующую функцию showScreen на эту (она учитывает рендер):
function showScreen(screenName) {
    const screens = ['main', 'add', 'upcoming', 'all'];

    screens.forEach(name => {
        const el = document.getElementById(name + '-screen');
        if (el) {
            if (name === screenName) {
                el.style.display = (screenName === 'add') ? 'flex' : 'block';
                
                // При входе на экраны списка - запускаем рендер
                if (screenName === 'all') renderEvents('all-list', testEvents);
                if (screenName === 'upcoming') renderEvents('upcoming-list', testEvents.slice(0, 3));
                
            } else {
                el.style.display = 'none';
            }
        }
    });
}