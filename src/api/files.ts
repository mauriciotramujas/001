const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';
const BASE_URL = VITE_BACKEND_URL.endsWith('/api')
  ? VITE_BACKEND_URL
  : `${VITE_BACKEND_URL.replace(/\/$/, '')}/api`;

export async function uploadWorkspaceFile(
  workspaceId: string,
  file: File,
  folder = 'general'
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspaceId', `${workspaceId}/${folder}`);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Failed to upload file');
  }

  return res.json();
}

export async function listWorkspaceFiles(
  workspaceId: string,
  folder = 'general'
) {
  const res = await fetch(`${BASE_URL}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId: `${workspaceId}/${folder}` }),
  });
  if (!res.ok) {
    throw new Error('Failed to list files');
  }
  const data = await res.json();
  return data.files as { fileName: string }[];
}

export async function downloadWorkspaceFile(
  workspaceId: string,
  name: string,
  folder = 'general'
) {
  const res = await fetch(`${BASE_URL}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId: `${workspaceId}/${folder}`, fileName: name }),
  });
  if (!res.ok) {
    throw new Error('Failed to download file');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
