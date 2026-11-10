# Kép-S Fotó Stúdió — новый сайт

Статический адаптивный сайт на замену https://kep-s.com/new/. Только HTML, CSS и немного JS: без CMS, PHP и сборки. Язык сайта — венгерский.

## Структура

```
index.html                  Főoldal (главная)
kapcsolat.html              Kapcsolat (контакты, карта)
szolgaltatasok/             Szolgáltatások: index + tablo, szalagavato, osztalykep, portre,
                            kulonleges, evkonyv, eskuvo, ceges
ugyfeleknek/                Ügyfeleknek: index (по типам клиентов) + potfoto, utanrendeles, letoltesek
galeria/                    Galéria: index + 9 категорий (tablo, portre, szalagavato, kulonleges,
                            csoport, paros, eskuvo, osztalykep, egesz-alakos)
rolunk/                     Rólunk: ценности, команда, технологии
css/style.css               все стили (mobile-first, тёмная тема)
js/main.js                  меню на телефоне, лайтбокс галереи, слайдер «до/после».
                            Сайт работает и без JS
fonts/                      Inter + Cormorant Garamond (woff2, лицензия OFL), без внешних CDN
img/                        фото; галереи в img/galeria/<категория>/, превью в .../kicsi/
letoltes/                   PDF для школ
sitemap.xml, robots.txt     для поисковиков (рассчитаны на адрес https://kep-s.com/)
.htaccess                   301-редиректы со старых адресов /new/*.html, сжатие, кэш
```

Все ссылки относительные, поэтому сайт можно открыть в любой папке. Шрифты из‑за ограничений браузера не грузятся при открытии файла с диска (`file://`); на хостинге всё работает.

## Публикация

1. Загрузить **содержимое** папки `kep-s/` в корень хостинга (туда, где сейчас `index.html` с переадресацией на `new/`). Старый `index.html` в корне заменится новым.
2. Папку `/new/` **не удалять**: в ней работает Ügyfélkapu (`/new/uf.php`). На него ведут все ссылки «Ügyfélkapu» на сайте. Старые страницы `/new/*.html` можно оставить: `.htaccess` перенаправит их на новые адреса.
3. Если сайт размещается не в корне домена, поправить адреса в `sitemap.xml`, `robots.txt`, `<link rel="canonical">` и `og:` в страницах, а также пути в `.htaccess`.

## Как редактировать

- Шапка и подвал повторяются в каждом файле. Чтобы изменить меню, телефон или адрес, используйте поиск и замену по всем `.html` (например, в VS Code: Ctrl+Shift+H).
- Новые фото галереи: положить полноразмерное фото (до ~1600 px) в `img/galeria/<категория>/`, превью (~520 px) в `.../kicsi/` и добавить строку `<li>…</li>` по образцу в нужный `galeria/*.html`.
- Карта на странице контактов встроена с OpenStreetMap (без ключей и cookies).
