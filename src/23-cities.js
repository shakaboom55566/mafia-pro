/* ============================================================
   v85 CITIES — one key per city however players write it, so the «City» rating counts Київ, Киев, Kyiv and Kijów as one city
   and shows it in the app's language. The same block is on the server (backend/src/cities.js); backend/test/run.js compares them.
   ============================================================ */
/* cities:begin — the same text in src/23-cities.js and backend/src/cities.js (backend/test/run.js compares them).
   [key, country, en, uk, ru, pl, hy ('' — the English name), other spellings separated by «|»] */
const CITY_ROWS = [
  ['kyiv', 'UA', 'Kyiv', 'Київ', 'Киев', 'Kijów', 'Կիև', 'kiev|kijow|kyjiw|kiew'],
  ['kharkiv', 'UA', 'Kharkiv', 'Харків', 'Харьков', 'Charków', 'Խարկով', 'kharkov|charkow'],
  ['odesa', 'UA', 'Odesa', 'Одеса', 'Одесса', 'Odessa', 'Օդեսա', 'odessa'],
  ['dnipro', 'UA', 'Dnipro', 'Дніпро', 'Днепр', 'Dniepr', 'Դնեպր', 'dnepr|днепропетровск|дніпропетровськ|dnipropetrovsk|dnepropetrovsk|днипро'],
  ['lviv', 'UA', 'Lviv', 'Львів', 'Львов', 'Lwów', 'Լվով', 'lvov|lwow|lemberg|львiв'],
  ['zaporizhzhia', 'UA', 'Zaporizhzhia', 'Запоріжжя', 'Запорожье', 'Zaporoże', 'Զապորոժյե', 'zaporozhye|zaporizhia|zaporizhzhya|zaporozhe|zaporozhie|запорiжжя'],
  ['kryvyi_rih', 'UA', 'Kryvyi Rih', 'Кривий Ріг', 'Кривой Рог', 'Krzywy Róg', '', 'krivoy rog|kryvyy rih|krivoi rog|кривий рiг'],
  ['mykolaiv', 'UA', 'Mykolaiv', 'Миколаїв', 'Николаев', 'Mikołajów', '', 'nikolaev|nikolayev|mykolayiv|миколаiв'],
  ['vinnytsia', 'UA', 'Vinnytsia', 'Вінниця', 'Винница', 'Winnica', '', 'vinnitsa|vinnytsya|вiнниця'],
  ['poltava', 'UA', 'Poltava', 'Полтава', 'Полтава', 'Połtawa', '', ''],
  ['chernihiv', 'UA', 'Chernihiv', 'Чернігів', 'Чернигов', 'Czernihów', '', 'chernigov|чернiгiв'],
  ['cherkasy', 'UA', 'Cherkasy', 'Черкаси', 'Черкассы', 'Czerkasy', '', 'cherkassy'],
  ['khmelnytskyi', 'UA', 'Khmelnytskyi', 'Хмельницький', 'Хмельницкий', 'Chmielnicki', '', 'khmelnitsky|khmelnytskyy|khmelnytsky|khmelnitskiy'],
  ['chernivtsi', 'UA', 'Chernivtsi', 'Чернівці', 'Черновцы', 'Czerniowce', '', 'chernovtsy|чернiвцi'],
  ['zhytomyr', 'UA', 'Zhytomyr', 'Житомир', 'Житомир', 'Żytomierz', '', 'zhitomir'],
  ['sumy', 'UA', 'Sumy', 'Суми', 'Сумы', 'Sumy', '', ''],
  ['rivne', 'UA', 'Rivne', 'Рівне', 'Ровно', 'Równe', '', 'rovno|рiвне'],
  ['ivano_frankivsk', 'UA', 'Ivano-Frankivsk', 'Івано-Франківськ', 'Ивано-Франковск', 'Iwano-Frankiwsk', '', 'ivano frankovsk|frankivsk|франківськ|франик'],
  ['ternopil', 'UA', 'Ternopil', 'Тернопіль', 'Тернополь', 'Tarnopol', '', 'тернопiль'],
  ['lutsk', 'UA', 'Lutsk', 'Луцьк', 'Луцк', 'Łuck', '', ''],
  ['uzhhorod', 'UA', 'Uzhhorod', 'Ужгород', 'Ужгород', 'Użhorod', '', 'uzhgorod'],
  ['kropyvnytskyi', 'UA', 'Kropyvnytskyi', 'Кропивницький', 'Кропивницкий', 'Kropywnycki', '', 'kirovograd|kirovohrad|кировоград|кіровоград|kropyvnytskyy|kropyvnytskyi'],
  ['kremenchuk', 'UA', 'Kremenchuk', 'Кременчук', 'Кременчуг', 'Krzemieńczuk', '', 'kremenchug'],
  ['kamianske', 'UA', 'Kamianske', 'Кам’янське', 'Каменское', 'Kamieńskie', '', 'dniprodzerzhynsk|днепродзержинск|дніпродзержинськ|kamenskoe|kamyanske|камянське'],
  ['bila_tserkva', 'UA', 'Bila Tserkva', 'Біла Церква', 'Белая Церковь', 'Biała Cerkiew', '', 'belaya tserkov|bila tserkva'],
  ['brovary', 'UA', 'Brovary', 'Бровари', 'Бровары', 'Browary', '', ''],
  ['irpin', 'UA', 'Irpin', 'Ірпінь', 'Ирпень', 'Irpień', '', 'irpen'],
  ['bucha', 'UA', 'Bucha', 'Буча', 'Буча', 'Bucza', '', ''],
  ['kherson', 'UA', 'Kherson', 'Херсон', 'Херсон', 'Chersoń', 'Խերսոն', ''],
  ['mukachevo', 'UA', 'Mukachevo', 'Мукачево', 'Мукачево', 'Mukaczewo', '', 'mukachiv|мукачів'],
  ['melitopol', 'UA', 'Melitopol', 'Мелітополь', 'Мелитополь', 'Melitopol', '', ''],
  ['kramatorsk', 'UA', 'Kramatorsk', 'Краматорськ', 'Краматорск', 'Kramatorsk', '', ''],
  ['pavlohrad', 'UA', 'Pavlohrad', 'Павлоград', 'Павлоград', 'Pawłohrad', '', 'pavlograd'],
  ['nikopol', 'UA', 'Nikopol', 'Нікополь', 'Никополь', 'Nikopol', '', ''],
  ['warsaw', 'PL', 'Warsaw', 'Варшава', 'Варшава', 'Warszawa', 'Վարշավա', 'warszawa|warschau'],
  ['krakow', 'PL', 'Kraków', 'Краків', 'Краков', 'Kraków', 'Կրակով', 'krakow|cracow|krakau'],
  ['wroclaw', 'PL', 'Wrocław', 'Вроцлав', 'Вроцлав', 'Wrocław', 'Վրոցլավ', 'wroclaw|breslau'],
  ['gdansk', 'PL', 'Gdańsk', 'Гданськ', 'Гданьск', 'Gdańsk', 'Գդանսկ', 'gdansk|danzig'],
  ['poznan', 'PL', 'Poznań', 'Познань', 'Познань', 'Poznań', '', 'poznan'],
  ['lodz', 'PL', 'Łódź', 'Лодзь', 'Лодзь', 'Łódź', '', 'lodz'],
  ['katowice', 'PL', 'Katowice', 'Катовіце', 'Катовице', 'Katowice', '', ''],
  ['lublin', 'PL', 'Lublin', 'Люблін', 'Люблин', 'Lublin', '', ''],
  ['szczecin', 'PL', 'Szczecin', 'Щецин', 'Щецин', 'Szczecin', '', ''],
  ['bydgoszcz', 'PL', 'Bydgoszcz', 'Бидгощ', 'Быдгощ', 'Bydgoszcz', '', ''],
  ['rzeszow', 'PL', 'Rzeszów', 'Ряшів', 'Жешув', 'Rzeszów', '', 'rzeszow'],
  ['gdynia', 'PL', 'Gdynia', 'Гдиня', 'Гдыня', 'Gdynia', '', ''],
  ['bialystok', 'PL', 'Białystok', 'Білосток', 'Белосток', 'Białystok', '', 'bialystok'],
  ['yerevan', 'AM', 'Yerevan', 'Єреван', 'Ереван', 'Erywań', 'Երևան', 'erevan|yerevan'],
  ['gyumri', 'AM', 'Gyumri', 'Гюмрі', 'Гюмри', 'Giumri', 'Գյումրի', 'gumri|leninakan'],
  ['vanadzor', 'AM', 'Vanadzor', 'Ванадзор', 'Ванадзор', 'Wanadzor', 'Վանաձոր', ''],
  ['tbilisi', 'GE', 'Tbilisi', 'Тбілісі', 'Тбилиси', 'Tbilisi', 'Թբիլիսի', 'tiflis'],
  ['batumi', 'GE', 'Batumi', 'Батумі', 'Батуми', 'Batumi', 'Բաթումի', ''],
  ['chisinau', 'MD', 'Chișinău', 'Кишинів', 'Кишинёв', 'Kiszyniów', 'Քիշնև', 'chisinau|kishinev|kishinau'],
  ['vilnius', 'LT', 'Vilnius', 'Вільнюс', 'Вильнюс', 'Wilno', 'Վիլնյուս', ''],
  ['riga', 'LV', 'Riga', 'Рига', 'Рига', 'Ryga', 'Ռիգա', ''],
  ['tallinn', 'EE', 'Tallinn', 'Таллінн', 'Таллин', 'Tallinn', 'Տալլին', 'tallin'],
  ['berlin', 'DE', 'Berlin', 'Берлін', 'Берлин', 'Berlin', 'Բեռլին', ''],
  ['prague', 'CZ', 'Prague', 'Прага', 'Прага', 'Praga', 'Պրահա', 'praha|prag'],
  ['vienna', 'AT', 'Vienna', 'Відень', 'Вена', 'Wiedeń', 'Վիեննա', 'wien'],
  ['london', 'GB', 'London', 'Лондон', 'Лондон', 'Londyn', 'Լոնդոն', ''],
  ['almaty', 'KZ', 'Almaty', 'Алмати', 'Алматы', 'Ałmaty', 'Ալմաթի', 'alma ata|алма ата'],
  ['astana', 'KZ', 'Astana', 'Астана', 'Астана', 'Astana', 'Աստանա', 'nur sultan|нур султан']
];
/* lower case, no accents, «ё» → «е», no quotes or dots, one space; «г.», «м.», «місто», «miasto» in front are dropped */
const cityNorm = s => String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ё/g, 'е')
  .replace(/[ʼ'’`"«»]/g, '').replace(/[().,]/g, ' ').replace(/[\s\-–—_]+/g, ' ').trim().replace(/^(г|м|с|смт|пгт|місто|город|miasto|city of|city) /, '').trim().slice(0, 48);
const CITY_ALIAS = Object.create(null), CITY_INFO = Object.create(null);
CITY_ROWS.forEach(([key, cc, en, uk, ru, pl, hy, more]) => {
  CITY_INFO[key] = { key, cc, names: { en, uk, ru, pl, hy: hy || en } };
  [en, uk, ru, pl, hy].concat(String(more || '').split('|')).forEach(n => { const k = cityNorm(n); if (k && !CITY_ALIAS[k]) CITY_ALIAS[k] = key; });
});
/* the city's key: a known city → its id («kyiv»); any other → «~» + the normalized spelling; empty → '' */
function cityKey(s) { const n = cityNorm(s); return n ? (CITY_ALIAS[n] || '~' + n) : ''; }
/* the city's name in a language: a known city by the dictionary, another — the spelling given (or the key without «~») */
function cityLabel(key, lang, fallback) { const c = CITY_INFO[key]; return c ? (c.names[lang] || c.names.en) : String(fallback || String(key || '').replace(/^~/, '')); }
/* cities:end */
