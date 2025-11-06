import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  links?: string[];
}

export interface ChatConversation {
  id: number;
  userId: number;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export class ChatbotService {
  private static instance: ChatbotService;

  public static getInstance(): ChatbotService {
    if (!ChatbotService.instance) {
      ChatbotService.instance = new ChatbotService();
    }
    return ChatbotService.instance;
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta usando Gemini
   * Restringido solo a búsqueda de información educativa
   */
  async processMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<{ response: string; links: string[] }> {
    // Verificar si el mensaje parece ser una solicitud de ayuda con tareas escolares
    if (this.isRestrictedRequest(message)) {
      return {
        response: "Lo siento, soy un chatbot educativo diseñado únicamente para ayudar con la búsqueda y explicación de información general. No puedo ayudar con tareas escolares, trabajos académicos, exámenes o cualquier actividad que involucre calificaciones. Mi propósito es facilitar el aprendizaje autónomo mediante la búsqueda de información confiable en internet.",
        links: []
      };
    }

    // Si no hay API key configurada, devolver respuesta genérica
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy-key') {
      return {
        response: "Lo siento, el servicio de búsqueda de información no está disponible en este momento. Por favor, intenta más tarde.",
        links: []
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // Detectar si el usuario quiere cambiar de tema o resetear contexto
      const resetContext = this.shouldResetContext(message);

      // Filtrar historial si se detecta reset
      let filteredHistory = conversationHistory;
      if (resetContext) {
        filteredHistory = [];
      }

      // Construir el prompt del sistema con reglas de memoria
      const systemPrompt = `Eres un chatbot educativo especializado en búsqueda de información con memoria de conversación. Tu propósito es ayudar a los estudiantes a encontrar y entender información de manera autónoma, manteniendo el contexto de la conversación.

REGLAS ESTRICTAS:
- SOLO puedes ayudar con búsqueda de información general y educativa
- NUNCA ayudes con tareas escolares, trabajos académicos, exámenes o cualquier actividad que involucre calificaciones
- Si detectas que el usuario pide ayuda con tareas escolares, rechaza cortésmente y explica tu propósito
- Mantén memoria del contexto de la conversación para preguntas de seguimiento
- Si el usuario dice "cambiando de tema", "olvida lo anterior", "nuevo tema" o frases similares, reconoce el cambio y comienza un nuevo contexto sin referencia al historial anterior
- Proporciona información objetiva y verificable
- Incluye enlaces reales de fuentes confiables en español cuando sea posible
- Mantén un tono educativo, útil, profesional y amigable
- Si no sabes algo, admítelo y sugiere dónde buscar

COMPORTAMIENTO DE MEMORIA:
- Recuerda el contexto de la conversación para preguntas relacionadas
- Si se detecta cambio de tema, confirma el cambio y comienza desde cero
- Mantén coherencia dentro del mismo tema/contexto

ESTRUCTURA DE RESPUESTA:
Para cada respuesta, sigue esta estructura usando formato Markdown para una mejor organización y apariencia visual:

1.  **## 📚 Título Principal de la Respuesta**
    -   Comienza con un título claro, descriptivo y atractivo, usando emojis relevantes para hacerlo más visual.

2.  **📖 Explicación Detallada**
    -   Desarrolla la respuesta de manera organizada: usa párrafos concisos, listas con viñetas ("*") o numeradas ("1.") para estructurar la información.
    -   Usa **negritas** para resaltar conceptos clave, *cursivas* para énfasis adicional, y bloques de código si es necesario para ejemplos técnicos.
    -   Divide en secciones con subtítulos si la respuesta es extensa, usando ### para subtítulos.

3.  **🔗 Fuentes y Enlaces Recomendados**
    -   **IMPORTANTE**: Busca activamente en todo internet fuentes confiables y actuales (no solo Wikipedia). Incluye enlaces reales y funcionales de universidades, publicaciones científicas, sitios gubernamentales (.gov), organizaciones reconocidas, blogs expertos, etc.
    -   **NUNCA INVENTES URLS**. Cada enlace debe ser verificable y accesible inmediatamente. Si no encuentras enlaces confiables, no los incluyas.
    -   Proporciona entre 2 y 5 enlaces, presentándolos en una lista numerada con una breve descripción de por qué son útiles.
    -   Ejemplo: "1. [Título del artículo](https://url-real.com) - Descripción breve de la fuente."

Ejemplos de temas permitidos: historia, ciencia, matemáticas, literatura, idiomas, cultura, etc.
Ejemplos de temas NO permitidos: "haz mi tarea", "resuelve este ejercicio", "prepara mi examen", etc.`;

      // Construir el historial de conversación
      let conversationContext = "";
      if (filteredHistory.length > 0) {
        conversationContext = "\n\nHistorial de conversación (últimos 5 mensajes):\n" +
          filteredHistory.slice(-5).map(msg =>
            `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`
          ).join('\n');
      }

      const fullPrompt = `${systemPrompt}

Mensaje del usuario: "${message}"${conversationContext}

Responde de manera educativa y proporciona enlaces reales cuando sea apropiado. Si el mensaje parece ser sobre tareas escolares, rechaza la solicitud. Si detectas cambio de tema, confirma y comienza nuevo contexto.`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      // Extraer enlaces del texto de la respuesta
      const links = this.extractLinks(text);

      return {
        response: text,
        links: links
      };

    } catch (error) {
      console.error('Error generando respuesta del chatbot:', error);
      return {
        response: "Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo o reformula tu pregunta.",
        links: []
      };
    }
  }

  /**
   * Verifica si el usuario quiere resetear el contexto de la conversación
   */
  private shouldResetContext(message: string): boolean {
    const resetKeywords = [
      'cambiando de tema', 'cambio de tema', 'nuevo tema', 'olvida lo anterior',
      'olvidemos lo anterior', 'empecemos de nuevo', 'reinicia', 'reset',
      'borra el contexto', 'borra la memoria', 'nueva conversación',
      'changing topic', 'new topic', 'forget previous', 'start over',
      'reset context', 'clear memory', 'new conversation'
    ];

    const lowerMessage = message.toLowerCase();
    return resetKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Verifica si el mensaje parece ser una solicitud restringida (tareas escolares)
   */
  private isRestrictedRequest(message: string): boolean {
    const restrictedKeywords = [
      // Español
      'tarea', 'trabajo', 'examen', 'prueba', 'evaluación', 'calificación', 'nota',
      'entrega', 'deadline', 'fecha límite', 'hacer mi', 'haz mi', 'ayuda con',
      'resolver', 'solucionar', 'contestar', 'responder', 'preparar', 'estudiar para',
      'repasar', 'aprender para', 'practicar para', 'ejercicio', 'problema',
      'matemática', 'física', 'química', 'biología', 'historia', 'geografía',
      'lenguaje', 'literatura', 'inglés', 'español', 'francés', 'alemán',
      'filosofía', 'ética', 'ciencias sociales', 'economía', 'contabilidad',
      'programación', 'informática', 'base de datos', 'algoritmo', 'código',
      'desarrollo', 'software', 'hardware', 'redes', 'sistemas operativos',
      'investigación', 'tesis', 'monografía', 'ensayo', 'redacción',
      'presentación', 'powerpoint', 'word', 'excel', 'proyecto final',
      'trabajo final', 'examen final', 'parcial', 'quiz', 'test',

      // Inglés
      'homework', 'assignment', 'exam', 'test', 'grade', 'score', 'due date',
      'deadline', 'do my', 'help with', 'solve', 'answer', 'prepare for',
      'study for', 'review', 'practice', 'exercise', 'problem', 'math',
      'physics', 'chemistry', 'biology', 'history', 'geography', 'language',
      'literature', 'english', 'spanish', 'french', 'german', 'philosophy',
      'ethics', 'social studies', 'economics', 'accounting', 'programming',
      'computer science', 'database', 'algorithm', 'code', 'development',
      'software', 'hardware', 'networks', 'operating systems', 'research',
      'thesis', 'monograph', 'essay', 'writing', 'presentation', 'powerpoint',
      'word', 'excel', 'final project', 'final paper', 'final exam', 'quiz',

      // Frases comunes
      'cómo hacer', 'how to', 'qué es', 'what is', 'explica', 'explain',
      'define', 'definition', 'ejemplo', 'example', 'formula', 'fórmula',
      'teoría', 'theory', 'concepto', 'concept', 'principio', 'principle'
    ];

    const lowerMessage = message.toLowerCase();

    // Contar palabras clave restringidas
    let restrictedCount = 0;
    for (const keyword of restrictedKeywords) {
      if (lowerMessage.includes(keyword)) {
        restrictedCount++;
      }
    }

    // Si hay muchas palabras clave restringidas, probablemente sea una solicitud escolar
    return restrictedCount >= 2;
  }

  /**
   * Extrae enlaces de un texto
   */
  private extractLinks(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  /**
   * Genera un título automático para la conversación basado en el primer mensaje
   */
  generateConversationTitle(firstMessage: string): string {
    // Limitar a 50 caracteres
    const title = firstMessage.length > 50 ? firstMessage.substring(0, 47) + '...' : firstMessage;
    return title;
  }
}

export default ChatbotService;
