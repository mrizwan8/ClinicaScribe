from pydantic import BaseModel, Field
from typing import List, Optional

class PatientDemographics(BaseModel):
    name: Optional[str] = Field(default="Patient (OPD)", description="Extracted patient name")
    age: Optional[str] = Field(default="--", description="Extracted age")
    gender: Optional[str] = Field(default="--", description="Extracted gender")
    mr_no: Optional[str] = Field(default="OPD-8821", description="MR or OPD Token Number")

class Vitals(BaseModel):
    blood_pressure: Optional[str] = Field(default="120/80 mmHg")
    pulse: Optional[str] = Field(default="72 bpm")
    temperature: Optional[str] = Field(default="98.6°F")

class PatientSummary(BaseModel):
    chief_complaint: str = Field(description="Primary symptoms")
    duration: str = Field(description="Duration of illness")
    symptoms: List[str] = Field(default=[])

class ObjectiveFindings(BaseModel):
    vitals: Vitals
    examination_notes: Optional[str] = Field(default="")

class Assessment(BaseModel):
    provisional_diagnosis: str = Field(description="Primary diagnosis")
    differential_diagnoses: List[str] = Field(default=[])

class PrescriptionItem(BaseModel):
    medicine_name: str
    dosage: Optional[str] = Field(default="500mg")
    frequency: Optional[str] = Field(default="1-0-1 (BD)")
    duration: Optional[str] = Field(default="3-5 days")
    instructions: Optional[str] = Field(default="Take orally after meals")
    source: Optional[str] = Field(default="doctor_dictated")

class SafetyEvaluation(BaseModel):
    status: str = Field(default="SAFE", description="'SAFE' or 'WARNING'")
    message: str = Field(default="Dosing verified • No contraindications detected")

class ClinicalNoteResponse(BaseModel):
    demographics: Optional[PatientDemographics] = None
    patient_summary: PatientSummary
    objective_findings: ObjectiveFindings
    assessment: Assessment
    prescription: List[PrescriptionItem]
    safety_check: Optional[SafetyEvaluation] = None