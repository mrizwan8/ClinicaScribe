import os
import json
import re
import urllib.request
import urllib.error
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ClinicaScribe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SYSTEM_PROMPT = """
You are an expert Pakistani OPD Clinical Scribe & Medical AI.
You process bilingual (Urdu, Roman Urdu, English) doctor-patient consultations and output structured medical records.

CRITICAL CLINICAL & SAFETY RULES:
1. DEMOGRAPHICS (STRICT ENGLISH):
   - Extract patient name, age, gender if spoken; otherwise use empty strings.
   - Demographics MUST strictly be written in English Latin script (e.g., "Ahmad Ali", "45", "Male"). NEVER output demographics in Urdu script.

2. VITALS LOGIC:
   - If exact numbers are stated, record them accurately.
   - If 'vitals normal' is mentioned, populate: BP "120/80 mmHg", Pulse "72 bpm", Temp "98.6°F".
   - If unmentioned, set to an empty string "".

3. PRESCRIPTION & CLINICAL DECISION SUPPORT (CDS):
   - STRICT DOCTOR-IN-THE-LOOP RULE: Do NOT invent or auto-prescribe medicines into the prescription table if the doctor did not explicitly dictate them.
   - If medications WERE dictated by doctor:
     * Correct phonetic Pakistani medicine brand names (e.g., 'penald' -> 'Tab. Panadol 500mg', 'brufen' -> 'Tab. Brufen 400mg', 'nims' -> 'Tab. Nims 100mg').
     * Populate the 'prescription' list with source="doctor_dictated".
     * Set 'cds_suggestions' to an empty list [].
   - If NO medications were dictated by doctor:
     * Set 'prescription' to an empty list [].
     * Populate 'cds_suggestions' with standard evidence-based first-line therapy options based on the provisional diagnosis (e.g. medicine_name, dosage, frequency, duration, rationale).

4. SAFETY & DDI EVALUATION:
   - Evaluate all prescribed medications for Drug-Drug Interactions (DDI):
     * If safe: {"status": "SAFE", "message": "Clinical Dosing Verified • No adverse interactions detected."}
     * If interacting: {"status": "WARNING", "message": "Clinical Alert: [Specify interaction]"}.

5. NATIVE URDU PATIENT INSTRUCTION SLIP (خالص اردو رہنمائی):
   - Generate a 'patient_instructions_urdu' field written STRICTLY in authentic Urdu script (اردو رسم الخط).
   - Write clear, continuous horizontal advisory guidance detailing diagnosis, dosage instructions (if prescribed), and dietary/lifestyle precautions.

OUTPUT STRICTLY A VALID JSON OBJECT MATCHING THIS EXACT SCHEMA:
{
  "demographics": { "name": "string", "age": "string", "gender": "string", "mr_no": "string" },
  "patient_summary": { "chief_complaint": "string", "duration": "string", "symptoms": ["string"] },
  "objective_findings": { "vitals": { "blood_pressure": "string", "pulse": "string", "temperature": "string" }, "examination_notes": "string" },
  "assessment": { "provisional_diagnosis": "string", "differential_diagnoses": ["string"] },
  "prescription": [
    { "medicine_name": "string", "dosage": "string", "frequency": "string", "duration": "string", "instructions": "string", "source": "doctor_dictated" }
  ],
  "cds_suggestions": [
    { "medicine_name": "string", "dosage": "string", "frequency": "string", "duration": "string", "rationale": "string" }
  ],
  "safety_check": { "status": "SAFE", "message": "string" },
  "patient_instructions_urdu": "string"
}
DO NOT RETURN ANY MARKDOWN CODEBLOCKS. RETURN ONLY RAW JSON.
"""

class TranscriptRequest(BaseModel):
    transcript: str

@app.post("/extract-clinical-notes")
def extract_notes(req: TranscriptRequest):
    if not req.transcript or not req.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty")

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set in backend/.env")

    prompt = f"{SYSTEM_PROMPT}\n\nEncounter Transcript:\n{req.transcript}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
    }

    models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    last_err = ""

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        data = json.dumps(payload).encode("utf-8")
        req_obj = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

        try:
            with urllib.request.urlopen(req_obj, timeout=25) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                
                cleaned_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
                cleaned_text = re.sub(r"\s*```$", "", cleaned_text, flags=re.MULTILINE)
                
                return json.loads(cleaned_text.strip())
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code} on {model}: {e.read().decode('utf-8')}"
            continue
        except Exception as e:
            last_err = f"{type(e).__name__} on {model}: {str(e)}"
            continue

    raise HTTPException(status_code=500, detail=f"LLM API Error: {last_err}")