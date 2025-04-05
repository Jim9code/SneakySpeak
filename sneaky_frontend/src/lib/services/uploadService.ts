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
            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to upload meme');
                } else {
                    const text = await response.text();
                    console.error('Non-JSON response:', text);
                    throw new Error('Server error: Failed to upload meme');
                }
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error uploading meme:', error);
            throw error;
        }
    }
}

export const uploadService = new UploadService(); 