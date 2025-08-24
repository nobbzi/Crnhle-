"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** UI primitives */
const Button = ({ children, className = "", variant = "default", size = "md", ...rest }: any) => {
  const base = "inline-flex items-center justify-center rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes: Record<string,string> = { sm: "text-sm px-3 py-1.5", md: "text-sm px-4 py-2", lg: "text-base px-5 py-2.5" };
  const variants: Record<string,string> = {
    default: "bg-black text-white hover:bg-neutral-900 focus:ring-black",
    secondary: "bg-white text-black border border-black/30 hover:bg-neutral-100 focus:ring-black",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
  };
  return <button className={[base, sizes[size] || sizes.md, variants[variant] || variants.default, className].join(" ")} {...rest}>{children}</button>;
};
const Card = ({ children, className = "", style }: any) => <div className={["rounded-xl border-4 border-black/30 bg-white/80 shadow-xl", className].join(" ")} style={style}>{children}</div>;
const CardHeader = ({ children, className = "" }: any) => <div className={["px-4 pt-4", className].join(" ")}>{children}</div>;
const CardTitle = ({ children, className = "" }: any) => <div className={["text-xl font-bold text-center", className].join(" ")}>{children}</div>;
const CardContent = ({ children, className = "" }: any) => <div className={["px-4 pb-4", className].join(" ")}>{children}</div>;
const Input = ({ className = "", ...rest }: any) => <input className={["w-full rounded-md border border-black/20 bg-white/80 px-3 py-2 text-sm", className].join(" ")} {...rest} />;
const SelectBox = ({ value, onChange, children, className = "" }: any) => (
  <select className={["w-full rounded-md border border-black/20 bg-white/80 px-3 py-2 text-sm", className].join(" ")} value={value} onChange={(e)=>onChange(e.target.value)}>
    {children}
  </select>
);

/** Utilities */
const uid = () => Math.random().toString(36).slice(2, 10);
const pickFirst = () => (Math.random() < 0.5 ? 'a' : 'b');
const chunk = (arr: any[], size: number) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), [] as any[]);
const shuffle = (arr: any[]) => { const a = [...arr]; for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };
const save = (k:string,d:any) => localStorage.setItem(k, JSON.stringify(d));
const load = (k:string,f:any) => { try { const v = JSON.parse(localStorage.getItem(k) as any); return v ?? f; } catch { return f; } };

const scheduleRoundRobin4 = (ids: string[]) => {
  const [A, B, C, D] = ids;
  return [
    { id: uid(), a: A, b: B, first: pickFirst() },
    { id: uid(), a: A, b: C, first: pickFirst() },
    { id: uid(), a: A, b: D, first: pickFirst() },
    { id: uid(), a: B, b: C, first: pickFirst() },
    { id: uid(), a: B, b: D, first: pickFirst() },
    { id: uid(), a: C, b: D, first: pickFirst() },
  ];
};
const scheduleRoundRobinAllPairs = (ids: string[]) => {
  const matches: any[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({ id: uid(), a: ids[i], b: ids[j], first: pickFirst() });
    }
  }
  return shuffle(matches);
};
const computeStandings = (group: any, playersIndex: Record<string, any>) => {
  const table = group.players.map((pid: string) => ({ id: pid, name: playersIndex[pid]?.name || "?", P:0,W:0,L:0,PF:0,PA:0,PD:0,Pts:0 }));
  const row: any = Object.fromEntries(table.map((r)=>[r.id,r]));
  for (const m of group.matches) {
    if (!m.completed) continue;
    const a=row[m.a], b=row[m.b];
    a.P++; b.P++;
    a.PF+=m.scoreA; a.PA+=m.scoreB; a.PD=a.PF-a.PA;
    b.PF+=m.scoreB; b.PA+=m.scoreA; b.PD=b.PF-b.PA;
    if (m.scoreA>m.scoreB) { a.W++; b.L++; a.Pts+=3; } else { b.W++; a.L++; b.Pts+=3; }
  }
  table.sort((x:any,y:any)=> y.Pts-x.Pts || y.PD-x.PD || y.PF-x.PF || x.name.localeCompare(y.name));
  return table;
};
const buildKnockout = (groups: any[], playersIndex: Record<string, any>) => {
  const order = groups.map((g)=>g.name).sort();
  const advancers: any = {};
  for (const g of groups) {
    const table = computeStandings(g, playersIndex);
    advancers[g.name] = [table[0]?.id, table[1]?.id];
  }
  const pairings: any[] = [];
  for (let i=0;i<order.length;i+=2){
    const g1=order[i], g2=order[i+1]; if (!g2) break;
    const [g1w,g1r]=advancers[g1]; const [g2w,g2r]=advancers[g2];
    if (g1w&&g2r) pairings.push({ id: uid(), a: g1w, b: g2r, first: pickFirst() });
    if (g2w&&g1r) pairings.push({ id: uid(), a: g2w, b: g1r, first: pickFirst() });
  }
  return pairings;
};
export const validateCornholeScore = (sa?: number, sb?: number, target=21) => {
  if (sa==null || sb==null) return "Enter both scores";
  if (sa===sb) return "No draws in cornhole";
  const max = Math.max(sa,sb), min = Math.min(sa,sb);
  if (max !== target) return `Winner must have exactly ${target}`;
  if (min >= target) return `Loser must be below ${target}`;
  return null;
};
const isPowerOfTwo = (n: number) => (n & (n-1)) === 0;
const buildSingleElimFirstRound = (ids: string[]) => { const seeded = shuffle(ids); const round:any[]=[]; for (let i=0;i<seeded.length;i+=2) round.push({ id: uid(), a: seeded[i], b: seeded[i+1], first: pickFirst() }); return round; };

