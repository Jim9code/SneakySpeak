import { API_URL } from './config';

interface UploadResponse {
    success: boolean;
    fileUrl: string;
    error?: string;
}

class UploadService {
    async uploadMeme(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('meme', file);

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload meme');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading meme:', error);
            throw error;
        }
    }
}

export const uploadService = new UploadService(); 