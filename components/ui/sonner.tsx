"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        style: {
          background: '#ffffff',
          border: '1px solid #9d684e20',
          color: '#455a54',
          fontFamily: 'var(--font-geist-sans)',
        },
        className: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-[#455a54] group-[.toaster]:border-[#9d684e]/20 group-[.toaster]:shadow-lg',
        descriptionClassName: 'group-[.toast]:text-[#455a54]/70',
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#455a54",
          "--normal-border": "#9d684e20",
          "--success-bg": "#f0f9ff",
          "--success-text": "#455a54",
          "--success-border": "#9d684e",
          "--error-bg": "#fef2f2",
          "--error-text": "#4e4247",
          "--error-border": "#ef4444",
          "--warning-bg": "#fffbeb",
          "--warning-text": "#455a54",
          "--warning-border": "#f59e0b",
          "--info-bg": "#f8fafc",
          "--info-text": "#455a54",
          "--info-border": "#6366f1",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
