'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Error en la aplicación:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-rosa-claro)]">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-[var(--color-terracota)] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[var(--color-verde-profundo)] mb-2">
              Algo salió mal
            </h1>
            <p className="text-[var(--color-ciruela-oscuro)] mb-6">
              Se produjo un error inesperado
            </p>
            <Button
              onClick={this.handleReload}
              className="bg-[var(--color-verde-profundo)] hover:bg-[var(--color-verde-profundo)]/90 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recargar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}