/** Background */
const Board = ({ className = "" }: any) => {
  const HOLE=86, HOLE_TOP=52, APEX_Y=HOLE_TOP+HOLE-10;
  return (
    <div className={`absolute shadow-2xl rounded-[22px] overflow-hidden border-8 border-black ${className}`} style={{ backgroundColor: "#fff" }}>
      <div className="absolute inset-0" style={{ clipPath: `polygon(0% 100%, 100% 100%, 50% ${APEX_Y}px)`, background: "#000" }} />
      <div className="absolute rounded-full" style={{ width: HOLE, height: HOLE, top: HOLE_TOP, left: "50%", transform: "translateX(-50%)", background: "#0a0a0a", boxShadow: "inset 0 0 0 6px #000, inset 0 0 18px rgba(0,0,0,0.65)" }} />
    </div>
  );
};
const CornholeBackdrop = () => (
  <div className="pointer-events-none fixed inset-0 -z-10">
    <div className="absolute inset-0" style={{ background: `radial-gradient(1200px 800px at 50% 20%, #1f1f1f, #000000)` }} />
    <Board className="-left-24 top-10 rotate-6 w-[520px] h-[980px]" />
    <Board className="-right-28 bottom-0 -rotate-6 w-[520px] h-[980px]" />
  </div>
);

/** Coin art – replace with files in /public */
const HEADS_URL = "/coin_heads_768.png";
const TAILS_URL = "/coin_tails_768.png";

/** Bean */
const BeanIcon = ({ active, size = 16, animKey }: any) => {
  if (!active) return null;
  return (
    <motion.span key={`emo-${animKey}`} initial={{ scale:0, y:-6, opacity:0, rotate:-10 }} animate={{ scale:[1.2,1], y:0, opacity:1, rotate:0 }} transition={{ type:'spring', stiffness:520, damping:18 }} className="inline-block" style={{ width:size, height:size }} role="img" aria-label="bean">🫘</motion.span>
  );
};
const BALDY_TRIGGERS = new Set(["tom","tommer","turk","gobbler"]);
const toBaldyIfNeeded = (s: string) => BALDY_TRIGGERS.has(String(s).trim().toLowerCase()) ? "baldy" : s;
const playerOptionsFor = (mode: string) => { if (mode === 'single') return [4,8,16,32]; if (mode === 'groups') return [8,12,16,20,24,28,32]; return [4,6,8,10,12,14,16,20,24,28,32]; };

