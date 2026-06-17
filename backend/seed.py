"""
Seed script — расширенные тестовые данные с апреля 2026.
Запуск: .venv/bin/python -m backend.seed
"""

import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession

from .database import SessionLocal
from .models import (
    User, Role, TutorStudentRelation, Lesson, LessonStatus,
    Homework, HomeworkStatus, AutoCheckType, Answer, AnswerStatus,
    Payment, PaymentStatus, Message,
    ForumThread, ForumPost,
    Subscription, PlanType,
    Notification,
)
import bcrypt as _bcrypt

MSK = ZoneInfo("Europe/Moscow")


def get_password_hash(p: str) -> str:
    return _bcrypt.hashpw(p.encode(), _bcrypt.gensalt()).decode()


def d(year: int, month: int, day: int, hour: int = 10, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=MSK)


def now() -> datetime:
    return datetime.now(tz=MSK)


def dt(days_offset: int, hour: int = 10, minute: int = 0) -> datetime:
    base = now().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base + timedelta(days=days_offset)


def grade_comment(score: int, max_score: int = 100) -> str:
    pct = score / max_score * 100
    if pct >= 90:
        return "Отлично! Все задания выполнены верно."
    elif pct >= 80:
        return "Хорошая работа! Есть пара ошибок — разберём на следующем занятии."
    elif pct >= 70:
        return "Неплохо, но есть ошибки. Повтори тему ещё раз."
    else:
        return "Нужно повторить материал. Разберём ошибки на следующем занятии."


async def clear(session: AsyncSession) -> None:
    for table in [
        "notifications", "forum_posts", "forum_threads",
        "answers", "payments", "homeworks",
        "messages", "lessons", "subscriptions",
        "invitations", "tutor_student_relations",
        "refresh_tokens", "push_subscriptions", "email_tokens", "audit_logs",
        "available_slots", "users",
    ]:
        await session.execute(__import__("sqlalchemy").text(f"DELETE FROM {table}"))
    await session.commit()
    print("✓ cleared")


