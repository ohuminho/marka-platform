"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Experience = { role: string; company: string; location: string; startDate: string; endDate: string; description: string };
type Education = { qualification: string; institution: string; location: string; startDate: string; endDate: string; details: string };
type CVTemplateId = "ats" | "classic" | "executive" | "creative";
type CVContent = {
  templateId: CVTemplateId;
  fullName: string; professionalTitle: string; email: string; phone: string; location: string; summary: string;
  experience: Experience[]; education: Education[]; skills: string[]; languages: string[];
};
type DocumentRecord = { id: string; title: string; content: CVContent; updatedAt: string };
const cvTemplates: { id: CVTemplateId; name: string; description: string; premium: boolean; accent: string }[] = [
  { id: "ats", name: "ATS Essencial", description: "Leitura simples, compatível com sistemas de recrutamento.", premium: false, accent: "#285b50" },
  { id: "classic", name: "Clássico", description: "Visual editorial discreto para qualquer área.", premium: false, accent: "#806b43" },
  { id: "executive", name: "Executivo", description: "Hierarquia visual forte para perfis sénior.", premium: true, accent: "#173b63" },
  { id: "creative", name: "Criativo", description: "Composição contemporânea para portefólios e comunicação.", premium: true, accent: "#7444a2" },
];

const emptyExperience: Experience = { role: "", company: "", location: "", startDate: "", endDate: "", description: "" };
const emptyEducation: Education = { qualification: "", institution: "", location: "", startDate: "", endDate: "", details: "" };
const emptyCV: CVContent = {
  templateId: "ats",
  fullName: "", professionalTitle: "", email: "", phone: "", location: "", summary: "",
  experience: [], education: [], skills: [], languages: [],
};

const inputClass = "mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text)] outline-none transition focus:border-[var(--theme-accent)]";
const labelClass = "block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]";

