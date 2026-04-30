'use client';

import { useSearchParams, notFound } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';

// Datos de los arcanos importados del JSON
const arcanosData = {
  "0": {
    "name": "El Loco",
    "message": "Es la chispa de los comienzos y la confianza radical en la vida. Te invita a moverte aunque no tengas todas las garantías, a soltar el control y probar. Si esperás la certeza perfecta, te estancás; si das el paso con apertura y curiosidad, aprendés haciendo. La lección es arriesgar con conciencia, liviano de equipaje y fiel a tu entusiasmo. Aceptá que equivocarte también es avanzar y que el camino se revela caminándolo."
  },
  "1": {
    "name": "El Mago",
    "message": "Representa tu capacidad de convertir ideas en hechos. Es el recordatorio de que ya tenés herramientas, creatividad y recursos para empezar hoy. No postergues por falta de perfección: practicá, experimentá y ajustá. La acción enfocada abre puertas. Cuando alineás mente, palabra y acto, tu realidad responde. El poder no está afuera: se activa cuando actuás con intención y constancia, paso a paso, creando momentum."
  },
  "2": {
    "name": "La Sacerdotisa",
    "message": "Te invita a bajar el volumen del ruido y escuchar la intuición. No todo se resuelve con datos; a veces la claridad nace del silencio, el descanso y la observación. Confiá en lo que tu cuerpo percibe y tu corazón sabe. Esperá el momento justo y no fuerces definiciones. Tu sabiduría interna se vuelve nítida cuando le das espacio. La paciencia y la contemplación son parte de la respuesta que necesitás."
  },
  "3": {
    "name": "La Emperatriz",
    "message": "Es abundancia creativa y cuidado amoroso. Habla de nutrir proyectos, vínculos y tu propio bienestar. La belleza aparece cuando dedicás tiempo y atención a lo que te importa. Permitite recibir y poner límites sanos para no agotarte. Crear no es solo producir: es sostener ritmos, disfrutar del proceso y darle un hogar a lo que gestás. Tu mundo florece cuando te tratás con ternura y constancia."
  },
  "4": {
    "name": "El Emperador",
    "message": "Trae orden, estructura y estabilidad. Si querés resultados sostenibles, necesitás reglas claras, prioridades y compromiso. La autoridad bien usada protege y organiza; la mal usada controla. Elegí liderarte con firmeza y respeto. Construí bases sólidas, documentá tus procesos y definí límites. La libertad crece cuando existe un marco: un plan simple, realista y medible que te sostenga en el tiempo."
  },
  "5": {
    "name": "El Papa (Hierofante)",
    "message": "Propone aprender de la experiencia colectiva: maestros, comunidad, tradiciones. Preguntarte '¿quién ya caminó esto?' te ahorra tropiezos. No es obedecer ciegamente, es discernir y tomar lo útil. La fe se vuelve práctica cuando la llevás a gestos concretos. Participar en un grupo, una mentoría o un ritual simple puede darte contención, perspectiva y sentido en momentos de duda y transición."
  },
  "6": {
    "name": "Los Enamorados",
    "message": "Más que romance, esta carta habla de decisiones con impacto emocional. Elegir con el corazón es válido, pero también requiere responsabilidad. Decir sí a algo implica decir no a otra cosa. Observá tus deseos, tus valores y tus acuerdos. Una buena elección honra lo que sentís y cuida a los demás. La coherencia entre lo que pensás, sentís y hacés es la verdadera unión que esta carta propone."
  },
  "7": {
    "name": "El Carro",
    "message": "Energía de avance, enfoque y victoria ganada con disciplina. No se trata de acelerar sin rumbo, sino de dirigir tu fuerza con claridad. Identificá distracciones, poné límites y retomá el volante. Cuando alineás intención, hábitos y constancia, avanzás incluso con viento en contra. Celebrá los pequeños logros: son combustible emocional para sostener el viaje largo y llegar donde realmente querés."
  },
  "8": {
    "name": "La Justicia",
    "message": "Pide honestidad, equilibrio y asumir consecuencias. Mirá los hechos sin adornos y actuá en coherencia con tus valores. A veces implica reparar, pedir perdón o ajustar acuerdos. No busca castigo, busca equidad. Si dudás, preguntate: ¿qué es lo más justo para todas las partes? Hacer lo correcto hoy evita cargas mañana. La claridad legal y ética te libera de nudos invisibles y culpas que pesan."
  },
  "9": {
    "name": "El Ermitaño",
    "message": "Tiempo de pausa consciente para volver a vos. Alejate del ruido, reducí estímulos y escuchá tu faro interior. La respuesta no está escondida: necesita silencio para ser oída. Investigar, escribir, meditar o caminar sin prisa te reordenan. Volvés con menos palabras y más verdad. La soledad elegida no aísla: te prepara para conectar mejor, con criterio propio y más claridad sobre tu dirección."
  },
  "10": {
    "name": "La Rueda de la Fortuna",
    "message": "La vida gira: subidas, bajadas y giros inesperados. Resistirte al cambio te cansa; aceptarlo te enseña. Aprovechá la buena racha con humildad y preparate para ajustes con serenidad. Todo pasa, lo agradable y lo difícil. Tu poder está en responder con flexibilidad, aprender del ciclo y no definirte por una sola vuelta. La rueda sigue; tu identidad es más grande que cualquier momento."
  },
  "11": {
    "name": "La Fuerza",
    "message": "Valentía serena, autocontrol y compasión firme. No es imponer a los gritos; es regular tu energía para abrir puertas. Tratá tus miedos como animales que pueden ser acompañados, no combatidos. La dulzura que pone límites protege mejor que la dureza que hiere. Tu fuerza real es la que contiene y transforma sin violencia. Cuando te calmás por dentro, lo de afuera deja de dominarte."
  },
  "12": {
    "name": "El Colgado",
    "message": "Una pausa no elegida puede revelar la perspectiva que faltaba. Rendirte al momento presente no es perder: es dejar de pelear con lo inevitable para entenderlo. Mirá desde otra posición, soltá la urgencia y revisá supuestos. En el aparente vacío nacen intuiciones nuevas. El tiempo 'muerto' es incubadora de insight si aprendés a habitarlo con paciencia, confianza y humildad para aprender."
  },
  "13": {
    "name": "La Muerte",
    "message": "Cierre de ciclo y renovación profunda. No habla de fin literal: es soltar lo que ya cumplió su función. Duela o no, dejar ir permite que entre aire nuevo. Honrá lo que fue y hacé espacio. La vida no tolera el amontonamiento; necesita circulación. Tu futuro no puede pasar si la puerta está ocupada por lo viejo. Renacer exige despedirse y confiar en que el vacío será semilla de algo mejor."
  },
  "14": {
    "name": "La Templanza",
    "message": "Integrar opuestos, hallar el punto medio y mezclar con sabiduría. Ni todo blanco ni todo negro: dosis adecuadas, ritmos sanos y tiempos de descanso. La paciencia acá es activa: probás, calibrás y ajustás. Equilibrarte no es quedarte quieto, es moverte con armonía. Cuando regulás tu energía y tu agenda, tus vínculos y proyectos se vuelven más sostenibles y profundamente nutritivos."
  },
  "15": {
    "name": "El Diablo",
    "message": "Muestra cadenas que en realidad tienen llave. Adicciones, apegos, culpas o vergüenzas te hacen creer que no podés elegir distinto. El primer paso es ver la trampa; el segundo, pedir ayuda si hace falta. El placer no es el enemigo; la compulsión sí. Recuperar tu libertad es recordar tu dignidad: sos más grande que el hábito que te atrapa. Elegir conciencia devuelve poder y oxígeno."
  },
  "16": {
    "name": "La Torre",
    "message": "Cuando lo construido sobre lo falso se derrumba, duele, pero libera. Las crisis exponen lo que ya no se sostenía y abren terreno para algo más auténtico. Permitite sentir el golpe y, luego, ordenar con calma. No todo lo que cae era esencial: del escombro distinguís lo valioso. La verdad, aunque abrupta, te deja más liviano y real. Reconstruir con honestidad te hace invulnerable a futuros temblores."
  },
  "17": {
    "name": "La Estrella",
    "message": "Después del terremoto, cielo abierto. Esperanza tranquila, inspiración suave y sanación sin apuro. Volvés a confiar en vos y en la vida. Hidratá lo seco: descansá, creá sin presión, compartí luz sin agotarte. Volvé al plan simple: lo que nutre y hace bien. La Estrella no promete magia instantánea; promete calma que se construye con pequeños gestos, honestidad emocional y gratitud diaria."
  },
  "18": {
    "name": "La Luna",
    "message": "Niebla, sueños intensos y emociones a flor. No te asustes: es la mente procesando. Evitá decisiones definitivas en plena confusión. Observá señales, escribí lo que sentís, pedí otra mirada. La intuición crece cuando la limpiás del miedo. Lo oculto se aclara con tiempo y cuidado. Confiá en tu radar, pero verificá en la realidad antes de moverte fuerte. La claridad llega de forma gradual."
  },
  "19": {
    "name": "El Sol",
    "message": "Claridad, alegría y vitalidad compartida. Es momento de mostrarte sin disfraces, celebrar logros y contagiar entusiasmo. La luz también revela lo que faltaba ver para mejorar. No subestimes lo simple: dormir, moverte, reír, agradecer. El optimismo acá no niega problemas; te da energía real para resolverlos mejor. Cuando brillás, habilitás a otros a brillar sin competir, sumando luz al entorno."
  },
  "20": {
    "name": "El Juicio",
    "message": "Llamado a despertar y ordenar la historia. Perdonarte, perdonar y cerrar pendientes. No para borrar, sino para liberar energía atrapada. Evaluá con honestidad, tomá responsabilidad y hacé cambios alineados con quien querés ser. Tu nueva etapa no empieza con olvido sino con comprensión. Renacés cuando te decís la verdad y elegís actuar distinto, honrando lo aprendido en el proceso."
  },
  "21": {
    "name": "El Mundo",
    "message": "Culminación y sensación de encaje: lo aprendido se integra y se comparte. Cerrás un ciclo con madurez y te abrís a otro mayor, más amplio. Celebrar no es vanidad: es reconocer el camino andado. Lo logrado te habilita a servir mejor y circular con libertad. Completitud no es perfección; es armonía suficiente para seguir creciendo. Tu lugar en el mundo se siente, y desde ahí seguís creando."
  }
};

