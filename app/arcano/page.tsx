'use client';

import { useSearchParams, notFound } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';

const arcanosData = {
  '0': {
    name: 'El Loco',
    message:
      'Es la chispa de los comienzos y la confianza radical en la vida. Te invita a moverte aunque no tengas todas las garantías, a soltar el control y probar. Si esperás la certeza perfecta, te estancás; si das el paso con apertura y curiosidad, aprendés haciendo. La lección es arriesgar con conciencia, liviano de equipaje y fiel a tu entusiasmo. Aceptá que equivocarte también es avanzar y que el camino se revela caminándolo.',
  },
  '1': {
    name: 'El Mago',
    message:
      'Representa tu capacidad de convertir ideas en hechos. Es el recordatorio de que ya tenés herramientas, creatividad y recursos para empezar hoy. No postergues por falta de perfección: practicá, experimentá y ajustá. La acción enfocada abre puertas. Cuando alineás mente, palabra y acto, tu realidad responde. El poder no está afuera: se activa cuando actuás con intención y constancia, paso a paso, creando momentum.',
  },
  '2': {
    name: 'La Sacerdotisa',
    message:
      'Te invita a bajar el volumen del ruido y escuchar la intuición. No todo se resuelve con datos; a veces la claridad nace del silencio, el descanso y la observación. Confiá en lo que tu cuerpo percibe y tu corazón sabe. Esperá el momento justo y no fuerces definiciones. Tu sabiduría interna se vuelve nítida cuando le das espacio. La paciencia y la contemplación son parte de la respuesta que necesitás.',
  },
  '3': {
    name: 'La Emperatriz',
    message:
      'Es abundancia creativa y cuidado amoroso. Habla de nutrir proyectos, vínculos y tu propio bienestar. La belleza aparece cuando dedicás tiempo y atención a lo que te importa. Permitite recibir y poner límites sanos para no agotarte. Crear no es solo producir: es sostener ritmos, disfrutar del proceso y darle un hogar a lo que gestás. Tu mundo florece cuando te tratás con ternura y constancia.',
  },
  '4': {
    name: 'El Emperador',
    message:
      'Trae orden, estructura y estabilidad. Si querés resultados sostenibles, necesitás reglas claras, prioridades y compromiso. La autoridad bien usada protege y organiza; la mal usada controla. Elegí liderarte con firmeza y respeto. Construí bases sólidas, documentá tus procesos y definí límites. La libertad crece cuando existe un marco: un plan simple, realista y medible que te sostenga en el tiempo.',
  },
  '5': {
    name: 'El Papa (Hierofante)',
    message:
      'Propone aprender de la experiencia colectiva: maestros, comunidad, tradiciones. Preguntarte "¿quién ya caminó esto?" te ahorra tropiezos. No es obedecer ciegamente, es discernir y tomar lo útil. La fe se vuelve práctica cuando la llevás a gestos concretos. Participar en un grupo, una mentoría o un ritual simple puede darte contención, perspectiva y sentido en momentos de duda y transición.',
  },
  '6': {
    name: 'Los Enamorados',
    message:
      'Más que romance, esta carta habla de decisiones con impacto emocional. Elegir con el corazón es válido, pero también requiere responsabilidad. Decir sí a algo implica decir no a otra cosa. Observá tus deseos, tus valores y tus acuerdos. Una buena elección honra lo que sentís y cuida a los demás. La coherencia entre lo que pensás, sentís y hacés es la verdadera unión que esta carta propone.',
  },
  '7': {
    name: 'El Carro',
    message:
      'Energía de avance, enfoque y victoria ganada con disciplina. No se trata de acelerar sin rumbo, sino de dirigir tu fuerza con claridad. Identificá distracciones, poné límites y retomá el volante. Cuando alineás intención, hábitos y constancia, avanzás incluso con viento en contra. Celebrá los pequeños logros: son combustible emocional para sostener el viaje largo y llegar donde realmente querés.',
  },
  '8': {
    name: 'La Justicia',
    message:
      'Pide honestidad, equilibrio y asumir consecuencias. Mirá los hechos sin adornos y actuá en coherencia con tus valores. A veces implica reparar, pedir perdón o ajustar acuerdos. No busca castigo, busca equidad. Si dudás, preguntate: ¿qué es lo más justo para todas las partes? Hacer lo correcto hoy evita cargas mañana. La claridad legal y ética te libera de nudos invisibles y culpas que pesan.',
  },
  '9': {
    name: 'El Ermitaño',
    message:
      'Tiempo de pausa consciente para volver a vos. Alejate del ruido, reducí estímulos y escuchá tu faro interior. La respuesta no está escondida: necesita silencio para ser oída. Investigar, escribir, meditar o caminar sin prisa te reordenan. Volvés con menos palabras y más verdad. La soledad elegida no aísla: te prepara para conectar mejor, con criterio propio y más claridad sobre tu dirección.',
  },
  '10': {
    name: 'La Rueda de la Fortuna',
    message:
      'La vida gira: subidas, bajadas y giros inesperados. Resistirte al cambio te cansa; aceptarlo te enseña. Aprovechá la buena racha con humildad y preparate para ajustes con serenidad. Todo pasa, lo agradable y lo difícil. Tu poder está en responder con flexibilidad, aprender del ciclo y no definirte por una sola vuelta. La rueda sigue; tu identidad es más grande que cualquier momento.',
  },
  '11': {
    name: 'La Fuerza',
    message:
      'Valentía serena, autocontrol y compasión firme. No es imponer a los gritos; es regular tu energía para abrir puertas. Tratá tus miedos como animales que pueden ser acompañados, no combatidos. La dulzura que pone límites protege mejor que la dureza que hiere. Tu fuerza real es la que contiene y transforma sin violencia. Cuando te calmás por dentro, lo de afuera deja de dominarte.',
  },
  '12': {
    name: 'El Colgado',
    message:
      'Una pausa no elegida puede revelar la perspectiva que faltaba. Rendirte al momento presente no es perder: es dejar de pelear con lo inevitable para entenderlo. Mirá desde otra posición, soltá la urgencia y revisá supuestos. En el aparente vacío nacen intuiciones nuevas. El tiempo "muerto" es incubadora de insight si aprendés a habitarlo con paciencia, confianza y humildad para aprender.',
  },
  '13': {
    name: 'La Muerte',
    message:
      'Cierre de ciclo y renovación profunda. No habla de fin literal: es soltar lo que ya cumplió su función. Duela o no, dejar ir permite que entre aire nuevo. Honrá lo que fue y hacé espacio. La vida no tolera el amontonamiento; necesita circulación. Tu futuro no puede pasar si la puerta está ocupada por lo viejo. Renacer exige despedirse y confiar en que el vacío será semilla de algo mejor.',
  },
  '14': {
    name: 'La Templanza',
    message:
      'Integrar opuestos, hallar el punto medio y mezclar con sabiduría. Ni todo blanco ni todo negro: dosis adecuadas, ritmos sanos y tiempos de descanso. La paciencia acá es activa: probás, calibrás y ajustás. Equilibrarte no es quedarte quieto, es moverte con armonía. Cuando regulás tu energía y tu agenda, tus vínculos y proyectos se vuelven más sostenibles y profundamente nutritivos.',
  },
  '15': {
    name: 'El Diablo',
    message:
      'Muestra cadenas que en realidad tienen llave. Adicciones, apegos, culpas o vergüenzas te hacen creer que no podés elegir distinto. El primer paso es ver la trampa; el segundo, pedir ayuda si hace falta. El placer no es el enemigo; la compulsión sí. Recuperar tu libertad es recordar tu dignidad: sos más grande que el hábito que te atrapa. Elegir conciencia devuelve poder y oxígeno.',
  },
  '16': {
    name: 'La Torre',
    message:
      'Cuando lo construido sobre lo falso se derrumba, duele, pero libera. Las crisis exponen lo que ya no se sostenía y abren terreno para algo más auténtico. Permitite sentir el golpe y, luego, ordenar con calma. No todo lo que cae era esencial: del escombro distinguís lo valioso. La verdad, aunque abrupta, te deja más liviano y real. Reconstruir con honestidad te hace invulnerable a futuros temblores.',
  },
  '17': {
    name: 'La Estrella',
    message:
      'Después del terremoto, cielo abierto. Esperanza tranquila, inspiración suave y sanación sin apuro. Volvés a confiar en vos y en la vida. Hidratá lo seco: descansá, creá sin presión, compartí luz sin agotarte. Volvé al plan simple: lo que nutre y hace bien. La Estrella no promete magia instantánea; promete calma que se construye con pequeños gestos, honestidad emocional y gratitud diaria.',
  },
  '18': {
    name: 'La Luna',
    message:
      'Niebla, sueños intensos y emociones a flor. No te asustes: es la mente procesando. Evitá decisiones definitivas en plena confusión. Observá señales, escribí lo que sentís, pedí otra mirada. La intuición crece cuando la limpiás del miedo. Lo oculto se aclara con tiempo y cuidado. Confiá en tu radar, pero verificá en la realidad antes de moverte fuerte. La claridad llega de forma gradual.',
  },
  '19': {
    name: 'El Sol',
    message:
      'Claridad, alegría y vitalidad compartida. Es momento de mostrarte sin disfraces, celebrar logros y contagiar entusiasmo. La luz también revela lo que faltaba ver para mejorar. No subestimes lo simple: dormir, moverte, reír, agradecer. El optimismo acá no niega problemas; te da energía real para resolverlos mejor. Cuando brillás, habilitás a otros a brillar sin competir, sumando luz al entorno.',
  },
  '20': {
    name: 'El Juicio',
    message:
      'Llamado a despertar y ordenar la historia. Perdonarte, perdonar y cerrar pendientes. No para borrar, sino para liberar energía atrapada. Evaluá con honestidad, tomá responsabilidad y hacé cambios alineados con quien querés ser. Tu nueva etapa no empieza con olvido sino con comprensión. Renacés cuando te decís la verdad y elegís actuar distinto, honrando lo aprendido en el proceso.',
  },
  '21': {
    name: 'El Mundo',
    message:
      'Culminación y sensación de encaje: lo aprendido se integra y se comparte. Cerrás un ciclo con madurez y te abrís a otro mayor, más amplio. Celebrar no es vanidad: es reconocer el camino andado. Lo logrado te habilita a servir mejor y circular con libertad. Completitud no es perfección; es armonía suficiente para seguir creciendo. Tu lugar en el mundo se siente, y desde ahí seguís creando.',
  },
};

