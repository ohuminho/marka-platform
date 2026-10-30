"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Call = {
  id: string; callerId: string; calleeId: string; mode: "AUDIO" | "VIDEO";
  status: "RINGING" | "ACCEPTED" | "REJECTED" | "ENDED" | "MISSED" | "EXPIRED" | "FAILED";
  expiresAt: string; createdAt: string;
};
type Signal = { id: string; type: "OFFER" | "ANSWER" | "ICE_CANDIDATE"; payload: RTCSessionDescriptionInit | RTCIceCandidateInit; createdAt: string };

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");
  return data;
}

export default function MarketplaceCallPanel({ conversationId }: { conversationId: string }) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [actorId, setActorId] = useState("");
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const actorIdRef = useRef("");
  const lastSignalAtRef = useRef<string>("");
  const processingRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { actorIdRef.current = actorId; }, [actorId]);
  useEffect(() => { if (localVideoRef.current) localVideoRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);

  const refreshCalls = useCallback(async () => {
    try {
      const data = await jsonRequest(`/api/messages/${encodeURIComponent(conversationId)}/calls`);
      setCalls(data.calls ?? []);
      if (data.actorId) setActorId(data.actorId);
      const current = (data.calls as Call[] | undefined)?.find((call) => ["RINGING", "ACCEPTED"].includes(call.status) && new Date(call.expiresAt).getTime() > Date.now());
      if (activeCallRef.current) {
        const refreshed = (data.calls as Call[] | undefined)?.find((call) => call.id === activeCallRef.current?.id);
        if (refreshed) setActiveCall(refreshed);
      } else if (current?.callerId === data.actorId) setActiveCall(current);
    } catch {
      // The parent conversation endpoint remains the source of access control; transient polling errors are non-fatal.
    }
  }, [conversationId]);

  const sendSignal = useCallback(async (callId: string, type: Signal["type"], payload: object) => {
    await jsonRequest(`/api/messages/calls/${encodeURIComponent(callId)}/signals`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, payload }),
    });
  }, []);

  const closeMedia = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraEnabled(true);
  }, []);

  const connect = useCallback(async (call: Call, initiating: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia || !("RTCPeerConnection" in window)) {
      throw new Error("Este dispositivo ou navegador não disponibiliza chamadas WebRTC seguras.");
    }
    const config = await jsonRequest("/api/comms/ice-configuration");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.mode === "VIDEO" });
    localStreamRef.current = stream;
    setLocalStream(stream);
    const pc = new RTCPeerConnection({ iceServers: config.iceServers });
    pcRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      const incoming = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteStream(incoming);
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) void sendSignal(call.id, "ICE_CANDIDATE", event.candidate.toJSON()).catch(() => setError("A ligação de rede foi interrompida. A tentar recuperar…"));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") setError("Não foi possível estabelecer a ligação. Verifica a rede e a configuração TURN.");
      if (pc.connectionState === "disconnected") setError("Ligação instável. A tentar recuperar…");
      if (pc.connectionState === "connected") setError("");
    };
    if (initiating) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(call.id, "OFFER", offer);
    }
  }, [sendSignal]);

  const processSignals = useCallback(async (call: Call) => {
    const pc = pcRef.current;
    if (!pc || processingRef.current) return;
    processingRef.current = true;
    try {
      const after = encodeURIComponent(lastSignalAtRef.current);
      const data = await jsonRequest(`/api/messages/calls/${encodeURIComponent(call.id)}/signals?after=${after}`);
      for (const signal of (data.signals ?? []) as Signal[]) {
        if (signal.createdAt > lastSignalAtRef.current) lastSignalAtRef.current = signal.createdAt;
        if (signal.type === "OFFER" && call.calleeId === actorIdRef.current && !pc.remoteDescription) {
          await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(call.id, "ANSWER", answer);
        } else if (signal.type === "ANSWER" && call.callerId === actorIdRef.current && !pc.remoteDescription) {
          await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        } else if (signal.type === "ICE_CANDIDATE") {
          try { await pc.addIceCandidate(signal.payload as RTCIceCandidateInit); } catch { /* Late ICE after teardown is ignored. */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na sinalização WebRTC.");
    } finally {
      processingRef.current = false;
    }
  }, [sendSignal]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshCalls(), 0);
    const timer = window.setInterval(() => {
      void refreshCalls();
      const current = activeCallRef.current;
      if (current && pcRef.current) void processSignals(current);
    }, 1800);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refreshCalls, processSignals]);

  async function startCall(mode: "AUDIO" | "VIDEO") {
    if (busy || activeCall) return;
    setBusy(true); setError("");
    let createdCall: Call | null = null;
    try {
      const data = await jsonRequest(`/api/messages/${encodeURIComponent(conversationId)}/calls`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }),
      });
      const call = data.call as Call;
      createdCall = call;
      lastSignalAtRef.current = new Date(Date.now() - 60_000).toISOString();
      setActiveCall(call);
      await connect(call, true);
    } catch (e) {
      if (createdCall) void jsonRequest(`/api/messages/calls/${encodeURIComponent(createdCall.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "END" }) }).catch(() => undefined);
      setError(e instanceof Error ? e.message : "Não foi possível iniciar a chamada.");
      closeMedia();
      setActiveCall(null);
    } finally { setBusy(false); }
  }

  async function acceptCall(call: Call) {
    setBusy(true); setError("");
    try {
      await jsonRequest(`/api/messages/calls/${encodeURIComponent(call.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ACCEPT" }) });
      lastSignalAtRef.current = new Date(Date.now() - 60_000).toISOString();
      setActiveCall({ ...call, status: "ACCEPTED" });
      await connect({ ...call, status: "ACCEPTED" }, false);
      await processSignals({ ...call, status: "ACCEPTED" });
    } catch (e) {
      void jsonRequest(`/api/messages/calls/${encodeURIComponent(call.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "END" }) }).catch(() => undefined);
      setError(e instanceof Error ? e.message : "Não foi possível aceitar a chamada.");
      closeMedia();
      setActiveCall(null);
    } finally { setBusy(false); }
  }

  async function finishCall(action: "REJECT" | "END") {
    const call = activeCallRef.current ?? calls.find((item) => item.calleeId === actorId && item.status === "RINGING");
    if (!call) return;
    setBusy(true);
    try {
      await jsonRequest(`/api/messages/calls/${encodeURIComponent(call.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível terminar a chamada.");
    } finally {
      closeMedia(); setActiveCall(null); setBusy(false); void refreshCalls();
    }
  }

  function toggleMute() {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraEnabled(next);
  }

  const incoming = calls.find((call) => call.calleeId === actorId && call.status === "RINGING" && call.id !== activeCall?.id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy || !!activeCall} onClick={() => void startCall("AUDIO")} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--theme-text)] transition hover:bg-[var(--theme-background)] disabled:opacity-40" aria-label="Iniciar chamada de voz">☎ Voz</button>
      <button type="button" disabled={busy || !!activeCall} onClick={() => void startCall("VIDEO")} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--theme-text)] transition hover:bg-[var(--theme-background)] disabled:opacity-40" aria-label="Iniciar videochamada">▣ Vídeo</button>

      {incoming && !activeCall && <div className="fixed inset-x-4 top-20 z-[90] mx-auto max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 shadow-2xl">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">Chamada recebida</p>
        <p className="mt-2 text-lg font-semibold text-[var(--theme-text)]">{incoming.mode === "VIDEO" ? "Videochamada" : "Chamada de voz"}</p>
        <p className="mt-1 text-xs text-[var(--theme-text-muted)]">A outra pessoa está a tentar contactar-te nesta conversa.</p>
        <div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => void acceptCall(incoming)} className="rounded-full bg-[var(--theme-text)] px-4 py-2 text-xs font-semibold text-[var(--theme-background)]">Atender</button><button type="button" disabled={busy} onClick={() => { setActiveCall(incoming); void finishCall("REJECT"); }} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-text)]">Recusar</button></div>
      </div>}

      {activeCall && <div className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">MARKA · chamada segura</p><p className="mt-1 text-sm font-semibold text-[var(--theme-text)]">{activeCall.mode === "VIDEO" ? "Videochamada" : "Chamada de voz"} · {activeCall.status === "RINGING" ? "A chamar…" : "Ligação activa"}</p></div><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>
        {activeCall.mode === "VIDEO" && <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-black"><video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" /><video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 aspect-video w-28 rounded-lg border border-white/30 object-cover" /></div>}
        {activeCall.mode === "AUDIO" && <><video ref={remoteVideoRef} autoPlay playsInline className="hidden" /><video ref={localVideoRef} autoPlay playsInline muted className="hidden" /><div className="mt-4 rounded-xl bg-[var(--theme-background)] p-6 text-center text-2xl text-[var(--theme-text)]">◉</div></>}
        {error && <p role="alert" className="mt-3 text-xs text-amber-600">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={toggleMute} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-text)]">{muted ? "Activar microfone" : "Silenciar"}</button>{activeCall.mode === "VIDEO" && <button type="button" onClick={toggleCamera} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-text)]">{cameraEnabled ? "Desligar câmara" : "Ligar câmara"}</button>}<button type="button" disabled={busy} onClick={() => void finishCall("END")} className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white">Terminar</button></div>
      </div>}
      {error && !activeCall && <span role="alert" className="w-full text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
