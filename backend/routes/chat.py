from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from services.supabase_service import supabase
from services.llm_service import LLMService

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessageRequest(BaseModel):
    patient_id: str
    session_id: str
    message: str
    patient_context: dict = None

class EndSessionRequest(BaseModel):
    patient_id: str
    session_id: str = None

@router.post("/message")
async def process_chat_message(req: ChatMessageRequest):
    """
    Main endpoint for chatbot interaction. Processes user messages, extracts structured clinical
    information via Groq Llama 3, logs raw interactions to chat_events, and updates symptom_tracker.
    """
    # 1. Invoke Groq completion / clinical extractor
    res = await LLMService.extract_medical_info(req.message)
    bot_reply = res.get("conversational_response", "Thank you for the update.")
    is_med = res.get("medical_event", False)
    
    # 2. Log raw transaction to public.chat_events
    is_hindi = any(char in req.message for char in ["क", "ख", "ग", "म", "स", "ह"])
    chat_event = {
        "patient_id": req.patient_id,
        "message": req.message,
        "response": bot_reply,
        "language": "hi-IN" if is_hindi else "en-US",
        "medical_event": is_med
    }
    
    try:
        supabase.table("chat_events").insert(chat_event).execute()
    except Exception as e:
        print(f"[chat_events] Failed to log event: {e}")
        # Proceed anyway so the chat response completes even if DB log fails

    # 3. Process symptom tracker update if confidence is >= 0.70
    if is_med and res.get("extraction"):
        ext = res["extraction"]
        confidence = ext.get("confidence_score", 0.0)
        symptom_name = ext.get("symptom_name", "").strip().lower()
        status = ext.get("status", "active")
        
        if confidence >= 0.70 and symptom_name:
            try:
                if status == "resolved":
                    # Update active occurrences of this symptom to resolved
                    supabase.table("symptom_tracker").update({
                        "status": "resolved",
                        "resolved_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("user_id", req.patient_id).eq("symptom_name", symptom_name).eq("status", "active").execute()
                else:
                    # Check for an active instance of this symptom
                    active_res = supabase.table("symptom_tracker").select("*").eq("user_id", req.patient_id).eq("symptom_name", symptom_name).eq("status", "active").execute()
                    
                    if active_res.data:
                        # Update existing active symptom occurrence
                        existing = active_res.data[0]
                        existing_duration = existing.get("reported_duration_days") or 0
                        extracted_duration = ext.get("duration_days") or 0
                        updated_duration = max(existing_duration, extracted_duration)
                        
                        existing_max = existing.get("max_severity") or 0
                        current_severity = ext.get("severity") or 0
                        max_severity = max(existing_max, current_severity)
                        occurrence_count = (existing.get("occurrence_count") or 1) + 1
                        
                        supabase.table("symptom_tracker").update({
                            "last_reported_at": datetime.utcnow().isoformat(),
                            "current_severity": current_severity,
                            "max_severity": max_severity,
                            "occurrence_count": occurrence_count,
                            "reported_duration_days": updated_duration,
                            "updated_at": datetime.utcnow().isoformat()
                        }).eq("id", existing["id"]).execute()
                    else:
                        # Create a new active symptom tracker record
                        severity = ext.get("severity")
                        duration = ext.get("duration_days") or 0
                        onset = ext.get("onset") or "gradual"
                        meds = ext.get("medication_mentions") or []
                        notes = f"Onset: {onset}. Meds: {', '.join(meds) if meds else 'None'}"
                        
                        symptom_payload = {
                            "user_id": req.patient_id,
                            "symptom_name": symptom_name,
                            "body_zone": ext.get("body_zone"),
                            "first_reported_at": datetime.utcnow().isoformat(),
                            "last_reported_at": datetime.utcnow().isoformat(),
                            "status": "active",
                            "current_severity": severity,
                            "max_severity": severity,
                            "occurrence_count": 1,
                            "reported_duration_days": duration,
                            "notes": notes
                        }
                        supabase.table("symptom_tracker").insert(symptom_payload).execute()
            except Exception as e:
                print(f"[symptom_tracker] Failed to update symptom: {e}")

    return {
        "bot_reply": bot_reply,
        "extracted_symptom": res.get("extraction"),
        "medical_event": is_med
    }

@router.post("/end-session")
async def end_chat_session(req: EndSessionRequest):
    """
    On-demand summary endpoint. Fetches active symptoms and today's chat logs
    for the patient, calls Groq LLM to summarize, and saves to daily_summaries.
    """
    try:
        # Fetch active symptoms
        active_symptoms = supabase.table("symptom_tracker").select("*").eq("user_id", req.patient_id).eq("status", "active").execute()
        
        # Fetch today's chat events
        today = datetime.utcnow().date().isoformat()
        chat_events_res = supabase.table("chat_events").select("*").eq("patient_id", req.patient_id).gte("created_at", today).execute()
        
        # Generate summary using LLMService
        summary_text = await LLMService.generate_clinical_summary(chat_events_res.data, active_symptoms.data)
        
        # Calculate daily summary metadata
        symptoms_list = [s["symptom_name"] for s in active_symptoms.data]
        max_severity = max([s["current_severity"] for s in active_symptoms.data if s.get("current_severity") is not None]) if active_symptoms.data else None
        requires_followup = any([s.get("current_severity", 0) >= 7 for s in active_symptoms.data])
        
        summary_payload = {
            "user_id": req.patient_id,
            "summary_date": today,
            "summary": summary_text,
            "symptoms": symptoms_list,
            "severity_max": max_severity,
            "requires_followup": requires_followup
        }
        
        supabase.table("daily_summaries").insert(summary_payload).execute()
        
        return {
            "daily_summary": summary_text,
            "urgency": "Urgent" if requires_followup else "Normal",
            "key_risks": "Urgent follow-up recommended due to high-severity symptoms." if requires_followup else "None detected",
            "symptoms_today": symptoms_list
        }
    except Exception as e:
        print(f"[end-session] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {e}")

@router.post("/cron/daily-summaries")
async def cron_generate_daily_summaries():
    """
    Nightly cron endpoint to generate daily summaries for all active patients today.
    """
    try:
        today = datetime.utcnow().date().isoformat()
        recent_chats = supabase.table("chat_events").select("patient_id").gte("created_at", today).execute()
        patient_ids = list(set([c["patient_id"] for c in recent_chats.data]))
        
        processed_count = 0
        for patient_id in patient_ids:
            # Check if summary already exists for today
            existing_summary = supabase.table("daily_summaries").select("id").eq("user_id", patient_id).eq("summary_date", today).execute()
            if existing_summary.data:
                continue # Already summary generated for today
                
            active_symptoms = supabase.table("symptom_tracker").select("*").eq("user_id", patient_id).eq("status", "active").execute()
            chat_events_res = supabase.table("chat_events").select("*").eq("patient_id", patient_id).gte("created_at", today).execute()
            
            summary_text = await LLMService.generate_clinical_summary(chat_events_res.data, active_symptoms.data)
            
            symptoms_list = [s["symptom_name"] for s in active_symptoms.data]
            max_severity = max([s["current_severity"] for s in active_symptoms.data if s.get("current_severity") is not None]) if active_symptoms.data else None
            requires_followup = any([s.get("current_severity", 0) >= 7 for s in active_symptoms.data])
            
            summary_payload = {
                "user_id": patient_id,
                "summary_date": today,
                "summary": summary_text,
                "symptoms": symptoms_list,
                "severity_max": max_severity,
                "requires_followup": requires_followup
            }
            supabase.table("daily_summaries").insert(summary_payload).execute()
            processed_count += 1
            
        return {
            "status": "success",
            "message": f"Processed summaries for {processed_count} active users",
            "active_users_today": patient_ids
        }
    except Exception as e:
        print(f"[cron] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
