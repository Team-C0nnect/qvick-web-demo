import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { announcementService } from "../services/announcement.service";
import { aiService } from "../services/ai.service";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../styles/NoticeCreateModal.css";

interface NoticeEditModalProps {
  isOpen: boolean;
  noticeId: number;
  onClose: () => void;
}

export default function NoticeEditModal({
  isOpen,
  noticeId,
  onClose,
}: NoticeEditModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  // 공지사항 데이터 가져오기
  const { data: announcement } = useQuery({
    queryKey: ['announcement', noticeId],
    queryFn: () => announcementService.getAnnouncement(noticeId),
    enabled: isOpen && !!noticeId,
  });

  // 데이터가 로드되면 폼에 채우기
  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setContent(announcement.content);
    }
  }, [announcement]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { title: string, content: string } }) => 
      announcementService.updateAnnouncement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", noticeId] });
      setTitle("");
      setContent("");
      setError("");
      setIsPreview(false);
      onClose();
    },
    onError: (error: Error) => {
      console.error("Update announcement error:", error);
      setError("공지사항 수정에 실패했습니다. 다시 시도해주세요.");
    },
  });

  const refineMutation = useMutation({
    mutationFn: aiService.refineAnnouncement,
    onSuccess: (refinedContent) => {
      setContent(refinedContent);
      setError("");
      setIsPreview(true);
    },
    onError: (error: Error) => {
      console.error("Refine announcement error:", error);
      setError("글 다듬기에 실패했습니다. 다시 시도해주세요.");
    },
  });

  const handleRefine = () => {
    if (!content.trim()) {
      setError("다듬을 내용을 먼저 입력해주세요.");
      return;
    }
    setError("");
    refineMutation.mutate(content);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    setError("");
    updateMutation.mutate({
      id: noticeId,
      data: {
        title: title.trim(),
        content: content.trim(),
      }
    });
  };

  const handleClose = () => {
    if (announcement && (title !== announcement.title || content !== announcement.content)) {
      if (window.confirm("수정 중인 내용이 있습니다. 취소하시겠습니까?")) {
        setTitle("");
        setContent("");
        setError("");
        setIsPreview(false);
        onClose();
      }
    } else {
      setTitle("");
      setContent("");
      setError("");
      setIsPreview(false);
      onClose();
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.setAttribute("data-backdrop-mousedown", "true");
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget &&
      e.currentTarget.getAttribute("data-backdrop-mousedown") === "true"
    ) {
      handleClose();
    }
    e.currentTarget.removeAttribute("data-backdrop-mousedown");
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">공지사항 수정</h2>
          <button
            className="modal-close-button"
            onClick={handleClose}
            disabled={updateMutation.isPending || refineMutation.isPending}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="notice-title">
              제목 <span className="required">*</span>
            </label>
            <input
              id="notice-title"
              type="text"
              className="form-input"
              placeholder="공지사항 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              autoFocus
              required
            />
            <div className="char-count">{title.length}/100</div>
          </div>

          <div className="form-group content-group">
            <div className="content-header">
              <label className="form-label" htmlFor="notice-content">
                내용 <span className="required">*</span>
              </label>
              <div className="content-actions">
                <button
                  type="button"
                  className="refine-button"
                  onClick={handleRefine}
                  disabled={!content.trim() || refineMutation.isPending}
                >
                  {refineMutation.isPending ? "다듬는 중..." : "✨ 글 다듬기"}
                </button>
                <button
                  type="button"
                  className={`preview-button ${isPreview ? "active" : ""}`}
                  onClick={() => setIsPreview(!isPreview)}
                >
                  {isPreview ? "편집" : "미리보기"}
                </button>
              </div>
            </div>

            {isPreview ? (
              <div className="preview-container">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                id="notice-content"
                className="form-textarea"
                placeholder="공지사항 내용을 입력하세요 (마크다운 지원)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                maxLength={5000}
                required
              />
            )}

            <div className="input-footer">
              {error && <span className="error-text">{error}</span>}
              <span className="char-count">{content.length}/5000</span>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={updateMutation.isPending || refineMutation.isPending}
            >
              취소
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={updateMutation.isPending || refineMutation.isPending}
            >
              {updateMutation.isPending ? "수정 중..." : "수정"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
