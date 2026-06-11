import * as XLSX from 'xlsx';
import type { TrackingEvent, TrackingPlan } from './types';

const HEADERS = [
  'Версия',
  'Операционная система',
  'Application_id',
  'event_category',
  'event_label',
  'event_name',
  'Триггер',
  'dimension_N',
  'Название атрибута из кода',
  'Название атрибута для Альфа-Метрики',
  'Описание значений',
  'Примеры значений',
  'Строгий перечень значений',
  'device_screen_name',
  'Действие',
  'Объект',
  'Описание объекта',
  'Приложение',
  'Категория => Функционал',
  'Ключ команды',
  'Ссылка на фиче-портал',
];

// ── Dictionary data ───────────────────────────────────────────────────────────

const DICT_APPLICATION_IDS = [
  'alfa_digital', 'alfa_id_ui', 'alfa_pay_ecom', 'alfa_pay_ecom_mobile', 'alfa-ipatool',
  'alfa-metric-processor', 'alfabio', 'alfaform-dc-prod', 'alfaui_web', 'am_digital_profile',
  'am_social_treasury', 'anketa', 'anketa_ekk_pil_pim_refin', 'anketa_pil_pim_refin', 'AP_mobile',
  'apologetic_gifts_ui', 'assr-salaryprojectrb', 'assr-salaryprojectrb_dev',
  'assr-salaryprojectrb_test', 'bdui-metric-processor', 'bnpl-integration-api',
  'broker_account_site', 'burning_payment', 'card-activation-multistep-am',
  'card-activation-multistep-newclick', 'card-overlimit-multistep-api',
  'card-update-pin-multistep-am', 'card-update-pin-multistep-newclick', 'channels-api', 'claim-api',
  'client_profile_agreements', 'content-library-prod', 'content-library-test', 'corp_albo',
  'credit_tariff_ui', 'credit-account-screen', 'daily-pay-multistep-api',
  'debit_card_self_order_am', 'debit_card_self_order_ao', 'debts-collection-multistep-api',
  'debts-collection-view-api', 'dev_passport', 'dfa_investor_fl_ui', 'dfa_investor_fl_ui_prelive',
  'dfa-investor-fl-ui', 'fraud-management-ui', 'fraud-report', 'game_coin_app', 'geps_am',
  'geps_ao', 'gh_exp', 'hot-notification-aggregation-api',
  'individual-salary-customer-multistep-api', 'intra-shared-metrics', 'lead_gen_ekk', 'lkiz',
  'marketplace', 'mfo_cash_loan', 'MLM', 'mob_vehicle', 'mobile', 'mobile-balance-transfer',
  'money-request-ui', 'mortgage_autopay', 'mortgage_widget', 'MVNO_Personal_Account',
  'MVNO_Personal_Account_AO', 'MVNO_registration', 'newclick_account_ui', 'newclick_analytics_ui',
  'newclick_appointment_ui', 'newclick_bdui_entrypoints_ui', 'newclick_card_self_order_ui',
  'newclick_card_ui', 'newclick_cash_loan_ui', 'newclick_chats_ui', 'newclick_credit_ui',
  'newclick_daily_pay_ui', 'newclick_dashboard_ui', 'newclick_debit_card_order_ui',
  'newclick_deeplink_ui', 'newclick_deposit_ui', 'newclick_digital_profile_ui',
  'newclick_escrow_amsign_ui', 'newclick_family_bank_widgets_ui', 'newclick_gamification_ui',
  'newclick_gas_stations_ui', 'newclick_global_search_ui', 'newclick_host_ui',
  'newclick_host_ui_e2e', 'newclick_host_ui_int', 'newclick_host_widgets_ui',
  'newclick_installments_ui', 'newclick_insurance_ui', 'newclick_investments_ui',
  'newclick_invoice_ui', 'newclick_marketplace_ui', 'newclick_mfo_bil_ui',
  'newclick_multistep_ui', 'newclick_open_account_ui', 'newclick_operations_history_ui',
  'newclick_p2p_money_request_ui', 'newclick_partner_offers_ui', 'newclick_payment_details_ui',
  'newclick_payments_ui', 'newclick_pension_transfer_ui', 'newclick_piggy_bank_ui',
  'newclick_precious_metals_ui', 'newclick_privilege_ui', 'newclick_profit_ui',
  'newclick_references_ui', 'newclick_referral_ui', 'newclick_secondary_combo_ui',
  'newclick_secondary_combo_ui_int', 'newclick_selfemployed_ui', 'newclick_server_driven_ui',
  'newclick_social_treasury_ui', 'newclick_stub_ui', 'newclick_template_ui',
  'newclick_transfers_ui', 'newclick_travel_insurance_ui', 'newclick_travel_insurance_ui_int',
  'newclick_travel_webview_ui', 'newclick_unapproved_operations_ui', 'newclick_user_profile_ui',
  'newclick-account-ui', 'newclick-balance-transfer', 'newclick-child-calculator-ui',
  'newclick-dashboard-ui', 'newclick-geo-map-ui', 'newclick-references-ui',
  'newclick-upsale-cards-ui', 'newclick-user-profile-ui', 'newclick-web-app-landing-ui',
  'NFS', 'NFS-production', 'nib-prosalary-metrics', 'OrangeLoyalty_am', 'OrangeLoyalty_ao',
  'partners-platform-uds', 'passport_metrics', 'Payments_template_ao', 'Payments_template_mobile',
  'phone_confirmation_deduplication', 'redirect_ui', 'reland', 'relend', 'retail_autoloan_ui',
  'retail_car_secured_loan_ui', 'retail_credit_cards_insurance_sale', 'retail_debit_card_order',
  'retail_digital_wealth_management_main_ui', 'retail_izk', 'retail_izk_int', 'retail_mfo_loan',
  'retail_offline', 'retail_ona_ao_ui_pro', 'retail_ona_client_ao_ui_pro',
  'retail_ona_client_signing_ui_int', 'retail_ona_client_signing_ui_pre',
  'retail_ona_client_signing_ui_pro', 'retail_ona_inetacq', 'retail_ona_pro',
  'retail_ona_tradeacq', 'retail_signdailypay', 'retail_signdailypay_int',
  'retail_upsale_cards', 'retail_upsale_cards_int', 'retail_upsale_credit_holidays_ui',
  'retail_upsale_documents_upload_ui', 'retail_upsale_documents_upload_ui_int',
  'retail_upsale_ui', 'retail_upsale_ui_int', 'retail_upsale_verification',
  'retail_upsale_verification_int', 'retail-alfa-check-settings-mobile-ui',
  'retail-auto-leads', 'retail-auto-leads-prod', 'retail-capc-cards-pin-change-mobile-ui',
  'retail-capc-pin-change-ui', 'retail-cards-detail-info-mobile-ui', 'retail-cards-detail-info-ui',
  'retail-cards-info-admin-ui', 'retail-credit-repayment-mobile-ui', 'retail-credit-repayment-ui',
  'retail-marketplace', 'retail-money-box-mobile-ui', 'retail-money-box-ui',
  'retail-shared-metrics', 'retail-taxes-ui', 'retail-upsale-consent-ui',
  'retail-upsale-relend', 'retail-upsale-relend-int', 'SBP_settings_multistep', 'selfie',
  'site', 'x5card', 'x5-web-ui',
];

