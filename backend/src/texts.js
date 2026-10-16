/* Bot messages in the five app languages. Russian is the default; a user's Telegram language picks the rest. */
export const TEXTS = {
  ru: {
    modeClassic: 'Классическая мафия', modeRole: 'Ролевая мафия', modeOpen: 'в открытую', modeClosed: 'в закрытую', modeLine: '🃏 {mode} · {open}',
    clubApplied: '🏛 Заявка на клуб «{name}» отправлена. Подтвердим в течение 1–2 дней.', clubApproved: '🏛 Клуб «{name}» подтверждён и виден в списке клубов. Вы — глава: приглашайте игроков из приложения.', clubRejected: 'Заявка на клуб «{name}» отклонена. Напишите нам, если это ошибка.',
    clubInvite: '🏛 <b>{name}</b> приглашает вас в клуб «{club}»{city}. Игрок может состоять только в одном клубе.', clubJoined: '✅ Вы в клубе «{club}». Чат клуба — в приложении.', clubInviteGone: 'Приглашение уже обработано.', clubInviteDeclined: 'Приглашение отклонено.',
    clubMemberJoined: '👤 <b>{name}</b> вступил(а) в клуб «{club}».', clubApplyNew: '📨 <b>{name}</b> хочет вступить в клуб «{club}». Подтвердите в приложении: Клубы → Заявки.', clubApplyOk: '✅ Вас приняли в клуб «{club}».', clubApplyNo: 'Заявку в клуб «{club}» отклонили.', clubKicked: 'Вы исключены из клуба «{club}».',
    clubLobby: '🎴 <b>{name}</b> зовёт клуб за стол <b>{code}</b>.', adminClubNew: '🏛 Новая заявка на клуб: <b>{name}</b>, {city}\nГлава: {owner}{username}\n{about}\n\nПодтвердить: /club_ok {id}\nОтклонить: /club_no {id}', adminClubOk: 'Клуб подтверждён: {name}.', adminClubNo: 'Заявка отклонена: {name}.', adminClubs: 'Клубы:\n{list}', adminClubsNone: 'Клубов пока нет.', adminHelpClub: '/club_ok <id> — подтвердить клуб, /club_no <id> — отклонить, /clubs — список', adminHelpGrowth: '/players [дней] — новые игроки и таблица .xlsx, /players all — все игроки, /players live on|off — уведомления о каждом новом (сводка — каждый день в 21:00)',
    fwd: '📨 Передано администратору — ответим в личных сообщениях.', adminFwd: '✉️ Сообщение от партнёра <b>{name}</b>{username} (id {id}):\n{text}',
    refWelcome: '🎁 Вы пришли по приглашению <b>{name}</b> — вам открыт полный доступ ко всем картам и сценариям на 7 дней. Откройте приложение.',
    refQualified: '🎉 <b>{name}</b> сыграл(а) первую партию по вашему приглашению. Приглашённых с партией: {n}.',
    refReward: '🏆 Награда за приглашения ({n}): {reward}. Уже в вашем аккаунте.',
    rwDays: 'полный доступ на {d} дн.', rwCard: 'премиум-карта на выбор (в магазине — «Забрать бесплатно»)', rwScen: 'сценарий на выбор (в магазине — «Забрать бесплатно»)', rwPack: 'пак «Дипломатическая игра» навсегда',
    partnerApplied: '📨 Заявка в партнёрскую программу отправлена. Мы ответим в течение 1–2 дней.', partnerApproved: '🤝 Вы партнёр Mafia Pro: {share}% со всех покупок приглашённых игроков 12 месяцев. Ваша ссылка и статистика — во вкладке «Друзья» → «Партнёрская система».', partnerClub: '🏛 Для вас создан клуб «{name}» — он уже в списке клубов. Откройте вкладку «Клубы», добавьте логотип и город, приглашайте игроков.',
    partnerRejected: 'Заявка в партнёрскую программу отклонена. Напишите нам, если считаете это ошибкой.',
    adminPartnerNew: '📨 Новая заявка партнёра: <b>{name}</b>{username}\nКанал/клуб: {channel}\nАудитория: {audience}\n\nПодтвердить: /partner {id}\nОтклонить: /partner_no {id}',
    adminPartnerOk: 'Партнёр подтверждён: {name}.', adminPartnerNo: 'Заявка отклонена: {name}.', adminPartners: 'Партнёры:\n{list}', adminPartnersNone: 'Партнёров пока нет.',
    adminHelpPartner: '/partner @user — подтвердить партнёра, /partner_no @user — отклонить, /partners — список',
    friendRequest: '👋 <b>{name}</b> хочет добавить вас в друзья в Mafia Pro.',
    btnAccept: 'Принять', btnDecline: 'Отклонить',
    requestAccepted: '✅ Теперь вы и <b>{name}</b> друзья.', requestDeclined: 'Запрос отклонён.', requestGone: 'Запрос уже обработан.',
    requestAcceptedBy: '✅ <b>{name}</b> принял(а) ваш запрос — теперь вы друзья.',
    grantGiven: '🎁 Вам открыт полный доступ в Mafia Pro: все карты, сценарии и паки — до <b>{until}</b>. Откройте приложение, всё уже доступно.',
    grantRevoked: 'Полный доступ в Mafia Pro завершён. Купленные карты остаются вашими.',
    adminGranted: 'Выдан полный доступ: {name} до {until}.', adminRevoked: 'Доступ отозван: {name}.', adminNoUser: 'Пользователь {q} не найден — он должен хотя бы раз открыть бота.',
    adminGrants: 'Активные доступы:\n{list}', adminNone: 'Активных доступов нет.', adminHelp: 'Команды администратора:\n/grant @username [дней] — полный доступ (по умолчанию 30 дней)\n/revoke @username — отозвать\n/grants — список',
    friendAccepted: '✅ Вы и <b>{name}</b> теперь друзья в Mafia Pro. Друзей можно звать за стол одной кнопкой.',
    friendJoined: '<b>{name}</b> принял(а) ваше приглашение — теперь вы друзья.',
    friendSelf: 'Это ваша собственная ссылка 🙂 Отправьте её другу.',
    inviteNotFound: 'Приглашение не найдено — попросите друга прислать ссылку ещё раз.',
    friendInvite: '🎴 <b>{name}</b> зовёт вас за стол Mafia Pro <b>{code}</b>.\nНажмите кнопку, чтобы сесть за стол — карта появится в приложении, как только ведущий раздаст.', tableInvite: '🎴 <b>{name}</b> зовёт вас за стол <b>{code}</b>. Ответьте в приложении или нажмите кнопку.',
    btnJoin: 'Сесть за стол {code}',
    hostJoined: '👤 За столом <b>{code}</b> новый игрок: <b>{name}</b> (всего {n}).',
    hostLeft: '🚪 <b>{name}</b> встал из-за стола <b>{code}</b> (осталось {n}).',
    hostInvite: '🎩 <b>{name}</b> зовёт вас <b>вести</b> стол <b>{code}</b>: игроки уже садятся, нужен ведущий.',
    btnHostYes: '🎩 Буду вести',
    hostTaken: '🎩 <b>{name}</b> ведёт стол <b>{code}</b> — вы играете за ним.',
    hostingNow: '🎩 Вы ведёте стол <b>{code}</b>. Откройте его в приложении: рассадка, раздача карт и партия — у вас.',
    kicked: '🚪 Ведущий <b>{name}</b> убрал вас из-за стола <b>{code}</b>.',
    play: '🎴 Играть',
    welcome: '<b>Mafia Pro</b> — стол ведущего для живой игры в мафию.\n\nНажмите «Играть», чтобы открыть приложение: раздача карт, ночь и день по шагам, голосование по правилам, разбор партии и рейтинги.\n\nКлассическая мафия на 10 — бесплатно. 55 ролей, пять языков.',
    help: 'Что умеет бот:\n• «Играть» — открыть приложение ведущего\n• Если ведущий прислал вам ссылку на стол — откройте её, и ваша карта придёт сюда в личные сообщения\n• Покупки оплачиваются Telegram Stars и сохраняются в вашем аккаунте',
    joined: '✅ Вы за столом <b>{code}</b>. Откройте приложение — там зал ожидания, а как только ведущий раздаст карты, появится ваша карта. Никому её не показывайте.', cardReady: '🎴 Ваша карта за столом <b>{code}</b> готова — откройте её в приложении. Никому не показывайте.', btnOpenTable: 'Открыть стол {code}', hostSelf: 'Вы ведущий стола <b>{code}</b> — ваш экран уже в приложении, место за столом вам не нужно.', btnPlayNow: 'Играю', btnNoThanks: 'Отклонить', inviteDeclined: 'Приглашение отклонено.', inviteGone: 'Стол уже закрыт.',
    alreadyJoined: 'Вы уже за столом <b>{code}</b>. Откройте приложение.',
    lobbyNotFound: 'Стол <b>{code}</b> не найден. Попросите у ведущего новую ссылку.',
    lobbyClosed: 'Стол <b>{code}</b> уже закрыт — карты розданы.',
    card: '🎴 <b>Ваша карта</b> · стол {code}, место {seat}\n\n{text}\n\n<i>Никому не показывайте это сообщение.</i>',
    paid: '✅ Оплата прошла, спасибо! Покупка привязана к вашему аккаунту Telegram — откройте приложение, она уже активна.',
    payFail: 'Счёт не найден или уже оплачен. Откройте магазин в приложении и попробуйте ещё раз.',
    unknown: 'Откройте приложение кнопкой «Играть» или через кнопку меню внизу.'
  },
  uk: {
    modeClassic: 'Класична мафія', modeRole: 'Рольова мафія', modeOpen: 'у відкриту', modeClosed: 'у закриту', modeLine: '🃏 {mode} · {open}',
    clubApplied: '🏛 Заявку на клуб «{name}» надіслано. Підтвердимо протягом 1–2 днів.', clubApproved: '🏛 Клуб «{name}» підтверджено, він у списку клубів. Ви — голова: запрошуйте гравців із застосунку.', clubRejected: 'Заявку на клуб «{name}» відхилено. Напишіть нам, якщо це помилка.',
    clubInvite: '🏛 <b>{name}</b> запрошує вас у клуб «{club}»{city}. Гравець може бути лише в одному клубі.', clubJoined: '✅ Ви в клубі «{club}». Чат клубу — у застосунку.', clubInviteGone: 'Запрошення вже оброблено.', clubInviteDeclined: 'Запрошення відхилено.',
    clubMemberJoined: '👤 <b>{name}</b> вступив(ла) до клубу «{club}».', clubApplyNew: '📨 <b>{name}</b> хоче вступити до клубу «{club}». Підтвердьте в застосунку: Клуби → Заявки.', clubApplyOk: '✅ Вас прийняли до клубу «{club}».', clubApplyNo: 'Заявку до клубу «{club}» відхилено.', clubKicked: 'Вас виключено з клубу «{club}».',
    clubLobby: '🎴 <b>{name}</b> кличе клуб за стіл <b>{code}</b>.', adminClubNew: '🏛 Нова заявка на клуб: <b>{name}</b>, {city}\nГолова: {owner}{username}\n{about}\n\nПідтвердити: /club_ok {id}\nВідхилити: /club_no {id}', adminClubOk: 'Клуб підтверджено: {name}.', adminClubNo: 'Заявку відхилено: {name}.', adminClubs: 'Клуби:\n{list}', adminClubsNone: 'Клубів поки немає.', adminHelpClub: '/club_ok <id> — підтвердити клуб, /club_no <id> — відхилити, /clubs — список', adminHelpGrowth: '/players [днів] — нові гравці й таблиця .xlsx, /players all — усі гравці, /players live on|off — сповіщення про кожного нового (зведення — щодня о 21:00)',
    fwd: '📨 Передано адміністратору — відповімо в особистих повідомленнях.', adminFwd: '✉️ Повідомлення від партнера <b>{name}</b>{username} (id {id}):\n{text}',
    refWelcome: '🎁 Ви прийшли за запрошенням <b>{name}</b> — вам відкрито повний доступ до всіх карт і сценаріїв на 7 днів. Відкрийте застосунок.',
    refQualified: '🎉 <b>{name}</b> зіграв(ла) першу партію за вашим запрошенням. Запрошених із партією: {n}.',
    refReward: '🏆 Нагорода за запрошення ({n}): {reward}. Уже у вашому акаунті.',
    rwDays: 'повний доступ на {d} дн.', rwCard: 'преміум-карта на вибір (у магазині — «Забрати безкоштовно»)', rwScen: 'сценарій на вибір (у магазині — «Забрати безкоштовно»)', rwPack: 'пак «Дипломатична гра» назавжди',
    partnerApplied: '📨 Заявку в партнерську програму надіслано. Відповімо протягом 1–2 днів.', partnerApproved: '🤝 Ви партнер Mafia Pro: {share}% з усіх покупок запрошених гравців 12 місяців. Посилання і статистика — у вкладці «Друзі» → «Партнерська система».', partnerClub: '🏛 Для вас створено клуб «{name}» — він уже у списку клубів. Відкрийте вкладку «Клуби», додайте логотип і місто, запрошуйте гравців.',
    partnerRejected: 'Заявку в партнерську програму відхилено. Напишіть нам, якщо вважаєте це помилкою.',
    adminPartnerNew: '📨 Нова заявка партнера: <b>{name}</b>{username}\nКанал/клуб: {channel}\nАудиторія: {audience}\n\nПідтвердити: /partner {id}\nВідхилити: /partner_no {id}',
    adminPartnerOk: 'Партнера підтверджено: {name}.', adminPartnerNo: 'Заявку відхилено: {name}.', adminPartners: 'Партнери:\n{list}', adminPartnersNone: 'Партнерів поки немає.',
    adminHelpPartner: '/partner @user — підтвердити партнера, /partner_no @user — відхилити, /partners — список',
    friendRequest: '👋 <b>{name}</b> хоче додати вас у друзі в Mafia Pro.',
    btnAccept: 'Прийняти', btnDecline: 'Відхилити',
    requestAccepted: '✅ Тепер ви і <b>{name}</b> друзі.', requestDeclined: 'Запит відхилено.', requestGone: 'Запит уже оброблено.',
    requestAcceptedBy: '✅ <b>{name}</b> прийняв(ла) ваш запит — тепер ви друзі.',
    grantGiven: '🎁 Вам відкрито повний доступ у Mafia Pro: усі карти, сценарії та паки — до <b>{until}</b>. Відкрийте застосунок, усе вже доступно.',
    grantRevoked: 'Повний доступ у Mafia Pro завершено. Куплені карти залишаються вашими.',
    adminGranted: 'Видано повний доступ: {name} до {until}.', adminRevoked: 'Доступ відкликано: {name}.', adminNoUser: 'Користувача {q} не знайдено — він має хоча б раз відкрити бота.',
    adminGrants: 'Активні доступи:\n{list}', adminNone: 'Активних доступів немає.', adminHelp: 'Команди адміністратора:\n/grant @username [днів] — повний доступ (типово 30 днів)\n/revoke @username — відкликати\n/grants — список',
    friendAccepted: '✅ Ви і <b>{name}</b> тепер друзі в Mafia Pro. Друзів можна кликати за стіл однією кнопкою.',
    friendJoined: '<b>{name}</b> прийняв(ла) ваше запрошення — тепер ви друзі.',
    friendSelf: 'Це ваше власне посилання 🙂 Надішліть його другові.',
    inviteNotFound: 'Запрошення не знайдено — попросіть друга надіслати посилання ще раз.',
    friendInvite: '🎴 <b>{name}</b> кличе вас за стіл Mafia Pro <b>{code}</b>.\nНатисніть кнопку, щоб сісти за стіл — карта з’явиться в застосунку, щойно ведучий роздасть.', tableInvite: '🎴 <b>{name}</b> кличе вас за стіл <b>{code}</b>. Відповідайте в застосунку або натисніть кнопку.',
    btnJoin: 'Сісти за стіл {code}',
    hostJoined: '👤 За столом <b>{code}</b> новий гравець: <b>{name}</b> (усього {n}).',
    hostLeft: '🚪 <b>{name}</b> вийшов з-за столу <b>{code}</b> (залишилось {n}).',
    hostInvite: '🎩 <b>{name}</b> кличе вас <b>вести</b> стіл <b>{code}</b>: гравці вже сідають, потрібен ведучий.',
    btnHostYes: '🎩 Буду вести',
    hostTaken: '🎩 <b>{name}</b> веде стіл <b>{code}</b> — ви граєте за ним.',
    hostingNow: '🎩 Ви ведете стіл <b>{code}</b>. Відкрийте його в застосунку: розсадка, роздача карт і партія — у вас.',
    kicked: '🚪 Ведучий <b>{name}</b> прибрав вас з-за столу <b>{code}</b>.',
    play: '🎴 Грати',
    welcome: '<b>Mafia Pro</b> — стіл ведучого для живої гри в мафію.\n\nНатисніть «Грати», щоб відкрити застосунок: роздача карт, ніч і день покроково, голосування за правилами, розбір партії та рейтинги.\n\nКласична мафія на 10 — безкоштовно. 55 ролей, п’ять мов.',
    help: 'Що вміє бот:\n• «Грати» — відкрити застосунок ведучого\n• Якщо ведучий надіслав вам посилання на стіл — відкрийте його, і ваша карта прийде сюди в особисті повідомлення\n• Покупки оплачуються Telegram Stars і зберігаються у вашому акаунті',
    joined: '✅ Ви за столом <b>{code}</b>. Відкрийте застосунок — там зал очікування, а щойно ведучий роздасть карти, з’явиться ваша карта. Нікому її не показуйте.', cardReady: '🎴 Ваша карта за столом <b>{code}</b> готова — відкрийте її в застосунку. Нікому не показуйте.', btnOpenTable: 'Відкрити стіл {code}', hostSelf: 'Ви ведучий столу <b>{code}</b> — ваш екран уже в застосунку, місце за столом вам не потрібне.', btnPlayNow: 'Граю', btnNoThanks: 'Відхилити', inviteDeclined: 'Запрошення відхилено.', inviteGone: 'Стіл уже закритий.',
    alreadyJoined: 'Ви вже за столом <b>{code}</b>. Відкрийте застосунок.',
    lobbyNotFound: 'Стіл <b>{code}</b> не знайдено. Попросіть у ведучого нове посилання.',
    lobbyClosed: 'Стіл <b>{code}</b> уже закрито — карти роздано.',
    card: '🎴 <b>Ваша карта</b> · стіл {code}, місце {seat}\n\n{text}\n\n<i>Нікому не показуйте це повідомлення.</i>',
    paid: '✅ Оплата пройшла, дякуємо! Покупка прив’язана до вашого акаунта Telegram — відкрийте застосунок, вона вже активна.',
    payFail: 'Рахунок не знайдено або вже оплачено. Відкрийте магазин у застосунку й спробуйте ще раз.',
    unknown: 'Відкрийте застосунок кнопкою «Грати» або через кнопку меню внизу.'
  },
  en: {
    modeClassic: 'Classic mafia', modeRole: 'Role mafia', modeOpen: 'open game', modeClosed: 'closed game', modeLine: '🃏 {mode} · {open}',
    clubApplied: '🏛 Club application “{name}” sent. We confirm within 1–2 days.', clubApproved: '🏛 Club “{name}” is approved and listed. You are the head: invite players from the app.', clubRejected: 'The club application “{name}” was declined. Message us if this is a mistake.',
    clubInvite: '🏛 <b>{name}</b> invites you to the club “{club}”{city}. A player can belong to one club only.', clubJoined: '✅ You are in the club “{club}”. The club chat is in the app.', clubInviteGone: 'This invitation has already been handled.', clubInviteDeclined: 'Invitation declined.',
    clubMemberJoined: '👤 <b>{name}</b> joined the club “{club}”.', clubApplyNew: '📨 <b>{name}</b> wants to join the club “{club}”. Confirm in the app: Clubs → Requests.', clubApplyOk: '✅ You were accepted into the club “{club}”.', clubApplyNo: 'Your application to the club “{club}” was declined.', clubKicked: 'You were removed from the club “{club}”.',
    clubLobby: '🎴 <b>{name}</b> calls the club to table <b>{code}</b>.', adminClubNew: '🏛 New club application: <b>{name}</b>, {city}\nHead: {owner}{username}\n{about}\n\nApprove: /club_ok {id}\nDecline: /club_no {id}', adminClubOk: 'Club approved: {name}.', adminClubNo: 'Application declined: {name}.', adminClubs: 'Clubs:\n{list}', adminClubsNone: 'No clubs yet.', adminHelpClub: '/club_ok <id> — approve a club, /club_no <id> — decline, /clubs — list', adminHelpGrowth: '/players [days] — new players and an .xlsx table, /players all — all players, /players live on|off — a notice about every newcomer (digest daily at 21:00 Kyiv)',
    fwd: '📨 Forwarded to the administrator — we will reply in a private message.', adminFwd: '✉️ Message from partner <b>{name}</b>{username} (id {id}):\n{text}',
    refWelcome: '🎁 You joined through <b>{name}</b>’s invitation — full access to every card and scenario is yours for 7 days. Open the app.',
    refQualified: '🎉 <b>{name}</b> played a first game through your invitation. Invited players with a game: {n}.',
    refReward: '🏆 Referral reward ({n}): {reward}. Already in your account.',
    rwDays: 'full access for {d} days', rwCard: 'a premium card of your choice (“Claim for free” in the shop)', rwScen: 'a scenario of your choice (“Claim for free” in the shop)', rwPack: 'the “Diplomatic Game” pack forever',
    partnerApplied: '📨 Your partner application has been sent. We reply within 1–2 days.', partnerApproved: '🤝 You are a Mafia Pro partner: {share}% of all purchases by the players you bring, for 12 months. Your link and stats: “Friends” → “Partner programme”.', partnerClub: '🏛 Your club “{name}” has been created and is already listed. Open the “Clubs” tab, add a logo and city, invite players.',
    partnerRejected: 'The partner application was declined. Message us if you think this is a mistake.',
    adminPartnerNew: '📨 New partner application: <b>{name}</b>{username}\nChannel/club: {channel}\nAudience: {audience}\n\nApprove: /partner {id}\nDecline: /partner_no {id}',
    adminPartnerOk: 'Partner approved: {name}.', adminPartnerNo: 'Application declined: {name}.', adminPartners: 'Partners:\n{list}', adminPartnersNone: 'No partners yet.',
    adminHelpPartner: '/partner @user — approve a partner, /partner_no @user — decline, /partners — list',
    friendRequest: '👋 <b>{name}</b> wants to add you as a friend in Mafia Pro.',
    btnAccept: 'Accept', btnDecline: 'Decline',
    requestAccepted: '✅ You and <b>{name}</b> are now friends.', requestDeclined: 'Request declined.', requestGone: 'This request has already been handled.',
    requestAcceptedBy: '✅ <b>{name}</b> accepted your request — you are now friends.',
    grantGiven: '🎁 You have full access in Mafia Pro: every card, scenario and pack — until <b>{until}</b>. Open the app, it is all unlocked.',
    grantRevoked: 'Your full access in Mafia Pro has ended. Purchased cards stay yours.',
    adminGranted: 'Full access granted: {name} until {until}.', adminRevoked: 'Access revoked: {name}.', adminNoUser: 'User {q} not found — they need to open the bot at least once.',
    adminGrants: 'Active grants:\n{list}', adminNone: 'No active grants.', adminHelp: 'Admin commands:\n/grant @username [days] — full access (30 days by default)\n/revoke @username — revoke\n/grants — list',
    friendAccepted: '✅ You and <b>{name}</b> are now friends in Mafia Pro. Friends can be invited to a table with one tap.',
    friendJoined: '<b>{name}</b> accepted your invitation — you are now friends.',
    friendSelf: 'That is your own link 🙂 Send it to a friend.',
    inviteNotFound: 'Invitation not found — ask your friend to send the link again.',
    friendInvite: '🎴 <b>{name}</b> invites you to Mafia Pro table <b>{code}</b>.\nTap the button to take a seat — your card appears in the app as soon as the host deals.', tableInvite: '🎴 <b>{name}</b> invites you to table <b>{code}</b>. Answer in the app or tap the button.',
    btnJoin: 'Join table {code}',
    hostJoined: '👤 New player at table <b>{code}</b>: <b>{name}</b> ({n} total).',
    hostLeft: '🚪 <b>{name}</b> left table <b>{code}</b> ({n} left).',
    hostInvite: '🎩 <b>{name}</b> asks you to <b>host</b> table <b>{code}</b>: the players are sitting down, a host is needed.',
    btnHostYes: '🎩 I will host',
    hostTaken: '🎩 <b>{name}</b> hosts table <b>{code}</b> — you play at it.',
    hostingNow: '🎩 You host table <b>{code}</b>. Open it in the app: seating, the deal and the game are yours.',
    kicked: '🚪 The host <b>{name}</b> removed you from table <b>{code}</b>.',
    play: '🎴 Play',
    welcome: '<b>Mafia Pro</b> — the host’s table for live Mafia games.\n\nTap “Play” to open the app: card dealing, step-by-step night and day, rule-driven voting, post-game review and ratings.\n\nClassic 10-player Mafia is free. 55 roles, five languages.',
    help: 'What this bot does:\n• “Play” opens the host app\n• If a host sent you a table link, open it and your card will arrive here in a private message\n• Purchases are paid with Telegram Stars and stay with your account',
    joined: '✅ You are at table <b>{code}</b>. Open the app for the waiting room; your card appears there as soon as the host deals. Don’t show it to anyone.', cardReady: '🎴 Your card at table <b>{code}</b> is ready — open it in the app. Don’t show it to anyone.', btnOpenTable: 'Open table {code}', hostSelf: 'You host table <b>{code}</b> — your screen is already in the app, you need no seat.', btnPlayNow: 'I’m in', btnNoThanks: 'Decline', inviteDeclined: 'Invitation declined.', inviteGone: 'The table is closed.',
    alreadyJoined: 'You are already at table <b>{code}</b>. Open the app.',
    lobbyNotFound: 'Table <b>{code}</b> was not found. Ask the host for a new link.',
    lobbyClosed: 'Table <b>{code}</b> is already closed — the cards have been dealt.',
    card: '🎴 <b>Your card</b> · table {code}, seat {seat}\n\n{text}\n\n<i>Don’t show this message to anyone.</i>',
    paid: '✅ Payment received, thank you! The purchase is tied to your Telegram account — open the app, it is already active.',
    payFail: 'Invoice not found or already paid. Open the shop in the app and try again.',
    unknown: 'Open the app with the “Play” button or the menu button below.'
  },
  pl: {
    modeClassic: 'Mafia klasyczna', modeRole: 'Mafia z rolami', modeOpen: 'gra otwarta', modeClosed: 'gra zamknięta', modeLine: '🃏 {mode} · {open}',
    clubApplied: '🏛 Zgłoszenie klubu „{name}” wysłane. Potwierdzimy w ciągu 1–2 dni.', clubApproved: '🏛 Klub „{name}” został zatwierdzony i jest na liście. Jesteś szefem: zapraszaj graczy z aplikacji.', clubRejected: 'Zgłoszenie klubu „{name}” odrzucone. Napisz do nas, jeśli to pomyłka.',
    clubInvite: '🏛 <b>{name}</b> zaprasza Cię do klubu „{club}”{city}. Gracz może należeć tylko do jednego klubu.', clubJoined: '✅ Jesteś w klubie „{club}”. Czat klubu jest w aplikacji.', clubInviteGone: 'To zaproszenie zostało już obsłużone.', clubInviteDeclined: 'Zaproszenie odrzucone.',
    clubMemberJoined: '👤 <b>{name}</b> dołączył(a) do klubu „{club}”.', clubApplyNew: '📨 <b>{name}</b> chce dołączyć do klubu „{club}”. Potwierdź w aplikacji: Kluby → Zgłoszenia.', clubApplyOk: '✅ Przyjęto Cię do klubu „{club}”.', clubApplyNo: 'Zgłoszenie do klubu „{club}” odrzucone.', clubKicked: 'Usunięto Cię z klubu „{club}”.',
    clubLobby: '🎴 <b>{name}</b> woła klub do stołu <b>{code}</b>.', adminClubNew: '🏛 Nowe zgłoszenie klubu: <b>{name}</b>, {city}\nSzef: {owner}{username}\n{about}\n\nZatwierdź: /club_ok {id}\nOdrzuć: /club_no {id}', adminClubOk: 'Klub zatwierdzony: {name}.', adminClubNo: 'Zgłoszenie odrzucone: {name}.', adminClubs: 'Kluby:\n{list}', adminClubsNone: 'Brak klubów.', adminHelpClub: '/club_ok <id> — zatwierdź klub, /club_no <id> — odrzuć, /clubs — lista', adminHelpGrowth: '/players [dni] — nowi gracze i tabela .xlsx, /players all — wszyscy gracze, /players live on|off — powiadomienie o każdym nowym (podsumowanie codziennie o 21:00 czasu kijowskiego)',
    fwd: '📨 Przekazano administratorowi — odpowiemy w wiadomości prywatnej.', adminFwd: '✉️ Wiadomość od partnera <b>{name}</b>{username} (id {id}):\n{text}',
    refWelcome: '🎁 Dołączyłeś(aś) z zaproszenia <b>{name}</b> — masz pełny dostęp do wszystkich kart i scenariuszy na 7 dni. Otwórz aplikację.',
    refQualified: '🎉 <b>{name}</b> rozegrał(a) pierwszą partię z Twojego zaproszenia. Zaproszonych z partią: {n}.',
    refReward: '🏆 Nagroda za zaproszenia ({n}): {reward}. Już na Twoim koncie.',
    rwDays: 'pełny dostęp na {d} dni', rwCard: 'karta premium do wyboru („Odbierz za darmo” w sklepie)', rwScen: 'scenariusz do wyboru („Odbierz za darmo” w sklepie)', rwPack: 'pakiet „Gra dyplomatyczna” na zawsze',
    partnerApplied: '📨 Zgłoszenie do programu partnerskiego wysłane. Odpowiemy w ciągu 1–2 dni.', partnerApproved: '🤝 Jesteś partnerem Mafia Pro: {share}% ze wszystkich zakupów zaproszonych graczy przez 12 miesięcy. Link i statystyki: „Znajomi” → „Program partnerski”.', partnerClub: '🏛 Utworzyliśmy dla Ciebie klub „{name}” — jest już na liście klubów. Otwórz zakładkę „Kluby”, dodaj logo i miasto, zapraszaj graczy.',
    partnerRejected: 'Zgłoszenie do programu partnerskiego odrzucone. Napisz do nas, jeśli to pomyłka.',
    adminPartnerNew: '📨 Nowe zgłoszenie partnera: <b>{name}</b>{username}\nKanał/klub: {channel}\nPubliczność: {audience}\n\nZatwierdź: /partner {id}\nOdrzuć: /partner_no {id}',
    adminPartnerOk: 'Partner zatwierdzony: {name}.', adminPartnerNo: 'Zgłoszenie odrzucone: {name}.', adminPartners: 'Partnerzy:\n{list}', adminPartnersNone: 'Brak partnerów.',
    adminHelpPartner: '/partner @user — zatwierdź partnera, /partner_no @user — odrzuć, /partners — lista',
    friendRequest: '👋 <b>{name}</b> chce dodać Cię do znajomych w Mafia Pro.',
    btnAccept: 'Przyjmij', btnDecline: 'Odrzuć',
    requestAccepted: '✅ Ty i <b>{name}</b> jesteście teraz znajomymi.', requestDeclined: 'Zaproszenie odrzucone.', requestGone: 'To zaproszenie zostało już obsłużone.',
    requestAcceptedBy: '✅ <b>{name}</b> przyjął(ęła) Twoje zaproszenie — jesteście teraz znajomymi.',
    grantGiven: '🎁 Masz pełny dostęp w Mafia Pro: wszystkie karty, scenariusze i pakiety — do <b>{until}</b>. Otwórz aplikację, wszystko jest odblokowane.',
    grantRevoked: 'Pełny dostęp w Mafia Pro zakończył się. Kupione karty pozostają Twoje.',
    adminGranted: 'Przyznano pełny dostęp: {name} do {until}.', adminRevoked: 'Dostęp cofnięty: {name}.', adminNoUser: 'Nie znaleziono użytkownika {q} — musi choć raz otworzyć bota.',
    adminGrants: 'Aktywne dostępy:\n{list}', adminNone: 'Brak aktywnych dostępów.', adminHelp: 'Polecenia administratora:\n/grant @username [dni] — pełny dostęp (domyślnie 30 dni)\n/revoke @username — cofnij\n/grants — lista',
    friendAccepted: '✅ Ty i <b>{name}</b> jesteście teraz znajomymi w Mafia Pro. Znajomych można zaprosić do stołu jednym dotknięciem.',
    friendJoined: '<b>{name}</b> przyjął(ęła) Twoje zaproszenie — jesteście teraz znajomymi.',
    friendSelf: 'To Twój własny link 🙂 Wyślij go znajomemu.',
    inviteNotFound: 'Nie znaleziono zaproszenia — poproś znajomego o ponowne wysłanie linku.',
    friendInvite: '🎴 <b>{name}</b> zaprasza Cię do stołu Mafia Pro <b>{code}</b>.\nNaciśnij przycisk, aby usiąść — karta pojawi się w aplikacji, gdy prowadzący rozda.', tableInvite: '🎴 <b>{name}</b> zaprasza Cię do stołu <b>{code}</b>. Odpowiedz w aplikacji lub naciśnij przycisk.',
    btnJoin: 'Dołącz do stołu {code}',
    hostJoined: '👤 Nowy gracz przy stole <b>{code}</b>: <b>{name}</b> (łącznie {n}).',
    hostLeft: '🚪 <b>{name}</b> opuścił stół <b>{code}</b> (zostało {n}).',
    hostInvite: '🎩 <b>{name}</b> prosi Cię o <b>prowadzenie</b> stołu <b>{code}</b>: gracze już siadają, potrzebny prowadzący.',
    btnHostYes: '🎩 Poprowadzę',
    hostTaken: '🎩 <b>{name}</b> prowadzi stół <b>{code}</b> — Ty grasz przy nim.',
    hostingNow: '🎩 Prowadzisz stół <b>{code}</b>. Otwórz go w aplikacji: rozsadzenie, rozdanie kart i gra są Twoje.',
    kicked: '🚪 Prowadzący <b>{name}</b> usunął Cię ze stołu <b>{code}</b>.',
    play: '🎴 Graj',
    welcome: '<b>Mafia Pro</b> — stół prowadzącego do gry w mafię na żywo.\n\nNaciśnij „Graj”, aby otworzyć aplikację: rozdanie kart, noc i dzień krok po kroku, głosowanie według zasad, analiza partii i rankingi.\n\nKlasyczna mafia na 10 osób — bezpłatnie. 55 ról, pięć języków.',
    help: 'Co potrafi bot:\n• „Graj” — otwiera aplikację prowadzącego\n• Jeśli prowadzący wysłał Ci link do stołu, otwórz go, a Twoja karta przyjdzie tutaj w wiadomości prywatnej\n• Zakupy opłacasz Telegram Stars i pozostają na Twoim koncie',
    joined: '✅ Jesteś przy stole <b>{code}</b>. Otwórz aplikację — tam jest poczekalnia, a gdy prowadzący rozda karty, pojawi się Twoja karta. Nie pokazuj jej nikomu.', cardReady: '🎴 Twoja karta przy stole <b>{code}</b> jest gotowa — otwórz ją w aplikacji. Nie pokazuj jej nikomu.', btnOpenTable: 'Otwórz stół {code}', hostSelf: 'Prowadzisz stół <b>{code}</b> — Twój ekran jest już w aplikacji, miejsce nie jest Ci potrzebne.', btnPlayNow: 'Gram', btnNoThanks: 'Odrzuć', inviteDeclined: 'Zaproszenie odrzucone.', inviteGone: 'Stół jest już zamknięty.',
    alreadyJoined: 'Już jesteś przy stole <b>{code}</b>. Otwórz aplikację.',
    lobbyNotFound: 'Stół <b>{code}</b> nie został znaleziony. Poproś prowadzącego o nowy link.',
    lobbyClosed: 'Stół <b>{code}</b> jest już zamknięty — karty rozdane.',
    card: '🎴 <b>Twoja karta</b> · stół {code}, miejsce {seat}\n\n{text}\n\n<i>Nie pokazuj tej wiadomości nikomu.</i>',
    paid: '✅ Płatność przyjęta, dziękujemy! Zakup jest powiązany z Twoim kontem Telegram — otwórz aplikację, już jest aktywny.',
    payFail: 'Nie znaleziono faktury lub została już opłacona. Otwórz sklep w aplikacji i spróbuj ponownie.',
    unknown: 'Otwórz aplikację przyciskiem „Graj” lub przyciskiem menu poniżej.'
  },
  hy: {
    modeClassic: 'Դասական մաֆիա', modeRole: 'Դերային մաֆիա', modeOpen: 'բաց խաղ', modeClosed: 'փակ խաղ', modeLine: '🃏 {mode} · {open}',
    clubApplied: '🏛 «{name}» ակումբի հայտն ուղարկված է։ Կհաստատենք 1–2 օրվա ընթացքում։', clubApproved: '🏛 «{name}» ակումբը հաստատված է և ցանկում է։ Դուք ղեկավարն եք՝ հրավիրեք խաղացողներին հավելվածից։', clubRejected: '«{name}» ակումբի հայտը մերժված է։ Գրեք մեզ, եթե սա սխալ է։',
    clubInvite: '🏛 <b>{name}</b>-ը ձեզ հրավիրում է «{club}» ակումբ{city}։ Խաղացողը կարող է լինել միայն մեկ ակումբում։', clubJoined: '✅ Դուք «{club}» ակումբում եք։ Ակումբի չատը հավելվածում է։', clubInviteGone: 'Հրավերն արդեն մշակված է։', clubInviteDeclined: 'Հրավերը մերժված է։',
    clubMemberJoined: '👤 <b>{name}</b>-ը միացավ «{club}» ակումբին։', clubApplyNew: '📨 <b>{name}</b>-ը ցանկանում է միանալ «{club}» ակումբին։ Հաստատեք հավելվածում՝ Ակումբներ → Հայտեր։', clubApplyOk: '✅ Ձեզ ընդունեցին «{club}» ակումբ։', clubApplyNo: '«{club}» ակումբի հայտը մերժված է։', clubKicked: 'Ձեզ հեռացրել են «{club}» ակումբից։',
    clubLobby: '🎴 <b>{name}</b>-ը ակումբին կանչում է <b>{code}</b> սեղանի մոտ։', adminClubNew: '🏛 Ակումբի նոր հայտ՝ <b>{name}</b>, {city}\nՂեկավար՝ {owner}{username}\n{about}\n\nՀաստատել՝ /club_ok {id}\nՄերժել՝ /club_no {id}', adminClubOk: 'Ակումբը հաստատված է՝ {name}։', adminClubNo: 'Հայտը մերժված է՝ {name}։', adminClubs: 'Ակումբներ․\n{list}', adminClubsNone: 'Ակումբներ դեռ չկան։', adminHelpClub: '/club_ok <id> — հաստատել ակումբը, /club_no <id> — մերժել, /clubs — ցանկ', adminHelpGrowth: '/players [օր] — նոր խաղացողներ և .xlsx աղյուսակ, /players all — բոլոր խաղացողները, /players live on|off — ծանուցում յուրաքանչյուր նորի մասին (ամփոփում՝ ամեն օր 21:00-ին Կիևի ժամով)',
    fwd: '📨 Փոխանցված է ադմինիստրատորին — կպատասխանենք անձնական նամակով։', adminFwd: '✉️ Հաղորդագրություն գործընկեր <b>{name}</b>{username}-ից (id {id})․\n{text}',
    refWelcome: '🎁 Դուք եկել եք <b>{name}</b>-ի հրավերով — ձեզ տրված է լիարժեք հասանելիություն բոլոր քարտերին և սցենարներին 7 օրով։ Բացեք հավելվածը։',
    refQualified: '🎉 <b>{name}</b>-ը խաղաց առաջին խաղը ձեր հրավերով։ Խաղով հրավիրվածներ՝ {n}։',
    refReward: '🏆 Հրավերների պարգև ({n})՝ {reward}։ Արդեն ձեր հաշվում է։',
    rwDays: 'լիարժեք հասանելիություն {d} օրով', rwCard: 'պրեմիում քարտ ձեր ընտրությամբ (խանութում՝ «Վերցնել անվճար»)', rwScen: 'սցենար ձեր ընտրությամբ (խանութում՝ «Վերցնել անվճար»)', rwPack: '«Դիվանագիտական խաղ» փաթեթն ընդմիշտ',
    partnerApplied: '📨 Գործընկերային ծրագրի հայտն ուղարկված է։ Կպատասխանենք 1–2 օրվա ընթացքում։', partnerApproved: '🤝 Դուք Mafia Pro-ի գործընկեր եք՝ {share}% ձեր բերած խաղացողների բոլոր գնումներից 12 ամիս։ Հղումն ու վիճակագրությունը՝ «Ընկերներ» → «Գործընկերային ծրագիր»։', partnerClub: '🏛 Ձեզ համար ստեղծվել է «{name}» ակումբը՝ այն արդեն ակումբների ցանկում է։ Բացեք «Ակումբներ» ներդիրը, ավելացրեք լոգո և քաղաք, հրավիրեք խաղացողներին։',
    partnerRejected: 'Գործընկերային ծրագրի հայտը մերժված է։ Գրեք մեզ, եթե կարծում եք, որ սա սխալ է։',
    adminPartnerNew: '📨 Գործընկերի նոր հայտ՝ <b>{name}</b>{username}\nԱլիք/ակումբ՝ {channel}\nԼսարան՝ {audience}\n\nՀաստատել՝ /partner {id}\nՄերժել՝ /partner_no {id}',
    adminPartnerOk: 'Գործընկերը հաստատված է՝ {name}։', adminPartnerNo: 'Հայտը մերժված է՝ {name}։', adminPartners: 'Գործընկերներ․\n{list}', adminPartnersNone: 'Գործընկերներ դեռ չկան։',
    adminHelpPartner: '/partner @user — հաստատել գործընկերին, /partner_no @user — մերժել, /partners — ցանկ',
    friendRequest: '👋 <b>{name}</b>-ը ցանկանում է ձեզ ավելացնել ընկերների մեջ Mafia Pro-ում։',
    btnAccept: 'Ընդունել', btnDecline: 'Մերժել',
    requestAccepted: '✅ Այժմ դուք և <b>{name}</b> ընկերներ եք։', requestDeclined: 'Հարցումը մերժված է։', requestGone: 'Այս հարցումն արդեն մշակված է։',
    requestAcceptedBy: '✅ <b>{name}</b>-ն ընդունել է ձեր հարցումը — այժմ ընկերներ եք։',
    grantGiven: '🎁 Ձեզ տրված է լիարժեք հասանելիություն Mafia Pro-ում՝ բոլոր քարտերը, սցենարները և փաթեթները մինչև <b>{until}</b>։ Բացեք հավելվածը, ամեն ինչ արդեն բաց է։',
    grantRevoked: 'Mafia Pro-ում լիարժեք հասանելիությունն ավարտվել է։ Գնված քարտերը մնում են ձերը։',
    adminGranted: 'Տրված է լիարժեք հասանելիություն՝ {name} մինչև {until}։', adminRevoked: 'Հասանելիությունը չեղարկված է՝ {name}։', adminNoUser: '{q} օգտատերը չի գտնվել — նա պետք է գոնե մեկ անգամ բացի բոտը։',
    adminGrants: 'Ակտիվ հասանելիություններ․\n{list}', adminNone: 'Ակտիվ հասանելիություններ չկան։', adminHelp: 'Ադմինի հրամաններ․\n/grant @username [օր] — լիարժեք հասանելիություն (լռելյայն 30 օր)\n/revoke @username — չեղարկել\n/grants — ցանկ',
    friendAccepted: '✅ Դուք և <b>{name}</b> այժմ ընկերներ եք Mafia Pro-ում։ Ընկերներին կարելի է սեղանի մոտ կանչել մեկ սեղմումով։',
    friendJoined: '<b>{name}</b> ընդունել է ձեր հրավերը — այժմ ընկերներ եք։',
    friendSelf: 'Սա ձեր սեփական հղումն է 🙂 Ուղարկեք այն ընկերոջը։',
    inviteNotFound: 'Հրավերը չի գտնվել — խնդրեք ընկերոջը նորից ուղարկել հղումը։',
    friendInvite: '🎴 <b>{name}</b>-ը ձեզ հրավիրում է Mafia Pro <b>{code}</b> սեղանի մոտ։\nՍեղմեք կոճակը՝ նստելու համար․ քարտը կհայտնվի հավելվածում, հենց վարողը բաժանի։', tableInvite: '🎴 <b>{name}</b>-ը ձեզ կանչում է <b>{code}</b> սեղանի մոտ։ Պատասխանեք հավելվածում կամ սեղմեք կոճակը։',
    btnJoin: 'Նստել {code} սեղանի մոտ',
    hostJoined: '👤 <b>{code}</b> սեղանի մոտ նոր խաղացող՝ <b>{name}</b> (ընդամենը {n})։',
    hostLeft: '🚪 <b>{name}</b> դուրս եկավ <b>{code}</b> սեղանից (մնաց {n})։',
    hostInvite: '🎩 <b>{name}</b>-ը խնդրում է ձեզ <b>վարել</b> <b>{code}</b> սեղանը․ խաղացողներն արդեն նստում են, վարող է պետք։',
    btnHostYes: '🎩 Կվարեմ',
    hostTaken: '🎩 <b>{name}</b>-ը վարում է <b>{code}</b> սեղանը․ դուք խաղում եք նրա մոտ։',
    hostingNow: '🎩 Դուք վարում եք <b>{code}</b> սեղանը։ Բացեք այն հավելվածում․ նստեցումը, քարտերի բաժանումը և խաղը ձերն են։',
    kicked: '🚪 Վարող <b>{name}</b>-ը հեռացրեց ձեզ <b>{code}</b> սեղանից։',
    play: '🎴 Խաղալ',
    welcome: '<b>Mafia Pro</b> — վարողի սեղան կենդանի մաֆիայի համար։\n\nՍեղմեք «Խաղալ»՝ հավելվածը բացելու համար՝ քարտերի բաժանում, գիշեր և օր քայլ առ քայլ, քվեարկություն կանոններով, խաղի վերլուծություն և վարկանիշներ։\n\nԴասական մաֆիա 10 հոգու համար՝ անվճար։ 55 դեր, հինգ լեզու։',
    help: 'Ինչ է անում բոտը․\n• «Խաղալ» — բացում է վարողի հավելվածը\n• Եթե վարողը ձեզ սեղանի հղում է ուղարկել, բացեք այն, և ձեր քարտը կգա այստեղ՝ անձնական նամակով\n• Գնումները վճարվում են Telegram Stars-ով և մնում են ձեր հաշվում',
    joined: '✅ Դուք <b>{code}</b> սեղանի մոտ եք։ Բացեք հավելվածը՝ այնտեղ սպասասրահն է, իսկ հենց վարողը բաժանի քարտերը, կհայտնվի ձեր քարտը։ Ոչ մեկին մի ցույց տվեք։', cardReady: '🎴 Ձեր քարտը <b>{code}</b> սեղանի մոտ պատրաստ է՝ բացեք այն հավելվածում։ Ոչ մեկին մի ցույց տվեք։', btnOpenTable: 'Բացել {code} սեղանը', hostSelf: 'Դուք <b>{code}</b> սեղանի վարողն եք․ ձեր էկրանն արդեն հավելվածում է, տեղ ձեզ պետք չէ։', btnPlayNow: 'Խաղում եմ', btnNoThanks: 'Մերժել', inviteDeclined: 'Հրավերը մերժված է։', inviteGone: 'Սեղանն արդեն փակ է։',
    alreadyJoined: 'Դուք արդեն <b>{code}</b> սեղանի մոտ եք։ Բացեք հավելվածը։',
    lobbyNotFound: '<b>{code}</b> սեղանը չի գտնվել։ Վարողից նոր հղում խնդրեք։',
    lobbyClosed: '<b>{code}</b> սեղանն արդեն փակ է՝ քարտերը բաժանված են։',
    card: '🎴 <b>Ձեր քարտը</b> · սեղան {code}, տեղ {seat}\n\n{text}\n\n<i>Այս հաղորդագրությունը ոչ մեկին մի ցույց տվեք։</i>',
    paid: '✅ Վճարումն ընդունված է, շնորհակալություն։ Գնումը կապված է ձեր Telegram հաշվին — բացեք հավելվածը, այն արդեն ակտիվ է։',
    payFail: 'Հաշիվը չի գտնվել կամ արդեն վճարված է։ Բացեք խանութը հավելվածում և նորից փորձեք։',
    unknown: 'Բացեք հավելվածը «Խաղալ» կոճակով կամ ներքևի մենյուի կոճակով։'
  }
};
/* /broadcast in the admin help (broadcast.js) */
Object.assign(TEXTS.ru, { adminHelpBroadcast: '/broadcast — разослать всем игрокам приглашение в канал и чат (сначала образец и кнопка «Разослать»), /broadcast <текст> — свой текст' });
Object.assign(TEXTS.uk, { adminHelpBroadcast: '/broadcast — розіслати всім гравцям запрошення в канал і чат (спершу зразок і кнопка «Разослать»), /broadcast <текст> — свій текст' });
Object.assign(TEXTS.en, { adminHelpBroadcast: '/broadcast — send every player the channel and chat invitation (a sample and a confirm button first), /broadcast <text> — your own text' });
Object.assign(TEXTS.pl, { adminHelpBroadcast: '/broadcast — wyślij wszystkim graczom zaproszenie na kanał i czat (najpierw próbka i przycisk potwierdzenia), /broadcast <tekst> — własny tekst' });
Object.assign(TEXTS.hy, { adminHelpBroadcast: '/broadcast — ուղարկել բոլոր խաղացողներին ալիքի և չատի հրավերը (նախ՝ նմուշ և հաստատման կոճակ), /broadcast <տեքստ> — ձեր տեքստը' });
export function pickLang(code) {
  const c = String(code || '').toLowerCase().slice(0, 2);
  return TEXTS[c] ? c : (c === 'be' || c === 'kk' ? 'ru' : 'ru');
}
export function t(lang, key, vars = {}) {
  const s = (TEXTS[lang] || TEXTS.ru)[key] || TEXTS.ru[key] || key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}
