import { useTrainerStore, type Persona, type Language, type Difficulty } from "@/stores/trainerStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";

const PERSONAS: { value: Persona; label: string }[] = [
  { value: "budget", label: "🎒 Budget Guest" },
  { value: "luxury", label: "💎 Luxury Guest" },
  { value: "foreign", label: "🌍 Foreign Guest" },
  { value: "difficult", label: "😤 Difficult Guest" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "id", label: "🇮🇩 Indonesian" },
  { value: "en", label: "🇬🇧 English" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "🟢 Easy" },
  { value: "medium", label: "🟡 Medium" },
  { value: "hard", label: "🔴 Hard" },
];

export function ScenarioSettings() {
  const { scenario, setScenario, isRunning } = useTrainerStore();

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Settings2 className="h-4 w-4 text-primary" />
        Scenario Settings
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Persona</Label>
          <Select value={scenario.persona} onValueChange={(v) => setScenario({ persona: v as Persona })} disabled={isRunning}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERSONAS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Language</Label>
          <Select value={scenario.language} onValueChange={(v) => setScenario({ language: v as Language })} disabled={isRunning}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Difficulty</Label>
          <Select value={scenario.difficulty} onValueChange={(v) => setScenario({ difficulty: v as Difficulty })} disabled={isRunning}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
