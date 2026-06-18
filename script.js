// 4. Рендер событий (с поддержкой CSS-обрезки названия до 2 строк)
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
        // Добавлен класс .event-name для CSS-ограничения
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

// 5. Модальное окно (обновленная логика для чтения)
function openDetails(event) {
    currentEvent = event;
    
    // Заполняем текстовые поля
    document.getElementById('modal-title').innerText = event.name;
    document.getElementById('modal-date').innerText = event.date;
    document.getElementById('modal-time').innerText = event.time || '—';
    
    // Заполняем тип события (предполагаем, что в объекте event есть свойство type)
    // Если свойства type нет, выводим по умолчанию "Одноразовое"
    const typeText = event.type === 'recurring' ? 'Повторяющееся' : 'Одноразовое';
    document.getElementById('modal-type').innerText = typeText;
    
    // Вывод в div (нередактируемый блок с авто-скроллом)
    const notesBox = document.getElementById('modal-notes-display');
    notesBox.innerText = event.notes || 'Нет примечаний';
    
    document.getElementById('modal-overlay').style.display = 'flex';
}

// Дополнительно: обновляем функцию сохранения, чтобы она запоминала тип
function saveEvent() {
    const name = document.getElementById('event-name').value.trim();
    // Находим активный тип
    const activeTypeEl = document.querySelector('.type-option.active');
    const eventType = activeTypeEl ? activeTypeEl.getAttribute('data-type') : 'once';
    
    if (!name) {
        alert('Введите название события!');
        return;
    }
    
    const eventData = {
        name: name,
        type: eventType, // Вот тут сохраняем тип
        notes: document.getElementById('event-notes').value,
        // ... остальные поля
    };
    
    alert(`✅ Событие сохранено!\nТип: ${eventType === 'recurring' ? 'Повторяющееся' : 'Одноразовое'}`);
}