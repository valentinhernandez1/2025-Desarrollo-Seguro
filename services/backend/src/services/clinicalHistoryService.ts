// src/services/clinicalHistoryService.ts
import db from '../db';
import fs from 'fs/promises';
import path from 'path';

// Directorio seguro donde se guardan archivos
const BASE_DIR = path.join(process.cwd(), "uploads", "clinical_history");

// safeJoin para evitar Path Traversal
function safeJoin(base: string, target: string) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) {
    throw new Error("Invalid file path (path traversal detected)");
  }
  return targetPath;
}

interface CHRow {
  id: string;
  user_id: string;
  doctor_name: string;
  diagnose: string;
  created_at: Date;
  updated_at: Date;
}

interface FileRow {
  id: string;
  history_id: string;
  filename: string;
  path: string;
  original_name: string;
  mime_type: string;
  size: number;
}

class ClinicalHistoryService {

  /* ----------------------------------------
     CREAR HISTORIA CLÍNICA (NECESARIO)
  ----------------------------------------- */
  static async create(
  userId: string,
  data: { doctorName?: string; diagnose?: string; files?: Array<{ filename: string }> }
) {

  // Crear registro principal
  const [h] = await db<CHRow>('clinical_histories')
    .insert({
      user_id: userId,
      doctor_name: data.doctorName || undefined,
      diagnose: data.diagnose || undefined
    })
    .returning("*");

  
  return {
    id: h.id,
    doctorName: h.doctor_name,
    diagnose: h.diagnose,
    createdAt: h.created_at,
    updatedAt: h.updated_at,
    files: []
  };
}

  /* ----------------------------------------------------
     LISTAR HISTORIA CLÍNICA (SIN EXPONER RUTAS INTERNAS)
  ----------------------------------------------------- */
  static async list(
    userId: string,
    filters: { from?: Date; to?: Date }
  ) {
    let q = db<CHRow>('clinical_histories').where({ user_id: userId });
    if (filters.from) q = q.andWhere('created_at', '>=', filters.from);
    if (filters.to)   q = q.andWhere('created_at', '<=', filters.to);

    const histories = await q.select();
    const ids       = histories.map(h => h.id);

    const files = ids.length
      ? await db<FileRow>('clinical_history_files').whereIn('history_id', ids)
      : [];

    return histories.map(h => ({
      id:         h.id,
      doctorName: h.doctor_name,
      diagnose:   h.diagnose,
      createdAt:  h.created_at,
      updatedAt:  h.updated_at,
      files: files
        .filter(f => f.history_id === h.id)
        .map(f => ({
          id: f.id,
          filename: f.filename,
          originalName: f.original_name,
          mimeType: f.mime_type,
          size: f.size
        }))
    }));
  }

  /* -------------------------------------------------------------------
      OBTENER HISTORIA CLÍNICA POR ID (SIN EXPONER RUTAS INTERNAS)
  -------------------------------------------------------------------- */
  static async getById(id: string, userId: string) {
    const h = await db<CHRow>('clinical_histories')
      .where({ id, user_id: userId })
      .first();
    if (!h) throw new Error('Not found');

    const files = await db<FileRow>('clinical_history_files')
      .where({ history_id: id });

    return {
      id:         h.id,
      doctorName: h.doctor_name,
      diagnose:   h.diagnose,
      createdAt:  h.created_at,
      updatedAt:  h.updated_at,
      files: files.map(f => ({
        id:           f.id,
        filename:     f.filename,
        path:         undefined, // ✔ No exponer rutas internas
        originalName: f.original_name,
        mimeType:     f.mime_type,
        size:         f.size,
      }))
    };
  }

  /* ------------------------------------------------------
       ELIMINAR FILE (DE FORMA SEGURA Y SIN TRAVERSAL)
  -------------------------------------------------------- */
  static async deleteFile(userId: string, historyId: string, filename: string) {

    // Validar input básico para evitar traversal simple
    if (
      filename.includes("..") ||
      filename.includes("/")  ||
      filename.includes("\\")
    ) {
      throw new Error("Invalid filename");
    }

    const h = await db('clinical_histories')
      .where({ id: historyId, user_id: userId })
      .first();
    if (!h) throw new Error('Not found');

    const f = await db<FileRow>('clinical_history_files')
      .where({ history_id: historyId, filename })
      .first();
    if (!f) throw new Error('File not found');

    // Ruta segura final
    const fullPath = safeJoin(BASE_DIR, f.filename);

    // Eliminar archivo
    try {
      await fs.unlink(fullPath);
    } catch {}

    // Eliminar registro
    await db('clinical_history_files')
      .where({ id: f.id })
      .delete();
  }
}

export default ClinicalHistoryService;
