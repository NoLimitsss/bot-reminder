const tg = window.Telegram.WebApp;
tg.ready();

// Подставляем имя
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// Логика переключения экранов
function showScreen(screenName) {
    // Список всех экранов, которые у тебя есть в HTML
    const screens = ['main', 'add', 'upcoming', 'all'];

    screens.forEach(name => {
        const el = document.getElementById(name + '-screen');
        if (el) {
            // Если имя совпадает с тем, что мы вызвали — показываем
            if (name === screenName) {
                // 'add' используем flex, остальные block
                el.style.display = (screenName === 'add') ? 'flex' : 'block';
            } else {
                // Все остальные скрываем
                el.style.display = 'none';
            }
        } else {
            console.warn("Экран не найден: " + name + "-screen");
        }
    });
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