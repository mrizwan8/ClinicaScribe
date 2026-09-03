import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, Mic, MicOff, Sparkles, Printer, 
  RefreshCw, AlertCircle, Plus, Trash2, 
  MoreHorizontal, RotateCcw,
  FileText, Pill, HeartPulse, ClipboardCheck, ShieldCheck, AlertTriangle, History, BookOpen, Lightbulb, Check, CheckCircle2
} from 'lucide-react';

const EVALUATION_SCENARIOS = {
  scenarioA: {
    label: "Scenario A: High-Volume Acute OPD (Bilingual Voice & Vitals)",
    description: "Acute Upper Respiratory Infection with mixed Urdu/English dialogue & vitals normalization",
    text: "Patient: Assalam-o-Alaikum doctor sahab, mera naam Ahmad Ali hai, umar 34 saal hai. Teen din se bukhar 102 tak ja raha hai, gala shadeed kharab hai aur nigalne mein dard hai. Sath thakan bhi bohot hai.\nDoctor: Walaikum Assalam Ahmad sahab. Check kar liya hai, gale mein tonsils pe sujan hai. Aapka BP 120/80 mmHg hai aur pulse 78 bpm hai. Tab Augmentin 625mg lein subha sham khane ke baad 5 din, Tab Panadol 500mg lein 1 goli subha sham, aur Hydryllin syrup 2 chammach raat ko sote waqt lein. Thandi cheezon se mukammal parhez karein."
  },
  scenarioB: {
    label: "Scenario B: Safety Guardrail (Drug-Drug Interaction Alert)",
    description: "Multi-morbid patient prescribed conflicting NSAIDs (Brufen + Aspirin)",
    text: "Patient: Doctor sahab mera naam Kamran Khan hai, umar 45 saal hai. Mere ghutno mein shadeed dard aur soojan hai, aur pet mein jalan aur tezabiat bhi rehti hai.\nDoctor: Theek hai Kamran sahab, dard ke liye aap Tab Brufen 400mg subha sham khane ke baad lein aur sath Tab Aspirin 75mg rozana subha lein."
  },
  scenarioC: {
    label: "Scenario C: Clinical Decision Support (No Rx Spoken -> CDS Assist)",
    description: "Doctor diagnoses Acute Tonsillitis but does not dictate medicines, triggering first-line CDS",
    text: "Patient: Doctor sahab mera naam Tariq Mehmood hai, meri umar 48 saal hai. Teen din se gala shadeed kharab hai, nigalne mein dard hai aur bukhar mehsoos hota hai.\nDoctor: Maine check kar liya hai, gale mein bacterial tonsillitis ka severe infection hai. BP 125/82 mmHg hai aur temperature 101°F hai."
  }
};

