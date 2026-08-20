import Tesseract from 'tesseract.js';
import type { OCRResult, KTPData, DocumentScan, DocumentScanStatus } from '@/types';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ---- KTP Text Parsing ----

function cleanLine(line: string): string {
  return line
    .replace(/[^\w\s./,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNIK(text: string): string {
  // Find 16 consecutive digits (NIK format)
  const lines = text.split('\n');
  for (const line of lines) {
    // Try standalone NIK line first ("NIK : 1234..." or "NIK 1234...")
    const nikMatch = line.match(/(?:NIK|No[\s.]*KTP)[\s:.*]+(\d{16})/i);
    if (nikMatch) return nikMatch[1];
  }
  // Fallback: find any 16-digit number
  const fallback = text.match(/\b(\d{16})\b/);
  return fallback ? fallback[1] : '';
}

function extractName(text: string): string {
  const patterns = [
    /Nama\s*[:.]+\s*(.+)/i,
    /^Nama\s+(.+)/im,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return cleanLine(m[1].trim()).replace(/^[:.\s]+/, '');
  }
  return '';
}

function extractBirthPlace(text: string): string {
  const patterns = [
    /Tempat[\s/]*Tgl\s*Lahir\s*[:.]+\s*([A-Z][A-Z\s]+?)(?:,|\d{2})/i,
    /TTL\s*[:.]+\s*([A-Z][A-Z\s]+?)(?:,|\d{2})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return cleanLine(m[1].trim()).replace(/[,\s]+$/, '');
  }
  return '';
}

function extractBirthDate(text: string): string {
  // KTP format: DD-MM-YYYY or DD/MM/YYYY
  const patterns = [
    /Tempat[\s/]*Tgl\s*Lahir\s*[:.]+\s*[A-Z\s]+?[,\s]+(\d{2}[\s/-]\d{2}[\s/-]\d{4})/i,
    /TTL\s*[:.]+\s*[A-Z\s]+?[,\s]+(\d{2}[\s/-]\d{2}[\s/-]\d{4})/i,
    /(\d{2}[\s/-]\d{2}[\s/-]\d{4})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      // Normalize to YYYY-MM-DD for our form
      const parts = m[1].replace(/[\s/]+/g, '-').split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year >= 1900) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      return m[1];
    }
  }
  return '';
}

function extractGender(text: string): 'L' | 'P' | '' {
  const patterns = [
    /Jenis\s*Kelamin\s*[:.]+\s*(LAKI[\s-]*LAKI|PEREMPUAN|LAKI|PRIA|WANITA)/i,
    /Kelamin\s*[:.]+\s*(LAKI[\s-]*LAKI|PEREMPUAN|LAKI|PRIA|WANITA)/i,
    /Sex\s*[:.]+\s*(LAKI[\s-]*LAKI|PEREMPUAN|LAKI|PRIA|WANITA)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = m[1].toUpperCase();
      if (val.includes('PEREMPUAN') || val.includes('WANITA')) return 'P';
      return 'L';
    }
  }
  return '';
}

function extractAddress(text: string): string {
  const patterns = [
    /Alamat\s*[:.]+\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return cleanLine(m[1].trim());
  }
  return '';
}

function extractRT(text: string): string {
  const m = text.match(/RT[\s/:.]*([\d/]+)/i);
  return m ? m[1].replace(/[^\d/]/g, '') : '';
}

function extractRW(text: string): string {
  const m = text.match(/RW[\s/:.]*([\d/]+)/i);
  return m ? m[1].replace(/[^\d/]/g, '') : '';
}

function extractKelurahan(text: string): string {
  const patterns = [
    /Kel[\s/.]*Desa\s*[:.]+\s*(.+)/i,
    /Desa[\s/.]*Kelurahan\s*[:.]+\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return cleanLine(m[1].trim());
  }
  return '';
}

function extractKecamatan(text: string): string {
  const m = text.match(/Kecamatan\s*[:.]+\s*(.+)/i);
  return m ? cleanLine(m[1].trim()) : '';
}

function extractAgama(text: string): string {
  const m = text.match(/Agama\s*[:.]+\s*(.+)/i);
  return m ? cleanLine(m[1].trim()) : '';
}

function extractStatusPerkawinan(text: string): string {
  const patterns = [
    /Status\s*Perkawinan\s*[:.]+\s*(.+)/i,
    /Kawin\s*[:.]+\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return cleanLine(m[1].trim());
  }
  return '';
}

function extractPekerjaan(text: string): string {
  const m = text.match(/Pekerjaan[\s/:.]*\s*(.+)/i);
  return m ? cleanLine(m[1].trim()) : '';
}

function extractKewarganegaraan(text: string): string {
  const patterns = [
    /Kewarganegaraan\s*[:.]+\s*(.+)/i,
    /Warga[\s/]*Negara\s*[:.]+\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return cleanLine(m[1].trim());
  }
  return '';
}

// ---- NIK Parsing (fallback when OCR misses fields) ----

