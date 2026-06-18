export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const prompt = `You are helping a furniture antique warehouse create professional product photos.

The uploaded image shows a piece of antique pine furniture. Place it realistically inside a traditional English furniture showroom warehouse. The showroom has white-painted brick walls, grey carpet tiles on the floor, and warm ambient lighting typical of a furniture showroom.

Show the complete piece of furniture clearly and realistically positioned in the space, as if photographed by a professional. The furniture should be the clear focal point of the image. Maintain accurate proportions and realistic, natural lighting. The setting should look authentic — not computer-generated.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['image', 'text']
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Gemini API error',
        details: data
      });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inline_data);

    if (!imagePart) {
      console.error('No image in Gemini response:', JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: 'Gemini did not return an image',
        raw: data
      });
    }

    return res.status(200).json({
      imageBase64: imagePart.inline_data.data,
      mimeType: imagePart.inline_data.mime_type
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
