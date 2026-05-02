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
    const arrayBuffer = await imageResp.arrayBuffer();
    
    // Формируем строгий промпт (инструкцию) для Gemini
    const prompt = `
      Ты — автоматизированный ассистент по учету продаж в кальянной.
      Проанализируй фото отчета о закрытии смены (кассовый чек или записи).
      Найди количество проданных позиций "Дымный коктейль 1" и "Дымный коктейль 2".
      Если названия немного отличаются, но смысл тот же — считай их.
      
      ВЕРНИ ОТВЕТ СТРОГО В ТАКОМ ФОРМАТЕ JSON, без Markdown и без лишних слов:
      {"cocktail1": X, "cocktail2": Y}
      Где X и Y — найденные количества. Если позиция не найдена, пиши 0.
    `;

    // Отправляем запрос
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: "image/jpeg", // Cloudinary обычно отдает jpeg
        },
      },
    ]);

    const responseText = result.response.text();
    
    // Пытаемся очистить ответ от возможных тегов ```json (иногда Gemini их добавляет)
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonString);

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