import * as XLSX from 'xlsx-js-style';
import templateUrl from '../assets/night-study-statistics-template.xlsx?url';
import type { NightStudyPeriodResponse } from '../types/api';

export interface NightStudyExportStudent {
  studentId: string;
  grade: number;
  gender: '남' | '여' | '-';
  period1: NightStudyPeriodResponse;
  period2: NightStudyPeriodResponse;
}

export interface NightStudyExportOptions {
  date: string;
  gender: '전체' | '남' | '여';
  grade: '전체' | 1 | 2 | 3;
  hasSearch: boolean;
}

interface AttendanceCounts {
  applied: number;
  present: number;
  absent: number;
}

const XML_ENCODER = new TextEncoder();
const XML_DECODER = new TextDecoder();
const PERIODS = ['period1', 'period2'] as const;

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!);

const setCell = (
  xml: string,
  reference: string,
  value: string | number,
  formula?: string,
): string => {
  const pattern = new RegExp(
    `<c\\b([^>]*\\br="${reference}"[^>]*?)(?:/>|>[\\s\\S]*?</c>)`,
  );
  if (!pattern.test(xml)) throw new Error('통계 양식의 셀 구성이 올바르지 않습니다.');

  return xml.replace(pattern, (_, attributes: string) => {
    const preservedAttributes = attributes.replace(/\s+t="[^"]*"/g, '');
    if (typeof value === 'string') {
      return `<c${preservedAttributes} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }
    const formulaXml = formula ? `<f>${escapeXml(formula)}</f>` : '';
    return `<c${preservedAttributes}>${formulaXml}<v>${value}</v></c>`;
  });
};

const createPeriodWorksheet = (
  templateXml: string,
  students: NightStudyExportStudent[],
  period: typeof PERIODS[number],
  options: NightStudyExportOptions,
): string => {
  const counts: AttendanceCounts[][][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () =>
      Array.from({ length: 2 }, () => ({ applied: 0, present: 0, absent: 0 })),
    ),
  );

  students.forEach((student) => {
    const attendance = student[period];
    if (attendance.status === 'NOT_APPLIED') return;
    if (attendance.status !== 'ATTENDANCE' && attendance.status !== 'ABSENT') {
      throw new Error('출석 상태를 확인할 수 없는 신청자가 있습니다. 새로고침 후 다시 시도해주세요.');
    }

    const floor = attendance.room?.floor;
    if (!floor || !Number.isInteger(floor) || floor < 1 || floor > 3) {
      throw new Error('자습실 층 정보가 없거나 양식 범위(1~3층)를 벗어난 신청자가 있습니다.');
    }
    if (!Number.isInteger(student.grade) || student.grade < 1 || student.grade > 3) {
      throw new Error('학년 정보가 양식 범위(1~3학년)를 벗어난 신청자가 있습니다.');
    }
    if (student.gender !== '남' && student.gender !== '여') {
      throw new Error('성별 정보를 확인할 수 없는 신청자가 있습니다. 새로고침 후 다시 시도해주세요.');
    }

    // 두 기간의 자습실 배정이 다를 수 있으므로 각각의 room.floor를 사용한다.
    const group = counts[student.grade - 1][floor - 1][student.gender === '남' ? 0 : 1];
    group.applied += 1;
    if (attendance.status === 'ATTENDANCE') group.present += 1;
    else group.absent += 1;
  });

  let xml = setCell(templateXml, 'E2', `심자 참석 인원 현황 (${period === 'period1' ? '1' : '2'}차)`);
  xml = setCell(xml, 'S3', options.date);
  xml = setCell(xml, 'T3', '');
  const scope = [
    options.gender === '전체' ? '전체 성별' : `${options.gender}학생`,
    options.grade === '전체' ? '전체 학년' : `${options.grade}학년`,
    ...(options.hasSearch ? ['검색 결과'] : []),
  ].join(' / ');
  xml = xml.replace(
    /(<row\b[^>]*\br="3"[^>]*>)/,
    `$1<c r="B3" s="28" t="inlineStr"><is><t>${escapeXml(scope)}</t></is></c>`,
  );
  xml = xml.replace(/<mergeCells count="(\d+)">/, (_, count: string) =>
    `<mergeCells count="${Number(count) + 2}"><mergeCell ref="B3:R3"/><mergeCell ref="S3:Z3"/>`,
  );

  const values = Array.from({ length: 3 }, () => Array<number>(24).fill(0));
  counts.forEach((floors, gradeIndex) => {
    floors.forEach((genders, floorIndex) => {
      genders.forEach((group, genderIndex) => {
        const offset = floorIndex * 6 + genderIndex * 3;
        values[gradeIndex].splice(offset, 3, group.applied, group.present, group.absent);
      });
    });

    for (let metric = 0; metric < 6; metric += 1) {
      values[gradeIndex][18 + metric] =
        values[gradeIndex][metric] + values[gradeIndex][6 + metric] + values[gradeIndex][12 + metric];
    }
    values[gradeIndex].forEach((value, column) => {
      const row = gradeIndex + 7;
      const reference = `${XLSX.utils.encode_col(column + 2)}${row}`;
      const formula = column >= 18
        ? `SUM(${[column - 18, column - 12, column - 6].map((index) => `${XLSX.utils.encode_col(index + 2)}${row}`).join(',')})`
        : undefined;
      xml = setCell(xml, reference, value, formula);
    });
  });

  for (let column = 0; column < 24; column += 1) {
    const name = XLSX.utils.encode_col(column + 2);
    const total = values.reduce((sum, row) => sum + row[column], 0);
    xml = setCell(xml, `${name}10`, total, `SUM(${name}7:${name}9)`);
  }

  return xml.replace(/\s+xr:uid="[^"]*"/, '');
};

/** 원본 양식의 스타일·인쇄 설정을 보존하고 통계 셀과 시트 목록만 갱신한다. */
export const createNightStudyStatisticsWorkbook = (
  template: Uint8Array,
  students: NightStudyExportStudent[],
  options: NightStudyExportOptions,
): Uint8Array => {
  if (new Set(students.map((student) => student.studentId)).size !== students.length) {
    throw new Error('중복된 신청자 정보가 있습니다. 새로고침 후 다시 시도해주세요.');
  }

  const archive = XLSX.CFB.read(template, { type: 'buffer' });
  const readXml = (path: string): string => {
    const entry = XLSX.CFB.find(archive, `/${path}`);
    if (!entry) throw new Error('통계 양식을 읽지 못했습니다. 다시 시도해주세요.');
    return XML_DECODER.decode(entry.content);
  };
  const writeXml = (path: string, xml: string) => {
    XLSX.CFB.utils.cfb_del(archive, `/${path}`);
    XLSX.CFB.utils.cfb_add(archive, path, XML_ENCODER.encode(xml));
  };

  const templateXml = readXml('xl/worksheets/sheet1.xml');
  PERIODS.forEach((period, index) => {
    writeXml(`xl/worksheets/sheet${index + 1}.xml`, createPeriodWorksheet(templateXml, students, period, options));
  });
  writeXml('xl/worksheets/_rels/sheet2.xml.rels', readXml('xl/worksheets/_rels/sheet1.xml.rels'));
  writeXml('xl/workbook.xml', readXml('xl/workbook.xml')
    .replace(/<sheets>[\s\S]*?<\/sheets>/,
      '<sheets><sheet name="심야자습 1" sheetId="1" r:id="rId1"/><sheet name="심야자습 2" sheetId="2" r:id="rId5"/></sheets>')
    .replace(/<calcPr\b[^>]*\/>/, '<calcPr fullCalcOnLoad="1"/>'));
  writeXml('xl/_rels/workbook.xml.rels', readXml('xl/_rels/workbook.xml.rels')
    .replace('</Relationships>', '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>'));
  writeXml('[Content_Types].xml', readXml('[Content_Types].xml')
    .replace('</Types>', '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'));
  writeXml('docProps/app.xml', readXml('docProps/app.xml')
    .replace(/<vt:i4>1<\/vt:i4>/, '<vt:i4>2</vt:i4>')
    .replace(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/,
      '<TitlesOfParts><vt:vector size="2" baseType="lpstr"><vt:lpstr>심야자습 1</vt:lpstr><vt:lpstr>심야자습 2</vt:lpstr></vt:vector></TitlesOfParts>'));

  return new Uint8Array(XLSX.CFB.write(archive, { fileType: 'zip', compression: true }));
};

export const exportNightStudyStatisticsToExcel = async (
  students: NightStudyExportStudent[],
  options: NightStudyExportOptions,
): Promise<void> => {
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error('통계 양식을 불러오지 못했습니다. 다시 시도해주세요.');

  const bytes = createNightStudyStatisticsWorkbook(new Uint8Array(await response.arrayBuffer()), students, options);
  const blob = new Blob([new Uint8Array(bytes).buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const grade = options.grade === '전체' ? '전체학년' : `${options.grade}학년`;
  link.download = `심자_통계_${options.date}_${options.gender}_${grade}${options.hasSearch ? '_검색결과' : ''}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
