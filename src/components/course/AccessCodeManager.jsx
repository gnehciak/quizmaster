import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AccessCodeManager({ open, onOpenChange, accessCodes = [], onUpdate }) {
  const [codes, setCodes] = useState(accessCodes);
  const [newClassName, setNewClassName] = useState('');
  const [codeQuantity, setCodeQuantity] = useState(1);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) {
      toast.error('Please enter a class name');
      return;
    }

    if (codeQuantity < 1 || codeQuantity > 100) {
      toast.error('Please enter a quantity between 1 and 100');
      return;
    }

    // Generate multiple unique codes for this class
    const newCodes = [];
    for (let i = 0; i < codeQuantity; i++) {
      newCodes.push({
        code: generateCode(),
        class_name: newClassName.trim()
      });
    }

    setCodes([...codes, ...newCodes]);
    setNewClassName('');
    setCodeQuantity(1);
    toast.success(`${codeQuantity} access code${codeQuantity > 1 ? 's' : ''} created for ${newClassName.trim()}`);
  };

  const handleRemoveClass = (index) => {
    if (!confirm('Remove this class and its access code?')) return;
    const updated = codes.filter((_, i) => i !== index);
    setCodes(updated);
    toast.success('Class removed');
  };

  const handleRegenerateCode = (index) => {
    if (!confirm('Regenerate access code? This will invalidate the old code.')) return;
    const updated = [...codes];
    updated[index] = { ...updated[index], code: generateCode() };
    setCodes(updated);
    toast.success('Access code regenerated');
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleSave = () => {
    onUpdate(codes);
    onOpenChange(false);
    toast.success('Access codes updated successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Access Codes & Classes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Add New Class */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <Label className="mb-2 block">Add New Class</Label>
            <div className="space-y-3">
              <Input
                placeholder="Class name (e.g., Spring 2024, Class A)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) {
                    e.preventDefault();
                    handleAddClass();
                  }
                }}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-slate-600 mb-1 block">Number of Codes</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Quantity"
                    value={codeQuantity}
                    onChange={(e) => setCodeQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button onClick={handleAddClass} className="gap-2 mt-5">
                  <Plus className="w-4 h-4" />
                  Generate Codes
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                💡 Each code can only be used once and will be removed after redemption
              </p>
            </div>
          </div>

          {/* Existing Classes */}
          <div className="space-y-3">
            {codes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 border border-dashed rounded-lg">
                No access codes yet. Generate codes for a class above.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-2">
                  <p className="text-sm font-medium text-slate-700">
                    {codes.length} Active Code{codes.length !== 1 ? 's' : ''}
                  </p>
                  {(() => {
                    const classGroups = codes.reduce((acc, code) => {
                      acc[code.class_name] = (acc[code.class_name] || 0) + 1;
                      return acc;
                    }, {});
                    const classCount = Object.keys(classGroups).length;
                    return (
                      <p className="text-xs text-slate-500">
                        {classCount} class{classCount !== 1 ? 'es' : ''}
                      </p>
                    );
                  })()}
                </div>
                {codes.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 mb-1">
                        {item.class_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold text-indigo-600 tracking-wider">
                          {item.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-indigo-600"
                          onClick={() => handleCopyCode(item.code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => handleRegenerateCode(index)}
                        title="Regenerate this code"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveClass(index)}
                        title="Delete this code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}