import os
import base64
import hashlib
import hmac

# Load encryption key from environment variable
# Expected to be a base64 encoded 32-byte key (256-bit AES)
KEY_STR = os.getenv("ENCRYPTION_KEY", "")

# Standard 32-byte base64 encoded fallback key for development / testing
# "a_32_byte_secret_key_for_aes_256" base64 encoded:
DEV_FALLBACK_KEY = "YV8zMl9ieXRlX3NlY3JldF9rZXlfZm9yX2Flc18yNTY="

if not KEY_STR:
    KEY_STR = DEV_FALLBACK_KEY

try:
    ENCRYPTION_KEY = base64.b64decode(KEY_STR.encode())
    if len(ENCRYPTION_KEY) != 32:
        ENCRYPTION_KEY = base64.b64decode(DEV_FALLBACK_KEY.encode())
except Exception:
    ENCRYPTION_KEY = base64.b64decode(DEV_FALLBACK_KEY.encode())

# Fallback: check if the 'cryptography' library is available and key is valid
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    aesgcm = AESGCM(ENCRYPTION_KEY)
    HAS_CRYPTOGRAPHY = True
except Exception:
    HAS_CRYPTOGRAPHY = False

def _pure_python_cipher(data: bytes, key: bytes, salt: bytes) -> bytes:
    """
    A pure-Python HMAC-SHA256 based stream cipher keystream generator (HKDF-like stream).
    XORs the input data with the generated keystream block-by-block.
    """
    out = bytearray()
    idx = 0
    block_num = 0
    # Seed the key stream using salt and key
    prk = hmac.new(salt, key, hashlib.sha256).digest()
    t = b""
    while len(out) < len(data):
        block_num += 1
        t = hmac.new(prk, t + bytes([block_num]), hashlib.sha256).digest()
        chunk_len = min(len(data) - len(out), len(t))
        for i in range(chunk_len):
            out.append(data[idx] ^ t[i])
            idx += 1
    return bytes(out)

def encrypt_string(val: str) -> str:
    """
    Encrypts a string. Uses AES-256-GCM if available, otherwise falls back to
    a pure-Python HMAC-SHA256 authenticated stream cipher.
    """
    if val is None:
        return None
    try:
        if HAS_CRYPTOGRAPHY:
            nonce = os.urandom(12)
            ct = aesgcm.encrypt(nonce, val.encode(), None)
            combined = nonce + ct
            return base64.b64encode(combined).decode()
        else:
            salt = os.urandom(12)
            ciphertext = _pure_python_cipher(val.encode(), ENCRYPTION_KEY, salt)
            mac = hmac.new(ENCRYPTION_KEY, salt + ciphertext, hashlib.sha256).digest()
            combined = salt + mac + ciphertext
            return base64.b64encode(combined).decode()
    except Exception:
        return val

def decrypt_string(val: str) -> str:
    """
    Decrypts a base64-encoded string.
    Uses AES-256-GCM if available, otherwise uses the pure-Python stream cipher.
    Returns original value if decryption/HMAC-verification fails.
    """
    if val is None:
        return None
    try:
        combined = base64.b64decode(val.encode())
        if HAS_CRYPTOGRAPHY:
            if len(combined) <= 12:
                return val
            nonce = combined[:12]
            ct = combined[12:]
            pt = aesgcm.decrypt(nonce, ct, None)
            return pt.decode()
        else:
            if len(combined) <= 12 + 32:
                return val
            salt = combined[:12]
            mac = combined[12:12+32]
            ciphertext = combined[12+32:]
            # Verify HMAC signature to authenticate the ciphertext
            expected_mac = hmac.new(ENCRYPTION_KEY, salt + ciphertext, hashlib.sha256).digest()
            if not hmac.compare_digest(mac, expected_mac):
                return val
            pt = _pure_python_cipher(ciphertext, ENCRYPTION_KEY, salt)
            return pt.decode()
    except Exception:
        # Graceful fallback for non-encrypted legacy values
        return val
