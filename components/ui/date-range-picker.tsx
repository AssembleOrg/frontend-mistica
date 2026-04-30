"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

export interface DateRangePickerProps {
  className?: string
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  fromPlaceholder?: string
  toPlaceholder?: string
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
  placeholder = "Seleccionar rango de fechas",
  fromPlaceholder = "Fecha desde",
  toPlaceholder = "Fecha hasta",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [dropdownRef, setDropdownRef] = React.useState<HTMLDivElement | null>(null)
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(date)
  const [firstClickDate, setFirstClickDate] = React.useState<Date | null>(null)

  // Sync with external prop changes
  React.useEffect(() => {
    setSelectedRange(date)
    if (!date) {
      setFirstClickDate(null)
    }
  }, [date])

  const formatDateRange = (dateRange: DateRange | undefined) => {
    if (!dateRange?.from) return placeholder
    
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(
        dateRange.to,
        "dd/MM/yyyy",
        { locale: es }
      )}`
    }
    
    // Solo mostrar fecha de inicio si es la única seleccionada
    if (dateRange.from && !dateRange.to) {
      return `Desde: ${format(dateRange.from, "dd/MM/yyyy", { locale: es })} (selecciona fin)`
    }
    
    return placeholder
  }

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRange(undefined)
    setFirstClickDate(null)
    onDateChange?.(undefined)
  }

  const handleDayClick = (day: Date) => {
    console.log('📅 Day clicked:', day, 'First click date:', firstClickDate)
    
    // Si no hay primera fecha seleccionada, esta es la primera
    if (!firstClickDate) {
      console.log('📅 Setting first date')
      setFirstClickDate(day)
      setSelectedRange({ from: day, to: undefined })
      return
    }
    
    // Si ya hay una primera fecha, esta es la segunda
    const from = firstClickDate < day ? firstClickDate : day
    const to = firstClickDate < day ? day : firstClickDate
    
    const newRange: DateRange = { from, to }
    console.log('📅 Setting complete range:', newRange)
    
    setSelectedRange(newRange)
    setFirstClickDate(null)
    onDateChange?.(newRange)
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, dropdownRef])

  return (
    <div className={cn("relative", className)} ref={setDropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-start text-left font-normal border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30 font-winter-solid",
          !selectedRange?.from && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        <span className="flex-1 truncate">{formatDateRange(selectedRange)}</span>
        {selectedRange?.from && (
          <X 
            className="ml-2 h-4 w-4 hover:bg-[#9d684e]/20 rounded p-0.5" 
            onClick={clearDate}
          />
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 z-50 w-auto bg-white border border-[#9d684e]/20 rounded-md shadow-lg">
          <div className="p-3">
            <div className="mb-2 text-sm text-[#455a54] font-winter-solid">
              {!selectedRange?.from 
                ? "Selecciona fecha de inicio" 
                : !selectedRange?.to && firstClickDate
                  ? "Ahora selecciona fecha de fin" 
                  : selectedRange?.from && selectedRange?.to
                    ? "Rango seleccionado - puedes cambiarlo"
                    : "Selecciona fecha de inicio"}
            </div>
            <Calendar
              mode="range"
              defaultMonth={selectedRange?.from || new Date()}
              selected={selectedRange}
              onSelect={(range) => {
                console.log('📅 Calendar onSelect called with:', range);
                console.log('📅 Range details:', {
                  from: range?.from,
                  to: range?.to,
                  hasFrom: !!range?.from,
                  hasTo: !!range?.to
                });
                // Ignoramos el onSelect automático y usamos nuestro handleDayClick
              }}
              onDayClick={handleDayClick}
              numberOfMonths={2}
              className="border-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}