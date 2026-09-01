export type LandingTeamMember = {
  /** 기수 표시에 사용합니다. 예: 1은 "1기"로 표시됩니다. */
  generation: number;
  /** 랜딩 페이지에 표시할 이름입니다. */
  name: string;
  /** 맡은 역할입니다. 예: Back-end, Design, iOS */
  role: string;
  /** true인 구성원은 부장 카드로 별도 노출됩니다. */
  isLeader?: boolean;
};

/**
 * 랜딩 페이지 팀 소개 데이터입니다.
 * 이름·역할·기수는 이 배열에서만 수정하거나 새 항목을 추가하면 됩니다.
 */
export const LANDING_TEAM_MEMBERS: LandingTeamMember[] = [
  { generation: 1, name: '부장 이름', role: 'Team Lead', isLeader: true },
  { generation: 1, name: '부원 이름', role: 'Back-end' },
  { generation: 1, name: '부원 이름', role: 'Front-end' },
  { generation: 1, name: '부원 이름', role: 'Design' },
];
