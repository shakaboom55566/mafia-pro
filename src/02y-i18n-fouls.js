/* ============================================================
   v62 fouls and last words — texts (logic: 03-engine.js, screens: 14-fouls.js)
   ============================================================ */
(function () {
  const R = {
    ru: {
      e: { logFoulAdd: '{player}: +{k} фол. — всего {n}.', logFoulDown: '{player}: фолов теперь {n}.', logFoulUndo: 'Ведущий отменил изменение фолов: {player} — фолов {n}.', logFoulBack: '{player} возвращается за стол — фол снят.' },
      ui: {
        flStepGone: '{player} удалён со стола (4 фола) — ход пропускается.', flHint: 'Нажмите на игрока, чтобы дать или снять фол', flUndo: 'Отменить последний', flUndone: 'Отменено: №{seat} — фолов {n}', flNothing: 'Нечего отменять',
        flSheet: 'Фолы', flOf: '{n} из 4', flState: ['Без фолов', '1 фол — предупреждение', '2 фола — предупреждение', '3 фола — без речи, голос не учитывается', '4 фола — удалён со стола'],
        flGive: 'Дать фолы', flTo: 'станет {n}', flMinus: 'Снять 1 фол', flClear: 'Снять все', flBackHint: 'Снимите фол — игрок вернётся за стол на своё место.',
        flRules: '3 фола — без речи и голоса · 4 — удаление без последней речи и без способности', flOutToast: '№{seat} удалён со стола: 4 фола', flSetToast: '№{seat}: {state}',
        flMutedSpeech: '3 фола — без речи', flMutedHint: 'Игрок молчит эту речь. Нажмите «{next}».', flNoVote: 'Без голоса (3 фола): {list}', flWin: 'После удаления игра решена: {title}', flOutTag: 'удалён',
        lwTitle: 'Последняя речь', lwOf: '{i} из {n}', lwHint: '30 секунд — игрок прощается со столом', lwNext: 'Следующая последняя речь', lwDone: 'Речь закончена', lwThen: 'После последней речи игра продолжится.',
        tbLastWord: 'Последняя речь · №{seat}', tbFoulsN: 'фолы: {n}', tbMutedMe: 'У вас 3 фола: без речи, голос не учитывается', tbMutedSpk: '№{seat} — 3 фола, без речи', tbLastMe: 'Ваша последняя речь — 30 секунд'
      }
    },
    uk: {
      e: { logFoulAdd: '{player}: +{k} фол. — усього {n}.', logFoulDown: '{player}: фолів тепер {n}.', logFoulUndo: 'Ведучий скасував зміну фолів: {player} — фолів {n}.', logFoulBack: '{player} повертається за стіл — фол знято.' },
      ui: {
        flStepGone: '{player} вилучений зі столу (4 фоли) — хід пропускається.', flHint: 'Натисніть на гравця, щоб дати або зняти фол', flUndo: 'Скасувати останній', flUndone: 'Скасовано: №{seat} — фолів {n}', flNothing: 'Нічого скасовувати',
        flSheet: 'Фоли', flOf: '{n} з 4', flState: ['Без фолів', '1 фол — попередження', '2 фоли — попередження', '3 фоли — без промови, голос не враховується', '4 фоли — вилучений зі столу'],
        flGive: 'Дати фоли', flTo: 'стане {n}', flMinus: 'Зняти 1 фол', flClear: 'Зняти всі', flBackHint: 'Зніміть фол — гравець повернеться за стіл на своє місце.',
        flRules: '3 фоли — без промови й голосу · 4 — вилучення без останньої промови й без здібності', flOutToast: '№{seat} вилучений зі столу: 4 фоли', flSetToast: '№{seat}: {state}',
        flMutedSpeech: '3 фоли — без промови', flMutedHint: 'Гравець мовчить цю промову. Натисніть «{next}».', flNoVote: 'Без голосу (3 фоли): {list}', flWin: 'Після вилучення гру вирішено: {title}', flOutTag: 'вилучений',
        lwTitle: 'Остання промова', lwOf: '{i} з {n}', lwHint: '30 секунд — гравець прощається зі столом', lwNext: 'Наступна остання промова', lwDone: 'Промову завершено', lwThen: 'Після останньої промови гра продовжиться.',
        tbLastWord: 'Остання промова · №{seat}', tbFoulsN: 'фоли: {n}', tbMutedMe: 'У вас 3 фоли: без промови, голос не враховується', tbMutedSpk: '№{seat} — 3 фоли, без промови', tbLastMe: 'Ваша остання промова — 30 секунд'
      }
    },
    en: {
      e: { logFoulAdd: '{player}: +{k} foul(s) — {n} in total.', logFoulDown: '{player}: now {n} foul(s).', logFoulUndo: 'The host cancelled the foul change: {player} — {n} foul(s).', logFoulBack: '{player} returns to the table — the foul is taken back.' },
      ui: {
        flStepGone: '{player} is removed from the table (4 fouls) — the turn is skipped.', flHint: 'Tap a player to give or take back a foul', flUndo: 'Undo the last', flUndone: 'Undone: №{seat} — {n} foul(s)', flNothing: 'Nothing to undo',
        flSheet: 'Fouls', flOf: '{n} of 4', flState: ['No fouls', '1 foul — a warning', '2 fouls — a warning', '3 fouls — no speech, the vote does not count', '4 fouls — removed from the table'],
        flGive: 'Give fouls', flTo: 'becomes {n}', flMinus: 'Take back 1 foul', flClear: 'Take back all', flBackHint: 'Take back a foul and the player returns to his seat.',
        flRules: '3 fouls — no speech and no vote · 4 — removed with no last words and no ability', flOutToast: '№{seat} is removed from the table: 4 fouls', flSetToast: '№{seat}: {state}',
        flMutedSpeech: '3 fouls — no speech', flMutedHint: 'The player stays silent this speech. Tap «{next}».', flNoVote: 'No vote (3 fouls): {list}', flWin: 'After the removal the game is decided: {title}', flOutTag: 'removed',
        lwTitle: 'Last words', lwOf: '{i} of {n}', lwHint: '30 seconds — the player says goodbye to the table', lwNext: 'Next last words', lwDone: 'Done', lwThen: 'The game goes on after the last words.',
        tbLastWord: 'Last words · №{seat}', tbFoulsN: 'fouls: {n}', tbMutedMe: 'You have 3 fouls: no speech, your vote does not count', tbMutedSpk: '№{seat} — 3 fouls, no speech', tbLastMe: 'Your last words — 30 seconds'
      }
    },
    pl: {
      e: { logFoulAdd: '{player}: +{k} faul. — razem {n}.', logFoulDown: '{player}: teraz fauli {n}.', logFoulUndo: 'Prowadzący cofnął zmianę fauli: {player} — fauli {n}.', logFoulBack: '{player} wraca do stołu — faul cofnięty.' },
      ui: {
        flStepGone: '{player} usunięty ze stołu (4 faule) — ruch pominięty.', flHint: 'Dotknij gracza, aby dać lub cofnąć faul', flUndo: 'Cofnij ostatni', flUndone: 'Cofnięto: nr {seat} — fauli {n}', flNothing: 'Nie ma czego cofać',
        flSheet: 'Faule', flOf: '{n} z 4', flState: ['Bez fauli', '1 faul — ostrzeżenie', '2 faule — ostrzeżenie', '3 faule — bez mowy, głos się nie liczy', '4 faule — usunięty ze stołu'],
        flGive: 'Daj faule', flTo: 'będzie {n}', flMinus: 'Cofnij 1 faul', flClear: 'Cofnij wszystkie', flBackHint: 'Cofnij faul — gracz wróci na swoje miejsce.',
        flRules: '3 faule — bez mowy i głosu · 4 — usunięcie bez ostatniej mowy i bez zdolności', flOutToast: 'Nr {seat} usunięty ze stołu: 4 faule', flSetToast: 'Nr {seat}: {state}',
        flMutedSpeech: '3 faule — bez mowy', flMutedHint: 'Gracz milczy tę mowę. Dotknij «{next}».', flNoVote: 'Bez głosu (3 faule): {list}', flWin: 'Po usunięciu gra jest rozstrzygnięta: {title}', flOutTag: 'usunięty',
        lwTitle: 'Ostatnia mowa', lwOf: '{i} z {n}', lwHint: '30 sekund — gracz żegna się ze stołem', lwNext: 'Następna ostatnia mowa', lwDone: 'Mowa skończona', lwThen: 'Po ostatniej mowie gra toczy się dalej.',
        tbLastWord: 'Ostatnia mowa · nr {seat}', tbFoulsN: 'faule: {n}', tbMutedMe: 'Masz 3 faule: bez mowy, Twój głos się nie liczy', tbMutedSpk: 'Nr {seat} — 3 faule, bez mowy', tbLastMe: 'Twoja ostatnia mowa — 30 sekund'
      }
    },
    hy: {
      e: { logFoulAdd: '{player}՝ +{k} ֆոլ, ընդամենը {n}։', logFoulDown: '{player}՝ ֆոլերն այժմ {n} են։', logFoulUndo: 'Վարողը չեղարկեց ֆոլերի փոփոխությունը՝ {player}, ֆոլեր՝ {n}։', logFoulBack: '{player}-ը վերադառնում է սեղանի մոտ՝ ֆոլը հանվեց։' },
      ui: {
        flStepGone: '{player}-ը հեռացված է սեղանից (4 ֆոլ)՝ քայլը բաց է թողնվում։', flHint: 'Սեղմեք խաղացողի վրա՝ ֆոլ տալու կամ հանելու համար', flUndo: 'Չեղարկել վերջինը', flUndone: 'Չեղարկվեց՝ №{seat}, ֆոլեր՝ {n}', flNothing: 'Չեղարկելու բան չկա',
        flSheet: 'Ֆոլեր', flOf: '{n}՝ 4-ից', flState: ['Առանց ֆոլի', '1 ֆոլ՝ նախազգուշացում', '2 ֆոլ՝ նախազգուշացում', '3 ֆոլ՝ առանց խոսքի, ձայնը չի հաշվվում', '4 ֆոլ՝ հեռացված է սեղանից'],
        flGive: 'Տալ ֆոլեր', flTo: 'կդառնա {n}', flMinus: 'Հանել 1 ֆոլ', flClear: 'Հանել բոլորը', flBackHint: 'Հանեք ֆոլը, և խաղացողը կվերադառնա իր տեղը։',
        flRules: '3 ֆոլ՝ առանց խոսքի և ձայնի · 4՝ հեռացում առանց վերջին խոսքի և առանց ունակության', flOutToast: '№{seat}-ը հեռացված է սեղանից՝ 4 ֆոլ', flSetToast: '№{seat}՝ {state}',
        flMutedSpeech: '3 ֆոլ՝ առանց խոսքի', flMutedHint: 'Խաղացողը լռում է այս խոսքի ընթացքում։ Սեղմեք «{next}»։', flNoVote: 'Առանց ձայնի (3 ֆոլ)՝ {list}', flWin: 'Հեռացումից հետո խաղը որոշված է՝ {title}', flOutTag: 'հեռացված',
        lwTitle: 'Վերջին խոսք', lwOf: '{i}՝ {n}-ից', lwHint: '30 վայրկյան՝ խաղացողը հրաժեշտ է տալիս սեղանին', lwNext: 'Հաջորդ վերջին խոսքը', lwDone: 'Խոսքն ավարտված է', lwThen: 'Վերջին խոսքից հետո խաղը կշարունակվի։',
        tbLastWord: 'Վերջին խոսք · №{seat}', tbFoulsN: 'ֆոլեր՝ {n}', tbMutedMe: 'Դուք ունեք 3 ֆոլ՝ առանց խոսքի, ձեր ձայնը չի հաշվվում', tbMutedSpk: '№{seat}՝ 3 ֆոլ, առանց խոսքի', tbLastMe: 'Ձեր վերջին խոսքը՝ 30 վայրկյան'
      }
    }
  };
  Object.keys(R).forEach(code => { const p = I18N[code]; if (!p) return; Object.assign(p.e, R[code].e); Object.assign(p.ui, R[code].ui); });
})();
