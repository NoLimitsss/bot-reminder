const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Разворачивает приложение на всю высоту

let currentEvent = null;

// 1. Подставляем имя пользователя
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// 2. Переключение экранов
function showScreen(screenName) {
    // Скрываем ВСЁ
    document.querySelectorAll('.screen, #main-screen').forEach(el => {
        el.style.display = 'none';
    });

    if (screenName === 'main') {
        const main = document.getElementById('main-screen');
        main.style.display = 'flex';
        // Принудительно триггерим перерасчёт flex
        main.offsetHeight;
        return;
    }

    const target = document.getElementById(screenName + '-screen');
    if (target) {
        target.style.display = 'flex';   // ← было block, теперь flex как у main
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
    },2000);
});

// 4. Рендер событий
// 4. Рендер событий
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
        
        // Значок типа события
        const typeIcon = event.type === 'recurring' 
            ? '<span style="color: #4cc9f0; font-size: 18px; line-height: 1; vertical-align: middle;">↻</span>' 
            : '<span style="color: var(--tg-theme-hint-color); font-size: 18px; line-height: 1; vertical-align: middle;">•</span>';

        // Значок важности
        const importanceIcon = event.importance === 'high' 
            ? '<span style="color: #ff9500; font-size: 16px; margin-right: 8px;">⚠️</span>' 
            : '';

        const card = document.createElement('div');
        card.className = 'event-card';
        
        card.innerHTML = `
            <div style="display: flex; width: 100%; gap: 10px;">
                <!-- Номер события -->
                <div style="color: var(--tg-theme-hint-color); font-weight: 600; min-width: 22px; flex-shrink: 0; padding-top: 2px;">
                    #${index + 1}
                </div>
                
                <!-- Основное содержание -->
                <div style="flex-grow: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 5px;">
                        ${typeIcon}
                        <div class="event-name" style="margin-left: 4px;">${event.name}</div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; color: var(--tg-theme-hint-color); font-size: 14px;">
                        <small style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            📅 ${event.date} | ⏰ ${event.time || '—'}
                        </small>
                        
                        <div style="display: flex; align-items: center; flex-shrink: 0;">
                            ${importanceIcon}
                            <div class="event-timer">${timeLeft}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
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
    
    // Примечания в статичный блок
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
    
    const [d, m, y] = currentEvent.date.split('.');
    document.getElementById('real-date').value = `${y}-${m}-${d}`;
    document.getElementById('real-time').value = currentEvent.time || '';
    
    document.getElementById('date-btn').innerText = '📅 ' + currentEvent.date;
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

// ==================== ВЫБОР ДАТЫ И ВРЕМЕНИ ====================

function pickDate() {
    const input = document.getElementById('real-date');
    input.focus();
    if (input.showPicker) {
        input.showPicker();
    } else {
        input.click();
    }
}

function pickTime() {
    const input = document.getElementById('real-time');
    input.focus();
    if (input.showPicker) {
        input.showPicker();
    } else {
        input.click();
    }
}

// Обновление кнопок после выбора
document.getElementById('real-date').addEventListener('change', function() {
    if (this.value) {
        const [y, m, d] = this.value.split('-');
        document.getElementById('date-btn').innerText = `📅 ${d}.${m}.${y}`;
    }
});

document.getElementById('real-time').addEventListener('change', function() {
    if (this.value) {
        document.getElementById('time-btn').innerText = `⏰ ${this.value}`;
    }
});

// Сохранение события (заглушка)
function saveEvent() {
    const name = document.getElementById('event-name').value.trim();
    const dateBtn = document.getElementById('date-btn').innerText;
    const timeBtn = document.getElementById('time-btn').innerText;
    
    if (!name) {
        alert('Введите название события!');
        return;
    }
    
    alert(`✅ Событие сохранено!\n\nНазвание: ${name}\nДата: ${dateBtn}\nВремя: ${timeBtn}`);
    // Здесь потом будешь отправлять данные в бота
}

// ==================== ГЕНЕРАТОР ТЕСТОВЫХ ДАННЫХ ====================
// ==================== ГЕНЕРАТОР ТЕСТОВЫХ ДАННЫХ ====================
const testEvents = [];

const subjects = ["Встреча", "Звонок", "Дедлайн", "План", "Покупка", "Визит", "Обед", "Тренировка", "Презентация", "Конференция"];

function generateRandomText(length) {
    let text = "";
    while (text.length < length) {
        text += "Это описание события, которое занимает много места для проверки скролла. ";
    }
    return text.substring(0, length);
}

for (let i = 1; i <= 20; i++) {
    let rawTitle = `${subjects[i % subjects.length]} №${i}`;
    
    testEvents.push({
        name: rawTitle.length < 50 ? rawTitle.padEnd(48, '.') : rawTitle.substring(0, 48),
        date: `20.06.2026`,
        time: `${(i % 24).toString().padStart(2, '0')}:00`,
        type: i % 3 === 0 ? 'recurring' : 'once',           // каждый третий — повторяющееся
        importance: i % 4 === 0 ? 'high' : 'normal',       // каждый четвёртый — важный
        notes: generateRandomText(450)
    });
}

// ==================== ЧАСЫ И ДАТА ====================

function updateClock() {
    const now = new Date();
    
    // День недели
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    document.getElementById('current-day').innerText = `Сегодня: ${days[now.getDay()]}`;
    
    // Время
    const timeStr = now.toLocaleTimeString('ru-RU');
    document.getElementById('current-time').innerText = timeStr;
}

// Запускаем обновление при загрузке
setInterval(updateClock, 1000);
updateClock();

// ЛОГИКА FAQ С ВОПРОСАМИ

function renderFaq() {
    const faqList = document.getElementById('faq-list');
    if (!faqList) return;
    
    faqList.innerHTML = faqData.map((item, index) => `
        <div class="faq-item">
            <button class="faq-question" onclick="toggleFaq(${index})">
                ${item.question}
                <span id="icon-${index}" style="font-size: 10px;">▼</span>
            </button>
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

