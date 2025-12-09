import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Inquiry, InquiryType, InquiryStatus, InquiryPriority } from '../types/inquiry';
import { INQUIRY_TYPE_CONFIG, INQUIRY_STATUS_CONFIG, INQUIRY_PRIORITY_CONFIG } from '../types/inquiry';
import { apiClient } from '../lib/api-client';
import type { MyUserResponse } from '../types/api';
import '../styles/InquiryAdmin.css';

// API 호출 함수
const fetchInquiries = async (): Promise<Inquiry[]> => {
  const response = await fetch('/api/getInquiries');
  if (!response.ok) throw new Error('문의 목록을 불러오는데 실패했습니다.');
  return response.json();
};

const updateInquiry = async ({ id, data }: { id: string; data: any }) => {
  const response = await fetch(`/api/updateInquiry?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('문의 업데이트에 실패했습니다.');
  return response.json();
};

const deleteInquiry = async (id: string) => {
  const response = await fetch(`/api/deleteInquiry?id=${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('문의 삭제에 실패했습니다.');
  return response.json();
};

export default function InquiryAdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // 사용자 권한 확인
  const { data: user, isLoading: userLoading } = useQuery<MyUserResponse>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<MyUserResponse>('/users/my');
      return response.data;
    },
  });
  
  const isAdmin = user?.roles?.includes('ADMIN');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [filterType, setFilterType] = useState<InquiryType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | 'all'>('all');
  const [adminNote, setAdminNote] = useState('');

  const { data: inquiries = [], isLoading, error } = useQuery({
    queryKey: ['inquiries'],
    queryFn: fetchInquiries,
    enabled: isAdmin, // 관리자만 데이터 조회
  });

  const updateMutation = useMutation({
    mutationFn: updateInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      setSelectedInquiry(null);
    },
  });

  useEffect(() => {
    if (selectedInquiry) {
      setAdminNote(selectedInquiry.adminNote || '');
    }
  }, [selectedInquiry]);

  // 관리자가 아니면 리다이렉트
  useEffect(() => {
    if (!userLoading && !isAdmin) {
      navigate('/');
    }
  }, [userLoading, isAdmin, navigate]);

  // 로딩 중이거나 권한 없음
  if (userLoading) {
    return <div className="inquiry-admin-loading">로딩 중...</div>;
  }

  if (!isAdmin) {
    return null; // 리다이렉트 처리됨
  }

  // 필터링
  const filteredInquiries = inquiries.filter((inquiry) => {
    if (filterType !== 'all' && inquiry.type !== filterType) return false;
    if (filterStatus !== 'all' && inquiry.status !== filterStatus) return false;
    return true;
  });

  // 통계
  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'pending').length,
    inProgress: inquiries.filter(i => i.status === 'in-progress').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
  };

  const handleStatusChange = (status: InquiryStatus) => {
    if (!selectedInquiry) return;
    updateMutation.mutate({ id: selectedInquiry.id, data: { status } });
    setSelectedInquiry({ ...selectedInquiry, status });
  };

  const handlePriorityChange = (priority: InquiryPriority) => {
    if (!selectedInquiry) return;
    updateMutation.mutate({ id: selectedInquiry.id, data: { priority } });
    setSelectedInquiry({ ...selectedInquiry, priority });
  };

  const handleSaveNote = () => {
    if (!selectedInquiry) return;
    updateMutation.mutate({ id: selectedInquiry.id, data: { adminNote } });
    setSelectedInquiry({ ...selectedInquiry, adminNote });
  };

  const handleDelete = () => {
    if (!selectedInquiry) return;
    if (window.confirm('정말 이 문의를 삭제하시겠습니까?')) {
      deleteMutation.mutate(selectedInquiry.id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="inquiry-admin-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>문의 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inquiry-admin-page">
        <div className="error-state">
          <p>문의 목록을 불러오는데 실패했습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inquiry-admin-page">
      {/* 헤더 */}
      <div className="inquiry-admin-header">
        <h1>문의 관리</h1>
        <p>사용자 문의를 확인하고 처리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">전체 문의</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">대기중</span>
        </div>
        <div className="stat-card in-progress">
          <span className="stat-value">{stats.inProgress}</span>
          <span className="stat-label">처리중</span>
        </div>
        <div className="stat-card resolved">
          <span className="stat-value">{stats.resolved}</span>
          <span className="stat-label">해결됨</span>
        </div>
      </div>

      <div className="inquiry-admin-layout">
        {/* 목록 패널 */}
        <div className="inquiry-list-panel">
          <div className="list-header">
            <h2>문의 목록</h2>
            <div className="list-filters">
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as InquiryType | 'all')}
              >
                <option value="all">전체 유형</option>
                <option value="bug">오류 제보</option>
                <option value="feature">기능 제안</option>
                <option value="other">기타 문의</option>
              </select>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value as InquiryStatus | 'all')}
              >
                <option value="all">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="in-progress">처리중</option>
                <option value="resolved">해결됨</option>
                <option value="closed">종료</option>
              </select>
            </div>
          </div>

          <div className="inquiry-list">
            {filteredInquiries.length === 0 ? (
              <div className="empty-list">
                <p>문의가 없습니다.</p>
              </div>
            ) : (
              filteredInquiries.map((inquiry) => (
                <button
                  key={inquiry.id}
                  className={`inquiry-item ${selectedInquiry?.id === inquiry.id ? 'active' : ''}`}
                  onClick={() => setSelectedInquiry(inquiry)}
                >
                  <div className="inquiry-item-header">
                    <span 
                      className="type-badge"
                      style={{ 
                        color: INQUIRY_TYPE_CONFIG[inquiry.type].color,
                        backgroundColor: INQUIRY_TYPE_CONFIG[inquiry.type].bgColor,
                      }}
                    >
                      {INQUIRY_TYPE_CONFIG[inquiry.type].label}
                    </span>
                    <span 
                      className="status-badge"
                      style={{ 
                        color: INQUIRY_STATUS_CONFIG[inquiry.status].color,
                        backgroundColor: INQUIRY_STATUS_CONFIG[inquiry.status].bgColor,
                      }}
                    >
                      {INQUIRY_STATUS_CONFIG[inquiry.status].label}
                    </span>
                  </div>
                  <h4 className="inquiry-item-title">{inquiry.title}</h4>
                  <div className="inquiry-item-meta">
                    <span>{inquiry.studentId} {inquiry.name}</span>
                    <span>{formatDate(inquiry.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 상세 패널 */}
        <div className="inquiry-detail-panel">
          {selectedInquiry ? (
            <>
              <div className="detail-header">
                <div className="detail-badges">
                  <span 
                    className="type-badge"
                    style={{ 
                      color: INQUIRY_TYPE_CONFIG[selectedInquiry.type].color,
                      backgroundColor: INQUIRY_TYPE_CONFIG[selectedInquiry.type].bgColor,
                    }}
                  >
                    {INQUIRY_TYPE_CONFIG[selectedInquiry.type].label}
                  </span>
                  <span 
                    className="priority-badge"
                    style={{ 
                      color: INQUIRY_PRIORITY_CONFIG[selectedInquiry.priority].color,
                      backgroundColor: INQUIRY_PRIORITY_CONFIG[selectedInquiry.priority].bgColor,
                    }}
                  >
                    {INQUIRY_PRIORITY_CONFIG[selectedInquiry.priority].label}
                  </span>
                </div>
                <h2>{selectedInquiry.title}</h2>
                <div className="detail-meta">
                  <span><strong>작성자:</strong> {selectedInquiry.studentId} {selectedInquiry.name}</span>
                  {selectedInquiry.email && <span><strong>이메일:</strong> {selectedInquiry.email}</span>}
                  <span><strong>접수일:</strong> {formatDate(selectedInquiry.createdAt)}</span>
                </div>
              </div>

              <div className="detail-content">
                <section>
                  <h3>문의 내용</h3>
                  <p className="description">{selectedInquiry.description}</p>
                </section>

                {/* 오류 제보 상세 정보 */}
                {selectedInquiry.type === 'bug' && (
                  <section>
                    <h3>오류 상세 정보</h3>
                    {selectedInquiry.errorPage && (
                      <div className="info-row">
                        <strong>발생 페이지:</strong> {selectedInquiry.errorPage}
                      </div>
                    )}
                    {selectedInquiry.errorTime && (
                      <div className="info-row">
                        <strong>발생 시간:</strong> {formatDate(selectedInquiry.errorTime)}
                      </div>
                    )}
                    {selectedInquiry.reproductionSteps && (
                      <div className="info-block">
                        <strong>재현 방법:</strong>
                        <pre>{selectedInquiry.reproductionSteps}</pre>
                      </div>
                    )}
                    {selectedInquiry.expectedBehavior && (
                      <div className="info-block">
                        <strong>예상 동작:</strong>
                        <p>{selectedInquiry.expectedBehavior}</p>
                      </div>
                    )}
                    {selectedInquiry.actualBehavior && (
                      <div className="info-block">
                        <strong>실제 동작:</strong>
                        <p>{selectedInquiry.actualBehavior}</p>
                      </div>
                    )}
                    {selectedInquiry.deviceInfo && (
                      <div className="device-info">
                        <strong>기기 정보:</strong>
                        <ul>
                          <li><strong>플랫폼:</strong> {selectedInquiry.deviceInfo.platform}</li>
                          <li><strong>화면:</strong> {selectedInquiry.deviceInfo.screenWidth} x {selectedInquiry.deviceInfo.screenHeight}</li>
                          <li><strong>언어:</strong> {selectedInquiry.deviceInfo.language}</li>
                          <li><strong>시간대:</strong> {selectedInquiry.deviceInfo.timezone}</li>
                          <li><strong>User Agent:</strong> <code>{selectedInquiry.deviceInfo.userAgent}</code></li>
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {/* 기능 제안 상세 정보 */}
                {selectedInquiry.type === 'feature' && (
                  <section>
                    <h3>기능 제안 상세</h3>
                    {selectedInquiry.featureCategory && (
                      <div className="info-row">
                        <strong>카테고리:</strong> {selectedInquiry.featureCategory}
                      </div>
                    )}
                    {selectedInquiry.featureBenefit && (
                      <div className="info-block">
                        <strong>기대 효과:</strong>
                        <p>{selectedInquiry.featureBenefit}</p>
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* 관리자 액션 */}
              <div className="detail-actions">
                <section>
                  <h3>상태 변경</h3>
                  <div className="status-buttons">
                    {(['pending', 'in-progress', 'resolved', 'closed'] as InquiryStatus[]).map((status) => (
                      <button
                        key={status}
                        className={`status-btn ${selectedInquiry.status === status ? 'active' : ''}`}
                        style={{ 
                          '--btn-color': INQUIRY_STATUS_CONFIG[status].color,
                          '--btn-bg': INQUIRY_STATUS_CONFIG[status].bgColor,
                        } as React.CSSProperties}
                        onClick={() => handleStatusChange(status)}
                      >
                        {INQUIRY_STATUS_CONFIG[status].label}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>우선순위</h3>
                  <div className="priority-buttons">
                    {(['low', 'medium', 'high', 'critical'] as InquiryPriority[]).map((priority) => (
                      <button
                        key={priority}
                        className={`priority-btn ${selectedInquiry.priority === priority ? 'active' : ''}`}
                        style={{ 
                          '--btn-color': INQUIRY_PRIORITY_CONFIG[priority].color,
                          '--btn-bg': INQUIRY_PRIORITY_CONFIG[priority].bgColor,
                        } as React.CSSProperties}
                        onClick={() => handlePriorityChange(priority)}
                      >
                        {INQUIRY_PRIORITY_CONFIG[priority].label}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>관리자 메모</h3>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="처리 내용이나 메모를 입력하세요..."
                    rows={3}
                  />
                  <button className="save-note-btn" onClick={handleSaveNote}>
                    메모 저장
                  </button>
                </section>

                <div className="danger-zone">
                  <button className="delete-btn" onClick={handleDelete}>
                    문의 삭제
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>문의를 선택하면 상세 내용을 확인할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
