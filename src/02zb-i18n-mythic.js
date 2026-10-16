/* ============================================================
   v69 MYTHIC SKINS: the name and the story of «Untouchable» (Ninja) and the texts of the numbered copies (ru, uk, en, pl, hy).
   The catalog is in src/12-skins.js, the living card — src/17-mythic.js, the price — src/15-emeralds.js.
   ============================================================ */
(function () {
  const T = {
    untouchable: {
      ru: ['Неуловимая', 'Четыре клинка из четырёх углов — и ни один не нашёл цель. В Кастельмаре говорят: если ты её видишь, значит, она это позволила.'],
      uk: ['Невловима', 'Чотири клинки з чотирьох кутів — і жоден не знайшов цілі. У Кастельмарі кажуть: якщо ти її бачиш, значить, вона це дозволила.'],
      en: ['Untouchable', 'Four blades from four corners — and not one found its mark. In Castelmar they say: if you can see her, she let you.'],
      pl: ['Nieuchwytna', 'Cztery ostrza z czterech rogów — i żadne nie trafiło. W Castelmarze mówią: jeśli ją widzisz, to znaczy, że ci pozwoliła.'],
      hy: ['Անհասանելին', 'Չորս շեղբ՝ չորս անկյունից, և ոչ մեկը չգտավ թիրախը։ Կաստելմարում ասում են՝ եթե տեսնում ես նրան, ուրեմն նա է թույլ տվել։']
    }
  };
  const UI = {
    ru: { skMythTitle: 'Мифические · каждая копия с номером', myHow: 'Мифический скин: {n} 💎 в магазине. Карта живая — нажми ▶ на карте.', myCopyNext: 'Каждая копия с номером: твоя будет № {n} (уже куплено: {sold}).', myCopyMine: 'Твоя копия — № {n}. Всего куплено: {sold}.', myBought: '«{name}» твоя — копия № {n}', myPlay: 'Показать', myBuyBtn: 'Купить · {n} 💎', myMore: 'Подробнее' },
    uk: { skMythTitle: 'Міфічні · кожна копія з номером', myHow: 'Міфічний скін: {n} 💎 у магазині. Карта жива — натисни ▶ на карті.', myCopyNext: 'Кожна копія з номером: твоя буде № {n} (уже куплено: {sold}).', myCopyMine: 'Твоя копія — № {n}. Усього куплено: {sold}.', myBought: '«{name}» твоя — копія № {n}', myPlay: 'Показати', myBuyBtn: 'Купити · {n} 💎', myMore: 'Докладніше' },
    en: { skMythTitle: 'Mythical · every copy numbered', myHow: 'Mythical skin: {n} 💎 in the shop. The card is alive — tap ▶ on it.', myCopyNext: 'Every copy is numbered: yours will be № {n} ({sold} bought so far).', myCopyMine: 'Your copy is № {n}. Bought in total: {sold}.', myBought: '“{name}” is yours — copy № {n}', myPlay: 'Play', myBuyBtn: 'Buy · {n} 💎', myMore: 'More' },
    pl: { skMythTitle: 'Mityczne · każdy egzemplarz z numerem', myHow: 'Skórka mityczna: {n} 💎 w sklepie. Karta żyje — dotknij ▶ na karcie.', myCopyNext: 'Każdy egzemplarz ma numer: twój będzie № {n} (kupiono już: {sold}).', myCopyMine: 'Twój egzemplarz to № {n}. Kupiono łącznie: {sold}.', myBought: '„{name}” jest twoja — egzemplarz № {n}', myPlay: 'Pokaż', myBuyBtn: 'Kup · {n} 💎', myMore: 'Więcej' },
    hy: { skMythTitle: 'Առասպելական · յուրաքանչյուր օրինակ՝ համարով', myHow: 'Առասպելական սքին․ {n} 💎 խանութում։ Քարտը կենդանի է՝ սեղմիր ▶ քարտի վրա։', myCopyNext: 'Յուրաքանչյուր օրինակ ունի համար․ քոնը կլինի № {n} (արդեն գնված՝ {sold})։', myCopyMine: 'Քո օրինակը № {n} է։ Ընդհանուր գնված՝ {sold}։', myBought: '«{name}»-ը քոնն է՝ օրինակ № {n}', myPlay: 'Ցույց տալ', myBuyBtn: 'Գնել · {n} 💎', myMore: 'Ավելին' }
  };
  ['ru', 'uk', 'en', 'pl', 'hy'].forEach(code => {
    const p = I18N[code]; if (!p) return; p.skins = p.skins || {}; Object.assign(p.ui, UI[code]);
    Object.keys(T).forEach(id => { const row = T[id][code] || T[id].en; p.skins[id] = { name: row[0], lore: row[1] }; });
  });
})();