// Mapeo de números a nombres de archivo
const getImageFileName = (numero: string) => {
  const imageMap: { [key: string]: string } = {
    "0": "0 - El loco.jpg",
    "1": "1 - El Mago.jpg",
    "2": "2 - La Sacerdotisa.jpg",
    "3": "3 - La Emperatriz.jpg",
    "4": "4 - El Emperador.jpg",
    "5": "5 - El papa.jpg",
    "6": "6 - Los enamorados.jpg",
    "7": "7 - El Carro.jpg",
    "8": "8 - La Fuerza.jpg",
    "9": "9 - El Ermitaño.jpg",
    "10": "10 - La Rueda de la Fortuna.jpg",
    "11": "11 - La Justicia.jpg",
    "12": "12 - El Ahorcado.jpg",
    "13": "13 - La Muerte.jpg",
    "14": "14 - La Templanza.jpg",
    "15": "15 -  El Diablo.jpg",
    "16": "16 - La Torre.jpg",
    "17": "17 - La Estrella.jpg",
    "18": "18 - La Luna.jpg",
    "19": "19 - El Sol.jpg",
    "20": "20 - El Juicio.jpg",
    "21": "21 - El Mundo.jpg"
  };
  return imageMap[numero];
};

function ArcanoContent() {
  const searchParams = useSearchParams();
  const numero = searchParams.get('numero');

  // Validar que el número esté presente y sea válido
  if (!numero || !arcanosData[numero as keyof typeof arcanosData]) {
    notFound();
  }

  const arcano = arcanosData[numero as keyof typeof arcanosData];
  const imagePath = getImageFileName(numero);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col relative overflow-hidden">
      {/* Eliminar cualquier elemento flotante */}
      <style jsx global>{`
        body { overflow-x: hidden; }
        * { box-sizing: border-box; }
        .floating-element { display: none !important; }
      `}</style>
      
      {/* Header */}
      <div className="bg-black bg-opacity-30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <Image
              src="/Logo-mistica.png"
              alt="Mística Auténtica"
              width={80}
              height={80}
              className="mr-4"
            />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Mística Auténtica</h1>
              <p className="text-purple-200">Mensaje del Tarot</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              {/* Arcano Title */}
              <div className="text-center mb-8">
                <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.3)'}}>{arcano.name}</h2>
                <div className="w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full shadow-lg"></div>
              </div>

              {/* Content Grid */}
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Image */}
                <div className="flex justify-center">
                  <Image
                    src={`/arcanos/${imagePath}`}
                    alt={arcano.name}
                    width={300}
                    height={500}
                    className="rounded-lg shadow-2xl border-4 border-white border-opacity-30"
                  />
                </div>

                {/* Message */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-6 drop-shadow-md" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>Tu Mensaje:</h3>
                    <p className="text-lg text-white leading-relaxed bg-black bg-opacity-40 p-6 rounded-lg backdrop-blur-sm border border-white border-opacity-20 shadow-xl">
                      {arcano.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black bg-opacity-30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-purple-200">
            <p className="mb-2">✨ Reflexiona sobre este mensaje y permite que te acompañe en tu camino ✨</p>
            <p className="text-sm">© 2025 Mística Auténtica - Un regalo del universo para ti</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArcanoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg">Revelando tu mensaje...</p>
        </div>
      </div>
    }>
      <ArcanoContent />
    </Suspense>
  );
}