const getImageFileName = (numero: string) => {
  const imageMap: { [key: string]: string } = {
    '0': '0 - El loco.jpg',
    '1': '1 - El Mago.jpg',
    '2': '2 - La Sacerdotisa.jpg',
    '3': '3 - La Emperatriz.jpg',
    '4': '4 - El Emperador.jpg',
    '5': '5 - El papa.jpg',
    '6': '6 - Los enamorados.jpg',
    '7': '7 - El Carro.jpg',
    '8': '8 - La Fuerza.jpg',
    '9': '9 - El Ermitaño.jpg',
    '10': '10 - La Rueda de la Fortuna.jpg',
    '11': '11 - La Justicia.jpg',
    '12': '12 - El Ahorcado.jpg',
    '13': '13 - La Muerte.jpg',
    '14': '14 - La Templanza.jpg',
    '15': '15 -  El Diablo.jpg',
    '16': '16 - La Torre.jpg',
    '17': '17 - La Estrella.jpg',
    '18': '18 - La Luna.jpg',
    '19': '19 - El Sol.jpg',
    '20': '20 - El Juicio.jpg',
    '21': '21 - El Mundo.jpg',
  };
  return imageMap[numero];
};

function ArcanoContent() {
  const searchParams = useSearchParams();
  const numero = searchParams.get('numero');

  if (!numero || !arcanosData[numero as keyof typeof arcanosData]) {
    notFound();
  }

  const arcano = arcanosData[numero as keyof typeof arcanosData];
  const imagePath = getImageFileName(numero);

  return (
    <div className='min-h-screen flex flex-col relative overflow-hidden bg-arcano'>
      {/* Halo místico */}
      <div className='absolute inset-0 pointer-events-none arcano-halo' aria-hidden />

      {/* Header */}
      <header className='relative z-10 backdrop-blur-sm bg-black/20 border-b border-white/10'>
        <div className='container mx-auto px-4 py-5'>
          <div className='flex items-center justify-center gap-4'>
            <Image
              src='/Logo-mistica.png'
              alt='Mística Auténtica'
              width={64}
              height={64}
              className='drop-shadow-lg'
            />
            <div className='text-center'>
              <h1 className='text-2xl sm:text-3xl font-tan-nimbus text-[#efcbb9]'>
                Mística Auténtica
              </h1>
              <p className='text-xs sm:text-sm text-[#efcbb9]/70 font-winter-solid tracking-wide uppercase'>
                Mensaje del Tarot
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className='relative z-10 flex-1 container mx-auto px-4 py-10'>
        <div className='max-w-4xl mx-auto'>
          <div className='rounded-2xl border border-[#efcbb9]/15 bg-black/30 backdrop-blur-md shadow-2xl overflow-hidden'>
            <div className='p-6 sm:p-10'>
              <div className='text-center mb-8'>
                <p className='text-xs uppercase tracking-[0.3em] text-[#9d684e] font-winter-solid mb-3'>
                  Arcano {numero}
                </p>
                <h2 className='text-4xl sm:text-6xl font-winter-solid text-[#efcbb9] arcano-title'>
                  {arcano.name}
                </h2>
                <div className='w-24 h-px bg-gradient-to-r from-transparent via-[#9d684e] to-transparent mx-auto mt-5' />
              </div>

              <div className='grid md:grid-cols-2 gap-8 items-center'>
                <div className='flex justify-center'>
                  <div className='relative'>
                    <div className='absolute -inset-3 bg-gradient-to-br from-[#9d684e]/30 to-[#cc844a]/20 blur-xl rounded-lg' aria-hidden />
                    <Image
                      src={`/arcanos/${imagePath}`}
                      alt={arcano.name}
                      width={300}
                      height={500}
                      className='relative rounded-lg shadow-2xl border border-[#efcbb9]/20'
                    />
                  </div>
                </div>

                <div className='space-y-5'>
                  <h3 className='text-2xl font-tan-nimbus text-[#efcbb9]'>
                    Tu mensaje
                  </h3>
                  <p className='text-base sm:text-lg text-[#efcbb9]/90 leading-relaxed font-winter-solid bg-[#4e4247]/40 p-5 rounded-lg border border-[#efcbb9]/10'>
                    {arcano.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className='relative z-10 backdrop-blur-sm bg-black/20 border-t border-white/10'>
        <div className='container mx-auto px-4 py-5 text-center text-[#efcbb9]/70 font-winter-solid'>
          <p className='mb-1 text-sm'>
            Reflexioná sobre este mensaje y permití que te acompañe en tu camino.
          </p>
          <p className='text-xs text-[#efcbb9]/50'>
            © 2025 Mística Auténtica · Un regalo del universo para vos
          </p>
        </div>
      </footer>

      <style jsx global>{`
        body {
          overflow-x: hidden;
        }
        .bg-arcano {
          background:
            radial-gradient(ellipse at top, rgba(157, 104, 78, 0.25), transparent 60%),
            radial-gradient(ellipse at bottom, rgba(204, 132, 74, 0.15), transparent 60%),
            linear-gradient(180deg, #2d2426 0%, #455a54 100%);
        }
        .arcano-halo {
          background: radial-gradient(
            circle at 50% 30%,
            rgba(239, 203, 185, 0.15),
            transparent 50%
          );
        }
        .arcano-title {
          text-shadow:
            0 2px 12px rgba(0, 0, 0, 0.6),
            0 0 24px rgba(239, 203, 185, 0.25);
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  );
}

export default function ArcanoPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-arcano flex items-center justify-center'>
          <div className='text-center'>
            <div className='w-12 h-12 border-2 border-[#efcbb9]/30 border-t-[#efcbb9] rounded-full animate-spin mx-auto mb-4' />
            <p className='text-[#efcbb9] font-winter-solid'>
              Revelando tu mensaje...
            </p>
          </div>
          <style jsx global>{`
            .bg-arcano {
              background:
                radial-gradient(ellipse at top, rgba(157, 104, 78, 0.25), transparent 60%),
                linear-gradient(180deg, #2d2426 0%, #455a54 100%);
            }
          `}</style>
        </div>
      }
    >
      <ArcanoContent />
    </Suspense>
  );
}
