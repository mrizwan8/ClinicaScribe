# ClinicaScribe — Ambient AI Medical Scribe for Bilingual OPDs

ClinicaScribe is an ambient clinical documentation and prescription safety platform built specifically for high-volume bilingual (Urdu/English) Outpatient Departments (OPDs). It listens to ambient doctor-patient dialogue, generates structured SOAP clinical records, conducts real-time Drug-Drug Interaction (DDI) checks, provides physician-governed Clinical Decision Support (CDS), and produces an authentic Nastaliq Urdu patient advisory slip formatted for standard 1-page A4 printing.

---

## Key Clinical Innovations

- **Bilingual Acoustic Capture:** Real-time streaming calibrated for Pakistani clinical dialogue (Urdu, Roman Urdu, and English medical terminology).
- **Automated SOAP Structuring:** Converts conversational consultation into structured Demographics, Chief Complaints, Objective Vitals, Provisional Diagnosis, and Prescriptions.
- **Physician-in-the-Loop CDS:** Automatically presents evidence-based first-line therapy suggestions if no medicines are dictated, requiring explicit doctor approval before prescribing.
- **Drug-Drug Interaction (DDI) Guard:** Real-time clinical safety badge flagging dangerous contraindications (e.g., NSAID conflicts like Brufen + Aspirin).
- **Authentic Nastaliq Urdu Tear-off Slip:** Automatically translates and formats dosage instructions and precautions into native Urdu script for patient adherence.
- **Single-Page Physical Printout:** Full EHR note, medication table, Urdu slip, and medico-legal physician stamp formatted to fit on a single physical A4 page.

---

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend:** FastAPI, Python 3.10+, Uvicorn
- **AI Engine:** Google Gemini API (Structured JSON Schema Enforcement)

---

## Quickstart Guide

### 1. Backend Setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt