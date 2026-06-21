import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReviewStore } from '@/store/useReviewStore';
import { ImageViewer } from '@/components/business/ImageViewer';
import { PatientForm } from '@/components/business/PatientForm';
import { DropZone } from '@/components/business/DropZone';
import { ProgressSidebar } from '@/components/business/ProgressSidebar';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Toast } from '@/components/common/Toast';
import { formatDateTime } from '@/utils/date';
import { ArrowRight, Save, Plus, Trash2, FileImage, Info } from 'lucide-react';

export function ViewerPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { 
    currentDraft, 
    currentImageIndex, 
    isLoading, 
    loadDraft, 
    createNewDraft, 
    addImage,
    removeImage,
    saveCurrentDraft,
    toast,
    hideToast,
    showToast
  } = useReviewStore();

  const [showPatientForm, setShowPatientForm] = useState(true);

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    } else {
      createNewDraft();
    }
  }, [draftId, loadDraft, createNewDraft]);

  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      await addImage(file);
    }
  };

  const handleNext = () => {
    if (!currentDraft || currentDraft.images.length === 0) {
      showToast('请先添加图片', 'error');
      return;
    }
    if (!currentDraft.patientInfo.studyNo) {
      showToast('请填写检查号', 'error');
      return;
    }
    if (!currentDraft.patientInfo.name) {
      showToast('请填写患者姓名', 'error');
      return;
    }
    saveCurrentDraft();
    navigate(`/judgment/${currentDraft.id}`);
  };

  const handleSave = () => {
    saveCurrentDraft();
  };

  const handleRemoveImage = (imageId: string) => {
    if (confirm('确定要删除这张图片吗？')) {
      removeImage(imageId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-medical-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentDraft) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">未找到草稿</p>
      </div>
    );
  }

  const currentImage = currentDraft.images[currentImageIndex];

  return (
    <div className="space-y-6 relative pr-80">
      <ProgressSidebar draft={currentDraft} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-medical-800">图片查看</h2>
          <p className="text-gray-500 text-sm mt-1">
            创建时间：{formatDateTime(currentDraft.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowPatientForm(!showPatientForm)}>
            <Info size={16} className="mr-2" />
            {showPatientForm ? '隐藏' : '显示'}患者信息
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            <Save size={16} className="mr-2" />
            保存草稿
          </Button>
          <Button variant="primary" onClick={handleNext}>
            下一步：质量判定
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>

      {showPatientForm && (
        <Card title="患者信息" subtitle="请填写患者基本信息，检查号和姓名为必填项">
          <PatientForm />
        </Card>
      )}

      {currentDraft.images.length > 0 && currentImage ? (
        <div className="h-[600px]">
          <ImageViewer
            image={currentImage}
            imageIndex={currentImageIndex}
            totalImages={currentDraft.images.length}
          />
        </div>
      ) : (
        <DropZone onFilesSelected={handleFilesSelected} multiple={true} />
      )}

      {currentDraft.images.length > 0 && (
        <Card 
          title="图片列表" 
          subtitle={`共 ${currentDraft.images.length} 张图片，点击切换查看，点击右上角删除图片`}
          footer={
            <div className="flex justify-end">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFilesSelected(Array.from(e.target.files));
                    }
                  }}
                />
                <Button variant="outline" size="sm" as="span">
                  <Plus size={16} className="mr-2" />
                  添加更多图片
                </Button>
              </label>
            </div>
          }
        >
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {currentDraft.images.map((image, index) => (
              <div
                key={image.id}
                className={`relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${
                  index === currentImageIndex
                    ? 'border-medical-600 ring-2 ring-medical-200'
                    : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => currentDraft && currentImageIndex !== undefined &&
                  useReviewStore.getState().setCurrentImageIndex(index)
                }
              >
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  style={{ transform: `rotate(${image.rotation}deg)` }}
                />
                {image.marks.length > 0 && (
                  <div className="absolute top-1 left-1 bg-medical-600 text-white text-xs px-1.5 py-0.5 rounded">
                    {image.marks.length} 标记
                  </div>
                )}
                <button
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(image.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="操作提示">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <FileImage size={18} className="text-medical-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">移动工具：</span>
              拖拽移动图片，滚轮缩放
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileImage size={18} className="text-medical-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">放大镜：</span>
              鼠标悬停显示放大区域，可调节倍数
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0 mt-1"></div>
            <div>
              <span className="font-medium">污点标记：</span>
              点击图片添加红色圆形污点标记
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded bg-blue-500 flex-shrink-0 mt-1"></div>
            <div>
              <span className="font-medium">阴影标记：</span>
              点击图片添加蓝色方形阴影标记
            </div>
          </div>
        </div>
      </Card>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}
