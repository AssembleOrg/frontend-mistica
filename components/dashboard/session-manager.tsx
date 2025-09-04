/**
 * Multi-Session Manager Component
 * 
 * Provides UI for managing multiple cashier sessions
 * Prevents conflicts and enables session switching
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  ShoppingCart, 
  Clock, 
  UserCheck, 
  UserX, 
  Plus,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/lib/sales-calculations';
import { cn } from '@/lib/utils';

interface SessionManagerProps {
  className?: string;
  showCreateButton?: boolean;
  showSwitchButtons?: boolean;
  compact?: boolean;
}

export function SessionManager({
  className,
  showCreateButton = true,
  showSwitchButtons = true,
  compact = false
}: SessionManagerProps) {
  const { user } = useAuthStore();
  const {
    currentSession,
    allSessions,
    activeOrders,
    createNewSession,
    switchToSession,
    closeCurrentSession,
  } = useSessionManager();

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      createNewSession();
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getSessionStatus = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return { color: 'secondary', text: 'Inactive' };
    
    if (session.cart.length > 0) return { color: 'outline', text: 'Items in Cart' };
    
    const sessionOrders = activeOrders.filter(order => order.sessionId === sessionId);
    if (sessionOrders.length > 0) return { color: 'secondary', text: 'Pending Orders' };
    
    return { color: 'default', text: 'Ready' };
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant={currentSession ? 'default' : 'secondary'}>
          <Users className="h-3 w-3 mr-1" />
          {currentSession ? `Sesión: ${currentSession.employee.name}` : 'Sin sesión'}
        </Badge>
        
        {currentSession && (
          <Badge variant="outline">
            <ShoppingCart className="h-3 w-3 mr-1" />
            {currentSession.cart.length}
          </Badge>
        )}
        
        {showCreateButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateSession}
            disabled={isCreating}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('border-[#9d684e]/20', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#455a54] font-tan-nimbus flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Sesiones
          </CardTitle>
          
          {showCreateButton && (
            <Button
              size="sm"
              onClick={handleCreateSession}
              disabled={isCreating || !user}
              className="bg-[#9d684e] hover:bg-[#9d684e]/90"
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Nueva Sesión
            </Button>
          )}
        </div>
        
        {currentSession && (
          <div className="text-sm text-[#455a54]/70 font-winter-solid">
            Sesión activa: {currentSession.employee.name}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Session Info */}
        {currentSession && (
          <div className="p-4 bg-[#efcbb9]/20 rounded-lg border border-[#9d684e]/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#9d684e]" />
                <span className="font-medium text-[#455a54]">Sesión Actual</span>
              </div>
              <Badge variant={getSessionStatus(currentSession.id).color as "default" | "secondary" | "outline"}>
                {getSessionStatus(currentSession.id).text}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#455a54]/70">Empleado:</span>
                <div className="font-medium text-[#455a54]">{currentSession.employee.name}</div>
              </div>
              <div>
                <span className="text-[#455a54]/70">Rol:</span>
                <div className="font-medium text-[#455a54] capitalize">{currentSession.employee.role}</div>
              </div>
              <div>
                <span className="text-[#455a54]/70">Items en carrito:</span>
                <div className="font-medium text-[#455a54]">{currentSession.cart.length}</div>
              </div>
              <div>
                <span className="text-[#455a54]/70">Última actividad:</span>
                <div className="font-medium text-[#455a54]">
                  {formatLastActivity(currentSession.lastActivity)}
                </div>
              </div>
            </div>
            
            {currentSession.customerId && (
              <div className="mt-3 pt-3 border-t border-[#9d684e]/10">
                <span className="text-[#455a54]/70 text-sm">Cliente asignado:</span>
                <div className="font-medium text-[#455a54]">{currentSession.customerName}</div>
              </div>
            )}
            
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={closeCurrentSession}
                className="border-[#9d684e]/20 text-[#455a54] hover:bg-[#efcbb9]/30"
              >
                <UserX className="h-3 w-3 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        )}

        {/* All Sessions List */}
        {allSessions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-[#455a54] text-sm">Todas las Sesiones Activas</h4>
            
            {allSessions.map((session) => {
              const status = getSessionStatus(session.id);
              const isCurrent = currentSession?.id === session.id;
              const sessionOrders = activeOrders.filter(order => order.sessionId === session.id);
              
              return (
                <div
                  key={session.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    isCurrent 
                      ? 'bg-[#efcbb9]/30 border-[#9d684e]/30' 
                      : 'bg-white border-[#9d684e]/10 hover:bg-[#efcbb9]/10'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-[#455a54] text-sm">
                          {session.employee.name}
                        </div>
                        <div className="text-xs text-[#455a54]/70">
                          {session.employee.role} • {formatLastActivity(session.lastActivity)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          {session.cart.length}
                        </Badge>
                        
                        {sessionOrders.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {sessionOrders.length}
                          </Badge>
                        )}
                        
                        <Badge 
                          variant={status.color as "default" | "secondary" | "outline"}
                          className="text-xs"
                        >
                          {status.text}
                        </Badge>
                      </div>
                    </div>

                    {!isCurrent && showSwitchButtons && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => switchToSession(session.id)}
                        className="text-[#455a54] hover:bg-[#efcbb9]/20"
                      >
                        Cambiar
                      </Button>
                    )}
                  </div>
                  
                  {session.cart.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#9d684e]/10">
                      <div className="text-xs text-[#455a54]/70 mb-1">Items en carrito:</div>
                      <div className="space-y-1">
                        {session.cart.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-[#455a54]">{item.product.name}</span>
                            <span className="text-[#455a54]/70">
                              {item.quantity}x {formatCurrency(item.product.price)}
                            </span>
                          </div>
                        ))}
                        {session.cart.length > 3 && (
                          <div className="text-xs text-[#455a54]/50">
                            +{session.cart.length - 3} productos más
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No Sessions State */}
        {allSessions.length === 0 && (
          <div className="text-center py-6 text-[#455a54]/70">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-winter-solid">No hay sesiones activas</p>
            <p className="text-sm mt-1">Crea una nueva sesión para comenzar</p>
          </div>
        )}

        {/* Active Orders Summary */}
        {activeOrders.length > 0 && (
          <div className="pt-4 border-t border-[#9d684e]/10">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-[#455a54]">
                Órdenes Pendientes ({activeOrders.length})
              </span>
            </div>
            
            <div className="space-y-2">
              {activeOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex justify-between items-center text-xs p-2 bg-orange-50 rounded border-l-2 border-orange-200">
                  <div>
                    <div className="font-medium text-orange-800">Orden #{order.id.slice(-8)}</div>
                    <div className="text-orange-600">
                      {order.items.length} items • {formatCurrency(order.total)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {order.status}
                  </Badge>
                </div>
              ))}
              
              {activeOrders.length > 3 && (
                <div className="text-xs text-[#455a54]/50 text-center">
                  +{activeOrders.length - 3} órdenes más
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}