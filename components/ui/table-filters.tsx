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
              className="pl-10 border-[#9d684e]/20 focus:border-[#9d684e] font-winter-solid"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          {onToggleAdvanced && (
            <Button
              variant="outline"
              onClick={onToggleAdvanced}
              className={cn(
                "border-[#9d684e]/20 font-winter-solid",
                showAdvancedFilters 
                  ? "bg-[#efcbb9]/30 text-[#455a54]" 
                  : "text-[#455a54] hover:bg-[#efcbb9]/30"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          )}
          
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 font-winter-solid"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}

          {hasActiveFilters && onClearFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="border-red-200 text-red-600 hover:bg-red-50 font-winter-solid"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Advanced filters - collapsible */}
      {showAdvancedFilters && (
        <Card className="border-[#9d684e]/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Date range filter */}
              {showDateFilter && onDateRangeChange && (
                <div className="space-y-2">
                  <Label className="text-[#455a54] font-winter-solid text-sm">
                    Rango de fechas
                  </Label>
                  <DateRangePicker
                    date={dateRange}
                    onDateChange={onDateRangeChange}
                    placeholder="Seleccionar fechas"
                  />
                </div>
              )}

              {/* Status filter */}
              {showStatusFilter && statusOptions.length > 0 && onStatusChange && (
                <div className="space-y-2">
                  <Label className="text-[#455a54] font-winter-solid text-sm">
                    Estado
                  </Label>
                  <Select value={statusValue || undefined} onValueChange={onStatusChange}>
                    <SelectTrigger className="border-[#9d684e]/20 focus:border-[#9d684e] font-winter-solid">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
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
                <div key={filter.key} className="space-y-2">
                  <Label className="text-[#455a54] font-winter-solid text-sm">
                    {filter.label}
                  </Label>
                  <Select value={filter.value || undefined} onValueChange={filter.onChange}>
                    <SelectTrigger className="border-[#9d684e]/20 focus:border-[#9d684e] font-winter-solid">
                      <SelectValue placeholder={`Todos los ${filter.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los {filter.label.toLowerCase()}</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active filters indicator */}
      {hasActiveFilters && !showAdvancedFilters && (
        <div className="flex items-center gap-2 text-sm text-[#455a54]/70 font-winter-solid">
          <Filter className="h-4 w-4" />
          <span>Filtros activos</span>
          {onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
            >
              Limpiar todo
            </Button>
          )}
        </div>
      )}
    </div>
  )
}