import os
import json
import httpx
from dotenv import load_dotenv
from services.sarvam_service import SarvamService

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# Default model
GROQ_MODEL = "llama-3.1-8b-instant"


class LLMService:
    @staticmethod
    def get_headers():
        return {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

    @classmethod
    async def extract_medical_info(cls, user_message: str) -> dict:
        """
        Sends the user message to Groq using the Master System Prompt in JSON Mode.
        Integrates Sarvam AI translation: translates Hindi queries to English before Groq extraction,
        and translates the final reply back to Hindi.
        """
        # Simple check for Hindi Unicode characters
        is_hindi = any(char in user_message for char in ["क", "ख", "ग", "म", "स", "ह"])

        # Translate Hindi message to English first to ensure precise Groq symptom extraction
        english_message = user_message
        if is_hindi:
            try:
                english_message = await SarvamService.translate(user_message, source="hi-IN", target="en-US")
                print(f"[LLMService] Translated input: '{user_message}' -> '{english_message}'")
            except Exception as e:
                print(f"[LLMService] Sarvam input translation failed: {e}")

        if not GROQ_API_KEY or GROQ_API_KEY.strip() == "":
            print("[LLMService] GROQ_API_KEY not set. Using mock extraction fallback.")
            return cls._mock_message_extraction(user_message)

        system_prompt = (
            "You are Swasthya AI's Medical Conversation Agent.\n\n"
            "Responsibilities:\n"
            "1. Speak ONLY in English.\n"
            "2. Never diagnose diseases.\n"
            "3. Provide symptom support and clarification.\n"
            "4. Extract structured medical information from every message.\n\n"
            "You MUST output a single valid JSON object with the following schema:\n"
            "{\n"
            "  \"conversational_response\": \"Your conversational reply to the patient, in English.\",\n"
            "  \"medical_event\": true/false,\n"
            "  \"extraction\": {\n"
            "    \"symptom_name\": \"Standardized symptom name in English (e.g., headache, chest pain, nausea) or null if not medical.\",\n"
            "    \"body_zone\": \"Affected body part (e.g., head, chest, abdomen) or null.\",\n"
            "    \"duration_days\": integer representing duration of this symptom in days, or null.\n"
            "    \"severity\": integer (1-10) representing pain/severity, or null.\n"
            "    \"onset\": \"sudden\" or \"gradual\" or null,\n"
            "    \"status\": \"active\" or \"resolved\" (resolved if user says symptom has stopped or is gone, otherwise active),\n"
            "    \"medication_mentions\": [\"list of medications mentioned\"],\n"
            "    \"confidence_score\": float confidence score from 0.0 to 1.0\n"
            "  }\n"
            "}\n\n"
            "Rules:\n"
            "1. Ignore non-medical messages (e.g., 'hi', 'thanks') and set medical_event = false, extraction = null.\n"
            "2. Do not diagnose; just describe symptoms reported.\n"
            "3. Parse duration references (e.g., 'for 3 days' -> duration_days = 3, 'for 2 weeks' -> duration_days = 14).\n"
        )

        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": english_message}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(GROQ_URL, headers=cls.get_headers(), json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    content_json = json.loads(content)

                    # If the user spoke Hindi originally, translate the English reply back to Hindi
                    if is_hindi:
                        eng_reply = content_json.get("conversational_response", "")
                        if eng_reply:
                            try:
                                hindi_reply = await SarvamService.translate(eng_reply, source="en-US", target="hi-IN")
                                content_json["conversational_response"] = hindi_reply
                                print(f"[LLMService] Translated output: '{eng_reply}' -> '{hindi_reply}'")
                            except Exception as e:
                                print(f"[LLMService] Sarvam output translation failed: {e}")

                    return content_json
                else:
                    print(f"[LLMService] Groq API returned status {res.status_code}: {res.text}")
                    return cls._mock_message_extraction(user_message)
        except Exception as e:
            print(f"[LLMService] Error invoking Groq completions: {e}")
            return cls._mock_message_extraction(user_message)

    @classmethod
    async def generate_clinical_summary(cls, chat_events: list, active_symptoms: list) -> str:
        """
        Generates a concise daily health summary using a list of chat event dictionaries.
        """
        if not GROQ_API_KEY or GROQ_API_KEY.strip() == "":
            print("[LLMService] GROQ_API_KEY not set. Using mock summary fallback.")
            return cls._mock_summary(chat_events, active_symptoms)

        history_str = "\n".join([
            f"{'Patient' if e.get('is_user') else 'Assistant'}: {e.get('message')}"
            for e in chat_events
        ])
        symptoms_str = ", ".join([
            f"{s['symptom_name']} (Severity: {s.get('current_severity') or 'N/A'}, Duration: {s.get('reported_duration_days') or 'N/A'} days)"
            for s in active_symptoms
        ])

        system_prompt = (
            "You are a clinical summarization assistant.\n"
            "Generate a concise clinical summary from the today's chat history and active symptoms log.\n"
            "Include:\n"
            "- Active symptoms & durations\n"
            "- New symptoms reported today\n"
            "- Resolved symptoms mentioned\n"
            "- Severity changes\n\n"
            "Constraints: Max 150 words. Write in a formal, clinical, objective third-person tone (e.g. 'Patient reports...')."
        )

        user_content = (
            f"Active Symptoms Log:\n{symptoms_str or 'None active'}\n\n"
            f"Chat History:\n{history_str or 'No chats today'}"
        )

        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.3
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(GROQ_URL, headers=cls.get_headers(), json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    return cls._mock_summary(chat_events, active_symptoms)
        except Exception as e:
            print(f"[LLMService] Summary extraction failed: {e}")
            return cls._mock_summary(chat_events, active_symptoms)

    @staticmethod
    def _mock_message_extraction(msg: str) -> dict:
        """
        Robust mock extractor to keep backend functional without API keys.
        Supports both Hindi and English mock responses.
        """
        lower = msg.lower()
        is_hindi = any(char in msg for char in ["क", "ख", "ग", "म", "स", "ह"])
        
        # Default fallback
        conversational = (
            "नमस्ते! मैंने आपके लक्षण नोट कर लिए हैं। कृपया अपनी सेहत का ध्यान रखें और कोई समस्या होने पर डॉक्टर से परामर्श करें।"
            if is_hindi else
            "Hello! I have noted your symptom. Please take care, monitor your vitals, and consult a doctor if severe."
        )
        
        res_json = {
            "conversational_response": conversational,
            "medical_event": False,
            "extraction": None
        }

        # Check for headache / सिरदर्द
        if "headache" in lower or "head" in lower or "सिरदर्द" in lower or "सिर दर्द" in lower:
            res_json["conversational_response"] = (
                "सिरदर्द के बारे में बताने के लिए धन्यवाद। क्या यह सिरदर्द तनाव, नींद की कमी या रक्तचाप के उतार-चढ़ाव से संबंधित हो सकता है?"
                if is_hindi else
                "Thank you for reporting the headache. Headaches can sometimes be linked to screen usage, dehydration, or blood pressure changes."
            )
            res_json["medical_event"] = True
            
            # Simple duration parser
            duration = 1
            if "3" in msg or "तीन" in msg:
                duration = 3
            elif "2" in msg or "दो" in msg:
                duration = 2
            elif "14" in msg or "10" in msg:
                duration = 14

            res_json["extraction"] = {
                "symptom_name": "headache",
                "body_zone": "head",
                "duration_days": duration,
                "severity": 5,
                "onset": "gradual",
                "status": "active",
                "medication_mentions": [],
                "confidence_score": 0.95
            }
        
        # Check for chest pain / छाती में दर्द
        elif "chest" in lower or "छाती" in lower or "घबराहट" in lower:
            res_json["conversational_response"] = (
                "🚨 छाती में दर्द या असहजता एक गंभीर लक्षण हो सकता है। कृपया तुरंत आराम करें और यदि दर्द बढ़े तो डॉक्टर से संपर्क करें।"
                if is_hindi else
                "🚨 Chest pain or discomfort is a critical symptom. Please rest immediately and seek emergency medical assistance if it worsens."
            )
            res_json["medical_event"] = True
            res_json["extraction"] = {
                "symptom_name": "chest pain",
                "body_zone": "chest",
                "duration_days": 1,
                "severity": 8,  # Critical
                "onset": "sudden",
                "status": "active",
                "medication_mentions": [],
                "confidence_score": 0.98
            }

        # Check for symptom resolution
        elif "gone" in lower or "fine" in lower or "ठीक" in lower or "चला गया" in lower or "दूर" in lower:
            res_json["conversational_response"] = (
                "यह जानकर बहुत खुशी हुई कि आपका लक्षण ठीक हो गया है! मैं इसे आपके रिकॉर्ड में दर्ज कर रहा हूँ।"
                if is_hindi else
                "It is great to hear that your symptoms have resolved! I am logging this in your health history tracker."
            )
            res_json["medical_event"] = True
            res_json["extraction"] = {
                "symptom_name": "headache", # default resolved target
                "body_zone": "head",
                "duration_days": None,
                "severity": None,
                "onset": None,
                "status": "resolved",
                "medication_mentions": [],
                "confidence_score": 0.90
            }

        return res_json

    @staticmethod
    def _mock_summary(chat_events: list, active_symptoms: list) -> str:
        symptoms_logged = [s["symptom_name"] for s in active_symptoms] if active_symptoms else ["none"]
        return (
            f"Patient checked in and discussed symptoms today. Active symptoms recorded: {', '.join(symptoms_logged)}. "
            "Condition appears stable overall. Adherence to daily prescription was recommended."
        )
