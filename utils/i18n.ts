export const locales = ['ru', 'en'] as const;

export type Locale = (typeof locales)[number];

export type LocalizedText = Record<Locale, string>;

export const defaultLocale: Locale = 'ru';
export const LOCALE_COOKIE = 'streetraceing_locale';

export function text(ru: string, en: string): LocalizedText {
  return { ru, en };
}

export function getLocale(value: string | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export function getRequestLocale(request: Request): Locale {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const localeCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${LOCALE_COOKIE}=`));

  return localeCookie
    ? getLocale(localeCookie.slice(LOCALE_COOKIE.length + 1))
    : getLocaleFromAcceptLanguage(request.headers.get('accept-language'));
}

export function getLocaleFromAcceptLanguage(
  acceptLanguage: string | null,
): Locale {
  const preferredLocale = acceptLanguage
    ?.split(',')
    .map((item) => item.split(';')[0]?.trim().toLowerCase())
    .find(
      (locale) =>
        locale === 'ru' ||
        locale?.startsWith('ru-') ||
        locale === 'en' ||
        locale?.startsWith('en-'),
    );

  if (preferredLocale === 'ru' || preferredLocale?.startsWith('ru-')) {
    return 'ru';
  }

  if (preferredLocale === 'en' || preferredLocale?.startsWith('en-')) {
    return 'en';
  }

  return defaultLocale;
}

export function getText(value: LocalizedText, locale: Locale) {
  return value[locale];
}

export function getLocaleTag(locale: Locale) {
  return locale === 'ru' ? 'ru-RU' : 'en-US';
}

export const translations = {
  ru: {
    language: {
      label: 'Язык',
      ru: 'RU',
      en: 'EN',
      russian: 'Русский',
      english: 'Английский',
    },
    theme: {
      label: 'Тема сайта',
      system: 'Система',
      light: 'Светлая',
      dark: 'Тёмная',
      unknown: 'Неизвестно',
      themeSuffix: 'тема',
    },
    header: {
      navigation: 'Навигация',
      logoAlt: 'Логотип streetraceing',
    },
    home: {
      intro: 'Ээ даже хз что сюда писать и размещать но похъ',
      bioTitle: 'Вот моя биография йоу',
      bio: [
        'Зовут Андрей, 18 лет, люблю программирование, дизайн и лигу легенд. В основном играю в игры и учусь в университете, немного увлекаюсь рисованием .-.',
        'Программировать начал с лет 10, создавая дискорд ботов с discordjs, а после уже и пошли программы с tauri, вебсайты, бэкенды и тд. Я себя идентифицирую как фуллстак :)',
        'Умею работать с git, docker, бдшками, линуском (ну так по мелочи). Из языков я знаю javascript + typescript, java, учу c#, влюблен в rust (кек).',
        'В последнее время увлекаюсь иишками и работой с ними.',
      ],
      projectsTitle: 'А вот мои проекты ({count}) кста',
      toolsTitle: 'Инструменты ({count}) чиста для удобства',
      projectsSearchLabel: 'Поиск по проектам',
      projectsSearchPlaceholder: 'Название, стек, статус…',
      projectsFilters: 'Фильтр проектов по статусу',
      noProjects: 'По этим условиям проектов пока не нашлось.',
      toolsSearchLabel: 'Поиск по инструментам',
      toolsSearchPlaceholder: 'Название, тег или описание…',
      toolsFilters: 'Фильтр инструментов по тегу',
      noTools: 'По этим условиям инструментов пока не нашлось.',
      all: 'Все',
      clearFilters: 'Сбросить фильтры',
      clearSort: 'Сбросить сортировку',
      projectsSort: 'Сортировка проектов',
      toolsSort: 'Сортировка инструментов',
      sortRelevance: 'По релевантности',
      sortProgress: 'Сначала с большим прогрессом',
      sortName: 'По названию (А–Я)',
    },
    footer: {
      slogan: 'life is good ❤️',
    },
    project: {
      openDetails: 'Открыть подробности',
      allProjects: 'Ко всем проектам',
      projectPage: 'Страница проекта',
      noPublicLinks: 'Публичных ссылок пока нет.',
      readiness: 'Готовность',
      stack: 'Стек',
      highlights: 'Что умеет',
      screenshots: 'Скриншоты',
      devLog: 'Dev log',
      status: {
        'in-development': 'В разработке',
        released: 'Готов',
        private: 'Приватный',
        'closed-source': 'Закрытый код',
        'open-source': 'Open source',
        maintained: 'Поддерживается',
        archived: 'В архиве',
        paused: 'На паузе',
        planned: 'Запланирован',
        beta: 'Бета',
      },
    },
    tool: {
      available: 'Доступен',
      planned: 'Скоро',
      allTools: 'Ко всем инструментам',
      output: 'Результат',
      copyOutput: 'Скопировать результат',
    },
    tinyUrl: {
      title: 'Tiny URL и другие данные',
      description:
        'Сохрани текст, ссылку, JSON или любые другие данные — получишь короткий адрес на этом домене.',
      sharedLinkTitle: 'Ссылка',
      sharedDataTitle: 'Сохранённые данные',
      sharedLinkDescription:
        'Перейди по адресу, который сохранён за этим коротким кодом.',
      sharedDataDescription:
        'Эта ссылка открывает сохранённые данные без перенаправления.',
      openLink: 'Перейти по ссылке',
      emptyData: 'Пустые данные',
      loadFailed: 'Не удалось загрузить сохранённые данные.',
      saveFailed: 'Не удалось сохранить данные.',
      invalidServerResponse: 'Сервер вернул некорректный ответ.',
      copyFailed: 'Не удалось скопировать ссылку.',
      required: 'Добавь данные, которые нужно сохранить.',
      maxLength: 'Максимум {count} символов.',
      fieldLabel: 'Что сохранить?',
      fieldPlaceholder: 'Любой текст, URL, JSON, заметка, код…',
      characters: 'символов',
      saving: 'Сохраняю…',
      create: 'Создать короткий адрес',
      errorTitle: 'Что-то пошло не так',
      saved: 'Данные сохранены',
      copied: 'Скопировано',
      copy: 'Копировать',
      yourData: 'Твои сохранённые данные',
      ownerDescription:
        'Этот список привязан к ключу в cookie текущего браузера.',
      emptyList:
        'Пока ничего нет — первая запись появится здесь после сохранения.',
      visits: 'Переходов: {count}',
      copyShortUrl: 'Скопировать короткий адрес',
    },
    stats: {
      title: 'Статистика и новости',
      description:
        'Направления, в которых сейчас больше всего практики, и заметки о разработке.',
      authorNotConfigured: 'Авторский режим пока не настроен',
      loginAsAuthor: 'Войти как автор',
      authorPassword: 'Пароль автора',
      enterPassword: 'Введи пароль.',
      login: 'Войти',
      loginFailed: 'Вход не выполнен',
      newNote: 'Новая заметка',
      authorFormDescription: 'Эта форма видна только в авторской сессии.',
      logout: 'Выйти из авторского режима',
      noteTitle: 'Заголовок (необязательно)',
      noteTitlePlaceholder: 'Например, новый этап проекта',
      topic: 'Тема',
      note: 'Заметка',
      noteRequired: 'Напишите хотя бы одну строчку.',
      notePlaceholder: 'Что нового в разработке?',
      markdownHint:
        'Markdown поддерживается: **жирный**, _курсив_, списки и ссылки. Блок кода: ```ts … ```.',
      preview: 'Предпросмотр Markdown',
      hidePreview: 'Скрыть предпросмотр',
      previewTitle: 'Предпросмотр',
      previewEmpty: 'Напиши заметку, чтобы увидеть результат.',
      publish: 'Опубликовать',
      noteNotPublished: 'Заметка не опубликована',
      edit: 'Редактировать заметку',
      delete: 'Удалить заметку',
      save: 'Сохранить изменения',
      cancel: 'Отмена',
      editNote: 'Редактирование заметки',
      deleteNote: 'Удалить заметку?',
      deleteNoteDescription:
        'Запись будет удалена без возможности восстановления.',
      noteNotUpdated: 'Заметка не обновлена',
      updatesTitle: 'Наработки и новости',
      updatesDescription: 'Короткие заметки по проектам, AI, обучению и сайту.',
      total: 'Всего: {count}',
      updatesFilter: 'Фильтр новостей',
      all: 'Все',
      clearFilters: 'Сбросить фильтры',
      clearSort: 'Сбросить сортировку',
      sort: 'Сортировка новостей',
      sortNewest: 'Сначала новые',
      sortOldest: 'Сначала старые',
      updatesLoadFailed: 'Новости не загрузились',
      noUpdates:
        'Здесь появятся первые заметки после публикации в авторском режиме.',
      refreshing: 'Обновляю ленту…',
      page: 'Страница {page} из {total}',
      previous: 'Назад',
      next: 'Далее',
      showFull: 'Показать полностью',
      errors: {
        login: 'Не удалось войти.',
        session: 'Не удалось проверить авторскую сессию.',
        publish: 'Не удалось опубликовать заметку.',
        publishMissing: 'Сервер не вернул опубликованную заметку.',
        update: 'Не удалось обновить заметку.',
        delete: 'Не удалось удалить заметку.',
        updates: 'Не удалось загрузить новости.',
      },
    },
    tools: {
      base64: {
        invalid: 'Это не похоже на корректный Base64.',
        encodeFailed: 'Не удалось закодировать текст.',
        required: 'Вставь текст или Base64-строку.',
        label: 'Текст или Base64',
        placeholder: 'Например: Привет, мир!',
        description: 'Кодирование UTF-8 выполняется локально в браузере.',
        encode: 'В Base64',
        decode: 'Из Base64',
        example: 'Пример',
        errorTitle: 'Не получилось обработать значение',
        output: 'Результат Base64',
      },
      json: {
        invalid: 'Не удалось прочитать JSON: {message}',
        invalidGeneric: 'Не удалось прочитать JSON.',
        required: 'Вставь JSON, который нужно проверить.',
        label: 'JSON',
        placeholder: 'Вставь JSON сюда…',
        description: 'Данные обрабатываются только в этом браузере.',
        format: 'Форматировать',
        minify: 'Минифицировать',
        example: 'Пример',
        errorTitle: 'Некорректный JSON',
        output: 'Готовый JSON',
      },
      text: {
        label: 'Текст',
        placeholder: 'Вставь или напиши текст…',
        description: 'Результат появится ниже, исходный текст не изменится.',
        characters: 'Символов: {count}',
        words: 'Слов: {count}',
        lines: 'Строк: {count}',
        uppercase: 'В верхний регистр',
        lowercase: 'В нижний регистр',
        trimLines: 'Очистить пробелы',
        removeEmptyLines: 'Убрать пустые строки',
        uniqueLines: 'Уникальные строки',
      },
      uuid: {
        invalid: 'Укажи целое число от 1 до {count}.',
        label: 'Сколько UUID создать?',
        description: 'От 1 до {count} UUID v4 за один раз.',
        generate: 'Сгенерировать',
        errorTitle: 'Проверь количество',
        generateMore: 'Сгенерировать ещё',
      },
    },
    notFound: 'Не найдено',
    avatar: {
      title: 'Аватарка аккуратно взята из одной песни',
      description: 'Вот ссылочка на неё в Spotify',
    },
    api: {
      auth: {
        invalidRequest: 'Некорректный запрос.',
        notConfigured: 'Авторизация пока не настроена.',
        invalidPassword: 'Неверный пароль.',
        sessionCreation: 'Не удалось создать сессию.',
        required: 'Требуется авторизация.',
      },
      devNotes: {
        invalid: 'Проверь текст заметки и выбранную тему.',
        titleTooLong: 'Заголовок не должен быть длиннее 160 символов.',
        notFound: 'Заметку не удалось найти.',
      },
      tinyUrl: {
        loadFailed: 'Не удалось загрузить сохранённые данные.',
        invalidJson: 'Передай данные в JSON-формате.',
        contentTooLong: 'Добавь непустые данные объёмом до {count} символов.',
        databaseMissing: 'База данных не настроена. Проверь DATABASE_URL.',
        saveFailed: 'Не удалось сохранить данные. Попробуй ещё раз.',
        codeGenerationFailed:
          'Не удалось подобрать короткий адрес. Попробуй ещё раз.',
      },
    },
  },
  en: {
    language: {
      label: 'Language',
      ru: 'RU',
      en: 'EN',
      russian: 'Russian',
      english: 'English',
    },
    theme: {
      label: 'Site theme',
      system: 'System',
      light: 'Light',
      dark: 'Dark',
      unknown: 'Unknown',
      themeSuffix: 'theme',
    },
    header: {
      navigation: 'Navigation',
      logoAlt: 'streetraceing logo',
    },
    home: {
      intro: 'Honestly, I am not even sure what to put here yet, but whatever.',
      bioTitle: 'A bit about me',
      bio: [
        'My name is Andrey, I am 18, and I love programming, design, and League of Legends. I mostly play games, study at university, and draw a little now and then .-.',
        'I started programming around age 10 by building Discord bots with discord.js. Later came Tauri apps, websites, backends, and more. I identify as a full-stack developer :)',
        'I can work with Git, Docker, databases, and Linux (the basics). I know JavaScript and TypeScript, Java, I am learning C#, and I am in love with Rust (lol).',
        'Recently, I have also been getting deeply into AI and working with it.',
      ],
      projectsTitle: 'My projects ({count})',
      toolsTitle: 'Tools ({count}) for convenience',
      projectsSearchLabel: 'Search projects',
      projectsSearchPlaceholder: 'Name, stack, or status…',
      projectsFilters: 'Filter projects by status',
      noProjects: 'No projects match these filters yet.',
      toolsSearchLabel: 'Search tools',
      toolsSearchPlaceholder: 'Name, tag, or description…',
      toolsFilters: 'Filter tools by tag',
      noTools: 'No tools match these filters yet.',
      all: 'All',
      clearFilters: 'Clear filters',
      clearSort: 'Reset ordering',
      projectsSort: 'Project order',
      toolsSort: 'Tool order',
      sortRelevance: 'By relevance',
      sortProgress: 'Highest progress first',
      sortName: 'By name (A–Z)',
    },
    footer: {
      slogan: 'life is good ❤️',
    },
    project: {
      openDetails: 'Open details',
      allProjects: 'All projects',
      projectPage: 'Project page',
      noPublicLinks: 'No public links yet.',
      readiness: 'Progress',
      stack: 'Stack',
      highlights: 'Highlights',
      screenshots: 'Screenshots',
      devLog: 'Dev log',
      status: {
        'in-development': 'In development',
        released: 'Released',
        private: 'Private',
        'closed-source': 'Closed source',
        'open-source': 'Open source',
        maintained: 'Maintained',
        archived: 'Archived',
        paused: 'Paused',
        planned: 'Planned',
        beta: 'Beta',
      },
    },
    tool: {
      available: 'Available',
      planned: 'Coming soon',
      allTools: 'All tools',
      output: 'Result',
      copyOutput: 'Copy result',
    },
    tinyUrl: {
      title: 'Tiny URL and other data',
      description:
        'Save text, a link, JSON, or any other data and get a short address on this domain.',
      sharedLinkTitle: 'Link',
      sharedDataTitle: 'Saved data',
      sharedLinkDescription: 'Open the address stored behind this short code.',
      sharedDataDescription:
        'This link opens saved data without redirecting anywhere.',
      openLink: 'Open link',
      emptyData: 'Empty data',
      loadFailed: 'Could not load saved data.',
      saveFailed: 'Could not save data.',
      invalidServerResponse: 'The server returned an invalid response.',
      copyFailed: 'Could not copy the link.',
      required: 'Add data to save.',
      maxLength: 'Maximum {count} characters.',
      fieldLabel: 'What should be saved?',
      fieldPlaceholder: 'Any text, URL, JSON, note, code…',
      characters: 'characters',
      saving: 'Saving…',
      create: 'Create short address',
      errorTitle: 'Something went wrong',
      saved: 'Data saved',
      copied: 'Copied',
      copy: 'Copy',
      yourData: 'Your saved data',
      ownerDescription:
        'This list is tied to the cookie key in the current browser.',
      emptyList: 'Nothing here yet — your first saved item will appear here.',
      visits: 'Visits: {count}',
      copyShortUrl: 'Copy short address',
    },
    stats: {
      title: 'Stats and news',
      description:
        'The areas I am practicing most right now and short development notes.',
      authorNotConfigured: 'Author mode is not configured yet',
      loginAsAuthor: 'Sign in as author',
      authorPassword: 'Author password',
      enterPassword: 'Enter a password.',
      login: 'Sign in',
      loginFailed: 'Sign-in failed',
      newNote: 'New note',
      authorFormDescription: 'This form is visible only in an author session.',
      logout: 'Sign out of author mode',
      noteTitle: 'Title (optional)',
      noteTitlePlaceholder: 'For example, a new project milestone',
      topic: 'Topic',
      note: 'Note',
      noteRequired: 'Write at least one line.',
      notePlaceholder: 'What is new in development?',
      markdownHint:
        'Markdown is supported: **bold**, _italic_, lists, and links. Code block: ```ts … ```.',
      preview: 'Preview Markdown',
      hidePreview: 'Hide preview',
      previewTitle: 'Preview',
      previewEmpty: 'Write a note to see the result.',
      publish: 'Publish',
      noteNotPublished: 'Note was not published',
      edit: 'Edit note',
      delete: 'Delete note',
      save: 'Save changes',
      cancel: 'Cancel',
      editNote: 'Edit note',
      deleteNote: 'Delete this note?',
      deleteNoteDescription:
        'This entry will be permanently deleted and cannot be restored.',
      noteNotUpdated: 'Note was not updated',
      updatesTitle: 'Work in progress and news',
      updatesDescription:
        'Short notes about projects, AI, learning, and the site.',
      total: 'Total: {count}',
      updatesFilter: 'News filter',
      all: 'All',
      clearFilters: 'Clear filters',
      clearSort: 'Reset ordering',
      sort: 'News order',
      sortNewest: 'Newest first',
      sortOldest: 'Oldest first',
      updatesLoadFailed: 'Could not load news',
      noUpdates:
        'The first notes will appear here after an author publishes one.',
      refreshing: 'Refreshing feed…',
      page: 'Page {page} of {total}',
      previous: 'Previous',
      next: 'Next',
      showFull: 'Show full post',
      errors: {
        login: 'Could not sign in.',
        session: 'Could not check the author session.',
        publish: 'Could not publish the note.',
        publishMissing: 'The server did not return the published note.',
        update: 'Could not update the note.',
        delete: 'Could not delete the note.',
        updates: 'Could not load news.',
      },
    },
    tools: {
      base64: {
        invalid: 'This does not look like valid Base64.',
        encodeFailed: 'Could not encode the text.',
        required: 'Paste text or a Base64 string.',
        label: 'Text or Base64',
        placeholder: 'For example: Hello, world!',
        description: 'UTF-8 encoding happens locally in your browser.',
        encode: 'To Base64',
        decode: 'From Base64',
        example: 'Example',
        errorTitle: 'Could not process the value',
        output: 'Base64 result',
      },
      json: {
        invalid: 'Could not read JSON: {message}',
        invalidGeneric: 'Could not read JSON.',
        required: 'Paste JSON to validate.',
        label: 'JSON',
        placeholder: 'Paste JSON here…',
        description: 'Data is processed only in this browser.',
        format: 'Format',
        minify: 'Minify',
        example: 'Example',
        errorTitle: 'Invalid JSON',
        output: 'Formatted JSON',
      },
      text: {
        label: 'Text',
        placeholder: 'Paste or write text…',
        description:
          'The result appears below; the original text stays unchanged.',
        characters: 'Characters: {count}',
        words: 'Words: {count}',
        lines: 'Lines: {count}',
        uppercase: 'Uppercase',
        lowercase: 'Lowercase',
        trimLines: 'Trim whitespace',
        removeEmptyLines: 'Remove empty lines',
        uniqueLines: 'Unique lines',
      },
      uuid: {
        invalid: 'Enter a whole number from 1 to {count}.',
        label: 'How many UUIDs?',
        description: 'From 1 to {count} UUID v4 values at a time.',
        generate: 'Generate',
        errorTitle: 'Check the amount',
        generateMore: 'Generate more',
      },
    },
    notFound: 'Not found',
    avatar: {
      title: 'The avatar is neatly borrowed from a song',
      description: 'Here is the Spotify link to it',
    },
    api: {
      auth: {
        invalidRequest: 'Invalid request.',
        notConfigured: 'Author mode is not configured yet.',
        invalidPassword: 'Invalid password.',
        sessionCreation: 'Could not create a session.',
        required: 'Authorization is required.',
      },
      devNotes: {
        invalid: 'Check the note text and selected topic.',
        titleTooLong: 'The title must be 160 characters or fewer.',
        notFound: 'The note could not be found.',
      },
      tinyUrl: {
        loadFailed: 'Could not load saved data.',
        invalidJson: 'Send data in JSON format.',
        contentTooLong: 'Add non-empty data up to {count} characters.',
        databaseMissing: 'The database is not configured. Check DATABASE_URL.',
        saveFailed: 'Could not save data. Try again.',
        codeGenerationFailed: 'Could not generate a short address. Try again.',
      },
    },
  },
} as const;

export type Translation = (typeof translations)[Locale];
