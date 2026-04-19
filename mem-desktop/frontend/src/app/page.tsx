'use client';
import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIngest = async () => {
    setLoading(true);
    const formData = new FormData();
    if (file) formData.append('file', file);
    else if (url) formData.append('url', url);
    else return;

    try {
      const res = await axios.post('http://localhost:8000/api/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(res.data.preview);
    } catch (err) {
      console.error(err);
      setPreview('Error processing file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Mem</h1>
      <div className="mt-4">
        <input type="file" accept=".pdf,.docx,.md,.txt,.html" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <p className="my-2">or</p>
        <input type="text" placeholder="Enter URL" className="border p-2 w-64" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button onClick={handleIngest} disabled={loading} className="ml-2 bg-blue-500 text-white p-2 rounded">
          {loading ? 'Processing...' : 'Ingest'}
        </button>
      </div>
      {preview && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="font-bold">Preview (first 500 chars):</h3>
          <pre className="whitespace-pre-wrap text-sm">{preview}</pre>
        </div>
      )}
    </main>
  );
}
