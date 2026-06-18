export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    furnitureBase64,
    furnitureMimeType,
    wallBase64,
    wallMimeType,
    furnitureType,
    height,
    width,
    depth
  } = req.body;

  if (!furnitureBase64) return res.status(400).json({ error: 'No furniture image provided' });
  if (!wallBase64)      return res.status(400).json({ error: 'No wall reference image provided' });

  // Build dynamic sections of the prompt
  const typeStr = furnitureType
    ? `Furniture type: ${furnitureType}`
    : 'Furniture type: as shown in the photograph — identify it from the image';

  const hasDimensions = height || width || depth;
  const dimStr = hasDimensions
    ? `Dimensions:\n  Height: ${height || '?'}"\n  Width:  ${width  || '?'}"\n  Depth:  ${depth  || '?'}"\nUse these dimensions to maintain accurate real-world scale.`
    : 'Dimensions: not supplied — use your best judgement based on the photograph and furniture type.';

  const prompt = `You are provided with two reference images:
1. A photograph of a piece of furniture (first image).
2. A photograph showing the Pinefinders showroom wall and carpet (second image).

Create a photorealistic image of the furniture displayed naturally within the showroom environment.

IMPORTANT
The showroom image is a reference for the appearance of the environment, not a fixed background.
Learn and preserve:
- The wall colour and texture
- The carpet colour and texture
- The overall lighting style
- The character and appearance of the showroom
You may change the camera position, viewing angle, perspective and composition as needed.
Do not simply paste the furniture onto the supplied wall photograph.
Instead, recreate the same showroom environment realistically from whatever angle is required to produce the best furniture photograph.

FURNITURE PLACEMENT
${typeStr}
${dimStr}
Position the furniture naturally and realistically.
Examples:
- Wardrobes, cupboards, bookcases and chests of drawers should normally be placed against the wall.
- Tables, desks and dining tables may be positioned away from the wall where appropriate.
- Benches, chairs and other freestanding items should be positioned naturally according to their function.
The furniture must never appear to float, intersect walls, sink into the carpet or appear incorrectly scaled.

FURNITURE PRESERVATION
Preserve the furniture exactly as shown in the reference image.
Do not alter:
- Design or proportions
- Colour or finish
- Handles or hardware
- Doors, drawers or shelves
- Surface character, wear, marks or patina
Do not add or remove any features.

PHOTOGRAPHY REQUIREMENTS
Create the image as though it were photographed professionally for an antique furniture sales listing.
Use:
- Natural perspective and realistic room depth
- Accurate shadows, including contact shadows where the furniture meets the carpet
- Realistic lighting consistent with the showroom reference
- High-resolution photorealistic quality
The furniture must remain the primary subject.

ENVIRONMENT CONSISTENCY
The resulting image should clearly look as though it was photographed within the same showroom represented by the reference wall and carpet image, even when viewed from a different angle.
The wall, carpet, colours, textures and overall appearance should remain consistent.

FINAL RESULT
Produce a realistic showroom photograph that appears to have been taken inside the actual Pinefinders showroom, with the furniture correctly scaled, naturally positioned and professionally photographed.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: furnitureMimeType || 'image/jpeg', data: furnitureBase64 } },
              { inline_data: { mime_type: wallMimeType      || 'image/jpeg', data: wallBase64      } }
            ]
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || 'Gemini API error',
        details: data
      });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inline_data);

    if (!imagePart) {
      const textPart = parts.find(p => p.text);
      const reason = data.candidates?.[0]?.finishReason || 'unknown';
      console.error('No image in response:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Gemini did not return an image',
        reason,
        geminiText: textPart?.text || null
      });
    }

    return res.status(200).json({
      imageBase64: imagePart.inline_data.data,
      mimeType:    imagePart.inline_data.mime_type
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
