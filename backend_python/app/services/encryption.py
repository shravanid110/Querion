# Mapping: c:\Users\lenovo\Desktop\Querion\querion\backend\src\services\encryption.ts
import base64
import hashlib
from Crypto.Cipher import AES
from Crypto import Random
from app.config import settings

# This implementation is compatible with CryptoJS.AES.encrypt(text, password)
# Source: https://stackoverflow.com/questions/36762098/how-to-decrypt-aes-256-cbc-data-encrypted-by-cryptojs-in-python

def derive_key_and_iv(password, salt, key_length, iv_length):
    d = d_i = b""
    while len(d) < key_length + iv_length:
        d_i = hashlib.md5(d_i + password + salt).digest()
        d += d_i
    return d[:key_length], d[key_length:key_length + iv_length]

def encrypt(text: str) -> str:
    """Equivalent to CryptoJS.AES.encrypt(text, SECRET_KEY).toString()"""
    try:
        if not text:
            return ""
        
        password = settings.ENCRYPTION_KEY.encode('utf-8')
        salt = Random.new().read(8)
        key_length = 32
        iv_length = 16
        key, iv = derive_key_and_iv(password, salt, key_length, iv_length)
        
        # Padding
        bs = AES.block_size
        pad = lambda s: s + (bs - len(s) % bs) * chr(bs - len(s) % bs)
        
        cipher = AES.new(key, AES.MODE_CBC, iv)
        encrypted_bytes = cipher.encrypt(pad(text).encode('utf-8'))
        
        # CryptoJS format: Salted__ + salt + encrypted_bytes
        result = b"Salted__" + salt + encrypted_bytes
        return base64.b64encode(result).decode('utf-8')
    except Exception as e:
        print(f"Encryption error: {str(e)}")
        return text

def decrypt(cipher_text: str) -> str:
    """Equivalent to CryptoJS.AES.decrypt(cipherText, SECRET_KEY).toString(CryptoJS.enc.Utf8)"""
    try:
        if not cipher_text:
            return ""

        # Legacy check
        if ":" in cipher_text:
            print("Legacy encryption format detected. This connection needs to be re-saved.")
            return cipher_text

        data = base64.b64decode(cipher_text)
        if data[:8] != b"Salted__":
            # Identity fallback for short raw strings or non-salted
            if len(cipher_text) < 15:
                return cipher_text
            return cipher_text

        salt = data[8:16]
        encrypted_bytes = data[16:]
        
        password = settings.ENCRYPTION_KEY.encode('utf-8')
        key_length = 32
        iv_length = 16
        key, iv = derive_key_and_iv(password, salt, key_length, iv_length)
        
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted_bytes = cipher.decrypt(encrypted_bytes)
        
        # Unpadding
        unpad = lambda s: s[:-ord(s[len(s)-1:])]
        decrypted = unpad(decrypted_bytes).decode('utf-8')
        
        if not decrypted:
            if len(cipher_text) < 15:
                return cipher_text
            print("Decryption failed to produce UTF-8 output.")
            return cipher_text
            
        return decrypted
    except Exception as e:
        print(f"Decryption exception: {str(e)}")
        return cipher_text