export default function App() {
  const [transcript, setTranscript] = useState(EVALUATION_SCENARIOS.scenarioA.text);
  const [loading, setLoading] = useState(false);
  const [clinicalData, setClinicalData] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ur-PK');
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [doctorVerified, setDoctorVerified] = useState(false);

  const [patientInfo, setPatientInfo] = useState({
    name: "",
    age: "",
    gender: "",
    mrNo: ""
  });

  const isRecordingRef = useRef(false);
  const recognitionRef = useRef(null);
  const selectedLangRef = useRef(selectedLang);
  const wordsHistoryRef = useRef([]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    selectedLangRef.current = selectedLang;
  }, [selectedLang]);

  useEffect(() => {
    const saved = localStorage.getItem('clinicascribe_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const initSpeechEngine = (langCode) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Please open in Google Chrome for real-time speech transcription.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langCode || selectedLangRef.current;

    recognition.onresult = (event) => {
      let rawTextStream = '';
      for (let i = 0; i < event.results.length; ++i) {
        rawTextStream += event.results[i][0].transcript + ' ';
      }

      const words = rawTextStream.trim().split(/\s+/).filter(Boolean);
      words.forEach((w) => {
        if (!wordsHistoryRef.current.includes(w) || wordsHistoryRef.current.slice(-3).indexOf(w) === -1) {
          wordsHistoryRef.current.push(w);
        }
      });

      if (rawTextStream.trim()) {
        setTranscript(rawTextStream.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError("Microphone permission denied. Please allow microphone access in Chrome.");
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          const fresh = initSpeechEngine(selectedLangRef.current);
          if (fresh) {
            recognitionRef.current = fresh;
            try { fresh.start(); } catch (err) {}
          }
        }
      }
    };

    return recognition;
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLang(newLang);
    selectedLangRef.current = newLang;

    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (err) {}
      }
      setTimeout(() => {
        const engine = initSpeechEngine(newLang);
        if (engine) {
          recognitionRef.current = engine;
          try { engine.start(); } catch (err) {}
        }
      }, 100);
    }
  };

  const handleVoiceToggle = () => {
    setError(null);
    if (isRecording) {
      setIsRecording(false);
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    } else {
      const engine = initSpeechEngine(selectedLangRef.current);
      if (engine) {
        recognitionRef.current = engine;
        try {
          engine.start();
          setIsRecording(true);
          isRecordingRef.current = true;
        } catch (err) {
          setError("Microphone start failed. Please check permissions.");
        }
      }
    }
  };

  const handleExtract = async () => {
    const textToProcess = transcript.trim();
    if (!textToProcess) return;
    setLoading(true);
    setError(null);
    setDoctorVerified(false);
    try {
      const host = window.location.hostname || "127.0.0.1";
      const res = await fetch(`http://${host}:8000/extract-clinical-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: textToProcess }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setClinicalData(data);

      const resolvedPatient = {
        name: data.demographics?.name || "Patient (OPD)",
        age: data.demographics?.age || "--",
        gender: data.demographics?.gender || "--",
        mrNo: data.demographics?.mr_no || "OPD-" + Math.floor(1000 + Math.random() * 9000)
      };

      setPatientInfo(resolvedPatient);

      const newId = Date.now();
      const record = {
        id: newId,
        date: new Date().toLocaleDateString('en-GB'),
        patient: resolvedPatient,
        diagnosis: data.assessment?.provisional_diagnosis || "General Consultation",
        data: data,
        transcript: textToProcess
      };

      setActiveHistoryId(newId);
      const updatedHistory = [record, ...history.slice(0, 9)];
      setHistory(updatedHistory);
      localStorage.setItem('clinicascribe_history', JSON.stringify(updatedHistory));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPastRecord = (record) => {
    setActiveHistoryId(record.id);
    setPatientInfo(record.patient);
    setClinicalData(record.data);
    setTranscript(record.transcript);
    setDoctorVerified(true);
    setShowHistory(false);
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('clinicascribe_history', JSON.stringify(updated));
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('clinicascribe_history');
    setActiveHistoryId(null);
  };

  const handleMedChange = (index, field, value) => {
    const updated = [...clinicalData.prescription];
    updated[index][field] = value;
    setClinicalData({ ...clinicalData, prescription: updated });
  };

  const handleAddMedicine = () => {
    const blankMed = {
      medicine_name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      source: "doctor_manual_entry"
    };
    setClinicalData({
      ...clinicalData,
      prescription: [...(clinicalData.prescription || []), blankMed]
    });
  };

  const handleAddCdsSuggestion = (cdsItem, cdsIndex) => {
    const newMed = {
      medicine_name: cdsItem.medicine_name,
      dosage: cdsItem.dosage || '500mg',
      frequency: cdsItem.frequency || '1-0-1 (BD)',
      duration: cdsItem.duration || '5 days',
      instructions: cdsItem.rationale || 'Take orally after meals',
      source: "physician_approved_cds"
    };
    const remainingSuggestions = clinicalData.cds_suggestions.filter((_, i) => i !== cdsIndex);
    setClinicalData({
      ...clinicalData,
      prescription: [...(clinicalData.prescription || []), newMed],
      cds_suggestions: remainingSuggestions
    });
  };

  const handleDeleteMedicine = (index) => {
    const updated = clinicalData.prescription.filter((_, i) => i !== index);
    setClinicalData({ ...clinicalData, prescription: updated });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Print Single-Page Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            font-size: 11px !important;
          }
          .print-compact {
            gap: 6px !important;
          }
          .print-pad {
            padding: 6px 10px !important;
            margin-bottom: 6px !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs">
              <Stethoscope className="w-6 h-6 stroke-[2.2]"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">ClinicaScribe</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 uppercase tracking-wide">
                  OPD Live Scribe • Clinical AI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Bilingual Clinical Audio Transcription & EHR Structuring</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                showHistory 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5"/>
              <span>History ({history.length})</span>
            </button>
            <button
              onClick={() => window.print()}
              disabled={!clinicalData}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5"/> Approve & Print Rx
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start relative print:p-0 print:block">
        
        {/* Past Records Drawer */}
        {showHistory && (
          <div className="absolute top-6 right-6 w-84 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 p-4 print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-600"/>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  OPD Consultation History
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button 
                    onClick={clearAllHistory}
                    className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
              </div>
            </div>
            
            <div className="mt-2 space-y-2 max-h-80 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400">No stored consultations yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Generated clinical notes will save here automatically.</p>
                </div>
              ) : (
                history.map((rec) => {
                  const isActive = activeHistoryId === rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => loadPastRecord(rec)}
                      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                        isActive 
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' 
                          : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-900 truncate flex items-center gap-1">
                            {isActive && <Check className="w-3 h-3 text-emerald-600 shrink-0"/>}
                            {rec.patient.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">{rec.date}</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                          {rec.diagnosis}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteHistoryItem(e, rec.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-600 transition cursor-pointer rounded"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Left Side: Live Consultation Stream */}
        <section className="lg:col-span-5 flex flex-col gap-3 print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 relative">
              <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase">Live Consultation Capture</span>
              
              <div className="flex items-center gap-2">
                <select
                  value={selectedLang}
                  onChange={handleLanguageChange}
                  className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                >
                  <option value="ur-PK">🇵🇰 PK Urdu / Mixed</option>
                  <option value="en-PK">🇵🇰 English (Pakistani Accent)</option>
                  <option value="en-US">🇺🇸 English (US)</option>
                </select>

                <button
                  onClick={handleVoiceToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${
                    isRecording 
                      ? "bg-rose-600 text-white shadow-rose-200" 
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5"/> : <Mic className="w-3.5 h-3.5"/>}
                  {isRecording ? "Stop Dictation" : "Voice Dictation"}
                </button>
                
                {/* 3-Scenario Evaluation Switcher */}
                <div className="relative">
                  <button 
                    onClick={() => setShowPresets(!showPresets)} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title="Judge Evaluation Scenarios"
                  >
                    <MoreHorizontal className="w-4 h-4"/>
                  </button>
                  {showPresets && (
                    <div className="absolute right-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-2 text-xs">
                      <div className="px-2 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                        Select Demo Scenario (Judge Evaluation)
                      </div>
                      {Object.entries(EVALUATION_SCENARIOS).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setTranscript(val.text);
                            setShowPresets(false);
                          }}
                          className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-emerald-50/50 hover:border-emerald-200 border border-transparent transition cursor-pointer mt-1"
                        >
                          <div className="font-bold text-slate-900 text-[11px]">{val.label}</div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{val.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Waveform Indicator */}
            {isRecording && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                  </span>
                  <span className="text-[11px] font-bold text-rose-700">
                    Listening to {selectedLang === 'ur-PK' ? 'Urdu / Mixed' : 'English'} dialogue...
                  </span>
                </div>

                <div className="flex items-center gap-0.5 h-4">
                  <div className="w-1 bg-rose-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3"></div>
                  <div className="w-1 bg-rose-500 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-4"></div>
                  <div className="w-1 bg-rose-500 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2"></div>
                  <div className="w-1 bg-rose-500 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-4"></div>
                </div>
              </div>
            )}

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak continuously or type encounter here in Urdu or English..."
              className="w-full min-h-[350px] bg-slate-50/50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mt-3 font-mono leading-relaxed resize-none"
            />

            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
              <button 
                onClick={() => { 
                  setTranscript(''); 
                  wordsHistoryRef.current = [];
                  setActiveHistoryId(null);
                }} 
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3"/> Clear
              </button>
              <button
                onClick={handleExtract}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-emerald-900/10"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
                {loading ? "Structuring Note..." : "Generate Clinical Scribe Note"}
              </button>
            </div>

            {error && (
              <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0"/>
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Structured Clinical Record */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:w-full">
          <div>
            <div className="border-b-2 border-slate-900 pb-2 mb-3 flex justify-between items-end">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">Outpatient Clinical Record</h2>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">Department of Internal Medicine • ClinicaScribe AI EHR</p>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Date of Visit</span>
                <span className="text-slate-900 font-black text-xs">{new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            {/* Demographics Bar */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 text-xs mb-3 print-pad print:bg-transparent print:border-slate-300">
              <div>
                <span className="text-slate-400 block text-[9px] font-extrabold uppercase tracking-wider">Patient Name</span>
                <input 
                  type="text" 
                  value={patientInfo.name} 
                  placeholder="-- / Not stated"
                  onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                  className="font-bold text-slate-900 bg-transparent outline-none w-full text-xs placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] font-extrabold uppercase tracking-wider">Age</span>
                <input 
                  type="text" 
                  value={patientInfo.age} 
                  placeholder="-- yrs"
                  onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                  className="font-bold text-slate-900 bg-transparent outline-none w-full text-xs placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] font-extrabold uppercase tracking-wider">Gender</span>
                <input 
                  type="text" 
                  value={patientInfo.gender} 
                  placeholder="--"
                  onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value })}
                  className="font-bold text-slate-900 bg-transparent outline-none w-full text-xs placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] font-extrabold uppercase tracking-wider">MR / OPD No.</span>
                <input 
                  type="text" 
                  value={patientInfo.mrNo} 
                  placeholder="OPD-XXXX"
                  onChange={(e) => setPatientInfo({ ...patientInfo, mrNo: e.target.value })}
                  className="font-bold text-slate-900 bg-transparent outline-none w-full text-xs placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>

            {!clinicalData && !loading && (
              <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl print:hidden">
                <Stethoscope className="w-10 h-10 mx-auto stroke-[1.2] mb-2 text-slate-300"/>
                <p className="text-xs font-bold text-slate-600">No Clinical Note Generated</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5">
                  Type or dictate the encounter on the left and click Generate to extract structured medical observations.
                </p>
              </div>
            )}

            {clinicalData && (
              <div className="space-y-2.5 text-xs print-compact">
                {/* 1. Chief Complaints */}
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/70 print-pad">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500"/>
                    <h3 className="font-extrabold text-[9px] text-slate-500 uppercase tracking-widest">
                      1. Patient Chief Complaints
                    </h3>
                  </div>
                  <div className="grid grid-cols-12 gap-3 pl-1">
                    <div className="col-span-8">
                      <span className="text-slate-400 text-[9px] font-bold block">Reported Symptoms</span>
                      <input 
                        type="text" 
                        value={clinicalData.patient_summary?.chief_complaint || ''}
                        onChange={(e) => setClinicalData({
                          ...clinicalData,
                          patient_summary: { ...clinicalData.patient_summary, chief_complaint: e.target.value }
                        })}
                        className="font-bold text-slate-900 text-xs bg-transparent outline-none w-full pb-0.5"
                      />
                    </div>
                    <div className="col-span-4">
                      <span className="text-slate-400 text-[9px] font-bold block">Duration</span>
                      <input 
                        type="text" 
                        value={clinicalData.patient_summary?.duration || ''}
                        onChange={(e) => setClinicalData({
                          ...clinicalData,
                          patient_summary: { ...clinicalData.patient_summary, duration: e.target.value }
                        })}
                        className="font-bold text-slate-900 text-xs bg-transparent outline-none w-full pb-0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Vitals */}
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/70 print-pad">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-slate-500"/>
                    <h3 className="font-extrabold text-[9px] text-slate-500 uppercase tracking-widest">
                      2. Clinical Observations & Vitals
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] font-extrabold uppercase tracking-wider block">Blood Pressure</span>
                      <input 
                        type="text" 
                        value={clinicalData.objective_findings?.vitals?.blood_pressure || ''} 
                        onChange={(e) => setClinicalData({
                          ...clinicalData,
                          objective_findings: {
                            ...clinicalData.objective_findings,
                            vitals: { ...clinicalData.objective_findings.vitals, blood_pressure: e.target.value }
                          }
                        })}
                        className="font-black text-slate-900 bg-transparent outline-none text-xs w-full"
                      />
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] font-extrabold uppercase tracking-wider block">Pulse Rate</span>
                      <input 
                        type="text" 
                        value={clinicalData.objective_findings?.vitals?.pulse || ''} 
                        onChange={(e) => setClinicalData({
                          ...clinicalData,
                          objective_findings: {
                            ...clinicalData.objective_findings,
                            vitals: { ...clinicalData.objective_findings.vitals, pulse: e.target.value }
                          }
                        })}
                        className="font-black text-slate-900 bg-transparent outline-none text-xs w-full"
                      />
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] font-extrabold uppercase tracking-wider block">Temperature</span>
                      <input 
                        type="text" 
                        value={clinicalData.objective_findings?.vitals?.temperature || ''} 
                        onChange={(e) => setClinicalData({
                          ...clinicalData,
                          objective_findings: {
                            ...clinicalData.objective_findings,
                            vitals: { ...clinicalData.objective_findings.vitals, temperature: e.target.value }
                          }
                        })}
                        className="font-black text-slate-900 bg-transparent outline-none text-xs w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Diagnosis */}
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/70 print-pad">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600"/>
                    <h3 className="font-extrabold text-[9px] text-slate-500 uppercase tracking-widest">
                      3. Provisional Diagnosis
                    </h3>
                  </div>
                  <input 
                    type="text" 
                    value={clinicalData.assessment?.provisional_diagnosis || ''} 
                    onChange={(e) => setClinicalData({
                      ...clinicalData,
                      assessment: { ...clinicalData.assessment, provisional_diagnosis: e.target.value }
                    })}
                    className="font-extrabold text-emerald-800 bg-emerald-50/80 border border-emerald-200/90 rounded-lg px-2.5 py-1.5 w-full outline-none text-xs"
                  />
                </div>

                {/* 4. Rx Plan */}
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/70 print-pad">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-slate-500"/>
                      <h3 className="font-extrabold text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <span className="font-serif italic font-black text-xs text-slate-900">Rx</span> Prescribed Treatment Plan
                      </h3>
                    </div>
                    <button
                      onClick={handleAddMedicine}
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 print:hidden cursor-pointer"
                    >
                      <Plus className="w-3 h-3"/> Add Item
                    </button>
                  </div>

                  {(!clinicalData.prescription || clinicalData.prescription.length === 0) ? (
                    <div className="p-3 bg-white border border-dashed border-slate-200 rounded-lg text-slate-400 text-center text-xs italic mb-2">
                      -- No medications dictated by physician in this consultation --
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-2 pb-1">
                        <span className="col-span-4">Medicine</span>
                        <span className="col-span-2">Dose</span>
                        <span className="col-span-3">Frequency</span>
                        <span className="col-span-2">Duration</span>
                        <span className="col-span-1 text-right"></span>
                      </div>

                      <div className="space-y-1.5">
                        {clinicalData.prescription.map((med, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 flex flex-col gap-1 print:border-b print:border-slate-300 print:bg-transparent print:p-1">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <input
                                type="text"
                                value={med.medicine_name}
                                onChange={(e) => handleMedChange(idx, "medicine_name", e.target.value)}
                                className="col-span-4 font-black text-slate-900 bg-transparent outline-none text-xs placeholder:text-slate-300"
                                placeholder="e.g. Tab Cipro"
                              />
                              <input
                                type="text"
                                value={med.dosage}
                                onChange={(e) => handleMedChange(idx, "dosage", e.target.value)}
                                className="col-span-2 text-slate-700 font-semibold bg-transparent outline-none text-xs placeholder:text-slate-300"
                                placeholder="500mg"
                              />
                              <input
                                type="text"
                                value={med.frequency}
                                onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                                className="col-span-3 text-slate-700 font-semibold bg-transparent outline-none text-xs placeholder:text-slate-300"
                                placeholder="1-0-1"
                              />
                              <input
                                type="text"
                                value={med.duration}
                                onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                                className="col-span-2 text-slate-700 font-semibold bg-transparent outline-none text-xs placeholder:text-slate-300"
                                placeholder="5 days"
                              />
                              <button
                                onClick={() => handleDeleteMedicine(idx)}
                                className="col-span-1 text-slate-300 hover:text-rose-600 print:hidden flex justify-end cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* CDS Suggestions Box */}
                  {clinicalData.cds_suggestions && clinicalData.cds_suggestions.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl print:hidden">
                      <div className="flex items-center gap-1.5 mb-2 text-blue-900 font-bold text-xs">
                        <Lightbulb className="w-4 h-4 text-blue-600"/>
                        <span>Clinical Decision Support (CDS) Recommendations (Physician Review Required):</span>
                      </div>
                      <div className="space-y-1.5">
                        {clinicalData.cds_suggestions.map((cds, cIdx) => (
                          <div key={cIdx} className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="text-xs">
                              <span className="font-bold text-slate-900">{cds.medicine_name}</span>
                              <span className="text-slate-500 ml-2">({cds.dosage} • {cds.frequency} • {cds.duration})</span>
                              <p className="text-[11px] text-blue-700 mt-0.5">{cds.rationale}</p>
                            </div>
                            <button
                              onClick={() => handleAddCdsSuggestion(cds, cIdx)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md shrink-0 flex items-center gap-1 cursor-pointer shadow-xs transition"
                            >
                              <Plus className="w-3 h-3"/> Add to Rx
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Alert Strip */}
                  <div className={`mt-2 p-2 rounded-lg border flex items-center justify-between text-xs print:hidden transition ${
                    clinicalData.safety_check?.status === 'WARNING'
                      ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {clinicalData.safety_check?.status === 'WARNING' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0"/> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0"/>}
                      <span className="text-[10px] font-medium leading-tight">
                        {clinicalData.safety_check?.message}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pure Urdu Patient Instructions Slip */}
                {clinicalData.patient_instructions_urdu && (
                  <div className="mt-3 p-3 bg-emerald-50/50 border-2 border-dashed border-emerald-300/80 rounded-xl relative print:mt-3 print:border-slate-400 print-pad">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-700"/>
                        <h3 className="font-extrabold text-[9px] text-emerald-800 uppercase tracking-widest">
                          Patient Advisory Tear-off Slip
                        </h3>
                      </div>
                      <span className="text-[12px] font-bold text-emerald-900 font-serif">
                        مریض کے لیے ضروری ہدایات
                      </span>
                    </div>

                    <div 
                      dir="rtl" 
                      className="text-right text-slate-900 text-xs md:text-[13px] leading-relaxed font-medium whitespace-pre-wrap outline-none"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => setClinicalData({ ...clinicalData, patient_instructions_urdu: e.currentTarget.textContent })}
                      style={{ 
                        fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', Arial, sans-serif",
                        lineHeight: "1.8"
                      }}
                    >
                      {clinicalData.patient_instructions_urdu}
                    </div>
                  </div>
                )}

                {/* Clinical Governance & Physician Audit Trail */}
                <div className="mt-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs print:hidden">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={doctorVerified}
                      onChange={(e) => setDoctorVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">
                      Physician Review Complete • Clinical & Medico-Legal Responsibility Verified
                    </span>
                  </label>
                  {doctorVerified ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3"/> Approved for EHR
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                      Pending Verification
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Doctor Signature & Legal Stamp */}
          <div className="pt-4 border-t border-slate-200/80 mt-4 flex justify-between items-end print:mt-4 print:pt-2">
            <div className="text-[9px] text-slate-400 font-medium">
              <p>Generated via ClinicaScribe AI Medical Engine</p>
              <p className="font-semibold text-slate-600">
                {doctorVerified ? "✓ Verified & Digitally Signed by Attending Physician" : "Clinical Review: Attending Medical Officer"}
              </p>
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <p className="text-[10px] font-black text-slate-800">Doctor Signature & Stamp</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}