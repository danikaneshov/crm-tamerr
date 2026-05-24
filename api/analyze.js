/* global process, Buffer */
// api/analyze.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Необходима ссылка на изображение' });
  }

  // Берем ключ из переменных окружения Vercel
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Скачиваем картинку по ссылке из Cloudinary
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      throw new Error(`Не удалось скачать изображение: ${imageResp.status}`);
    }
    const arrayBuffer = await imageResp.arrayBuffer();
    
    // Определяем MIME-тип из ответа Cloudinary (вместо хардкода)
    const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    
    // Формируем строгий промпт (инструкцию) для Gemini
    const prompt = `
      Ты — автоматизированный ассистент по учету продаж в кальянной.
      
      Проанализируй фото отчета о закрытии смены. Это может быть кассовый чек, рукописная запись, скриншот из системы учёта или любой другой формат отчёта.
      
      Твоя задача: найти количество проданных КАЛЬЯНОВ двух типов:
      - "cocktail1" — основной кальян. Может называться: "Дымный коктейль 1", "Кальян", "Hookah", "ДК1", "Коктейль 1", "Калян", или просто первая позиция кальянов в списке.
      - "cocktail2" — замена/второй тип. Может называться: "Дымный коктейль 2", "Замена", "ДК2", "Коктейль 2", или вторая позиция кальянов.
      
      Правила:
      1. Ищи КОЛИЧЕСТВО проданных штук, а не цену.
      2. Если видишь только одну общую позицию кальянов без разделения — запиши всё в cocktail1, а cocktail2 = 0.
      3. Если позиция не найдена — пиши 0.
      4. Не путай количество с ценой или номером позиции.
      5. Внимательно читай числа — не путай 1 и 7, 6 и 8.
      
      ВЕРНИ ОТВЕТ СТРОГО В ФОРМАТЕ JSON, без Markdown, без комментариев, без лишних слов:
      {"cocktail1": X, "cocktail2": Y}
    `;

    // Отправляем запрос
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    
    // Надёжный парсинг: убираем markdown-обёртки и ищем JSON
    let parsedData;
    try {
      // Убираем ```json ... ``` обёртки
      const cleanJsonString = responseText
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```/g, '')
        .trim();
      parsedData = JSON.parse(cleanJsonString);
    } catch {
      // Фоллбэк: извлекаем JSON через regex
      const jsonMatch = responseText.match(/\{[\s\S]*?"cocktail1"\s*:\s*(\d+)[\s\S]*?"cocktail2"\s*:\s*(\d+)[\s\S]*?\}/);
      if (jsonMatch) {
        parsedData = {
          cocktail1: parseInt(jsonMatch[1], 10),
          cocktail2: parseInt(jsonMatch[2], 10)
        };
      } else {
        // Последняя попытка: ищем любые два числа в контексте
        const numbers = responseText.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          parsedData = {
            cocktail1: parseInt(numbers[0], 10),
            cocktail2: parseInt(numbers[1], 10)
          };
        } else {
          throw new Error(`Не удалось распарсить ответ Gemini: ${responseText}`);
        }
      }
    }

    // Валидация: убеждаемся что значения — числа
    parsedData.cocktail1 = Number(parsedData.cocktail1) || 0;
    parsedData.cocktail2 = Number(parsedData.cocktail2) || 0;

    // Возвращаем результат обратно в приложение
    res.status(200).json(parsedData);

  } catch (error) {
    console.error('Ошибка анализа Gemini:', error);
    res.status(500).json({ 
      error: "Ошибка при анализе фото искусственным интеллектом", 
      details: error.message 
    });
  }
}