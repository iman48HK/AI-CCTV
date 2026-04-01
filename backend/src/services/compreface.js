/**
 * CompreFace integration for face recognition.
 * Requires COMPREFACE_URL and COMPREFACE_RECOGNITION_API_KEY in env.
 */

const BASE = process.env.COMPREFACE_URL || 'http://localhost:8000';

function getApiKey() {
  return process.env.COMPREFACE_RECOGNITION_API_KEY;
}

function isConfigured() {
  return !!(BASE && getApiKey());
}

async function addFaceToSubject(subject, imageBase64) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'face.jpg');

  const url = `${BASE}/api/v1/recognition/faces?subject=${encodeURIComponent(subject)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CompreFace add face failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function deleteSubject(subject) {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const url = `${BASE}/api/v1/recognition/faces?subject=${encodeURIComponent(subject)}`;
  await fetch(url, {
    method: 'DELETE',
    headers: { 'x-api-key': apiKey },
  });
}

async function recognize(imageBase64) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: 'CompreFace not configured' };
  }

  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const url = `${BASE}/api/v1/recognition/recognize?prediction_count=3`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ file: base64 }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `CompreFace error: ${res.status} ${text}` };
  }

  const data = await res.json();
  return data;
}

export default { isConfigured, addFaceToSubject, deleteSubject, recognize };
