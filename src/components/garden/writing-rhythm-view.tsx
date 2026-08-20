"use client";

import { useState, useRef, useEffect } from "react";
import { GardenLink } from "./garden-link";
import { Flame, Calendar, Target, Activity, ChevronLeft, ChevronRight, CheckCircle2, PenTool, ChevronDown, Clock } from "lucide-react";
import type { WritingStatsSummary } from "@/lib/writing-stats";

export function WritingRhythmView({ stats }: { stats: WritingStatsSummary }) {
  const {
    currentStreak,
    longestStreak,
    todayWords,
    dailyGoal,
    totalActiveDays,
    totalWordsRecorded,
    avgWordsPerActiveDay,
    last30Days,
    monthlyHistory = [],
    hourlyDistribution = [],
    peakWritingTimeLabel = "",
  } = stats;

  const [selectedMonth, setSelectedMonth] = useState<string>("30days");
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close custom picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));

  // Determine active month to display
  const activeMonthData = monthlyHistory.find((m) => m.yearMonth === selectedMonth);

  // Build list of available yearMonths for prev/next navigation (newest first)
  const allOptions = ["30days", ...monthlyHistory.map((m) => m.yearMonth)];
  const currentIdx = allOptions.indexOf(selectedMonth);
  const canGoPrev = currentIdx < allOptions.length - 1; // older
  const canGoNext = currentIdx > 0; // newer

  const goPrev = () => {
    if (canGoPrev) setSelectedMonth(allOptions[currentIdx + 1]);
  };
  const goNext = () => {
    if (canGoNext) setSelectedMonth(allOptions[currentIdx - 1]);
  };

  // Parse selected into month/year for the dual picker
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const [pickerYear, setPickerYear] = useState<number>(
    selectedMonth === "30days" ? currentYear : parseInt(selectedMonth.slice(0, 4))
  );

  const selectedMonthNum = selectedMonth === "30days" ? null : parseInt(selectedMonth.slice(5, 7));
  const selectedYear = selectedMonth === "30days" ? null : parseInt(selectedMonth.slice(0, 4));

  // Available years: dynamically calculated from system clock & all note data years
  const dataYears = monthlyHistory.map((m) => parseInt(m.yearMonth.slice(0, 4)));
  const maxYear = dataYears.length > 0 ? Math.max(currentYear, ...dataYears) : currentYear;
  const minYear = dataYears.length > 0 ? Math.min(currentYear, ...dataYears) : currentYear;
  const availableYears: number[] = [];
  for (let y = maxYear; y >= minYear; y--) availableYears.push(y);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);

  // Months with actual writing data (totalWords > 0 or activeDays > 0) for the pickerYear
  const monthsWithDataInPickerYear = monthlyHistory
    .filter((m) => m.yearMonth.startsWith(String(pickerYear)) && (m.totalWords > 0 || m.activeDays > 0))
    .map((m) => parseInt(m.yearMonth.slice(5, 7)));

  const handleSelectMonthYear = (monthNum: number, year: number) => {
    const ym = `${year}-${String(monthNum).padStart(2, "0")}`;
    setSelectedMonth(ym);
    setIsPickerOpen(false);
  };

  const getLabel = () => {
    if (selectedMonth === "30days") return "Past 30 Days";
    if (selectedYear && selectedMonthNum) {
      return `${monthNamesFull[selectedMonthNum - 1]} ${selectedYear}`;
    }
    return "Select Month";
  };

  return (
    <div className="garden-fade-in mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <nav className="mb-2 text-sm text-muted-foreground">
          <GardenLink href="/" className="hover:text-garden">
            ← back to garden
          </GardenLink>
        </nav>
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <Flame className="h-7 w-7 text-garden" />
          Writing Rhythm
        </h1>
        <p className="mt-2 text-muted-foreground">
          Daily note-taking habit, writing velocity, and active streaks.
        </p>
      </header>

      {/* Summary stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {currentStreak} <span className="text-xs font-mono text-muted-foreground">days</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            current streak
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {longestStreak} <span className="text-xs font-mono text-muted-foreground">days</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            longest streak
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {todayWords.toLocaleString()} <span className="text-xs font-mono text-muted-foreground">words</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            today&apos;s output
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {avgWordsPerActiveDay.toLocaleString()} <span className="text-xs font-mono text-muted-foreground">w/day</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            active pace
          </div>
        </div>
      </div>

      {/* Target Progress */}
      <section className="rounded-lg border border-border bg-surface/30 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
          <Target className="h-5 w-5 text-garden" />
          Daily Target Progress
        </h2>

        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
          <span>{todayWords} of {dailyGoal} words written today</span>
          <span>{goalPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-border">
          <div
            className="h-full rounded-full bg-garden transition-all duration-300"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </section>

      {/* Activity History */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-heading">
            <Calendar className="h-5 w-5 text-garden" />
            Activity History
          </h2>
        </div>

        {/* Month + Year Navigator */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Prev arrow */}
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              className="rounded-md border border-border bg-surface/40 p-1.5 text-muted-foreground transition-colors hover:border-garden/40 hover:text-garden disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>



            {/* Custom Month + Year Popover Trigger */}
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(!isPickerOpen)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/40 px-3 py-1.5 font-mono text-xs font-medium text-foreground transition-colors hover:border-border/80 hover:bg-surface/60"
              >
                <span>{getLabel()}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isPickerOpen ? "rotate-180 text-foreground" : "text-muted-foreground"}`} />
              </button>

              {/* Custom Dark Popover Menu */}
              {isPickerOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-background p-4 shadow-2xl backdrop-blur-md garden-fade-in">
                  <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="font-mono text-xs text-muted-foreground">Select Year</span>
                    {/* Year Stepper Navigation (Go to ANY year!) */}
                    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-surface/40 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setPickerYear(pickerYear - 1)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Previous year"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={pickerYear || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setPickerYear(val);
                          } else if (e.target.value === "") {
                            setPickerYear(0);
                          }
                        }}
                        onBlur={() => {
                          if (!pickerYear || pickerYear < 1900 || pickerYear > 2100) {
                            setPickerYear(currentYear);
                          }
                        }}
                        className="w-12 bg-transparent text-center font-mono text-xs font-bold text-foreground focus:outline-none focus:bg-surface focus:ring-1 focus:ring-garden/40 rounded transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setPickerYear(pickerYear + 1)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Next year"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Month Grid (3x4 - All 12 months uniformly active) */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {allMonths.map((m) => {
                      const isSelected = selectedYear === pickerYear && selectedMonthNum === m;
                      const hasData = monthsWithDataInPickerYear.includes(m);

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMonthYear(m, pickerYear)}
                          className={`relative rounded-lg border py-2 text-center font-mono text-xs transition-colors ${
                            isSelected
                              ? "border-garden bg-garden/20 font-bold text-garden shadow-xs"
                              : "border-border/60 bg-surface/30 text-foreground hover:bg-surface/60 hover:border-border"
                          }`}
                        >
                          {monthNames[m - 1]}
                          {hasData && !isSelected && (
                            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-garden/80" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Past 30 Days Quick Option */}
                  <div className="mt-3 border-t border-border/60 pt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth("30days");
                        setIsPickerOpen(false);
                      }}
                      className={`w-full rounded-lg border py-1.5 text-center font-mono text-xs transition-colors ${
                        selectedMonth === "30days"
                          ? "border-border bg-surface text-foreground font-bold"
                          : "border-border/40 bg-surface/30 text-muted-foreground hover:text-foreground hover:bg-surface/60"
                      }`}
                    >
                      Past 30 Days Overview
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Next arrow */}
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="rounded-md border border-border bg-surface/40 p-1.5 text-muted-foreground transition-colors hover:border-garden/40 hover:text-garden disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Summary stat for selected period */}
          {activeMonthData && (
            <span className="font-mono text-xs text-muted-foreground">
              {activeMonthData.activeDays} active day{activeMonthData.activeDays !== 1 ? "s" : ""} · <span className="text-garden font-medium">{activeMonthData.totalWords.toLocaleString()} words</span>
            </span>
          )}
        </div>

        {/* Clean Activity Grid */}
        {selectedMonth === "30days" ? (
          <div className="rounded-lg border border-border bg-surface/30 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-heading">
                Past 30 Days
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                Recent writing velocity
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-6">
              {last30Days.map((d) => (
                <div
                  key={d.date}
                  className={`rounded-md border p-2.5 text-center transition-all ${
                    d.words > 0
                      ? d.goalMet
                        ? "border-garden/50 bg-garden/15 shadow-xs"
                        : "border-garden/30 bg-garden/10"
                      : "border-border/40 bg-surface/20 opacity-40 hover:opacity-70"
                  }`}
                >
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {d.formattedDate}
                  </div>
                  {d.words > 0 ? (
                    <>
                      <div className="mt-1 font-serif text-sm font-semibold text-garden">
                        {d.words}
                      </div>
                      <div className="mt-0.5 text-[9px] font-mono text-muted-foreground">
                        words
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-[10px] font-mono text-muted-foreground/40">
                      —
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeMonthData ? (
          <div className="rounded-lg border border-border bg-surface/30 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-heading">
                {activeMonthData.monthName}
              </h3>
              <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>{activeMonthData.activeDays} active days</span>
                <span>•</span>
                <span className="text-garden font-medium">{activeMonthData.totalWords.toLocaleString()} words</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 md:grid-cols-7">
              {activeMonthData.days.map((d) => (
                <div
                  key={d.date}
                  className={`rounded-md border p-2.5 text-center transition-all ${
                    d.words > 0
                      ? d.goalMet
                        ? "border-garden/50 bg-garden/15 shadow-xs"
                        : "border-garden/30 bg-garden/10"
                      : "border-border/40 bg-surface/20 opacity-40 hover:opacity-70"
                  }`}
                >
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {d.formattedDate}
                  </div>
                  {d.words > 0 ? (
                    <>
                      <div className="mt-1 font-serif text-sm font-semibold text-garden">
                        {d.words}
                      </div>
                      <div className="mt-0.5 text-[9px] font-mono text-muted-foreground">
                        words
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-[10px] font-mono text-muted-foreground/40">
                      —
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface/30 p-6 text-center text-sm text-muted-foreground">
            No activity recorded for this month.
          </div>
        )}
      </section>

      {/* Totals */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface/30 p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-garden" />
            Total Active Days
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-heading">
            {totalActiveDays} <span className="text-xs font-mono text-muted-foreground">days</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-garden" />
            Total Words Recorded
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-heading">
            {totalWordsRecorded.toLocaleString()} <span className="text-xs font-mono text-muted-foreground">words</span>
          </div>
        </div>
      </section>

      {/* Peak Writing Hours */}
      {hourlyDistribution.some((h) => h.words > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-heading">
              <Clock className="h-5 w-5 text-garden" />
              Peak Writing Hours
            </h2>
            <span className="font-mono text-xs text-muted-foreground">{peakWritingTimeLabel}</span>
          </div>
          <div className="rounded-lg border border-border bg-surface/30 p-5">
            {/* Fixed-height bar chart: 80px container, bars in pixels */}
            <div className="relative flex items-end gap-px" style={{ height: 80 }}>
              {(() => {
                const maxW = Math.max(1, ...hourlyDistribution.map((x) => x.words));
                return hourlyDistribution.map((h) => {
                  const barPx = h.words > 0 ? Math.max(6, Math.round((h.words / maxW) * 72)) : 3;
                  return (
                    <div
                      key={h.hour}
                      className="group relative flex flex-1 flex-col items-center justify-end"
                      style={{ height: "100%" }}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-colors ${
                          h.words > 0 ? "bg-garden/70 hover:bg-garden" : "bg-border/30"
                        }`}
                        style={{ height: barPx }}
                      />
                      {h.words > 0 && (
                        <div className="pointer-events-none absolute bottom-full mb-1.5 hidden rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground shadow-md group-hover:block z-20 whitespace-nowrap">
                          {h.label} · {h.words.toLocaleString()} words
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground/50">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
