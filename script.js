const tg = window.Telegram.WebApp;
tg.ready();

// 1. Инициализация имени
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// 2. Переключение экранов
function showScreen(screenName) {
    document.getElementById('main-screen').style.display = (screenName === 'main') ? 'block' : 'none';
    document.getElementById('add-screen').style.display = (screenName === 'add') ? 'flex' : 'none';
}

// 3. Заставка
window.addEventListener('load', () => {
    // Ждем 2 секунды, чтобы анимация появления успела проиграться
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        
        // Добавляем класс для красивого исчезновения (можно просто менять opacity)
        splash.style.opacity = '0';
        
        // Убираем из DOM после завершения анимации
        setTimeout(() => { 
            splash.style.display = 'none'; 
        }, 800); 
    }, 2000); 
});

// 4. Инициализация календаря
document.addEventListener('DOMContentLoaded', () => {
    flatpickr("#date-input", {
        dateFormat: "d.m.Y",
        static: true, 
        locale: {
            firstDayOfWeek: 1,
            weekdays: { shorthand: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] },
            months: { shorthand: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'] }
        }
    });
});