/** Setup form */
const SetupForm = ({ onSetup, target, setTarget }: any) => {
  const [mode, setMode] = useState(() => load("ch_mode", "groups"));
  const [count, setCount] = useState("8");
  const [names, setNames] = useState(() => Array.from({ length: 8 }, () => ""));
  const [setupError, setSetupError] = useState("");
  const [missing, setMissing] = useState<number[]>([]);
  const nameRefs = useRef<HTMLInputElement[]>([] as any);

  useEffect(() => { save("ch_mode", mode); }, [mode]);

  useEffect(() => {
    const n = Number(count); if (!Number.isFinite(n)) return;
    const baseMin = 4;
    const len = Math.min(32, Math.max(baseMin, n));
    const next = [...names];
    if (next.length < len) { for (let i = next.length; i < len; i++) next.push(""); }
    else if (next.length > len) { next.length = len; }
    setNames(next);
  }, [count, mode]);

  useEffect(() => { setSetupError(""); }, [names, count, mode]);
  useEffect(() => { setMissing([]); }, [count, mode]);

  return (
    <Card className="backdrop-blur-md">
      <CardHeader className="flex flex-col items-center gap-2">
        <CardTitle className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-zinc-900">
          <span className="text-2xl">👥</span> Jordy C BBQ Cup — Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
          <div className="space-y-2 max-w-xs w-full mx-auto md:mx-0">
            <label className="font-semibold">Format</label>
            <SelectBox value={mode} onChange={setMode}>
              <option value="groups">Groups → Knockout</option>
              <option value="single">Single-Elimination</option>
              <option value="roundrobin">Round Robin → Top-4 Knockout</option>
            </SelectBox>
          </div>
          <div className="space-y-2 max-w-xs w-full mx-auto md:mx-0">
            <label className="font-semibold">Target Score</label>
            <SelectBox value={String(target)} onChange={(v: any)=> setTarget(Number(v))}>
              <option value="11">11</option>
              <option value="21">21</option>
            </SelectBox>
          </div>
          <div className="space-y-2 md:col-start-3 md:justify-self-end md:text-right max-w-xs w-full">
            <label className="font-semibold">Players ({mode==='single'? '4, 8, 16, 32' : mode==='groups' ? '8–32, multiples of 4' : '4–32 (any)'})</label>
            <SelectBox value={count} onChange={setCount}>
              {playerOptionsFor(mode).map((n)=> <option key={n} value={String(n)}>{n}</option>)}
            </SelectBox>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {names.map((val, i) => (
            <Input
              key={i}
              ref={(el:any) => (nameRefs.current[i] = el)}
              value={val}
              onChange={(e:any)=>{
                const next=[...names]; next[i]=toBaldyIfNeeded(e.target.value); setNames(next);
                if (String(next[i]).trim()) setMissing((prev)=> prev.filter((j) => j !== i));
              }}
              onFocus={(e:any)=> e.target.select()}
              placeholder={`Player ${i+1}`}
              className={["text-center text-base", missing.includes(i) ? "ring-2 ring-rose-500" : ""].join(" ")}
              aria-invalid={missing.includes(i)}
            />
          ))}
        </div>
        <div className="flex justify-center mt-2">
          <Button variant="destructive" onClick={() => setNames((prev)=>prev.map(()=> ""))}>🗑️ Clear All</Button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm opacity-80">
            {mode === "groups" ? <>Groups of 4 (round-robin). Top two advance to the knockout. First to <b>{target}</b>.</> : mode === "single" ? <>Single-elimination bracket. Player count must be a power of two. First to <b>{target}</b>.</> : <>Round robin league. Everyone plays everyone once. <b>Top-4 advance</b> to knockout. First to <b>{target}</b>.</>}
          </div>
          <Button
            size="lg"
            onClick={() => {
              const trimmed = names.map(n => String(toBaldyIfNeeded(n)).trim());
              const sanitized = trimmed.filter(Boolean);
              const expected = Number(count);
              if (sanitized.length !== expected) {
                const missingIdx = trimmed.map((s, i) => [s, i]).filter(([s]) => !s).map(([, i]) => i);
                setMissing(missingIdx as any);
                setSetupError("Please enter " + expected + " player names (you've entered " + sanitized.length + ").");
                const first = (missingIdx as any)[0]; const el = (nameRefs.current as any)[first];
                if (el && typeof el.scrollIntoView === "function") { el.scrollIntoView({ behavior: "smooth", block: "center" }); try { el.focus({ preventScroll: true }); el.select?.(); } catch {} }
                return;
              }
              setMissing([]); setSetupError(""); onSetup({ names: sanitized, mode });
            }}
          >
            ▶️ Start Tournament
          </Button>
          {setupError && <div className="text-sm text-rose-700">{setupError}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

/** Score inputs & step buttons */
const ScoreInput = ({ value, onChange, label, max = 21, first = false }: any) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs font-bold opacity-70 truncate max-w-[120px] text-center">
      {label} {first && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black text-white text-[10px]">First</span>}
    </span>
    <Input type="number" inputMode="numeric" min={0} max={max} className="w-14 h-10 p-1 text-base bg-white/80 text-center" value={value ?? ""} onChange={(e:any)=> onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
  </div>
);
const StepButton = ({ aria, triangleClass, onStep }: any) => {
  const handlePointerDown = (e:any) => { e.preventDefault(); e.stopPropagation(); onStep(); };
  const swallowClick = (e:any) => { e.preventDefault(); e.stopPropagation(); };
  const handleKeyDown = (e:any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStep(); } };
  return (
    <button
      type="button"
      aria-label={aria}
      onPointerDown={handlePointerDown}
      onClick={swallowClick}
      onKeyDown={handleKeyDown}
      className="relative w-14 h-12 md:w-16 md:h-14 flex items-center justify-center active:opacity-80 select-none"
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      <span className={`pointer-events-none w-0 h-0 border-y-[18px] border-y-transparent ${triangleClass}`} />
    </button>
  );
};

/** Canvas coin */
const useImage = (src: string) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
};
function CoinCanvas({ size = 120, targetFace = "heads", flipping = false, duration = 1200, headsSrc = HEADS_URL, tailsSrc = TAILS_URL, className = "", borderClass = "border-4 border-black/30", shadowClass = "shadow-xl", }: any) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headsImg = useImage(headsSrc);
  const tailsImg = useImage(tailsSrc);
  const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = Math.round(size * DPR);
    c.height = Math.round(size * DPR);
    c.style.width = size + "px";
    c.style.height = size + "px";
  }, [size, DPR]);

  const drawFinal = React.useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const img = targetFace === "heads" ? headsImg : tailsImg;
    if (!img) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.scale(DPR, DPR);
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.clip();
    ctx.drawImage(img, 0, 0, size, size);
    ctx.restore();
  }, [DPR, headsImg, tailsImg, targetFace, size]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    if (!headsImg || !tailsImg) return;

    if (!flipping) { drawFinal(); return; }

    const front = targetFace === "heads" ? headsImg : tailsImg;
    const back  = targetFace === "heads" ? tailsImg : headsImg;
    let start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const angle = t * Math.PI * 4;
      const scaleX = Math.cos(angle);

      ctx.clearRect(0, 0, c.width, c.height);
      ctx.save();
      ctx.scale(DPR, DPR);
      ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.clip();
      ctx.translate(size/2, size/2);
      ctx.scale(scaleX, 1);
      ctx.drawImage(scaleX >= 0 ? front : back, -size/2, -size/2, size, size);
      ctx.restore();

      if (t < 1 && flipping) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        drawFinal();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [flipping, duration, DPR, headsImg, tailsImg, targetFace, size, drawFinal]);

  return (
    <canvas ref={canvasRef} className={["rounded-full bg-neutral-300", borderClass, shadowClass, className].join(" ")} role="img" aria-label={flipping ? "Flipping coin" : `Coin ${targetFace}`} />
  );
}

