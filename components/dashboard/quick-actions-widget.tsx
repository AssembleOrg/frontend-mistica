'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'danger' | 'success';
  onClick?: () => void;
}

interface QuickActionsWidgetProps {
  title: string;
  description: string;
  actions: QuickAction[];
  layout?: 'horizontal' | 'vertical';
}

const colorStyles = {
  primary: 'bg-gradient-to-r from-[#9d684e] to-[#9d684e]/90 hover:from-[#9d684e]/90 hover:to-[#9d684e] text-white',
  secondary: 'border-[#9d684e] text-[#9d684e] hover:bg-[#9d684e] hover:text-white bg-white',
  danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
  success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white',
};

export function QuickActionsWidget({ 
  title, 
  description, 
  actions, 
  layout = 'horizontal' 
}: QuickActionsWidgetProps) {
  return (
    <Card className='border-[#9d684e]/20'>
      <CardHeader>
        <CardTitle className='text-lg font-tan-nimbus text-[#455a54]'>
          {title}
        </CardTitle>
        <CardDescription className='text-[#455a54]/70'>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${
          layout === 'horizontal' 
            ? 'grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:flex lg:flex-wrap lg:gap-3' 
            : 'grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3'
        }`}>
          {actions.map((action) => {
            const ButtonContent = (
              <>
                <action.icon className='h-5 w-5' />
                <div className='flex-1 text-left'>
                  <div className='font-winter-solid font-semibold'>
                    {action.title}
                  </div>
                  <p className='text-xs opacity-90 font-light hidden sm:block lg:block'>
                    {action.description}
                  </p>
                </div>
              </>
            );

            const buttonClass = `
              h-auto p-3 sm:p-4 flex items-center gap-2 sm:gap-3 
              shadow-md hover:shadow-lg transition-all duration-200 
              ${colorStyles[action.color]}
              ${layout === 'horizontal' ? 'lg:min-w-[180px] xl:min-w-[200px]' : ''}
            `;

            if (action.href) {
              return (
                <Button
                  key={action.id}
                  asChild
                  size="lg"
                  variant={action.color === 'secondary' ? 'outline' : 'default'}
                  className={buttonClass}
                >
                  <Link href={action.href}>
                    {ButtonContent}
                  </Link>
                </Button>
              );
            }

            return (
              <Button
                key={action.id}
                onClick={action.onClick}
                size="lg"
                variant={action.color === 'secondary' ? 'outline' : 'default'}
                className={buttonClass}
              >
                {ButtonContent}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}