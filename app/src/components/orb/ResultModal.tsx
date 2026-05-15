'use client';

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskType = 'rechnung' | 'angebot' | 'anruf' | 'termin';

interface ResultModalProps {
  taskType: TaskType | null;
  onClose: () => void;
  onOpenSheet?: () => void;
}

// ─── Static content ───────────────────────────────────────────────────────────

const PROCESSING_MSGS: Record<TaskType, string> = {
  rechnung: 'Rechnung wird erstellt...',
  angebot:  'Angebot wird ausgearbeitet...',
  anruf:    'Gespräch wird aufbereitet...',
  termin:   'Kalender wird geprüft...',
};

const STATUS_TEXTS: Record<TaskType, string> = {
  rechnung: 'Rechnung erstellt ✓',
  angebot:  'Angebot erstellt ✓',
  anruf:    'Anruf bearbeitet ✓',
  termin:   'Termin gebucht ✓',
};

const TAKUMIRO_SPEECHES: Record<TaskType, string> = {
  rechnung: '„Ich hab die Rechnung für Thomas Müller fertig – 1.874 Euro brutto, GoBD-konform, dein Logo drauf. Willst du sie direkt rausschicken?"',
  angebot:  '„Das Angebot für Familie Schreiber ist fertig – Badezimmer-Sanierung, Gesamtpreis 5.105 Euro. Soll ich es per E-Mail verschicken?"',
  anruf:    '„Ich hab den Anruf von Frau Wagner angenommen – sie braucht einen neuen Hahn im Bad. Termin ist vorgemerkt für Mittwoch 14 Uhr. Passt dir das?"',
  termin:   '„Termin für Herrn Becker ist eingetragen – Donnerstag, 20. März, 9 Uhr. Bestätigung geht automatisch raus. Erinnerung 24h vorher auch."',
};

// ─── Document: Shared header bar ─────────────────────────────────────────────

function DocBar({ label, status }: { label: string; status: string }) {
  return (
    <div className="bg-[#0e0e0e] px-4 py-2.5 flex items-center justify-between gap-3 sm:px-5">
      <span className="font-mono text-[10px] tracking-widest text-[#853953] uppercase truncate">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />{status}
      </span>
    </div>
  );
}

// ─── Document: Invoice (Rechnung) ────────────────────────────────────────────