const DICT_ACTIONS = [
  'Принятие', 'Действие', 'Активация', 'Добавление', 'Приложение', 'Применение', 'Автовыбор',
  'Назад', 'Фоновый режим', 'Расчёт', 'Отмена', 'Изменение', 'Смена вкладки', 'Проверка',
  'Отбор', 'Выбор', 'Выбор вкладки деталей', 'Очистка', 'Клик', 'Закрытие', 'Подтверждение',
  'Согласие', 'Кнопка продолжения', 'Продолжение процесса', 'Управление', 'Копирование',
  'Создание', 'Генерация', 'Удаление', 'Передача', 'Направление', 'Отключение', 'Завершено',
  'Перетаскивание', 'Рестарт', 'Изменение', 'Ввод', 'Ошибка', 'Событие', 'Раскрытие',
  'Неудача', 'Сбой', 'Изменение поля', 'Завершение', 'Завершение процесса', 'Фокус',
  'Свертывание', 'Передний план', 'Получение', 'Получение ошибки', 'Получение события',
  'Сокрытие', 'Скрытие', 'Идентификация', 'Показ', 'Инициализация', 'Интервью', 'Проблема',
  'Запуск', 'Загрузка', 'Загрузка вложения', 'Логирование', 'Логин', 'Длительный клик',
  'Длительное нажатие', 'Сообщение', 'Минус', 'Мониторинг', 'Перемещение', 'Навигация',
  'Переход', 'Открытие', 'Открытие активности', 'Открытие модального окна', 'Открытие экрана',
  'Операция', 'Выбор операции', 'Заказ', 'Другое', 'Просмотр страницы', 'Стрелка периода',
  'Дата периода', 'Плюс', 'Предзаполнение', 'Прескоринг', 'Выдача', 'Предоставление',
  'Прочтение', 'Извлечение', 'Обновление', 'Отклонение', 'Отрисовка страницы', 'Повторение',
  'Запрос', 'Повторная отправка', 'Сброс', 'Решение', 'Ответ', 'Результат', 'Маршрут',
  'Сохранение', 'Сканирование', 'Экран', 'Закрытие', 'Отображение', 'Переключатель', 'Просмотр',
  'Прокрутка', 'Поиск', 'Выбор', 'Отправка', 'Начало сессии', 'Установка', 'Шаринг',
  'Демонстрация', 'Подпись', 'Вход', 'Выход', 'Ползунок', 'Сортировка', 'Источник', 'Старт',
  'Запуск процесса', 'Подача', 'Успех', 'Успех платежа', 'Свайп', 'Свайп влево', 'Свайп вправо',
  'Переключение', 'Системное событие', 'Тап', 'Цель', 'Промежуток времени', 'Попытка',
  'Разворачивание', 'Разгруппировка', 'Обновление', 'Просмотр', 'Показатели веба', 'Предзаполнение',
];

