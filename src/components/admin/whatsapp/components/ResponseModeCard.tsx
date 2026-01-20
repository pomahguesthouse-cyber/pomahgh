import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Settings, Bot, Hand } from 'lucide-react';
import type { WhatsAppMode } from '../types';

interface ResponseModeCardProps {
  mode: string | undefined;
  onModeChange: (mode: WhatsAppMode) => void;
  isUpdating: boolean;
}

export const ResponseModeCard = ({ mode, onModeChange, isUpdating }: ResponseModeCardProps) => {
  const currentMode = mode || 'ai';
  const isManual = currentMode === 'manual';

  return (
    <Card className={isManual ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Mode Balasan WhatsApp</CardTitle>
          </div>
          {isManual && (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <Hand className="w-3 h-3 mr-1" />
              Mode Manual Aktif
            </Badge>
          )}
        </div>
        <CardDescription>
          Pilih cara membalas pesan WhatsApp masuk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={currentMode} 
          onValueChange={(value) => onModeChange(value as WhatsAppMode)}
          disabled={isUpdating}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer flex-1">
            <RadioGroupItem value="ai" id="mode-ai" />
            <Label htmlFor="mode-ai" className="flex items-center gap-2 cursor-pointer flex-1">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">AI Chatbot (Otomatis)</p>
                <p className="text-xs text-muted-foreground">Semua pesan dijawab otomatis oleh AI</p>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer flex-1">
            <RadioGroupItem value="manual" id="mode-manual" />
            <Label htmlFor="mode-manual" className="flex items-center gap-2 cursor-pointer flex-1">
              <Hand className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium">Manual (Admin Reply)</p>
                <p className="text-xs text-muted-foreground">Semua pesan masuk ke admin untuk dijawab manual</p>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};












