import CryptoJS from 'crypto-js';

const SECRET_KEY = (process.env.ENCRYPTION_KEY || 'default-secret-key-change-me').replace(/["']/g, "").trim();

export const encrypt = (text: string): string => {
    try {
        if (!text) return '';
        return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    } catch (e: any) {
        console.error("Encryption error:", e.message);
        return text;
    }
};

export const decrypt = (cipherText: string): string => {
    try {
        if (!cipherText) return '';

        // Check for old format (iv:hex) from previous native-crypto version
        if (cipherText.includes(':')) {
            console.warn("Legacy encryption format detected. This connection needs to be re-saved.");
            return cipherText;
        }

        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        if (!decrypted) {
            // Identity fallback for short raw strings
            if (cipherText.length < 15) return cipherText;
            console.warn("Decryption failed to produce UTF-8 output. Possible wrong key or corrupted data.");
            return cipherText;
        }
        return decrypted;
    } catch (e: any) {
        console.error("Decryption exception:", e.message);
        return cipherText;
    }
};

