# Домашний ангел · Настройка Supabase

## Шаг 1 — Создать таблицы в базе данных

1. Открой [supabase.com/dashboard](https://supabase.com/dashboard)
2. Выбери свой проект `yexbqwnjvvykdvasocwy`
3. Перейди в **SQL Editor**
4. Вставь содержимое файла `supabase-setup.sql` и нажми **Run**

Это создаст три таблицы:
- `leads` — заявки с сайта (кнопка «Оставить заявку»)
- `profiles` — профили из онбординга
- `device_events` — события от устройств (для будущей интеграции)

---

## Шаг 2 — Задеплоить Edge Function для ИИ-ассистента

### Вариант A — через Supabase Dashboard (проще)

1. Перейди в **Edge Functions** → **New Function**
2. Название: `ai-chat`
3. Вставь содержимое `supabase/functions/ai-chat/index.ts`
4. Нажми **Deploy**

### Вариант B — через CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref yexbqwnjvvykdvasocwy
supabase functions deploy ai-chat
```

---

## Шаг 3 — Добавить Anthropic API ключ

1. Получи API ключ на [console.anthropic.com](https://console.anthropic.com)
2. В Supabase Dashboard → **Edge Functions** → `ai-chat` → **Secrets**
3. Добавь секрет:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...` (твой ключ)

---

## Шаг 4 — Проверить что всё работает

### Проверка формы заявок:
1. Открой сайт → нажми «Оставить заявку» → заполни форму
2. В Supabase Dashboard → **Table Editor** → `leads` — должна появиться запись

### Проверка ИИ-ассистента:
1. Войди в кабинет → раздел «ИИ-ассистент»
2. Нажми «Отчёт за неделю» — должен прийти ответ

---

## Просмотр заявок

В Supabase Dashboard → **Table Editor** → `leads` видны все заявки с сайта:
- `name` — имя
- `phone` — телефон
- `email` — email
- `interest` — что интересует
- `comment` — комментарий
- `status` — можно менять: `new` → `contacted` → `converted`
- `created_at` — дата заявки

---

## Стоимость

Supabase Free tier включает:
- 500 МБ базы данных
- 500K Edge Function вызовов/мес
- 50K активных пользователей/мес

Для стартапа на первом году этого более чем достаточно.
