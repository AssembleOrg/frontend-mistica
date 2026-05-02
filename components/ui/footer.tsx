'use client';

import Image from 'next/image';
import { contactPisTech } from '@/lib/utils/whatsapp';

interface FooterProps {
  className?: string;
  variant?: 'minimal' | 'full';
}

export function Footer({ className = '', variant = 'minimal' }: FooterProps) {
  const handlePisTechClick = () => {
    contactPisTech();
  };

  if (variant === 'minimal') {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className='flex items-center justify-center text-sm text-[#455a54]/60 font-winter-solid'>
          <span className='mt-4'>
            Panel de gestión MÍSTICA - Desarrollado por
          </span>
          <button
            onClick={handlePisTechClick}
            className='inline-flex items-center gap-2 px-3 py-1 rounded-md hover:bg-[#efcbb9]/20 transition-colors duration-200 cursor-pointer'
            title='Contactar a PisTech por WhatsApp'
          >
            <Image
              src='/pistech-nobg.png'
              alt='PisTech'
              width={80}
              height={24}
              className='object-contain'
              style={{ height: 'auto' }}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t border-[#9d684e]/10 bg-white/50 ${className}`}>
      <div className='max-w-7xl mx-auto px-6 py-6'>
        <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <span className='text-[#455a54] font-winter-solid'>
              Panel de gestión MÍSTICA
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <span className='text-sm text-[#455a54]/60 font-winter-solid'>
              Desarrollado por
            </span>
            <button
              onClick={handlePisTechClick}
              className='inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#efcbb9]/30 transition-all duration-200 cursor-pointer group'
              title='Contactar a PisTech por WhatsApp'
            >
              <Image
                src='/pistech-nobg.png'
                alt='PisTech'
                width={100}
                height={30}
                className='object-contain group-hover:scale-105 transition-transform duration-200'
                style={{ height: 'auto' }}
              />
            </button>
          </div>
        </div>

        <div className='mt-4 pt-4 border-t border-[#9d684e]/5'>
          <p className='text-xs text-[#455a54]/50 text-center font-winter-solid'>
            Sistema de gestión integral para emprendimientos místicos y wellness
          </p>
        </div>
      </div>
    </div>
  );
}
