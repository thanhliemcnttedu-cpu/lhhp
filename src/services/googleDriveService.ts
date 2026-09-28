/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Flag to track sign-in in progress
let isSigningIn = false;
// Cached access token in memory (never in localStorage per security guidelines)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might need re-prompting or popup on demand
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không nhận được mã truy cập (access token) từ Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// -----------------------------------------------------------------------------
// GOOGLE DRIVE API UTILITIES
// Cây thư mục:
// APP: LỚP HỌC HẠNH PHÚC
//   ├── THƯ MỤC QUẢN TRỊ
//   ├── THƯ MỤC GIÁO VIÊN 1
//   ├── THƯ MỤC GIÁO VIÊN 2
//   └── THƯ MỤC GIÁO VIÊN N
// -----------------------------------------------------------------------------

const ROOT_FOLDER_NAME = 'APP: LỚP HỌC HẠNH PHÚC';
const ADMIN_FOLDER_NAME = 'THƯ MỤC QUẢN TRỊ';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

/**
 * Tìm hoặc tạo thư mục theo tên và thư mục cha
 */
export async function getOrCreateFolder(
  token: string, 
  folderName: string, 
  parentId?: string
): Promise<string> {
  const query = [
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
    parentId ? `'${parentId}' in parents` : "'root' in parents"
  ].join(' and ');

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Tạo thư mục mới nếu chưa tồn tại
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    throw new Error(`Không thể tạo thư mục Google Drive "${folderName}"`);
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Đảm bảo cây thư mục Google Drive hoàn chỉnh:
 * APP: LỚP HỌC HẠNH PHÚC -> THƯ MỤC QUẢN TRỊ & THƯ MỤC GIÁO VIÊN
 */
export async function ensureDriveTree(token: string, teacherName: string): Promise<{
  rootFolderId: string;
  teacherFolderId: string;
  adminFolderId: string;
}> {
  const rootFolderId = await getOrCreateFolder(token, ROOT_FOLDER_NAME);
  const teacherFolderId = await getOrCreateFolder(token, `THƯ MỤC GIÁO VIÊN: ${teacherName}`, rootFolderId);
  const adminFolderId = await getOrCreateFolder(token, ADMIN_FOLDER_NAME, rootFolderId);

  return { rootFolderId, teacherFolderId, adminFolderId };
}

/**
 * Lưu hoặc cập nhật tệp JSON vào Google Drive
 */
export async function saveJsonToDrive(
  token: string, 
  folderId: string, 
  fileName: string, 
  jsonData: any
): Promise<string> {
  const query = [
    `name = '${fileName.replace(/'/g, "\\'")}'`,
    'trashed = false',
    `'${folderId}' in parents`
  ].join(' and ');

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  let existingFileId: string | null = null;
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      existingFileId = data.files[0].id;
    }
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: existingFileId ? undefined : [folderId]
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(jsonData, null, 2) +
    closeDelimiter;

  if (existingFileId) {
    // Cập nhật tệp hiện có
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );
    if (!updateRes.ok) {
      throw new Error(`Cập nhật tệp ${fileName} thất bại`);
    }
    const resData = await updateRes.json();
    return resData.id;
  } else {
    // Tạo tệp mới
    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );
    if (!createRes.ok) {
      throw new Error(`Tạo tệp ${fileName} trên Google Drive thất bại`);
    }
    const resData = await createRes.json();
    return resData.id;
  }
}

/**
 * Đọc nội dung tệp JSON từ Google Drive
 */
export async function readJsonFromDrive(token: string, fileId: string): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Không thể tải tệp JSON từ Google Drive');
  }
  return await res.json();
}

/**
 * Liệt kê tất cả các tệp JSON trong thư mục giáo viên
 */
export async function listFilesInFolder(token: string, folderId: string): Promise<DriveFile[]> {
  const query = [
    `'${folderId}' in parents`,
    'trashed = false'
  ].join(' and ');

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.files || [];
}
