import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcement.service';
import '../styles/NoticeCreate.css';

export default function NoticeCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: announcementService.createAnnouncement,
    onSuccess: () => {
      // Invalidate announcements list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      // Navigate back to notice list
      navigate('/notice');
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

  const handleCancel = () => {
    if (title || content) {
      if (window.confirm('작성 중인 내용이 있습니다. 취소하시겠습니까?')) {
        navigate('/notice');
      }
    } else {
      navigate('/notice');
    }
  };

  return (
    <div className="notice-create-page">
      <div className="notice-create-header">
        <h1 className="page-title">공지사항 작성</h1>
      </div>

      <form className="notice-create-form" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              제목 <span className="required">*</span>
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="공지사항 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
            <span className="char-count">{title.length}/100</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="content">
              내용 <span className="required">*</span>
            </label>
            <textarea
              id="content"
              className="form-textarea"
              placeholder="공지사항 내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              rows={15}
              required
            />
            <span className="char-count">{content.length}/5000</span>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={handleCancel}
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
  );
}