/** Match card */
const MatchCard = ({ match, playersIndex, onSubmit, onStart, disabled, target, variant = "default" }: any) => {
  const A = playersIndex[match.a]?.name;
  const B = playersIndex[match.b]?.name;
  const [sa, setSa] = useState(match.scoreA);
  const [sb, setSb] = useState(match.scoreB);
  useEffect(()=>{ setSa(match.scoreA); setSb(match.scoreB); }, [match.id, match.scoreA, match.scoreB]);

  const isBracket = variant === "bracket";
  const isEditor = variant === "editor";
  const err = isEditor ? validateCornholeScore(sa, sb, target) : null;

  if (isBracket) {
    return (
      <Card className="border-2 bg-white/80 border-black/40 p-0 text-zinc-900">
        <CardContent className="px-3 py-2">
          <div className="text-[13px] leading-tight font-semibold text-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate pr-1">{A}</span>
              <div className="flex items-center gap-1">
                {match.first === 'a' && <span className="px-1 py-0.5 text-[10px] rounded bg-black text-white">First</span>}
                <BeanIcon active={match.scoreA != null && match.scoreB != null && match.scoreA > match.scoreB} animKey={`${match.id}-${match.scoreA}-${match.scoreB}-A`} />
              </div>
            </div>
            <div className="mt-1 pt-1 border-t border-black/20 flex items-center justify-between gap-2">
              <span className="truncate pr-1">{B}</span>
              <div className="flex items-center gap-1">
                {match.first === 'b' && <span className="px-1 py-0.5 text-[10px] rounded bg-black text-white">First</span>}
                <BeanIcon active={match.scoreA != null && match.scoreB != null && match.scoreB > match.scoreA} animKey={`${match.id}-${match.scoreA}-${match.scoreB}-B`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEditor) {
    return (
      <Card className={match.completed ? "border-2 border-emerald-500 bg-emerald-50 text-zinc-900 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]" : "border-2 bg-white/80 border-black/40 text-zinc-900"}>
        <CardHeader><CardTitle className="text-base flex items-center gap-2 justify-center">⚔️ {A} vs {B}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 justify-center">
          <div className="flex items-center gap-2">
            <ScoreInput label={A} value={sa} onChange={setSa} max={target} first={match.first === 'a'} />
            <span className="font-black">—</span>
            <ScoreInput label={B} value={sb} onChange={setSb} max={target} first={match.first === 'b'} />
          </div>
          <Button size="sm" className="shrink-0 whitespace-nowrap" disabled={!!err || disabled} onClick={()=> onSubmit({ ...match, scoreA: sa, scoreB: sb, completed: true })}>Save Score</Button>
          {err && <div className="text-xs text-rose-700 w-full text-center">{err}</div>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={match.completed ? "border-2 border-emerald-500 bg-emerald-50 text-zinc-900 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]" : "border-2 bg-white/80 border-black/40 text-zinc-900"}>
      <CardHeader><CardTitle className="text-base flex items-center gap-2 justify-center">⚔️ {A} vs {B}</CardTitle></CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-2">
        <div className="text-xs opacity-80 flex items-center gap-2">
          <span>First throw:</span>
          <span className="font-semibold">{match.first === 'a' ? A : B}</span>
          <CoinCanvas size={22} targetFace={match.first === 'a' ? 'heads' : 'tails'} flipping={false} duration={0} borderClass="border border-black/20" shadowClass="shadow" className="shrink-0" />
        </div>
        {match.completed && (<div className="text-sm font-semibold">Final: {match.scoreA} — {match.scoreB}</div>)}
        <Button size="sm" onClick={()=> onStart?.()} disabled={match.completed} className="bg-white text-black border border-black/30 hover:bg-gray-100 disabled:text-gray-400">
          {match.completed ? 'Completed' : 'Start Game'}
        </Button>
      </CardContent>
    </Card>
  );
};

/** Standings and stages */
const StandingsTable = ({ group, playersIndex }: any) => {
  const table = computeStandings(group, playersIndex);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-center">
        <thead>
          <tr className="text-zinc-100" style={{ backgroundColor: '#000000' }}>
            <th className="p-2 text-center rounded-l-lg">#</th>
            <th className="p-2 text-center">Player</th>
            <th className="p-2">P</th>
            <th className="p-2">W</th>
            <th className="p-2">L</th>
            <th className="p-2">PF</th>
            <th className="p-2">PA</th>
            <th className="p-2">PD</th>
            <th className="p-2 rounded-r-lg">Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r: any, i: number)=> (
            <tr key={r.id} className={`${i < 4 ? "bg-gray-100" : "bg-white"}`}>
              <td className="p-2 font-semibold text-center">{i+1}</td>
              <td className="p-2 font-semibold text-center">{r.name}</td>
              <td className="p-2 text-center">{r.P}</td>
              <td className="p-2 text-center">{r.W}</td>
              <td className="p-2 text-center">{r.L}</td>
              <td className="p-2 text-center">{r.PF}</td>
              <td className="p-2 text-center">{r.PA}</td>
              <td className="p-2 text-center">{r.PD}</td>
              <td className="p-2 text-center font-bold">{r.Pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs mt-2 opacity-70">Top 4 highlighted. Tiebreakers: Points → Point Diff → Points For → Name.</div>
    </div>
  );
};
const GroupStage = ({ groups, playersIndex, onUpdateMatch, onAdvance, target }: any) => {
  const allCompleted = groups.every((g: any) => g.matches.every((m: any) => m.completed));
  const completedCount = groups.reduce((acc:number,g:any)=> acc + g.matches.filter((m:any)=>m.completed).length, 0);
  const totalMatches = groups.reduce((acc:number,g:any)=> acc + g.matches.length, 0);
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <div className="text-lg font-semibold">Group Stage Progress: {completedCount}/{totalMatches} matches saved</div>
        <Button size="lg" disabled={!allCompleted} onClick={onAdvance} className="bg-white text-black border border-black/30 hover:bg-gray-100 disabled:text-gray-400">Generate Knockout Bracket</Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {groups.map((g:any)=> (
          <Card key={g.name} className="border-4 bg-white/80 text-zinc-900" style={{ borderColor: '#11111155' }}>
            <CardHeader><CardTitle className="text-2xl flex items-center gap-3 justify-center"><span className="inline-flex w-10 h-10 items-center justify-center rounded-full text-zinc-100 font-extrabold shadow" style={{ backgroundColor: '#000' }}>{g.name}</span>Group {g.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <StandingsTable group={g} playersIndex={playersIndex} />
              <div className="flex flex-wrap justify-center gap-4 w-full">
                {g.matches.map((m:any)=> (
                  <div key={m.id} className="w-full max-w-md">
                    <MatchCard match={m} playersIndex={playersIndex} disabled={false} target={target} variant="editor" onSubmit={(res:any)=> onUpdateMatch(g.name, res)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
const RoundRobinStage = ({ group, playersIndex, onUpdateMatch, onTop4, target }: any) => {
  if (!group) return null;
  const completedCount = group.matches.filter((m:any)=>m.completed).length;
  const totalMatches = group.matches.length;
  const allCompleted = completedCount === totalMatches && totalMatches > 0;
  const stickyTable = (
    <div className="sticky top-2 sm:top-4 z-20">
      <Card className="border-4 bg-white/90 backdrop-blur text-zinc-900" style={{ borderColor: '#11111155' }}>
        <CardHeader><CardTitle className="text-2xl text-center">Round Robin Standings</CardTitle></CardHeader>
        <CardContent><StandingsTable group={group} playersIndex={playersIndex} /></CardContent>
      </Card>
    </div>
  );
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <div className="text-lg font-semibold">Round Robin Progress: {completedCount}/{totalMatches} matches saved</div>
        <Button size="lg" disabled={!allCompleted} onClick={onTop4} className="bg-white text-black border border-black/30 hover:bg-gray-100 disabled:text-gray-400">Generate Top-4 Knockout</Button>
      </div>
      {stickyTable}
      <Card className="border-4 bg-white/80 text-zinc-900" style={{ borderColor: '#11111155' }}>
        <CardHeader><CardTitle className="text-2xl text-center">Round Robin Matches</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap justify-center gap-4 w-full">
            {group.matches.map((m:any)=> (
              <div key={m.id} className="w-full max-w-md">
                <MatchCard match={m} playersIndex={playersIndex} disabled={false} target={target} variant="editor" onSubmit={(res:any)=> onUpdateMatch(group.name, res)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/** Confetti & beans */
const ConfettiRain = () => {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return null;
  const pieces = Array.from({ length: 120 }, (_, i) => ({ id: i, x: Math.random() * 100, delay: Math.random() * 1.8, duration: 4 + Math.random() * 3, size: 6 + Math.random() * 8, rotate: Math.random() * 360 }));
  return (
    <div className="pointer-events-none fixed inset-0 -z-0">
      {pieces.map((p) => (
        <motion.div key={p.id} initial={{ y: -40, x: `${p.x}vw`, rotate: p.rotate, opacity: 0 }} animate={{ y: '110vh', rotate: p.rotate + 720, opacity: 1 }} transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, repeatDelay: 0 }} className="absolute top-0" style={{ width: p.size, height: p.size * 0.6, borderRadius: 2, background: 'linear-gradient(90deg, #ffffff, #dddddd)', boxShadow: '0 0 2px rgba(0,0,0,0.2)' }} />
      ))}
    </div>
  );
};
const USABeanRain = () => {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return null;
  const pieces = Array.from({ length: 100 }, (_, i) => ({ id: i, x: Math.random() * 100, delay: Math.random() * 1.8, duration: 5 + Math.random() * 3, size: 22 + Math.random() * 12, rotate: Math.random() * 360 }));
  return (
    <div className="pointer-events-none fixed inset-0 -z-0">
      {pieces.map((p) => (
        <motion.span key={p.id} role="img" aria-label="bean" initial={{ y: -40, x: `${p.x}vw`, rotate: p.rotate, opacity: 0 }} animate={{ y: '110vh', rotate: p.rotate + 540, opacity: 1 }} transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, repeatDelay: 0 }} className="absolute top-0 select-none" style={{ fontSize: p.size, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>🫘</motion.span>
      ))}
    </div>
  );
};
const getPodium = (rounds: any[][], championId: string) => {
  const last = rounds[rounds.length - 1];
  let silver: string | null = null;
  if (last && last.length === 1) {
    const f = last[0];
    if (f.completed && typeof f.scoreA === 'number' && typeof f.scoreB === 'number') {
      silver = f.scoreA > f.scoreB ? f.b : f.a;
    } else {
      silver = f.a === championId ? f.b : f.a;
    }
  }
  let bronze: string | null = null;
  if (rounds.length >= 2) {
    const semis = rounds[rounds.length - 2];
    if (semis && semis.length === 2) {
      const s1 = semis[0], s2 = semis[1];
      const loser1 = (s1.completed ? (s1.scoreA > s1.scoreB ? s1.b : s1.a) : null);
      const loser2 = (s2.completed ? (s2.scoreA > s2.scoreB ? s2.b : s2.a) : null);
      const score1 = (s1.completed ? Math.min(s1.scoreA, s1.scoreB) : -1);
      const score2 = (s2.completed ? Math.min(s2.scoreA, s2.scoreB) : -1);
      bronze = (score1 >= score2 ? loser1 : loser2) || loser1 || loser2;
    }
  }
  return { gold: championId, silver, bronze };
};
const Podium = ({ gold, silver, bronze, playersIndex }: any) => {
  const getName = (id: string) => playersIndex[id]?.name || '—';
  const steps = [
    { place: '2nd', label: '🥈', id: silver, h: 120, w: 140, gradient: 'linear-gradient(180deg,#f8fafc,#e2e8f0)', border: '#a1a1aa', shadow: '0 6px 16px rgba(0,0,0,0.25)' },
    { place: '1st', label: '🥇', id: gold,   h: 160, w: 160, gradient: 'linear-gradient(180deg,#fef9c3,#fde68a)', border: '#d4af37', shadow: '0 10px 22px rgba(0,0,0,0.30)' },
    { place: '3rd', label: '🥉', id: bronze, h: 100, w: 140, gradient: 'linear-gradient(180deg,#f5e0d3,#e7c4ad)', border: '#b46b3a', shadow: '0 5px 14px rgba(0,0,0,0.20)' },
  ];
  return (
    <div className="relative mt-6">
      <div className="absolute left-1/2 -translate-x-1/2 -z-10" style={{ width: 520, height: 18, background: 'linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0))', filter: 'blur(8px)' }} />
      <div className="flex items-end justify-center gap-6">
        {steps.map((s, i) => {
          const name = getName(s.id as any);
          return (
            <motion.div key={s.place} initial={{ y: 20, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.05 * i }} className="flex flex-col items-center" aria-label={`${s.place} place: ${name}`}>
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + 0.05 * i }} className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-white/90 text-zinc-900 border border-black/10 shadow">
                <span className="truncate max-w-[180px]">{name}</span>
                <span aria-hidden="true">{s.label}</span>
              </motion.div>
              <div className="relative flex items-end justify-center rounded-2xl border-4" style={{ width: s.w, height: s.h, background: s.gradient, borderColor: s.border, boxShadow: s.shadow }} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/** Scoreboard modal (coin flip) */
const ScoreboardModal = ({ open, onClose, onSave, target = 21, aName = 'Player A', bName = 'Player B', initialA = 0, initialB = 0, startFirst = 'A' }: any) => {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [coinDone, setCoinDone] = useState(false);
  const [coinWinner, setCoinWinner] = useState<string | null>(null);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(()=>{ setA(initialA); setB(initialB); }, [initialA, initialB]);
  useEffect(()=>{ if(open){ setCoinDone(false); setCoinWinner(null); setFlipping(false);} }, [open, aName, bName]);

  const targetFace = (startFirst === 'A' ? 'heads' : 'tails');

  useEffect(() => {
    if (!open || coinWinner || coinDone) return;
    setFlipping(true);
    const timer = setTimeout(() => {
      setCoinWinner(startFirst);
      setFlipping(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [open, startFirst, coinWinner, coinDone]);

  if (!open) return null;
  const done = (a === target && b < target) || (b === target && a < target);

  if (!coinDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-xl mx-auto max-h-[90svh] overflow-y-auto p-2">
          <Card className="border-4 border-black/30 bg-white/95 text-zinc-900 overflow-hidden">
            <CardHeader><CardTitle className="text-2xl text-center">First Throw</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-5">
                <div className="text-sm opacity-80">Deciding who throws first…</div>
                <CoinCanvas size={120} targetFace={targetFace} flipping={flipping} duration={1200} />
                {coinWinner && (
                  <>
                    <div className="text-lg font-semibold">{(coinWinner === 'A' ? aName : bName)} goes first!</div>
                    <div className="flex gap-3">
                      <Button onClick={()=> setCoinDone(true)} className="bg-white text-black border border-black/30 hover:bg-gray-100">Start Game</Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-3xl mx-auto max-h-[90svh] overflow-y-auto p-2">
        <Card className="border-4 border-black/30 bg-white/95 text-zinc-900">
          <CardHeader><CardTitle className="text-2xl text-center">In-Game Scoreboard</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-lg truncate max-w-[45%] flex items-center gap-2">
                {aName}
                {startFirst === 'A' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black text-white">First</span>}
              </div>
              <div className="font-semibold text-lg truncate max-w-[45%] text-right flex items-center gap-2 justify-end">
                {bName}
                {startFirst === 'B' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black text-white">First</span>}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="mx-auto rounded-md border-4 border-black/60 overflow-hidden shadow-lg" style={{ width: 260 }}>
                <div className="text-center font-black text-white py-2" style={{ background: '#2b2b2b' }}>Cornhole</div>
                <div className="grid grid-cols-2" style={{ background: '#f3f4f6' }}>
                  {Array.from({ length: target }, (_, i) => target - i).map(n => (
                    <React.Fragment key={n}>
                      <div className="text-center text-sm border-r border-white" style={{ background: a >= n ? '#93c5fd' : (n % 2 ? '#ffffff' : '#e5e7eb'), padding: '3px 0' }}>{n}</div>
                      <div className="text-center text-sm" style={{ background: b >= n ? '#fca5a5' : (n % 2 ? '#ffffff' : '#e5e7eb'), padding: '3px 0' }}>{n}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 mx-auto rounded-md border border-black/50 bg-[#2b2b2b] text-white px-3 py-3 flex items-center justify-between" style={{ width: 260 }}>
              <div className="flex items-center gap-4">
                <StepButton aria="A -1" triangleClass="border-r-[28px] border-r-sky-400" onStep={()=> setA(Math.max(0, a-1))} />
                <StepButton aria="A +1" triangleClass="border-l-[28px] border-l-sky-400" onStep={()=> setA(Math.min(target, a+1))} />
              </div>
              <div className="flex items-center gap-4">
                <StepButton aria="B -1" triangleClass="border-r-[28px] border-r-rose-400" onStep={()=> setB(Math.max(0, b-1))} />
                <StepButton aria="B +1" triangleClass="border-l-[28px] border-l-rose-400" onStep={()=> setB(Math.min(target, b+1))} />
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Button onClick={()=> onClose()} className="bg-white text-black border border-black/30 hover:bg-gray-100">Cancel</Button>
              <Button onClick={()=> onSave(a,b)} disabled={!done} className="bg-black text-white hover:bg-black/90 disabled:opacity-50">Save Result</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

/** Bracket */
const KnockoutBracket = ({ rounds, playersIndex, onStartGame, target }: any) => {
  const names = ["Round of 32", "Round of 16", "Quarter-Finals", "Semi-Finals", "Final"];
  const labelFor = (idx: number, total: number) => names[Math.max(0, names.length - total + idx)] || `Round ${idx + 1}`;
  return (
    <div className="space-y-10 text-center">
      {rounds.map((matches: any[], idx: number) => (
        <div key={idx}>
          <div className="text-2xl font-black mb-4 flex items-center justify-center gap-2">🏆 {labelFor(idx, rounds.length)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 place-items-center">
            {matches.map((m: any) => (
              <div key={m.id} className="w-full max-w-md">
                <MatchCard match={m} playersIndex={playersIndex} target={target} onStart={() => onStartGame(idx, m)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/** Main Page */
export default function Page() {
  const [players, setPlayers] = useState(() => load("ch_players", []));
  const [groups, setGroups] = useState(() => load("ch_groups", []));
  const [mode, setMode] = useState(() => load("ch_mode", "groups"));
  const [stage, setStage] = useState(() => load("ch_stage", "setup"));
  const [rounds, setRounds] = useState<any[][]>(() => load("ch_rounds", []));
  const [champion, setChampion] = useState<string | null>(() => load("ch_champion", null));
  const [target, setTarget] = useState(() => load("ch_target", 21));
  const [live, setLive] = useState<any | null>(null);

  const playersIndex = useMemo(() => Object.fromEntries(players.map((p:any) => [p.id, p])), [players]);

  useEffect(()=> save("ch_players", players), [players]);
  useEffect(()=> save("ch_groups", groups), [groups]);
  useEffect(()=> save("ch_mode", mode), [mode]);
  useEffect(()=> save("ch_stage", stage), [stage]);
  useEffect(()=> save("ch_rounds", rounds), [rounds]);
  useEffect(()=> save("ch_champion", champion), [champion]);
  useEffect(()=> save("ch_target", target), [target]);

  useEffect(() => {
    if (players.length === 0 && stage !== "setup") {
      setStage("setup");
    }
  }, [players.length, stage]);

  const resetAll = () => {
    setPlayers([]); setGroups([]); setRounds([]); setChampion(null); setStage("setup");
    localStorage.removeItem("ch_players");
    localStorage.removeItem("ch_groups");
    localStorage.removeItem("ch_stage");
    localStorage.removeItem("ch_rounds");
    localStorage.removeItem("ch_champion");
  };

  const handleSetup = ({ names, mode: selectedMode }: any) => {
    setMode(selectedMode);
    const count = names.length;
    if (selectedMode === "groups") {
      if (count % 4 !== 0 || count < 8 || count > 32) {
        alert("For Groups → Knockout, player count must be a multiple of 4 between 8 and 32.");
        return;
      }
      const seeded = shuffle(names).map((name: string, i: number) => ({ id: uid(), name: name || `Player ${i+1}`, seed: i + 1 }));
      const groupsCount = count / 4;
      const labels = Array.from({ length: groupsCount }, (_, i) => String.fromCharCode(65 + i));
      const chunksArr = chunk(seeded, 4);
      const built = chunksArr.map((ch: any[], i: number) => ({ name: labels[i], players: ch.map((p:any)=>p.id), matches: scheduleRoundRobin4(ch.map((p:any)=>p.id)) }));
      setPlayers(seeded);
      setGroups(built);
      setRounds([]);
      setStage("groups");
    } else if (selectedMode === "single") {
      if (!isPowerOfTwo(count) || count < 4 || count > 32) {
        alert("For Single-Elimination, player count must be a power of two (4, 8, 16, 32).");
        return;
      }
      const seeded = shuffle(names).map((name: string, i: number) => ({ id: uid(), name: name || `Player ${i+1}`, seed: i + 1 }));
      setPlayers(seeded);
      setGroups([]);
      const firstRound = buildSingleElimFirstRound(seeded.map((p:any)=>p.id));
      setRounds([firstRound]);
      setStage("knockout");
    } else {
      if (count < 4 || count > 32) {
        alert("For Round Robin, player count must be between 4 and 32.");
        return;
      }
      const seeded = shuffle(names).map((name: string, i: number) => ({ id: uid(), name: name || `Player ${i+1}`, seed: i + 1 }));
      const ids = seeded.map((p:any)=>p.id);
      const rrGroup = { name: 'RR', players: ids, matches: scheduleRoundRobinAllPairs(ids) };
      setPlayers(seeded);
      setGroups([rrGroup]);
      setRounds([]);
      setStage("roundrobin");
    }
  };

  const updateGroupMatch = (groupName: string, matchWithScores: any) => {
    setGroups((prev:any)=> prev.map((g:any)=> {
      if (g.name !== groupName) return g;
      const matches = g.matches.map((m:any)=> m.id === matchWithScores.id ? { ...matchWithScores, completed: true } : m);
      return { ...g, matches };
    }));
  };

  const advanceToKnockout = () => {
    const pairings = buildKnockout(groups, playersIndex);
    if (pairings.length === 0) { alert("No knockout pairings (complete all groups)"); return; }
    setRounds([pairings]);
    setStage("knockout");
  };

  const top4ToKnockout = () => {
    const rr = groups[0];
    if (!rr) return;
    const table = computeStandings(rr, playersIndex);
    const ids = table.slice(0,4).map((r:any)=>r.id);
    if (ids.length < 4) { alert('Need at least 4 players in standings.'); return; }
    const semis = [
      { id: uid(), a: ids[0], b: ids[3], first: pickFirst() },
      { id: uid(), a: ids[1], b: ids[2], first: pickFirst() },
    ];
    setRounds([semis]);
    setStage('knockout');
  };

  const submitKnockoutScore = (roundIndex: number, matchWithScores: any) => {
    setRounds((prev:any)=> {
      const next = prev.map((r:any[], i:number)=> i === roundIndex ? r.map((m:any)=> m.id === matchWithScores.id ? { ...matchWithScores, completed: true } : m) : r);
      if (next[roundIndex].every((m:any)=>m.completed)) {
        const winners = next[roundIndex].map((m:any)=> (m.scoreA > m.scoreB ? m.a : m.b));
        if (winners.length === 1) {
          setChampion(winners[0]);
          setStage("champion");
        } else {
          const nextRound:any[] = [];
          for (let i = 0; i < winners.length; i += 2) {
            nextRound.push({ id: uid(), a: winners[i], b: winners[i+1], first: pickFirst() });
          }
          (next as any).push(nextRound);
        }
      }
      return next;
    });
  };

  const header = (
    <div className="relative">
      <CornholeBackdrop />
      <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
        <div>
          <div className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-sm text-white text-center md:text-left">Jordy C BBQ Cup</div>
        </div>
        <div className="flex gap-2">
          {stage !== "setup" && <Button variant="secondary" onClick={()=> setStage("setup")}>Setup</Button>}
          {mode === "groups" && stage !== "setup" && <Button variant="secondary" onClick={()=> setStage("groups")}>Groups</Button>}
          {mode === "roundrobin" && stage !== "setup" && <Button variant="secondary" onClick={()=> setStage("roundrobin")}>Round Robin</Button>}
          {stage !== "setup" && mode !== 'roundrobin' && <Button variant="secondary" onClick={()=> setStage("knockout")}>Knockout</Button>}
          <Button variant="destructive" onClick={()=>resetAll()}>Reset</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-black">
      <div className="max-w-7xl mx-auto space-y-8">
        {header}
        {stage === "setup" && (<AnimatePresence mode="wait"><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><SetupForm onSetup={handleSetup} target={target} setTarget={setTarget} /></motion.div></AnimatePresence>)}
        {stage === "groups" && (players as any[]).length > 0 && mode === "groups" && (
          <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-8">
              <Card className="bg-white/80 border-4 border-black/30">
                <CardHeader><CardTitle className="text-2xl text-center">Group Stage</CardTitle></CardHeader>
                <CardContent className="space-y-4"><div className="text-sm opacity-80 text-center">Enter scores for each match. Winner must have exactly {target}, loser below {target}. No draws.</div></CardContent>
              </Card>
              <GroupStage groups={groups} playersIndex={playersIndex} onUpdateMatch={updateGroupMatch} onAdvance={advanceToKnockout} target={target} />
            </motion.div>
          </AnimatePresence>
        )}
        {stage === "roundrobin" && (players as any[]).length > 0 && mode === "roundrobin" && (
          <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-8">
              <RoundRobinStage group={(groups as any[])[0]} playersIndex={playersIndex} onUpdateMatch={updateGroupMatch} onTop4={() => {
                const rr = (groups as any[])[0];
                if (!rr) return;
                const table = computeStandings(rr, playersIndex);
                const ids = table.slice(0,4).map((r:any)=>r.id);
                if (ids.length < 4) { alert('Need at least 4 players in standings.'); return; }
                const semis = [
                  { id: uid(), a: ids[0], b: ids[3], first: pickFirst() },
                  { id: uid(), a: ids[1], b: ids[2], first: pickFirst() },
                ];
                setRounds([semis]);
                setStage('knockout');
              }} target={target} />
            </motion.div>
          </AnimatePresence>
        )}
        {stage === "knockout" && (rounds as any[]).length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-8">
              <Card className="bg-white/80 border-4 border-black/30">
                <CardHeader><CardTitle className="text-2xl text-center">Knockout Bracket</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-sm opacity-80 mb-4 text-center">Start a game to score live. Winners advance automatically.</div>
                  <KnockoutBracket rounds={rounds} playersIndex={playersIndex} onStartGame={(ri: number, m:any)=> setLive({ roundIndex: ri, match: m })} target={target} />
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
        {stage === "champion" && champion && (
          <AnimatePresence>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 relative">
              <ConfettiRain />
              <USABeanRain />
              <div className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow">🏆 {playersIndex[champion]?.name} is the champion!</div>
              {(() => { const { gold, silver, bronze } = getPodium(rounds, champion as string); return <Podium gold={gold} silver={silver} bronze={bronze} playersIndex={playersIndex} />; })()}
              <div className="flex justify-center gap-3">
                <Button onClick={()=> setStage("knockout")} variant="secondary">View Bracket</Button>
                <Button onClick={()=>{
                  setPlayers([]); setGroups([]); setRounds([]); setChampion(null); setStage("setup");
                  localStorage.clear();
                }} variant="destructive">Start New Tournament</Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
        {live && (
          <ScoreboardModal
            open={!!live}
            onClose={()=> setLive(null)}
            onSave={(a:number,b:number)=>{ const m = live.match; const updated = { ...m, scoreA:a, scoreB:b, completed:true }; 
              setRounds((prev:any)=> {
                const ri = live.roundIndex;
                const next = prev.map((r:any[], i:number)=> i === ri ? r.map((mm:any)=> mm.id === updated.id ? { ...updated, completed: true } : mm) : r);
                if (next[ri].every((mm:any)=>mm.completed)) {
                  const winners = next[ri].map((mm:any)=> (mm.scoreA > mm.scoreB ? mm.a : mm.b));
                  if (winners.length === 1) {
                    setChampion(winners[0]); setStage("champion");
                  } else {
                    const nextRound:any[] = [];
                    for (let i = 0; i < winners.length; i += 2) nextRound.push({ id: uid(), a: winners[i], b: winners[i+1], first: pickFirst() });
                    (next as any).push(nextRound);
                  }
                }
                return next;
              });
              setLive(null);
            }}
            target={target}
            aName={playersIndex[live.match.a]?.name}
            bName={playersIndex[live.match.b]?.name}
            initialA={live.match.scoreA || 0}
            initialB={live.match.scoreB || 0}
            startFirst={(live.match.first === 'a') ? 'A' : 'B'}
          />
        )}
      </div>
    </div>
  );
}
