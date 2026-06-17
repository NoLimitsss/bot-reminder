const tg = window.Telegram.WebApp;
tg.ready();

// Имя
if (tg.initDataUnsafe?.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// Экраны
function showScreen(screenName) {
    document.getElementById('main-screen').style.display = (screenName === 'main') ? 'block' : 'none';
    document.getElementById('add-screen').style.display = (screenName === 'add') ? 'flex' : 'none';
}

// Загрузка
window.addEventListener('load', () => {
    // Ждем 2.6 секунды (чуть дольше, чем длится анимация 2.5с)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            // После плавного исчезновения убираем из потока
            setTimeout(() => {
                splash.style.display = 'none';
            }, 800);
        }
    }, 2600); 
});

// Календарь
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