const DICT_OBJECTS = [
  'Авторизация', 'Адрес', 'Аккаунт', 'Актив', 'Активация', 'Акция', 'Алерт', 'Анимация',
  'Анкета', 'Аутентификация', 'Баббл', 'Баланс', 'Баннер', 'Белый список', 'Блок', 'Ботомшит',
  'Буллеты', 'Валидация', 'Валюта', 'Ввод', 'Видео', 'Виджет', 'Витрина', 'Вкладка', 'Время',
  'Вход', 'Выбор', 'Выполнение', 'Выпуск', 'ВЭД', 'Галочка', 'Генерация', 'Гиперссылка',
  'Главный экран', 'Глазик', 'Данные', 'Дашборд', 'Действие', 'Депозиты', 'Диалог', 'Диплинк',
  'Договор', 'Документ', 'Дропдаун', 'Заглушка', 'Заголовок', 'Загрузка', 'Заказ', 'Запись',
  'Запрос', 'Зарплатная ведомость', 'Заявка', 'Заявление', 'Звездочка', 'Значение', 'Значок',
  'Идея', 'Иконка', 'Инструмент', 'Информация', 'История', 'Канал', 'Карандаш', 'Карта',
  'Картинка', 'Карточка', 'Карусель', 'Категория', 'Кнопка', 'Код', 'Колокольчик', 'Колонка',
  'Комиссия', 'Компас', 'Крестик', 'Кружок', 'Куки', 'Лендинг', 'Листалка', 'Логаут',
  'Логотип', 'Лонгрид', 'Меню', 'Модалка', 'Модальное окно', 'Модуль', 'Настройка', 'Номер',
  'Нотификация', 'Область', 'Обращение', 'Объект', 'Окно', 'Операция', 'Оплата', 'Оповещение',
  'Ответ', 'Отделение', 'Отзыв', 'Отмена', 'Отчёт', 'Ошибка', 'Пароль', 'Паспорт', 'ПДФ',
  'Переключатель', 'Пикер', 'Пиктограмма', 'Пилюля', 'Пин', 'Платеж', 'Плашка', 'Плитка',
  'Подсказка', 'Поиск', 'Поисковая строка', 'Поле', 'Пользователь', 'Попап', 'Поручение',
  'Предложение', 'Приложение', 'Проверка', 'Программы', 'Продукт', 'Профиль', 'Процесс',
  'Пункт', 'Раздел', 'Разлогин', 'Расчет', 'Регистрация', 'Редирект', 'Реестры платежей',
  'Режим', 'Результат', 'Реквизиты', 'Решение', 'Риски', 'Рубильник', 'Саджест', 'Сайд-панель',
  'Сайдбар', 'Сброс', 'Своп', 'Сделка', 'Сервер', 'Слайдер', 'Слой', 'СМС', 'Событие',
  'Согласие', 'Сообщение', 'Список', 'Справка', 'Ссылка', 'Статус', 'Статья', 'Столбец',
  'Столбик', 'Страница', 'Стрелка', 'Стрелочка', 'Строка', 'Сумма', 'Счет', 'Таб', 'Таблица',
  'Тариф', 'Тег', 'Текст', 'Тематика', 'Тест', 'Тип счета', 'Тогл', 'Точка входа', 'Транзакция',
  'Тренер', 'Троеточие', 'Тулбар', 'Тултип', 'Тумблер', 'Уведомление', 'Услуга', 'Установка',
  'Файл', 'Фильтр', 'Форма', 'Чекбокс', 'Черновик', 'Чипс', 'Шапка', 'Шеврон', 'Шторка',
  'Экран', 'Экшен', 'Элемент', 'Ячейка', 'API', 'Email', 'QR',
];