/* v54 ranks: a rank reached for the first time, a new host badge */
Object.assign(TEXTS.ru, { rankUp: '🎉 Новый ранг: <b>{rank}</b>!\nРейтинг — {rating}. {next}\nЗначок уже стоит рядом с вашим ником в Mafia Pro.', rankUpNext: 'Следующий ранг — «{rank}», от {n}.', rankUpTop: 'Это высший ранг — выше только №1 общего рейтинга.', hostUp: '🎩 Новый значок ведущего: <b>{badge}</b> — вы провели {n} партий. Цилиндр теперь стоит рядом с вашим ником.', hostLvl1: 'Ведущий', hostLvl2: 'Опытный ведущий', hostLvl3: 'Ведущий-легенда' });
Object.assign(TEXTS.uk, { rankUp: '🎉 Новий ранг: <b>{rank}</b>!\nРейтинг — {rating}. {next}\nЗначок уже стоїть поруч із вашим ніком у Mafia Pro.', rankUpNext: 'Наступний ранг — «{rank}», від {n}.', rankUpTop: 'Це найвищий ранг — вище лише №1 загального рейтингу.', hostUp: '🎩 Новий значок ведучого: <b>{badge}</b> — ви провели {n} партій. Циліндр тепер стоїть поруч із вашим ніком.', hostLvl1: 'Ведучий', hostLvl2: 'Досвідчений ведучий', hostLvl3: 'Ведучий-легенда' });
Object.assign(TEXTS.en, { rankUp: '🎉 New rank: <b>{rank}</b>!\nRating: {rating}. {next}\nThe badge is already next to your name in Mafia Pro.', rankUpNext: 'Next rank: «{rank}», from {n}.', rankUpTop: 'This is the top rank — only №1 of the overall rating is higher.', hostUp: '🎩 New host badge: <b>{badge}</b> — you have hosted {n} games. The top hat now stands next to your name.', hostLvl1: 'Host', hostLvl2: 'Seasoned host', hostLvl3: 'Legendary host' });
Object.assign(TEXTS.pl, { rankUp: '🎉 Nowa ranga: <b>{rank}</b>!\nRanking: {rating}. {next}\nOdznaka stoi już obok Twojego nicku w Mafia Pro.', rankUpNext: 'Następna ranga — «{rank}», od {n}.', rankUpTop: 'To najwyższa ranga — wyżej jest tylko №1 ogólnego rankingu.', hostUp: '🎩 Nowa odznaka prowadzącego: <b>{badge}</b> — poprowadziłeś(-aś) {n} partii. Cylinder stoi teraz obok Twojego nicku.', hostLvl1: 'Prowadzący', hostLvl2: 'Doświadczony prowadzący', hostLvl3: 'Legendarny prowadzący' });
Object.assign(TEXTS.hy, { rankUp: '🎉 Նոր կոչում՝ <b>{rank}</b>։\nՎարկանիշ՝ {rating}։ {next}\nԿրծքանշանն արդեն ձեր անվան կողքին է Mafia Pro-ում։', rankUpNext: 'Հաջորդ կոչումը՝ «{rank}», {n}-ից։', rankUpTop: 'Սա բարձրագույն կոչումն է․ ավելի բարձր է միայն ընդհանուր վարկանիշի №1-ը։', hostUp: '🎩 Վարողի նոր կրծքանշան՝ <b>{badge}</b>․ դուք անցկացրել եք {n} խաղ։ Գլխարկն այժմ ձեր անվան կողքին է։', hostLvl1: 'Վարող', hostLvl2: 'Փորձառու վարող', hostLvl3: 'Լեգենդար վարող' });
/* v55 seasons: the congratulation of a Legend at the end of a season */
Object.assign(TEXTS.ru, { seasonLegend: '👑 <b>Сезон {n} завершён — вы Легенда!</b>\nВаш рейтинг в конце сезона — {rating}. Как обещали, всем Легендам сезона достаётся <b>Epic-скин</b>.\nРейтинг всех игроков сброшен до 1000, новый сезон — с {next}.' });
Object.assign(TEXTS.uk, { seasonLegend: '👑 <b>Сезон {n} завершено — ви Легенда!</b>\nВаш рейтинг наприкінці сезону — {rating}. Як обіцяли, усім Легендам сезону дістається <b>Epic-скін</b>.\nРейтинг усіх гравців скинуто до 1000, новий сезон — з {next}.' });
Object.assign(TEXTS.en, { seasonLegend: '👑 <b>Season {n} is over — you are a Legend!</b>\nYour rating at the end of the season: {rating}. As promised, every Legend of the season gets an <b>Epic skin</b>.\nEveryone\'s rating is back to 1000, the new season starts on {next}.' });
Object.assign(TEXTS.pl, { seasonLegend: '👑 <b>Sezon {n} zakończony — jesteś Legendą!</b>\nTwój ranking na koniec sezonu: {rating}. Zgodnie z obietnicą każda Legenda sezonu dostaje <b>skórkę Epic</b>.\nRanking wszystkich graczy wraca do 1000, nowy sezon startuje {next}.' });
Object.assign(TEXTS.hy, { seasonLegend: '👑 <b>Սեզոն {n}-ն ավարտվեց․ դուք Լեգենդ եք։</b>\nՁեր վարկանիշը սեզոնի վերջում՝ {rating}։ Ինչպես խոստացել էինք, սեզոնի բոլոր Լեգենդները ստանում են <b>Epic սքին</b>։\nԲոլոր խաղացողների վարկանիշը վերադարձել է 1000-ի, նոր սեզոնը՝ {next}-ից։' });