export default function MarkaCvPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeId, setActiveId] = useState("");
  const [title, setTitle] = useState("O meu currículo");
  const [cv, setCv] = useState<CVContent>(emptyCV);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDocuments() {
      try {
        const response = await fetch("/api/cv", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Não foi possível carregar os currículos.");
        const rows = (data.documents || []) as DocumentRecord[];
        if (controller.signal.aborted) return;
        setDocuments(rows);
        if (rows.length) {
          setActiveId(rows[0].id);
          setTitle(rows[0].title);
          setCv({ ...emptyCV, ...rows[0].content });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Falha ao carregar os currículos.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadDocuments();
    return () => controller.abort();
  }, []);

  function update<K extends keyof CVContent>(key: K, value: CVContent[K]) {
    setDirty(true);
    setCv((current) => ({ ...current, [key]: value }));
  }

  function updateExperience(index: number, key: keyof Experience, value: string) {
    setDirty(true);
    setCv((current) => ({ ...current, experience: current.experience.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }

  function updateEducation(index: number, key: keyof Education, value: string) {
    setDirty(true);
    setCv((current) => ({ ...current, education: current.education.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }

  async function saveCV() {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/cv", {
        method: activeId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(activeId ? { id: activeId } : {}), title, content: cv }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível guardar o currículo.");
      const saved = data.document as DocumentRecord;
      setActiveId(saved.id);
      setDirty(false);
      setDocuments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setNotice("Currículo guardado com segurança na sua conta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao guardar o currículo.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!dirty || loading || !cv.fullName.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/cv", {
          method: activeId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ ...(activeId ? { id: activeId } : {}), title, content: cv }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Não foi possível guardar automaticamente.");
        if (controller.signal.aborted) return;
        const saved = data.document as DocumentRecord;
        setActiveId(saved.id);
        setDocuments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
        setDirty(false);
        setNotice("Guardado automaticamente.");
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Falha na gravação automática.");
      }
    }, 1400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeId, cv, dirty, loading, title]);

  function exportPDF() {
    if (cvTemplates.find((template) => template.id === cv.templateId)?.premium) { setError("Este modelo pertence ao MARKA CV Premium. A exportação sem marca de água será desbloqueada após validação do pagamento."); return; }
    if (!cv.fullName.trim()) { setError("Introduza o seu nome completo antes de exportar o currículo."); return; }
    setError("");
    window.print();
  }

  function newCV() {
    setDirty(false);
    setActiveId("");
    setTitle("Novo currículo");
    setCv(emptyCV);
    setNotice("");
    setError("");
  }

  function openCV(document: DocumentRecord) {
    setDirty(false);
    setActiveId(document.id);
    setTitle(document.title);
    setCv({ ...emptyCV, ...document.content });
    setNotice("");
    setError("");
  }

  async function deleteCV() {
    if (!activeId || !window.confirm("Apagar este currículo e os seus dados guardados?")) return;
    setError("");
    try {
      const response = await fetch("/api/cv", {
        method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível apagar o currículo.");
      const remaining = documents.filter((item) => item.id !== activeId);
      setDocuments(remaining);
      if (remaining.length) openCV(remaining[0]); else newCV();
      setNotice("Currículo apagado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao apagar o currículo.");
    }
  }

  return (
    <main className="space-y-8">
      <style jsx global>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          body { background: #fff !important; color: #111 !important; }
          body * { visibility: hidden !important; }
          #marka-cv-print, #marka-cv-print * { visibility: visible !important; }
          #marka-cv-print { position: absolute; inset: 0; width: 100%; min-height: 0; height: auto; overflow: visible !important; padding: 0; color: #171717 !important; background: #fff !important; }
          #marka-cv-print::after { content: "MARKA"; position: fixed; inset: 42% 0 auto; text-align: center; font-size: 76px; font-weight: 700; letter-spacing: .25em; color: rgba(20,20,20,.075); transform: rotate(-28deg); pointer-events: none; z-index: 0; }
          #marka-cv-print .cv-content { position: relative; z-index: 1; }
          #marka-cv-print h1 { font-size: 26pt !important; }
          #marka-cv-print h2 { break-after: avoid; }
          #marka-cv-print .cv-entry { break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="no-print flex flex-col gap-5 border-b border-[var(--theme-border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="marka-kicker">MARKA · Carreira</p>
          <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] sm:text-5xl">MARKA CV</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Crie um currículo profissional, guarde as suas versões e prepare um PDF pronto para candidatura.</p>
        </div>
        <Link href="/app" className="text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]">← Voltar ao painel</Link>
      </header>

      <div className="no-print grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Currículos guardados" value={activeId} onChange={(event) => {
              const found = documents.find((item) => item.id === event.target.value);
              if (found) openCV(found); else newCV();
            }} className="min-w-0 flex-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-xs text-[var(--theme-text)]">
              <option value="">Novo currículo</option>
              {documents.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <button type="button" onClick={newCV} className="rounded-full border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text)]">Novo</button>
          </div>

          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="marka-editorial text-2xl text-[var(--theme-text)]">Escolha o seu modelo</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">A pré-visualização muda imediatamente. Os modelos Premium ficam disponíveis para experimentar.</p></div><span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[9px] uppercase tracking-wider text-[var(--theme-text-muted)]">4 modelos</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{cvTemplates.map((template) => <button key={template.id} type="button" aria-pressed={cv.templateId === template.id} onClick={() => update("templateId", template.id)} className={`rounded-xl border p-4 text-left transition ${cv.templateId === template.id ? "border-[var(--theme-text)] ring-1 ring-[var(--theme-text)]" : "border-[var(--theme-border)] hover:border-[var(--theme-text-muted)]"}`}><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-[var(--theme-text)]">{template.name}</span><span className={`rounded-full px-2 py-1 text-[8px] uppercase tracking-wider ${template.premium ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>{template.premium ? "Premium" : "Grátis"}</span></span><span className="mt-2 block text-[11px] leading-5 text-[var(--theme-text-muted)]">{template.description}</span><span className="mt-3 block h-1.5 w-full rounded-full" style={{ backgroundColor: template.accent }} /></button>)}</div>
          </section>

          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
            <h2 className="marka-editorial text-2xl text-[var(--theme-text)]">Identificação profissional</h2>
            <label className={labelClass + " mt-5"}>Nome desta versão<input className={inputClass} value={title} onChange={(e) => { setDirty(true); setTitle(e.target.value); }} placeholder="Ex.: CV — Gestor de projetos" /></label>
            <label className={labelClass + " mt-5"}>Nome completo<input className={inputClass} value={cv.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="O seu nome" /></label>
            <label className={labelClass + " mt-4"}>Título profissional<input className={inputClass} value={cv.professionalTitle} onChange={(e) => update("professionalTitle", e.target.value)} placeholder="Ex.: Técnico de contabilidade" /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>E-mail<input type="email" className={inputClass} value={cv.email} onChange={(e) => update("email", e.target.value)} placeholder="nome@email.com" /></label>
              <label className={labelClass}>Telefone<input className={inputClass} value={cv.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+244 ..." /></label>
              <label className={labelClass + " sm:col-span-2"}>Localização<input className={inputClass} value={cv.location} onChange={(e) => update("location", e.target.value)} placeholder="Cidade, país" /></label>
            </div>
            <label className={labelClass + " mt-4"}>Resumo profissional<textarea className={inputClass + " min-h-28 resize-y"} value={cv.summary} onChange={(e) => update("summary", e.target.value)} placeholder="Apresente a sua experiência, especialidade e principais competências." /></label>
          </section>

          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="marka-editorial text-2xl text-[var(--theme-text)]">Experiência profissional</h2><button type="button" onClick={() => update("experience", [...cv.experience, { ...emptyExperience }])} className="text-xs font-semibold text-[var(--theme-text)]">+ Adicionar</button></div>
            {cv.experience.map((item, index) => <div key={index} className="cv-entry mt-5 border-t border-[var(--theme-border)] pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>Cargo<input className={inputClass} value={item.role} onChange={(e) => updateExperience(index, "role", e.target.value)} /></label>
                <label className={labelClass}>Empresa<input className={inputClass} value={item.company} onChange={(e) => updateExperience(index, "company", e.target.value)} /></label>
                <label className={labelClass}>Localização<input className={inputClass} value={item.location} onChange={(e) => updateExperience(index, "location", e.target.value)} /></label>
                <div className="grid grid-cols-2 gap-2"><label className={labelClass}>Início<input className={inputClass} value={item.startDate} onChange={(e) => updateExperience(index, "startDate", e.target.value)} placeholder="2022" /></label><label className={labelClass}>Fim<input className={inputClass} value={item.endDate} onChange={(e) => updateExperience(index, "endDate", e.target.value)} placeholder="Atual" /></label></div>
              </div>
              <label className={labelClass + " mt-3"}>Responsabilidades e resultados<textarea className={inputClass + " min-h-24"} value={item.description} onChange={(e) => updateExperience(index, "description", e.target.value)} /></label>
              <button type="button" onClick={() => update("experience", cv.experience.filter((_, i) => i !== index))} className="mt-3 text-xs text-red-500">Remover experiência</button>
            </div>)}
            {!cv.experience.length && <p className="mt-4 text-xs text-[var(--theme-text-muted)]">Adicione os seus empregos e experiências relevantes.</p>}
          </section>

          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="marka-editorial text-2xl text-[var(--theme-text)]">Formação académica</h2><button type="button" onClick={() => update("education", [...cv.education, { ...emptyEducation }])} className="text-xs font-semibold text-[var(--theme-text)]">+ Adicionar</button></div>
            {cv.education.map((item, index) => <div key={index} className="cv-entry mt-5 border-t border-[var(--theme-border)] pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>Curso / qualificação<input className={inputClass} value={item.qualification} onChange={(e) => updateEducation(index, "qualification", e.target.value)} /></label>
                <label className={labelClass}>Instituição<input className={inputClass} value={item.institution} onChange={(e) => updateEducation(index, "institution", e.target.value)} /></label>
                <label className={labelClass}>Localização<input className={inputClass} value={item.location} onChange={(e) => updateEducation(index, "location", e.target.value)} /></label>
                <div className="grid grid-cols-2 gap-2"><label className={labelClass}>Início<input className={inputClass} value={item.startDate} onChange={(e) => updateEducation(index, "startDate", e.target.value)} /></label><label className={labelClass}>Fim<input className={inputClass} value={item.endDate} onChange={(e) => updateEducation(index, "endDate", e.target.value)} /></label></div>
              </div>
              <label className={labelClass + " mt-3"}>Detalhes<textarea className={inputClass + " min-h-20"} value={item.details} onChange={(e) => updateEducation(index, "details", e.target.value)} /></label>
              <button type="button" onClick={() => update("education", cv.education.filter((_, i) => i !== index))} className="mt-3 text-xs text-red-500">Remover formação</button>
            </div>)}
          </section>

          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
            <h2 className="marka-editorial text-2xl text-[var(--theme-text)]">Competências e idiomas</h2>
            <label className={labelClass + " mt-5"}>Competências (separadas por vírgulas)<textarea className={inputClass + " min-h-20"} value={cv.skills.join(", ")} onChange={(e) => update("skills", e.target.value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 40))} placeholder="Gestão de projetos, Excel, Atendimento..." /></label>
            <label className={labelClass + " mt-4"}>Idiomas (separados por vírgulas)<input className={inputClass} value={cv.languages.join(", ")} onChange={(e) => update("languages", e.target.value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 20))} placeholder="Português, Inglês..." /></label>
          </section>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)]/95 p-3 shadow-xl backdrop-blur no-print">
            <button type="button" disabled={saving || loading} onClick={() => void saveCV()} className="rounded-full bg-[var(--theme-text)] px-6 py-3 text-xs font-bold text-[var(--theme-background)] disabled:opacity-50">{saving ? "A guardar..." : "Guardar currículo"}</button>
            <button type="button" onClick={exportPDF} className="rounded-full border border-[var(--theme-border)] px-6 py-3 text-xs font-semibold text-[var(--theme-text)]">Exportar PDF gratuito</button>
            {activeId && <button type="button" onClick={() => void deleteCV()} className="ml-auto px-3 py-3 text-xs text-red-500">Apagar</button>}
          </div>
          {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          {loading && <p className="text-xs text-[var(--theme-text-muted)]">A carregar os seus currículos...</p>}
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
            <p className="marka-kicker">MARKA CV · Premium</p>
            <h2 className="marka-editorial mt-3 text-2xl text-[var(--theme-text)]">Modelos profissionais para cada etapa da carreira.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">Os modelos Executivo e Criativo já podem ser pré-visualizados. O desbloqueio e a exportação sem marca de água aguardam a validação real do pagamento HappyPay.</p>
            <span className="mt-5 inline-flex rounded-full border border-[var(--theme-border)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">Modelos Premium · Pré-visualização</span>
          </div>
          <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
            <div className="mb-4 flex items-center justify-between"><p className="marka-kicker">Pré-visualização · Free</p><span className="text-[9px] uppercase tracking-[0.16em] text-[var(--theme-text-faint)]">A4</span></div>
            <div id="marka-cv-print" data-template={cv.templateId} className={`relative min-h-[520px] overflow-hidden bg-white p-7 text-[#171717] shadow-lg sm:p-9 ${cv.templateId === "executive" ? "border-l-[12px] border-[#173b63]" : cv.templateId === "creative" ? "rounded-t-[3rem] border-t-[12px] border-[#7444a2]" : ""}`} style={{ "--cv-accent": cvTemplates.find((template) => template.id === cv.templateId)?.accent ?? "#285b50" } as React.CSSProperties}>
              <div className="cv-content relative z-[1]">
                <h1 className={`break-words font-semibold tracking-tight ${cv.templateId === "creative" ? "text-4xl" : "text-3xl"}`}>{cv.fullName || "O seu nome completo"}</h1>
                <p className="mt-2 text-sm font-medium" style={{ color: "var(--cv-accent)" }}>{cv.professionalTitle || "Título profissional"}</p>
                <p className="mt-3 break-words text-[10px] text-[#555]">{[cv.email, cv.phone, cv.location].filter(Boolean).join(" · ") || "E-mail · Telefone · Localização"}</p>
                {cv.summary && <section className="mt-7"><h2 className="border-b border-[#d7d2c8] pb-2 text-[10px] font-bold uppercase tracking-[0.18em]">Perfil profissional</h2><p className="mt-3 whitespace-pre-wrap text-xs leading-5">{cv.summary}</p></section>}
                {cv.experience.length > 0 && <section className="mt-7"><h2 className="border-b border-[#d7d2c8] pb-2 text-[10px] font-bold uppercase tracking-[0.18em]">Experiência profissional</h2>{cv.experience.map((item, index) => <div key={index} className="cv-entry mt-4"><h3 className="text-sm font-semibold">{item.role || "Cargo"}{item.company ? ` · ${item.company}` : ""}</h3><p className="mt-1 text-[10px] text-[#666]">{[item.location, item.startDate, item.endDate].filter(Boolean).join(" · ")}</p>{item.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{item.description}</p>}</div>)}</section>}
                {cv.education.length > 0 && <section className="mt-7"><h2 className="border-b border-[#d7d2c8] pb-2 text-[10px] font-bold uppercase tracking-[0.18em]">Formação académica</h2>{cv.education.map((item, index) => <div key={index} className="cv-entry mt-4"><h3 className="text-sm font-semibold">{item.qualification || "Qualificação"}</h3><p className="mt-1 text-[10px] text-[#666]">{[item.institution, item.location, item.startDate, item.endDate].filter(Boolean).join(" · ")}</p>{item.details && <p className="mt-2 text-xs leading-5">{item.details}</p>}</div>)}</section>}
                {cv.skills.length > 0 && <section className="mt-7"><h2 className="border-b border-[#d7d2c8] pb-2 text-[10px] font-bold uppercase tracking-[0.18em]">Competências</h2><p className="mt-3 text-xs leading-6">{cv.skills.join(" · ")}</p></section>}
                {cv.languages.length > 0 && <section className="mt-7"><h2 className="border-b border-[#d7d2c8] pb-2 text-[10px] font-bold uppercase tracking-[0.18em]">Idiomas</h2><p className="mt-3 text-xs leading-6">{cv.languages.join(" · ")}</p></section>}
              </div>
              {!cvTemplates.find((template) => template.id === cv.templateId)?.premium && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[45%] -rotate-[28deg] text-center text-5xl font-bold tracking-[0.3em] text-black/[0.06]">MARKA</div>}
              <div className="absolute bottom-5 left-0 right-0 text-center text-[8px] uppercase tracking-[0.2em] text-[#999]">Criado com MARKA CV</div>
            </div>
          </div>
          <p className="text-[11px] leading-5 text-[var(--theme-text-faint)]">Os dados do currículo ficam privados na sua conta. Reveja sempre a informação antes de enviar uma candidatura. A MARKA não inventa experiência ou qualificações.</p>
        </aside>
      </div>
    </main>
  );
}