const DICT_APPS = [
  'Alfa ID', 'X5 Карта', 'Альфа-Агент', 'Альфа-Мобайл', 'Альфа-Онлайн', 'Альфа-Сайт и Анкеты',
];

const DICT_CATEGORIES = [
  'Кэшбек и лояльность => Кэшбэк',
  'Главный экран => Главный экран',
  'Главный экран => Карусель',
  'Платежи и переводы => Платежи - Общее',
  'Карты => Детали дебетовой карты',
  'Инвестиции => Витрина',
  'Профиль => Данные',
];

const DICT_PLATFORMS = ['ios', 'android', 'web', 'all', 'ios/android'];

// ── Main sheet helpers ────────────────────────────────────────────────────────

function eventToRows(event: TrackingEvent): string[][] {
  const baseRow = [
    event.version,
    event.os,
    event.application_id,
    event.event_category,
    event.event_label,
    event.event_name,
    event.trigger,
    '',
    '',
    '',
    '',
    '',
    '',
    event.device_screen_name,
    event.action,
    event.object,
    event.object_description,
    event.app,
    event.category_functional,
    event.team_key,
    event.feature_portal_link,
  ];

  if (!event.dimensions || event.dimensions.length === 0) {
    return [baseRow];
  }

  const rows: string[][] = [];
  event.dimensions.forEach((dim, idx) => {
    const dimCols = [
      String(dim.dimension_n),
      dim.code_name,
      dim.alfa_metric_name,
      dim.description,
      dim.value_examples,
      dim.strict_values,
    ];

    if (idx === 0) {
      const row = [...baseRow];
      row[7] = dimCols[0];
      row[8] = dimCols[1];
      row[9] = dimCols[2];
      row[10] = dimCols[3];
      row[11] = dimCols[4];
      row[12] = dimCols[5];
      rows.push(row);
    } else {
      const row = ['', '', '', '', '', '', '', ...dimCols, '', '', '', '', '', '', '', ''];
      rows.push(row);
    }
  });

  return rows;
}

// Columns that belong to the event (not to a specific dimension) — must be merged
// when an event spans multiple rows (one per dimension).
// A=0 B=1 C=2 D=3 E=4 F=5 G=6  N=13  O=14 P=15 Q=16 R=17 S=18 T=19 U=20
const EVENT_COLS = [0, 1, 2, 3, 4, 5, 6, 13, 14, 15, 16, 17, 18, 19, 20];

// ── Dictionary sheet ──────────────────────────────────────────────────────────

/**
 * Builds Sheet 3 "Словарь".
 *
 * Layout (0-based column indices):
 *   0  A  Application_id
 *   1  B  (empty separator)
 *   2  C  Действие
 *   3  D  (empty separator)
 *   4  E  Объект
 *   5  F  (empty separator)
 *   6  G  Приложение
 *   7  H  (empty separator)
 *   8  I  Приложение (duplicate for I↔J lookup)
 *   9  J  Категория => Функционал
 *  10  K  (empty separator)
 *  11  L  dimension  (1–50)
 *  12  M  (empty separator)
 *  13  N  Платформа
 *
 * New values from plan.new_dictionary_values are appended below each column
 * and coloured red (FF0000).
 */
