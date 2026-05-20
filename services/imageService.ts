// services/imageService.ts

const DB_NAME = 'MyEbookImagesDB';
const STORE_NAME = 'images';

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveImage(key: string, base64Data: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(base64Data, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function loadImage(key: string): Promise<string | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteImage(key: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getAllImages(): Promise<Record<string, string>> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        const keysRequest = store.getAllKeys();

        tx.oncomplete = () => {
            const images: Record<string, string> = {};
            const keys = keysRequest.result as string[];
            const values = request.result as string[];
            for (let i = 0; i < keys.length; i++) {
                images[keys[i]] = values[i];
            }
            resolve(images);
        };
        tx.onerror = () => reject(tx.error);
    });
}

export async function restoreImages(images: Record<string, string>): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        for (const [key, base64Data] of Object.entries(images)) {
            store.put(base64Data, key);
        }
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
