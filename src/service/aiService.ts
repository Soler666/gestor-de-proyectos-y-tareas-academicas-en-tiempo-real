import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key');

export interface Question {
  question: string;
  options?: string[];
  correctAnswer: string;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
}

export async function generateQuestions(topics: string[], numQuestions: number): Promise<Question[]> {
  // Si hay API key configurada, usar Gemini
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy-key') {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
Genera ${numQuestions} preguntas de examen de opción múltiple (estilo ICFES/SABER) basadas en los siguientes temas: ${topics.join(', ')}.

IMPORTANTE:
- TODAS las preguntas deben ser de opción múltiple con exactamente 4 opciones (a, b, c, d)
- Las preguntas deben ser de nivel educativo real, desafiantes pero apropiadas para estudiantes
- Deben evaluar conocimientos específicos de los temas proporcionados
- Evita preguntas triviales o demasiado fáciles

Devuelve un JSON array de objetos con estructura exacta:
[{
  "question": "Texto completo de la pregunta",
  "options": ["a) Opción 1", "b) Opción 2", "c) Opción 3", "d) Opción 4"],
  "correctAnswer": "Letra de la respuesta correcta (ej: 'a)', 'b)', etc.)",
  "type": "multiple_choice"
}]

Ejemplos de preguntas buenas:
- "¿Cuál de los siguientes lenguajes de programación se utiliza principalmente para el desarrollo web del lado del cliente?"
  Opciones: ["a) Java", "b) HTML", "c) Python", "d) C++"]
  Respuesta correcta: "b) HTML"

- "¿Qué teorema establece que en un triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos?"
  Opciones: ["a) Teorema de Tales", "b) Teorema de Pitágoras", "c) Teorema de Euclides", "d) Teorema de Fermat"]
  Respuesta correcta: "b) Teorema de Pitágoras"

Asegúrate de que las preguntas sean variadas y cubran todos los temas especificados.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No se pudo generar preguntas con IA.');
      }

      // Extraer JSON del texto (Gemini puede devolver texto adicional)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('La respuesta de IA no contiene JSON válido.');
      }

      const questions: Question[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('La respuesta de IA no contiene preguntas válidas.');
      }

      return questions;
    } catch (error) {
      console.error('Error generando preguntas con IA:', error);
      throw new Error('Fallo en la generación de preguntas con IA. Verifica tu API key de Gemini.');
    }
  }

  // Si no hay API key configurada, lanzar error
  throw new Error('Gemini API key no configurada. Las preguntas solo pueden generarse con IA.');
}
