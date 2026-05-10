import * as XLSX from 'xlsx-js-style';

// 병합된 출석 데이터 인터페이스
export interface MergedAttendanceMember {
  room: string; // 방 번호 (예: "510")
  stdId: string; // 학번 (예: "3417")
  name: string; // 이름
  checked: boolean; // 출석 여부 (신버전 OR 구버전 중 하나라도 출석이면 true)
  checkedDate: string; // 출석 시간 (HH:MM 형식)
  isSleepover: boolean; // 외박 여부
  isLate?: boolean; // 지연출석 여부
}

// xlsx-js-style Border 타입
interface Border {
  style: string;
  color: { rgb: string };
}

// 층별 방 설정
const FLOOR_CONFIG = {
  floors: [
    { floor: 2, start: 1, end: 18 }, // 2층(여기숙사): 01~18호
    { floor: 3, start: 1, end: 15 }, // 3층: 01~15호
    { floor: 4, start: 1, end: 15 }, // 4층: 01~15호
    { floor: 5, start: 1, end: 15 }, // 5층: 01~15호
  ],

  // 페이지 그룹 (시작호실-끝호실)
  pageGroups: [
    {
      floor: 2,
      groups: [
        { start: 1, end: 6 },
        { start: 7, end: 12 },
        { start: 13, end: 18 },
      ],
    },
    {
      floor: 3,
      groups: [
        { start: 1, end: 8 },
        { start: 9, end: 15 },
      ],
    },
    {
      floor: 4,
      groups: [
        { start: 1, end: 9 },
        { start: 10, end: 15 },
      ],
    },
    {
      floor: 5,
      groups: [
        { start: 1, end: 9 },
        { start: 10, end: 15 },
      ],
    },
  ],

  formatRoomNumber: (floor: number, room: number): string => {
    return `${floor}${room.toString().padStart(2, '0')}`;
  },
};

// 페이지 그룹 인터페이스
interface PageGroup {
  name: string;
  rooms: string[];
}

// 스타일 상수
const FILL_COLOR_GRAY = { fgColor: { rgb: 'D9D9D9' } };
const BORDER_THIN: Border = { style: 'thin', color: { rgb: '000000' } };
const BORDER_THICK: Border = { style: 'medium', color: { rgb: '000000' } };
const COL_WIDTHS = [8, 15, 15, 15, 27];
const FONT_SIZES = {
  title: 20,
  header: 12,
  dataA: 12,
  dataOther: 12,
  noteHeader: 12,
  note: 10,
};
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_ROWS_PER_PAGE = 44;

/**
 * 병합된 출석 데이터를 엑셀로 내보내기
 */
export const exportMergedAttendanceToExcel = (
  data: MergedAttendanceMember[],
  gender?: '남' | '여' | null,
  onlyAbsent: boolean = false,
) => {
  const workbook = XLSX.utils.book_new();

  if (onlyAbsent) {
    // 미출석만인 경우 간단한 레이아웃
    const worksheet = createAbsentOnlyWorksheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, '미출석자');
  } else {
    // 전체인 경우 기존 레이아웃
    const floors =
      gender === '여' ? [2] : gender === '남' ? [3, 4, 5] : undefined;
    const roomOrder = generateRoomOrder(floors);
    const roomMap = groupMembersByRoom(data, roomOrder);
    const pageGroups = definePageGroups(roomOrder, floors);

    pageGroups.forEach((group) => {
      const worksheet = createWorksheet(group, roomMap);
      XLSX.utils.book_append_sheet(workbook, worksheet, group.name);
    });
  }

  // 현재 날짜로 파일명 생성
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const genderLabel = gender === '남' ? '_남' : gender === '여' ? '_여' : '';
  const absenceLabel = onlyAbsent ? '_미출석만' : '';
  XLSX.writeFile(
    workbook,
    `기숙사_출석부_${dateStr}${genderLabel}${absenceLabel}.xlsx`,
  );
};