/* v56: the season's skin is given and put on at once */
Object.assign(TEXTS.ru, { seasonLegendSkin: '👑 <b>Сезон {n} завершён — вы Легенда!</b>\nВаш рейтинг в конце сезона — {rating}. Ваша награда — Epic-скин <b>«{skin}»</b>: он уже надет на вашу карту Дона, его видят все за столом. Снять или надеть снова — «Карты» → «Скины».\nРейтинг всех игроков сброшен до 1000, новый сезон — с {next}.' });
Object.assign(TEXTS.uk, { seasonLegendSkin: '👑 <b>Сезон {n} завершено — ви Легенда!</b>\nВаш рейтинг наприкінці сезону — {rating}. Ваша нагорода — Epic-скін <b>«{skin}»</b>: він уже вдягнений на вашу карту Дона, його бачать усі за столом. Зняти або вдягнути знову — «Карти» → «Скіни».\nРейтинг усіх гравців скинуто до 1000, новий сезон — з {next}.' });
Object.assign(TEXTS.en, { seasonLegendSkin: '👑 <b>Season {n} is over — you are a Legend!</b>\nYour rating at the end of the season: {rating}. Your reward is the Epic skin <b>“{skin}”</b>: it is already on your Don card, and everyone at the table sees it. Take it off or put it back in Cards → Skins.\nEveryone\'s rating is back to 1000, the new season starts on {next}.' });
Object.assign(TEXTS.pl, { seasonLegendSkin: '👑 <b>Sezon {n} zakończony — jesteś Legendą!</b>\nTwój ranking na koniec sezonu: {rating}. Twoja nagroda to skórka Epic <b>„{skin}”</b>: jest już założona na twoją kartę Dona i widzą ją wszyscy przy stole. Zdjąć lub założyć ponownie — „Karty” → „Skórki”.\nRanking wszystkich graczy wraca do 1000, nowy sezon startuje {next}.' });
Object.assign(TEXTS.hy, { seasonLegendSkin: '👑 <b>Սեզոն {n}-ն ավարտվեց․ դուք Լեգենդ եք։</b>\nՁեր վարկանիշը սեզոնի վերջում՝ {rating}։ Ձեր պարգևը Epic սքինն է՝ <b>«{skin}»</b>․ այն արդեն հագցված է ձեր Դոնի քարտին, և այն տեսնում են սեղանի բոլոր խաղացողները։ Հանել կամ նորից հագցնել՝ «Քարտեր» → «Սքիններ»։\nԲոլոր խաղացողների վարկանիշը վերադարձել է 1000-ի, նոր սեզոնը սկսվում է {next}-ին։' });

