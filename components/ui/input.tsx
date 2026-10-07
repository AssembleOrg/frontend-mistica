import * as React from "react"

import { cn } from "@/lib/utils"

// "06" -> "6", "-007" -> "-7"; deja "0", "0.5" y "-0.5" como están.
const LEADING_ZEROS = /^(-?)0+(?=\d)/

function Input({ className, type, onWheel, onFocus, onChange, ...props }: React.ComponentProps<"input">) {
  const isNumber = type === "number"
  return (
    <input
      type={type}
      // Al entrar a un numérico se selecciona todo: escribir reemplaza el 0 en
      // vez de quedar "06".
      onFocus={
        isNumber
          ? (e) => {
              e.currentTarget.select()
              onFocus?.(e)
            }
          : onFocus
      }
      // React no repinta "06" si el estado ya vale 6 (son el mismo número), así
      // que los ceros a la izquierda se limpian en el propio input.
      onChange={
        isNumber && onChange
          ? (e) => {
              const clean = e.currentTarget.value.replace(LEADING_ZEROS, "$1")
              if (clean !== e.currentTarget.value) e.currentTarget.value = clean
              onChange(e)
            }
          : onChange
      }
      // La rueda del mouse sobre un input numérico NO debe cambiar el valor
      // (clásico: scrolleás la página y te cambia un precio sin darte cuenta).
      onWheel={
        type === "number"
          ? (e) => {
              e.currentTarget.blur()
              onWheel?.(e)
            }
          : onWheel
      }
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 sm:h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 sm:py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm touch-target",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
