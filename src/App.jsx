import React, { useEffect, useMemo, useState } from "react";
import {
  PlusCircle,
  Trash2,
  PieChart as PieIcon,
  BarChart2,
  Calendar,
  FolderPlus,
  Folder,
  Wallet,
  ArrowLeft,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Import,
} from "lucide-react";
import * as XLSX from "xlsx";

/* ==========================
   Helpers
========================== */

const todayISO = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const loadLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const currency = (n) =>
  (Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const getMonthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const pad2 = (n) => String(n).padStart(2, "0");
const dateBG = (d) =>
  new Date(d).toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

/* ==========================
   Fixed income categories
========================== */
const INCOME_CATS = ["Заплата", "Свободна практика", "Друго"];

/* ==========================
   Viewport fix for mobile 100vh
========================== */
function useStableViewportHeight() {
  useEffect(() => {
    const set = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    set();
    window.addEventListener("resize", set, { passive: true });
    window.addEventListener("orientationchange", set, { passive: true });
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(set);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/* ==========================
   Mini Calendar (центриран модал)
========================== */
function MiniCalendar({ value, onSelect, onClose }) {
  const base = value ? new Date(value) : new Date();
  const [view, setView] = useState(
    new Date(base.getFullYear(), base.getMonth(), 1)
  );

  const y = view.getFullYear();
  const m = view.getMonth();

  const firstDow = new Date(y, m, 1).getDay(); // 0-6 (0=Sun)
  const shift = (firstDow + 6) % 7; // Monday first
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const grid = [];
  for (let i = 0; i < shift; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  const isToday = (d) => {
    const t = new Date();
    return d && t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  };

  const pick = (d) => {
    if (!d) return;
    const picked = `${y}-${pad2(m + 1)}-${pad2(d)}`;
    onSelect?.(picked);
    onClose?.();
  };

  const prevMonth = () =>
    setView((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setView((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4"
      style={{ paddingTop: "12vh" }}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[20rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#0b0f12] p-3 shadow-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-white/10"
            aria-label="Предишен месец"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold select-none">
            {view.toLocaleString("bg-BG", { month: "long", year: "numeric" })}
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-white/10"
            aria-label="Следващ месец"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-white/70 mb-1">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((d) => (
            <div key={d} className="text-center select-none">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) =>
            d ? (
              <button
                key={i}
                onClick={() => pick(d)}
                className={`h-10 rounded-xl text-sm touch-manipulation ${
                  isToday(d)
                    ? "bg-white/10 border border-white/20"
                    : "bg-white/5 border border-white/10"
                } hover:bg-white/15 active:scale-[0.98] transition`}
              >
                {d}
              </button>
            ) : (
              <div key={i} className="h-10" />
            )
          )}
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-lg hover:bg-white/10"
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
}

function MonthSpendCalendar({ monthDate, dailyData, onDayClick }) {
  const [hover, setHover] = React.useState(null); // {x,y,label,amount}
  const [selected, setSelected] = React.useState(null); // мобилен / клик
  const isTouch =
    typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches;
  const ref = React.useRef(null);

  // Намираме колко е „силният“ ден – за скала на цвета
  const max = useMemo(
    () => Math.max(1, ...dailyData.map((d) => d.expense || 0)),
    [dailyData]
  );

  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const firstDow = new Date(y, m, 1).getDay(); // 0=Нд..6=Съб
  const shift = (firstDow + 6) % 7; // Пн=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < shift; i++) cells.push({ empty: true, key: `e${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const obj =
      dailyData[d - 1] || {
        expense: 0,
        label: `${String(d).padStart(2, "0")}.${String(m + 1).padStart(2, "0")}`,
      };
    cells.push({
      empty: false,
      key: `d${d}`,
      day: d,
      label: obj.label,
      amount: obj.expense || 0,
    });
  }

  const colorFor = (amt) => {
    // 0 → почти без фон; max → #60a5fa плътно
    const opacity = Math.max(0.12, Math.min(0.9, (amt / max) * 0.9));
    return `rgba(96,165,250,${opacity})`; // #60a5fa
  };

  const onEnter = (e, c) => {
    if (c.empty) return;
    if (isTouch) return; // на touch не ползваме hover tooltip
    const rect = ref.current?.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - (rect?.left ?? 0);
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - (rect?.top ?? 0);
    setHover({ x, y, label: c.label, amount: c.amount });
  };
  const onLeave = () => !isTouch && setHover(null);

  const onClick = (c) => {
    if (c.empty) return;
    setSelected({ label: c.label, amount: c.amount }); // 🔒 остава фиксирано
    onDayClick?.(c);
  };

  return (
    <div className="relative">
      {/* Заглавие на дните */}
      <div className="grid grid-cols-7 gap-1 text-[11px] text-white/70 mb-1">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((d) => (
          <div key={d} className="text-center select-none">
            {d}
          </div>
        ))}
      </div>

      {/* Самият календар */}
      <div
        ref={ref}
        className="grid grid-cols-7 gap-1 select-none"
        onMouseLeave={onLeave}
        onTouchEnd={() => setTimeout(() => setHover(null), 120)}
      >
        {cells.map((c) =>
          c.empty ? (
            <div key={c.key} className="h-9 rounded-xl border border-transparent" />
          ) : (
            <button
              key={c.key}
              onMouseEnter={(e) => onEnter(e, c)}
              onMouseMove={(e) => onEnter(e, c)}
              onMouseLeave={onLeave}
              onClick={() => onClick(c)} // tap/click фиксира
              title={
                !isTouch ? `${c.label} — ${currency(c.amount)} лв.` : undefined
              }
              className="h-9 rounded-xl border border-white/10 text-xs leading-none flex items-center justify-center hover:opacity-90 active:scale-[0.98] transition"
              style={{
                background: c.amount
                  ? colorFor(c.amount)
                  : "rgba(255,255,255,0.06)",
              }}
              aria-label={`${c.label} — ${currency(c.amount)} лв.`}
            >
              {c.day}
            </button>
          )
        )}
      </div>

      {/* Tooltip (desktop) */}
      {!isTouch && hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-[#0b0f12] px-2 py-1 text-[12px] shadow"
          style={{ left: hover.x + 8, top: hover.y + 8 }}
        >
          <div className="text-white/70">{hover.label}</div>
          <div className="font-semibold">{currency(hover.amount)} лв.</div>
        </div>
      )}

      {/* Инфо за избран ден (mobile tap) */}
      {selected && (
        <div className="mt-2 text-l text-[#9ebee5] flex items-center justify-between gap-2">
          <div>
            <span className="font-medium text-white/60">Ден: </span>
            {selected.label} —{" "}
            <span className="font-bold text-[#60a5fa]">
              {currency(selected.amount)} лв.
            </span>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 text-white/70"
            aria-label="Изчисти избора"
          >
            х
          </button>
        </div>
      )}
    </div>
  );
}

/* ==========================
   Main App
========================== */
export default function App() {
  useStableViewportHeight();

  // Tabs
  const [tab, setTab] = useState("input");

  const [openRecent, setOpenRecent] = useState(false); // сгъваеми Последни записи
  const [openCatSums, setOpenCatSums] = useState(true); // Разходи по категории – collapsible

  // Data
  const [transactions, setTransactions] = useState(() =>
    loadLS("budget_tx", [])
  );

  // Expense categories only
  const defaultExpenseCats = ["Храна", "Транспорт", "Сметки", "Наем"];
  const [expenseCategories, setExpenseCategories] = useState(() => {
    const old = loadLS("budget_categories", defaultExpenseCats);
    return old.filter((c) => c !== "Доход");
  });

  // Wasteful ids (marked as "излишен")
  const [wasteful, setWasteful] = useState(
    () => new Set(loadLS("budget_waste_ids", []))
  );
  useEffect(() => saveLS("budget_waste_ids", Array.from(wasteful)), [wasteful]);

  // Form state
  const [type, setType] = useState("expense"); // income | expense
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(
    (type === "income" ? INCOME_CATS[0] : expenseCategories[0]) || ""
  );
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState(""); // 🆕 Бележка

  const [newCat, setNewCat] = useState("");
  const [showCal, setShowCal] = useState(false);

  // Month cursor for analysis
  const [monthCursor, setMonthCursor] = useState(() =>
    getMonthKey(new Date())
  );

  // Collapsibles in Analysis
  const [openCats, setOpenCats] = useState(false);
  const [openMonthRecords, setOpenMonthRecords] = useState(false);

  // Persist
  useEffect(() => saveLS("budget_tx", transactions), [transactions]);
  useEffect(() => saveLS("budget_categories", expenseCategories), [
    expenseCategories,
  ]);

  // Keep category in sync when switching type
  useEffect(() => {
    if (type === "income") setCategory(INCOME_CATS[0]);
    else setCategory(expenseCategories[0] || "");
  }, [type, expenseCategories]);

  // Lock body scroll while calendar is open
  useEffect(() => {
    if (showCal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showCal]);

  // Totals (all-time)
  const totals = useMemo(() => {
    let income = 0,
      expense = 0;
    for (const t of transactions)
      t.type === "income" ? (income += t.amount) : (expense += t.amount);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  // Month navigation
  const monthDate = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [monthCursor]);

  const prevMonth = () => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() - 1);
    setMonthCursor(getMonthKey(d));
  };
  const nextMonth = () => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + 1);
    setMonthCursor(getMonthKey(d));
  };

  // Month data
  const monthRange = useMemo(() => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    return { start, end };
  }, [monthDate]);

  const txThisMonth = useMemo(() => {
    const { start, end } = monthRange;
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }, [transactions, monthRange]);

  // Само текущия календарен месец (за "Последни записи")
  const txCurrentMonth = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }, [transactions]);

  const dailyExpenseData = useMemo(() => {
    const { start, end } = monthRange;
    const days = end.getDate();
    const arr = Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), i + 1);
      return {
        day: i + 1,
        label: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`,
        expense: 0,
      };
    });
    for (const t of txThisMonth) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date);
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < arr.length) arr[idx].expense += t.amount;
    }
    return arr;
  }, [txThisMonth, monthRange]);

  const monthTotals = useMemo(() => {
    let income = 0,
      expense = 0;
    for (const t of txThisMonth)
      t.type === "income" ? (income += t.amount) : (expense += t.amount);
    return { income, expense, balance: income - expense };
  }, [txThisMonth]);

  // Wasteful sum (only expenses in current month)
  const wastefulSum = useMemo(() => {
    return txThisMonth.reduce((sum, t) => {
      if (t.type === "expense" && wasteful.has(t.id)) sum += t.amount;
      return sum;
    }, 0);
  }, [txThisMonth, wasteful]);

  // Разходи по категории за избрания месец (само разходи)
  const monthExpenseByCat = useMemo(() => {
    const sums = new Map();
    for (const t of txThisMonth) {
      if (t.type !== "expense") continue;
      sums.set(t.category, (sums.get(t.category) || 0) + t.amount);
    }
    const arr = Array.from(sums, ([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value); // най-големите напред
    return arr;
  }, [txThisMonth]);

  // За скала на синьото (интензитет)
  const maxCatValue = useMemo(
    () => Math.max(1, ...monthExpenseByCat.map((x) => x.value)),
    [monthExpenseByCat]
  );

  // Фон според сумата (по-тъмно синьо = по-голяма сума)
  const catBg = (v) => {
    const opacity = Math.max(0.12, Math.min(0.9, (v / maxCatValue) * 0.9));
    return `rgba(96,165,250,${opacity})`; // #60a5fa
  };

  // Handlers
  const addTransaction = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    if (!category) return;

    const t = {
      id: crypto.randomUUID(),
      type,
      amount: amt,
      category,
      date,
      note: note.trim() || "",
    };
    setTransactions((prev) => [t, ...prev]);
    setAmount("");
    setNote("");
  };

  const removeTx = (id) =>
    setTransactions((prev) => prev.filter((t) => t.id !== id));

  const addExpenseCategory = () => {
    const c = (newCat || "").trim();
    if (!c) return;
    if (!expenseCategories.includes(c))
      setExpenseCategories((prev) => [...prev, c]);
    setNewCat("");
  };

  const removeExpenseCategory = (c) => {
    setExpenseCategories((prev) => prev.filter((x) => x !== c));
    setCategory((curr) =>
      type === "expense"
        ? expenseCategories.filter((x) => x !== c)[0] || ""
        : curr
    );
  };

  const toggleWasteful = (id) => {
    setWasteful((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ==========================
  // Експорт в Excel
  // ==========================
  const exportMonthToXLSX = () => {
    const rows = [["Дата", "Тип", "Категория", "Бележка", "Сума", "Излишен"]];

    const sorted = txThisMonth
      .slice()
      .sort(
        (a, b) => new Date(a.date).getDate() - new Date(b.date).getDate()
      );

    for (const t of sorted) {
      // ✅ Дата като истински Date за правилен Excel формат
      let excelDate = "";
      if (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
        const [y, m, d] = t.date.split("-").map(Number);
        const jsDate = new Date(y, m - 1, d);
        if (!isNaN(jsDate.getTime())) excelDate = jsDate;
      }

      const isWaste = t.type === "expense" && wasteful.has(t.id);

      rows.push([
        excelDate,
        t.type === "income" ? "Приход" : "Разход",
        t.category || "",
        (t.note || "").trim(),
        Number(t.amount) || 0,
        isWaste ? "Да" : "—",
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws["!ref"]);

    // Формат дата (A)
    for (let r = 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 });
      const cell = ws[addr];
      if (cell && cell.v instanceof Date) {
        cell.t = "d";
        cell.z = 'dd"."mm"."yyyy';
      }
    }

    // Формат сума (E)
    for (let r = 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 4 });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = "0.00";
      }
    }

    ws["!cols"] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 18 },
      { wch: 40 },
      { wch: 12 },
      { wch: 10 },
    ];
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: range.e.r, c: range.e.c },
      }),
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Месец");
    const fileName = `Razhodi_${monthDate.getFullYear()}-${String(
      monthDate.getMonth() + 1
    ).padStart(2, "0")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div
      className="w-full bg-[#0b0f12] text-[#e5e7eb]"
      style={{ minHeight: "calc(var(--vh, 1vh) * 100)", overflowX: "hidden" }}
    >
      <header
        className="sticky top-0 z-10 bg-[#0b0f12]/90 backdrop-blur border-b border-white/10"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      >
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 shrink-0" />{" "}
            <span className="truncate">Емилия</span>
          </h1>
          <nav className="flex gap-2 text-sm">
            <button
              onClick={() => setTab("input")}
              className={`px-3 py-1.5 rounded-xl border touch-manipulation ${
                tab === "input"
                  ? "bg-white/10 border-white/20"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              Въвеждане
            </button>
            <button
              onClick={() => setTab("analysis")}
              className={`px-3 py-1.5 rounded-xl border touch-manipulation ${
                tab === "analysis"
                  ? "bg-white/10 border-white/20"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              Анализ
            </button>
            <button
              onClick={exportMonthToXLSX}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 active:scale-[0.99] transition"
              title="Експорт на избрания месец в Excel"
            >
              <Import className="w-5 h-5 text-white" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 pb-28 sm:pb-24">
        {tab === "input" ? (
          <section className="space-y-6 mt-6 sm:mt-8">
            {/* Формата */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <form onSubmit={addTransaction} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2 active:scale-[0.99]">
                    <input
                      type="radio"
                      name="type"
                      checked={type === "expense"}
                      onChange={() => setType("expense")}
                    />
                    Разход
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2 active:scale-[0.99]">
                    <input
                      type="radio"
                      name="type"
                      checked={type === "income"}
                      onChange={() => setType("income")}
                    />
                    Приход
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <input
                      required
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value.replace(",", "."))
                      }
                      className="bg-transparent outline-none w-full"
                    />
                    <span>лв</span>
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <Calendar className="w-4 h-4" />
                      <button
                        type="button"
                        onClick={() => setShowCal((s) => !s)}
                        className="bg-transparent outline-none w-full text-left truncate"
                        title="Избор на дата"
                      >
                        {dateBG(date)}
                      </button>
                      {showCal && (
                        <button
                          type="button"
                          onClick={() => setShowCal(false)}
                          className="p-1 rounded-lg hover:bg-white/10"
                          aria-label="Затвори"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {showCal && (
                      <MiniCalendar
                        value={date}
                        onSelect={(picked) => setDate(picked)}
                        onClose={() => setShowCal(false)}
                      />
                    )}
                  </div>
                </div>

                {/* Категория */}
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <Folder className="w-4 h-4 shrink-0" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-transparent outline-none w-full"
                  >
                    {(type === "income" ? INCOME_CATS : expenseCategories).map(
                      (c) => (
                        <option
                          key={c}
                          value={c}
                          className="bg-[#0b0f12] text-[#e5e7eb]"
                        >
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* 🆕 Бележка */}
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Бележка (по желание)…"
                    className="bg-transparent outline-none w-full"
                    maxLength={140}
                  />
                </div>

                {/* Бутон Запази – малък и центриран */}
                <div className="flex justify-center mt-5">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/30 text-black px-6 py-2.5 text-sm font-semibold shadow-sm hover:shadow-md hover:bg-white/50 active:scale-[0.99] transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Последни записи */}
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 overflow-hidden p-3 sm:p-6">
              <button
                onClick={() => setOpenRecent((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
              >
                <span className="text-sm uppercase tracking-wider text-white/70">
                  Последни записи
                </span>
                {openRecent ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {openRecent && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  {transactions.length === 0 ? (
                    <p className="text-white/60 text-sm">Няма записи още.</p>
                  ) : (
                    <div
                      className="w-full overflow-x-auto"
                      role="region"
                      aria-label="Хоризонтално превъртане на последните записи"
                    >
                      <table className="w-full min-w-[720px] text-[12px] sm:text-sm leading-tight">
                        <thead className="bg-white/5">
                          <tr className="text-left text-white/70">
                            <th className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap">
                              Дата
                            </th>
                            <th className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap">
                              Тип
                            </th>
                            <th className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap">
                              Категория
                            </th>
                            <th className="px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap">
                              Бележка
                            </th>
                            <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-right whitespace-nowrap">
                              Сума
                            </th>
                            <th className="px-1.5 py-1.5 sm:px-3 sm:py-2"></th>
                          </tr>
                        </thead>

                        <tbody>
                          {txCurrentMonth
                            .slice()
                            .sort((a, b) => {
                              if (a.type !== b.type)
                                return a.type === "income" ? -1 : 1; // приходи първо
                              const da = new Date(a.date);
                              const db = new Date(b.date);
                              const dayCmp = da.getDate() - db.getDate();
                              if (dayCmp !== 0) return dayCmp;
                              return da - db; // tie-breaker
                            })
                            .map((t) => (
                              <tr
                                key={t.id}
                                className="border-t border-white/10"
                              >
                                <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-white/80 whitespace-nowrap">
                                  {dateBG(t.date)}
                                </td>

                                <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                                  <span
                                    className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-lg ${
                                      t.type === "income"
                                        ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                                        : "bg-rose-400/10 text-rose-300 border border-rose-400/20"
                                    }`}
                                  >
                                    {t.type === "income"
                                      ? "Приход"
                                      : "Разход"}
                                  </span>
                                </td>

                                <td
                                  className="px-2 py-1.5 sm:px-3 sm:py-2 text-white/80 whitespace-nowrap max-w-[28vw] sm:max-w-none truncate"
                                  title={t.category || ""}
                                >
                                  {t.category || "—"}
                                </td>

                                <td
                                  className="px-2 py-1.5 sm:px-3 sm:py-2 text-white/80 max-w-[34vw] sm:max-w-[40vw] truncate"
                                  title={t.note?.trim() ? t.note : ""}
                                >
                                  {t.note?.trim() ? t.note : "—"}
                                </td>

                                <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-right whitespace-nowrap">
                                  {currency(t.amount)} лв.
                                </td>

                                <td className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-right">
                                  <button
                                    className="p-1 rounded-lg hover:bg-white/10"
                                    onClick={() => removeTx(t.id)}
                                    aria-label="Изтрий"
                                    title="Изтрий"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {txCurrentMonth.length === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-3 py-4 text-center text-white/60"
                              >
                                Няма записи за текущия месец.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {/* Навигация по месеци */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl border border-white/10 hover:bg-white/10"
                  aria-label="Предишен месец"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-semibold truncate">
                  {monthDate.toLocaleString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl border border-white/10 hover:bg-white/10"
                  aria-label="Следващ месец"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Обобщение (месец) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-2">
              <StatCard
                title="Приход (м.)"
                value={`+ ${currency(monthTotals.income)} лв.`}
                icon={<BarChart2 className="w-4 h-4" />}
                subtle="text-emerald-300"
              />
              <StatCard
                title="Разход (м.)"
                value={`- ${currency(monthTotals.expense)} лв.`}
                icon={<PieIcon className="w-4 h-4" />}
                subtle="text-rose-300"
              />
              <StatCard
                title="Баланс (м.)"
                value={`${currency(monthTotals.balance)} лв.`}
                icon={<Wallet className="w-4 h-4" />}
                subtle={
                  monthTotals.balance >= 0 ? "text-sky-300" : "text-amber-300"
                }
              />
            </div>

            {/* Календар на разходите (месец) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70 mb-3">
                Календар на разходите
              </h3>
              <MonthSpendCalendar
                monthDate={monthDate}
                dailyData={dailyExpenseData}
                onDayClick={() => {}}
              />
            </div>

            {/* Разходи по категории (месец) */}
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <button
                onClick={() => setOpenCatSums((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
              >
                <span className="text-sm uppercase tracking-wider text-white/70">
                  Разходи по категории
                </span>
                {openCatSums ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {openCatSums && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  {monthExpenseByCat.length === 0 ? (
                    <p className="text-white/60 text-sm">
                      Няма разходи за този месец.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {monthExpenseByCat.map((c) => (
                        <div
                          key={c.name}
                          className="h-12 rounded-xl border border-white/10 px-3 py-2 flex items-center justify-between"
                          style={{ background: catBg(c.value) }}
                          title={`${c.name} — ${currency(c.value)} лв.`}
                        >
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {c.name}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold">
                            {currency(c.value)} лв.
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Категории (разходи) */}
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <button
                onClick={() => setOpenCats((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
              >
                <span className="text-sm uppercase tracking-wider text-white/70">
                  Категории (разходи)
                </span>
                {openCats ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {openCats && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  <div className="flex gap-2 mb-3">
                    <input
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      placeholder="Нова категория…"
                      className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
                    />
                    <button
                      type="button"
                      onClick={addExpenseCategory}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 hover:bg-emerald-500/20"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>

                  {expenseCategories.length === 0 ? (
                    <p className="text-white/60 text-sm">Няма категории.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {expenseCategories.map((c) => (
                        <li
                          key={c}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5"
                        >
                          <Folder className="w-4 h-4 opacity-70" />
                          <span className="max-w-[40vw] truncate">{c}</span>
                          <button
                            className="p-1 rounded-lg hover:bg-white/10"
                            title="Премахни"
                            onClick={() => removeExpenseCategory(c)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Записи (месец) */}
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <button
                onClick={() => setOpenMonthRecords((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
              >
                <span className="text-sm uppercase tracking-wider text-white/70">
                  Записи (месец)
                </span>
                {openMonthRecords ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {openMonthRecords && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  <div
                    className="w-full overflow-x-auto"
                    role="region"
                    aria-label="Хоризонтално превъртане на таблицата"
                  >
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-white/5">
                        <tr className="text-left text-white/70">
                          <th className="px-3 py-2">Дата</th>
                          <th className="px-3 py-2">Категория</th>
                          <th className="px-3 py-2">Бележка</th>
                          <th className="px-3 py-2 text-right">Сума</th>
                          <th className="px-3 py-2 text-center">Излишен</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {txThisMonth.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-4 text-center text-white/60"
                            >
                              Няма записи през този месец.
                            </td>
                          </tr>
                        ) : (
                          txThisMonth
                            .slice()
                            .sort((a, b) => {
                              if (a.type !== b.type)
                                return a.type === "income" ? -1 : 1;
                              const da = new Date(a.date);
                              const db = new Date(b.date);
                              const dayCmp = da.getDate() - db.getDate();
                              if (dayCmp !== 0) return dayCmp;
                              return da - db;
                            })
                            .map((t) => (
                              <tr key={t.id} className="border-t border-white/10">
                                <td className="px-3 py-2 text-white/80 whitespace-nowrap">
                                  {dateBG(t.date)}
                                </td>
                                <td className="px-3 py-2 text-white/80 whitespace-nowrap">
                                  {t.category}
                                </td>
                                <td className="px-3 py-2 text-white/70 max-w-[40vw] truncate">
                                  {t.note || "—"}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  {currency(t.amount)} лв.
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {t.type === "expense" ? (
                                    <input
                                      type="checkbox"
                                      checked={wasteful.has(t.id)}
                                      onChange={() => toggleWasteful(t.id)}
                                      aria-label="Маркирай като излишен разход"
                                    />
                                  ) : (
                                    <span className="text-white/30">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={() => removeTx(t.id)}
                                    className="p-1 rounded-lg hover:bg-white/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-sm text-white/80 flex items-center justify-between">
                    <span>Общо „излишни“ разходи за месеца:</span>
                    <span className="font-semibold">
                      {currency(wastefulSum)} лв.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer
        className="fixed bottom-0 left-0 right-0 bg-[#0b0f12]/95 backdrop-blur border-t border-white/10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}
      >
        <div className="max-w-xl mx-auto px-4 py-2 text-center text-xs text-white/60">
          Създадено с Любов ... @2025г
        </div>
      </footer>
    </div>
  );
}

function StatCard({ title, value, icon, subtle }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/60">
            {title}
          </div>
          <div className={`mt-1 text-sm sm:text-base font-semibold ${subtle}`}>
            {value}
          </div>
        </div>
        <div className="opacity-70 shrink-0">{icon}</div>
      </div>
    </div>
  );
}
