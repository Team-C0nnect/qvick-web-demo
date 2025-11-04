import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcement.service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/NoticeCreateModal.css';

interface NoticeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NoticeCreateModal({ isOpen, onClose }: NoticeCreateModalProps) {
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  const createMutation = useMutation({
    mutationFn: announcementService.createAnnouncement,
    onSuccess: () => {
      // Invalidate announcements list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      // Reset form and close modal
      setTitle('');
      setContent('');
      setError('');
      setIsPreview(false);
      onClose();
    },
    onError: (error: Error) => {
      console.error('Create announcement error:', error);
      setError('공지사항 작성에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    setError('');
    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
    });
  };

  const handleClose = () => {
    if (title || content) {
      if (window.confirm('작성 중인 내용이 있습니다. 취소하시겠습니까?')) {
        setTitle('');
        setContent('');
        setError('');
        setIsPreview(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">공지사항 작성</h2>
          <button
            className="modal-close-button"
            onClick={handleClose}
            disabled={createMutation.isPending}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="modal-title">
              제목 <span className="required">*</span>
            </label>
            <input
              id="modal-title"
              type="text"
              className="form-input"
              placeholder="공지사항 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              autoFocus
              required
            />
            <span className="char-count">{title.length}/100</span>
          </div>

          <div className="form-group">
            <div className="content-header">
              <label className="form-label" htmlFor="modal-content">
                내용 <span className="required">*</span>
              </label>
              <div className="editor-tabs">
                <button
                  type="button"
                  className={`tab-button ${!isPreview ? 'active' : ''}`}
                  onClick={() => setIsPreview(false)}
                >
                  작성
                </button>
                <button
                  type="button"
                  className={`tab-button ${isPreview ? 'active' : ''}`}
                  onClick={() => setIsPreview(true)}
                >
                  미리보기
                </button>
              </div>
            </div>
            
            {!isPreview ? (
              <>
                <textarea
                  id="modal-content"
                  className="form-textarea"
                  placeholder="마크다운 형식으로 공지사항 내용을 입력하세요&#10;&#10;**굵게**, *기울임*, [링크](URL), # 제목 등을 사용할 수 있습니다"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={5000}
                  rows={12}
                  required
                />
                <span className="char-count">{content.length}/5000</span>
              </>
            ) : (
              <div className="markdown-preview">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="preview-empty">미리보기할 내용이 없습니다</p>
                )}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              취소
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '작성 중...' : '작성 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
