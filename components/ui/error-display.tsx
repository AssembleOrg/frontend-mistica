/**
 * UI COMPONENT - ERROR DISPLAY
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'inline' | 'minimal';
  className?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'default',
  className
}: ErrorDisplayProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={onDismiss}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center justify-between p-3 border border-destructive/20 bg-destructive/5 rounded-lg',
        className
      )}>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
        <div className="flex gap-1">
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Reintentar
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('border-destructive/20', className)}>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="font-semibold text-lg mb-2">¡Ups! Algo salió mal</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <div className="flex gap-2">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          )}
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss}>
              Cerrar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}