/* v63 emeralds and the weekly tournament (emeralds.js, tournament.js) */
Object.assign(TEXTS.ru, {
  emPaid: '💎 Изумруды зачислены: <b>+{n}</b>{bonus}. На счету — <b>{balance}</b> 💎. Тратьте на Epic-скины: «Карты» → «Скины».', emBonus: ' (из них бонус за первую покупку пака: +{b})',
  emAdmin: '💎 Ваш счёт изумрудов изменён администратором: {delta}. На счету — <b>{balance}</b> 💎.',
  adminHelpEmeralds: '/emeralds @user +500 — начислить (или −500 списать) изумруды, /emeralds @user — баланс', adminHelpTrn: '/tournament — турнир недели: статус и таблица (управление — в приложении)',
  trnMode_online: 'онлайн', trnMode_offline: 'офлайн', trnScen_classic: 'Классическая мафия', trnScen_preset: 'Ролевая мафия', trnScen_intro_first: 'Первый вечер', trnScen_intro_detective: 'Следствие', trnScen_intro_guard: 'Под охраной', trnScen_intro_trumps: 'Козыри мафии', trnScen_intro_third: 'Третья сила',
  trnOpened: '🏆 Открыта регистрация на турнир недели: игры в субботу {sat} и воскресенье {sun}. Формат сейчас: {mode}, {scen}, стол {n}, фонд {fund} 💎 — поменять можно в приложении: Турнир → панель администратора.',
  trnStart: '🏆 <b>Турнир выходных начинается!</b> Игроков: {n}, призовой фонд — {fund} 💎. Когда ведущий рассадит раунд, придёт сообщение с вашим столом. Все Epic-скины на эти два дня открыты — наденьте любой.', trnStartHost: '🎩 <b>Турнир выходных начинается!</b> Игроков: {n}. Вы записаны ведущим: когда администратор рассадит раунд, вам придёт стол с кодом.', trnStartAdmin: '🏆 Сегодня турнир: игроков {n}, ведущих {h}. Рассадить первый раунд — в приложении: Турнир → панель администратора.', trnBtn: '🏆 Турнир',
  trnSeat: '🏆 <b>Раунд {round}, стол {table}, место {seat}</b>\nВедущий: {host} · код стола {code} · {mode}.', trnNoHostYet: 'назначается', trnBench: 'Раунд {round}: мест за столами не хватило, этот раунд вы пропускаете — в следующем сядете первым.',
  trnHostTable: '🎩 <b>Раунд {round}: вы ведёте стол {table}</b> — {n} игроков, {scen}, {mode}. Код стола {code}. Откройте приложение → Турнир → «Открыть стол»: игроки уже рассажены.',
  trnPrize: '🏆 <b>Турнир недели завершён: вы на {place}-м месте из {n}</b> ({points} очков). Приз — <b>{prize}</b> 💎, уже на счету. Потратить: «Карты» → «Скины».'
});
Object.assign(TEXTS.uk, {
  emPaid: '💎 Смарагди зараховано: <b>+{n}</b>{bonus}. На рахунку — <b>{balance}</b> 💎. Витрачайте на Epic-скіни: «Карти» → «Скіни».', emBonus: ' (з них бонус за першу покупку паку: +{b})',
  emAdmin: '💎 Ваш рахунок смарагдів змінив адміністратор: {delta}. На рахунку — <b>{balance}</b> 💎.',
  trnMode_online: 'онлайн', trnMode_offline: 'офлайн', trnScen_classic: 'Класична мафія', trnScen_preset: 'Рольова мафія', trnScen_intro_first: 'Перший вечір', trnScen_intro_detective: 'Слідство', trnScen_intro_guard: 'Під охороною', trnScen_intro_trumps: 'Козирі мафії', trnScen_intro_third: 'Третя сила',
  trnStart: '🏆 <b>Турнір вихідних починається!</b> Гравців: {n}, призовий фонд — {fund} 💎. Коли ведучий розсадить раунд, прийде повідомлення з вашим столом. Усі Epic-скіни на ці два дні відкриті — вдягніть будь-який.', trnStartHost: '🎩 <b>Турнір вихідних починається!</b> Гравців: {n}. Ви записані ведучим: коли адміністратор розсадить раунд, вам прийде стіл із кодом.', trnBtn: '🏆 Турнір',
  trnSeat: '🏆 <b>Раунд {round}, стіл {table}, місце {seat}</b>\nВедучий: {host} · код столу {code} · {mode}.', trnNoHostYet: 'призначається', trnBench: 'Раунд {round}: місць за столами не вистачило, цей раунд ви пропускаєте — у наступному сядете першим.',
  trnHostTable: '🎩 <b>Раунд {round}: ви ведете стіл {table}</b> — {n} гравців, {scen}, {mode}. Код столу {code}. Відкрийте застосунок → Турнір → «Відкрити стіл»: гравці вже розсаджені.',
  trnPrize: '🏆 <b>Турнір тижня завершено: ви на {place}-му місці з {n}</b> ({points} очок). Приз — <b>{prize}</b> 💎, уже на рахунку. Витратити: «Карти» → «Скіни».'
});
Object.assign(TEXTS.en, {
  emPaid: '💎 Emeralds added: <b>+{n}</b>{bonus}. Your balance: <b>{balance}</b> 💎. Spend them on Epic skins: Cards → Skins.', emBonus: ' (including the first-purchase bonus of this pack: +{b})',
  emAdmin: '💎 An admin changed your emerald balance: {delta}. Your balance: <b>{balance}</b> 💎.',
  trnMode_online: 'online', trnMode_offline: 'offline', trnScen_classic: 'Classic mafia', trnScen_preset: 'Role-play mafia', trnScen_intro_first: 'First Evening', trnScen_intro_detective: 'Investigation', trnScen_intro_guard: 'Under Guard', trnScen_intro_trumps: 'Mafia Trumps', trnScen_intro_third: 'Third Force',
  trnStart: '🏆 <b>The weekend tournament begins!</b> Players: {n}, prize fund: {fund} 💎. When the host seats a round, you will get a message with your table. Every Epic skin is open for these two days — wear any.', trnStartHost: '🎩 <b>The weekend tournament begins!</b> Players: {n}. You are signed up as a host: when the admin seats a round, you will get a table with its code.', trnBtn: '🏆 Tournament',
  trnSeat: '🏆 <b>Round {round}, table {table}, seat {seat}</b>\nHost: {host} · table code {code} · {mode}.', trnNoHostYet: 'to be assigned', trnBench: 'Round {round}: not enough seats — you sit this round out and are seated first in the next one.',
  trnHostTable: '🎩 <b>Round {round}: you host table {table}</b> — {n} players, {scen}, {mode}. Table code {code}. Open the app → Tournament → “Open the table”: the players are already seated.',
  trnPrize: '🏆 <b>The weekly tournament is over: you finished {place} of {n}</b> ({points} points). Your prize: <b>{prize}</b> 💎, already on your balance. Spend it: Cards → Skins.'
});
Object.assign(TEXTS.pl, {
  emPaid: '💎 Szmaragdy dodane: <b>+{n}</b>{bonus}. Saldo: <b>{balance}</b> 💎. Wydaj je na skórki Epic: Karty → Skórki.', emBonus: ' (w tym bonus za pierwszy zakup tego pakietu: +{b})',
  emAdmin: '💎 Administrator zmienił Twoje saldo szmaragdów: {delta}. Saldo: <b>{balance}</b> 💎.',
  trnMode_online: 'online', trnMode_offline: 'offline', trnScen_classic: 'Mafia klasyczna', trnScen_preset: 'Mafia z rolami', trnScen_intro_first: 'Pierwszy wieczór', trnScen_intro_detective: 'Śledztwo', trnScen_intro_guard: 'Pod ochroną', trnScen_intro_trumps: 'Atuty mafii', trnScen_intro_third: 'Trzecia siła',
  trnStart: '🏆 <b>Weekendowy turniej się zaczyna!</b> Graczy: {n}, pula nagród: {fund} 💎. Gdy prowadzący rozsadzi rundę, dostaniesz wiadomość ze swoim stołem. Wszystkie skórki Epic są na te dwa dni otwarte — załóż dowolną.', trnStartHost: '🎩 <b>Weekendowy turniej się zaczyna!</b> Graczy: {n}. Jesteś zapisany jako prowadzący: gdy administrator rozsadzi rundę, dostaniesz stół z kodem.', trnBtn: '🏆 Turniej',
  trnSeat: '🏆 <b>Runda {round}, stół {table}, miejsce {seat}</b>\nProwadzący: {host} · kod stołu {code} · {mode}.', trnNoHostYet: 'w trakcie przydzielania', trnBench: 'Runda {round}: zabrakło miejsc przy stołach — tę rundę pauzujesz, w następnej siadasz pierwszy.',
  trnHostTable: '🎩 <b>Runda {round}: prowadzisz stół {table}</b> — {n} graczy, {scen}, {mode}. Kod stołu {code}. Otwórz aplikację → Turniej → „Otwórz stół”: gracze już siedzą.',
  trnPrize: '🏆 <b>Turniej tygodnia zakończony: zająłeś(-aś) {place}. miejsce z {n}</b> ({points} pkt). Nagroda: <b>{prize}</b> 💎, już na saldzie. Wydaj: Karty → Skórki.'
});
Object.assign(TEXTS.hy, {
  emPaid: '💎 Զմրուխտները հաշվեգրվել են՝ <b>+{n}</b>{bonus}։ Հաշվին՝ <b>{balance}</b> 💎։ Ծախսեք Epic սքինների վրա՝ «Քարտեր» → «Սքիններ»։', emBonus: ' (այդ թվում՝ փաթեթի առաջին գնման բոնուս՝ +{b})',
  emAdmin: '💎 Ադմինիստրատորը փոխել է ձեր զմրուխտների հաշիվը՝ {delta}։ Հաշվին՝ <b>{balance}</b> 💎։',
  trnMode_online: 'առցանց', trnMode_offline: 'օֆլայն', trnScen_classic: 'Դասական մաֆիա', trnScen_preset: 'Դերային մաֆիա', trnScen_intro_first: 'Առաջին երեկո', trnScen_intro_detective: 'Հետաքննություն', trnScen_intro_guard: 'Պահպանության տակ', trnScen_intro_trumps: 'Մաֆիայի հաղթաթղթեր', trnScen_intro_third: 'Երրորդ ուժ',
  trnStart: '🏆 <b>Հանգստյան օրերի մրցաշարը սկսվում է։</b> Խաղացողներ՝ {n}, մրցանակային ֆոնդ՝ {fund} 💎։ Երբ վարողը նստեցնի ռաունդը, կստանաք ձեր սեղանի հաղորդագրությունը։ Բոլոր Epic սքինները այս երկու օրը բաց են՝ հագցրեք ցանկացածը։', trnStartHost: '🎩 <b>Հանգստյան օրերի մրցաշարը սկսվում է։</b> Խաղացողներ՝ {n}։ Դուք գրանցված եք որպես վարող․ երբ ադմինիստրատորը նստեցնի ռաունդը, կստանաք սեղան՝ կոդով։', trnBtn: '🏆 Մրցաշար',
  trnSeat: '🏆 <b>Ռաունդ {round}, սեղան {table}, տեղ {seat}</b>\nՎարող՝ {host} · սեղանի կոդ {code} · {mode}։', trnNoHostYet: 'նշանակվում է', trnBench: 'Ռաունդ {round}․ սեղանների տեղերը չբավականացրին, այս ռաունդը բաց եք թողնում․ հաջորդում առաջինը կնստեք։',
  trnHostTable: '🎩 <b>Ռաունդ {round}․ դուք վարում եք {table} սեղանը</b>՝ {n} խաղացող, {scen}, {mode}։ Սեղանի կոդ՝ {code}։ Բացեք հավելվածը → Մրցաշար → «Բացել սեղանը»․ խաղացողներն արդեն նստած են։',
  trnPrize: '🏆 <b>Շաբաթվա մրցաշարն ավարտվեց․ դուք {place}-րդն եք {n}-ից</b> ({points} միավոր)։ Մրցանակը՝ <b>{prize}</b> 💎, արդեն հաշվին է։ Ծախսել՝ «Քարտեր» → «Սքիններ»։'
});
/* v68: an admin gives skins */
Object.assign(TEXTS.ru, { skinGift: '🎁 Администратор подарил вам скин <b>«{skin}»</b>. Если на этой карте не было скина — он уже надет. Посмотреть и сменить: «Карты» → «Скины».', skinGiftMany: '🎁 Администратор подарил вам скины: {n}. Посмотреть и надеть: «Карты» → «Скины».', adminHelpSkins: '/skin @user — скины игрока, /skin @user lilac_doctor — подарить (all — все), /skin @user -lilac_doctor — забрать подарок' });
Object.assign(TEXTS.uk, { skinGift: '🎁 Адміністратор подарував вам скін <b>«{skin}»</b>. Якщо на цій карті не було скіна — він уже вдягнений. Переглянути й змінити: «Карти» → «Скіни».', skinGiftMany: '🎁 Адміністратор подарував вам скіни: {n}. Переглянути й вдягнути: «Карти» → «Скіни».', adminHelpSkins: '/skin @user — скіни гравця, /skin @user lilac_doctor — подарувати (all — усі), /skin @user -lilac_doctor — забрати подарунок' });
Object.assign(TEXTS.en, { skinGift: '🎁 An admin gave you the skin <b>“{skin}”</b>. If that card had no skin on, it is already worn. See and change it: Cards → Skins.', skinGiftMany: '🎁 An admin gave you skins: {n}. See and wear them: Cards → Skins.', adminHelpSkins: '/skin @user — a player’s skins, /skin @user lilac_doctor — give (all — every skin), /skin @user -lilac_doctor — take a gift back' });
Object.assign(TEXTS.pl, { skinGift: '🎁 Administrator podarował Ci skórkę <b>„{skin}”</b>. Jeśli ta karta nie miała skórki, jest już założona. Zobacz i zmień: Karty → Skórki.', skinGiftMany: '🎁 Administrator podarował Ci skórki: {n}. Zobacz i załóż: Karty → Skórki.', adminHelpSkins: '/skin @user — skórki gracza, /skin @user lilac_doctor — podaruj (all — wszystkie), /skin @user -lilac_doctor — odbierz prezent' });
Object.assign(TEXTS.hy, { skinGift: '🎁 Ադմինիստրատորը ձեզ նվիրեց <b>«{skin}»</b> սքինը։ Եթե այդ քարտին սքին չկար, այն արդեն հագցված է։ Դիտել և փոխել՝ «Քարտեր» → «Սքիններ»։', skinGiftMany: '🎁 Ադմինիստրատորը ձեզ նվիրեց սքիններ՝ {n}։ Դիտել և հագցնել՝ «Քարտեր» → «Սքիններ»։', adminHelpSkins: '/skin @user — խաղացողի սքինները, /skin @user lilac_doctor — նվիրել (all — բոլորը), /skin @user -lilac_doctor — հետ վերցնել նվերը' });