async def seed() -> None:
    async with SessionLocal() as s:
        await clear(s)

        # ── Пользователи ─────────────────────────────────────────────────────
        # Анна ведёт ТОЛЬКО математику и физику
        tutor1 = User(
            role=Role.tutor, email="anna@tutorspace.ru",
            password_hash=get_password_hash("password123"),
            name="Анна Сергеевна", subjects="Математика, Физика",
            level="ЕГЭ, ОГЭ", is_active=True, is_verified=True,
            yoomoney_wallet="410011000000001", default_lesson_price=1500.0,
        )
        # Михаил ведёт ТОЛЬКО русский и литературу
        tutor2 = User(
            role=Role.tutor, email="mikhail@tutorspace.ru",
            password_hash=get_password_hash("password123"),
            name="Михаил Владимирович", subjects="Русский язык, Литература",
            level="Школа, ЕГЭ, ОГЭ", is_active=True, is_verified=True,
            yoomoney_wallet="410011000000002", default_lesson_price=1200.0,
        )
        # Алексей — ученик Анны (математика + физика)
        student1 = User(
            role=Role.student, email="alex@student.ru",
            password_hash=get_password_hash("password123"),
            name="Алексей Иванов", subjects="Математика, Физика",
            level="11 класс", is_active=True, is_verified=True,
        )
        # Маша — ученица Михаила (русский + литература)
        student2 = User(
            role=Role.student, email="masha@student.ru",
            password_hash=get_password_hash("password123"),
            name="Мария Козлова", subjects="Русский язык, Литература",
            level="10 класс", is_active=True, is_verified=True,
        )
        # Дима — ученик Анны (физика) и Михаила (русский)
        student3 = User(
            role=Role.student, email="dima@student.ru",
            password_hash=get_password_hash("password123"),
            name="Дмитрий Петров", subjects="Физика, Русский язык",
            level="11 класс", is_active=True, is_verified=True,
        )

        s.add_all([tutor1, tutor2, student1, student2, student3])
        await s.flush()
        print(f"✓ users: {tutor1.id}(Анна), {tutor2.id}(Михаил), {student1.id}(Алексей), {student2.id}(Маша), {student3.id}(Дима)")

        # ── Подписки ─────────────────────────────────────────────────────────
        s.add_all([
            Subscription(tutor_id=tutor1.id, plan=PlanType.pro_monthly, expires_at=dt(30)),
            Subscription(tutor_id=tutor2.id, plan=PlanType.pro_annual,  expires_at=dt(300)),
        ])
        await s.flush()

        # ── Связи ────────────────────────────────────────────────────────────
        s.add_all([
            TutorStudentRelation(tutor_id=tutor1.id, student_id=student1.id),  # Анна → Алексей
            TutorStudentRelation(tutor_id=tutor1.id, student_id=student3.id),  # Анна → Дима
            TutorStudentRelation(tutor_id=tutor2.id, student_id=student2.id),  # Михаил → Маша
            TutorStudentRelation(tutor_id=tutor2.id, student_id=student3.id),  # Михаил → Дима
        ])
        await s.flush()
        print("✓ subscriptions + relations")

        # ── Занятия ──────────────────────────────────────────────────────────
        def make_lessons(tutor_id, student_id, items):
            res = []
            for topic, date, status, duration in items:
                l = Lesson(tutor_id=tutor_id, student_id=student_id,
                           date=date, duration=duration, topic=topic, status=status)
                s.add(l)
                res.append(l)
            return res

        # Анна → Алексей: математика по вторникам, физика по четвергам
        alex_math = make_lessons(tutor1.id, student1.id, [
            ("Пределы и непрерывность функций",      d(2026,4,7,  11), LessonStatus.completed, 60),
            ("Производные: правила дифференцирования",d(2026,4,14, 11), LessonStatus.completed, 60),
            ("Производные сложных функций",           d(2026,4,21, 11), LessonStatus.completed, 60),
            ("Применение производных: экстремумы",   d(2026,4,28, 11), LessonStatus.completed, 60),
            ("Производные: контрольная",             d(2026,5,6,  11), LessonStatus.completed, 60),
            ("Первообразная и интеграл",             d(2026,5,13, 11), LessonStatus.completed, 60),
            ("Методы интегрирования",                d(2026,5,20, 11), LessonStatus.completed, 60),
            ("Определённый интеграл",                d(2026,5,27, 11), LessonStatus.completed, 60),
            ("Интеграл: вычисление площадей",        d(2026,6,3,  11), LessonStatus.completed, 60),
            ("Тригонометрические уравнения",         d(2026,6,10, 11), LessonStatus.confirmed, 60),
            ("Тригонометрические неравенства",       dt(7,  11),       LessonStatus.planned,   60),
            ("Разбор пробного ЕГЭ. Профиль",         dt(14, 11),       LessonStatus.planned,   90),
        ])
        alex_phys = make_lessons(tutor1.id, student1.id, [
            ("Механика: кинематика",                 d(2026,4,9,  14), LessonStatus.completed, 60),
            ("Механика: динамика, законы Ньютона",   d(2026,4,16, 14), LessonStatus.completed, 60),
            ("Законы сохранения",                    d(2026,4,23, 14), LessonStatus.completed, 60),
            ("Колебания и волны",                    d(2026,4,30, 14), LessonStatus.completed, 60),
            ("Электростатика",                       d(2026,5,7,  14), LessonStatus.completed, 60),
            ("Постоянный ток, закон Ома",            d(2026,5,14, 14), LessonStatus.completed, 60),
            ("Магнитное поле",                       d(2026,5,21, 14), LessonStatus.completed, 60),
            ("Оптика",                               d(2026,5,28, 14), LessonStatus.completed, 60),
            ("Квантовая физика",                     d(2026,6,4,  14), LessonStatus.completed, 60),
            ("Решение задач ЕГЭ: механика + ток",    dt(3,  14),       LessonStatus.planned,   90),
        ])

        # Михаил → Маша: русский по средам, литература по пятницам
        masha_rus = make_lessons(tutor2.id, student2.id, [
            ("Орфография: безударные гласные",        d(2026,4,2,  15), LessonStatus.completed, 60),
            ("Пунктуация: запятые",                   d(2026,4,9,  15), LessonStatus.completed, 60),
            ("Деепричастные обороты",                 d(2026,4,16, 15), LessonStatus.completed, 60),
            ("Причастные обороты",                    d(2026,4,23, 15), LessonStatus.completed, 60),
            ("Сложноподчинённые предложения",         d(2026,4,30, 15), LessonStatus.completed, 60),
            ("Виды связи предложений в тексте",       d(2026,5,7,  15), LessonStatus.completed, 60),
            ("ОГЭ: задания 6–9",                      d(2026,5,14, 15), LessonStatus.completed, 60),
            ("Сочинение-рассуждение: структура",      d(2026,5,21, 15), LessonStatus.completed, 60),
            ("Сочинение: аргументы",                  d(2026,5,28, 15), LessonStatus.completed, 60),
            ("Итоговое сочинение: шаблоны",           d(2026,6,4,  15), LessonStatus.completed, 60),
            ("Разбор типовых заданий ОГЭ",            dt(4,  15),       LessonStatus.planned,   60),
        ])
        masha_lit = make_lessons(tutor2.id, student2.id, [
            ("Лирика Пушкина: анализ",               d(2026,4,4,  16), LessonStatus.completed, 60),
            ("Маленький человек: Гоголь",             d(2026,4,11, 16), LessonStatus.completed, 60),
            ("Лермонтов: Герой нашего времени",       d(2026,4,18, 16), LessonStatus.completed, 60),
            ("Толстой: образы в Войне и мире",        d(2026,4,25, 16), LessonStatus.completed, 60),
            ("Достоевский: идеи и герои",             d(2026,5,2,  16), LessonStatus.completed, 60),
            ("Серебряный век: Блок, Ахматова",        d(2026,5,9,  16), LessonStatus.completed, 60),
            ("Булгаков: Мастер и Маргарита",          d(2026,5,16, 16), LessonStatus.completed, 60),
            ("Шолохов: Тихий Дон",                    d(2026,5,23, 16), LessonStatus.completed, 60),
            ("Сочинение по литературе: план",         d(2026,5,30, 16), LessonStatus.completed, 60),
            ("Разбор сочинений прошлых лет",          d(2026,6,6,  16), LessonStatus.completed, 60),
            ("Итоговый разбор: литература",           dt(6,  16),       LessonStatus.planned,   60),
        ])

        # Анна → Дима: физика по понедельникам
        dima_phys = make_lessons(tutor1.id, student3.id, [
            ("Кинематика: основные уравнения",        d(2026,4,6,  16), LessonStatus.completed, 60),
            ("Динамика: силы и ускорение",            d(2026,4,13, 16), LessonStatus.completed, 60),
            ("Законы Ньютона: задачи",                d(2026,4,20, 16), LessonStatus.completed, 60),
            ("Законы сохранения импульса",            d(2026,4,27, 16), LessonStatus.completed, 60),
            ("Электрическое поле",                    d(2026,5,11, 16), LessonStatus.completed, 60),
            ("Закон Ома для участка цепи",            d(2026,5,18, 16), LessonStatus.completed, 60),
            ("Параллельное и последовательное соед.", d(2026,5,25, 16), LessonStatus.completed, 60),
            ("Электромагнитная индукция",             d(2026,6,1,  16), LessonStatus.completed, 60),
            ("Оптика: законы отражения и преломления",d(2026,6,8,  16), LessonStatus.completed, 60),
            ("Решение задач ЕГЭ часть 2",             dt(2,  16),       LessonStatus.planned,   90),
        ])

        # Михаил → Дима: русский по субботам
        dima_rus = make_lessons(tutor2.id, student3.id, [
            ("Словообразование: разбор по составу",   d(2026,4,5,  10), LessonStatus.completed, 60),
            ("Морфология: именные части речи",        d(2026,4,12, 10), LessonStatus.completed, 60),
            ("Синтаксис: члены предложения",          d(2026,4,19, 10), LessonStatus.completed, 60),
            ("Пунктуация: однородные члены",          d(2026,4,26, 10), LessonStatus.completed, 60),
            ("Правописание: НЕ с разными ч.р.",       d(2026,5,10, 10), LessonStatus.completed, 60),
            ("Правописание: Н и НН",                  d(2026,5,17, 10), LessonStatus.completed, 60),
            ("Работа с текстом: основная мысль",      d(2026,5,24, 10), LessonStatus.completed, 60),
            ("Сочинение 9.3: структура",              d(2026,5,31, 10), LessonStatus.completed, 60),
            ("ОГЭ: разбор варианта 2024 года",        d(2026,6,7,  10), LessonStatus.completed, 60),
            ("Финальное повторение",                  dt(5,  10),       LessonStatus.planned,   60),
        ])

        await s.flush()
        total_lessons = len(alex_math)+len(alex_phys)+len(masha_rus)+len(masha_lit)+len(dima_phys)+len(dima_rus)
        print(f"✓ {total_lessons} lessons")

        # ── Платежи ──────────────────────────────────────────────────────────
        def add_payments(lessons, amount, start_paid_from=0):
            for i, l in enumerate(lessons):
                if l.status in (LessonStatus.completed, LessonStatus.confirmed):
                    paid = i >= start_paid_from
                    s.add(Payment(
                        lesson_id=l.id, amount=amount, currency="RUB",
                        status=PaymentStatus.paid if paid else PaymentStatus.pending,
                        payment_date=l.date + timedelta(hours=2) if paid else None,
                        payment_method="ЮMoney" if paid else None,
                    ))

        add_payments(alex_math,  1500, start_paid_from=0)
        add_payments(alex_phys,  1500, start_paid_from=0)
        add_payments(masha_rus,  1200, start_paid_from=2)  # первые 2 pending
        add_payments(masha_lit,  1200, start_paid_from=0)
        add_payments(dima_phys,  1500, start_paid_from=1)
        add_payments(dima_rus,   1200, start_paid_from=0)
        await s.flush()
        print("✓ payments")

        # ── ДЗ + Ответы ──────────────────────────────────────────────────────
        async def add_hw(lesson, student_id, desc, max_score, status, score=None, answer_text=None, comment=None):
            hw = Homework(
                lesson_id=lesson.id, description=desc,
                auto_check_type=AutoCheckType.none, max_score=max_score,
                status=status, deadline=lesson.date + timedelta(days=5),
            )
            s.add(hw)
            await s.flush()
            if score is not None:
                s.add(Answer(
                    homework_id=hw.id, student_id=student_id,
                    content=answer_text or "Выполнил все задания.",
                    status=AnswerStatus.graded, score=float(score),
                    comment=comment or grade_comment(score, max_score),
                    submitted_at=lesson.date + timedelta(days=3),
                    graded_at=lesson.date + timedelta(days=4),
                ))
            elif status == HomeworkStatus.submitted:
                s.add(Answer(
                    homework_id=hw.id, student_id=student_id,
                    content=answer_text or "Выполнил задание, отправляю на проверку.",
                    status=AnswerStatus.submitted,
                    submitted_at=lesson.date + timedelta(days=4),
                ))

        # Алексей — математика
        alex_math_hw = [
            ("Пределы: вычислить 8 примеров",                    100, HomeworkStatus.graded, 85, "Вычислил все, в задаче 6 использовал формулу неопределённости."),
            ("Производные базовых функций: 12 примеров",          100, HomeworkStatus.graded, 92, "Все производные нашёл правильно, кроме задачи 10."),
            ("Цепное правило: 10 составных функций",              100, HomeworkStatus.graded, 78, "С цепным правилом сложно когда три вложения."),
            ("Нахождение экстремумов и точек перегиба",           100, HomeworkStatus.graded, 88, "Отличная работа! Оформление немного нечёткое."),
            ("Контрольная: производные (15 задач)",               100, HomeworkStatus.graded, 84, "Хорошо! Ошибка в задаче 12 — знак."),
            ("Таблица первообразных: выучить + примеры",          100, HomeworkStatus.graded, 95, "Превосходно! Все 15 интегралов верны."),
            ("Интегрирование по частям: 8 задач",                 100, HomeworkStatus.graded, 80, "Неплохо, но в задачах 3 и 7 ошибки в выборе u и dv."),
            ("Определённые интегралы: 10 задач",                  100, HomeworkStatus.graded, 87, "Хорошая работа! Задача 9 с заменой переменной — верно."),
            ("Площадь фигуры между двумя кривыми",               100, HomeworkStatus.graded, 75, "Ошибка в нахождении точек пересечения. Разберём."),
            ("Тригонометрические уравнения: 10 задач",            100, HomeworkStatus.submitted, None, "Сделал 9 из 10. Последняя с модулем — завис."),
            ("Тригонометрические неравенства: 8 задач",           100, HomeworkStatus.assigned, None, None),
        ]
        for (lesson, (desc, ms, status, score, text)) in zip(alex_math[:len(alex_math_hw)], alex_math_hw):
            await add_hw(lesson, student1.id, desc, ms, status, score, text)

        # Алексей — физика
        alex_phys_hw = [
            ("Задачи на кинематику: 6 задач",                    100, HomeworkStatus.graded, 90, "Отлично! Все задачи на равноускоренное движение верны."),
            ("Законы Ньютона: 5 задач с чертежами",              100, HomeworkStatus.graded, 83, "Чертежи хорошие, ошибка в задаче 4 — не учёл трение."),
            ("Законы сохранения: 6 задач",                       100, HomeworkStatus.graded, 88, "Хорошо! Задача 5 с нецентральным ударом — верно."),
            ("Колебания: период и частота, 5 задач",             100, HomeworkStatus.graded, 79, "Задача 3 — неверная формула для пружинного маятника."),
            ("Электростатика: задачи на закон Кулона",           100, HomeworkStatus.graded, 86, "Молодец! Ошибка только в размерностях задачи 2."),
            ("Закон Ома: расчёт цепи",                           100, HomeworkStatus.graded, 91, "Отлично! Все цепи рассчитаны правильно."),
            ("Магнитное поле: сила Лоренца, 5 задач",            100, HomeworkStatus.graded, 82, "Хорошо. Ошибка в направлении силы в задаче 3."),
            ("Геометрическая оптика: построения",                100, HomeworkStatus.graded, 77, "Построения неточные, но ход лучей верный."),
            ("Квантовая физика: фотоэффект, 4 задачи",           100, HomeworkStatus.submitted, None, "Задачи 1-3 решил, задача 4 с функцией выхода — не уверен."),
        ]
        for (lesson, (desc, ms, status, score, text)) in zip(alex_phys[:len(alex_phys_hw)], alex_phys_hw):
            await add_hw(lesson, student1.id, desc, ms, status, score, text)

        # Маша — русский
        masha_rus_hw = [
            ("Упражнения §34–38: безударные гласные",             50, HomeworkStatus.graded, 46, "Почти всё верно! Ошибка в слове «поглощать»."),
            ("Тест: 20 предложений на запятые",                   50, HomeworkStatus.graded, 43, "14 из 20 верно. Ошибки с однородными определениями."),
            ("Деепричастный оборот: найди ошибки (15 предл.)",    50, HomeworkStatus.graded, 48, "Отлично! Нашла 14 из 15 ошибок."),
            ("Причастный оборот: составь 10 предложений",         50, HomeworkStatus.graded, 44, "Хорошо! В 3 предложениях неверное согласование."),
            ("СПП: схемы 10 предложений",                         100, HomeworkStatus.graded, 82, "Молодец! Схемы верные. Ошибка в определении типа придаточного."),
            ("Виды связи: анализ 5 текстов",                      100, HomeworkStatus.graded, 88, "Отличная работа! Все виды связи определены верно."),
            ("ОГЭ: выполни задания 6–9 (вариант 12)",             100, HomeworkStatus.graded, 84, "Хорошо! Задание 8 — ошибка в типе подчинения."),
            ("Черновик сочинения-рассуждения",                    100, HomeworkStatus.graded, 78, "Хорошая структура! Тезис чёткий. Второй аргумент слабый — конкретизируй."),
            ("Доработать сочинение по комментарию",               100, HomeworkStatus.submitted, None, "Переписала второй аргумент, добавила цитату из текста."),
            ("Итоговое сочинение: написать по шаблону",           100, HomeworkStatus.assigned, None, None),
        ]
        for (lesson, (desc, ms, status, score, text)) in zip(masha_rus[:len(masha_rus_hw)], masha_rus_hw):
            await add_hw(lesson, student2.id, desc, ms, status, score, text)

        # Маша — литература
        masha_lit_hw = [
            ("Анализ стихотворения Пушкина (на выбор)",           100, HomeworkStatus.graded, 88, "Хороший анализ! Обрати внимание на звукопись."),
            ("Эссе: образ маленького человека у Гоголя",          100, HomeworkStatus.graded, 82, "Хорошее эссе. Добавь сравнение с Башмачкиным и Самсоном Выриным."),
            ("Цитатный план по «Герою нашего времени»",           100, HomeworkStatus.graded, 90, "Отлично! Цитаты подобраны точно."),
            ("Характеристика Наташи Ростовой (письменно)",        100, HomeworkStatus.graded, 85, "Хорошая работа! Упусти поверхностные оценки, пиши о поступках."),
            ("Таблица идей Достоевского по «Преступлению»",       100, HomeworkStatus.graded, 79, "Неплохо. Идея «сверхчеловека» раскрыта недостаточно."),
            ("Анализ поэмы Блока «Двенадцать»",                   100, HomeworkStatus.graded, 86, "Хорошо! Символика революции раскрыта."),
            ("Письменно: роль Воланда в романе Булгакова",        100, HomeworkStatus.graded, 91, "Превосходно! Очень зрелый анализ."),
            ("Цитатный план по «Тихому Дону»",                    100, HomeworkStatus.graded, 80, "Хорошо, но мало цитат по линии Аксиньи."),
            ("Черновик сочинения по литературе",                  100, HomeworkStatus.submitted, None, "Написала по Булгакову. Не уверена в тезисе."),
            ("Доработать сочинение по комментарию",               100, HomeworkStatus.assigned, None, None),
        ]
        for (lesson, (desc, ms, status, score, text)) in zip(masha_lit[:len(masha_lit_hw)], masha_lit_hw):
            await add_hw(lesson, student2.id, desc, ms, status, score, text)

        # Дима — физика
        dima_phys_hw = [
            ("Кинематика: 5 задач на движение",                   100, HomeworkStatus.graded, 72, "Ошибка в задаче 3 — перепутал начальную и конечную скорость."),
            ("Динамика: 4 задачи с чертежами",                   100, HomeworkStatus.graded, 80, "Неплохо. Чертежи хорошие, ошибка в расчёте в задаче 2."),
            ("Законы Ньютона: контрольная",                      100, HomeworkStatus.graded, 76, "Задачи 1 и 3 верно, в задаче 2 ошибка с трением."),
            ("Импульс: задачи на столкновения",                  100, HomeworkStatus.graded, 83, "Хорошо! Нецентральный удар в задаче 4 — верно."),
            ("Электростатика: поле и потенциал",                 100, HomeworkStatus.graded, 69, "Потенциал путаешь с напряжённостью. Повтори определения."),
            ("Цепи постоянного тока: расчёт",                    100, HomeworkStatus.graded, 85, "Хорошо! Смешанное соединение посчитал верно."),
            ("Сложные цепи: метод узловых потенциалов",          100, HomeworkStatus.graded, 78, "Неплохо. Ошибка в знаке тока в ветви 2."),
            ("Индукция: задачи на ЭМИ",                          100, HomeworkStatus.submitted, None, "Решил 3 из 4. Задача с изменяющимся потоком — не понял."),
        ]
        for (lesson, (desc, ms, status, score, text)) in zip(dima_phys[:len(dima_phys_hw)], dima_phys_hw):
            await add_hw(lesson, student3.id, desc, ms, status, score, text)

        # Дима — русский
        dima_rus_hw = [
            ("Разбор 10 слов по составу",                        50,  HomeworkStatus.graded, 44, "Почти всё верно! Суффикс -чик/-щик — ошибка в 2 словах."),
            ("Морфология: определить ч.р. в тексте",            50,  HomeworkStatus.graded, 47, "Отлично! Только причастие от прилагательного не отличил."),
            ("Синтаксический разбор 5 предложений",              100, HomeworkStatus.graded, 75, "Неплохо. Ошибка в определении типа сказуемого."),
            ("Однородные члены: тест 15 предложений",            100, HomeworkStatus.graded, 80, "Хорошо! Ошибка с обобщающим словом в задаче 8."),
            ("НЕ с разными ч.р.: 20 примеров",                   100, HomeworkStatus.graded, 82, "Молодец! Ошибки только с краткими причастиями."),
            ("Н и НН: диктант 30 слов",                          100, HomeworkStatus.graded, 73, "7 ошибок. Прилагательные от существительных — повтори."),
            ("Написать изложение (150–200 слов)",                100, HomeworkStatus.graded, 85, "Хорошо! Сохранена основная мысль. Немного сокращено."),
            ("Сочинение 9.3: черновик",                          100, HomeworkStatus.submitted, None, "Написал черновик на тему «Дружба». Не уверен в примерах."),
        ]
        for (lesson, (desc, ms, status, score, text)) in zip(dima_rus[:len(dima_rus_hw)], dima_rus_hw):
            await add_hw(lesson, student3.id, desc, ms, status, score, text)

        await s.flush()
        print("✓ homework + answers")

        # ── Сообщения ────────────────────────────────────────────────────────
        msgs = [
            # Анна ↔ Алексей: математика
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,4,7,12),
                 text="Алексей, хорошо начали! Пределы освоили. ДЗ — до пятницы, 8 примеров."),
            dict(sender_id=student1.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,4,7,18),
                 text="Понял, Анна Сергеевна. Отправлю в четверг."),
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,4,10,10),
                 text="Проверила ДЗ — 85/100. Задача 6 правильная, но оформление. Разберём во вторник."),
            dict(sender_id=student1.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,4,14,12),
                 text="Анна Сергеевна, сегодня разобрали производные. Цепное правило всё ещё путаюсь когда много вложений."),
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,4,14,13),
                 text="Это нормально на первом этапе. Главное — идти по порядку снаружи внутрь. На следующей неделе закрепим."),
            dict(sender_id=student1.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,5,7,20),
                 text="Анна Сергеевна, ДЗ по первообразным отправил. С интегрированием по частям запутался в знаках."),
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,5,8,9),
                 text="Видела! Запомни: ∫u dv = uv − ∫v du. Выбирай u то, что проще дифференцировать. На занятии разберём."),
            dict(sender_id=student1.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,6,3,12),
                 text="Сегодня хорошо разобрали площади. Нашёл сборник ЕГЭ профиль 2025 — можем взять на следующее занятие?"),
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,6,3,13),
                 text="Отличная идея! Возьми часть 2, задания 13–19. Посмотрим на реальный уровень."),
            dict(sender_id=student1.id, receiver_id=tutor1.id, is_read=False,
                 created_at=d(2026,6,10,9),
                 text="Готов к сегодняшнему занятию! Тождества сделал почти все."),

            # Анна ↔ Алексей: физика
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,4,9,15),
                 text="Алексей, по кинематике всё чётко. ДЗ — 6 задач, не забудь чертежи!"),
            dict(sender_id=student1.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,4,12,19),
                 text="Анна Сергеевна, задача 4 по динамике — там трение скольжения или покоя? Тело на грани движения."),
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,4,12,20),
                 text="Если тело начинает двигаться — трение скольжения, μk. Если стоит — статическое, μs. По условию «на грани» — берём μs."),
            dict(sender_id=student1.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,5,14,15),
                 text="Закон Ома понял наконец! Давно путал ЭДС источника с напряжением на нагрузке."),
            dict(sender_id=tutor1.id, receiver_id=student1.id, is_read=True,
                 created_at=d(2026,5,14,16),
                 text="Это частая ошибка. Помни: U = ε − Ir, где r — внутреннее сопротивление. Запиши в шпаргалку."),

            # Михаил ↔ Маша: русский
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=True,
                 created_at=d(2026,4,2,16),
                 text="Мария, хорошее начало! Упражнения §34–38 — до следующей среды."),
            dict(sender_id=student2.id, receiver_id=tutor2.id, is_read=True,
                 created_at=d(2026,4,3,19),
                 text="Михаил Владимирович, слово «примерять» — это от «мерить» или «мириться»?"),
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=True,
                 created_at=d(2026,4,3,20),
                 text="«Примерять платье» — от «мера». «Примиряться с ситуацией» — от «мир». Разные корни! Запиши оба."),
            dict(sender_id=student2.id, receiver_id=tutor2.id, is_read=True,
                 created_at=d(2026,5,21,21),
                 text="Михаил Владимирович, черновик сочинения отправила. Второй аргумент слабоват — как улучшить?"),
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=True,
                 created_at=d(2026,5,22,10),
                 text="Используй конкретный пример из текста, а не общие рассуждения. Цитата + анализ = сильный аргумент."),
            dict(sender_id=student2.id, receiver_id=tutor2.id, is_read=True,
                 created_at=d(2026,6,4,20),
                 text="Доработала сочинение по вашим комментариям! Добавила цитату и пояснение — так лучше?"),
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=True,
                 created_at=d(2026,6,4,21),
                 text="Значительно лучше! Теперь аргумент весомый. Проверю в деталях и напишу."),
            dict(sender_id=student2.id, receiver_id=tutor2.id, is_read=False,
                 created_at=d(2026,6,9,19),
                 text="Михаил Владимирович, на сочинении по литературе можно цитировать не дословно?"),
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=False,
                 created_at=d(2026,6,9,20),
                 text="На ЕГЭ допускается неточное цитирование — главное указать автора и произведение. Дословно не требуется."),

            # Михаил ↔ Маша: литература
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=True,
                 created_at=d(2026,4,4,17),
                 text="Мария, сегодня хорошо разобрали Пушкина. На следующей неделе Гоголь — перечитайте «Шинель» и «Невский проспект»."),
            dict(sender_id=student2.id, receiver_id=tutor2.id, is_read=True,
                 created_at=d(2026,4,4,18),
                 text="Обязательно прочитаю! Мне очень понравился разбор «Медного всадника»."),
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=True,
                 created_at=d(2026,5,16,17),
                 text="Отличный анализ Булгакова сегодня! Вы чувствуете текст. Эссе о Воланде — до пятницы."),
            dict(sender_id=student2.id, receiver_id=tutor2.id, is_read=True,
                 created_at=d(2026,5,18,20),
                 text="Написала эссе о Воланде! Мне кажется, там важна именно двойственность — он и зло, и справедливость."),
            dict(sender_id=tutor2.id, receiver_id=student2.id, is_read=True,
                 created_at=d(2026,5,19,9),
                 text="Точно! Воланд — зеркало человеческих пороков. Именно эту мысль разверни в эссе — это сильный тезис."),

            # Анна ↔ Дима: физика
            dict(sender_id=tutor1.id, receiver_id=student3.id, is_read=True,
                 created_at=d(2026,4,6,17),
                 text="Дмитрий, добрый вечер! ДЗ по кинематике — 5 задач, чертежи обязательны."),
            dict(sender_id=student3.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,4,8,18),
                 text="Анна Сергеевна, задача 3 — там два тела движутся навстречу, мне считать систему отсчёта относительно одного?"),
            dict(sender_id=tutor1.id, receiver_id=student3.id, is_read=True,
                 created_at=d(2026,4,8,19),
                 text="Да, выбери любое тело за начало отсчёта. Удобнее — то которое стоит на месте. Тогда скорость второго = v₁+v₂."),
            dict(sender_id=student3.id, receiver_id=tutor1.id, is_read=True,
                 created_at=d(2026,5,18,17),
                 text="Анна Сергеевна, с цепями понял наконец! Параллельное соединение — складываю проводимости, не сопротивления."),
            dict(sender_id=tutor1.id, receiver_id=student3.id, is_read=True,
                 created_at=d(2026,5,18,18),
                 text="Именно! 1/R = 1/R₁ + 1/R₂ + ... Это сразу упрощает расчёты. Молодец что разобрался!"),
            dict(sender_id=student3.id, receiver_id=tutor1.id, is_read=False,
                 created_at=d(2026,6,8,17),
                 text="Сегодня оптика понравилась! Задача с линзой — построил ход лучей сам. Домашнее задание сдам в воскресенье."),

            # Михаил ↔ Дима: русский
            dict(sender_id=tutor2.id, receiver_id=student3.id, is_read=True,
                 created_at=d(2026,4,5,11),
                 text="Дмитрий, добрый день! ДЗ — разбор 10 слов по составу. Внимание на суффиксы -чик/-щик."),
            dict(sender_id=student3.id, receiver_id=tutor2.id, is_read=True,
                 created_at=d(2026,4,7,19),
                 text="Михаил Владимирович, слова «разведчик» и «грузчик» — почему разные суффиксы? Оба называют человека."),
            dict(sender_id=tutor2.id, receiver_id=student3.id, is_read=True,
                 created_at=d(2026,4,7,20),
                 text="Правило: если перед суффиксом д, т, з, с, ж — пишем -чик. «Разведчик» — перед ч стоит «д». «Грузчик» — перед ч стоит «з». Запомнил?"),
            dict(sender_id=student3.id, receiver_id=tutor2.id, is_read=True,
                 created_at=d(2026,4,7,20,15),
                 text="Да, теперь понял! Спасибо."),
            dict(sender_id=student3.id, receiver_id=tutor2.id, is_read=False,
                 created_at=d(2026,6,7,19),
                 text="Михаил Владимирович, черновик сочинения 9.3 на тему «Дружба» написал. Примеры взял из жизни — это можно?"),
            dict(sender_id=tutor2.id, receiver_id=student3.id, is_read=False,
                 created_at=d(2026,6,7,20),
                 text="Можно и нужно! Жизненный пример — один из трёх допустимых. Главное — он должен чётко подтверждать тезис."),
        ]
        for m in msgs:
            s.add(Message(**m))
        await s.flush()
        print(f"✓ {len(msgs)} messages")

        # ── Форум ────────────────────────────────────────────────────────────
        th1 = ForumThread(title="Мотивация учеников в финальный месяц перед ЕГЭ",
                          tag="мотивация", tutor_id=tutor1.id, created_at=d(2026,4,10,10))
        th2 = ForumThread(title="GeoGebra и Desmos — лучшие инструменты для математики",
                          tag="ресурсы",   tutor_id=tutor2.id, created_at=d(2026,4,25,14))
        th3 = ForumThread(title="Обмен авторскими заданиями: русский язык ЕГЭ/ОГЭ",
                          tag="материалы", tutor_id=tutor2.id, created_at=d(2026,5,15,11))
        th4 = ForumThread(title="Работа с тревожными учениками перед экзаменом",
                          tag="психология",tutor_id=tutor1.id, created_at=d(2026,5,28,9))
        th5 = ForumThread(title="Как объяснить интегралы «на пальцах»?",
                          tag="методика",  tutor_id=tutor1.id, created_at=d(2026,6,1,11))
        s.add_all([th1, th2, th3, th4, th5])
        await s.flush()

        forum_posts = [
            # th1
            ForumPost(thread_id=th1.id, user_id=tutor1.id, created_at=d(2026,4,10,10,5),
                      text="Коллеги, как поддерживаете мотивацию у 11-классников в мае-июне? У меня некоторые начинают «выгорать» после пробников."),
            ForumPost(thread_id=th1.id, user_id=tutor2.id, created_at=d(2026,4,11,9),
                      text="Метод «обратного отсчёта»: показываю сколько дней до экзамена и что конкретно нужно успеть. Лучше абстрактных призывов."),
            ForumPost(thread_id=th1.id, user_id=tutor1.id, created_at=d(2026,4,11,11),
                      text="Хорошая идея! Ещё помогает разбирать задачи из прошлых лет — ученики видят что задания повторяются, становится не так страшно."),
            ForumPost(thread_id=th1.id, user_id=tutor2.id, created_at=d(2026,4,12,14),
                      text="Согласен. Плюс отмечаю прогресс на каждом занятии: «в марте ты не мог решить такое, а сейчас решил». Работает на уверенность."),
            ForumPost(thread_id=th1.id, user_id=tutor1.id, created_at=d(2026,5,2,10),
                      text="Попробовала давать лёгкие задачи в начале занятия — для разогрева. Разница заметна, ученики меньше паникуют!"),
            ForumPost(thread_id=th1.id, user_id=tutor2.id, created_at=d(2026,5,3,12),
                      text="Да, «успешный старт» занятия важен психологически. Тоже беру на вооружение."),

            # th2
            ForumPost(thread_id=th2.id, user_id=tutor2.id, created_at=d(2026,4,25,14,10),
                      text="Коллеги, что используете для визуализации математики? Начну: GeoGebra — геометрия и алгебра, Desmos — графики функций."),
            ForumPost(thread_id=th2.id, user_id=tutor1.id, created_at=d(2026,4,26,11),
                      text="Desmos обожаю для трансформаций! Ученик сразу видит как параметр a в y=f(x+a) сдвигает график. GeoGebra использую для стереометрии."),
            ForumPost(thread_id=th2.id, user_id=tutor2.id, created_at=d(2026,4,27,9),
                      text="Попробовал GeoGebra 3D — ученик наконец понял задачи на пересечение плоскостей. Очень рекомендую для стереометрии!"),
            ForumPost(thread_id=th2.id, user_id=tutor1.id, created_at=d(2026,4,28,15),
                      text="Ещё советую WolframAlpha для проверки вычислений — ученики могут сразу видеть правильный ответ и сравнивать ход решения."),

            # th3
            ForumPost(thread_id=th3.id, user_id=tutor2.id, created_at=d(2026,5,15,11,5),
                      text="Предлагаю обмениваться заданиями. Делюсь: тест на запятые при деепричастных оборотах — 15 заданий с разбором."),
            ForumPost(thread_id=th3.id, user_id=tutor1.id, created_at=d(2026,5,16,18),
                      text="Отличная инициатива! У меня подборка по НЕ с разными частями речи — 20 заданий с объяснениями. Готова поделиться."),
            ForumPost(thread_id=th3.id, user_id=tutor2.id, created_at=d(2026,5,17,10),
                      text="Буду рад получить! Ещё ищу задания на виды связи предложений в тексте — есть у кого?"),
            ForumPost(thread_id=th3.id, user_id=tutor1.id, created_at=d(2026,5,18,15),
                      text="Есть! Составила специально для ОГЭ — 10 текстов с заданиями. Пришлю на этой неделе."),
            ForumPost(thread_id=th3.id, user_id=tutor2.id, created_at=d(2026,5,25,11),
                      text="Получил, спасибо! Использовал с двумя учениками — очень удобный формат."),

            # th4
            ForumPost(thread_id=th4.id, user_id=tutor1.id, created_at=d(2026,5,28,9,5),
                      text="У двух учеников перед пробниками началась настоящая паника. Как работаете с тревогой — не как психолог, а как репетитор?"),
            ForumPost(thread_id=th4.id, user_id=tutor2.id, created_at=d(2026,5,28,14),
                      text="Нормализую тревогу: «волноваться — нормально, это значит что вам важен результат». Помогает с «я боюсь» переключиться на «я готов»."),
            ForumPost(thread_id=th4.id, user_id=tutor1.id, created_at=d(2026,5,29,10),
                      text="Провожу «репетицию экзамена» — те же условия, таймер, бланки. После неё тревога снижается — ученик уже «был там»."),
            ForumPost(thread_id=th4.id, user_id=tutor2.id, created_at=d(2026,5,30,9),
                      text="Репетиция — отличная идея. Ещё убираю фокус с оценки: «давай просто решим, посмотрим что получится». Это снимает давление."),

            # th5
            ForumPost(thread_id=th5.id, user_id=tutor1.id, created_at=d(2026,6,1,11,5),
                      text="Коллеги, кто преподаёт математику — как вы объясняете смысл интеграла «с нуля»? Хочу найти лучшую аналогию."),
            ForumPost(thread_id=th5.id, user_id=tutor2.id, created_at=d(2026,6,1,14),
                      text="Не преподаю математику, но слышал хорошую аналогию: интеграл — это «сумма бесконечно тонких прямоугольников». Что-то вроде накопленной площади."),
            ForumPost(thread_id=th5.id, user_id=tutor1.id, created_at=d(2026,6,2,10),
                      text="Да, эту использую! Ещё помогает аналогия со скоростью и расстоянием: производная = скорость, интеграл = пройденный путь. Ученики сразу понимают смысл."),
            ForumPost(thread_id=th5.id, user_id=tutor2.id, created_at=d(2026,6,2,15),
                      text="О, это очень наглядно! Буду иметь в виду на случай если буду объяснять смежные темы."),
        ]
        for fp in forum_posts:
            s.add(fp)
        await s.flush()
        print(f"✓ {len(forum_posts)} forum posts in 5 threads")

        # ── Уведомления ──────────────────────────────────────────────────────
        notifs = [
            # Алексей
            Notification(user_id=student1.id, is_read=False, created_at=d(2026,6,10,9),
                         title="Сегодня занятие в 11:00",
                         body="Анна Сергеевна: Тригонометрические уравнения. Подготовь формулы!",
                         url="/dashboard/student/schedule"),
            Notification(user_id=student1.id, is_read=False, created_at=d(2026,6,9,8),
                         title="Не сдано ДЗ по математике",
                         body="Срок по «Тригонометрические тождества» истёк. Сдай как можно скорее.",
                         url="/dashboard/student/homework"),
            Notification(user_id=student1.id, is_read=True, created_at=d(2026,6,4,14),
                         title="ДЗ проверено: 75/100",
                         body="Анна Сергеевна проверила «Площадь фигуры между двумя кривыми».",
                         url="/dashboard/student/homework"),
            Notification(user_id=student1.id, is_read=True, created_at=d(2026,5,28,12),
                         title="Оплата получена",
                         body="Занятие 27 мая (Определённый интеграл) — 1500 ₽ оплачено.",
                         url="/dashboard/student/payments"),
            # Маша
            Notification(user_id=student2.id, is_read=False, created_at=d(2026,6,9,20),
                         title="Новое сообщение от Михаила Владимировича",
                         body="На ЕГЭ допускается неточное цитирование...",
                         url="/dashboard/student/chat"),
            Notification(user_id=student2.id, is_read=False, created_at=d(2026,6,5,10),
                         title="Новое домашнее задание",
                         body="Михаил Владимирович назначил: «Итоговое сочинение: написать по шаблону».",
                         url="/dashboard/student/homework"),
            Notification(user_id=student2.id, is_read=True, created_at=d(2026,6,4,21),
                         title="ДЗ проверено: 91/100",
                         body="Михаил Владимирович проверил «Письменно: роль Воланда в романе Булгакова».",
                         url="/dashboard/student/homework"),
            # Дима
            Notification(user_id=student3.id, is_read=False, created_at=d(2026,6,7,20),
                         title="Новое сообщение от Михаила Владимировича",
                         body="Можно и нужно! Жизненный пример — один из допустимых...",
                         url="/dashboard/student/chat"),
            Notification(user_id=student3.id, is_read=False, created_at=d(2026,6,8,17),
                         title="Новое занятие по физике",
                         body="Анна Сергеевна запланировала: Решение задач ЕГЭ часть 2.",
                         url="/dashboard/student/schedule"),
            # Анна
            Notification(user_id=tutor1.id, is_read=False, created_at=d(2026,6,9,22),
                         title="Ответ на ДЗ от Алексея",
                         body="Алексей Иванов сдал «Тригонометрические уравнения».",
                         url="/dashboard/tutor/homework"),
            Notification(user_id=tutor1.id, is_read=False, created_at=d(2026,6,8,18),
                         title="Ответ на ДЗ от Дмитрия",
                         body="Дмитрий Петров сдал «Индукция: задачи на ЭМИ».",
                         url="/dashboard/tutor/homework"),
            Notification(user_id=tutor1.id, is_read=True, created_at=d(2026,6,4,15),
                         title="Платёж получен",
                         body="Алексей Иванов оплатил занятие 3 июня — 1500 ₽.",
                         url="/dashboard/tutor/payments"),
            # Михаил
            Notification(user_id=tutor2.id, is_read=False, created_at=d(2026,6,9,19),
                         title="Сообщение от Марии Козловой",
                         body="Михаил Владимирович, на сочинении можно цитировать не дословно?",
                         url="/dashboard/tutor/chat"),
            Notification(user_id=tutor2.id, is_read=False, created_at=d(2026,6,9,12),
                         title="Ответ на ДЗ от Марии",
                         body="Мария Козлова сдала «Черновик сочинения по литературе».",
                         url="/dashboard/tutor/homework"),
            Notification(user_id=tutor2.id, is_read=True, created_at=d(2026,6,7,21),
                         title="Ответ на ДЗ от Дмитрия",
                         body="Дмитрий Петров сдал «Сочинение 9.3: черновик».",
                         url="/dashboard/tutor/homework"),
        ]
        for n in notifs:
            s.add(n)

        await s.commit()
        print(f"✓ {len(notifs)} notifications")

        total_hw = len(alex_math_hw) + len(alex_phys_hw) + len(masha_rus_hw) + len(masha_lit_hw) + len(dima_phys_hw) + len(dima_rus_hw)
        print("\n🎉 Seed complete!")
        print("─" * 50)
        print("  anna@tutorspace.ru     / password123  (Математика, Физика — PRO)")
        print("  mikhail@tutorspace.ru  / password123  (Русский, Литература — PRO)")
        print("  alex@student.ru        / password123  (ученик Анны)")
        print("  masha@student.ru       / password123  (ученица Михаила)")
        print("  dima@student.ru        / password123  (ученик обоих)")
        print(f"\n  Занятий: {total_lessons}  |  ДЗ: {total_hw}  |  Сообщений: {len(msgs)}")


if __name__ == "__main__":
    asyncio.run(seed())