/**
 * 방 번호 순서 생성
 */
function generateRoomOrder(floors?: number[]): string[] {
  const roomOrder: string[] = [];
  FLOOR_CONFIG.floors
    .filter((f) => !floors || floors.includes(f.floor))
    .forEach((floorInfo) => {
      for (let i = floorInfo.start; i <= floorInfo.end; i++) {
        roomOrder.push(FLOOR_CONFIG.formatRoomNumber(floorInfo.floor, i));
      }
    });
  return roomOrder;
}

/**
 * 구성원을 방 번호별로 그룹화
 */
function groupMembersByRoom(
  data: MergedAttendanceMember[],
  roomOrder: string[],
): Record<string, MergedAttendanceMember[]> {
  const sortedData = [...data].sort((a, b) => {
    const roomDiff = roomOrder.indexOf(a.room) - roomOrder.indexOf(b.room);
    if (roomDiff !== 0) return roomDiff;
    return a.stdId.localeCompare(b.stdId);
  });

  const roomMap: Record<string, MergedAttendanceMember[]> = {};
  sortedData.forEach((member) => {
    if (!roomMap[member.room]) roomMap[member.room] = [];
    roomMap[member.room].push(member);
  });

  return roomMap;
}

/**
 * 페이지 그룹 정의
 */
function definePageGroups(roomOrder: string[], floors?: number[]): PageGroup[] {
  const pageGroups: PageGroup[] = [];

  FLOOR_CONFIG.pageGroups
    .filter((fg) => !floors || floors.includes(fg.floor))
    .forEach((floorGroup) => {
      floorGroup.groups.forEach((group) => {
        const startRoom = FLOOR_CONFIG.formatRoomNumber(
          floorGroup.floor,
          group.start,
        );
        const endRoom = FLOOR_CONFIG.formatRoomNumber(
          floorGroup.floor,
          group.end,
        );
        const groupName = `${startRoom}-${endRoom}`;

        const startRoomNum = Number(startRoom);
        const endRoomNum = Number(endRoom);

        const rooms = roomOrder.filter((room) => {
          const roomNum = Number(room);
          return roomNum >= startRoomNum && roomNum <= endRoomNum;
        });

        pageGroups.push({ name: groupName, rooms });
      });
    });

  return pageGroups;
}

/**
 * 시간이 endTime을 초과하는지 확인
 */
function isLateAttendance(timeStr: string, endTime?: string): boolean {
  if (
    !timeStr ||
    timeStr === '출석' ||
    timeStr === '미출석' ||
    timeStr === '외박' ||
    !endTime
  ) {
    return false;
  }

  // HH:MM 형식 추출 (SS는 무시)
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  const endMatch = endTime.match(/^(\d{1,2}):(\d{2})/);
  if (!match || !endMatch) return false;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const endHour = parseInt(endMatch[1], 10);
  const endMinute = parseInt(endMatch[2], 10);

  const totalMinutes = hour * 60 + minute;
  const endTotalMinutes = endHour * 60 + endMinute;

  // endTime을 초과하면 지각
  return totalMinutes > endTotalMinutes;
}

/**
 * 미출석만 워크시트 생성 (간단한 레이아웃)
 */
