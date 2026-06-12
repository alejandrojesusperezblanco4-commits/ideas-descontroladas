import { Idea } from "./types";

// Ideas de demo para que el grafo nunca se vea vacío.
// En el hito 2 el resumen y las etiquetas los genera la IA al capturar.
export const SEED_IDEAS: Idea[] = [
  {
    id: "seed-1",
    viability: 88,
    complexity: "baja",
    title: "Bot de WhatsApp para reservas de barberías",
    summary:
      "Las barberías pierden citas gestionándolas por DM. Un bot que reserva, confirma y recuerda la cita reduce los no-shows.",
    tags: ["whatsapp", "reservas", "comercios locales", "automatización"],
    clusterId: "comercios",
    createdAt: "2026-06-01T10:00:00Z",
    source: "voz",
  },
  {
    id: "seed-2",
    viability: 82,
    complexity: "baja",
    title: "IA que contesta reseñas de Google de restaurantes",
    summary:
      "Responder reseñas mejora el ranking local, pero casi ningún restaurante lo hace. Un agente que responde con el tono de la casa.",
    tags: ["ia", "reseñas", "comercios locales", "automatización"],
    clusterId: "comercios",
    createdAt: "2026-06-01T18:30:00Z",
    source: "texto",
  },
  {
    id: "seed-3",
    viability: 75,
    complexity: "baja",
    title: "Recordatorios de pedidos recurrentes para panaderías",
    summary:
      "La panadería sabe quién compra cada viernes. Un sistema que detecta el patrón y manda el recordatorio por WhatsApp antes de que el cliente lo olvide.",
    tags: ["whatsapp", "pedidos recurrentes", "comercios locales", "automatización"],
    clusterId: "comercios",
    createdAt: "2026-06-02T09:15:00Z",
    source: "voz",
  },
  {
    id: "seed-4",
    viability: 55,
    complexity: "media",
    title: "Dashboard de métricas para negocios pequeños",
    summary:
      "Ventas, reseñas y redes en un solo panel semanal. El dueño de un comercio no abre cinco herramientas: abre una.",
    tags: ["analítica", "comercios locales", "saas"],
    clusterId: "comercios",
    createdAt: "2026-06-03T20:00:00Z",
    source: "texto",
  },
  {
    id: "seed-5",
    viability: 68,
    complexity: "media",
    title: "Agente que gestiona visitas de inmobiliarias",
    summary:
      "Coordinar visitas consume horas de los agentes. Una IA que cuadra agenda entre comprador, vendedor y agente sin intervención humana.",
    tags: ["reservas", "inmobiliaria", "automatización", "agentes ia"],
    clusterId: "comercios",
    createdAt: "2026-06-04T11:45:00Z",
    source: "voz",
  },
  {
    id: "seed-6",
    viability: 45,
    complexity: "alta",
    title: "Generador de clips cortos desde vídeos largos",
    summary:
      "Detecta los momentos con más gancho de un vídeo largo y los convierte en clips verticales con subtítulos para TikTok y Reels.",
    tags: ["vídeo", "contenido", "ia", "redes sociales"],
    clusterId: "contenido",
    createdAt: "2026-06-05T16:20:00Z",
    source: "texto",
  },
  {
    id: "seed-7",
    viability: 72,
    complexity: "media",
    title: "Notas de voz convertidas en hilos y posts",
    summary:
      "Hablas cinco minutos mientras caminas y la IA lo convierte en un hilo de X, un post de LinkedIn y un guion de short.",
    tags: ["voz", "contenido", "redes sociales", "automatización"],
    clusterId: "contenido",
    createdAt: "2026-06-06T08:05:00Z",
    source: "voz",
  },
  {
    id: "seed-8",
    viability: 58,
    complexity: "media",
    title: "Calendario editorial autogenerado según tendencias",
    summary:
      "Cruza las tendencias de tu nicho con tu catálogo de contenido y te propone qué publicar cada día de la semana.",
    tags: ["contenido", "tendencias", "redes sociales"],
    clusterId: "contenido",
    createdAt: "2026-06-06T22:40:00Z",
    source: "texto",
  },
  {
    id: "seed-9",
    viability: 70,
    complexity: "media",
    title: "Figuras 3D personalizadas de mascotas",
    summary:
      "Subes tres fotos de tu perro y recibes una figura impresa en 3D. Regalo emocional con margen alto y producción bajo demanda.",
    tags: ["impresión 3d", "personalización", "ecommerce"],
    clusterId: "fisico",
    createdAt: "2026-06-07T13:10:00Z",
    source: "voz",
  },
  {
    id: "seed-10",
    viability: 40,
    complexity: "alta",
    title: "Marketplace de archivos STL de creadores locales",
    summary:
      "Los diseñadores 3D no tienen dónde vender en español. Marketplace con licencias claras y pago por descarga o suscripción.",
    tags: ["impresión 3d", "creadores", "marketplace"],
    clusterId: "fisico",
    createdAt: "2026-06-08T17:55:00Z",
    source: "texto",
  },
  {
    id: "seed-11",
    viability: 78,
    complexity: "baja",
    title: "Curso «automatiza tu negocio con IA»",
    summary:
      "Los comercios no compran software, compran resultados. Un curso práctico que enseña a montar las automatizaciones — y de paso vende el servicio.",
    tags: ["formación", "automatización", "comercios locales", "contenido"],
    clusterId: "comercios",
    createdAt: "2026-06-09T10:30:00Z",
    source: "voz",
  },
  {
    id: "seed-12",
    viability: 50,
    complexity: "alta",
    title: "Detector de tendencias para lanzar productos físicos",
    summary:
      "Escanea redes en busca de memes y tendencias emergentes y sugiere qué producto imprimible en 3D lanzar antes de que sature.",
    tags: ["tendencias", "ecommerce", "ia", "impresión 3d"],
    clusterId: "fisico",
    createdAt: "2026-06-10T19:25:00Z",
    source: "texto",
  },
];