function InvoiceDoc() {
  const rows = [
    { pos: '01', name: 'Austausch Sicherungskasten',  desc: 'Inkl. Demontage Altanlage, Entsorgung',     qty: '1',  unit: '680,00', total: '680,00' },
    { pos: '02', name: 'Erdleitungen erneuern',        desc: '15m NYM-J 3x2,5, inkl. Verlegung',          qty: '15', unit: '12,00',  total: '180,00' },
    { pos: '03', name: 'Steckdosen erneuern',           desc: '5x Schuko-Steckdose, UP, inkl. Einbau',     qty: '5',  unit: '48,00',  total: '240,00' },
    { pos: '04', name: 'Arbeitsstunden Elektriker',    desc: 'Meisterbetrieb, inkl. Dokumentation',       qty: '5',  unit: '95,00',  total: '475,00' },
  ];

  return (
    <div className="overflow-hidden rounded-lg bg-white text-[#1a1a1a]">
      <DocBar label="Rechnung · Automatisch erstellt von Takumiro" status="GoBD-konform" />
      <div className="p-4 sm:p-8">
        <div className="mb-7">
          <div className="text-xl font-extrabold mb-1">Elektro <span className="text-[#853953]">Bauer</span> GmbH</div>
          <div className="text-xs text-[#888] leading-relaxed">Hauptstraße 14 · 80331 München · Tel: 089 123456 · USt-IdNr.: DE123456789</div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[#999] mb-1.5">Rechnungsempfänger</div>
            <div className="font-bold text-[15px]">Thomas Müller</div>
            <div className="text-xs text-[#666] leading-relaxed mt-1">Rosenstraße 7<br />80333 München</div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[#999] mb-1.5">Rechnungsdetails</div>
            <div className="text-xs text-[#666] leading-relaxed">
              <strong>Nr.:</strong> RE-2025-0089<br />
              <strong>Datum:</strong> 12.03.2025<br />
              <strong>Fällig:</strong> 26.03.2025
            </div>
          </div>
        </div>

        <div className="h-px bg-[#eee] mb-6" />
        <div className="text-lg font-extrabold mb-0.5">Rechnung</div>
        <div className="font-mono text-[11px] text-[#999] mb-5">RE-2025-0089 · Leistungszeitraum: 10.03.2025</div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-sm mb-6 min-w-[420px]">
          <thead>
            <tr className="border-b-2 border-[#eee]">
              {['Pos.', 'Leistung', 'Mge.', 'Einzel €', 'Gesamt €'].map((h, i) => (
                <th key={h} className={`font-mono text-[10px] tracking-widest uppercase text-[#999] pb-2.5 font-normal ${i >= 2 ? 'text-right' : 'text-left'} ${i === 0 ? 'w-10' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.pos} className="border-b border-[#f5f5f5]">
                <td className="py-3 font-mono text-[11px] text-[#bbb]">{r.pos}</td>
                <td className="py-3"><div className="font-semibold">{r.name}</div><div className="text-[11px] text-[#999]">{r.desc}</div></td>
                <td className="py-3 text-right font-mono text-[12px]">{r.qty}</td>
                <td className="py-3 text-right font-mono text-[12px]">{r.unit}</td>
                <td className="py-3 text-right font-semibold text-[#0e0e0e]">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="ml-auto max-w-[240px] space-y-1 text-sm text-[#555]">
          <div className="flex justify-between"><span>Nettobetrag</span><span>1.575,00 €</span></div>
          <div className="flex justify-between"><span>USt. 19%</span><span>299,25 €</span></div>
          <div className="flex justify-between border-t-2 border-[#0e0e0e] pt-2.5 mt-2 text-base font-extrabold text-[#0e0e0e]">
            <span>Gesamtbetrag</span><span className="text-[#853953]">1.874,25 €</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#eee] grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[['Bank','Sparkasse München'],['IBAN','DE12 3456 7890 1234 5678 90'],['BIC','SSKMDEMMXXX'],['Verwendungszweck','RE-2025-0089']].map(([l,v]) => (
            <div key={l}><div className="font-mono text-[10px] tracking-widest uppercase text-[#bbb] mb-0.5">{l}</div><div className="font-mono text-sm text-[#333]">{v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Document: Offer (Angebot) ────────────────────────────────────────────────

function OfferDoc() {
  const rows = [
    { pos: '01', name: 'Demontage & Entsorgung Altbad',    desc: 'WC, Wanne, Waschbecken, Fliesen',             total: '850,00'   },
    { pos: '02', name: 'Neue Bodenplatte + Abdichtung',    desc: 'Verbundabdichtung nach DIN 18195',             total: '680,00'   },
    { pos: '03', name: 'Fliesenarbeiten Wand & Boden',     desc: 'Ca. 18m² inkl. Material (Kundenauswahl)',      total: '1.440,00' },
    { pos: '04', name: 'Sanitärinstallation komplett',     desc: 'Dusche, WC, Waschbecken inkl. Armatur',        total: '1.320,00' },
  ];

  return (
    <div className="overflow-hidden rounded-lg bg-white text-[#1a1a1a]">
      <DocBar label="Angebot · Automatisch erstellt von Takumiro" status="Versandfertig" />
      <div className="p-4 sm:p-8">
        <div className="mb-7">
          <div className="text-xl font-extrabold mb-1">Sanitär <span className="text-[#853953]">Richter</span></div>
          <div className="text-xs text-[#888]">Parkstraße 3 · 50667 Köln · Tel: 0221 987654</div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[#999] mb-1.5">Angebot für</div>
            <div className="font-bold text-[15px]">Familie Schreiber</div>
            <div className="text-xs text-[#666] mt-1">Lindenweg 22 · 50668 Köln</div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[#999] mb-1.5">Details</div>
            <div className="text-xs text-[#666] leading-relaxed">
              <strong>Nr.:</strong> AN-2025-0034<br />
              <strong>Datum:</strong> 12.03.2025<br />
              <strong>Gültig bis:</strong> 12.04.2025
            </div>
          </div>
        </div>

        <div className="h-px bg-[#eee] mb-6" />
        <div className="text-lg font-extrabold mb-0.5">Angebot – Badezimmer-Sanierung</div>
        <div className="font-mono text-[11px] text-[#999] mb-5">AN-2025-0034</div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-sm mb-6 min-w-[320px]">
          <thead>
            <tr className="border-b-2 border-[#eee]">
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-[#999] pb-2.5 font-normal w-10">Pos.</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-[#999] pb-2.5 font-normal">Leistung</th>
              <th className="text-right font-mono text-[10px] tracking-widest uppercase text-[#999] pb-2.5 font-normal w-28">Gesamt €</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.pos} className="border-b border-[#f5f5f5]">
                <td className="py-3 font-mono text-[11px] text-[#bbb]">{r.pos}</td>
                <td className="py-3"><div className="font-semibold">{r.name}</div><div className="text-[11px] text-[#999]">{r.desc}</div></td>
                <td className="py-3 text-right font-semibold text-[#0e0e0e]">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        </div>

        <div className="ml-auto max-w-[240px] space-y-1 text-sm text-[#555]">
          <div className="flex justify-between"><span>Netto</span><span>4.290,00 €</span></div>
          <div className="flex justify-between"><span>USt. 19%</span><span>815,10 €</span></div>
          <div className="flex justify-between border-t-2 border-[#0e0e0e] pt-2.5 mt-2 text-base font-extrabold text-[#0e0e0e]">
            <span>Gesamtangebot</span><span className="text-[#853953]">5.105,10 €</span>
          </div>
        </div>

        <div className="mt-6 border-l-4 border-[#853953] bg-[#fafafa] rounded-r-md px-4 py-3 text-sm text-[#555] leading-relaxed">
          Ausführungszeitraum ca. 5–7 Werktage. Bindefrist 30 Tage. Alle Preise inkl. Anfahrt und Entsorgung. Bei Auftragserteilung 30% Anzahlung.
        </div>
      </div>
    </div>
  );
}

// ─── Document: Call transcript (Anruf) ───────────────────────────────────────

function CallDoc() {
  const lines = [
    { speaker: 'Takumiro',      role: 'takumiro', text: 'Guten Tag, hier ist der Assistent von Sanitär Richter – wie kann ich Ihnen helfen?' },
    { speaker: 'Frau Wagner', role: 'kunde', text: 'Hallo, ich hab ein Problem mit meinem Wasserhahn im Bad. Der tropft schon seit Tagen, das muss dringend repariert werden.' },
    { speaker: 'Takumiro',      role: 'takumiro', text: 'Verstehe. Ich schaue in den Kalender – hätten Sie nächste Woche Mittwoch zwischen 13 und 16 Uhr Zeit?' },
    { speaker: 'Frau Wagner', role: 'kunde', text: 'Ja, Mittwoch 14 Uhr würde mir sehr gut passen.' },
    { speaker: 'Takumiro',      role: 'takumiro', text: 'Perfekt, ich trage das ein. Sie bekommen eine Bestätigung per SMS. Ihre Adresse?' },
    { speaker: 'Frau Wagner', role: 'kunde', text: 'Birkenweg 11, 50667 Köln.' },
  ];

  return (
    <div className="overflow-hidden rounded-lg bg-white text-[#1a1a1a]">
      <DocBar label="Anruf-Protokoll · Automatisch erstellt von Takumiro" status="Termin gesichert" />
      <div className="p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6 sm:gap-x-6">
          {[['Anrufer','Petra Wagner'],['Uhrzeit','14:23 Uhr'],['Dauer','2 Min 14 Sek'],['Nummer','0177 3456789']].map(([l,v]) => (
            <div key={l}>
              <div className="font-mono text-[10px] tracking-widest uppercase text-[#999]">{l}</div>
              <div className="text-sm font-semibold text-[#1a1a1a] mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        <div className="h-px bg-[#eee] mb-5" />
        <div className="font-mono text-[11px] text-[#999] mb-4">Gesprächsprotokoll (automatische Zusammenfassung)</div>

        <div className="flex flex-col gap-3 mb-5">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-3">
              <div className={`font-mono text-[10px] tracking-widest uppercase pt-2.5 w-[60px] flex-shrink-0 font-bold ${l.role === 'takumiro' ? 'text-[#853953]' : 'text-blue-500'}`}>{l.speaker}</div>
              <div className="flex-1 bg-[#f8f8f8] rounded-md px-3.5 py-2.5 text-[13px] text-[#444] leading-relaxed">{l.text}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3.5 bg-[#f0fdf4] border border-[#86efac] rounded-lg px-5 py-4">
          <span className="text-2xl">✅</span>
          <div className="text-[13px] text-[#15803d] leading-relaxed">
            <strong className="block text-[15px] text-[#166534] mb-0.5">Termin automatisch gebucht</strong>
            Mittwoch, 19. März · 14:00 Uhr · Petra Wagner · Birkenweg 11, Köln<br />
            Problem: Tropfender Wasserhahn · SMS-Bestätigung bereits gesendet
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Document: Appointment (Termin) ──────────────────────────────────────────

function AppointmentDoc() {
  const days = [
    ['other','24'],['other','25'],['other','26'],['other','27'],['other','28'],['other','1'],['other','2'],
    ['','3'],['','4'],['','5'],['','6'],['','7'],['','8'],['','9'],
    ['','10'],['','11'],['today','12'],['','13'],['','14'],['','15'],['','16'],
    ['','17'],['','18'],['','19'],['active','20'],['','21'],['','22'],['','23'],
    ['','24'],['','25'],['','26'],['','27'],['','28'],['','29'],['','30'],
  ];

  return (
    <div className="overflow-hidden rounded-lg bg-white text-[#1a1a1a]">
      <DocBar label="Terminbuchung · Automatisch erstellt von Takumiro" status="Bestätigung gesendet" />
      <div className="p-4 sm:p-8">
        <div className="overflow-hidden rounded-lg border border-[#e5e5e5] mb-5">
          <div className="bg-[#853953] px-5 py-4 text-white font-bold text-lg tracking-wide">März 2025</div>
          <div className="grid grid-cols-7">
            {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
              <div key={d} className="bg-[#f5f5f5] text-center py-2 font-mono text-[10px] tracking-widest uppercase text-[#999]">{d}</div>
            ))}
            {days.map(([cls, d], i) => (
              <div key={i} className={[
                'text-center py-2.5 text-[13px]',
                cls === 'active' ? 'bg-[#853953] text-white font-extrabold' :
                cls === 'today'  ? 'font-bold text-[#1a1a1a]' :
                cls === 'other'  ? 'text-[#ddd]' : 'text-[#666]'
              ].join(' ')}>{d}</div>
            ))}
          </div>
        </div>

        <div className="bg-[#f5eff2] border border-[#c9a0b0] rounded-lg px-5 py-4">
          <div className="text-2xl font-bold text-[#853953] tracking-wide mb-1 sm:text-3xl">Do 20.03. · 09:00 Uhr</div>
          <div className="text-[13px] text-[#612D53] leading-relaxed">
            <strong>Klaus Becker</strong> · Heizungsinspektion & Wartung<br />
            Waldstraße 45, 80333 München<br /><br />
            📱 Erinnerung an Kunden: Mittwoch 09:00 Uhr — <strong>automatisch gesendet</strong><br />
            📩 Bestätigung per E-Mail: <strong>bereits versendet</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function ResultModal({ taskType, onClose, onOpenSheet }: ResultModalProps) {
  const [phase,    setPhase]    = useState<'processing' | 'result'>('processing');
  const [btnPhase, setBtnPhase] = useState<'idle' | 'message'>('idle');

  useEffect(() => {
    if (!taskType) { setPhase('processing'); setBtnPhase('idle'); return; }
    setPhase('processing');
    setBtnPhase('idle');
    const t = setTimeout(() => setPhase('result'), 2200);
    return () => clearTimeout(t);
  }, [taskType]);

  function handleApprove() {
    setBtnPhase('message');
    setTimeout(() => {
      onClose();
      onOpenSheet?.();
    }, 1800);
  }

  if (!taskType) return null;

  // ── Processing phase: nothing — orb runs in speaking state naturally
  if (phase === 'processing') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-lg sm:items-center sm:p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-xl sm:rounded-xl border border-[rgba(133,57,83,0.18)] bg-[#111111] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* ── Result ─────────────────────────────────────────── */}
        {phase === 'result' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 sm:px-7 sm:py-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-[#612D53] to-[#853953] animate-pulse" />
                <div>
                  <div className="font-mono text-[11px] tracking-widest text-[#853953] uppercase">Takumiro</div>
                  <div className="mt-0.5 text-sm text-[#666]">{STATUS_TEXTS[taskType]}</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-base text-[#666] transition-colors hover:border-[#853953] hover:text-white"
              >✕</button>
            </div>

            {/* Speech bubble */}
            <div className="mx-4 mt-5 mb-5 rounded-lg border border-[rgba(133,57,83,0.2)] bg-[rgba(133,57,83,0.08)] px-4 py-3 text-sm italic leading-relaxed text-[#ddd] sm:mx-7 sm:mt-7 sm:mb-6 sm:px-5 sm:py-4">
              {TAKUMIRO_SPEECHES[taskType]}
            </div>

            {/* Document */}
            <div className="mx-4 mb-5 sm:mx-7 sm:mb-7">
              {taskType === 'rechnung' && <InvoiceDoc />}
              {taskType === 'angebot'  && <OfferDoc />}
              {taskType === 'anruf'    && <CallDoc />}
              {taskType === 'termin'   && <AppointmentDoc />}
            </div>

            {/* Action buttons — sticky to bottom of modal */}
            <div className="sticky bottom-0 flex gap-2.5 px-4 pb-5 pt-3 bg-[#111111] border-t border-white/5 sm:px-7 sm:pb-7 sm:pt-4">
              <button
                onClick={handleApprove}
                disabled={btnPhase === 'message'}
                className="relative flex-1 overflow-hidden rounded-md py-3.5 text-sm font-bold tracking-wide text-white transition-all duration-300"
                style={{ background: btnPhase === 'message' ? '#16a34a' : '#853953' }}
              >
                {/* Default label */}
                <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${btnPhase === 'idle' ? 'opacity-100' : 'opacity-0'}`}>
                  ✓ Freigeben &amp; Senden
                </span>
                {/* Achievement message */}
                <span className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-300 ${btnPhase === 'message' ? 'opacity-100' : 'opacity-0'}`}>
                  <span>⏱️</span>
                  <span>2 Stunden Arbeit gespart</span>
                  <span className="flex items-end gap-[3px] pb-0.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms',   animationDuration: '900ms' }} />
                    <span className="inline-block h-1 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '180ms', animationDuration: '900ms' }} />
                    <span className="inline-block h-1 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '360ms', animationDuration: '900ms' }} />
                  </span>
                </span>
                {/* Invisible spacer to keep height stable */}
                <span className="invisible">⏱️ 2 Stunden Arbeit gespart</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-white/10 bg-[#181818] py-3.5 text-sm font-bold tracking-wide text-[#F2EDE4] transition-all hover:border-[#853953] hover:text-[#853953]"
              >
                Bearbeiten
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
