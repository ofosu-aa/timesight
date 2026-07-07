"use client";
import React, { useState } from "react";
import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { Routine, TimeSession } from "@/lib/types";
import { predictFor } from "@/lib/predictions";
import { uid } from "@/lib/time";
import { Btn, Field, inputCls, Modal } from "./ui";

export function RoutineForm({ routine, sessions, onSave, onClose }: {
  routine: Routine | null; sessions: TimeSession[];
  onSave: (r: { id?: string; name: string; description: string; tasks: Routine["tasks"] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(routine?.name || "");
  const [description, setDescription] = useState(routine?.description || "");
  const [steps, setSteps] = useState(routine?.tasks?.map((t) => ({ ...t })) || []);
  const [newStep, setNewStep] = useState("");
  const [newMin, setNewMin] = useState("");

  const addStep = () => {
    if (!newStep.trim()) return;
    const pred = predictFor(newStep, sessions);
    setSteps((s) => [...s, { id: uid(), title: newStep.trim(), estimatedMinutes: +newMin || pred?.predictedMinutes || 10, category: "", order: s.length, notes: "" }]);
    setNewStep(""); setNewMin("");
  };
  const move = (i: number, dir: number) => setSteps((s) => {
    const n = [...s]; const j = i + dir;
    if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j], n[i]];
    return n.map((x, idx) => ({ ...x, order: idx }));
  });

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xl font-bold text-ink">{routine ? "Edit routine" : "New routine"}</p>
        <button onClick={onClose} className="p-1.5 text-faint"><X size={20} /></button>
      </div>
      <div className="space-y-4">
        <Field label="Routine name">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning Routine" className={inputCls} />
        </Field>
        <Field label="Description (optional)">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Weekday startup" className={inputCls} />
        </Field>
        <Field label="Steps (in order)">
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-raised">
                <span className="text-xs tabular-nums w-4 text-faint">{i + 1}</span>
                <span className="flex-1 text-sm font-medium truncate text-ink">{s.title}</span>
                <input value={s.estimatedMinutes}
                  onChange={(e) => setSteps((all) => all.map((x) => x.id === s.id ? { ...x, estimatedMinutes: +e.target.value.replace(/\D/g, "") || 1 } : x))}
                  className="w-12 text-center text-sm rounded-lg py-1 tabular-nums outline-none border border-line bg-surface text-ink" />
                <span className="text-xs text-faint">min</span>
                <button onClick={() => move(i, -1)} className="text-faint"><ChevronUp size={16} /></button>
                <button onClick={() => move(i, 1)} className="text-faint"><ChevronDown size={16} /></button>
                <button onClick={() => setSteps((all) => all.filter((x) => x.id !== s.id))} className="text-faint"><X size={16} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStep()}
                placeholder="Add a step…" className={inputCls} />
              <input value={newMin} onChange={(e) => setNewMin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && addStep()}
                placeholder="min" inputMode="numeric" className={`${inputCls} !w-20 text-center tabular-nums`} />
              <Btn variant="subtle" onClick={addStep} className="!px-4"><Plus size={18} /></Btn>
            </div>
          </div>
        </Field>
        <Btn className="w-full" disabled={!name.trim() || steps.length === 0}
          onClick={() => onSave({ id: routine?.id, name: name.trim(), description, tasks: steps })}>
          {routine ? "Save changes" : "Create routine"}
        </Btn>
      </div>
    </Modal>
  );
}