// Запуск при старте
document.addEventListener('DOMContentLoaded', renderFaq);



// Селектор выбора типо события: одноразовое или повторяющееся
function selectType(el, type) {
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    // Здесь можно сохранить тип в переменную, чтобы потом отправлять в бота
    console.log("Выбран тип:", type);
}



// Логика "умного" скролла для примечаний
const notesField = document.getElementById('event-notes');

if (notesField) {
    // При клике (фокусе) — плавно центрируем поле
    notesField.addEventListener('focus', function() {
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Задержка для плавного выезда клавиатуры
    });

    // При потере фокуса — возвращаем экран вверх
    notesField.addEventListener('blur', function() {
        setTimeout(() => {
            const screen = document.getElementById('add-screen');
            if (screen) {
                screen.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    });
}



// таймеры до ближайших событий
function getTimeRemaining(eventDate, eventTime) {
    const now = new Date();
    const [d, m, y] = eventDate.split('.');
    const target = new Date(`${y}-${m}-${d}T${eventTime || '00:00'}:00`);
    
    let diff = target - now;
    if (diff <= 0) return "Уже наступило";

    const msInMinute = 60 * 1000;
    const msInHour = 60 * msInMinute;
    const msInDay = 24 * msInHour;
    const msInMonth = 30 * msInDay;

    const months = Math.floor(diff / msInMonth);
    diff %= msInMonth;
    const days = Math.floor(diff / msInDay);
    diff %= msInDay;
    const hours = Math.floor(diff / msInHour);
    diff %= msInHour;
    const minutes = Math.floor(diff / msInMinute);

    let result = [];
    if (months > 0) result.push(`${months} мес.`);
    if (days > 0) result.push(`${days} дн.`);
    if (hours > 0) result.push(`${hours} ч.`);
    if (minutes > 0) result.push(`${minutes} мин.`);

    return result.length > 0 ? result.join(' ') : "Скоро";
}