function parseNIKFields(nik: string): Partial<KTPData> {
  if (!/^(\d{16})$/.test(nik)) return {};
  const result: Partial<KTPData> = {};

  // Digits 7-8: birth date (if female, subtract 40)
  let day = parseInt(nik.substring(6, 8), 10);
  const isFemale = day > 40;
  if (isFemale) day -= 40;
  if (!result.gender) result.gender = isFemale ? 'P' : 'L';

  // Digits 9-10: birth month
  const month = parseInt(nik.substring(8, 10), 10);
  // Digits 11-12: birth year (add 1900 or 2000)
  let year = parseInt(nik.substring(10, 12), 10);
  year = year > 30 ? 1900 + year : 2000 + year;

  if (day > 0 && day <= 31 && month > 0 && month <= 12 && year >= 1900) {
    if (!result.birthDate) {
      result.birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return result;
}

// ---- Main OCR Processing ----

export async function processKTPImage(
  imageSource: File | HTMLImageElement | string,
  onProgress?: (progress: number) => void,
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const result = await Tesseract.recognize(
      imageSource,
      'ind', // Indonesian language
      {
        logger: (info) => {
          if (info.status === 'recognizing text' && onProgress) {
            onProgress(Math.round((info.progress || 0) * 100));
          }
        },
      },
    );

    const rawText = result.data.text;
    const confidence = Math.round(result.data.confidence);

    // Extract KTP fields
    let ktpData: Partial<KTPData> = {
      nik: extractNIK(rawText),
      name: extractName(rawText),
      birthPlace: extractBirthPlace(rawText),
      birthDate: extractBirthDate(rawText),
      gender: extractGender(rawText),
      address: extractAddress(rawText),
      rt: extractRT(rawText),
      rw: extractRW(rawText),
      kelurahan: extractKelurahan(rawText),
      kecamatan: extractKecamatan(rawText),
      agama: extractAgama(rawText),
      statusPerkawinan: extractStatusPerkawinan(rawText),
      pekerjaan: extractPekerjaan(rawText),
      kewarganegaraan: extractKewarganegaraan(rawText),
    };

    // Enhance with NIK parsing (fills gender, birthDate if missing)
    if (ktpData.nik) {
      const nikFields = parseNIKFields(ktpData.nik);
      if (!ktpData.gender && nikFields.gender) ktpData.gender = nikFields.gender;
      if (!ktpData.birthDate && nikFields.birthDate) ktpData.birthDate = nikFields.birthDate;
    }

    // Count filled fields
    const totalFields = 14;
    const filledFields = Object.values(ktpData).filter(v => v && v.trim() !== '').length;

    const ocrResult: OCRResult = {
      success: filledFields >= 3,
      rawText,
      confidence,
      ktpData,
      processedAt: Date.now(),
      processingTime: Date.now() - startTime,
    };

    return ocrResult;
  } catch {
    return {
      success: false,
      rawText: '',
      confidence: 0,
      ktpData: {},
      processedAt: Date.now(),
      processingTime: Date.now() - startTime,
    };
  }
}

// ---- Image Utilities ----

export function preprocessImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Resize if too large to speed up OCR
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 800;
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = (MAX_HEIGHT / height) * width;
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context not available')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to grayscale for better OCR
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);

      // Increase contrast
      const resizedImg = new Image();
      resizedImg.onload = () => {
        URL.revokeObjectURL(url);
        resolve(resizedImg);
      };
      resizedImg.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(img); // fallback to original
      };
      resizedImg.src = canvas.toDataURL('image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function imageToDataUrl(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ---- Firestore: Save/Load Scans ----

export async function saveScanRecord(
  userId: string,
  ocrResult: OCRResult,
  type: DocumentScan['type'] = 'ktp',
  thumbnailUrl?: string,
): Promise<string> {
  const filledFields = Object.values(ocrResult.ktpData).filter(v => v && v.trim() !== '').length;
  let status: DocumentScanStatus = 'failed';
  if (filledFields >= 8) status = 'success';
  else if (filledFields >= 3) status = 'partial';

  const doc: Omit<DocumentScan, 'scanId'> = {
    userId,
    type,
    status,
    ocrResult: {
      ...ocrResult,
      rawText: ocrResult.rawText.slice(0, 5000), // Truncate raw text
    },
    imageUrl: thumbnailUrl,
    createdAt: Date.now(),
  };

  const ref = await addDoc(collection(db, 'document_scans'), doc);
  return ref.id;
}

export async function getScanHistory(userId: string, limitCount = 10): Promise<DocumentScan[]> {
  const q = query(
    collection(db, 'document_scans'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ scanId: d.id, ...d.data() }) as DocumentScan);
}

// ---- Confidence Helpers ----

export function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 80) return { label: 'Sangat Baik', color: 'text-emerald-600' };
  if (confidence >= 60) return { label: 'Baik', color: 'text-blue-600' };
  if (confidence >= 40) return { label: 'Cukup', color: 'text-amber-600' };
  return { label: 'Rendah', color: 'text-red-600' };
}

export function getFilledFieldCount(ktpData: Partial<KTPData>): { filled: number; total: number } {
  const fields = Object.entries(ktpData).filter(([, v]) => v && String(v).trim() !== '');
  return { filled: fields.length, total: 14 };
}
