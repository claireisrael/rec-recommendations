"use client";

import { useState, useMemo } from "react";

export function useYearFilter(availableYears, initialYear) {
  const defaultYear = initialYear ?? availableYears[0] ?? new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const yearOptions = useMemo(
    () => availableYears.sort((a, b) => b - a),
    [availableYears]
  );

  return {
    selectedYear,
    setSelectedYear,
    yearOptions,
  };
}