function createAbsentOnlyWorksheet(
  data: MergedAttendanceMember[],
): XLSX.WorkSheet {
  const aoa: (string | number)[][] = [
    ['저녁 점호 체크리스트 - 미출석자'],
    ['호실', '학번', '성명', '출석 여부'],
  ];

  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellStyles: Record<string, any> = {};

  cellStyles['A1'] = {
    font: { sz: 16, bold: true, name: '맑은 고딕' },
    alignment: { vertical: 'center', horizontal: 'center' },
  };

  // 미출석자만 필터링 및 정렬
  const absentMembers = [...data].sort((a, b) => {
    const aRoomNum = parseInt(a.room.replace(/\D/g, '')) || 0;
    const bRoomNum = parseInt(b.room.replace(/\D/g, '')) || 0;
    if (aRoomNum !== bRoomNum) return aRoomNum - bRoomNum;
    return a.stdId.localeCompare(b.stdId);
  });

  let rowIndex = 2;

  absentMembers.forEach((member) => {
    aoa.push([member.room, member.stdId, member.name, '미출석']);
    rowIndex++;
  });

  const totalRows = rowIndex;

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = [
    { width: 8 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];
  worksheet['!rows'] = Array.from({ length: totalRows }, (_, i) =>
    i === 0 ? { hpx: 25 } : { hpx: 18 },
  );

  // 간단한 스타일 적용
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < 4; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!worksheet[cellRef]) worksheet[cellRef] = { v: '' };

      const top = r === 0 || r === 1 ? BORDER_THICK : BORDER_THIN;
      const left = c === 0 ? BORDER_THICK : BORDER_THIN;
      const right = c === 3 ? BORDER_THICK : BORDER_THIN;
      const bottom = r === aoa.length - 1 ? BORDER_THICK : BORDER_THIN;

      let fontBold = false;
      let fontSize = 12;

      if (r === 0) {
        fontBold = true;
        fontSize = 16;
      } else if (r === 1) {
        fontBold = true;
        fontSize = 12;
      }

      worksheet[cellRef].s = {
        ...(cellStyles[cellRef] || {}),
        border: { top, left, bottom, right },
        alignment: { vertical: 'center', horizontal: 'center' },
        font: {
          sz: fontSize,
          bold: fontBold,
          name: '맑은 고딕',
        },
      };
    }
  }

  return worksheet;
}

/**
 * 워크시트 생성
 */
