/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { QuestionItem, QuestionType } from '../types';

/**
 * Trích xuất nội dung văn bản thô từ file Word (.docx)
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('Không tìm thấy nội dung văn bản trong tệp .docx');
  }

  // Parse XML text nodes
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXml, 'application/xml');
  const paragraphs = xmlDoc.getElementsByTagName('w:p');

  const textLines: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const textNodes = paragraphs[i].getElementsByTagName('w:t');
    let pText = '';
    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent || '';
    }
    if (pText.trim()) {
      textLines.push(pText.trim());
    }
  }

  return textLines.join('\n');
}

/**
 * Phân tích văn bản thành danh sách câu hỏi trắc nghiệm hoặc tự luận
 */
export function parseQuestionsFromText(rawText: string, defaultSubject = 'Tổng hợp'): QuestionItem[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: QuestionItem[] = [];

  let currentQuestion: Partial<QuestionItem> | null = null;
  let currentOptions: string[] = [];

  const finalizeCurrent = () => {
    if (currentQuestion && currentQuestion.questionText) {
      const isMc = currentOptions.length >= 2;
      items.push({
        id: `q-${Date.now()}-${items.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
        type: isMc ? 'multiple_choice' : (currentQuestion.type || 'oral'),
        questionText: currentQuestion.questionText,
        options: isMc ? [...currentOptions] : undefined,
        correctOptionIndex: isMc ? (currentQuestion.correctOptionIndex ?? 0) : undefined,
        teacherAnswerKey: currentQuestion.teacherAnswerKey || (isMc ? `Đáp án đúng: ${['A', 'B', 'C', 'D'][currentQuestion.correctOptionIndex ?? 0]}` : 'Giáo viên đối chiếu và cho điểm'),
        pointsReward: currentQuestion.pointsReward || 2,
        subject: currentQuestion.subject || defaultSubject,
        image: currentQuestion.image
      });
    }
    currentQuestion = null;
    currentOptions = [];
  };

  const questionRegex = /^(Câu\s*\d+|Bài\s*\d+|\d+[\.\:\)])\s*[:\.]?\s*(.*)/i;
  const optionRegex = /^([A-D])[\.\:\)]\s*(.*)/i;
  const answerRegex = /^(Đáp án|Lời giải|Gợi ý|Hướng dẫn)\s*[:\.]?\s*(.*)/i;

  for (const line of lines) {
    // Check if new question
    const qMatch = line.match(questionRegex);
    if (qMatch) {
      finalizeCurrent();
      currentQuestion = {
        questionText: qMatch[2] || line,
        pointsReward: 2,
        subject: defaultSubject
      };
      continue;
    }

    // Check if option (A, B, C, D)
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestion) {
      currentOptions.push(line);
      continue;
    }

    // Check if answer key
    const ansMatch = line.match(answerRegex);
    if (ansMatch && currentQuestion) {
      const ansContent = ansMatch[2].trim();
      currentQuestion.teacherAnswerKey = ansContent;

      // If mentions A, B, C, or D
      const letterMatch = ansContent.match(/\b([A-D])\b/i);
      if (letterMatch) {
        const letter = letterMatch[1].toUpperCase();
        const mapIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        if (mapIdx[letter] !== undefined) {
          currentQuestion.correctOptionIndex = mapIdx[letter];
        }
      }
      continue;
    }

    // Append to question text if active
    if (currentQuestion && currentOptions.length === 0) {
      currentQuestion.questionText += ' ' + line;
    }
  }

  finalizeCurrent();

  // If no structured format recognized, convert lines into individual oral questions
  if (items.length === 0 && lines.length > 0) {
    lines.forEach((line, idx) => {
      items.push({
        id: `q-${Date.now()}-${idx + 1}`,
        type: 'oral',
        questionText: line,
        teacherAnswerKey: 'Giáo viên đánh giá câu trả lời của học sinh',
        pointsReward: 2,
        subject: defaultSubject
      });
    });
  }

  return items;
}