/* v71: a table background as a gift */
Object.assign(TEXTS.ru, { roomGift: '🎁 Администратор подарил вам фон стола <b>«{skin}»</b>. Если фона ещё не было — он уже стоит: когда вы ведёте онлайн-игру, комнату видят все игроки за вашим столом. Сменить: «Карты» → «Скины» → «Фон стола».' });
Object.assign(TEXTS.uk, { roomGift: '🎁 Адміністратор подарував вам фон столу <b>«{skin}»</b>. Якщо фону ще не було — він уже стоїть: коли ви ведете онлайн-гру, кімнату бачать усі гравці за вашим столом. Змінити: «Карти» → «Скіни» → «Фон столу».' });
Object.assign(TEXTS.en, { roomGift: '🎁 An admin gave you the table background <b>«{skin}»</b>. If you had none, it is already up: when you host an online game, every player at your table sees the room. Change it: «Cards» → «Skins» → «Table background».' });
Object.assign(TEXTS.pl, { roomGift: '🎁 Administrator podarował Ci tło stołu <b>„{skin}”</b>. Jeśli nie miałeś tła — już stoi: gdy prowadzisz grę online, pokój widzą wszyscy gracze przy Twoim stole. Zmień: «Karty» → «Skórki» → «Tło stołu».' });
Object.assign(TEXTS.hy, { roomGift: '🎁 Ադմինիստրատորը ձեզ նվիրեց սեղանի ֆոն՝ <b>«{skin}»</b>։ Եթե ֆոն չունեիք, այն արդեն դրված է․ երբ վարում եք առցանց խաղ, սենյակը տեսնում են ձեր սեղանի բոլոր խաղացողները։ Փոխել՝ «Քարտեր» → «Սքիններ» → «Սեղանի ֆոն»։' });