function createWorksheet(
  group: PageGroup,
  roomMap: Record<string, MergedAttendanceMember[]>,
): XLSX.WorkSheet {
  const aoa: (string | number)[][] = [
    ['저녁 점호 체크리스트', '', '', '', ''],
    ['호실', '학번', '성명', '출석 여부', '비고'],
  ];

  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellStyles: Record<string, any> = {};

  cellStyles['A1'] = {
    font: { sz: FONT_SIZES.title, bold: true, name: '맑은 고딕' },
    alignment: { vertical: 'center', horizontal: 'center' },
  };

  let rowIndex = 2;
  const thickTopRows: number[] = [0, 1];

  group.rooms.forEach((room) => {
    const members = roomMap[room] || [];
    thickTopRows.push(rowIndex);
    const startRowIndex = rowIndex;

    for (let i = 0; i < 4; i++) {
      const member = members[i];
      const stdId = member?.stdId || '';
      const name = member?.name || '';

      // 출석 여부 표시
      let attendance = '';
      if (member) {
        if (member.isSleepover) {
          attendance = '외박';
        } else if (member.isLate) {
          attendance = member.checkedDate
            ? `지연(${member.checkedDate})`
            : '지연출석';
        } else if (member.checked) {
          attendance = member.checkedDate || '출석';
        } else {
          attendance = '미출석';
        }
      }

      aoa.push([i === 0 ? room : '', stdId, name, attendance, '']);

      // 방 번호 열에 회색 배경
      cellStyles[`A${rowIndex + 1}`] = { fill: FILL_COLOR_GRAY };

      // 미출석자 셀에 회색 배경 (외박 제외)
      if (member && !member.checked && !member.isSleepover) {
        for (const col of ['B', 'C', 'D', 'E']) {
          cellStyles[`${col}${rowIndex + 1}`] = { fill: FILL_COLOR_GRAY };
        }
      }

      // 지연출석은 주황색 폰트
      if (member && member.isLate) {
        cellStyles[`D${rowIndex + 1}`] = {
          ...cellStyles[`D${rowIndex + 1}`],
          font: { color: { rgb: 'FF8C00' }, bold: true },
        };
      }
      // 22:15 이후 출석(지각)은 빨간색 폰트 (isLate가 아닌 경우)
      else if (
        member &&
        member.checked &&
        !member.isSleepover &&
        isLateAttendance(attendance)
      ) {
        cellStyles[`D${rowIndex + 1}`] = {
          ...cellStyles[`D${rowIndex + 1}`],
          font: { color: { rgb: 'FF0000' }, bold: true },
        };
      }

      rowIndex++;
    }

    // 방 번호 셀 병합
    merges.push({
      s: { r: startRowIndex, c: 0 },
      e: { r: startRowIndex + 3, c: 0 },
    });
  });

  const totalRows = rowIndex;
  const notesNeeded = Math.max(5, MAX_ROWS_PER_PAGE - totalRows);

  // 필기용 섹션
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일 ${DAY_NAMES[today.getDay()]}요일                        자치위원`;
  aoa.push([dateStr, '', '', '', '']);

  for (let i = 1; i < notesNeeded; i++) {
    aoa.push(['', '', '', '', '']);
  }

  if (notesNeeded > 1) {
    merges.push({
      s: { r: rowIndex, c: 0 },
      e: { r: rowIndex + notesNeeded - 1, c: 4 },
    });
  }

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = COL_WIDTHS.map((width) => ({ width }));
  worksheet['!rows'] = Array.from({ length: MAX_ROWS_PER_PAGE }, (_, i) =>
    i === 0 ? { hpx: 30 } : { hpx: 16 },
  );

  // 스타일 적용
  applyStylesToWorksheet(worksheet, aoa, cellStyles, thickTopRows, totalRows);

  return worksheet;
}

/**
 * 스타일 적용
 */
function applyStylesToWorksheet(
  worksheet: XLSX.WorkSheet,
  aoa: (string | number)[][],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellStyles: Record<string, any>,
  thickTopRows: number[],
  totalRows: number,
): void {
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c <= 4; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!worksheet[cellRef]) worksheet[cellRef] = { v: '' };

      const top =
        thickTopRows.includes(r) || r === totalRows
          ? BORDER_THICK
          : BORDER_THIN;
      const left = c === 0 ? BORDER_THICK : BORDER_THIN;
      const right = c === 4 ? BORDER_THICK : BORDER_THIN;
      const bottom = r === aoa.length - 1 ? undefined : BORDER_THIN;

      const hasExistingStyle = cellStyles[cellRef] && cellStyles[cellRef].font;

      let fontSz = FONT_SIZES.dataOther;
      let fontBold = false;

      if (r === 0) {
        fontSz = FONT_SIZES.title;
        fontBold = true;
      } else if (r === 1) {
        fontSz = FONT_SIZES.header;
        fontBold = true;
      } else if (r === totalRows) {
        fontSz = FONT_SIZES.noteHeader;
        fontBold = true;
      } else if (r > totalRows) {
        fontSz = FONT_SIZES.note;
      } else if (c === 0 && r > 1 && r < totalRows) {
        fontSz = FONT_SIZES.dataA;
      }

      const isDateCell = r === totalRows;
      const horizontalAlignment = isDateCell && c === 0 ? 'left' : 'center';
      const verticalAlignment = isDateCell && c === 0 ? 'top' : 'center';

      worksheet[cellRef].s = {
        ...(cellStyles[cellRef] || {}),
        border: { top, left, bottom, right },
        alignment: {
          vertical: hasExistingStyle
            ? cellStyles[cellRef].alignment?.vertical || verticalAlignment
            : verticalAlignment,
          horizontal: hasExistingStyle
            ? cellStyles[cellRef].alignment?.horizontal || horizontalAlignment
            : horizontalAlignment,
        },
        font: hasExistingStyle
          ? cellStyles[cellRef].font
          : {
              sz: fontSz,
              bold: fontBold,
              name: '맑은 고딕',
            },
      };
    }
  }
}
