import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key');

export interface Question {
  question: string;
  options?: string[];
  correctAnswer: string;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
}

export async function generateQuestions(topics: string[], numQuestions: number): Promise<Question[]> {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy-key') {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Genera exactamente ${numQuestions} preguntas de opción múltiple sobre: ${topics.join(', ')}.

IMPORTANTE: Responde ÚNICAMENTE con un array JSON válido. No agregues texto adicional, explicaciones, o bloques de código.

Formato exacto (copia y pega este formato):
[
  {
    "question": "¿Cuál es la capital de Francia?",
    "options": ["a) Londres", "b) París", "c) Madrid", "d) Roma"],
    "correctAnswer": "b) París",
    "type": "multiple_choice"
  }
]

Asegúrate de que:
- Sea un array válido de objetos JSON
- Cada pregunta tenga exactamente 4 opciones (a, b, c, d)
- La respuesta correcta sea una de las opciones
- No haya comas finales innecesarias
- El JSON esté bien formado`;

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        if (!text) {
          throw new Error('No se pudo generar preguntas.');
        }

        // Limpiar el texto: remover bloques de código markdown si existen
        text = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();

        // Buscar el array JSON - encontrar el primer [ y el último ]
        const startIndex = text.indexOf('[');
        const endIndex = text.lastIndexOf(']');

        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
          console.error('Texto recibido:', text);
          throw new Error('No se encontró un array JSON válido en la respuesta.');
        }

        let jsonString = text.substring(startIndex, endIndex + 1);

        // Limpiar caracteres problemáticos
        jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

        console.log('JSON a parsear:', jsonString.substring(0, 200) + '...');

        const questions: Question[] = JSON.parse(jsonString);
        return Array.isArray(questions) && questions.length > 0 ? questions : [];
      } catch (error: any) {
        lastError = error;
        console.error(`Intento ${attempt} en generación de preguntas fallido:`, error.message);

        // Si es un error 503, reintentar
        if (error.status === 503 && attempt < maxRetries) {
          console.log(`Reintentando generación de preguntas en ${attempt * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }

        // Para otros errores, no reintentar
        break;
      }
    }

    console.error('Error final en generación de preguntas:', lastError);
    throw new Error('Fallo generación preguntas.');
  }

  throw new Error('API key Gemini no configurada.');
}
