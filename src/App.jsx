import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));

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

  const prevMonth = () => setView((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setView((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4" style={{ paddingTop: "12vh" }}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[20rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#0b0f12] p-3 shadow-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10" aria-label="Предишен месец">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold select-none">
            {view.toLocaleString("bg-BG", { month: "long", year: "numeric" })}
          </div>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10" aria-label="Следващ месец">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-white/70 mb-1">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((d) => (
            <div key={d} className="text-center select-none">{d}</div>
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
          <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10">
            Затвори
          </button>
        </div>
      </div>
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

  // Data
  const [transactions, setTransactions] = useState(() => loadLS("budget_tx", []));

  // Expense categories only
  const defaultExpenseCats = ["Храна", "Транспорт", "Сметки", "Наем"];
  const [expenseCategories, setExpenseCategories] = useState(() => {
    const old = loadLS("budget_categories", defaultExpenseCats);
    return old.filter((c) => c !== "Доход");
  });

  // Form state
  const [type, setType] = useState("expense"); // income | expense
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(
    (type === "income" ? INCOME_CATS[0] : expenseCategories[0]) || ""
  );
  const [date, setDate] = useState(todayISO());

  const [newCat, setNewCat] = useState("");
  const [showCal, setShowCal] = useState(false);

  // Month cursor for analysis
  const [monthCursor, setMonthCursor] = useState(() => getMonthKey(new Date()));

  // Persist
  useEffect(() => saveLS("budget_tx", transactions), [transactions]);
  useEffect(() => saveLS("budget_categories", expenseCategories), [expenseCategories]);

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
      return () => { document.body.style.overflow = prev; };
    }
  }, [showCal]);

  // Totals
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of transactions) t.type === "income" ? (income += t.amount) : (expense += t.amount);
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
    let income = 0, expense = 0;
    for (const t of txThisMonth) t.type === "income" ? (income += t.amount) : (expense += t.amount);
    return { income, expense, balance: income - expense };
  }, [txThisMonth]);

  // Chart sizing / scroll
  const chartScrollRef = useRef(null);
  const [chartViewportW, setChartViewportW] = useState(320);
  useEffect(() => {
    const el = chartScrollRef.current;
    const measure = () => {
      if (!el) return;
      setChartViewportW(el.clientWidth || 320);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el) ro.observe(el);
    const onOC = () => measure();
    window.addEventListener("orientationchange", onOC, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", onOC);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const perDay = 36;
  const chartNeededW = dailyExpenseData.length * perDay;
  const chartWidth = Math.max(chartViewportW, chartNeededW);

  // Handlers
  const addTransaction = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    if (!category) return;

    const t = { id: crypto.randomUUID(), type, amount: amt, category, date };
    setTransactions((prev) => [t, ...prev]);
    setAmount("");
  };

  const removeTx = (id) => setTransactions((prev) => prev.filter((t) => t.id !== id));

  const addExpenseCategory = () => {
    const c = (newCat || "").trim();
    if (!c) return;
    if (!expenseCategories.includes(c)) setExpenseCategories((prev) => [...prev, c]);
    setNewCat("");
  };

  const removeExpenseCategory = (c) => {
    setExpenseCategories((prev) => prev.filter((x) => x !== c));
    setCategory((curr) => (type === "expense" ? (expenseCategories.filter((x) => x !== c)[0] || "") : curr));
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
            <Wallet className="w-5 h-5 shrink-0" /> <span className="truncate">Емилия</span>
          </h1>
          <nav className="flex gap-2 text-sm">
            <button
              onClick={() => setTab("input")}
              className={`px-3 py-1.5 rounded-xl border touch-manipulation ${
                tab === "input" ? "bg-white/10 border-white/20" : "border-white/10 hover:bg-white/5"
              }`}
            >
              Въвеждане
            </button>
            <button
              onClick={() => setTab("analysis")}
              className={`px-3 py-1.5 rounded-xl border touch-manipulation ${
                tab === "analysis" ? "bg-white/10 border-white/20" : "border-white/10 hover:bg-white/5"
              }`}
            >
              Анализ
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 pb-28 sm:pb-24">
        {tab === "input" ? (
          <section className="space-y-6 mt-6 sm:mt-8">

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
                      onChange={(e) => setAmount(e.target.value.replace(",", "."))}
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
                        {date}
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
                      <MiniCalendar value={date} onSelect={(picked) => setDate(picked)} onClose={() => setShowCal(false)} />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <Folder className="w-4 h-4 shrink-0" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-transparent outline-none w-full"
                    >
                      {(type === "income" ? INCOME_CATS : expenseCategories).map((c) => (
                        <option key={c} value={c} className="bg-[#0b0f12] text-[#e5e7eb]">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                
                <div className="flex justify-center mt-5">
                   <button
                      type="submit"
                       className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/30 text-black px-6 py-2.5 text-sm font-semibold shadow-sm hover:shadow-md hover:bg-white/50 active:scale-[0.99] transition-all"
                    >
                        <PlusCircle className="w-4 h-4" /> Запази
                      </button>
                </div>

              </form>
            </div>

           <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden p-4 sm:p-6">

              <div className="w-full overflow-x-auto" role="region" aria-label="Хоризонтално превъртане на таблицата">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-white/5">
                    <tr className="text-left text-white/70">
                      <th className="px-3 py-2">Дата</th>
                      <th className="px-3 py-2">Тип</th>
                      <th className="px-3 py-2">Категория</th>
                      <th className="px-3 py-2 text-right">Сума</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {txThisMonth.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-white/60">
                          Няма записи през този месец.
                        </td>
                      </tr>
                    ) : (
                      txThisMonth
                        .slice()
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((t) => (
                          <tr key={t.id} className="border-t border-white/10">
                            <td className="px-3 py-2 text-white/80 whitespace-nowrap">{t.date}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  t.type === "income"
                                    ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                                    : "bg-rose-400/10 text-rose-300 border border-rose-400/20"
                                }`}
                              >
                                {t.type === "income" ? "Приход" : "Разход"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-white/80 max-w-[40vw] truncate">{t.category}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{currency(t.amount)} лв.</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => removeTx(t.id)} className="p-1 rounded-lg hover:bg-white/10">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (

          <section className="space-y-4">
            {/* Навигация по месеци – САМО навигация */}
<div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
  <div className="flex items-center justify-between gap-2">
    <button onClick={prevMonth} className="p-2 rounded-xl border border-white/10 hover:bg-white/10" aria-label="Предишен месец">
      <ArrowLeft className="w-4 h-4" />
    </button>
    <h2 className="text-base font-semibold truncate">
      {monthDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
    </h2>
    <button onClick={nextMonth} className="p-2 rounded-xl border border-white/10 hover:bg-white/10" aria-label="Следващ месец">
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
</div>

{/* Обобщение (месец) – без контейнер */}
<div className="grid grid-cols-3 gap-2 sm:gap-3">
  <StatCard
    title="Приход"
    value={` ${currency(monthTotals.income)} лв.`}
    icon={<BarChart2 className="w-4 h-4" />}
    subtle="text-emerald-300"
  />
  <StatCard
    title="Разход"
    value={`${currency(monthTotals.expense)} лв.`}
    icon={<PieIcon className="w-4 h-4" />}
    subtle="text-rose-300"
  />
  <StatCard
    title="Баланс"
    value={`${currency(monthTotals.balance)} лв.`}
    icon={<Wallet className="w-4 h-4" />}
    subtle={monthTotals.balance >= 0 ? "text-sky-300" : "text-amber-300"}
  />
</div>



            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70 mb-3">Разходи по дни</h3>

              <div
                ref={chartScrollRef}
                className="w-full overflow-x-auto touch-pan-x"
                role="region"
                aria-label="Хоризонтално превъртане на дневната диаграма"
              >
                <div className="h-56" style={{ width: `${chartWidth}px` }}>
                  <BarChart
                    width={chartWidth}
                    height={220}
                    data={dailyExpenseData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip
                      cursor={false}
                      wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none" }}
                      contentStyle={{
                        background: "#0b0f12",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#e5e7eb",
                      }}
                      labelFormatter={(v) => `Дата -  ${v}`}
                      formatter={(v) => [`${currency(v)} лв.`, "Разход"]}
                    />
                    <Bar dataKey="expense" fill="#60a5fa" barSize={22} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-white/50">* Плъзни хоризонтално, ако не се събира.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70 mb-3">Категории (разходи)</h3>
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
                    <li key={c} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5">
                      <Folder className="w-4 h-4 opacity-70" />
                      <span className="max-w-[40vw] truncate">{c}</span>
                      <button className="p-1 rounded-lg hover:bg-white/10" title="Премахни" onClick={() => removeExpenseCategory(c)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-white/50 mt-3">
                * Категориите за <strong>приходи</strong> са фиксирани: „Заплата“, „Свободна практика“, „Друго“.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer
        className="fixed bottom-0 left-0 right-0 bg-[#0b0f12]/95 backdrop-blur border-t border-white/10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}
      >
        <div className="max-w-xl mx-auto px-4 py-2 text-center text-xs text-white/60">
          
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
          <div className="text-[11px] uppercase tracking-wider text-white/60">{title}</div>
          <div className={`mt-1 text-sm sm:text-base font-semibold ${subtle}`}>{value}</div>
        </div>
        <div className="opacity-70 shrink-0">{icon}</div>
      </div>
    </div>
  );
}