function generateDictSheet(plan: TrackingPlan): XLSX.WorkSheet {
  const ndv = plan.new_dictionary_values;

  // colIndex → { header, baseValues, newValues }
  const cols: Record<number, { header: string; base: string[]; extra: string[] }> = {
    0:  { header: 'Application_id',          base: DICT_APPLICATION_IDS, extra: ndv.application_id ?? [] },
    2:  { header: 'Действие',                base: DICT_ACTIONS,         extra: ndv.action ?? [] },
    4:  { header: 'Объект',                  base: DICT_OBJECTS,         extra: ndv.object ?? [] },
    6:  { header: 'Приложение',              base: DICT_APPS,            extra: ndv.app ?? [] },
    8:  { header: 'Приложение',              base: DICT_APPS,            extra: ndv.app ?? [] },
    9:  { header: 'Категория => Функционал', base: DICT_CATEGORIES,      extra: ndv.category_functional ?? [] },
    11: { header: 'dimension',               base: Array.from({ length: 50 }, (_, i) => String(i + 1)), extra: [] },
    13: { header: 'Платформа',               base: DICT_PLATFORMS,       extra: [] },
  };

  const NUM_COLS = 14;

  // Total rows needed = max (header + base + extra) across all columns
  const maxRows = Math.max(
    ...Object.values(cols).map(({ base, extra }) => 1 + base.length + extra.length),
  );

  // Build 2D array — all cells start empty
  const data: string[][] = Array.from({ length: maxRows }, () => new Array(NUM_COLS).fill(''));

  // Track cells that need red styling [rowIdx, colIdx]
  const redCells: [number, number][] = [];

  for (const [idxStr, { header, base, extra }] of Object.entries(cols)) {
    const colIdx = Number(idxStr);
    data[0][colIdx] = header;
    base.forEach((v, i) => { data[i + 1][colIdx] = v; });
    const firstExtraRow = 1 + base.length;
    extra.forEach((v, i) => {
      const rowIdx = firstExtraRow + i;
      data[rowIdx][colIdx] = v;
      redCells.push([rowIdx, colIdx]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Apply red bold font to new-value cells
  redCells.forEach(([r, c]) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (ws[addr]) {
      ws[addr].s = { font: { color: { rgb: 'FF0000' }, bold: true } };
    }
  });

  // Column widths — separators get 3, content columns get explicit widths
  const colWidths: XLSX.ColInfo[] = new Array(NUM_COLS).fill({ wch: 3 });
  colWidths[0]  = { wch: 35 }; // Application_id
  colWidths[2]  = { wch: 28 }; // Действие
  colWidths[4]  = { wch: 25 }; // Объект
  colWidths[6]  = { wch: 22 }; // Приложение
  colWidths[8]  = { wch: 22 }; // Приложение (I)
  colWidths[9]  = { wch: 40 }; // Категория => Функционал
  colWidths[11] = { wch: 12 }; // dimension
  colWidths[13] = { wch: 15 }; // Платформа
  ws['!cols'] = colWidths;

  return ws;
}

// ── Public export ─────────────────────────────────────────────────────────────

export function generateExcel(plan: TrackingPlan): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: шаблон
  const templateData: string[][] = [HEADERS];
  const newValueCoords: [number, number][] = [];
  const merges: XLSX.Range[] = [];

  plan.events.forEach((event) => {
    const rows = eventToRows(event);
    const startRow = templateData.length;

    rows.forEach((row) => {
      const rowIdx = templateData.length;

      const newAction = (plan.new_dictionary_values.action ?? []).includes(event.action);
      const newObject = (plan.new_dictionary_values.object ?? []).includes(event.object);
      const newApp = (plan.new_dictionary_values.app ?? []).includes(event.app);
      const newCategory = (plan.new_dictionary_values.category_functional ?? []).includes(event.category_functional);
      const newAppId = (plan.new_dictionary_values.application_id ?? []).includes(event.application_id);

      if (newAction && row[14]) newValueCoords.push([rowIdx, 14]);
      if (newObject && row[15]) newValueCoords.push([rowIdx, 15]);
      if (newApp && row[17]) newValueCoords.push([rowIdx, 17]);
      if (newCategory && row[18]) newValueCoords.push([rowIdx, 18]);
      if (newAppId && row[2]) newValueCoords.push([rowIdx, 2]);

      templateData.push(row);
    });

    const endRow = templateData.length - 1;

    if (rows.length > 1) {
      EVENT_COLS.forEach((col) => {
        merges.push({ s: { r: startRow, c: col }, e: { r: endRow, c: col } });
      });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(templateData);
  ws['!merges'] = merges;

  newValueCoords.forEach(([row, col]) => {
    const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
    if (ws[cellAddr]) {
      ws[cellAddr].s = { font: { color: { rgb: 'FF0000' }, bold: true } };
    }
  });

  ws['!cols'] = HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'шаблон');

  // Sheet 2: пример заполнения
  const exampleData = [
    HEADERS,
    [
      '1.0', 'android', 'mobile', 'Friends', 'Banner', 'Click',
      'Клик на баннер программы «Приведи друга»',
      '5', 'Description', 'Описание', 'Подзаголовок баннера', 'Получи 1000 рублей за друга', '',
      '', 'Клик', 'Баннер', 'Баннер программы Приведи друга',
      'Альфа-Мобайл', 'Кэшбек и лояльность => Реферальная программа', 'TEAM-15', '',
    ],
  ];
  const wsExample = XLSX.utils.aoa_to_sheet(exampleData);
  wsExample['!cols'] = HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsExample, 'пример заполнения');

  // Sheet 3: Словарь
  XLSX.utils.book_append_sheet(wb, generateDictSheet(plan), 'Словарь');

  XLSX.writeFile(wb, 'tracking-plan.xlsx');
}
