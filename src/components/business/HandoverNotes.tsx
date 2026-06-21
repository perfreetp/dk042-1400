import { useState } from 'react';
import { MessageSquare, Plus, Check, X, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useReviewStore } from '@/store/useReviewStore';
import type { HandoverNote } from '@/types';
import { formatDateTime } from '@/utils/date';

interface HandoverNotesProps {
  notes: HandoverNote[];
  draftId: string;
}

export function HandoverNotes({ notes }: HandoverNotesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addHandoverNote = useReviewStore(state => state.addHandoverNote);
  const confirmHandoverNote = useReviewStore(state => state.confirmHandoverNote);
  const removeHandoverNote = useReviewStore(state => state.removeHandoverNote);
  const showToast = useReviewStore(state => state.showToast);

  const pendingCount = notes.filter(n => n.isPending).length;
  const confirmedCount = notes.filter(n => !n.isPending).length;

  const handleAddNote = () => {
    if (!newNote.trim()) {
      showToast('请输入备注内容', 'error');
      return;
    }
    if (!authorName.trim()) {
      showToast('请填写您的姓名', 'error');
      return;
    }

    addHandoverNote(newNote.trim(), authorName.trim(), true);
    setNewNote('');
    setAuthorName('');
    setIsAdding(false);
    showToast('备注已添加', 'success');
  };

  const handleConfirm = (noteId: string, confirmerName: string) => {
    if (!confirmerName.trim()) {
      showToast('请填写确认人姓名', 'error');
      return;
    }
    confirmHandoverNote(noteId, confirmerName.trim());
    showToast('已确认', 'success');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div
        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 flex items-center justify-between cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <MessageSquare size={20} />
          <div>
            <div className="font-semibold">交接备注</div>
            <div className="text-xs text-white/80">
              {notes.length} 条 · {pendingCount} 条待确认 · {confirmedCount} 条已确认
            </div>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
            {pendingCount}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {notes.length === 0 && !isAdding && (
            <div className="text-center text-gray-400 py-6">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <div className="text-sm">暂无交接备注</div>
            </div>
          )}

          {notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                'rounded-lg p-3 border transition-all',
                note.isPending
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-green-50 border-green-200'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs">
                  <User size={12} className="text-gray-500" />
                  <span className="font-medium text-gray-700">{note.authorName}</span>
                  <span className="text-gray-400 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {note.isPending ? (
                    <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} />
                      待确认
                    </span>
                  ) : (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={10} />
                      已确认
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{note.content}</p>

              {note.isPending && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200">
                  <Input
                    type="text"
                    placeholder="请输入您的姓名确认..."
                    className="flex-1 text-xs py-1.5 h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        handleConfirm(note.id, input.value);
                        input.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="success"
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = (e.currentTarget as HTMLElement).parentElement?.querySelector('input');
                      if (input) {
                        handleConfirm(note.id, input.value);
                        input.value = '';
                      }
                    }}
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHandoverNote(note.id);
                    }}
                  >
                    <X size={14} />
                  </Button>
                </div>
              )}

              {!note.isPending && note.confirmedByName && (
                <div className="text-xs text-green-700 mt-2 pt-2 border-t border-green-200 flex items-center gap-1">
                  <Check size={12} />
                  {note.confirmedByName} 于 {formatDateTime(note.confirmedAt!)} 确认
                </div>
              )}
            </div>
          ))}

          {isAdding ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
              <div className="text-sm font-medium text-blue-700">添加新备注</div>
              <Input
                type="text"
                placeholder="您的姓名"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="text-sm"
              />
              <textarea
                placeholder="请输入备注内容，如：待确认第2张图像左上阴影..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-20"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewNote('');
                    setAuthorName('');
                  }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAddNote}
                >
                  添加备注
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-center gap-2 text-gray-600 hover:text-blue-600 hover:border-blue-300"
              onClick={() => setIsAdding(true)}
            >
              <Plus size={16} />
              添加交接备注
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
