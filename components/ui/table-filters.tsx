"use client"

import * as React from "react"
import { Search, Filter, X, RefreshCw } from "lucide-react"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

export interface TableFiltersProps {
  className?: string
  // Search
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  
  // Date range
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  showDateFilter?: boolean
  
  // Status filter
  statusValue?: string
  onStatusChange?: (value: string) => void
  statusOptions?: FilterOption[]
  showStatusFilter?: boolean
  
  // Custom filters
  customFilters?: Array<{
    key: string
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }>
  
  // Actions
  onClearFilters?: () => void
  onRefresh?: () => void
  
  // Advanced filters toggle
  showAdvancedFilters?: boolean
  onToggleAdvanced?: () => void
  
  // Loading state
  isLoading?: boolean
}

export function TableFilters({
  className,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  dateRange,
  onDateRangeChange,
  showDateFilter = true,
  statusValue = "",
  onStatusChange,
  statusOptions = [],
  showStatusFilter = true,
  customFilters = [],
  onClearFilters,
  onRefresh,
  showAdvancedFilters = false,
  onToggleAdvanced,
  isLoading = false,
}: TableFiltersProps) {
  const hasActiveFilters = React.useMemo(() => {
    return (
      searchValue.length > 0 ||
      dateRange?.from ||
      (statusValue.length > 0 && statusValue !== "all") ||
      customFilters.some(filter => filter.value.length > 0 && filter.value !== "all")
    )
  }, [searchValue, dateRange, statusValue, customFilters])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Primary filters - always visible */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#455a54]/50" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10 h-9 bg-white border-[#455a54]/30 focus:border-[#455a54] font-winter-solid text-[#455a54] placeholder:text-[#455a54]/40 text-sm font-medium"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          {onToggleAdvanced && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={onToggleAdvanced}
                className={cn(
                  "h-9 px-3 font-winter-solid text-xs text-white border-0",
                  showAdvancedFilters
                    ? "bg-[#455a54] hover:bg-[#455a54]/90"
                    : "bg-[#9d684e] hover:bg-[#9d684e]/90"
                )}
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filtros
              </Button>
              {hasActiveFilters && !showAdvancedFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#455a54] border border-white" />
              )}
            </div>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9 w-9 p-0 bg-[#9d684e] hover:bg-[#9d684e]/90 border-0 text-white font-winter-solid"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {/* Advanced filters - collapsible, compact inline */}
      {showAdvancedFilters && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-[#455a54] bg-[#455a54]">
          {/* Date range filter */}
          {showDateFilter && onDateRangeChange && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 font-winter-solid shrink-0">
                Fechas
              </span>
              <DateRangePicker
                date={dateRange}
                onDateChange={onDateRangeChange}
                placeholder="Seleccionar"
              />
            </div>
          )}

          {/* Status filter */}
          {showStatusFilter && statusOptions.length > 0 && onStatusChange && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 font-winter-solid shrink-0">
                Estado
              </span>
              <Select value={statusValue || undefined} onValueChange={onStatusChange}>
                <SelectTrigger className="h-7 text-xs border-white/30 bg-white/10 focus:border-white font-winter-solid w-[140px] text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom filters */}
          {customFilters.map((filter) => (
            <div key={filter.key} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 font-winter-solid shrink-0">
                {filter.label}
              </span>
              <Select value={filter.value || undefined} onValueChange={filter.onChange}>
                <SelectTrigger className="h-7 text-xs border-white/30 bg-white/10 focus:border-white font-winter-solid w-[140px] text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Limpiar — solo visible si hay filtros activos */}
          {hasActiveFilters && onClearFilters && (
            <div className="ml-auto">
              <Button
                variant="ghost"
                onClick={onClearFilters}
                className="h-7 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/15 font-winter-solid border border-white/20"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Indicador compacto cuando el panel está cerrado y hay filtros activos */}
      {hasActiveFilters && !showAdvancedFilters && onClearFilters && (
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#455a54]" />
          <span className="text-xs text-[#455a54]/70 font-winter-solid">Filtros activos</span>
          <button
            onClick={onClearFilters}
            className="text-xs text-[#455a54]/50 hover:text-[#455a54] font-winter-solid underline underline-offset-2 ml-1"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  )
}