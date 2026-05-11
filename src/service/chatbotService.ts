import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

  async processMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<{ response: string; links: string[] }> {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '') {
      return {
        response: "Lo siento, el servicio de IA no está configurado correctamente. Por favor, contacta al administrador.",
        links: []
      };
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Construir el historial de conversación para el prompt
        let conversationContext = "";
        if (conversationHistory.length > 0) {
          conversationContext = conversationHistory.slice(-10).map(msg => 
            `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`
          ).join('\n') + '\n';
        }

        const prompt = `${conversationContext}Eres un asistente educativo amigable y útil. Tu ÚNICA función es brindar información educativa: explicar conceptos, responder dudas teóricas, aclarar temas de estudio y sugerir recursos de aprendizaje.

RESTRICCIÓN ESTRICTA: BAJO NINGUNA CIRCUNSTANCIA debes crear, generar, redactar, resolver, estructurar ni ayudar a realizar trabajos académicos, proyectos, tareas, exámenes, ensayos, informes, presentaciones, código de programación para evaluación, ni ninguna actividad que sea entregada como trabajo académico o evaluable.

Si el usuario te solicita hacer un trabajo, proyecto, tarea, examen o similar, debes negarte educadamente, recordarle que tu función es solo proporcionar información para que él desarrolle su propio aprendizaje, y ofrecerle explicar los conceptos teóricos relacionados.

Responde de manera clara, concisa y educativa. Si es posible, incluye enlaces relevantes o recursos adicionales. Mantén un tono profesional pero accesible.

Mensaje del usuario: ${message}

Respuesta:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        // Extraer enlaces si hay (buscar URLs en la respuesta)
        const links = text.match(/https?:\/\/[^\s]+/g) || [];

        return {
          response: text,
          links: links
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Intento ${attempt} fallido:`, error.message);

        // Si es un error 503 (servicio no disponible), reintentar
        if (error.status === 503 && attempt < maxRetries) {
          console.log(`Reintentando en ${attempt * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Espera exponencial
          continue;
        }

        // Para otros errores, no reintentar
        break;
      }
    }

    console.error('Error final en el chatbot IA:', lastError);
    return {
      response: "Lo siento, el servicio de IA está temporalmente sobrecargado. Por favor, intenta de nuevo en unos minutos.",
      links: []
    };
  }

  generateConversationTitle(firstMessage: string): string {
    return firstMessage.substring(0, 50);
  }
}

export default ChatbotService;
