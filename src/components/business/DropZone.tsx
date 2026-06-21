import { useState, useRef, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
}

export function DropZone({
  onFilesSelected,
  multiple = false,
  accept = 'image/*',
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(multiple ? files : [files[0]]);
      }
    },
    [onFilesSelected, multiple]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected(multiple ? files : [files[0]]);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFilesSelected, multiple]
  );

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-12 rounded-xl cursor-pointer transition-all duration-300 min-h-64',
        isDragging
          ? 'border-2 border-blue-500 bg-blue-100'
          : 'border-2 border-dashed border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100/50'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
      />

      <UploadCloud
        className={cn(
          'w-16 h-16 mb-4 transition-colors duration-300',
          isDragging ? 'text-blue-600' : 'text-blue-400'
        )}
      />

      <p
        className={cn(
          'text-lg font-semibold mb-2 transition-colors duration-300',
          isDragging ? 'text-blue-700' : 'text-gray-700'
        )}
      >
        拖入胶片图片
      </p>

      <p className="text-sm text-gray-500">或点击选择文件</p>

      {accept && accept !== 'image/*' && (
        <p className="text-xs text-gray-400 mt-2">支持格式：{accept}</p>
      )}
    </div>
  );
}
