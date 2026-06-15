import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

class SarvamService:
    @staticmethod
    def get_headers():
        return {
            "api-subscription-key": SARVAM_API_KEY or "",
            "Content-Type": "application/json"
        }

    @classmethod
    async def translate(cls, text: str, source: str = "auto", target: str = "hi-IN") -> str:
        """
        Translates text from source language (or auto-detected) to target language using Sarvam AI.
        """
        if not SARVAM_API_KEY or SARVAM_API_KEY.strip() == "":
            print("[SarvamService] SARVAM_API_KEY not configured. Skipping translation.")
            return text

        url = "https://api.sarvam.ai/translate"
        payload = {
            "input": text,
            "source_language_code": source,
            "target_language_code": target,
            "model": "sarvam-translate:v1"
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, headers=cls.get_headers(), json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("translated_text", text)
                else:
                    print(f"[SarvamService] API returned status {res.status_code}: {res.text}")
                    return text
        except Exception as e:
            print(f"[SarvamService] Exception during translation: {e}")
            return text
